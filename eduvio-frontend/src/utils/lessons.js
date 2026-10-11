/**
 * Lessons (schedule events) a material can belong to, and semester weeks.
 *
 * Week 1 of a semester is the calendar week of its first scheduled lesson
 * (STAG schedule of all the user's subjects in that semester), so the number
 * matches what teachers say ("7. týden"), unlike the ISO calendar week.
 */

import { getSubjectIdOf, isSameId } from './ids'

// Select value of "general material (no week)"
export const GENERAL_LESSON = ''

// Events that are deadlines rather than lessons
const NON_LESSON_TYPES = new Set(['Deadline', 'Assignment'])

const LESSON_TYPE_KEYS = {
  Lecture: 'lecture',
  'Přednáška': 'lecture',
  Lab: 'practice',
  'Cvičení': 'practice',
  Seminar: 'seminar',
  'Seminář': 'seminar',
}

const DAY_MS = 24 * 60 * 60 * 1000

/** "2026-10-07" (or ISO datetime) → local Date at midnight, without a UTC shift. */
export const parseLocalDate = (value) => {
  const match = String(value ?? '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

const mondayOf = (date) => {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return monday
}

export const isLesson = (event) =>
  Boolean(event?.date) && !event.requirementId && !event.requirement_id && !NON_LESSON_TYPES.has(event.type)

/** 'lecture' | 'practice' | 'seminar' | null — for labels and icons. */
export const getLessonTypeKey = (type) => LESSON_TYPE_KEYS[type] ?? null

const getEventSubjectId = getSubjectIdOf

/**
 * First Monday of each semester, keyed by the subject's semester ("ZS 2026").
 * STAG lessons are preferred; manually added lessons are the fallback.
 * @returns {Map<string, Date>}
 */
export const buildSemesterStarts = (events, subjects) => {
  const semesterBySubject = new Map((subjects ?? []).map((s) => [String(s.id), s.semester]))
  const firstStag = new Map()
  const firstAny = new Map()

  for (const event of events ?? []) {
    if (!isLesson(event)) continue
    const semester = semesterBySubject.get(String(getEventSubjectId(event)))
    const date = parseLocalDate(event.date)
    if (!semester || !date) continue

    if (!firstAny.has(semester) || date < firstAny.get(semester)) firstAny.set(semester, date)
    if (event.source === 'stag' && (!firstStag.has(semester) || date < firstStag.get(semester))) {
      firstStag.set(semester, date)
    }
  }

  const starts = new Map()
  for (const [semester, date] of firstAny) {
    starts.set(semester, mondayOf(firstStag.get(semester) ?? date))
  }
  return starts
}

const MAX_SEMESTER_WEEKS = 20

/**
 * Local calendar day of a date ("2026-10-07") or a timestamp
 * ("2026-10-07T22:30:00Z" is already 8. 10. in Prague).
 */
const toLocalDay = (value) => {
  if (!value) return null
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return parseLocalDate(value)
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

const weekNumber = (date, start) => Math.floor(Math.round((mondayOf(date) - start) / DAY_MS) / 7) + 1

/** The semester running on a date: the latest start not after it. */
const findSemesterOn = (date, semesterStarts) => {
  let found = null
  for (const [semester, start] of semesterStarts ?? []) {
    const week = weekNumber(date, start)
    if (week >= 1 && week <= MAX_SEMESTER_WEEKS && (!found || start > semesterStarts.get(found))) found = semester
  }
  return found
}

/**
 * Semester week of a date: { key: "ZS 2026:3", semester, week, from, to } or null
 * outside any semester. Without a known semester (e.g. a material of no subject)
 * the semester running on that date is used.
 */
export const getSemesterWeekInfo = (dateValue, semester, semesterStarts) => {
  const date = toLocalDay(dateValue)
  if (!date || !semesterStarts?.size) return null

  const semesterKey = semester && semesterStarts.has(semester) ? semester : findSemesterOn(date, semesterStarts)
  const start = semesterStarts.get(semesterKey)
  if (!start) return null

  const week = weekNumber(date, start)
  if (week < 1 || week > MAX_SEMESTER_WEEKS) return null

  const from = new Date(start)
  from.setDate(from.getDate() + (week - 1) * 7)
  const to = new Date(from)
  to.setDate(to.getDate() + 6)
  return { key: `${semesterKey}:${week}`, semester: semesterKey, week, from, to }
}

/** Semester week (1, 2, …) of a date, or null outside the semester. */
export const getSemesterWeek = (dateValue, semester, semesterStarts) =>
  getSemesterWeekInfo(dateValue, semester, semesterStarts)?.week ?? null

/**
 * Semester week a material belongs to: the week of its lesson, otherwise the
 * week it was added in (uploadedAt / created_at).
 */
export const getMaterialWeek = (resource, { events, subjects, semesterStarts }) => {
  const semesterOf = (item) => (subjects ?? []).find((s) => isSameId(s.id, getSubjectIdOf(item)))?.semester

  const eventId = resource?.eventId ?? resource?.event_id
  const lesson = eventId != null ? (events ?? []).find((e) => isSameId(e.id, eventId)) : null
  if (lesson) return getSemesterWeekInfo(lesson.date, semesterOf(lesson), semesterStarts)

  return getSemesterWeekInfo(resource?.uploadedAt ?? resource?.created_at, semesterOf(resource), semesterStarts)
}

/** Lessons of a subject, oldest first. */
export const getSubjectLessons = (events, subjectId) =>
  (events ?? [])
    .filter((e) => isLesson(e) && isSameId(getEventSubjectId(e), subjectId))
    .sort((a, b) => `${a.date} ${a.startTime ?? ''}`.localeCompare(`${b.date} ${b.startTime ?? ''}`))

const lessonStart = (event) => {
  const date = parseLocalDate(event.date)
  if (!date) return null
  const [h, m] = String(event.startTime ?? '00:00').split(':').map(Number)
  date.setHours(h || 0, m || 0)
  return date
}

/** The most recent lesson that has already started (suggested target for a new upload). */
export const getLastStartedLesson = (lessons, now = new Date()) => {
  let last = null
  for (const lesson of lessons) {
    const start = lessonStart(lesson)
    if (start && start <= now) last = lesson
  }
  return last
}
