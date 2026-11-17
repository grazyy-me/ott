/*
 * Adapted from "Floating Glassmorphic Navbar with Morphing Pill Indicator" by themeocean on 21st.dev:
 * https://21st.dev/@themeocean/components/floating-glassmorphic-navbar-with-morphing-pill-indicator
 * Changes: react-router links with the active link taken from the URL; the sliding highlight is a measured
 * CSS-transition pill instead of a framer-motion layoutId, and the entrance runs on anime.js (CLAUDE.md keeps
 * framer-motion for route and modal transitions; the small-screen menu panel still uses AnimatePresence);
 * glass tokens; search and a profile menu (kit DropdownMenu) in place of the single call-to-action button;
 * hides on scroll down and shows on scroll up (useHideOnScroll, adapted from 21st.dev "Hide On Scroll").
 */
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { animate } from 'animejs'
import { AnimatePresence, m } from 'framer-motion'
import { Bookmark, LogOut, Search, UserRound } from 'lucide-react'
import { Logo } from '@/assets/logo'
import { useAppSelector } from '@/app/hooks'
import { APP_NAME } from '@/lib/config'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useHideOnScroll, useMotion } from '@/components/motion'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { UserAvatar } from '@/components/user-avatar'
import { selectAuthStatus, selectCurrentUser } from '@/features/auth/auth-slice'

const NAV_ITEMS = [
  { label: 'Home', to: '/' },
  { label: 'Movies', to: '/movies' },
  { label: 'TV Series', to: '/series' },
  { label: 'Reality Shows', to: '/reality' },
  { label: 'My List', to: '/my-list' },
] as const

const SPRING = {
  type: 'spring',
  stiffness: 420,
  damping: 34,
  mass: 0.8,
} as const

const isActivePath = (pathname: string, to: string) =>
  to === '/'
    ? pathname === '/'
    : pathname === to || pathname.startsWith(`${to}/`)

function NavLinks({
  vertical = false,
  onNavigate,
}: {
  vertical?: boolean
  onNavigate?: () => void
}) {
  const { pathname } = useLocation()
  const { reduced } = useMotion()
  const listRef = useRef<HTMLUListElement>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [pill, setPill] = useState<{
    left: number
    width: number
    top: number
    height: number
  } | null>(null)
  const [settled, setSettled] = useState(false)

  const active =
    NAV_ITEMS.find((item) => isActivePath(pathname, item.to))?.to ?? null
  // the pill sits on the link you point at, and goes back to the current page's link when you move away
  const highlighted = hovered ?? active

  useLayoutEffect(() => {
    const list = listRef.current
    if (!list) return
    const measure = () => {
      const link = highlighted
        ? list.querySelector<HTMLElement>(`[data-to="${highlighted}"]`)
        : null
      // each link's offset parent is its own `li.relative`, so add the li's offset within the list
      const item = link?.parentElement
      setPill(
        link && item
          ? {
              left: item.offsetLeft + link.offsetLeft,
              width: link.offsetWidth,
              top: item.offsetTop + link.offsetTop,
              height: link.offsetHeight,
            }
          : null
      )
    }
    measure()
    // link widths change when the web font arrives or the list resizes
    const resize = new ResizeObserver(measure)
    resize.observe(list)
    document.fonts?.ready.then(measure)
    return () => resize.disconnect()
  }, [highlighted])

  // no slide on the very first placement
  useEffect(() => {
    if (pill && !settled) requestAnimationFrame(() => setSettled(true))
  }, [pill, settled])

  return (
    <ul
      ref={listRef}
      role='list'
      className={cn(
        'relative flex',
        vertical ? 'flex-col gap-1' : 'items-center gap-1'
      )}
      onPointerLeave={() => setHovered(null)}
    >
      {pill && (
        <span
          aria-hidden='true'
          className={cn(
            'absolute rounded-full bg-accent',
            settled &&
              !reduced &&
              'transition-[left,top,width,height] duration-300 ease-out-expo'
          )}
          style={pill}
        />
      )}
      {NAV_ITEMS.map((item) => (
        <li key={item.to} className='relative'>
          <NavLink
            to={item.to}
            end={item.to === '/'}
            data-to={item.to}
            onClick={onNavigate}
            onPointerEnter={(e) =>
              e.pointerType === 'mouse' && setHovered(item.to)
            }
            onFocus={() => setHovered(item.to)}
            onBlur={() => setHovered(null)}
            className={cn(
              'relative flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring',
              vertical && 'py-3 text-base',
              item.to === highlighted
                ? 'text-foreground'
                : 'text-muted-foreground'
            )}
          >
            {item.label}
            {item.to === active && (
              <span
                aria-hidden='true'
                className='ml-2 size-1.5 rounded-full bg-stream-gradient'
              />
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

/** Signed-in profile menu, built on the kit's DropdownMenu and SignOutDialog */
function ProfileMenu({
  onOpenChange,
}: {
  onOpenChange?: (open: boolean) => void
}) {
  const user = useAppSelector(selectCurrentUser)
  const [signOutOpen, setSignOutOpen] = useState(false)

  return (
    <>
      <DropdownMenu modal={false} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger
          aria-label='Profile menu'
          className='rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring'
        >
          <UserAvatar user={user} className='size-10' />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align='end'
          sideOffset={10}
          className='w-60 rounded-2xl glass-strong p-2'
        >
          <DropdownMenuLabel className='font-normal'>
            <p className='truncate text-sm font-medium'>{user?.name}</p>
            <p className='truncate text-xs text-muted-foreground'>
              {user?.email}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className='rounded-lg'>
            <Link to='/my-list'>
              <Bookmark aria-hidden='true' /> My List
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className='rounded-lg'>
            <Link to='/account'>
              <UserRound aria-hidden='true' /> Account & plan
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant='destructive'
            className='rounded-lg'
            onClick={() => setSignOutOpen(true)}
          >
            <LogOut aria-hidden='true' /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SignOutDialog open={signOutOpen} onOpenChange={setSignOutOpen} />
    </>
  )
}

function AccountAction({
  onMenuOpenChange,
}: {
  onMenuOpenChange?: (open: boolean) => void
}) {
  const status = useAppSelector(selectAuthStatus)
  const { pathname, search } = useLocation()

  // keep the slot's size while the session is being checked, so the bar doesn't shift
  if (status === 'checking')
    return <span aria-hidden='true' className='block size-10' />
  if (status === 'authenticated')
    return <ProfileMenu onOpenChange={onMenuOpenChange} />
  return (
    <Link
      to={`/sign-in?redirect=${encodeURIComponent(pathname + search)}`}
      className='inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97]'
    >
      Sign in
    </Link>
  )
}

export function StreamNav() {
  const { pathname } = useLocation()
  const { reduced } = useMotion()
  // the menu remembers the route it was opened on, so navigating anywhere closes it
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  const [profileOpen, setProfileOpen] = useState(false)
  const [focusWithin, setFocusWithin] = useState(false)
  // hide on scroll down, show on scroll up; never while a menu is open or focus is inside the bar
  const { hidden, atTop } = useHideOnScroll({
    pinned: open || profileOpen || focusWithin,
  })
  const rootRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  // entrance: drop in once
  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el) return
    const animation = reduced
      ? animate(el, { opacity: [0, 1], duration: 300, ease: 'linear' })
      : animate(el, {
          opacity: [0, 1],
          y: [-24, 0],
          duration: 900,
          delay: 120,
          ease: 'outExpo',
        })
    return () => {
      animation.revert()
    }
    // only on mount: a motion setting change later shouldn't replay it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ... and on Escape, an outside click, or when the screen grows past the breakpoint
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenOn(null)
        toggleRef.current?.focus()
      }
    }
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpenOn(null)
    }
    const wide = window.matchMedia('(min-width: 1024px)')
    const onWide = (e: MediaQueryListEvent) => e.matches && setOpenOn(null)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    wide.addEventListener('change', onWide)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
      wide.removeEventListener('change', onWide)
    }
  }, [open])

  return (
    <header
      className={cn(
        'pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3 sm:top-4',
        !reduced && 'transition-transform duration-500 ease-out-expo'
      )}
      style={{
        transform: hidden
          ? 'translate3d(0, calc(-100% - 1.5rem), 0)'
          : undefined,
      }}
      onFocus={() => setFocusWithin(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setFocusWithin(false)
      }}
    >
      <div
        ref={rootRef}
        className='pointer-events-auto relative w-full max-w-md lg:w-auto lg:max-w-none'
      >
        <nav
          aria-label='Main'
          className={cn(
            'relative flex items-center justify-between gap-2 rounded-full px-2 py-2 transition-[background-color] duration-300 lg:gap-6',
            atTop ? 'glass' : 'glass-strong'
          )}
        >
          {/* thin light along the top edge */}
          <span
            aria-hidden='true'
            className='pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-foreground/25 to-transparent'
          />

          <Link
            to='/'
            className='flex items-center gap-2.5 rounded-full py-1 pr-3 pl-1 transition-opacity outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring'
          >
            <Logo className='h-8' />
            <span className='font-display text-lg font-bold tracking-tight'>
              {APP_NAME}
            </span>
          </Link>

          <div className='hidden lg:block'>
            <NavLinks />
          </div>

          <div className='flex items-center gap-1.5'>
            <Link
              to='/search'
              aria-label='Search'
              className='flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring'
            >
              <Search className='size-[18px]' aria-hidden='true' />
            </Link>
            <div className='hidden lg:block'>
              <AccountAction onMenuOpenChange={setProfileOpen} />
            </div>

            <button
              ref={toggleRef}
              type='button'
              onClick={() => setOpenOn(open ? null : pathname)}
              aria-expanded={open}
              aria-controls={panelId}
              aria-label={open ? 'Close menu' : 'Open menu'}
              className='relative flex size-10 shrink-0 items-center justify-center rounded-full transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring lg:hidden'
            >
              <span aria-hidden='true' className='relative block h-3.5 w-5'>
                <span
                  className={cn(
                    'absolute left-0 block h-0.5 w-5 rounded-full bg-current transition-all duration-300 motion-reduce:transition-none',
                    open ? 'top-1.5 rotate-45' : 'top-0'
                  )}
                />
                <span
                  className={cn(
                    'absolute top-1.5 left-0 block h-0.5 w-5 rounded-full bg-current transition-all duration-200 motion-reduce:transition-none',
                    open ? 'scale-x-0 opacity-0' : 'opacity-100'
                  )}
                />
                <span
                  className={cn(
                    'absolute left-0 block h-0.5 w-5 rounded-full bg-current transition-all duration-300 motion-reduce:transition-none',
                    open ? 'top-1.5 -rotate-45' : 'top-3'
                  )}
                />
              </span>
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {open && (
            <m.div
              id={panelId}
              initial={
                reduced ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.97 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                reduced ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }
              }
              transition={reduced ? { duration: 0.1 } : SPRING}
              style={{ transformOrigin: 'top center' }}
              className='absolute inset-x-0 top-full mt-2 rounded-3xl glass-strong p-2 lg:hidden'
            >
              <NavLinks vertical onNavigate={() => setOpenOn(null)} />
              <div className='mt-2 flex items-center justify-between border-t border-border p-2 pt-3'>
                <span className='text-sm text-muted-foreground'>Account</span>
                <AccountAction onMenuOpenChange={setProfileOpen} />
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
