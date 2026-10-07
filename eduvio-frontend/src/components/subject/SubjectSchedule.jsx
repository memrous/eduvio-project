import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarClock, MapPin, User, ArrowRight } from 'lucide-react'
import { useEvents } from '../../hooks/useEvents'
import { formatRoom } from '../../utils/room'
import { getLocaleFromLanguage } from '../../utils/locale'

const DAY_MS = 24 * 60 * 60 * 1000

// ─── Helpers ─────────────────────────────────────────────────

/** "08:05" / "8:05" -> { h: 8, m: 5 }, or null */
const parseTime = (time) => {
  const match = typeof time === 'string' ? time.match(/^(\d{1,2}):(\d{2})/) : null
  return match ? { h: Number(match[1]), m: Number(match[2]) } : null
}

/** "08:05" -> "8:05" */
const formatTime = (time) => {
  const parsed = parseTime(time)
  return parsed ? `${parsed.h}:${String(parsed.m).padStart(2, '0')}` : time || ''
}

const formatTimeRange = (start, end) =>
  end && end !== start ? `${formatTime(start)}–${formatTime(end)}` : formatTime(start)

/** Local date at midnight from "YYYY-MM-DD" */
const toLocalDate = (dateStr) => {
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

const toDateTime = (dateStr, time) => {
  const date = toLocalDate(dateStr)
  const parsed = parseTime(time)
  if (parsed) date.setHours(parsed.h, parsed.m)
  return date
}

/** ISO 8601 week number (STAG counts odd/even weeks the same way) */
const isoWeek = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d - yearStart) / DAY_MS + 1) / 7)
}

/**
 * How often a group of dates repeats: 'weekly', 'even', 'odd' or 'count'.
 * Only reports a week parity when every gap is a multiple of two weeks.
 */
const getFrequency = (dates) => {
  if (dates.length < 2) return 'count'
  const gaps = dates.slice(1).map((d, i) => Math.round((d - dates[i]) / DAY_MS))
  if (gaps.every((g) => g === 7)) return 'weekly'
  if (gaps.every((g) => g > 0 && g % 14 === 0)) {
    return isoWeek(dates[0]) % 2 === 0 ? 'even' : 'odd'
  }
  return 'count'
}

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

// ─── Component ───────────────────────────────────────────────

const SubjectSchedule = ({ subject }) => {
  const { t, i18n } = useTranslation(['academic', 'dashboard'])
  const navigate = useNavigate()
  const { data: events } = useEvents()
  const locale = getLocaleFromLanguage(i18n.language)

  const typeLabel = (type) =>
    t(`academic:subjectSchedule.types.${type}`, {
      defaultValue: t(`dashboard:timetable.eventTypes.${type}`, { defaultValue: type }),
    })
  const weekday = (date) => capitalize(date.toLocaleDateString(locale, { weekday: 'short' }))
  const roomLabel = (room) => formatRoom(room, { language: i18n.language })

  const subjectEvents = useMemo(
    () =>
      (events || [])
        .filter((e) => Number(e.subjectId ?? e.subject_id) === Number(subject.id) && e.date)
        .map((e) => {
          const startTime = e.startTime ?? e.time ?? null
          const endTime = e.endTime ?? e.end_time ?? null
          return {
            ...e,
            startTime,
            endTime,
            teacherName: e.teacherName ?? e.teacher_name ?? null,
            day: toLocalDate(e.date),
            start: toDateTime(e.date, startTime),
            end: endTime ? toDateTime(e.date, endTime) : null,
          }
        })
        .sort((a, b) => a.start - b.start),
    [events, subject.id]
  )

  // Nearest lesson that has not finished yet
  const nextEvent = useMemo(() => {
    const now = new Date()
    return subjectEvents.find((e) => (e.end ?? e.start) > now) ?? null
  }, [subjectEvents])

  // Regular slots grouped by (type, weekday, time range, room)
  const groups = useMemo(() => {
    const map = new Map()
    subjectEvents.forEach((e) => {
      const key = [e.type, e.day.getDay(), e.startTime, e.endTime, e.room ?? ''].join('|')
      if (!map.has(key)) {
        map.set(key, { key, type: e.type, sample: e, room: e.room, teachers: new Set(), dates: [] })
      }
      const group = map.get(key)
      if (!group.dates.some((d) => d.getTime() === e.day.getTime())) group.dates.push(e.day)
      if (e.teacherName) group.teachers.add(e.teacherName)
    })

    return [...map.values()]
      .map((g) => ({ ...g, frequency: getFrequency(g.dates) }))
      .sort((a, b) => {
        const dayA = (a.sample.day.getDay() + 6) % 7 // Monday first
        const dayB = (b.sample.day.getDay() + 6) % 7
        if (dayA !== dayB) return dayA - dayB
        return (a.sample.start.getHours() * 60 + a.sample.start.getMinutes())
          - (b.sample.start.getHours() * 60 + b.sample.start.getMinutes())
      })
  }, [subjectEvents])

  if (subjectEvents.length === 0) return null

  const isToday = nextEvent && nextEvent.day.toDateString() === new Date().toDateString()

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <CalendarClock className="size-4 text-on-surface-variant" />
        <h2 className="text-sm font-bold text-foreground">{t('academic:subjectSchedule.title')}</h2>
      </div>

      {/* NEXT LESSON */}
      {nextEvent && (
        <button
          type="button"
          onClick={() => navigate('/calendar', { state: { openEventId: nextEvent.id } })}
          className="group mt-4 flex w-full flex-col gap-1.5 rounded-xl bg-surface-container-low/60 px-4 py-3 text-left transition-colors hover:bg-surface-container-low cursor-pointer"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
            {t('academic:subjectSchedule.next')}
          </span>
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
            <span className="font-semibold text-foreground">
              {isToday
                ? t('academic:subjectSchedule.today')
                : `${weekday(nextEvent.day)} ${nextEvent.day.toLocaleDateString(locale, { day: 'numeric', month: 'numeric' })}`}
              {' · '}
              {formatTimeRange(nextEvent.startTime, nextEvent.endTime)}
            </span>
            <span className="text-on-surface-variant">{typeLabel(nextEvent.type)}</span>
          </span>
          {(nextEvent.room || nextEvent.teacherName) && (
            <span className="flex flex-col gap-1 text-xs text-on-surface-variant sm:flex-row sm:flex-wrap sm:gap-x-4">
              {nextEvent.room && (
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="break-words">{roomLabel(nextEvent.room)}</span>
                </span>
              )}
              {nextEvent.teacherName && (
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <User className="size-3.5 shrink-0" />
                  <span className="break-words">{nextEvent.teacherName}</span>
                </span>
              )}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            {t('academic:subjectSchedule.openInCalendar')}
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </button>
      )}

      {/* REGULAR SLOTS */}
      <div className="mt-5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
          {t('academic:subjectSchedule.regular')}
        </p>
        <ul className="mt-2 divide-y divide-outline-variant/40">
          {groups.map((g) => (
            <li
              key={g.key}
              className="flex flex-col gap-1 py-2.5 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4"
            >
              <span className="font-semibold text-foreground">
                {typeLabel(g.type)}
                {' · '}
                {weekday(g.sample.day)} {formatTimeRange(g.sample.startTime, g.sample.endTime)}
              </span>
              {g.room && (
                <span className="inline-flex items-center gap-1.5 text-on-surface-variant min-w-0">
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="break-words">{roomLabel(g.room)}</span>
                </span>
              )}
              {g.teachers.size > 0 && (
                <span className="inline-flex items-center gap-1.5 text-on-surface-variant min-w-0">
                  <User className="size-3.5 shrink-0" />
                  <span className="break-words">{[...g.teachers].join(', ')}</span>
                </span>
              )}
              {g.frequency !== 'weekly' && (
                <span className="text-xs text-on-surface-variant">
                  {g.frequency === 'count'
                    ? t('academic:subjectSchedule.occurrences', { count: g.dates.length })
                    : t(`academic:subjectSchedule.${g.frequency}Week`)}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default SubjectSchedule
