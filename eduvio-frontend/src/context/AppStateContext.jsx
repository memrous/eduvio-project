/* eslint-disable react-refresh/only-export-components */
/**
 * src/context/AppStateContext.jsx
 *
 * UI-only application state.
 *
 * ── What belongs here ─────────────────────────────────────────────
 *   • Sidebar open/close state
 *   • Modal open state (global modals)
 *   • Theme preference
 *   • todayStr — date string computed once per render, shared across the tree
 *
 * ── What does NOT belong here ─────────────────────────────────────
 *   • subjects  → useSubjects()  (React Query)
 *   • events    → useEvents()    (React Query)
 *   • resources → useResources() (React Query)
 *
 * Server data was removed in the Laravel-readiness refactor.
 * All server state is now managed by TanStack Query hooks in src/hooks/.
 */

import { createContext, useContext, useMemo } from 'react'

const AppStateContext = createContext(null)

export const AppStateProvider = ({ children }) => {
  // ── Date helpers shared across the tree ───────────────────────
  const today = new Date()
  const yyyy = today.getFullYear()
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const dd = String(today.getDate()).padStart(2, '0')
  const todayStr = `${yyyy}-${mm}-${dd}`

  const value = useMemo(
    () => ({
      todayStr,
      // Future UI state additions:
      // sidebarOpen, setSidebarOpen,
      // activeModal, setActiveModal,
      // theme, setTheme,
    }),
    [todayStr]
  )

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  )
}

export const useAppState = () => {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}
