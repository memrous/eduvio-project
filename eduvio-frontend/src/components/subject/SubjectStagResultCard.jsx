import { useTranslation } from 'react-i18next'
import { Landmark } from 'lucide-react'
import { getLocaleFromLanguage } from '../../utils/locale'
import { classifyResult, getCompletionParts, getCreditMarkKey } from '../../utils/subjectDetails'

const formatDate = (value, locale) => {
  if (!value) return null
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d).toLocaleDateString(locale, { day: 'numeric', month: 'numeric', year: 'numeric' })
}

const ResultRow = ({ label, result, displayResult, date, attempt, examiner, points, failed }) => {
  const { t, i18n } = useTranslation('academic')
  const locale = getLocaleFromLanguage(i18n.language)
  const hasResult = !!result
  const formattedDate = formatDate(date, locale)

  const details = [
    formattedDate,
    attempt > 1 ? t('academic:subjectDetail.stagSection.attempt', { count: attempt }) : null,
    points !== null && points !== undefined && points !== ''
      ? t('academic:subjectDetail.stagSection.points', { points })
      : null,
    examiner ? `${t('academic:subjectDetail.stagSection.examiner')}: ${examiner}` : null,
  ].filter(Boolean)

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-surface-container-low p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium text-on-surface-variant">{label}</p>
        {hasResult && details.length > 0 && (
          <p className="mt-1 text-xs text-on-surface-variant break-words">{details.join(' · ')}</p>
        )}
      </div>
      {hasResult ? (
        <span
          className={`self-start shrink-0 rounded-lg px-2.5 py-1 font-mono text-sm font-bold ${
            failed ? 'bg-error-container text-on-error-container' : 'bg-surface-container text-foreground'
          }`}
        >
          {displayResult}
        </span>
      ) : (
        <span className="self-start shrink-0 text-sm text-on-surface-variant">
          {t('academic:subjectDetail.stagSection.noResult')}
        </span>
      )}
    </div>
  )
}

const SubjectStagResultCard = ({ subject }) => {
  const { t } = useTranslation(['academic', 'common'])

  const completionType = subject.completion_type ?? subject.completionType
  const creditResult = subject.credit_result || null
  const examResult = subject.exam_result || null
  const finalGrade = subject.final_grade ?? subject.finalGrade ?? null
  const isFailed = subject.status === 'failed'

  let { credit: showCredit, exam: showExam } = getCompletionParts(completionType)
  if (!showCredit && !showExam) {
    // Unknown completion type: show only what STAG actually returned
    showCredit = !!creditResult
    showExam = !!examResult
  }

  // The result that decides the subject (same rule as the backend)
  const decidingRow = examResult ? 'exam' : 'credit'
  const rowFailed = (row, result) =>
    !!result && (classifyResult(result) === 'failed' || (isFailed && decidingRow === row))

  const creditMarkKey = getCreditMarkKey(creditResult)

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-surface-container-lowest p-6 shadow-sm">
      {/* SECTION HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Landmark className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight text-foreground">
              {t('academic:subjectDetail.sections.stagHeader')}
            </h3>
            <p className="text-xs text-on-surface-variant">
              {t('academic:subjectDetail.stagSection.title')}
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
          <Landmark className="size-3.5" />
          {t('academic:subjectDetail.sections.stagBadge')}
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {showCredit && (
          <ResultRow
            label={t('academic:subjectDetail.stagSection.credit')}
            result={creditResult}
            displayResult={creditMarkKey ? t(`academic:subjectDetail.stagSection.${creditMarkKey}`) : creditResult}
            date={subject.credit_date}
            attempt={subject.credit_attempt}
            examiner={subject.credit_examiner}
            failed={rowFailed('credit', creditResult)}
          />
        )}
        {showExam && (
          <ResultRow
            label={t('academic:subjectDetail.stagSection.exam')}
            result={examResult}
            displayResult={examResult}
            date={subject.exam_date}
            attempt={subject.exam_attempt}
            examiner={subject.exam_examiner}
            points={subject.exam_points}
            failed={rowFailed('exam', examResult)}
          />
        )}
        {!showCredit && !showExam && (
          <p className="rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">
            {finalGrade
              ? `${t('academic:subjectDetail.stagSection.finalGrade')} ${finalGrade}`
              : t('academic:subjectDetail.stagSection.noResult')}
          </p>
        )}

        {(showCredit || showExam) && finalGrade && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant pt-3 text-sm">
            <span className="text-on-surface-variant">{t('academic:subjectDetail.stagSection.finalGrade')}</span>
            <span
              className={`rounded-lg px-2.5 py-1 font-mono font-bold ${
                isFailed ? 'bg-error-container text-on-error-container' : 'bg-surface-container text-foreground'
              }`}
            >
              {finalGrade}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default SubjectStagResultCard
