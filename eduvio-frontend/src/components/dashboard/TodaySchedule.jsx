import { useState, useEffect } from 'react'
import { Clock, Coffee, PartyPopper } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const TodaySchedule = ({ schedule }) => {
  const { t } = useTranslation('dashboard')

  const [nowMinutes, setNowMinutes] = useState(() => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  })

  useEffect(() => {
    const updateTime = () => {
      const d = new Date()
      setNowMinutes(d.getHours() * 60 + d.getMinutes())
    }
    updateTime()
    const interval = setInterval(updateTime, 30000)
    return () => clearInterval(interval)
  }, [])

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
  }

  const isEventActive = (event) => {
    if (!event?.startTime || !event?.endTime) return false
    const start = timeToMinutes(event.startTime)
    const end = timeToMinutes(event.endTime)
    return nowMinutes >= start && nowMinutes < end
  }

  const isGapActive = (prevEvent, nextEvent) => {
    if (!prevEvent?.endTime || !nextEvent?.startTime) return false
    const gapStart = timeToMinutes(prevEvent.endTime)
    const gapEnd = timeToMinutes(nextEvent.startTime)
    return nowMinutes >= gapStart && nowMinutes < gapEnd
  }

  const getDotColorClass = (event) => {
    if (isEventActive(event)) {
      return 'bg-live animate-[studyhub-live-pulse_1.8s_ease-in-out_infinite]'
    }

    switch (event.type) {
      case 'Lecture':
      case 'Lab':
        return 'bg-primary'
      case 'Test':
      case 'Quiz':
        return 'bg-warning ring-4 ring-warning/20'
      case 'Exam':
      case 'Deadline':
        return 'bg-error'
      case 'Assignment':
        return 'bg-success'
      default:
        return 'bg-outline'
    }
  }

  const formatGap = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60
    const duration =
      hours > 0 && mins > 0
        ? `${hours} h ${mins} min`
        : hours > 0
        ? `${hours} h`
        : `${mins} min`
    return t('todaySchedule.freeTime', { duration })
  }

  // Handle empty state
  if (!schedule || schedule.length === 0) {
    return (
      <section aria-labelledby="schedule-heading" className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-ambient">
        <h2 id="schedule-heading" className="mb-4 text-base font-semibold text-foreground">
          {t('todaySchedule.title')}
        </h2>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-4 py-8 text-center">
          <PartyPopper className="size-7 text-primary" aria-hidden="true" />
          <p className="text-sm font-semibold text-foreground">{t('todaySchedule.noClassesTitle')}</p>
          <p className="max-w-[15rem] text-xs text-on-surface-variant text-pretty">
            {t('todaySchedule.noClassesSubtitle')}
          </p>
        </div>
      </section>
    )
  }

  // Sort schedule chronologically
  const sortedSchedule = [...schedule].sort((a, b) => a.startTime.localeCompare(b.startTime))

  // Construct timeline items including gaps
  const timelineItems = []
  for (let i = 0; i < sortedSchedule.length; i++) {
    timelineItems.push({ type: 'event', data: sortedSchedule[i] })
    if (i < sortedSchedule.length - 1) {
      const currentEnd = timeToMinutes(sortedSchedule[i].endTime)
      const nextStart = timeToMinutes(sortedSchedule[i + 1].startTime)
      const gap = nextStart - currentEnd
      if (gap > 0) {
        timelineItems.push({ type: 'gap', minutes: gap })
      }
    }
  }

  return (
    <section aria-labelledby="schedule-heading" className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-ambient w-full">
      <h2 id="schedule-heading" className="mb-4 text-base font-semibold text-foreground">
        {t('todaySchedule.title')}
      </h2>

      <ol className="relative ml-1.5 border-l-2 border-outline-variant">
        {timelineItems.map((item, index) => {
          const isEvent = item.type === 'event'
          const isLast = index === timelineItems.length - 1

          return isEvent ? (
            <li
              key={`e-${item.data.id}`}
              className={`relative pl-6 ${isLast ? 'pb-0' : 'pb-6'}`}
            >
              <span
                className={`absolute -left-[9px] top-1 size-4 rounded-full border-2 border-surface-container-lowest ${getDotColorClass(item.data)}`}
                aria-hidden="true"
              />
              <p className="text-xs font-medium tabular-nums text-on-surface-variant">
                {item.data.startTime} – {item.data.endTime}
              </p>
              <div className="mt-0.5 flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground">
                  {t(`timetable.eventTypes.${item.data.type}`, item.data.type)}: {item.data.title}
                </p>
                {(item.data.type === 'Test' || item.data.type === 'Exam') && (
                  <span className="rounded-md bg-warning/15 px-1.5 py-0.5 text-[11px] font-semibold text-warning">
                    {t(`timetable.eventTypes.${item.data.type}`)}
                  </span>
                )}
              </div>
              {item.data.room && (
                <p className="text-xs text-on-surface-variant">
                  {t('timetable.room', { room: item.data.room })}
                </p>
              )}
            </li>
          ) : (
            (() => {
              const prevEvent = timelineItems[index - 1]?.data
              const nextEvent = timelineItems[index + 1]?.data
              const isGapLive = isGapActive(prevEvent, nextEvent)

              return (
                <li key={`g-${index}`} className="relative py-2 pl-6">
                  <span
                    className={`absolute -left-[7px] top-1/2 size-3 -translate-y-1/2 rounded-full border-2 bg-surface-container-lowest ${
                      isGapLive
                        ? 'border-live animate-[studyhub-live-pulse-subtle_1.8s_ease-in-out_infinite]'
                        : 'border-dashed border-outline-variant'
                    }`}
                    aria-hidden="true"
                  />
                  <div
                    className={`flex items-center gap-2 rounded-lg border bg-surface-container-low px-3 py-2 text-on-surface-variant ${
                      isGapLive ? 'border-live/40' : 'border-dashed border-outline-variant'
                    }`}
                  >
                    <Coffee className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="text-xs font-medium">{formatGap(item.minutes)}</span>
                  </div>
                </li>
              )
            })()
          )
        })}
      </ol>
    </section>
  )
}

export default TodaySchedule