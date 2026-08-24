import { Flame, Zap, GraduationCap } from 'lucide-react'
import { getSubjectStyle } from './useCalendarState'

const getDeadlineIcon = (type) => {
  const t = String(type || '').toLowerCase()
  if (t.includes('test') || t.includes('quiz')) return Zap
  if (t.includes('exam') || t.includes('zkouška')) return GraduationCap
  return Flame
}

const DayCell = ({
  day,
  dayEvents,
  dayDeadlines = [],
  isSelected,
  isToday,
  setSelectedDate,
  handleEventSelect,
  onOpenMobileDetail,
  subjects = [],
}) => {
  const MAX_ITEMS_MOBILE = 1
  const MAX_ITEMS_DESKTOP = 3
  const allItems = [
    ...dayDeadlines.map(d => ({ ...d, _kind: 'deadline' })),
    ...dayEvents.map(e => ({ ...e, _kind: 'event' })),
  ]
  const visibleDesktop = allItems.slice(0, MAX_ITEMS_DESKTOP)
  const overflowDesktop = allItems.length - MAX_ITEMS_DESKTOP
  const visibleMobile = allItems.slice(0, MAX_ITEMS_MOBILE)
  const overflowMobile = allItems.length - MAX_ITEMS_MOBILE
  const hasDeadline = dayDeadlines.length > 0
  const firstEventSubject = subjects.find(s => s.id === (dayEvents[0]?.subjectId ?? dayEvents[0]?.subject_id))
  const firstEventStyle = getSubjectStyle(firstEventSubject)

  return (
    <div
      onClick={() => setSelectedDate(day.date)}
      className={`cursor-pointer flex flex-col transition-all group relative min-h-[56px] sm:min-h-[112px] p-1.5 border-b border-r border-outline-variant [&:nth-child(7n)]:border-r-0 ${
        !day.isCurrentMonth
          ? 'bg-surface-container-low/40 text-on-surface-variant/70'
          : isToday
            ? 'bg-primary/5'
            : isSelected
              ? 'bg-primary/5'
              : 'bg-surface-container-lowest'
      } ${
        isSelected
          ? 'ring-1 ring-primary ring-inset z-10'
          : 'hover:bg-surface-container-low/50'
      }`}
    >
      {/* Day number */}
      <div className="flex justify-between items-start mb-1">
        {isToday ? (
          <span className="w-6 h-6 bg-primary text-white font-bold rounded-full flex items-center justify-center text-xs shadow-sm">
            {day.dayNum}
          </span>
        ) : (
          <span className={`w-6 h-6 flex items-center justify-center text-xs font-semibold rounded-full ${
            day.isCurrentMonth
              ? 'text-on-surface'
              : 'text-on-surface-variant/50'
          } ${isSelected ? 'bg-primary/10 text-primary font-bold' : ''}`}>
            {day.dayNum}
          </span>
        )}
      </div>

      {/* Desktop: items list — show up to 3 */}
      <div className="hidden sm:flex flex-col gap-1 flex-grow overflow-hidden">
        {visibleDesktop.map((item, idx) => {
          if (item._kind === 'deadline') {
            const subject = subjects.find(s => s.id === item.subjectId || s.id === item.subject_id)
            const style = getSubjectStyle(subject)
            const Icon = getDeadlineIcon(item.type)
            return (
              <div
                key={`d-${item.id ?? idx}`}
                onClick={(e) => { e.stopPropagation() }}
                title={item.title}
                className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded truncate border border-rose-400/30 dark:border-rose-500/30 cursor-default ${style.bg} ${style.text}`}
              >
                <Icon className="w-2.5 h-2.5 shrink-0 text-rose-600 dark:text-rose-300" />
                <span className="truncate">{item.title}</span>
              </div>
            )
          } else {
            const subject = subjects.find(s => s.id === item.subjectId || s.id === item.subject_id)
            const style = getSubjectStyle(subject)
            return (
              <div
                key={`e-${item.id ?? idx}`}
                onClick={(e) => { e.stopPropagation(); handleEventSelect(item) }}
                title={`${item.code}: ${item.title}`}
                className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-outline-variant/20 hover:brightness-95 cursor-pointer truncate ${style.bg} ${style.text}`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: style.dot }}
                />
                <span className="font-bold">{item.code}</span>
                <span className="truncate">{item.title}</span>
              </div>
            )
          }
        })}
        {overflowDesktop > 0 && (
          <span className="text-[10px] text-on-surface-variant font-semibold pl-0.5">
            +{overflowDesktop}
          </span>
        )}
      </div>

      {/* Mobile: tappable count badge — opens bottom sheet with day's items */}
      {allItems.length > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onOpenMobileDetail?.(day, allItems)
          }}
          className={`sm:hidden mt-1 flex items-center justify-center gap-1 min-w-[22px] h-[22px] px-1.5 rounded-full text-[10px] font-bold border transition-colors ${
            hasDeadline
              ? 'bg-rose-500/10 border-rose-400/40 text-rose-600 dark:text-rose-300'
              : 'bg-primary/10 border-primary/20 text-primary'
          }`}
        >
          {hasDeadline ? (
            <Flame className="w-2.5 h-2.5 shrink-0" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: firstEventStyle.dot }} />
          )}
          {allItems.length}
        </button>
      )}
    </div>
  )
}

export default DayCell
