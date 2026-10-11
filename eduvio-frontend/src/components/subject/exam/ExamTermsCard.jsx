import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Clock, ExternalLink, MapPin, UserRound } from 'lucide-react'
import Icon from '../../common/Icon'
import { useExamTerms } from '../../../hooks/useExam'
import { getLocaleFromLanguage } from '../../../utils/locale'
import { formatRoom } from '../../../utils/room'
import { getSafeHttpsUrl } from '../../../utils/subjectDetails'

const DAY_MS = 24 * 60 * 60 * 1000

/** Local midnight of "YYYY-MM-DD" */
const toLocalDate = (value) => {
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

const daysFromToday = (value) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((toLocalDate(value) - today) / DAY_MS)
}

const timeRange = (term) =>
  term.end_time && term.end_time !== term.start_time ? `${term.start_time}–${term.end_time}` : term.start_time

const TermRow = ({ term, highlight }) => {
  const { t, i18n } = useTranslation('academic')
  const locale = getLocaleFromLanguage(i18n.language)
  const days = daysFromToday(term.date)
  const isFull = term.capacity != null && term.occupied != null && term.occupied >= term.capacity
  const dateLabel = toLocalDate(term.date).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' })
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(days, 'day')

  return (
    <li
      className={`flex flex-col gap-2 rounded-xl border px-4 py-3 ${
        highlight ? 'border-primary/30 bg-primary/5' : 'border-outline-variant bg-surface-container-lowest'
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Icon icon={CalendarDays} className="text-on-surface-variant" />
          {dateLabel}
        </span>
        {term.start_time && (
          <span className="inline-flex items-center gap-1.5 text-sm text-foreground">
            <Icon icon={Clock} className="text-on-surface-variant" />
            {timeRange(term)}
          </span>
        )}
        {days >= 0 && <span className="text-xs font-medium text-on-surface-variant">{relative}</span>}
        <span className="ml-auto flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-surface-container-low px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
            {t(`academic:subjectDetail.exam.terms.kinds.${term.kind}`, t('academic:subjectDetail.exam.terms.kinds.other'))}
          </span>
          {term.is_registered ? (
            <span className="rounded-full bg-success-container px-2 py-0.5 text-[11px] font-semibold text-on-success-container">
              {t('academic:subjectDetail.exam.terms.registered')}
            </span>
          ) : isFull ? (
            <span className="rounded-full bg-error-container px-2 py-0.5 text-[11px] font-semibold text-on-error-container">
              {t('academic:subjectDetail.exam.terms.full')}
            </span>
          ) : null}
        </span>
      </div>

      {(term.room || term.examiner || term.capacity != null || term.deregistration_deadline) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
          {term.room && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Icon icon={MapPin} />
              <span className="break-words">{formatRoom(term.room, { language: i18n.language })}</span>
            </span>
          )}
          {term.examiner && (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Icon icon={UserRound} />
              <span className="break-words">{term.examiner}</span>
            </span>
          )}
          {term.capacity != null && term.occupied != null && (
            <span>{t('academic:subjectDetail.exam.terms.capacity', { occupied: term.occupied, capacity: term.capacity })}</span>
          )}
          {term.is_registered && term.deregistration_deadline && (
            <span>
              {t('academic:subjectDetail.exam.terms.deregisterUntil', {
                date: toLocalDate(term.deregistration_deadline).toLocaleDateString(locale, { day: 'numeric', month: 'numeric' }),
              })}
            </span>
          )}
        </div>
      )}
      {term.note && <p className="text-xs text-on-surface-variant whitespace-pre-line">{term.note}</p>}
    </li>
  )
}

/**
 * Exam / credit terms from STAG: the student's registered term first,
 * then the other published terms; past terms are folded away.
 */
const ExamTermsCard = ({ subject }) => {
  const { t } = useTranslation('academic')
  const { data: terms, isLoading, error } = useExamTerms(subject.id)
  const [showPast, setShowPast] = useState(false)

  const upcoming = terms.filter((term) => daysFromToday(term.date) >= 0)
  const past = terms.filter((term) => daysFromToday(term.date) < 0)
  const registered = upcoming.filter((term) => term.is_registered)
  const available = upcoming.filter((term) => !term.is_registered)
  const stagUrl = getSafeHttpsUrl(subject.stag_url)
  const isStagSubject = subject.source !== 'manual'

  return (
    <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Icon icon={CalendarDays} className="text-on-surface-variant" />
          {t('academic:subjectDetail.exam.terms.title')}
        </h3>
        {stagUrl && (
          <a
            href={stagUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-label-md font-semibold text-primary hover:underline"
          >
            {t('academic:subjectDetail.exam.terms.registerInStag')}
            <Icon icon={ExternalLink} />
          </a>
        )}
      </div>

      {isLoading ? (
        <div className="mt-4 h-16 animate-pulse rounded-xl bg-surface-container-low" aria-hidden="true" />
      ) : error ? (
        <p className="mt-3 text-sm text-error">{t('academic:subjectDetail.exam.terms.loadError')}</p>
      ) : upcoming.length === 0 && past.length === 0 ? (
        <div className="mt-3 text-sm text-on-surface-variant">
          <p>{t(isStagSubject ? 'academic:subjectDetail.exam.terms.empty' : 'academic:subjectDetail.exam.terms.manualSubject')}</p>
          {isStagSubject && <p className="mt-1 text-xs">{t('academic:subjectDetail.exam.terms.emptyHint')}</p>}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {registered.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                {t('academic:subjectDetail.exam.terms.nextRegistered')}
              </p>
              <ul className="flex flex-col gap-2">
                {registered.map((term) => <TermRow key={term.id} term={term} highlight />)}
              </ul>
            </div>
          )}
          {available.length > 0 && (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                {t('academic:subjectDetail.exam.terms.available')}
              </p>
              <ul className="flex flex-col gap-2">
                {available.map((term) => <TermRow key={term.id} term={term} />)}
              </ul>
            </div>
          )}
          {upcoming.length === 0 && (
            <p className="text-sm text-on-surface-variant">{t('academic:subjectDetail.exam.terms.empty')}</p>
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
                  ? t('academic:subjectDetail.exam.terms.hidePast')
                  : t('academic:subjectDetail.exam.terms.past', { count: past.length })}
              </button>
              {showPast && (
                <ul className="mt-2 flex flex-col gap-2 opacity-75">
                  {past.map((term) => <TermRow key={term.id} term={term} />)}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default ExamTermsCard
