import { Paperclip, MapPin, Clock } from 'lucide-react'

const AgendaView = ({
  currentWeekDays,
  filteredEvents,
  requirements = [],
  handleEventSelect,
  subjects = [],
  locale,
  t,
  getDeadlineIcon,
  getSubjectStyle,
}) => {
  return (
    <div className="w-full flex flex-col gap-4">
      {currentWeekDays.map(day => {
        const dayEvents = filteredEvents
          .filter(e => e.date === day.dateKey)
          .map(e => ({ ...e, _kind: 'event' }))
        const dayDeadlines = requirements
          .filter(r => r.date === day.dateKey && !r.completed)
          .map(r => ({ ...r, _kind: 'deadline' }))

        const allItems = [...dayEvents, ...dayDeadlines].sort((a, b) => {
          const ta = a.startTime || a.time || '23:59'
          const tb = b.startTime || b.time || '23:59'
          return ta.localeCompare(tb)
        })

        const dayLabel = day.date.toLocaleDateString(locale, { weekday: 'long' })
        const dateLabel = day.date.toLocaleDateString(locale, { day: 'numeric', month: 'numeric' })

        return (
          <div key={day.dateKey} className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
            {/* Day header */}
            <div className="flex items-baseline gap-2 border-b border-outline-variant bg-surface-container-low/40 px-4 py-2.5">
              <span className="text-sm font-semibold capitalize text-on-surface">
                {dayLabel}
              </span>
              <span className="text-xs text-on-surface-variant">
                {dateLabel}
              </span>
            </div>

            {allItems.length === 0 ? (
              <div className="px-4 py-4 text-xs text-on-surface-variant italic">
                {t('academic:calendarGrid.noEvents')}
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/30 flex flex-col">
                {allItems.map((item, idx) => {
                  if (item._kind === 'event') {
                    const subject = subjects.find(s => s.id === item.subjectId || s.name === item.subject)
                    const style = getSubjectStyle(subject)
                    const typeLabel = t(`dashboard:timetable.eventTypes.${item.type}`, item.type)
                    const timeRange = item.endTime && item.endTime !== item.startTime
                      ? `${item.startTime}–${item.endTime}`
                      : item.startTime

                    return (
                      <div
                        key={`e-${item.id}-${idx}`}
                        onClick={() => handleEventSelect(item)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container-low/40 cursor-pointer"
                      >
                        {/* Time — always visible */}
                        <span className="w-12 shrink-0 text-xs font-semibold tabular-nums text-on-surface-variant">
                          {item.startTime}
                        </span>

                        {/* Colored vertical bar */}
                        <span
                          className="h-8 w-1 shrink-0 rounded-full"
                          style={{ backgroundColor: style.dot }}
                        />

                        {/* Content */}
                        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                          <p className="flex items-center gap-1.5 truncate text-[11px] font-extrabold text-on-surface-variant leading-none">
                            {item.code} · {typeLabel}
                            {item.requirementId && (
                              <Paperclip className="size-3 text-on-surface-variant shrink-0" />
                            )}
                          </p>
                          <span className="text-sm font-semibold text-on-surface leading-snug truncate">
                            {item.title}
                          </span>
                        </div>

                        {/* Right: room + time range — desktop only */}
                        <span className="hidden sm:flex shrink-0 items-center gap-1 text-xs text-on-surface-variant">
                          <MapPin className="size-3" />
                          {item.location || '—'}
                        </span>
                        <span className="hidden sm:flex shrink-0 items-center gap-1 text-xs text-on-surface-variant">
                          <Clock className="size-3" />
                          {timeRange}
                        </span>
                      </div>
                    )
                  } else {
                    // Deadline row
                    const subject = subjects.find(s => s.id === item.subjectId || s.id === item.subject_id)
                    const style = getSubjectStyle(subject)
                    const Icon = getDeadlineIcon(item.type)
                    const subjectCode = subject?.code || ''
                    const dueTime = item.time || '23:59'

                    return (
                      <div
                        key={`d-${item.id}-${idx}`}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container-low/40"
                      >
                        {/* Time */}
                        <span className="w-12 shrink-0 text-xs font-semibold tabular-nums text-on-surface-variant">
                          {dueTime}
                        </span>

                        {/* Icon circle */}
                        <span
                          className={`flex size-8 items-center justify-center rounded-lg shrink-0 ${style.bg} ${style.text}`}
                        >
                          <Icon className="size-4" />
                        </span>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <span className="text-sm font-semibold text-on-surface leading-snug block truncate">
                            {item.title}
                          </span>
                          <span className={`text-xs font-semibold ${style.text}`}>
                            {subjectCode ? `${subjectCode} · ` : ''}{t('academic:calendarGrid.deadlineSubmission')}
                          </span>
                        </div>

                        {/* Right time — hidden on very narrow screens to prevent overlap */}
                        <span className="hidden sm:inline shrink-0 text-xs font-semibold tabular-nums text-on-surface-variant">
                          {dueTime}
                        </span>
                      </div>
                    )
                  }
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default AgendaView
