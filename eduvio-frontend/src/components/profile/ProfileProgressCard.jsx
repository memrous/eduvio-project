import { useTranslation } from 'react-i18next'
import ProgressBar from '../common/ProgressBar'
import { useStudyProgress } from '../../hooks/useStudyProgress'
import { getLocaleFromLanguage } from '../../utils/locale'

/**
 * Study progress computed by the backend from the user's subjects
 * (GET /user/study-progress). No numbers are shown that we do not have.
 */
const ProfileProgressCard = () => {
  const { t, i18n } = useTranslation('profile')
  const { data, isLoading, error } = useStudyProgress()
  const locale = getLocaleFromLanguage(i18n.language)

  // Nothing to show while loading or on error (no placeholder numbers)
  if (isLoading || error || !data) return null

  const {
    earned_credits: earned,
    required_credits: required,
    required_credits_estimated: estimated,
    weighted_average: average,
    completed_subjects: completedCount,
    current_semester_credits: semesterCredits,
  } = data

  const percentage = required ? Math.min(100, Math.round((earned / required) * 100)) : null

  return (
    <section className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-ambient space-y-3">
      <div className="flex justify-between items-center gap-2 text-xs">
        <span className="font-bold tracking-wider text-on-surface-variant uppercase">{t('progress.title')}</span>
        {percentage !== null && completedCount > 0 && (
          <strong className="text-sm font-bold text-on-surface">{percentage} %</strong>
        )}
      </div>

      {completedCount === 0 ? (
        <p className="text-sm text-on-surface-variant">{t('progress.empty')}</p>
      ) : (
        <>
          <div className="space-y-1.5">
            <p className="text-sm text-on-surface">
              {required
                ? t('progress.creditsOf', { earned, required })
                : t('progress.creditsEarned', { earned })}
            </p>
            {required && (
              <>
                <ProgressBar
                  value={percentage}
                  className="w-full h-2 bg-surface-container rounded-full overflow-hidden"
                  barClassName="h-full bg-primary rounded-full"
                />
                {estimated && (
                  <p className="text-[11px] text-on-surface-variant">{t('progress.requiredEstimated')}</p>
                )}
              </>
            )}
          </div>

          <dl className="grid grid-cols-3 gap-3 border-t border-outline-variant/60 pt-3 text-center">
            {[
              {
                key: 'weightedAverage',
                value: average !== null && average !== undefined
                  ? average.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : '—',
              },
              { key: 'completedSubjects', value: completedCount },
              { key: 'semesterCredits', value: semesterCredits },
            ].map((stat) => (
              // Label first in the DOM, value shown on top
              <div key={stat.key} className="flex flex-col-reverse min-w-0">
                <dt className="text-[11px] text-on-surface-variant break-words">{t(`progress.${stat.key}`)}</dt>
                <dd className="text-lg font-bold text-on-surface">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </section>
  )
}

export default ProfileProgressCard
