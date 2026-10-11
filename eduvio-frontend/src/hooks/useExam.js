/**
 * src/hooks/useExam.js
 *
 * Exam section of the subject detail.
 *
 *   useExamTerms(subjectId)  — exam / credit terms from IS/STAG (read-only)
 *   useExamTopics(subjectId) — the student's topic checklist:
 *     data, isLoading, error, addTopics(titles[]), updateTopic(id, fields), deleteTopic(id)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../services/api'
import { isSameId } from '../utils/ids'

export const EXAM_TERMS_KEY = 'examTerms'
export const EXAM_TOPICS_KEY = 'examTopics'

const unwrap = (result) => {
  if (result.status === 'error') throw new Error(result.error)
  return result.data
}

export const useExamTerms = (subjectId) => {
  const query = useQuery({
    queryKey: [EXAM_TERMS_KEY, String(subjectId)],
    queryFn: () => api.getExamTerms(subjectId).then(unwrap).then((data) => data ?? []),
    enabled: !!subjectId,
  })

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  }
}

export const useExamTopics = (subjectId) => {
  const queryClient = useQueryClient()
  const queryKey = [EXAM_TOPICS_KEY, String(subjectId)]

  const query = useQuery({
    queryKey,
    queryFn: () => api.getExamTopics(subjectId).then(unwrap).then((data) => data ?? []),
    enabled: !!subjectId,
  })

  /** Optimistic change of the cached list; returns the previous list for rollback. */
  const changeCache = async (change) => {
    await queryClient.cancelQueries({ queryKey })
    const previous = queryClient.getQueryData(queryKey)
    queryClient.setQueryData(queryKey, (old) => change(old ?? []))
    return { previous }
  }
  const rollback = (err, vars, context) => {
    if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
  }
  const refetch = () => queryClient.invalidateQueries({ queryKey })

  const addMutation = useMutation({
    mutationFn: (titles) => api.addExamTopics(subjectId, titles).then(unwrap),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKey, (old) => [...(old ?? []), ...(created ?? [])])
    },
    onSettled: refetch,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, fields }) => api.updateExamTopic(id, fields).then(unwrap),
    onMutate: ({ id, fields }) =>
      changeCache((list) => list.map((t) => (isSameId(t.id, id) ? { ...t, ...fields } : t))),
    onError: rollback,
    onSettled: refetch,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteExamTopic(id).then(unwrap),
    onMutate: (id) => changeCache((list) => list.filter((t) => !isSameId(t.id, id))),
    onError: rollback,
    onSettled: refetch,
  })

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    isAdding: addMutation.isPending,
    addTopics: (titles) => addMutation.mutateAsync(titles),
    updateTopic: (id, fields) => updateMutation.mutateAsync({ id, fields }),
    deleteTopic: (id) => deleteMutation.mutateAsync(id),
  }
}
