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
 *   updateResource  (id, updates) => void   — semester links only
 *   deleteResource  (id) => void
 *   markResourceSeen (id) => void           — clears page_links_new
 *   assignResourceEvent (id, eventId|null) => void — lesson of a material
 *   updateMaterial  (id, fields) => void    — own materials (fields, file, lesson)
 *   setResourceHidden (id, hidden) => void  — Moodle and automatic materials
 *   setResourceForExam (id, forExam) => void — any material, "for the exam" mark
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import * as api from '../services/api'
import { createTempId, isSameId } from '../utils/ids'

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

/**
 * @param {{ enabled?: boolean }} [options] enabled=false only reads the cache (no request)
 */
export const useResources = ({ enabled = true } = {}) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = [RESOURCES_KEY, user?.id]

  // ── Query ──────────────────────────────────────────────────────
  const query = useQuery({
    queryKey,
    queryFn: () => api.getResources(user.id).then(extractResources),
    enabled: !!user && enabled,
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
      // Shown right away (Materials page and subject detail share this cache) until the refetch
      const { file, ...fields } = newResource
      const optimistic = {
        ...fields,
        id: createTempId(),
        category: fields.category ?? 'file',
        size: file ? fields.size : fields.size ?? 'External Link',
        uploadedAt: new Date().toISOString(),
      }
      queryClient.setQueryData(queryKey, (old) => [...(old ?? []), optimistic])
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

  // ── Mutations: edit / delete (semester links) ─────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) => api.updateResource(user.id, id, updates).then(res => {
      if (res.status === 'error') throw new Error(res.error)
      return res.data
    }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteResource(user.id, id).then(res => {
      if (res.status === 'error') throw new Error(res.error)
      return res.data
    }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey })
      const previousResources = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old) => (old ?? []).filter((r) => !isSameId(r.id, id)))
      return { previousResources }
    },
    onError: (err, id, context) => {
      if (context?.previousResources) {
        queryClient.setQueryData(queryKey, context.previousResources)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // ── Mutation: new files on a linked page were seen ────────────
  const seenMutation = useMutation({
    mutationFn: (id) => api.markResourceSeen(user.id, id).then(res => {
      if (res.status === 'error') throw new Error(res.error)
      return res.data
    }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey })
      const previousResources = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old) =>
        (old ?? []).map((r) => (isSameId(r.id, id) ? { ...r, page_links_new: null } : r))
      )
      return { previousResources }
    },
    onError: (err, id, context) => {
      if (context?.previousResources) {
        queryClient.setQueryData(queryKey, context.previousResources)
      }
    },
  })

  // ── Mutation: move a material to a lesson (or make it general) ─
  const assignEventMutation = useMutation({
    mutationFn: ({ id, eventId }) => api.assignResourceEvent(user.id, id, eventId).then(res => {
      if (res.status === 'error') throw new Error(res.error)
      return res.data
    }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // ── Mutation: edit a material (fields, lesson, file replacement) ─
  const updateMaterialMutation = useMutation({
    mutationFn: ({ id, fields }) => api.updateMaterial(user.id, id, fields).then(res => {
      if (res.status === 'error') throw new Error(res.error)
      return res.data
    }),
    onMutate: async ({ id, fields }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousResources = queryClient.getQueryData(queryKey)
      // Text fields show right away; a replaced file is shown after the refetch
      const { file, ...changes } = fields
      if ('subjectId' in changes) changes.subject_id = changes.subjectId
      if ('eventId' in changes) changes.event_id = changes.eventId
      queryClient.setQueryData(queryKey, (old) =>
        (old ?? []).map((r) => (isSameId(r.id, id) ? { ...r, ...changes, ...(file ? { file_name: file.name } : {}) } : r))
      )
      return { previousResources }
    },
    onError: (err, vars, context) => {
      if (context?.previousResources) {
        queryClient.setQueryData(queryKey, context.previousResources)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // ── Mutation: hide / show again (Moodle and automatic materials) ─
  const hiddenMutation = useMutation({
    mutationFn: ({ id, hidden }) => (hidden ? api.hideResource(user.id, id) : api.unhideResource(user.id, id)).then(res => {
      if (res.status === 'error') throw new Error(res.error)
      return res.data
    }),
    onMutate: async ({ id, hidden }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousResources = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old) =>
        (old ?? []).map((r) => (isSameId(r.id, id) ? { ...r, hidden_at: hidden ? new Date().toISOString() : null } : r))
      )
      return { previousResources }
    },
    onError: (err, vars, context) => {
      if (context?.previousResources) {
        queryClient.setQueryData(queryKey, context.previousResources)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // ── Mutation: mark / unmark a material for the exam ───────────
  const forExamMutation = useMutation({
    mutationFn: ({ id, forExam }) => api.setResourceForExam(user.id, id, forExam).then(res => {
      if (res.status === 'error') throw new Error(res.error)
      return res.data
    }),
    onMutate: async ({ id, forExam }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousResources = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old) =>
        (old ?? []).map((r) => (isSameId(r.id, id) ? { ...r, for_exam: forExam } : r))
      )
      return { previousResources }
    },
    onError: (err, vars, context) => {
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
    updateResource: (id, updates) => updateMutation.mutateAsync({ id, updates }),
    deleteResource: (id) => deleteMutation.mutateAsync(id),
    markResourceSeen: (id) => seenMutation.mutateAsync(id),
    assignResourceEvent: (id, eventId) => assignEventMutation.mutateAsync({ id, eventId }),
    updateMaterial: (id, fields) => updateMaterialMutation.mutateAsync({ id, fields }),
    setResourceHidden: (id, hidden) => hiddenMutation.mutateAsync({ id, hidden }),
    setResourceForExam: (id, forExam) => forExamMutation.mutateAsync({ id, forExam }),
  }
}
