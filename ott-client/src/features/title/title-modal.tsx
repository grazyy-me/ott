import { useEffect, useRef, useState } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { TitleCard } from '@/types/catalog'
import { m } from 'framer-motion'
import { X } from 'lucide-react'
import { useMotion, useScrollLock } from '@/components/motion'
import { TitleDetail } from './title-detail'

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * /title/:slug over the page it was opened from. A Radix dialog (focus trap, Esc, focus returns to the
 * card) with its own scroller (Lenis is stopped while it is open). With the morph, the View Transition
 * animates the card into the backdrop and the panel shows at once; otherwise framer-motion scales and fades
 * it in (route and modal transitions are framer's only job here).
 */
export default function TitleModal({
  slug,
  seed,
  morph,
  onClose,
}: {
  slug: string
  seed?: TitleCard
  morph: boolean
  onClose: () => void
}) {
  const { reduced } = useMotion()
  const scroller = useRef<HTMLDivElement>(null)
  // the card that opened it (focused on click), to hand focus back on close
  const [opener] = useState(() =>
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
  )
  useScrollLock(true)

  // another title opened inside the modal (More Like This) starts at its top
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [slug])

  const headingId = `title-modal-${slug}`

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal forceMount>
        <DialogPrimitive.Overlay forceMount asChild>
          <m.div
            className='fixed inset-0 z-[60] bg-background/75 backdrop-blur-md'
            initial={morph ? false : { opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.3 } }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          />
        </DialogPrimitive.Overlay>
        <DialogPrimitive.Content
          forceMount
          aria-labelledby={headingId}
          aria-describedby={undefined}
          // focus the dialog itself, so Tab reaches Close next without a ring showing on open
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            scroller.current?.focus({ preventScroll: true })
          }}
          onCloseAutoFocus={(e) => {
            if (opener?.isConnected) {
              e.preventDefault()
              opener.focus({ preventScroll: true })
            }
          }}
          asChild
        >
          <div
            ref={scroller}
            data-lenis-prevent
            tabIndex={-1}
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose()
            }}
            className='fixed inset-0 z-[60] overflow-y-auto overscroll-contain outline-none'
          >
            <DialogPrimitive.Title className='sr-only'>
              {seed?.slug === slug ? seed.title : 'Title details'}
            </DialogPrimitive.Title>
            <m.div
              className='relative mx-auto my-4 w-[min(100%-1.5rem,72rem)] rounded-3xl border border-border bg-background shadow-[0_40px_120px_-30px_oklch(0_0_0/90%)] md:my-10'
              initial={
                morph
                  ? false
                  : {
                      opacity: 0,
                      y: reduced ? 0 : 48,
                      scale: reduced ? 1 : 0.97,
                    }
              }
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { duration: reduced ? 0.15 : 0.45, ease: EASE },
              }}
              exit={{
                opacity: 0,
                y: reduced ? 0 : 32,
                scale: reduced ? 1 : 0.98,
                transition: { duration: reduced ? 0.1 : 0.22, ease: 'easeIn' },
              }}
            >
              <DialogPrimitive.Close
                aria-label='Close'
                className='absolute top-4 right-4 z-20 flex size-10 items-center justify-center rounded-full glass transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring'
              >
                <X className='size-5' />
              </DialogPrimitive.Close>
              <TitleDetail
                slug={slug}
                seed={seed}
                variant='modal'
                morph={morph}
                scrollContainer={scroller}
                headingId={headingId}
              />
            </m.div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
