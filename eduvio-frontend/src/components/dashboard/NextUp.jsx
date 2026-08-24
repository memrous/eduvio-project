import { useState, useEffect } from 'react'
import { MapPin, Clock, FileText, CalendarPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const parseLocalDateTime = (dateInput, timeStr) => {
  if (!dateInput || !timeStr) return null
  const cleanDate = typeof dateInput === 'string' ? dateInput.split('T')[0] : ''
  if (!cleanDate) return null
  const [year, month, day] = cleanDate.split('-').map(Number)
  const timeParts = timeStr.split(':').map(Number)
  const hours = timeParts[0]
  const minutes = timeParts[1]
  if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) return null
  return new Date(year, month - 1, day, hours, minutes, 0)
}

const NextUp = ({ nextClass, onOpenMaterials, onAddToCalendar }) => {
  const { t } = useTranslation('dashboard')
  const [minutesLeft, setMinutesLeft] = useState(null)
  const [isOngoing, setIsOngoing] = useState(false)

  useEffect(() => {
    if (!nextClass) return

    const calculateTimeLeft = () => {
      try {
        const classDate = nextClass.date
        const startTimeStr = nextClass.startTime || nextClass.time || nextClass.start_time
        const endTimeStr = nextClass.endTime || nextClass.end_time

        const startDateTime = parseLocalDateTime(classDate, startTimeStr)
        let endDateTime = parseLocalDateTime(classDate, endTimeStr)

        if (startDateTime && !endDateTime) {
          endDateTime = new Date(startDateTime.getTime() + 90 * 60 * 1000)
        }

        if (!startDateTime || !endDateTime) {
          setIsOngoing(false)
          setMinutesLeft(null)
          return
        }

        const now = new Date()
        const ongoing = now >= startDateTime && now < endDateTime
        setIsOngoing(ongoing)

        if (ongoing) {
          setMinutesLeft(0)
        } else if (now < startDateTime) {
          const diffMs = startDateTime - now
          const diffMins = Math.ceil(diffMs / 60000)
          setMinutesLeft(diffMins)
        } else {
          setIsOngoing(false)
          setMinutesLeft(null)
        }
      } catch (err) {
        console.error('Failed to calculate next class time left', err)
      }
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 60000)
    return () => clearInterval(interval)
  }, [nextClass])

  const formatCountdown = () => {
    if (isOngoing) {
      return t('nextUp.ongoing')
    }

    if (minutesLeft === null) return ''

    if (minutesLeft <= 100) {
      return t('nextUp.startsIn', { count: minutesLeft, minutes: minutesLeft })
    }

    if (minutesLeft < 24 * 60) {
      const hours = Math.round(minutesLeft / 60)
      return t('nextUp.startsInHours', { count: hours, hours })
    }

    const days = Math.round(minutesLeft / (24 * 60))
    return t('nextUp.startsInDays', { count: days, days })
  }

  const typeBadge = nextClass?.type
    ? t(`timetable.eventTypes.${nextClass.type}`, nextClass.type).toUpperCase()
    : ''

  return (
    <section aria-labelledby="nextup-heading" className="w-full">
      <h2 id="nextup-heading" className="mb-3 text-lg font-semibold text-foreground">
        {t('nextUp.title')}
      </h2>

      {!nextClass ? (
        <div className="rounded-2xl bg-surface-container border border-outline-variant p-6 shadow-lg text-center text-on-surface-variant italic">
          {t('nextUp.noUpcoming')}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-midnight p-6 text-midnight-foreground shadow-lg sm:p-8">
          {/* Header Row: Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-balance ring-1 ring-inset ring-primary/40">
              {typeBadge}
            </span>
            {(minutesLeft !== null || isOngoing) && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                  isOngoing ? 'bg-live/15 text-live' : 'bg-success/15 text-success'
                }`}
              >
                <Clock className="size-4" aria-hidden="true" />
                {formatCountdown()}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="mt-4 text-2xl font-bold leading-tight text-balance sm:text-3xl">
            {nextClass.title}
          </h3>

          {/* Details Row: Room, Time, Teacher */}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-midnight-foreground/70">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden="true" />
              {nextClass.room || 'Učebna CP-312'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden="true" />
              {nextClass.startTime} – {nextClass.endTime}
            </span>
            {nextClass.teacher && (
              <span>
                {t('timetable.lecturer')}: {nextClass.teacher}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onOpenMaterials?.(nextClass)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <FileText className="size-4" aria-hidden="true" />
              {t('nextUp.openMaterials')}
            </button>
            <button
              type="button"
              onClick={() => onAddToCalendar?.(nextClass)}
              className="inline-flex items-center gap-2 rounded-xl border border-midnight-foreground/20 px-4 py-2.5 text-sm font-medium text-midnight-foreground/90 transition-colors hover:bg-midnight-foreground/10"
            >
              <CalendarPlus className="size-4" aria-hidden="true" />
              {t('nextUp.addToCalendar')}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export default NextUp