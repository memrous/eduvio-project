/**
 * Assessments from teachers' course pages (written tests, credit tests,
 * retakes…) and the dates of schedule rows.
 */
import { ClipboardCheck, FolderKanban, GraduationCap, PenLine, RotateCcw, Upload } from 'lucide-react'

const ICONS = {
  test: PenLine,
  credit_test: ClipboardCheck,
  retake: RotateCcw,
  exam: GraduationCap,
  deadline: Upload,
  project: FolderKanban,
}

/** Whether a requirement / deadline type is one of the assessment types. */
export const isAssessmentType = (type) => Object.hasOwn(ICONS, type ?? '')

/** Icon of an assessment type ("test", "credit_test", …). */
export const getAssessmentIcon = (type) => ICONS[type] ?? PenLine

/** Calendar deadline that comes from a teacher's course page (no time, no submission). */
export const isWebAssessment = (item) => item?.source === 'web'

/** Time of a calendar deadline; rows from teachers' pages have none. */
export const deadlineTimeLabel = (item) => (isWebAssessment(item) ? '' : item?.time || '23:59')

/** Tooltip of a calendar deadline: "Písemka: 1. písemná práce…" for rows from teachers' pages. */
export const deadlineTitle = (item, t) =>
  isWebAssessment(item) ? `${getAssessmentLabel(item.type, t)}: ${item.title}` : item.title

/** "Písemka" / "Zápočtový test" / … (common namespace). */
export const getAssessmentLabel = (type, t) =>
  t(`common:assessmentTypes.${type}`, { defaultValue: t('common:assessmentTypes.test') })

const DAY_MS = 24 * 60 * 60 * 1000

/** Local midnight of "YYYY-MM-DD". */
export const toLocalDate = (value) => {
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Whole days from today (negative in the past). */
export const daysFromToday = (value, now = new Date()) => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((toLocalDate(value) - today) / DAY_MS)
}

/** Monday of the week of a date. */
const weekStart = (date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}

export const isInCurrentWeek = (value, now = new Date()) =>
  weekStart(toLocalDate(value)).getTime() === weekStart(now).getTime()
