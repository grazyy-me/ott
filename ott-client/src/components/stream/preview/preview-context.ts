import {
  createContext,
  useContext,
  useMemo,
  type FocusEvent,
  type PointerEvent,
} from 'react'
import type { TitleCard } from '@/types/catalog'

export interface PreviewController {
  /** The pointer rests on a card: open its preview after the hover delay */
  schedule: (title: TitleCard, anchor: HTMLElement) => void
  /** The pointer left a card */
  leave: (anchor: HTMLElement) => void
  /** Keyboard focus reached a card: show its details without video */
  focus: (title: TitleCard, anchor: HTMLElement) => void
  blur: (anchor: HTMLElement) => void
  /** Close at once (the card was clicked, the page scrolled) */
  dismiss: () => void
}

const noop: PreviewController = {
  schedule: () => {},
  leave: () => {},
  focus: () => {},
  blur: () => {},
  dismiss: () => {},
}

export const PreviewContext = createContext<PreviewController>(noop)

/** Event handlers that connect a card to the hover preview. `enabled: false` for links inside the preview. */
export function usePreviewTrigger(title: TitleCard, enabled = true) {
  const preview = useContext(PreviewContext)
  return useMemo(() => {
    // the preview grows out of the card's picture, not the caption under it
    const anchorOf = (el: HTMLElement) =>
      el.querySelector<HTMLElement>('[data-title-media]') ?? el
    return {
      onPointerEnter: (e: PointerEvent<HTMLElement>) => {
        if (enabled && e.pointerType === 'mouse')
          preview.schedule(title, anchorOf(e.currentTarget))
      },
      // after a scroll the pointer may already rest inside a card: moving it counts as arriving
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        if (enabled && e.pointerType === 'mouse')
          preview.schedule(title, anchorOf(e.currentTarget))
      },
      onPointerLeave: (e: PointerEvent<HTMLElement>) => {
        if (enabled) preview.leave(anchorOf(e.currentTarget))
      },
      onFocus: (e: FocusEvent<HTMLElement>) => {
        if (enabled && e.currentTarget.matches(':focus-visible'))
          preview.focus(title, anchorOf(e.currentTarget))
      },
      onBlur: (e: FocusEvent<HTMLElement>) => {
        if (enabled) preview.blur(anchorOf(e.currentTarget))
      },
      dismiss: preview.dismiss,
    }
  }, [preview, title, enabled])
}
