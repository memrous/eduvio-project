/**
 * src/hooks/useEvents.js
 *
 * React Query hook for the Events collection.
 *
 * Data flow:
 *   Component → useEvents() → api.getEvents() → localStorage (mock) / Laravel (real)
 *
 * Exposes:
 *   data                Event[]  — the fetched list (defaults to [])
 *   isLoading           boolean
 *   error               string|null
 *   refetch             () => void
 *   createEvent         (Event) => void
 *   editEvent           (Event) => void
 *   deleteEvent         (id: number) => void
 *   updateEventStatus   (id: number, status: string) => void
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import * as api from '../services/api'

export const EVENTS_KEY = 'events'

/**
 * Normalise the API response envelope into a plain array.
 * @param {import('../services/api').ApiResult} result
 * @returns {import('../contracts/event').Event[]}
 */
const extractEvents = (result) => {
  if (result.status === 'error') {
    throw new Error(result.error)
  }
  const { data } = result
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.events)) return data.events
  return []
}

export const useEvents = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = [EVENTS_KEY, user?.id]

  // ── Query ──────────────────────────────────────────────────────
  const query = useQuery({
    queryKey,
    queryFn: () => api.getEvents(user.id).then(extractEvents),
    enabled: !!user,
  })

  // ── Mutation: create event ────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (newEvent) => api.createEvent(user.id, newEvent).then(res => {
      if (res.status === 'error') throw new Error(res.error)
      return res.data
    }),
    onMutate: async (newEvent) => {
      await queryClient.cancelQueries({ queryKey })
      const previousEvents = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old) => [...(old ?? []), newEvent])
      return { previousEvents }
    },
    onError: (err, newEvent, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(queryKey, context.previousEvents)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // ── Mutation: edit event ──────────────────────────────────────
  const editMutation = useMutation({
    mutationFn: (updatedEvent) => api.editEvent(user.id, updatedEvent.id, updatedEvent).then(res => {
      if (res.status === 'error') throw new Error(res.error)
      return res.data
    }),
    onMutate: async (updatedEvent) => {
      await queryClient.cancelQueries({ queryKey })
      const previousEvents = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old) =>
        (old ?? []).map((e) => (e.id === updatedEvent.id ? updatedEvent : e))
      )
      return { previousEvents }
    },
    onError: (err, updatedEvent, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(queryKey, context.previousEvents)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // ── Mutation: delete event ────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (eventId) => api.deleteEvent(user.id, eventId).then(res => {
      if (res.status === 'error') throw new Error(res.error)
      return res.data
    }),
    onMutate: async (eventId) => {
      await queryClient.cancelQueries({ queryKey })
      const previousEvents = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old) =>
        (old ?? []).filter((e) => e.id !== eventId)
      )
      return { previousEvents }
    },
    onError: (err, eventId, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(queryKey, context.previousEvents)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  // ── Mutation: update event status ─────────────────────────────
  const updateStatusMutation = useMutation({
    mutationFn: ({ eventId, status }) => api.updateEventStatus(user.id, eventId, status).then(res => {
      if (res.status === 'error') throw new Error(res.error)
      return res.data
    }),
    onMutate: async ({ eventId, status }) => {
      await queryClient.cancelQueries({ queryKey })
      const previousEvents = queryClient.getQueryData(queryKey)
      queryClient.setQueryData(queryKey, (old) =>
        (old ?? []).map((e) => (e.id === eventId ? { ...e, status } : e))
      )
      return { previousEvents }
    },
    onError: (err, _, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(queryKey, context.previousEvents)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  return {
    /** @type {import('../contracts/event').Event[]} */
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
    createEvent: (event) => createMutation.mutate(event),
    editEvent: (event) => editMutation.mutate(event),
    deleteEvent: (id) => deleteMutation.mutate(id),
    updateEventStatus: (eventId, status) =>
      updateStatusMutation.mutate({ eventId, status }),
  }
}
