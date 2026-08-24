import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import * as api from '../services/api'

const extractRequirements = (result) => {
  if (result.status === 'error') {
    throw new Error(result.error)
  }
  return result.data || []
}

export const useRequirements = (subjectId) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = subjectId ? ['requirements', subjectId] : ['requirements', 'all']

  const query = useQuery({
    queryKey,
    queryFn: () => api.getRequirements(subjectId).then(extractRequirements),
    enabled: subjectId ? !!subjectId : !!user,
  })

  const createMutation = useMutation({
    mutationFn: (newRequirement) =>
      api.createRequirement(newRequirement).then((res) => {
        if (res.status === 'error') throw new Error(res.error)
        return res.data
      }),
    onMutate: async (newRequirement) => {
      await queryClient.cancelQueries({ queryKey })
      const previousRequirements = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old) => [
        ...(old ?? []),
        { ...newRequirement, id: Date.now() },
      ])
      return { previousRequirements }
    },
    onError: (err, newRequirement, context) => {
      if (context?.previousRequirements) {
        queryClient.setQueryData(queryKey, context.previousRequirements)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }) =>
      api.updateRequirement(id, updates).then((res) => {
        if (res.status === 'error') throw new Error(res.error)
        return res.data
      }),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousRequirements = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old) =>
        (old ?? []).map((req) => (req.id === id ? { ...req, ...updates } : req))
      )
      return { previousRequirements }
    },
    onError: (err, variables, context) => {
      if (context?.previousRequirements) {
        queryClient.setQueryData(queryKey, context.previousRequirements)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) =>
      api.deleteRequirement(id).then((res) => {
        if (res.status === 'error') throw new Error(res.error)
        return res.data
      }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey })
      const previousRequirements = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old) =>
        (old ?? []).filter((req) => req.id !== id)
      )
      return { previousRequirements }
    },
    onError: (err, id, context) => {
      if (context?.previousRequirements) {
        queryClient.setQueryData(queryKey, context.previousRequirements)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
    createRequirement: (newRequirement) => createMutation.mutate(newRequirement),
    updateRequirement: (id, updates) => updateMutation.mutate({ id, updates }),
    deleteRequirement: (id) => deleteMutation.mutate(id),
  }
}
