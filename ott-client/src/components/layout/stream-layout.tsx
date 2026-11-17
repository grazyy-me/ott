import { createElement, lazy, Suspense, useLayoutEffect, useState } from 'react'
import { matchPath, useLocation, useNavigate } from 'react-router'
import { AnimatePresence, LazyMotion } from 'framer-motion'
import { RouteTransition, useSmoothScroll } from '@/components/motion'
import { SkipToMain } from '@/components/skip-to-main'
import { Grain } from '@/components/stream/grain'
import { PreviewProvider } from '@/components/stream/preview/preview-provider'
import { StreamFooter } from '@/components/stream/stream-footer'
import { StreamNav } from '@/components/stream/stream-nav'
import {
  loadedTitleModal,
  preloadTitleModal,
  readTitleLinkState,
  TitleModalContext,
} from '@/features/title/modal-state'

const loadFramerFeatures = () =>
  import('@/components/motion/framer-features').then((m) => m.default)

const LazyTitleModal = lazy(preloadTitleModal)

/**
 * Public shell for every stream page: dark stream tokens, smooth scroll, grain, floating nav, footer,
 * cross-faded page changes, the hover preview, and title modals. It starts the app's one Lenis loop
 * (useSmoothScroll; the instance lives in the root MotionProvider). Lazy-loaded by the router, so the
 * motion libraries stay out of the sign-in and admin bundles.
 *
 * Title modals: a link to /title/:slug carries the page it came from (`backgroundLocation`). If that page
 * is the one on screen, it stays rendered (reading its own location) and the title opens over it. After a
 * reload the page is gone, so the title renders as a full page from its route instead.
 */
export function StreamLayout() {
  // switch the document to the stream tokens (stream.css) before the first paint
  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.surface = 'stream'
    return () => {
      delete root.dataset.surface
    }
  }, [])

  useSmoothScroll()

  const location = useLocation()
  const navigate = useNavigate()
  const linkState = readTitleLinkState(location.state)
  const background = linkState.backgroundLocation

  // the history entry of the page on screen (any entry that isn't a title modal)
  const [pageKey, setPageKey] = useState(location.key)
  if (!background && pageKey !== location.key) setPageKey(location.key)

  const modalOpen = Boolean(background && background.key === pageKey)
  const slug = modalOpen
    ? matchPath('/title/:slug', location.pathname)?.params.slug
    : undefined
  const closeModal = () => navigate(-(linkState.depth ?? 1))

  return (
    <LazyMotion features={loadFramerFeatures} strict>
      <TitleModalContext.Provider value={modalOpen}>
        <PreviewProvider>
          <SkipToMain />
          <Grain />
          <StreamNav />
          <main id='content' tabIndex={-1} className='relative outline-none'>
            <RouteTransition
              pageLocation={modalOpen ? background : undefined}
            />
          </main>
          <StreamFooter />
          <AnimatePresence>
            {slug && (
              <Suspense key='title-modal' fallback={null}>
                {/* the preloaded component when its code is here (no suspend, so the morph finds the
                    backdrop in the navigation's own commit), else the lazy one. Both are module-level;
                    the only switch is lazy -> loaded, once, if the code arrives while a modal is open. */}
                {createElement(loadedTitleModal() ?? LazyTitleModal, {
                  slug,
                  seed: linkState.seed,
                  morph: Boolean(linkState.morph),
                  onClose: closeModal,
                })}
              </Suspense>
            )}
          </AnimatePresence>
        </PreviewProvider>
      </TitleModalContext.Provider>
    </LazyMotion>
  )
}
