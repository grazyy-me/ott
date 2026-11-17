import { useLocation, useNavigate } from 'react-router'
import type { TitleCard } from '@/types/catalog'
import { useMotion } from '@/components/motion'
import {
  MORPH_NAME,
  readTitleLinkState,
  supportsViewTransitions,
  useTitleModalOpen,
  type TitleLinkState,
} from '@/features/title/modal-state'

/**
 * Where a title link goes, and with what history state: over the current page as a modal, or (inside an
 * open modal) to the next title in the same modal. Morphs the card's picture into the modal's backdrop
 * with a View Transition, except inside a modal and with reduced motion.
 */
export function useTitleLink(title: TitleCard) {
  const location = useLocation()
  const modalOpen = useTitleModalOpen()
  const { reduced } = useMotion()
  const current = readTitleLinkState(location.state)
  const morph = !modalOpen && !reduced && supportsViewTransitions()

  const state: TitleLinkState = modalOpen
    ? {
        backgroundLocation: current.backgroundLocation,
        seed: title,
        depth: (current.depth ?? 1) + 1,
      }
    : { backgroundLocation: location, seed: title, depth: 1, morph }

  /** Names the picture inside `root` for the morph (only for the moment of the transition) */
  const markMorphSource = (root: HTMLElement | null) => {
    if (!morph || !root) return
    const media = root.querySelector<HTMLElement>('[data-title-media]')
    if (!media) return
    media.style.viewTransitionName = MORPH_NAME
    window.setTimeout(() => (media.style.viewTransitionName = ''), 1200)
  }

  return {
    to: `/title/${title.slug}`,
    state,
    viewTransition: morph,
    markMorphSource,
  }
}

/**
 * useTitleLink's navigation for a click handler (hero, Coverflow).
 * `root` holds the `[data-title-media]` picture to morph from.
 */
export function useOpenTitle() {
  const navigate = useNavigate()
  const location = useLocation()
  const modalOpen = useTitleModalOpen()
  const { reduced } = useMotion()

  return (title: TitleCard, root?: HTMLElement | null) => {
    const current = readTitleLinkState(location.state)
    const morph = !modalOpen && !reduced && supportsViewTransitions()
    const state: TitleLinkState = modalOpen
      ? {
          backgroundLocation: current.backgroundLocation,
          seed: title,
          depth: (current.depth ?? 1) + 1,
        }
      : { backgroundLocation: location, seed: title, depth: 1, morph }
    const media = morph
      ? root?.querySelector<HTMLElement>('[data-title-media]')
      : null
    if (media) {
      media.style.viewTransitionName = MORPH_NAME
      window.setTimeout(() => (media.style.viewTransitionName = ''), 1200)
    }
    navigate(`/title/${title.slug}`, {
      state,
      viewTransition: morph,
      preventScrollReset: true,
    })
  }
}
