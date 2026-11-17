import { useEffect } from 'react'
import { APP_NAME } from '@/lib/config'

/**
 * Sets the tab title to "<title> · <app name>" and restores the previous one on unmount
 * (a closing modal gives the page its title back).
 */
export function useDocumentTitle(title?: string | null) {
  useEffect(() => {
    const previous = document.title
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
    return () => {
      document.title = previous
    }
  }, [title])
}
