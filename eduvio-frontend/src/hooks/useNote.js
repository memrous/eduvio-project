import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../services/api'

const extractNote = (result) => {
  if (result.status === 'error') {
    throw new Error(result.error)
  }
  return result.data || { content: null }
}

export const useNote = (subjectId) => {
  const queryClient = useQueryClient()
  const queryKey = ['note', subjectId]

  const query = useQuery({
    queryKey,
    queryFn: () => api.getNote(subjectId).then(extractNote),
    enabled: !!subjectId,
  })

  const saveMutation = useMutation({
    mutationFn: (content) =>
      api.updateNote(subjectId, content).then((res) => {
        if (res.status === 'error') throw new Error(res.error)
        return res.data
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  return {
    data: query.data ?? { content: null },
    isLoading: query.isLoading,
    saveNote: (content) => saveMutation.mutate(content),
  }
}
