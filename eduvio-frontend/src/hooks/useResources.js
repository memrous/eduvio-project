/**
 * src/hooks/useResources.js
 *
 * React Query hook for the Materials / Resources collection.
 *
 * Data flow:
 *   Component → useResources() → api.getResources() → localStorage (mock) / Laravel (real)
 *
 * Exposes:
 *   data            Material[]   — the fetched list (defaults to [])
 *   isLoading       boolean
 *   error           string|null
 *   refetch         () => void
 *   uploadResource  (Material) => void
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import * as api from '../services/api'

export const RESOURCES_KEY = 'resources'

/**
 * Normalise the API response envelope into a plain array.
 * @param {import('../services/api').ApiResult} result
 * @returns {import('../contracts/material').Material[]}
 */
const extractResources = (result) => {
  if (result.status === 'error') {
    throw new Error(result.error)
  }
  const { data } = result
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.resources)) return data.resources
  return []
}

export const useResources = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = [RESOURCES_KEY, user?.id]

  // ── Query ──────────────────────────────────────────────────────
  const query = useQuery({
    queryKey,
    queryFn: () => api.getResources(user.id).then(extractResources),
    enabled: !!user,
  })

  // ── Mutation: upload / add resource ───────────────────────────
  const uploadMutation = useMutation({
    mutationFn: (newResource) => api.createResource(user.id, newResource).then(res => {
      if (res.status === 'error') throw new Error(res.error)
      return res.data
    }),
    onMutate: async (newResource) => {
      await queryClient.cancelQueries({ queryKey })
      const previousResources = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old) => [...(old ?? []), newResource])
      return { previousResources }
    },
    onError: (err, newResource, context) => {
      if (context?.previousResources) {
        queryClient.setQueryData(queryKey, context.previousResources)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  return {
    /** @type {import('../contracts/material').Material[]} */
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
    uploadResource: (resource) => uploadMutation.mutateAsync(resource),
  }
}
