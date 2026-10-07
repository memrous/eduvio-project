import ProgressBar from '../common/ProgressBar'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Percent, CheckCircle2, AlertCircle } from 'lucide-react'

const SubjectSummaryStrip = ({ subject, requirements = [] }) => {
  const { t } = useTranslation(['academic', 'dashboard'])

  const { totalGained, totalMax, remainingCount } = useMemo(() => {
    let gained = 0
    let max = 0
    let remaining = 0

    ;(requirements || []).forEach((r) => {
      if (!(r.isCompleted || r.completed)) remaining += 1

      const g = r.gainedPoints ?? r.gained_points
      const m = r.maxPoints ?? r.max_points
      if (m !== undefined && m !== null && m > 0) {
        max += m
        if (g !== undefined && g !== null) gained += g
      }
    })

    return { totalGained: gained, totalMax: max, remainingCount: remaining }
  }, [requirements])

  const hasPoints = totalMax > 0
  const percentage = hasPoints ? Math.round((totalGained / totalMax) * 100) : null

  // Only a threshold the subject really has; no default
  const rawThreshold = subject.passThreshold ?? subject.pass_threshold
  const passThreshold = rawThreshold === null || rawThreshold === undefined || rawThreshold === ''
    ? null
    : Number(rawThreshold)
  const hasThreshold = passThreshold !== null && !Number.isNaN(passThreshold)
  const thresholdMet = hasThreshold && percentage !== null && percentage >= passThreshold

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* CARD 1: Points from continuous assessment */}
      <div className="flex flex-col justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface-container text-on-surface-variant">
            <Percent className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-on-surface-variant">
              {t('academic:subjectDetail.metrics.points')}
            </p>
            {hasPoints ? (
              <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                <span className="font-mono text-2xl font-black text-foreground">{percentage}%</span>
                <span className="font-mono text-sm text-on-surface-variant">
                  {totalGained} / {totalMax} {t('academic:subjectDetail.progress.pts')}
                </span>
              </p>
            ) : (
              <p className="mt-0.5 text-sm font-semibold text-on-surface-variant">
                {t('academic:subjectDetail.metrics.noPoints')}
              </p>
            )}
          </div>
        </div>

        {hasPoints && (
          <ProgressBar
            value={percentage}
            className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-surface-container"
            barClassName="h-full rounded-full bg-primary"
          />
        )}

        {hasThreshold && (
          <p className="mt-2.5 text-xs text-on-surface-variant">
            {t('academic:subjectDetail.metrics.passThreshold', { value: passThreshold })}
            {hasPoints && (
              <span className={`ml-1.5 font-semibold ${thresholdMet ? 'text-success' : 'text-error'}`}>
                {thresholdMet
                  ? t('academic:subjectDetail.progress.minimumMet')
                  : t('academic:subjectDetail.metrics.missingToThreshold', { diff: passThreshold - percentage })}
              </span>
            )}
          </p>
        )}
      </div>

      {/* CARD 2: Remaining tasks */}
      <div className="flex items-center gap-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${
            remainingCount > 0
              ? 'bg-warning-container/60 text-on-warning-container'
              : 'bg-success-container text-on-success-container'
          }`}
        >
          {remainingCount > 0 ? <AlertCircle className="size-6" /> : <CheckCircle2 className="size-6" />}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-on-surface-variant">
            {t('academic:subjectDetail.metrics.remainingTasks')}
          </p>
          <p className="mt-0.5 text-sm font-bold text-foreground">
            {t('academic:subjectDetail.metrics.remainingTasksCount', { count: remainingCount })}
          </p>
        </div>
      </div>
    </div>
  )
}

export default SubjectSummaryStrip
