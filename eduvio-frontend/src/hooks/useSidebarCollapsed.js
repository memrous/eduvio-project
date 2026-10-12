import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'eduvio-sidebar'
// Full sidebar from this width, the icon rail between lg (1024 px) and this
const WIDE_QUERY = '(min-width: 1280px)'

const readPreference = () => {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'collapsed' || value === 'expanded' ? value : null
  } catch {
    return null
  }
}

const isWideScreen = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.(WIDE_QUERY).matches)

/**
 * Desktop sidebar state: the icon rail below 1280 px, the full sidebar above,
 * unless the user collapsed or expanded it by hand (remembered in localStorage).
 */
export const useSidebarCollapsed = () => {
  const [isWide, setIsWide] = useState(isWideScreen)
  const [preference, setPreference] = useState(readPreference)

  useEffect(() => {
    const media = window.matchMedia?.(WIDE_QUERY)
    if (!media) return
    const onChange = (event) => setIsWide(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const collapsed = preference ? preference === 'collapsed' : !isWide

  const toggle = useCallback(() => {
    const next = collapsed ? 'expanded' : 'collapsed'
    setPreference(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage unavailable (private mode): the choice lasts until reload
    }
  }, [collapsed])

  return { collapsed, toggle }
}
