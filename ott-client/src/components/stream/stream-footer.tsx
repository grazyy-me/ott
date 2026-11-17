import { Link } from 'react-router'
import { Logo } from '@/assets/logo'
import { APP_NAME } from '@/lib/config'

const COLUMNS = [
  {
    heading: 'Browse',
    links: [
      { label: 'Movies', to: '/movies' },
      { label: 'Series', to: '/series' },
      { label: 'Reality', to: '/reality' },
      { label: 'Search', to: '/search' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Plans', to: '/pricing' },
      { label: 'Your account', to: '/account' },
      { label: 'Sign in', to: '/sign-in' },
    ],
  },
]

export function StreamFooter() {
  return (
    <footer className='relative mt-24 border-t border-border'>
      <div className='grid shell gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr]'>
        <div>
          <Link to='/' className='inline-flex items-center gap-2.5'>
            <Logo className='h-9' />
            <span className='font-display text-xl font-bold tracking-tight'>
              {APP_NAME}
            </span>
          </Link>
          <p className='mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground'>
            Movies, series and reality shows from around the world.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.heading} aria-label={column.heading}>
            <h2 className='text-eyebrow font-semibold text-muted-foreground uppercase'>
              {column.heading}
            </h2>
            <ul className='mt-5 space-y-3 pointer-coarse:space-y-0'>
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className='inline-flex items-center text-sm text-foreground/80 transition-colors hover:text-foreground'
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className='grid shell gap-4 border-t border-border py-6 text-xs text-muted-foreground md:grid-cols-[1fr_auto] md:items-start'>
        {/* TMDB's terms require this notice wherever their data or images appear */}
        <p className='max-w-xl leading-relaxed'>
          Title information and images from{' '}
          <a
            href='https://www.themoviedb.org/'
            target='_blank'
            rel='noopener noreferrer'
            className='underline underline-offset-4 hover:text-foreground'
          >
            The Movie Database (TMDB)
          </a>
          . This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </p>
        <nav aria-label='Legal'>
          <ul className='flex flex-wrap gap-x-5 gap-y-2'>
            <li>
              © {new Date().getFullYear()} {APP_NAME}
            </li>
            {[
              { label: 'Terms', to: '/terms' },
              { label: 'Privacy', to: '/privacy' },
              { label: 'Refunds and cancellation', to: '/refunds' },
            ].map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className='inline-flex items-center underline-offset-4 hover:text-foreground hover:underline'
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
