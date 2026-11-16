// Seed the catalog from TMDB. Safe to run repeatedly: everything is upserted by TMDB id, and the fields an
// admin edits afterwards (isFree, videoUrl, isPublished, viewCount, slug) are never overwritten.
//
//   npm run seed:tmdb                                  ~300 movies, ~150 series, ~50 reality shows, 15 free titles
//   npm run seed:tmdb -- --movies=20 --series=10 --reality=5 --free=3
//   options: --movies --series --reality --free --concurrency=6 --max-seasons=10
//
// Needs TMDB_API_KEY (v3) or TMDB_READ_TOKEN (v4) in .env. TMDB_BASE_URL overrides the API host (used by tests).
import dns from 'node:dns';
import mongoose from 'mongoose';
import config from '../src/config/config.js';
import { Title, Genre, Person, Season, Episode } from '../src/models/index.js';

// ---------------------------------------------------------------- options

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, v] = a.slice(2).split('=');
      return [k, v ?? 'true'];
    })
);
const intArg = (name, fallback) => {
  const n = Number.parseInt(args[name], 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const TARGETS = { movie: intArg('movies', 300), series: intArg('series', 150), reality: intArg('reality', 50) };
const FREE_TARGET = intArg('free', 15);
const CONCURRENCY = Math.max(1, intArg('concurrency', 6));
const MAX_SEASONS = Math.max(1, intArg('max-seasons', 10));

const REALITY_GENRE = 10764;
// Talk shows, news and soaps are not "series" in the sense this catalog wants
const NOT_SERIES_GENRES = [REALITY_GENRE, 10767, 10763, 10766].join('|');

// Open-licence demo streams (Mux test stream: Big Buck Bunny, Apple bipbop sample, Tears of Steel).
// They stand in for real content on the free titles until real video is attached by an admin.
const DEMO_STREAMS = [
  'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
  'https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_ts/master.m3u8',
];

// ---------------------------------------------------------------- TMDB client (rate-limit aware)

const BASE = (process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3').replace(/\/$/, '');
const { apiKey, readToken } = config.tmdb;
const IMAGE_BASE = 'https://image.tmdb.org/t/p';

const MIN_GAP_MS = 30; // ~33 requests/second, under TMDB's ~50/second ceiling
const MAX_ATTEMPTS = 7;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let nextSlot = 0;
const stats = { requests: 0, rateLimited: 0, retries: 0 };

// Spaces out request starts across all concurrent workers; a 429 pushes the slot out for everyone
const throttle = async () => {
  const now = Date.now();
  const start = Math.max(now, nextSlot);
  nextSlot = start + MIN_GAP_MS;
  if (start > now) await sleep(start - now);
};

/** GET a TMDB path. Returns parsed JSON, or null on 404. Errors never include the URL (it holds the key). */
async function tmdb(path, params = {}) {
  const url = new URL(BASE + path);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  if (!readToken) url.searchParams.set('api_key', apiKey);
  const headers = readToken ? { Authorization: `Bearer ${readToken}` } : {};

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    await throttle();
    stats.requests += 1;

    let res;
    try {
      res = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) throw new Error(`${path}: network error (${err.name})`, { cause: err });
      stats.retries += 1;
      await sleep(500 * 2 ** (attempt - 1));
      continue;
    }

    if (res.status === 404) return null;
    if (res.status === 429) {
      const wait = (Number(res.headers.get('retry-after')) || 2) * 1000;
      nextSlot = Math.max(nextSlot, Date.now() + wait);
      stats.rateLimited += 1;
      continue;
    }
    if (res.status >= 500) {
      stats.retries += 1;
      await sleep(500 * 2 ** (attempt - 1));
      continue;
    }
    if (res.status === 401)
      throw new Error('TMDB rejected the credentials (401). Check TMDB_API_KEY / TMDB_READ_TOKEN');
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    return res.json();
  }
  throw new Error(`${path}: gave up after ${MAX_ATTEMPTS} attempts`);
}

// ---------------------------------------------------------------- mapping helpers

const img = (path, size) => (path ? `${IMAGE_BASE}/${size}${path}` : '');
const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const unique = (list) => [...new Set(list.filter(Boolean))];

const slugify = (text) =>
  text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Official YouTube trailer first, then any trailer, then a teaser; newest first within each group. */
const pickTrailerKey = (videos = []) => {
  const youtube = videos.filter((v) => v.site === 'YouTube' && v.key);
  const rank = (v) => (v.type === 'Trailer' ? 0 : v.type === 'Teaser' ? 2 : 9) + (v.official ? 0 : 1);
  const best = youtube
    .filter((v) => v.type === 'Trailer' || v.type === 'Teaser')
    .sort((a, b) => rank(a) - rank(b) || String(b.published_at).localeCompare(String(a.published_at)))[0];
  return best?.key ?? '';
};

const CREW_JOBS = ['Director', 'Creator', 'Screenplay', 'Writer', 'Story', 'Executive Producer', 'Producer'];

const pickCrew = (d, kind) => {
  const people = [];
  if (kind === 'tv') {
    for (const c of d.created_by ?? []) people.push({ person: c, job: 'Creator' });
  }
  const crew = d.credits?.crew ?? [];
  for (const job of CREW_JOBS) {
    for (const c of crew.filter((x) => x.job === job).slice(0, job === 'Director' ? 3 : 2)) {
      people.push({ person: c, job });
    }
  }
  const seen = new Set();
  return people
    .filter(({ person, job }) => {
      const key = `${person.id}:${job}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
};

// ---------------------------------------------------------------- database steps

/** Retry once on a duplicate-key race (two workers upserting the same new person/genre at the same moment) */
const withDupRetry = async (fn) => {
  try {
    return await fn();
  } catch (err) {
    if (err?.code === 11000 || err?.writeErrors?.some((e) => e.code === 11000)) return fn();
    throw err;
  }
};

async function importGenres() {
  const [movieGenres, tvGenres] = await Promise.all([
    tmdb('/genre/movie/list', { language: 'en' }),
    tmdb('/genre/tv/list', { language: 'en' }),
  ]);
  const all = new Map();
  for (const g of [...(movieGenres?.genres ?? []), ...(tvGenres?.genres ?? [])]) all.set(g.id, g.name);

  await Genre.bulkWrite(
    [...all].map(([tmdbId, name]) => ({
      updateOne: {
        filter: { tmdbId },
        update: { $set: { name, slug: slugify(name) } },
        upsert: true,
      },
    })),
    { ordered: false }
  );
  const docs = await Genre.find().select('tmdbId').lean();
  return new Map(docs.map((g) => [g.tmdbId, g._id]));
}

async function upsertPeople(people) {
  const byId = new Map();
  for (const p of people) {
    if (p?.id && p.name && !byId.has(p.id)) byId.set(p.id, p);
  }
  if (!byId.size) return new Map();

  await withDupRetry(() =>
    Person.bulkWrite(
      [...byId.values()].map((p) => ({
        updateOne: {
          filter: { tmdbId: p.id },
          update: {
            $set: {
              name: p.name,
              profileUrl: img(p.profile_path, 'w185'),
              knownForDepartment: p.known_for_department ?? '',
            },
          },
          upsert: true,
        },
      })),
      { ordered: false }
    )
  );
  const docs = await Person.find({ tmdbId: { $in: [...byId.keys()] } })
    .select('tmdbId')
    .lean();
  return new Map(docs.map((p) => [p.tmdbId, p._id]));
}

/** Keep an existing title's slug (URLs must not change); otherwise title-year, made unique if it collides. */
async function resolveSlug(tmdbType, tmdbId, title, year) {
  const existing = await Title.findOne({ tmdbType, tmdbId }).select('slug').lean();
  if (existing) return existing.slug;
  const base = slugify(title) ? `${slugify(title)}${year ? `-${year}` : ''}` : `title-${tmdbType}-${tmdbId}`;
  return (await Title.exists({ slug: base })) ? `${base}-${tmdbType}-${tmdbId}` : base;
}

async function importSeasons(titleDoc, tmdbId, d) {
  const seasons = (d.seasons ?? [])
    .filter((s) => s.season_number >= 1) // season 0 is "Specials"
    .sort((a, b) => a.season_number - b.season_number)
    .slice(0, MAX_SEASONS);

  let episodeTotal = 0;
  for (const s of seasons) {
    const detail = await tmdb(`/tv/${tmdbId}/season/${s.season_number}`, { language: 'en-US' });
    if (!detail) continue;
    const episodes = detail.episodes ?? [];

    const season = await withDupRetry(() =>
      Season.findOneAndUpdate(
        { title: titleDoc._id, seasonNumber: s.season_number },
        {
          $set: {
            tmdbId: s.id,
            name: detail.name || s.name || `Season ${s.season_number}`,
            overview: detail.overview || s.overview || '',
            posterUrl: img(detail.poster_path || s.poster_path, 'w500'),
            airDate: toDate(detail.air_date || s.air_date),
            episodeCount: episodes.length || s.episode_count || 0,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    );

    if (episodes.length) {
      await withDupRetry(() =>
        Episode.bulkWrite(
          episodes.map((e) => ({
            updateOne: {
              filter: { title: titleDoc._id, seasonNumber: s.season_number, episodeNumber: e.episode_number },
              update: {
                $set: {
                  season: season._id,
                  tmdbId: e.id,
                  name: e.name || `Episode ${e.episode_number}`,
                  overview: e.overview || '',
                  stillUrl: img(e.still_path, 'w500'),
                  airDate: toDate(e.air_date),
                  runtime: e.runtime ?? null,
                },
                $setOnInsert: { isFree: false, videoUrl: '', hasVideo: false },
              },
              upsert: true,
            },
          })),
          { ordered: false }
        )
      );
      episodeTotal += episodes.length;
    }
  }
  return episodeTotal;
}

/** Import one movie or tv show. Returns 'imported' | 'skipped' | 'missing'. */
async function importTitle(kind, id, genreIds) {
  const d = await tmdb(`/${kind}/${id}`, {
    language: 'en-US',
    append_to_response: 'credits,videos',
    include_video_language: 'en,null',
  });
  if (!d) return 'missing';
  const overview = (d.overview ?? '').trim();
  if (!d.poster_path || !overview) return 'skipped'; // nothing worth showing on a poster card

  const isMovie = kind === 'movie';
  const tmdbGenres = (d.genres ?? []).map((g) => g.id);
  const type = isMovie ? 'movie' : tmdbGenres.includes(REALITY_GENRE) ? 'reality' : 'series';

  const name = (isMovie ? d.title : d.name) ?? '';
  if (!name) return 'skipped';
  const releaseDate = toDate(isMovie ? d.release_date : d.first_air_date);
  const year = releaseDate ? releaseDate.getUTCFullYear() : null;

  // people: top-billed cast and key crew
  const cast = [...(d.credits?.cast ?? [])].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)).slice(0, 12);
  const crew = pickCrew(d, kind);
  const personIds = await upsertPeople([...cast, ...crew.map((c) => c.person)]);

  const countries = unique([...(d.production_countries ?? []).map((c) => c.iso_3166_1), ...(d.origin_country ?? [])]);
  const languages = unique([...(d.spoken_languages ?? []).map((l) => l.iso_639_1), d.original_language]);

  const fields = {
    type,
    title: name,
    originalTitle: (isMovie ? d.original_title : d.original_name) ?? '',
    tagline: d.tagline ?? '',
    overview,
    genres: tmdbGenres.map((g) => genreIds.get(g)).filter(Boolean),
    countries,
    languages,
    releaseDate,
    year,
    runtime: isMovie ? d.runtime || null : (d.episode_run_time?.[0] ?? d.last_episode_to_air?.runtime ?? null),
    rating: Math.round((d.vote_average ?? 0) * 10) / 10,
    voteCount: d.vote_count ?? 0,
    popularity: d.popularity ?? 0,
    posterUrl: img(d.poster_path, 'w780'),
    backdropUrl: img(d.backdrop_path, 'w1280'),
    trailerKey: pickTrailerKey(d.videos?.results),
    cast: cast
      .filter((c) => personIds.has(c.id))
      .map((c, order) => ({ person: personIds.get(c.id), character: c.character ?? '', order })),
    crew: crew
      .filter((c) => personIds.has(c.person.id))
      .map((c) => ({ person: personIds.get(c.person.id), job: c.job })),
    numberOfSeasons: d.number_of_seasons ?? 0,
    numberOfEpisodes: d.number_of_episodes ?? 0,
    tmdbSyncedAt: new Date(),
  };

  const slug = await resolveSlug(kind, id, name, year);
  const upsertTitle = (slugToUse) =>
    withDupRetry(() =>
      Title.findOneAndUpdate(
        { tmdbType: kind, tmdbId: id },
        {
          $set: fields,
          // only on first insert, so re-running the import never undoes admin edits
          $setOnInsert: {
            slug: slugToUse,
            isFree: false,
            videoUrl: '',
            hasVideo: false,
            isPublished: true,
            viewCount: 0,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
    );
  let titleDoc;
  try {
    titleDoc = await upsertTitle(slug);
  } catch (err) {
    // Another worker took the same slug a moment ago (same name and year). Type + TMDB id is unique, so use it.
    if (err?.code === 11000 && /slug/.test(err.message)) titleDoc = await upsertTitle(`${slug}-${kind}-${id}`);
    else throw err;
  }

  if (!isMovie) await importSeasons(titleDoc, id, d);
  return 'imported';
}

// ---------------------------------------------------------------- candidate lists

async function collectIds(kind, target, params, fallbackParams) {
  const wanted = Math.ceil(target * 1.2) + 5; // spare candidates: some get skipped (no poster / overview)
  const ids = [];
  const seen = new Set();

  const run = async (extra) => {
    for (let page = 1; ids.length < wanted && page <= 500; page += 1) {
      const data = await tmdb(`/discover/${kind}`, {
        language: 'en-US',
        include_adult: false,
        sort_by: 'popularity.desc',
        page,
        ...extra,
      });
      if (!data?.results?.length) break;
      for (const r of data.results) {
        if (!seen.has(r.id)) {
          seen.add(r.id);
          ids.push(r.id);
        }
      }
      if (page >= data.total_pages) break;
    }
  };

  await run(params);
  if (ids.length < wanted && fallbackParams) await run(fallbackParams); // e.g. relax the vote threshold
  return ids;
}

async function importBatch(label, kind, target, params, fallbackParams, genreIds, summary) {
  if (target === 0) return;
  const ids = await collectIds(kind, target, params, fallbackParams);
  const result = { imported: 0, skipped: 0, missing: 0, failed: 0 };
  let finished = 0;
  let inFlight = 0;
  let cursor = 0;

  // A slot is reserved before each import starts, so we never end up above the target;
  // skipped or failed titles free their slot and the next candidate takes it.
  const worker = async () => {
    for (;;) {
      if (result.imported >= target) return;
      if (result.imported + inFlight >= target) {
        if (inFlight === 0) return;
        await sleep(20);
        continue;
      }
      if (cursor >= ids.length) return;
      const id = ids[cursor];
      cursor += 1;
      inFlight += 1;
      try {
        result[await importTitle(kind, id, genreIds)] += 1;
      } catch (err) {
        result.failed += 1;
        summary.failures.push(`${label} ${id}: ${err.message}`);
      } finally {
        inFlight -= 1;
      }
      finished += 1;
      if (finished % 25 === 0)
        console.log(`  [${label}] ${result.imported}/${target} imported (${finished}/${ids.length} tried)`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));

  summary.results[label] = result;
  console.log(`  [${label}] done: ${result.imported} imported, ${result.skipped} skipped, ${result.failed} failed`);
}

// ---------------------------------------------------------------- free titles

/** Top the free set up to FREE_TARGET (8 movies / 4 series / 3 reality for 15), best-rated first. */
async function markFreeTitles() {
  const reality = Math.min(FREE_TARGET, Math.round(FREE_TARGET * 0.2));
  const series = Math.min(FREE_TARGET - reality, Math.round(FREE_TARGET * 0.27));
  const quota = { movie: FREE_TARGET - reality - series, series, reality };

  let stream = 0;
  let marked = 0;
  for (const [type, want] of Object.entries(quota)) {
    const have = await Title.countDocuments({ type, isFree: true });
    const need = want - have;
    if (need <= 0) continue;

    // good, well-known titles make the better taster; the vote floor keeps out one-vote 10/10s
    const picks = await Title.find({ type, isFree: false, isPublished: true, voteCount: { $gte: 200 } })
      .sort({ rating: -1, voteCount: -1 })
      .limit(need)
      .select('_id')
      .lean();

    for (const pick of picks) {
      const videoUrl = DEMO_STREAMS[stream % DEMO_STREAMS.length];
      stream += 1;
      await Title.updateOne({ _id: pick._id }, { $set: { isFree: true, videoUrl, hasVideo: true } });
      // series and reality shows play per episode, so every episode gets the demo stream too
      if (type !== 'movie') {
        await Episode.updateMany({ title: pick._id }, { $set: { isFree: true, videoUrl, hasVideo: true } });
      }
      marked += 1;
    }
  }
  return marked;
}

// ---------------------------------------------------------------- main

async function main() {
  if (!apiKey && !readToken) {
    console.error('Set TMDB_API_KEY (or TMDB_READ_TOKEN) in .env first: https://www.themoviedb.org/settings/api');
    process.exit(1);
  }
  if (process.env.DNS_SERVERS) {
    dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
  }

  const startedAt = Date.now();
  const summary = { results: {}, failures: [] };

  await mongoose.connect(config.mongoose.url);
  // make sure unique indexes exist before concurrent upserts rely on them
  await Promise.all([Title, Genre, Person, Season, Episode].map((m) => m.init()));
  console.log(
    `Importing from TMDB: ${TARGETS.movie} movies, ${TARGETS.series} series, ${TARGETS.reality} reality (concurrency ${CONCURRENCY})`
  );

  console.log('Genres...');
  const genreIds = await importGenres();

  console.log('Movies...');
  await importBatch(
    'movies',
    'movie',
    TARGETS.movie,
    { 'vote_count.gte': 300 },
    { 'vote_count.gte': 50 },
    genreIds,
    summary
  );
  console.log('Series...');
  await importBatch(
    'series',
    'tv',
    TARGETS.series,
    { 'vote_count.gte': 200, without_genres: NOT_SERIES_GENRES },
    { 'vote_count.gte': 50, without_genres: NOT_SERIES_GENRES },
    genreIds,
    summary
  );
  console.log('Reality shows...');
  await importBatch(
    'reality',
    'tv',
    TARGETS.reality,
    { with_genres: REALITY_GENRE, 'vote_count.gte': 30 },
    { with_genres: REALITY_GENRE, 'vote_count.gte': 0 },
    genreIds,
    summary
  );

  const freeMarked = FREE_TARGET > 0 ? await markFreeTitles() : 0;

  // report
  const [perType, free, totals] = await Promise.all([
    Title.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
    Title.aggregate([{ $match: { isFree: true } }, { $group: { _id: '$type', count: { $sum: 1 } } }]),
    Promise.all([Genre.countDocuments(), Person.countDocuments(), Season.countDocuments(), Episode.countDocuments()]),
  ]);
  const count = (rows, type) => rows.find((r) => r._id === type)?.count ?? 0;

  console.log('\nTitles in the database');
  for (const type of ['movie', 'series', 'reality']) {
    console.log(`  ${type.padEnd(8)} ${String(count(perType, type)).padStart(4)}   (free: ${count(free, type)})`);
  }
  console.log(
    `  total    ${String(perType.reduce((n, r) => n + r.count, 0)).padStart(4)}   (free: ${free.reduce((n, r) => n + r.count, 0)}, newly marked this run: ${freeMarked})`
  );
  console.log(`Genres ${totals[0]}, people ${totals[1]}, seasons ${totals[2]}, episodes ${totals[3]}`);
  console.log(
    `TMDB requests ${stats.requests}, rate-limited ${stats.rateLimited}, retried ${stats.retries}, took ${Math.round((Date.now() - startedAt) / 1000)}s`
  );
  if (summary.failures.length) {
    console.log(`\n${summary.failures.length} failures (first 10):`);
    summary.failures.slice(0, 10).forEach((f) => console.log(`  ${f}`));
  }

  await mongoose.disconnect();
  const attempted = Object.values(summary.results).reduce((n, r) => n + r.imported + r.failed, 0);
  process.exit(summary.failures.length > attempted * 0.1 ? 1 : 0);
}

main().catch(async (err) => {
  console.error(`Import failed: ${err.message}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
