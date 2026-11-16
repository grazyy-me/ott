import { forwardRef, type ReactNode, type MouseEvent } from 'react'
import { Link } from 'react-router'
import type { TitleCard } from '@/types/catalog'
import { cn } from '@/lib/utils'
import { preloadTitleModal } from '@/features/title/modal-state'
import { usePreviewTrigger } from './preview/preview-context'
import { useTitleLink } from './use-title-link'

/**
 * A card's link to its title: opens the details (modal over this page), and on desktop shows the hover
 * preview after 400ms. The picture inside should carry `data-title-media`.
 */
export const TitleLink = forwardRef<
  HTMLAnchorElement,
  {
    title: TitleCard
    children: ReactNode
    className?: string
    'aria-label'?: string
    /** Off for links inside the preview itself */
    preview?: boolean
  }
>(function TitleLink(
  { title, children, className, preview = true, ...rest },
  ref
) {
  const link = useTitleLink(title)
  const trigger = usePreviewTrigger(title, preview)

  return (
    <Link
      ref={ref}
      to={link.to}
      state={link.state}
      viewTransition={link.viewTransition}
      // the page behind the modal stays where it was
      preventScrollReset
      aria-label={rest['aria-label']}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        trigger.dismiss()
        link.markMorphSource(e.currentTarget)
      }}
      onPointerEnter={(e) => {
        void preloadTitleModal()
        trigger.onPointerEnter(e)
      }}
      onPointerMove={trigger.onPointerMove}
      onPointerLeave={trigger.onPointerLeave}
      onFocus={(e) => {
        void preloadTitleModal()
        trigger.onFocus(e)
      }}
      onBlur={trigger.onBlur}
      className={cn(
        'outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
    >
      {children}
    </Link>
  )
})
