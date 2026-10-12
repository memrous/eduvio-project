import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardCheck, ExternalLink, Eye, EyeOff, Globe, Paperclip } from 'lucide-react'
import Icon from '../../common/Icon'
import { getLocaleFromLanguage } from '../../../utils/locale'
import { daysFromToday, getAssessmentIcon, getAssessmentLabel, toLocalDate } from '../../../utils/assessments'

const linkClass = 'inline-flex max-w-full items-center gap-1 text-xs font-medium text-primary hover:underline'

/** "Z webu vyučujícího" chip linking to the course page the rows come from. */
export const SourceChip = ({ url }) => {
  const { t } = useTranslation('common')
  if (!url) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant transition-colors hover:text-primary"
    >
      <Icon icon={Globe} className="size-3.5" />
      {t('common:fromTeacherWeb')}
    </a>
  )
}

/** Links of a schedule row (files, materials). */
export const ItemLinks = ({ links }) => {
  if (!links?.length) return null
  return (
    <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
      {links.map((link) => (
        <li key={link.url} className="min-w-0">
          <a href={link.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
            <Icon icon={Paperclip} className="size-3.5" />
            <span className="truncate">{link.text}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

const AssessmentRow = ({ item, onHide, onUnhide }) => {
  const { t, i18n } = useTranslation(['academic', 'common'])
  const locale = getLocaleFromLanguage(i18n.language)
  const date = toLocalDate(item.date)
  const days = daysFromToday(item.date)
  const TypeIcon = getAssessmentIcon(item.assessment_type)

  return (
    <li className="group flex items-start gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3">
      <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-surface-container-low py-1.5 text-center">
        <span className="text-[11px] font-semibold uppercase text-on-surface-variant">
          {date.toLocaleDateString(locale, { weekday: 'short' })}
        </span>
        <span className="text-sm font-bold tabular-nums text-foreground">
          {date.toLocaleDateString(locale, { day: 'numeric', month: 'numeric' })}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-container px-2 py-0.5 text-[11px] font-semibold text-on-primary-container">
            <Icon icon={TypeIcon} className="size-3.5" />
            {getAssessmentLabel(item.assessment_type, t)}
          </span>
          {days >= 0 && (
            <span className="text-xs text-on-surface-variant">
              {new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(days, 'day')}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm font-medium text-foreground break-words">{item.title}</p>
        {item.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-on-surface-variant" title={item.description}>{item.description}</p>
        )}
        <ItemLinks links={item.links} />
      </div>
      {onUnhide ? (
        <button
          type="button"
          onClick={() => onUnhide(item)}
          aria-label={t('academic:subjectDetail.exam.assessments.unhide', { title: item.title })}
          title={t('academic:subjectDetail.exam.assessments.unhide', { title: item.title })}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent text-on-surface-variant transition-colors hover:bg-surface-container hover:text-foreground cursor-pointer"
        >
          <Icon icon={Eye} />
        </button>
      ) : onHide && (
        <button
          type="button"
          onClick={() => onHide(item)}
          aria-label={t('academic:subjectDetail.exam.assessments.hide', { title: item.title })}
          title={t('academic:subjectDetail.exam.assessments.hide', { title: item.title })}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent text-on-surface-variant opacity-100 transition-colors hover:bg-surface-container hover:text-foreground cursor-pointer md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
        >
          <Icon icon={EyeOff} />
        </button>
      )}
    </li>
  )
}

/**
 * Written tests, credit tests and retakes from the teacher's course page:
 * upcoming ones first, past ones folded and muted, hidden ones folded at the
 * end so they can be shown again.
 */
const ContinuousAssessmentCard = ({ items, hiddenItems = [], isLoading, sourceUrl, onHide, onUnhide }) => {
  const { t } = useTranslation('academic')
  const [showPast, setShowPast] = useState(false)
  const [showHidden, setShowHidden] = useState(false)

  const assessments = items.filter((item) => item.kind === 'assessment')
  const hiddenAssessments = hiddenItems.filter((item) => item.kind === 'assessment')
  const upcoming = assessments.filter((item) => daysFromToday(item.date) >= 0)
  const past = assessments.filter((item) => daysFromToday(item.date) < 0)
  const pageUrl = sourceUrl ?? assessments[0]?.source_url ?? null

  return (
    <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Icon icon={ClipboardCheck} className="text-on-surface-variant" />
          {t('academic:subjectDetail.exam.assessments.title')}
        </h3>
        {assessments.length > 0 && <SourceChip url={pageUrl} />}
      </div>

      {isLoading ? (
        <div className="mt-4 h-16 animate-pulse rounded-xl bg-surface-container-low" aria-hidden="true" />
      ) : assessments.length === 0 ? (
        <div className="mt-3 flex flex-col items-start gap-1.5 text-sm text-on-surface-variant">
          <p>{t(pageUrl ? 'academic:subjectDetail.exam.assessments.empty' : 'academic:subjectDetail.exam.assessments.noSource')}</p>
          {pageUrl && (
            <a href={pageUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {t('academic:subjectDetail.syllabus.openSource')}
              <Icon icon={ExternalLink} className="size-3.5" />
            </a>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {upcoming.length > 0 && (
            <ul className="flex flex-col gap-2" aria-label={t('academic:subjectDetail.exam.assessments.upcoming')}>
              {upcoming.map((item) => <AssessmentRow key={item.id} item={item} onHide={onHide} />)}
            </ul>
          )}
          {past.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowPast((v) => !v)}
                aria-expanded={showPast}
                className="text-label-md font-semibold text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer"
              >
                {showPast
                  ? t('academic:subjectDetail.exam.assessments.hidePast')
                  : t('academic:subjectDetail.exam.assessments.past', { count: past.length })}
              </button>
              {showPast && (
                <ul className="mt-2 flex flex-col gap-2 opacity-60">
                  {past.map((item) => <AssessmentRow key={item.id} item={item} onHide={onHide} />)}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {!isLoading && hiddenAssessments.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowHidden((v) => !v)}
            aria-expanded={showHidden}
            className="text-label-md font-semibold text-on-surface-variant hover:text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer"
          >
            {showHidden
              ? t('academic:subjectDetail.exam.assessments.hideHidden')
              : t('academic:subjectDetail.exam.assessments.hidden', { count: hiddenAssessments.length })}
          </button>
          {showHidden && (
            <ul className="mt-2 flex flex-col gap-2 opacity-60">
              {hiddenAssessments.map((item) => <AssessmentRow key={item.id} item={item} onUnhide={onUnhide} />)}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

export default ContinuousAssessmentCard
