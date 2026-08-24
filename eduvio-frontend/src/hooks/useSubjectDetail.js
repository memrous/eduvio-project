import { useQuery } from '@tanstack/react-query'
import * as api from '../services/api'

const extractSubjectDetail = (result) => {
  if (result.status === 'error') {
    throw new Error(result.error)
  }
  return result.data || null
}

export const useSubjectDetail = (subjectId) => {
  const query = useQuery({
    queryKey: ['subjectDetail', subjectId],
    queryFn: () => api.getSubjectDetail(subjectId).then(extractSubjectDetail),
    enabled: !!subjectId,
  })

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}
