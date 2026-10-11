import { CalendarSkeleton } from '../components/common/Skeleton'
import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSubjects } from '../hooks/useSubjects'
import { useEvents } from '../hooks/useEvents'
import { useRequirements } from '../hooks/useRequirements'
import { useWebAssessments } from '../hooks/useSyllabus'
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

  // Written tests from teachers' course pages; a failure only leaves them out
  const { data: webAssessments } = useWebAssessments()

  // The API sends dueDate; the calendar groups deadlines by "date". A row from a
  // teacher's page on a day the subject already has a requirement is left out.
  const calendarRequirements = useMemo(() => {
    const own = (requirements ?? []).map((r) => ({
      ...r,
      date: String(r.date ?? r.dueDate ?? r.due_date ?? '').slice(0, 10) || null,
    }))
    const taken = new Set(own.map((r) => `${r.subjectId ?? r.subject_id}|${r.date}`))
    const web = webAssessments.filter((a) => !taken.has(`${a.subjectId}|${a.date}`))
    return [...own, ...web]
  }, [requirements, webAssessments])

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
    return <CalendarSkeleton />
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
      requirements={calendarRequirements}
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
