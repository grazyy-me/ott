import { createContext, useContext } from 'react'
import type { Location } from 'react-router'
import type { TitleCard } from '@/types/catalog'

/**
 * What a title link puts in the history entry. With `backgroundLocation`, /title/:slug opens as a modal
 * over that page (StreamLayout keeps it rendered underneath); without it, or after a reload, as a page.
 */
export interface TitleLinkState {
  backgroundLocation?: Location
  /** The card's data, so the modal paints its hero at once while the details load */
  seed?: TitleCard
  /** How many title modals deep we are: Close goes back this many entries */
  depth?: number
  /** Opened with a card-to-modal morph (View Transitions) */
  morph?: boolean
}

export const readTitleLinkState = (state: unknown): TitleLinkState =>
  state && typeof state === 'object' ? (state as TitleLinkState) : {}

/** True while a title modal is open over a page */
export const TitleModalContext = createContext(false)
export const useTitleModalOpen = () => useContext(TitleModalContext)

/** The name the card's picture and the modal's backdrop share for the morph */
export const MORPH_NAME = 'title-media'

export const supportsViewTransitions = () =>
  typeof document !== 'undefined' && 'startViewTransition' in document

type TitleModalComponent = typeof import('./title-modal').default
let loadedModal: TitleModalComponent | null = null

/** Starts downloading the modal's code before the click, so the morph has its target ready */
export const preloadTitleModal = () =>
  import('./title-modal').then((module) => {
    loadedModal = module.default
    return module
  })

/**
 * The modal component once its code is here. Rendering it directly (not through React.lazy, which suspends
 * on its first render even when the code is cached) puts the backdrop on screen in the same commit as the
 * navigation, which is when the View Transition captures its new state.
 */
export const loadedTitleModal = () => loadedModal
