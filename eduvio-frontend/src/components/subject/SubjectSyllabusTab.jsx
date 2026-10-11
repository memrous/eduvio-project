import { useTranslation } from 'react-i18next'
import { CalendarRange, ExternalLink } from 'lucide-react'
import Icon from '../common/Icon'
import { ItemLinks, SourceChip } from './exam/ContinuousAssessmentCard'
import { getLocaleFromLanguage } from '../../utils/locale'
import {
  daysFromToday,
  getAssessmentIcon,
  getAssessmentLabel,
  isInCurrentWeek,
  toLocalDate,
} from '../../utils/assessments'

const dotClass = (item) => {
  if (item.kind === 'assessment') return 'bg-primary ring-4 ring-primary/15'
  if (item.kind === 'holiday') return 'bg-outline-variant'
  return 'bg-surface-container-lowest border-2 border-outline'
}

/**
 * The whole semester schedule from the teacher's page as a timeline:
 * this week highlighted, past rows and holidays muted.
 */
const SubjectSyllabusTab = ({ items, isLoading, error, sourceUrl }) => {
  const { t, i18n } = useTranslation(['academic', 'common'])
  const locale = getLocaleFromLanguage(i18n.language)
  const pageUrl = sourceUrl ?? items[0]?.source_url ?? null
  // The "this week" label goes on the first row of the current week
  const firstThisWeekId = items.find((item) => isInCurrentWeek(item.date))?.id

  return (
    <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Icon icon={CalendarRange} className="text-on-surface-variant" />
          {t('academic:subjectDetail.syllabus.title')}
        </h3>
        {items.length > 0 && <SourceChip url={pageUrl} />}
      </div>

      {isLoading ? (
        <div className="mt-4 h-40 animate-pulse rounded-xl bg-surface-container-low" aria-hidden="true" />
      ) : error ? (
        <p className="mt-3 text-sm text-error">{t('academic:subjectDetail.syllabus.loadError')}</p>
      ) : items.length === 0 ? (
        <div className="mt-3 flex flex-col items-start gap-1.5 text-sm text-on-surface-variant">
          <p>{t('academic:subjectDetail.syllabus.empty')}</p>
          <p className="text-xs">{t('academic:subjectDetail.syllabus.emptyHint')}</p>
          {pageUrl && (
            <a href={pageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              {t('academic:subjectDetail.syllabus.openSource')}
              <Icon icon={ExternalLink} className="size-3.5" />
            </a>
          )}
        </div>
      ) : (
        <ol className="relative mt-5 flex flex-col">
          {/* Vertical line behind the dots */}
          <span className="absolute bottom-3 left-[5.25rem] top-3 w-px bg-outline-variant" aria-hidden="true" />
          {items.map((item) => {
            const date = toLocalDate(item.date)
            const isPast = daysFromToday(item.date) < 0
            const isThisWeek = isInCurrentWeek(item.date)
            const showWeekLabel = item.id === firstThisWeekId
            const TypeIcon = item.kind === 'assessment' ? getAssessmentIcon(item.assessment_type) : null

            return (
              <li
                key={item.id}
                aria-current={showWeekLabel ? 'date' : undefined}
                className={`relative flex gap-4 rounded-xl py-2.5 pr-2 ${isThisWeek ? 'bg-primary/5' : ''} ${
                  isPast || item.kind === 'holiday' ? 'opacity-60' : ''
                }`}
              >
                <div className="w-16 shrink-0 pl-2 text-right">
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    {date.toLocaleDateString(locale, { day: 'numeric', month: 'numeric' })}
                  </p>
                  <p className="text-[11px] uppercase text-on-surface-variant">
                    {date.toLocaleDateString(locale, { weekday: 'short' })}
                  </p>
                </div>
                <span className={`relative z-10 mt-1.5 size-2.5 shrink-0 rounded-full ${dotClass(item)}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  {(showWeekLabel || item.kind !== 'session') && (
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      {showWeekLabel && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-on-primary">
                          {t('academic:subjectDetail.syllabus.thisWeek')}
                        </span>
                      )}
                      {TypeIcon && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary-container px-2 py-0.5 text-[11px] font-semibold text-on-primary-container">
                          <Icon icon={TypeIcon} className="size-3.5" />
                          {getAssessmentLabel(item.assessment_type, t)}
                        </span>
                      )}
                      {item.kind === 'holiday' && (
                        <span className="rounded-full bg-surface-container-low px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                          {t('academic:subjectDetail.syllabus.holiday')}
                        </span>
                      )}
                    </div>
                  )}
                  <p className={`text-sm break-words ${item.kind === 'assessment' ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                    {item.title}
                  </p>
                  {item.description && (
                    <p className="mt-0.5 line-clamp-3 text-xs text-on-surface-variant" title={item.description}>{item.description}</p>
                  )}
                  <ItemLinks links={item.links} />
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

export default SubjectSyllabusTab
