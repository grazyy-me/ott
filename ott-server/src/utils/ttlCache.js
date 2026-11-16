/**
 * A small in-process cache with a time-to-live per entry. Concurrent misses for the same key share one load.
 * Per instance only (each Render instance has its own), which is fine for minutes-long rail caching.
 */
export const createTtlCache = () => {
  const entries = new Map();

  return {
    /** The cached value for `key`, or the result of `load()` kept for `ttlMs` */
    async get(key, ttlMs, load) {
      const hit = entries.get(key);
      if (hit && hit.expires > Date.now()) return hit.value;
      const value = load();
      entries.set(key, { value, expires: Date.now() + ttlMs });
      try {
        return await value;
      } catch (error) {
        entries.delete(key); // don't keep a failure
        throw error;
      }
    },
    /** Drops every entry whose key starts with `prefix` */
    clear(prefix = '') {
      for (const key of entries.keys()) if (key.startsWith(prefix)) entries.delete(key);
    },
  };
};
