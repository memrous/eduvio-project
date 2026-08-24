/**
 * src/lib/queryClient.js
 *
 * Centralised React Query client.
 * Imported once in main.jsx and passed to <QueryClientProvider>.
 *
 * staleTime: 0  — every query is considered stale immediately after fetch in mock mode.
 *               This mirrors the old behaviour where data was always
 *               re-fetched on mount via loadUserData().
 *               When using the Laravel backend (non-mock mode), this is raised to 30s.
 *
 * retry: 1      — on transient failure, retry once before surfacing the error.
 *
 * refetchOnWindowFocus: false — avoids surprise re-fetches while the
 *                               mock localStorage backend is in use.
 *                               Re-enabled dynamically when switching to a real API.
 */

import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: import.meta.env.VITE_USE_MOCK === 'true' ? 0 : 30000,
      refetchOnWindowFocus: import.meta.env.VITE_USE_MOCK !== 'true',
      retry: 1,
    },
  },
})

export default queryClient
