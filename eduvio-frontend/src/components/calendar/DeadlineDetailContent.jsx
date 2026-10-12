import { X, CalendarDays, Clock, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getSubjectStyle } from './useCalendarState'
import { getLocaleFromLanguage } from '../../utils/locale'
import { deadlineTimeLabel, getAssessmentIcon, getAssessmentLabel, isAssessmentType, isWebAssessment, toLocalDate } from '../../utils/assessments'
import Icon from '../common/Icon'
import { SourceChip } from '../subject/exam/ContinuousAssessmentCard'

/** Detail of a deadline or a written test from a teacher's page (calendar side panel / sheet). */
const DeadlineDetailContent = ({ deadline, currentSubjects, onClose, onOpenSubject }) => {
  const { t, i18n } = useTranslation(['academic', 'common'])
  const locale = getLocaleFromLanguage(i18n.language)

  const subjectId = deadline.subjectId ?? deadline.subject_id
  const subject = currentSubjects.find(s => String(s.id) === String(subjectId))
  const style = getSubjectStyle(subject)
  const TypeIcon = getAssessmentIcon(isAssessmentType(deadline.type) ? deadline.type : 'deadline')
  const typeLabel = isWebAssessment(deadline) || isAssessmentType(deadline.type)
    ? getAssessmentLabel(deadline.type, t)
    : t('academic:calendarGrid.deadlineSubmission')
  const time = deadlineTimeLabel(deadline)

  return (
    <div className="flex flex-col gap-4 font-inter">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          {t('academic:eventDetail.deadlineTitle')}
        </h2>
        <button
          onClick={onClose}
          className="p-1 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer rounded-full hover:bg-surface-container-low"
          aria-label={t('academic:eventDetail.closeButton')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.bg} ${style.text}`}>
            <Icon icon={TypeIcon} className="size-3.5" />
            {typeLabel}
          </span>
          {isWebAssessment(deadline) && <SourceChip url={deadline.sourceUrl} />}
        </div>
        <h3 className="text-lg font-bold text-on-surface leading-tight mt-2 break-words">{deadline.title}</h3>
        <p className="text-sm font-semibold text-primary mt-1">
          {subject ? `${subject.code} · ${subject.name}` : t('academic:eventDetail.unknownSubject')}
        </p>
      </div>

      <dl className="flex flex-col gap-3.5 text-sm border-t border-outline-variant/30 pt-4">
        <div className="flex items-start gap-3">
          <Icon icon={CalendarDays} className="mt-0.5 text-on-surface-variant" />
          <div className="min-w-0">
            <dt className="text-xs text-on-surface-variant font-medium">{t('academic:eventModal.fields.date', 'Datum')}</dt>
            <dd className="font-semibold text-on-surface first-letter:uppercase">
              {toLocalDate(deadline.date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </dd>
          </div>
        </div>
        {time && (
          <div className="flex items-start gap-3">
            <Icon icon={Clock} className="mt-0.5 text-on-surface-variant" />
            <div className="min-w-0">
              <dt className="text-xs text-on-surface-variant font-medium">{t('academic:eventModal.fields.startTime', 'Čas')}</dt>
              <dd className="font-semibold text-on-surface tabular-nums">{time}</dd>
            </div>
          </div>
        )}
      </dl>

      {deadline.description && (
        <p className="text-xs text-on-surface-variant leading-relaxed bg-surface-container-low/40 p-3 rounded-lg border border-outline-variant/50 whitespace-pre-line">
          {deadline.description}
        </p>
      )}

      <div className="flex flex-col gap-2 pt-4 border-t border-outline-variant/30">
        {subject && onOpenSubject && (
          <button
            onClick={() => {
              onOpenSubject(subject.id)
              onClose()
            }}
            className="w-full bg-primary hover:bg-primary/95 text-primary-foreground py-2 rounded-lg font-semibold text-sm transition-colors shadow-sm cursor-pointer text-center"
          >
            {t('academic:eventDetail.openSubjectHub')}
          </button>
        )}
        {deadline.sourceUrl && (
          <a
            href={deadline.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 border border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low text-on-surface-variant font-semibold py-2 rounded-lg text-sm transition-colors"
          >
            {t('academic:subjectDetail.syllabus.openSource')}
            <Icon icon={ExternalLink} className="size-3.5" />
          </a>
        )}
      </div>
    </div>
  )
}

export default DeadlineDetailContent
