import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Flame, Zap, GraduationCap, BookOpen } from 'lucide-react'
import { getSubjectStyle } from './useCalendarState'

const getDeadlineIcon = (type) => {
  const t = String(type).toLowerCase()
  if (t.includes('test') || t.includes('quiz')) {
    return Zap
  }
  if (t.includes('exam') || t.includes('zkouška')) {
    return GraduationCap
  }
  return Flame
}

const QuickOverviewPanel = ({
  selectedDate,
  todayEvents = [],
  upcomingDeadlines = [],
  onEventClick,
  onDeadlineClick,
  locale = 'cs-CZ',
  subjects = [],
}) => {
  const { t } = useTranslation(['academic', 'dashboard'])

  const dayName = useMemo(() => {
    try {
      const d = selectedDate ? new Date(selectedDate) : new Date()
      return d.toLocaleDateString(locale, { weekday: 'long' }).toUpperCase()
    } catch {
      return ''
    }
  }, [selectedDate, locale])

  const getDayNameFromDate = (dateStr) => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString(locale, { weekday: 'long' })
    } catch {
      return ''
    }
  }

  return (
    <div className="flex flex-col gap-6 font-inter text-on-surface">
      {/* Top Header */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-on-surface-variant/80">
          {dayName || t('academic:calendarView.quickOverview.todayTitle')}
        </span>
        <h2 className="text-lg font-bold text-on-surface">{t('academic:calendarView.quickOverview.title')}</h2>
        <p className="text-xs text-on-surface-variant">
          {t('academic:calendarView.quickOverview.selectEventNotice')}
        </p>
      </div>

      {/* Dnešní výuka Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-on-surface-variant font-bold text-sm">
          <Calendar className="w-4 h-4 text-primary" />
          <span>{t('academic:calendarView.quickOverview.todayClasses')}</span>
        </div>

        <div className="flex flex-col gap-2">
          {todayEvents.length === 0 ? (
            <p className="text-xs text-on-surface-variant italic text-center py-4 bg-surface-container-lowest border border-outline-variant rounded-lg">
              {t('academic:calendarView.quickOverview.noClassesToday')}
            </p>
          ) : (
            todayEvents.map((event) => {
              const subject = subjects.find(s => s.id === event.subjectId || s.id === event.subject_id)
              const styleObj = getSubjectStyle(subject)
              const eventTypeLabel = event.type === 'Lecture'
                ? t('dashboard:timetable.eventTypes.Lecture')
                : event.type === 'Lab'
                  ? t('dashboard:timetable.eventTypes.Lab')
                  : event.type

              return (
                <div
                  key={event.id}
                  onClick={() => onEventClick?.(event)}
                  className="flex w-full items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-2.5 text-left transition-all hover:border-primary/40 hover:bg-surface-container-low cursor-pointer hover:shadow-sm"
                >
                  <span className="w-12 shrink-0 text-xs font-semibold tabular-nums text-on-surface-variant">
                    {event.startTime || event.time}
                  </span>
                  <span
                    className="h-8 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: styleObj.dot }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-on-surface">
                      {subject?.code || event.code} · {eventTypeLabel}
                    </p>
                    <p className="truncate text-xs text-on-surface-variant">
                      {event.title}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Nadcházející deadliny Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-on-surface-variant font-bold text-sm">
          <Flame className="w-4 h-4 text-warning" />
          <span>{t('academic:calendarView.quickOverview.upcomingDeadlines')}</span>
        </div>

        <div className="flex flex-col gap-2">
          {upcomingDeadlines.length === 0 ? (
            <p className="text-xs text-on-surface-variant italic text-center py-4 bg-surface-container-lowest border border-outline-variant rounded-lg">
              {t('academic:calendarView.quickOverview.noDeadlines')}
            </p>
          ) : (
            upcomingDeadlines.map((req) => {
              const subject = subjects.find(s => s.id === req.subjectId || s.id === req.subject_id)
              const styleObj = getSubjectStyle(subject)
              const Icon = getDeadlineIcon(req.type)
              const dayLabel = getDayNameFromDate(req.date)

              return (
                <div
                  key={req.id}
                  onClick={() => onDeadlineClick?.(req)}
                  className="flex w-full items-center gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-2.5 text-left transition-all hover:border-primary/40 hover:bg-surface-container-low cursor-pointer hover:shadow-sm"
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${styleObj.bg} ${styleObj.text}`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-on-surface">{req.title}</p>
                    <p className="truncate text-xs text-on-surface-variant mt-0.5 capitalize leading-none">
                      {subject?.code || ''} · {dayLabel}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-on-surface-variant">
                    {req.time || '23:59'}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Tip Box */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 flex gap-3 items-start">
        <BookOpen className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-semibold text-on-surface">{t('academic:calendarView.quickOverview.tipHeading')}</h4>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            {t('academic:calendarView.quickOverview.tipText')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default QuickOverviewPanel
