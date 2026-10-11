import { useEffect, useRef } from 'react'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent)

/** Shortcut shown in the search field. */
export const SEARCH_SHORTCUT_LABEL = isMac ? '⌘K' : 'Ctrl K'

const isTextField = (el) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

/** Ctrl+K / Cmd+K anywhere, "/" outside text fields. */
const isSearchShortcut = (event) => {
  if (event.altKey || event.shiftKey) return false
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') return true
  return event.key === '/' && !event.ctrlKey && !event.metaKey && !isTextField(event.target)
}

/**
 * Calls `onShortcut` for the search shortcut while the element in `targetRef`
 * is rendered and visible. The desktop and the mobile layout are both mounted
 * (one hidden by CSS), so only the visible search reacts.
 */
export const useSearchShortcut = (targetRef, onShortcut, enabled = true) => {
  const callbackRef = useRef(onShortcut)
  useEffect(() => {
    callbackRef.current = onShortcut
  })

  useEffect(() => {
    if (!enabled) return
    const handleKeyDown = (event) => {
      if (!isSearchShortcut(event)) return
      const target = targetRef.current
      if (!target || target.getClientRects().length === 0) return
      event.preventDefault()
      callbackRef.current()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [targetRef, enabled])
}
