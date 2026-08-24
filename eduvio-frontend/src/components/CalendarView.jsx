import { useMemo, useState } from 'react'
import { PanelRightOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCalendarState, getSubjectStyle } from './calendar/useCalendarState'
import CalendarToolbar from './calendar/CalendarToolbar'
import CalendarFilterChips from './calendar/CalendarFilterChips'
import CalendarGrid from './calendar/CalendarGrid'
import EventModal from './calendar/EventModal'
import EventDetailContent from './calendar/EventDetailContent'
import QuickOverviewPanel from './calendar/QuickOverviewPanel'
import MobileEventDetailSheet from './calendar/MobileEventDetailSheet'
import { getLocaleFromLanguage } from '../utils/locale'
import { formatDateKey } from './calendar/useCalendarGrid'

const VIEWS = ['month', 'week', 'agenda']

const CalendarView = ({ 
  events: propEvents, 
  subjects: propSubjects,
  requirements: propRequirements,
  onCreateEvent, 
  onEditEvent, 
  onDeleteEvent, 
  onOpenSubject,
  openEventId,        
  onCloseOpenEvent     
}) => {
  const { t, i18n } = useTranslation(['academic', 'dashboard'])
  const currentEvents = useMemo(() => propEvents || [], [propEvents])
  const currentSubjects = useMemo(() => propSubjects || [], [propSubjects])
  const currentRequirements = useMemo(() => propRequirements || [], [propRequirements])
  const locale = getLocaleFromLanguage(i18n.language)

  const [panelOpen, setPanelOpen] = useState(true)

  const {
    selectedDate,
    setSelectedDate,
    currentMonth,
    setCurrentMonth,
    activeView,
    setActiveView,
    selectedSubjects,

    isModalOpen,
    setIsModalOpen,
    deleteConfirmId,
    setDeleteConfirmId,
    editingEventId,
    setEditingEventId,
    selectedDetailEvent,
    setSelectedDetailEvent,
    newTitle,
    setNewTitle,
    newSubject,
    setNewSubject,
    newDate,
    setNewDate,
    newTime,
    setNewTime,
    newDuration,
    setNewDuration,
    newType,
    setNewType,
    SUBJECTS,

    filteredEvents,
    gridDays,
    currentWeekDays,
    selectedDayEvents,
    hourlySlots,
    handleEventSelect,
    handleSubjectToggle,
    handlePrev,
    handleNext,
    handleFormSubmit,
    openCreateModal,
    getMonthName,
  } = useCalendarState({
    currentEvents,
    currentSubjects,
    onCreateEvent,
    onEditEvent,
    onDeleteEvent,
    openEventId,
    onCloseOpenEvent,
  })

  const todayKey = formatDateKey(new Date())
  const todayEvents = useMemo(
    () => currentEvents.filter(e => e.date === todayKey).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')),
    [currentEvents, todayKey]
  )

  const upcomingDeadlines = useMemo(() => {
    const today = todayKey
    return currentRequirements
      .filter(r => !r.completed && r.date >= today)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return (a.time || '23:59').localeCompare(b.time || '23:59')
      })
      .slice(0, 5)
  }, [currentRequirements, todayKey])

  const handleGoToToday = () => {
    const now = new Date()
    setSelectedDate(now)
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  return (
    <div className="relative flex flex-1 overflow-hidden">
      {/* MAIN CALENDAR AREA */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <CalendarToolbar
          activeView={activeView}
          setActiveView={setActiveView}
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          selectedDate={selectedDate}
          handlePrev={handlePrev}
          handleNext={handleNext}
          handleGoToToday={handleGoToToday}
          getMonthName={getMonthName}
          openCreateModal={openCreateModal}
          panelOpen={panelOpen}
          setPanelOpen={setPanelOpen}
          t={t}
          VIEWS={VIEWS}
        />

        <CalendarFilterChips
          SUBJECTS={SUBJECTS}
          currentSubjects={currentSubjects}
          selectedSubjects={selectedSubjects}
          handleSubjectToggle={handleSubjectToggle}
          getSubjectStyle={getSubjectStyle}
          t={t}
        />

        {/* Calendar grid / views */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:px-6 md:pb-6">
          <CalendarGrid
            activeView={activeView}
            gridDays={gridDays}
            filteredEvents={filteredEvents}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            handleEventSelect={handleEventSelect}
            currentWeekDays={currentWeekDays}
            selectedDayEvents={selectedDayEvents}
            hourlySlots={hourlySlots}
            openCreateModal={openCreateModal}
            requirements={currentRequirements}
            subjects={currentSubjects}
          />
        </div>
      </div>

      {/* Desktop reopen tab when panel is collapsed */}
      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          aria-label={t('academic:calendarView.showPanel', 'Zobrazit panel')}
          className="absolute right-0 top-1/2 hidden -translate-y-1/2 items-center rounded-l-lg border border-r-0 border-outline-variant bg-surface-container-lowest px-1.5 py-3 text-on-surface-variant shadow-sm transition-colors hover:bg-surface-container hover:text-foreground md:flex"
        >
          <PanelRightOpen className="size-4" />
        </button>
      )}

      {/* RIGHT PANEL: Quick overview or inline detail — hidden on mobile, collapsible on desktop */}
      <aside
        className={`hidden md:flex shrink-0 overflow-hidden border-l border-outline-variant bg-surface-container-lowest transition-all duration-300 ease-in-out ${
          panelOpen ? 'md:w-[22rem] opacity-100' : 'md:w-0 opacity-0 border-l-0'
        }`}
      >
        <div className="flex h-full w-full md:w-[22rem] flex-col gap-6 overflow-y-auto p-5">
          {selectedDetailEvent ? (
            <div>
              <EventDetailContent
                selectedDetailEvent={selectedDetailEvent}
                currentSubjects={currentSubjects}
                onClose={() => {
                  setSelectedDetailEvent(null)
                  setDeleteConfirmId(null)
                }}
                onOpenSubject={onOpenSubject}
                onEditClick={() => {
                  setEditingEventId(selectedDetailEvent.id)
                  setNewTitle(selectedDetailEvent.title)
                  setNewSubject(selectedDetailEvent.subject)
                  setNewDate(selectedDetailEvent.date)
                  setNewTime(selectedDetailEvent.startTime)
                  setNewType(selectedDetailEvent.type)
                  setIsModalOpen(true)
                  setSelectedDetailEvent(null)
                  setDeleteConfirmId(null)
                }}
                onDeleteEvent={onDeleteEvent}
                deleteConfirmId={deleteConfirmId}
                setDeleteConfirmId={setDeleteConfirmId}
              />
            </div>
          ) : (
            <QuickOverviewPanel
              selectedDate={selectedDate}
              todayEvents={todayEvents}
              upcomingDeadlines={upcomingDeadlines}
              onEventClick={handleEventSelect}
              onDeadlineClick={null}
              locale={locale}
              subjects={currentSubjects}
            />
          )}
        </div>
      </aside>

      <EventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingEventId(null)
        }}
        onSubmit={handleFormSubmit}
        SUBJECTS={SUBJECTS}
        editingEventId={editingEventId}
        newTitle={newTitle}
        setNewTitle={setNewTitle}
        newType={newType}
        setNewType={setNewType}
        newSubject={newSubject}
        setNewSubject={setNewSubject}
        newDate={newDate}
        setNewDate={setNewDate}
        newTime={newTime}
        setNewTime={setNewTime}
        newDuration={newDuration}
        setNewDuration={setNewDuration}
      />

      <MobileEventDetailSheet
        selectedDetailEvent={selectedDetailEvent}
        currentSubjects={currentSubjects}
        onClose={() => {
          setSelectedDetailEvent(null)
          setDeleteConfirmId(null)
        }}
        onOpenSubject={onOpenSubject}
        onEditClick={() => {
          if (!selectedDetailEvent) return
          setEditingEventId(selectedDetailEvent.id)
          setNewTitle(selectedDetailEvent.title)
          setNewSubject(selectedDetailEvent.subject)
          setNewDate(selectedDetailEvent.date)
          setNewTime(selectedDetailEvent.startTime)
          setNewType(selectedDetailEvent.type)
          setIsModalOpen(true)
          setSelectedDetailEvent(null)
          setDeleteConfirmId(null)
        }}
        onDeleteEvent={onDeleteEvent}
        deleteConfirmId={deleteConfirmId}
        setDeleteConfirmId={setDeleteConfirmId}
      />
    </div>
  )
}

export default CalendarView