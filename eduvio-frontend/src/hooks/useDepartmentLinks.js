/**
 * src/hooks/useDepartmentLinks.js
 *
 * Status and manual refresh of course page links found on department
 * websites (semester materials with link_source "auto").
 *
 * Exposes:
 *   supported      boolean      — the user has subjects of a supported department
 *   status         'idle'|'pending'|'success'|'failed'
 *   nextAllowedAt  string|null  — ISO time when a refresh is allowed again
 *   refresh        () => Promise
 *   isRefreshing   boolean      — request sent or job still running
 */

import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import * as api from '../services/api'
import { RESOURCES_KEY } from './useResources'

export const DEPARTMENT_LINKS_KEY = 'department-links-status'

const POLL_INTERVAL_MS = 3000

export const useDepartmentLinks = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = [DEPARTMENT_LINKS_KEY, user?.id]

  const query = useQuery({
    queryKey,
    queryFn: () => api.getDepartmentLinksStatus().then((res) => {
      if (res.status === 'error') throw new Error(res.error)
      return res.data
    }),
    enabled: !!user,
    // Poll while the background job runs
    refetchInterval: (q) => (q.state.data?.status === 'pending' ? POLL_INTERVAL_MS : false),
  })

  const status = query.data?.status ?? 'idle'

  // When the job finishes, reload materials to show the new links
  const previousStatus = useRef(status)
  useEffect(() => {
    if (previousStatus.current === 'pending' && status !== 'pending') {
      queryClient.invalidateQueries({ queryKey: [RESOURCES_KEY, user?.id] })
    }
    previousStatus.current = status
  }, [status, queryClient, user?.id])

  const refreshMutation = useMutation({
    mutationFn: () => api.refreshDepartmentLinks().then((res) => {
      // 429 carries the current status and cooldown
      if (res.status === 'error' && res.error !== 'rate_limited') throw new Error(res.error)
      return res.data
    }),
    onSuccess: (data) => {
      if (data) queryClient.setQueryData(queryKey, (old) => ({ ...old, ...data }))
    },
  })

  return {
    supported: query.data?.supported ?? false,
    status,
    nextAllowedAt: query.data?.next_allowed_at ?? null,
    refresh: () => refreshMutation.mutateAsync(),
    isRefreshing: refreshMutation.isPending || status === 'pending',
    refreshError: refreshMutation.error?.message ?? null,
  }
}
