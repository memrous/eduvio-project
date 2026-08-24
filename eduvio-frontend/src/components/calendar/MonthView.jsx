import DayCell from './DayCell'
import { formatDateKey } from './useCalendarState'

const MonthView = ({
  gridDays,
  filteredEvents,
  requirements = [],
  selectedDate,
  setSelectedDate,
  handleEventSelect,
  subjects = [],
  onOpenMobileDetail,
  t,
}) => {
  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest flex flex-col w-full">
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-outline-variant bg-surface-container-low/50 text-center py-2.5">
        {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(d => (
          <span key={d} className="text-xs font-semibold uppercase text-on-surface-variant">
            {t(`academic:calendarGrid.days.${d}`)}
          </span>
        ))}
      </div>

      {/* Grid cells */}
      <div className="grid grid-cols-7 bg-surface-container-lowest">
        {gridDays.map((day, idx) => {
          const dayEvents = filteredEvents.filter(e => e.date === day.dateKey)
          const dayDeadlines = requirements.filter(r => r.date === day.dateKey && !r.completed)
          const isSelected = formatDateKey(selectedDate) === day.dateKey
          const isToday = formatDateKey(new Date()) === day.dateKey
          return (
            <DayCell
              key={idx}
              day={day}
              dayEvents={dayEvents}
              dayDeadlines={dayDeadlines}
              isSelected={isSelected}
              isToday={isToday}
              setSelectedDate={setSelectedDate}
              handleEventSelect={handleEventSelect}
              onOpenMobileDetail={onOpenMobileDetail}
              subjects={subjects}
            />
          )
        })}
      </div>
    </div>
  )
}

export default MonthView
