/**
 * src/hooks/useStudyProgress.js
 *
 * React Query hook for GET /user/study-progress (credits, weighted average,
 * completed subjects), computed by the backend from the user's subjects.
 */

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import * as api from '../services/api'

export const STUDY_PROGRESS_KEY = 'studyProgress'

export const useStudyProgress = () => {
  const { user } = useAuth()

  const query = useQuery({
    queryKey: [STUDY_PROGRESS_KEY, user?.id],
    queryFn: () =>
      api.getStudyProgress().then((result) => {
        if (result.status === 'error') throw new Error(result.error)
        return result.data
      }),
    enabled: !!user,
  })

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
  }
}
