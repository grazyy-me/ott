/**
 * One trailer at a time, app-wide. A player claims the slot right before it creates its iframe, and the
 * previous owner is disposed synchronously in that same call, so two YouTube iframes never exist at once.
 */
interface Owner {
  id: symbol
  dispose: () => void
}

let current: Owner | null = null

export function claimTrailerSlot(id: symbol, dispose: () => void) {
  if (current && current.id !== id) {
    const previous = current
    current = null
    previous.dispose()
  }
  current = { id, dispose }
}

export function releaseTrailerSlot(id: symbol) {
  if (current?.id === id) current = null
}
