import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSubjects } from '../hooks/useSubjects'
import { useEvents } from '../hooks/useEvents'
import { useRequirements } from '../hooks/useRequirements'
import CalendarView from '../components/CalendarView'
import PageState from '../components/PageState'

const CalendarPage = () => {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const location = useLocation()
  // openEventId may be passed via navigate('/calendar', { state: { openEventId } })
  const [openEventId, setOpenEventId] = useState(
    location.state?.openEventId ?? null
  )

  const { data: subjects, isLoading: subjectsLoading, error: subjectsError, refetch: refetchSubjects } = useSubjects()
  const {
    data: events,
    isLoading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents,
    createEvent: handleCreateEvent,
    editEvent: handleEditEvent,
    deleteEvent: handleDeleteEvent,
  } = useEvents()
  const {
    data: requirements,
    isLoading: requirementsLoading,
    error: requirementsError,
    refetch: refetchRequirements
  } = useRequirements()

  const currentSubjects = subjects ?? []
  const currentEvents = events ?? []
  const isLoading = subjectsLoading || eventsLoading || requirementsLoading
  const error = subjectsError || eventsError || requirementsError
  const reloadData = () => {
    refetchSubjects()
    refetchEvents()
    refetchRequirements()
  }

  // Clear the router state so a refresh doesn't re-open the event
  useEffect(() => {
    if (location.state?.openEventId) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.state?.openEventId, navigate, location.pathname])

  if (isLoading) {
    return <PageState variant="loading" title={t('loading')} />
  }

  if (error) {
    return (
      <PageState
        variant="error"
        title={error}
        description={t('errorDescription')}
        actionLabel={t('tryAgain')}
        onAction={reloadData}
      />
    )
  }

  if (currentEvents.length === 0 && currentSubjects.length === 0) {
    return (
      <PageState
        variant="empty"
        title={t('noData')}
        description={t('calendarEmptyDescription')}
      />
    )
  }

  return (
    <CalendarView
      events={currentEvents}
      subjects={currentSubjects}
      requirements={requirements}
      onCreateEvent={handleCreateEvent}
      onEditEvent={handleEditEvent}
      onDeleteEvent={handleDeleteEvent}
      onOpenSubject={(subjectId) => navigate(`/subjects/${subjectId}`)}
      openEventId={openEventId}
      onCloseOpenEvent={() => setOpenEventId(null)}
    />
  )
}

export default CalendarPage
