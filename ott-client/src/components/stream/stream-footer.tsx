import { Link } from 'react-router'
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
      { label: 'Plans', to: '/plans' },
      { label: 'Your account', to: '/settings' },
      { label: 'Sign in', to: '/sign-in' },
    ],
  },
]

// TMDB attribution goes here before launch (TMDB's terms require it); see CLAUDE.md, phase 7.
export function StreamFooter() {
  return (
    <footer className='relative mt-24 border-t border-border'>
      <div className='shell grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr]'>
        <div>
          <Link to='/' className='inline-flex items-center gap-2.5'>
            <span
              aria-hidden='true'
              className='size-7 rounded-full bg-stream-gradient'
            />
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
            <ul className='mt-5 space-y-3'>
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className='text-sm text-foreground/80 transition-colors hover:text-foreground'
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className='shell border-t border-border py-6 text-xs text-muted-foreground'>
        © {new Date().getFullYear()} {APP_NAME}
      </div>
    </footer>
  )
}
