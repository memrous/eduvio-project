import { useState, useMemo, useEffect } from 'react'
import { useCalendarGrid, formatDateKey } from './useCalendarGrid'
import { useCalendarFilters } from './useCalendarFilters'
import { useEventForm } from './useEventForm'
import { getSubjectColor } from '../../utils/subjectColors'

export { formatDateKey } from './useCalendarGrid'

export const TYPE_COLOR_MAP = {
  'Lecture': { color: 'blue', dot: 'var(--color-primary)', bg: 'bg-primary-container', text: 'text-on-primary-container' },
  'Lab': { color: 'blue', dot: 'var(--color-primary)', bg: 'bg-primary-container', text: 'text-on-primary-container' },
  'Assignment': { color: 'green', dot: 'var(--color-secondary)', bg: 'bg-secondary-container', text: 'text-on-secondary-container' },
  'Test': { color: 'orange', dot: 'var(--color-tertiary)', bg: 'bg-tertiary-container', text: 'text-on-tertiary-container' },
  'Quiz': { color: 'orange', dot: 'var(--color-tertiary)', bg: 'bg-tertiary-container', text: 'text-on-tertiary-container' },
  'Exam': { color: 'red', dot: 'var(--color-error)', bg: 'bg-error-container', text: 'text-on-error-container' },
  'Deadline': { color: 'red', dot: 'var(--color-error)', bg: 'bg-error-container', text: 'text-on-error-container' },
  'default': { color: 'grey', dot: 'var(--color-outline-variant)', bg: 'bg-surface-container', text: 'text-on-surface-variant' }
}

export const getEventStyle = (type) => {
  return TYPE_COLOR_MAP[type] || TYPE_COLOR_MAP['default']
}

// Same color for a subject everywhere: event blocks (bg/text) and filter dots (dot)
export const getSubjectStyle = (subject) => {
  const { bg, text, dot } = getSubjectColor(subject)
  return { bg, text, dot }
}

export const useCalendarState = ({
  currentEvents = [],
  currentSubjects = [],
  onCreateEvent,
  onEditEvent,
  openEventId,
  onCloseOpenEvent,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [selectedDetailEvent, setSelectedDetailEvent] = useState(null)

  const grid = useCalendarGrid()
  const filters = useCalendarFilters(currentEvents, currentSubjects)
  const form = useEventForm({
    currentSubjects,
    onEditEvent,
    onCreateEvent,
    setIsModalOpen,
  })

  // Synchronize calendar selected date / view when openEventId is provided (e.g. from Dashboard)
  useEffect(() => {
    if (openEventId) {
      const targetEvent = filters.preparedEvents.find(e => e.id === Number(openEventId))
      if (targetEvent) {
        const eventDateObj = new Date(targetEvent.date)
        setTimeout(() => {
          grid.setSelectedDate(eventDateObj)
          grid.setCurrentMonth(new Date(eventDateObj.getFullYear(), eventDateObj.getMonth(), 1))
          setSelectedDetailEvent(targetEvent)
        }, 0)
      }
      if (onCloseOpenEvent) {
        onCloseOpenEvent()
      }
    }
  }, [openEventId, filters.preparedEvents, onCloseOpenEvent, grid])

  const handleEventSelect = (event) => {
    const eventDateObj = new Date(event.date)
    grid.setSelectedDate(eventDateObj)
    grid.setCurrentMonth(new Date(eventDateObj.getFullYear(), eventDateObj.getMonth(), 1))
    setSelectedDetailEvent(event)
  }

  // Deadlines and written tests open in the same panel; "date" is a local YYYY-MM-DD
  const handleDeadlineSelect = (deadline) => {
    const [y, m, d] = String(deadline.date).slice(0, 10).split('-').map(Number)
    const dateObj = new Date(y, m - 1, d)
    grid.setSelectedDate(dateObj)
    grid.setCurrentMonth(new Date(y, m - 1, 1))
    setSelectedDetailEvent({ ...deadline, _kind: 'deadline' })
  }

  const openCreateModal = () => {
    form.openCreateModal(formatDateKey(grid.selectedDate))
  }

  const selectedDayEvents = useMemo(() => {
    const key = formatDateKey(grid.selectedDate)
    return filters.filteredEvents.filter(e => e.date === key)
  }, [filters.filteredEvents, grid.selectedDate])

  const upcomingEventsList = useMemo(() => {
    const startOfDay = new Date(grid.selectedDate)
    startOfDay.setHours(0, 0, 0, 0)
    
    return filters.filteredEvents
      .filter(e => {
        const eventDate = new Date(e.date)
        return eventDate >= startOfDay
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return (a.startTime || '').localeCompare(b.startTime || '')
      })
      .slice(0, 5)
  }, [filters.filteredEvents, grid.selectedDate])

  return {
    ...grid,
    ...filters,
    ...form,
    isModalOpen,
    setIsModalOpen,
    deleteConfirmId,
    setDeleteConfirmId,
    selectedDetailEvent,
    setSelectedDetailEvent,
    handleEventSelect,
    handleDeadlineSelect,
    openCreateModal,
    selectedDayEvents,
    upcomingEventsList,
  }
}
