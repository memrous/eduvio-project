import { useRef } from 'react'
import { Flame, Zap, GraduationCap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getSubjectStyle, formatDateKey } from './useCalendarState'
import { getLocaleFromLanguage } from '../../utils/locale'
import MonthView from './MonthView'
import WeekView from './WeekView'
import AgendaView from './AgendaView'
import MobileDayDetailSheet from './MobileDayDetailSheet'

// ─── helpers ────────────────────────────────────────────────────────────────

const getDeadlineIcon = (type) => {
  const t = String(type || '').toLowerCase()
  if (t.includes('test') || t.includes('quiz')) return Zap
  if (t.includes('exam') || t.includes('zkouška')) return GraduationCap
  return Flame
}

// ─── CalendarGrid ────────────────────────────────────────────────────────────

const CalendarGrid = ({
  activeView,
  gridDays,
  filteredEvents,
  selectedDate,
  setSelectedDate,
  handleEventSelect,
  currentWeekDays,
  hourlySlots,
  requirements = [],
  subjects = [],
}) => {
  const { t, i18n } = useTranslation(['academic', 'dashboard'])
  const locale = getLocaleFromLanguage(i18n.language)
  const sheetRef = useRef(null)

  return (
    <div className="flex flex-col w-full">
      {activeView === 'month' && (
        <MonthView
          gridDays={gridDays}
          filteredEvents={filteredEvents}
          requirements={requirements}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          handleEventSelect={handleEventSelect}
          subjects={subjects}
          onOpenMobileDetail={(d, items) => sheetRef.current?.open(d, items)}
          t={t}
        />
      )}

      {activeView === 'week' && (
        <WeekView
          filteredEvents={filteredEvents}
          requirements={requirements}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          handleEventSelect={handleEventSelect}
          currentWeekDays={currentWeekDays}
          hourlySlots={hourlySlots}
          subjects={subjects}
          getDeadlineIcon={getDeadlineIcon}
          getSubjectStyle={getSubjectStyle}
          formatDateKey={formatDateKey}
          t={t}
        />
      )}

      {activeView === 'agenda' && (
        <AgendaView
          currentWeekDays={currentWeekDays}
          filteredEvents={filteredEvents}
          requirements={requirements}
          handleEventSelect={handleEventSelect}
          subjects={subjects}
          locale={locale}
          t={t}
          getDeadlineIcon={getDeadlineIcon}
          getSubjectStyle={getSubjectStyle}
        />
      )}

      <MobileDayDetailSheet
        ref={sheetRef}
        subjects={subjects}
        handleEventSelect={handleEventSelect}
        t={t}
        getSubjectStyle={getSubjectStyle}
        getDeadlineIcon={getDeadlineIcon}
      />
    </div>
  )
}

export default CalendarGrid
