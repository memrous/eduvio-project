/**
 * src/hooks/useSubjects.js
 *
 * React Query hook for the Subjects collection.
 *
 * Data flow:
 *   Component → useSubjects() → api.getSubjects() → localStorage (mock) / Laravel (real)
 *
 * Exposes:
 *   data        Subject[]   — the fetched list (defaults to [])
 *   isLoading   boolean     — true on first fetch
 *   error       string|null — human-readable error string, or null
 *   refetch     () => void  — manually re-trigger the query
 *   addSubject  (Subject) => void — optimistic-safe mutation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import * as api from '../services/api'

export const SUBJECTS_KEY = 'subjects'

/**
 * Normalise the API response envelope into a plain array.
 * Handles both `data = Subject[]` and `data = { subjects: Subject[] }`.
 * @param {import('../services/api').ApiResult} result
 * @returns {import('../contracts/subject').Subject[]}
 */
const extractSubjects = (result) => {
  if (result.status === 'error') {
    throw new Error(result.error)
  }
  const { data } = result
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.subjects)) return data.subjects
  return []
}

export const useSubjects = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = [SUBJECTS_KEY, user?.id]

  // ── Query ──────────────────────────────────────────────────────
  const query = useQuery({
    queryKey,
    queryFn: () => api.getSubjects(user.id).then(extractSubjects),
    enabled: !!user,
  })

  // ── Mutation: add subject ─────────────────────────────────────
  const addSubjectMutation = useMutation({
    mutationFn: (newSubject) => api.createSubject(user.id, newSubject).then(res => {
      if (res.status === 'error') throw new Error(res.error)
      return res.data
    }),
    onMutate: async (newSubject) => {
      await queryClient.cancelQueries({ queryKey })
      const previousSubjects = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old) => [...(old ?? []), newSubject])
      return { previousSubjects }
    },
    onError: (err, newSubject, context) => {
      if (context?.previousSubjects) {
        queryClient.setQueryData(queryKey, context.previousSubjects)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // ── Mutation: delete subject ──────────────────────────────────
  const deleteSubjectMutation = useMutation({
    mutationFn: (subjectId) => api.deleteSubject(user.id, subjectId).then(res => {
      if (res.status === 'error') throw new Error(res.error)
      return res.data
    }),
    onMutate: async (subjectId) => {
      await queryClient.cancelQueries({ queryKey })
      const previousSubjects = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old) => (old ?? []).filter(s => s.id !== subjectId))
      return { previousSubjects }
    },
    onError: (err, subjectId, context) => {
      if (context?.previousSubjects) {
        queryClient.setQueryData(queryKey, context.previousSubjects)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  return {
    /** @type {import('../contracts/subject').Subject[]} */
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
    addSubject: (subject) => addSubjectMutation.mutate(subject),
    deleteSubject: (subjectId) => deleteSubjectMutation.mutate(subjectId),
  }
}
