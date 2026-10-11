import { useTranslation } from 'react-i18next'
import { getLocaleFromLanguage } from '../../utils/locale'
import { GENERAL_LESSON, getLessonTypeKey, getSemesterWeek, parseLocalDate } from '../../utils/lessons'

/**
 * Lesson picker: "General material" or a lesson of the subject, grouped by
 * semester week ("3. týden" → "Cvičení · St 8. 10. 9:45").
 */
const LessonSelect = ({ id, value, onChange, lessons, semester, semesterStarts, suggestedId, disabled, className }) => {
  const { t, i18n } = useTranslation(['resources', 'dashboard'])
  const locale = getLocaleFromLanguage(i18n.language)

  const formatDate = (dateValue) => {
    const date = parseLocalDate(dateValue)
    if (!date) return ''
    const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date)
    const dayMonth = new Intl.DateTimeFormat(locale, locale === 'cs-CZ'
      ? { day: 'numeric', month: 'numeric' }
      : { day: 'numeric', month: 'short' }).format(date)
    return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${dayMonth}`
  }

  const typeLabel = (type) => {
    const key = getLessonTypeKey(type)
    return key ? t(`resources:lessons.types.${key}`) : t(`dashboard:timetable.eventTypes.${type}`, type)
  }

  // Group by semester week; lessons outside the semester go to "other dates"
  const groups = []
  for (const lesson of lessons) {
    const week = getSemesterWeek(lesson.date, semester, semesterStarts)
    const label = week ? t('resources:lessons.semesterWeek', { n: week }) : t('resources:lessons.otherDates')
    const last = groups[groups.length - 1]
    if (last?.label === label) last.lessons.push(lesson)
    else groups.push({ label, lessons: [lesson] })
  }

  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={className}>
      <option value={GENERAL_LESSON}>{t('resources:lessons.general')}</option>
      {groups.map((group, index) => (
        <optgroup key={`${group.label}-${index}`} label={group.label}>
          {group.lessons.map((lesson) => {
            const time = lesson.startTime ? ` ${String(lesson.startTime).replace(/^0(\d:)/, '$1')}` : ''
            const parts = [typeLabel(lesson.type), `${formatDate(lesson.date)}${time}`]
            const suggested = String(lesson.id) === String(suggestedId)
            return (
              <option key={lesson.id} value={String(lesson.id)}>
                {`${group.label} · ${parts.join(' · ')}${suggested ? ` (${t('resources:lessons.suggestedShort')})` : ''}`}
              </option>
            )
          })}
        </optgroup>
      ))}
    </select>
  )
}

export default LessonSelect
