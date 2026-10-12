import { useState, useEffect } from 'react'
import { MapPin, Clock, FileText, CalendarPlus, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatRoom } from '../../utils/room'
import { getLocaleFromLanguage } from '../../utils/locale'

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

// Whole calendar days between two dates in local time (0 = same day)
const getCalendarDayDiff = (from, to) => {
  const fromDay = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const toDay = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  return Math.round((toDay - fromDay) / (24 * 60 * 60 * 1000))
}

// "Přednáška" → "Př.", "Cvičení" → "Cv." for the compact mobile badge
const shortType = (label) => (label.length > 4 ? `${label.slice(0, 2)}.` : label)

// STAG titles look like "Subject name (Přednáška)"; the type is already in the badge
const titleWithoutType = (title, type) => {
  const suffix = type ? ` (${type})` : ''
  return suffix && title?.endsWith(suffix) ? title.slice(0, -suffix.length) : title
}

const NextUp = ({ nextClass, onOpenMaterials, onAddToCalendar, onOpenSubject }) => {
  const { t, i18n } = useTranslation('dashboard')
  const [minutesLeft, setMinutesLeft] = useState(null)
  const [isOngoing, setIsOngoing] = useState(false)
  const [startDateTime, setStartDateTime] = useState(null)
  const [startDayOffset, setStartDayOffset] = useState(null)

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
        setStartDateTime(startDateTime)
        setStartDayOffset(getCalendarDayDiff(now, startDateTime))
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

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') calculateTimeLeft()
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 60000)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [nextClass])

  const locale = getLocaleFromLanguage(i18n?.language)

  const formatStartTime = (date) => (
    new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date)
  )

  // cs "Po, 12. 10.", en "Mon, Oct 12"
  const formatStartDate = (date) => {
    if (locale === 'cs-CZ') {
      const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date)
      const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'numeric' }).format(date)
      return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${dayMonth}`
    }
    return new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' }).format(date)
  }

  const formatCountdown = () => {
    if (isOngoing) {
      return t('nextUp.ongoing')
    }

    if (minutesLeft === null) return ''

    if (startDateTime && startDayOffset === 1) {
      return t('nextUp.tomorrowAt', { time: formatStartTime(startDateTime) })
    }

    if (startDateTime && startDayOffset > 1) {
      return t('nextUp.onDateAt', {
        date: formatStartDate(startDateTime),
        time: formatStartTime(startDateTime),
      })
    }

    // < 1 h: minutes; 1–2 h: "an hour 30 min"; ≥ 2 h: whole hours
    if (minutesLeft < 60) {
      return t('nextUp.startsIn', { count: minutesLeft, minutes: minutesLeft })
    }

    if (minutesLeft < 120) {
      const rest = minutesLeft - 60
      return rest === 0
        ? t('nextUp.startsInHours', { count: 1, hours: 1 })
        : t('nextUp.startsInHourMinutes', { minutes: rest })
    }

    const hours = Math.round(minutesLeft / 60)
    return t('nextUp.startsInHours', { count: hours, hours })
  }

  const typeLabel = nextClass?.type ? t(`timetable.eventTypes.${nextClass.type}`, nextClass.type) : ''
  const typeBadge = typeLabel.toUpperCase()
  const subjectId = nextClass?.subject_id ?? nextClass?.subjectId

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
        <div className="relative overflow-hidden rounded-2xl bg-midnight p-5 text-midnight-foreground shadow-lg sm:p-8">
          {/* Mobile: the whole card opens the subject */}
          {subjectId && onOpenSubject && (
            <button
              type="button"
              onClick={() => onOpenSubject(subjectId)}
              aria-label={t('nextUp.openSubject', { title: titleWithoutType(nextClass.title, nextClass.type) })}
              className="absolute inset-0 z-10 cursor-pointer lg:hidden"
            />
          )}

          {/* Header Row: Badges */}
          <div className="flex flex-wrap items-center gap-3">
            <span
              title={typeLabel}
              className="rounded-full bg-midnight-foreground/8 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-balance ring-1 ring-inset ring-midnight-foreground/15"
            >
              <span className="lg:hidden">{shortType(typeLabel)}</span>
              <span className="hidden lg:inline">{typeBadge}</span>
            </span>
            {(minutesLeft !== null || isOngoing) && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full bg-midnight-foreground/8 px-3 py-1 text-sm font-medium text-midnight-foreground ring-1 ring-inset ring-midnight-foreground/15`}
              >
                <Clock className="size-4" aria-hidden="true" />
                {formatCountdown()}
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="mt-3 flex items-center gap-2 text-xl font-bold leading-tight text-balance sm:mt-4 sm:text-3xl">
            <span className="min-w-0 lg:hidden">{titleWithoutType(nextClass.title, nextClass.type)}</span>
            <span className="hidden lg:inline">{nextClass.title}</span>
            {subjectId && onOpenSubject && <ChevronRight className="ml-auto size-5 shrink-0 opacity-70 lg:hidden" aria-hidden="true" />}
          </h3>

          {/* Details Row: Room, Time, Teacher */}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-midnight-muted">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden="true" />
              {formatRoom(nextClass.room || 'CP-312', { language: i18n?.language })}
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
          <div className="mt-6 hidden flex-wrap gap-3 lg:flex">
            <button
              type="button"
              onClick={() => onOpenMaterials?.(nextClass)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
            >
              <FileText className="size-4" aria-hidden="true" />
              {t('nextUp.openMaterials')}
            </button>
            <button
              type="button"
              onClick={() => onAddToCalendar?.(nextClass)}
              className="inline-flex items-center gap-2 rounded-xl border border-midnight-foreground/20 px-4 py-2.5 text-sm font-medium text-midnight-foreground/90 transition-colors hover:bg-midnight-foreground/10 cursor-pointer"
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