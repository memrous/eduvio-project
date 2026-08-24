import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import * as api from '../services/api'

export const useDashboardSummary = () => {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: ['dashboardSummary', user?.id],
    queryFn: () => api.getDashboardSummary(user?.id).then((result) => {
      if (result.status === 'error') throw new Error(result.error)
      return result.data
    }),
    enabled: !!user,
  })
  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}
