import { GraduationCap, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const QuickProgress = ({ progress }) => {
  const { t } = useTranslation('dashboard')

  const {
    creditsGained = 0,
    creditsTotal = 0,
    completedSubjects = 0,
    totalSubjects = 0,
    averageScore = 0
  } = progress || {}

  const creditPercentage = creditsTotal > 0 ? Math.min(100, Math.round((creditsGained / creditsTotal) * 100)) : 0

  return (
    <section
      aria-labelledby="progress-heading"
      className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-ambient ring-1 ring-inset ring-primary/5 w-full"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <GraduationCap className="size-4.5" aria-hidden="true" />
        </span>
        <h2 id="progress-heading" className="text-base font-semibold text-foreground">
          {t('quickProgress.title')}
        </h2>
      </div>

      {/* Semester Credits Progress Bar */}
      <div className="flex items-end justify-between">
        <span className="text-sm text-on-surface-variant">{t('quickProgress.creditsThisSemester')}</span>
        <span className="text-sm font-semibold text-foreground">
          <span className="tabular-nums">{creditsGained}</span>
          <span className="text-on-surface-variant"> / {creditsTotal}</span>
        </span>
      </div>

      <div
        className="mt-2 h-4 w-full overflow-hidden rounded-full bg-surface-container"
        role="progressbar"
        aria-valuenow={creditsGained}
        aria-valuemin={0}
        aria-valuemax={creditsTotal}
        aria-label={t('quickProgress.creditsThisSemester')}
      >
        <div
          className="flex h-full items-center justify-end rounded-full bg-primary pr-2 transition-all duration-500 ease-out"
          style={{ width: `${creditPercentage}%` }}
        >
          {creditPercentage > 0 && (
            <span className="text-[10px] font-bold text-primary-foreground">{creditPercentage}%</span>
          )}
        </div>
      </div>

      {/* Stats Boxes */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {/* Average Score Box (Green) */}
        <div className="rounded-xl bg-success-container p-3">
          <p className="flex items-center gap-1 text-xs text-on-success-container">
            {t('quickProgress.averageScore')}
            <TrendingUp className="size-3 text-success" aria-hidden="true" />
          </p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-success">
            {averageScore} %
          </p>
        </div>

        {/* Completed Subjects Box (Grey) */}
        <div className="rounded-xl bg-secondary-container/60 p-3">
          <p className="text-xs text-on-surface-variant">{t('quickProgress.completedSubjects')}</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">
            {completedSubjects} <span className="text-sm font-medium text-on-surface-variant">/ {totalSubjects}</span>
          </p>
        </div>
      </div>
    </section>
  )
}

export default QuickProgress