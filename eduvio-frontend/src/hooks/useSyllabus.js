/**
 * src/hooks/useSyllabus.js
 *
 * Semester schedule found on teachers' course pages.
 *
 *   useSyllabus(subjectId)  — rows of one subject: data, isLoading, error, hideItem(id)
 *   useWebAssessments()     — written tests etc. of all subjects in the shape of
 *                             requirements (source "web"), for the calendar
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import * as api from '../services/api'
import { isSameId } from '../utils/ids'

export const SYLLABUS_KEY = 'syllabus'
export const WEB_ASSESSMENTS_KEY = 'webAssessments'

const unwrap = (result) => {
  if (result.status === 'error') throw new Error(result.error)
  return result.data ?? []
}

export const useSyllabus = (subjectId) => {
  const queryClient = useQueryClient()
  const queryKey = [SYLLABUS_KEY, String(subjectId)]

  const query = useQuery({
    queryKey,
    queryFn: () => api.getSyllabus(subjectId).then(unwrap),
    enabled: !!subjectId,
  })

  const hideMutation = useMutation({
    mutationFn: (id) => api.hideSyllabusItem(id).then(unwrap),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old) => (old ?? []).filter((item) => !isSameId(item.id, id)))
      return { previous }
    },
    onError: (err, id, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: [WEB_ASSESSMENTS_KEY] })
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] })
    },
  })

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    hideItem: (id) => hideMutation.mutateAsync(id),
  }
}

export const useWebAssessments = () => {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: [WEB_ASSESSMENTS_KEY, user?.id],
    queryFn: () => api.getWebAssessments().then(unwrap),
    enabled: !!user,
  })

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}
