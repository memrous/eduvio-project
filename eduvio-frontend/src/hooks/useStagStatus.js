import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import * as api from '../services/api'
import { SUBJECTS_KEY } from './useSubjects'
import { EVENTS_KEY } from './useEvents'

export const STAG_STATUS_KEY = 'stagStatus'

/**
 * GET /user/stag/status — sync mode, last sync and agent token metadata.
 * The response never contains the plain agent token, so caching it is safe.
 *
 * Refetched whenever the window regains focus (the local agent syncs while the
 * user is elsewhere). When stag_synced_at changes, the synced data is invalidated
 * so subjects, events and the dashboard pick up the new sync without a reload.
 */
export const useStagStatus = ({ enabled = true } = {}) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: [STAG_STATUS_KEY, user?.id],
    queryFn: () => api.getStagSyncStatus().then((result) => {
      if (result.status === 'error') throw new Error(result.error)
      return result.data
    }),
    enabled: enabled && !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  // TanStack Query only refetches on `visibilitychange`; switching back from another window
  // (e.g. the terminal where the agent just ran) keeps the tab visible, so also listen to `focus`.
  const { refetch } = query
  const isEnabled = enabled && !!user
  useEffect(() => {
    if (!isEnabled) return
    const onFocus = () => refetch({ cancelRefetch: false })
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [isEnabled, refetch])

  const syncedAt = query.data?.stag_synced_at
  const previousSyncedAt = useRef(undefined)

  useEffect(() => {
    if (query.data === undefined) return

    // First value seen by this component is the baseline, not a change
    if (previousSyncedAt.current !== undefined && previousSyncedAt.current !== syncedAt) {
      // Prefix match covers every user / subject variant of these queries
      queryClient.invalidateQueries({ queryKey: [SUBJECTS_KEY] })
      queryClient.invalidateQueries({ queryKey: [EVENTS_KEY] })
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] })
      queryClient.invalidateQueries({ queryKey: ['subjectDetail'] })
    }
    previousSyncedAt.current = syncedAt ?? null
  }, [query.data, syncedAt, queryClient])

  return {
    status: query.data ?? null,
    mode: query.data?.mode ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}
