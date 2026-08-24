import { ChevronLeft, ChevronRight, Paperclip, MapPin } from 'lucide-react'

const WEEKDAYS_LONG = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const WeekView = ({
  filteredEvents,
  requirements = [],
  selectedDate,
  setSelectedDate,
  handleEventSelect,
  currentWeekDays,
  hourlySlots,
  subjects = [],
  getDeadlineIcon,
  getSubjectStyle,
  formatDateKey,
  t,
}) => {
  const selectedDateKey = formatDateKey(selectedDate)
  const mobileWeekDay = currentWeekDays.find(d => d.dateKey === selectedDateKey) || currentWeekDays[0]

  const goToPrevDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    setSelectedDate(d)
  }
  const goToNextDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    setSelectedDate(d)
  }

  return (
    <>
      {/* ── MOBILE: Single-day view ─────────────────────────────────────────────────── */}
      <div className="block md:hidden w-full border border-outline-variant rounded-xl overflow-hidden bg-surface-container-lowest">
        {/* Mobile day header with prev/next arrows */}
        {(() => {
          const day = mobileWeekDay
          const isToday = formatDateKey(new Date()) === day.dateKey
          const dayIndex = ['mon','tue','wed','thu','fri','sat','sun'].indexOf(day.dayName)
          const longName = t(`academic:calendarGrid.daysLong.${WEEKDAYS_LONG[dayIndex] ?? day.dayName}`, day.dayName)
          return (
            <div className={`flex items-center justify-center gap-3 px-4 py-3 border-b border-outline-variant bg-surface-container-low/50 ${isToday ? 'bg-primary/5' : ''}`}>
              <button
                onClick={goToPrevDay}
                aria-label={t('academic:calendarGrid.prevDay')}
                className="p-1.5 rounded-full hover:bg-surface-container-low text-on-surface-variant transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                  {longName}
                </span>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  isToday ? 'bg-primary text-white shadow-sm' : 'text-on-surface'
                }`}>
                  {day.dayNum}
                </span>
              </div>
              <button
                onClick={goToNextDay}
                aria-label={t('academic:calendarGrid.nextDay')}
                className="p-1.5 rounded-full hover:bg-surface-container-low text-on-surface-variant transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )
        })()}

        {/* Mobile deadline banner for selected day */}
        {(() => {
          const dayDeadlines = requirements.filter(r => r.date === mobileWeekDay.dateKey && !r.completed)
          if (!dayDeadlines.length) return null
          return (
            <div className="flex flex-col gap-1 px-3 py-2 border-b border-outline-variant bg-surface-container-low/30">
              {dayDeadlines.map(req => {
                const subject = subjects.find(s => s.id === req.subjectId || s.id === req.subject_id)
                const style = getSubjectStyle(subject)
                const Icon = getDeadlineIcon(req.type)
                return (
                  <div
                    key={req.id}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded border border-rose-400/50 truncate ${style.bg} ${style.text}`}
                  >
                    <Icon className="w-3 h-3 shrink-0 text-rose-600" />
                    <span className="shrink-0 tabular-nums opacity-80">{req.time || '23:59'}</span>
                    <span className="truncate">{req.title}</span>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* Mobile hourly grid — single column */}
        <div className="flex bg-surface max-h-[480px] overflow-y-auto">
          {/* Time gutter */}
          <div className="flex flex-col divide-y divide-outline-variant/30 border-r border-outline-variant/30 shrink-0 w-[44px]">
            {hourlySlots.map(hour => (
              <div key={hour} className="h-[46px] flex items-start justify-end pr-2 pt-1 relative">
                <span className="absolute -top-1.5 right-1.5 text-[9px] font-semibold tabular-nums text-on-surface-variant">{hour}</span>
              </div>
            ))}
          </div>
          {/* Single day column */}
          {(() => {
            const day = mobileWeekDay
            const isToday = formatDateKey(new Date()) === day.dateKey
            const dayEvents = filteredEvents
              .filter(e => e.date === day.dateKey)
              .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
            return (
              <div className={`relative flex-1 flex flex-col divide-y divide-outline-variant/20 ${isToday ? 'bg-primary/5' : ''}`}>
                {hourlySlots.map(hour => (
                  <div key={hour} className="h-[46px]" />
                ))}
                {dayEvents.map(event => {
                  const subject = subjects.find(s => s.id === event.subjectId || s.name === event.subject)
                  const style = getSubjectStyle(subject)
                  const parseMinutes = (t) => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0) }
                  const startMin = parseMinutes(event.startTime)
                  const endMin = parseMinutes(event.endTime)
                  const gridStartMin = parseMinutes(hourlySlots[0])
                  const slotHeight = 46
                  let topPx = null, heightPx = null
                  if (startMin !== null && gridStartMin !== null) {
                    topPx = ((startMin - gridStartMin) / 60) * slotHeight
                    heightPx = endMin && endMin > startMin ? Math.max(((endMin - startMin) / 60) * slotHeight, 32) : slotHeight
                  }
                  if (topPx !== null) {
                    return (
                      <div
                        key={event.id}
                        onClick={() => handleEventSelect(event)}
                        style={{ top: topPx, height: heightPx, left: 3, right: 3 }}
                        className={`absolute rounded-md p-1.5 flex flex-col overflow-hidden border border-outline-variant/30 hover:z-10 hover:shadow-md cursor-pointer transition-all ${style.bg} ${style.text}`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold uppercase truncate">{event.code}</span>
                          {event.requirementId && <Paperclip className="ml-auto size-2.5 shrink-0 opacity-80" />}
                        </div>
                        {heightPx > 36 && <span className="text-[10px] truncate leading-tight opacity-90">{event.title}</span>}
                        {heightPx > 50 && event.startTime && (
                          <span className="mt-auto text-[9px] opacity-70 tabular-nums">{event.startTime}</span>
                        )}
                      </div>
                    )
                  }
                  return (
                    <div key={event.id} onClick={() => handleEventSelect(event)} className={`m-1 p-2 rounded-md flex flex-col gap-0.5 cursor-pointer border border-outline-variant/30 ${style.bg} ${style.text}`}>
                      <span className="text-[10px] font-bold uppercase truncate">{event.code}</span>
                      <span className="text-[10px] truncate">{event.title}</span>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      </div>

      {/* ── DESKTOP: Full 7-column scrollable view ──────────────────────────────────── */}
      <div className="hidden md:block w-full border border-outline-variant rounded-xl overflow-x-auto bg-surface-container-lowest">
      <div className="flex flex-col min-w-[700px]">

      {/* Day headers */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] min-w-[700px] border-b border-outline-variant bg-surface-container-low/50 py-2.5 text-center font-semibold">
        <div className="border-r border-outline-variant/30" />
        {currentWeekDays.map(day => {
          const isSelected = formatDateKey(selectedDate) === day.dateKey
          const isToday = formatDateKey(new Date()) === day.dateKey
          return (
            <div
              key={day.dateKey}
              onClick={() => setSelectedDate(day.date)}
              className={`flex items-baseline justify-between gap-2 border-r border-outline-variant/30 px-2.5 py-1 cursor-pointer transition-colors last:border-r-0 hover:bg-surface-container-low/30 ${
                isSelected ? 'text-primary' : 'text-on-surface'
              } ${isToday ? 'bg-primary/5' : ''}`}
            >
              <span className="text-xs font-semibold uppercase text-on-surface-variant">
                {t(`academic:calendarGrid.days.${day.dayName}`)}
              </span>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                isToday ? 'bg-primary text-white shadow-sm' : isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container text-on-surface'
              }`}>
                {day.dayNum}
              </span>
            </div>
          )
        })}
      </div>

      {/* CELÝ DEN — all-day deadline banner */}
      {currentWeekDays.some(d => requirements.some(r => r.date === d.dateKey && !r.completed)) && (
        <div className="grid grid-cols-[56px_repeat(7,1fr)] min-w-[700px] border-b border-outline-variant bg-surface-container-low/30">
          <div className="flex items-center justify-end pr-2.5 py-1.5 border-r border-outline-variant/30">
            <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">
              {t('academic:calendarGrid.allDay')}
            </span>
          </div>
          {currentWeekDays.map(day => {
            const dayDeadlines = requirements.filter(r => r.date === day.dateKey && !r.completed)
            const isToday = formatDateKey(new Date()) === day.dateKey
            return (
              <div key={day.dateKey} className={`p-1 flex flex-col gap-1 min-h-[32px] border-r border-outline-variant/30 last:border-r-0 ${isToday ? 'bg-primary/5' : ''}`}>
                {dayDeadlines.map(req => {
                  const subject = subjects.find(s => s.id === req.subjectId || s.id === req.subject_id)
                  const style = getSubjectStyle(subject)
                  const Icon = getDeadlineIcon(req.type)
                  return (
                    <div
                      key={req.id}
                      title={`${req.time || '23:59'} ${req.title}`}
                      className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-rose-400/50 dark:border-rose-500/40 truncate hover:brightness-95 transition-all ${style.bg} ${style.text}`}
                    >
                      <Icon className="w-2.5 h-2.5 shrink-0 text-rose-600 dark:text-rose-300" />
                      <span className="shrink-0 tabular-nums opacity-90">{req.time || '23:59'}</span>
                      <span className="truncate">{req.title}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* Hourly event grid */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] min-w-[700px] bg-surface divide-x divide-outline-variant/30 max-h-[480px] overflow-y-auto">
        <div className="flex flex-col divide-y divide-outline-variant/30 border-r border-outline-variant/30">
          {hourlySlots.map(hour => (
            <div key={hour} className="h-[46px] flex items-start justify-end pr-2 pt-1 relative">
              <span className="absolute -top-1.5 right-1.5 text-[9px] font-semibold tabular-nums text-on-surface-variant">{hour}</span>
            </div>
          ))}
        </div>

        {currentWeekDays.map(day => {
          const dayEvents = filteredEvents
            .filter(e => e.date === day.dateKey)
            .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))
          const isToday = formatDateKey(new Date()) === day.dateKey

          return (
            <div
              key={day.dateKey}
              className={`relative flex flex-col divide-y divide-outline-variant/20 hover:bg-surface-container-low/40 transition-colors ${isToday ? 'bg-primary/5' : ''}`}
            >
              {hourlySlots.map(hour => (
                <div key={hour} className="h-[46px]" />
              ))}

              {dayEvents.map(event => {
                const subject = subjects.find(s => s.id === event.subjectId || s.name === event.subject)
                const style = getSubjectStyle(subject)

                const parseMinutes = (t) => {
                  if (!t) return null
                  const [h, m] = t.split(':').map(Number)
                  return h * 60 + (m || 0)
                }
                const startMin = parseMinutes(event.startTime)
                const endMin = parseMinutes(event.endTime)
                const gridStartMin = parseMinutes(hourlySlots[0])
                const slotHeight = 46

                let topPx = null
                let heightPx = null
                if (startMin !== null && gridStartMin !== null) {
                  topPx = ((startMin - gridStartMin) / 60) * slotHeight
                  heightPx = endMin && endMin > startMin
                    ? Math.max(((endMin - startMin) / 60) * slotHeight, 32)
                    : slotHeight
                }

                const typeLabel = t(`dashboard:timetable.eventTypes.${event.type}`, event.type)

                if (topPx !== null) {
                  return (
                    <div
                      key={event.id}
                      onClick={() => handleEventSelect(event)}
                      title={`${event.code} · ${event.title}`}
                      style={{ top: topPx, height: heightPx, left: 3, right: 3 }}
                      className={`absolute rounded-md p-1.5 flex flex-col overflow-hidden border border-outline-variant/30 hover:z-10 hover:shadow-md cursor-pointer transition-all ${style.bg} ${style.text}`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold uppercase truncate">
                          {event.code}
                        </span>
                        <span className="hidden truncate text-[9px] opacity-70 sm:inline">
                          · {typeLabel}
                        </span>
                        {event.requirementId && <Paperclip className="ml-auto size-2.5 shrink-0 opacity-80" />}
                      </div>
                      {heightPx > 36 && (
                        <span className="text-[10px] truncate leading-tight opacity-90">
                          {event.title}
                        </span>
                      )}
                      {heightPx > 50 && event.location && (
                        <span className="mt-auto flex items-center gap-0.5 truncate text-[9px] font-medium opacity-90">
                          <MapPin className="size-2.5 shrink-0" />
                          <span className="truncate">{event.location}</span>
                          <span className="ml-auto shrink-0 tabular-nums opacity-70">
                            {event.startTime}
                          </span>
                        </span>
                      )}
                      {heightPx <= 50 && heightPx > 36 && (
                        <span className="text-[9px] opacity-70 mt-auto">
                          {event.startTime}
                        </span>
                      )}
                    </div>
                  )
                }

                return (
                  <div
                    key={event.id}
                    onClick={() => handleEventSelect(event)}
                    className={`m-1 p-2 rounded-md flex flex-col gap-0.5 shadow-sm cursor-pointer border border-outline-variant/30 ${style.bg} ${style.text}`}
                  >
                    <span className="text-[10px] font-bold uppercase truncate">{event.code}</span>
                    <span className="text-[10px] truncate">{event.title}</span>
                    <span className="text-[9px] opacity-70">{event.startTime}</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
      </div>
      </div>
    </>
  )
}

export default WeekView
