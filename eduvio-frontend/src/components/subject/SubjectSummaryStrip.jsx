import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Percent, Award, CheckCircle2, AlertCircle } from 'lucide-react'

const getPerformanceTier = (pct, passThreshold = 50) => {
  if (pct === null || pct === undefined) {
    return {
      tier: 'neutral',
      badgeClass: 'bg-surface-container text-on-surface-variant',
      textClass: 'text-foreground',
      iconClass: 'bg-surface-container text-on-surface-variant',
      barClass: 'bg-outline-variant',
    }
  }

  const threshold = Number(passThreshold) > 0 ? Number(passThreshold) : 50

  if (pct >= 90) {
    return {
      tier: 'excellent',
      badgeClass: 'bg-success text-on-success font-extrabold shadow-sm',
      textClass: 'text-success font-extrabold',
      iconClass: 'bg-success text-on-success shadow-sm',
      barClass: 'bg-success',
    }
  }

  if (pct >= 75) {
    return {
      tier: 'good',
      badgeClass: 'bg-success-container text-on-success-container font-bold',
      textClass: 'text-on-success-container font-bold',
      iconClass: 'bg-success-container text-on-success-container',
      barClass: 'bg-success',
    }
  }

  if (pct >= threshold) {
    return {
      tier: 'warning',
      badgeClass: 'bg-warning-container text-on-warning-container font-bold',
      textClass: 'text-on-warning-container font-bold',
      iconClass: 'bg-warning-container text-on-warning-container',
      barClass: 'bg-warning',
    }
  }

  return {
    tier: 'danger',
    badgeClass: 'bg-error-container text-on-error-container font-bold ring-1 ring-error/30',
    textClass: 'text-error font-bold',
    iconClass: 'bg-error-container text-on-error-container',
    barClass: 'bg-error',
  }
}

const SubjectSummaryStrip = ({ subject, requirements = [] }) => {
  const { t } = useTranslation(['academic', 'dashboard'])

  const { totalGained, totalMax, remainingCount, hasPoints, hasGrades, avgGrade, allCompleted } = useMemo(() => {
    if (!requirements || requirements.length === 0) {
      return {
        totalGained: 0,
        totalMax: 0,
        remainingCount: 0,
        hasPoints: false,
        hasGrades: false,
        avgGrade: null,
        allCompleted: false,
      }
    }

    let gained = 0
    let max = 0
    let remaining = 0
    let completedCount = 0
    const gradesList = []

    requirements.forEach((r) => {
      const isComp = r.isCompleted || r.completed
      if (isComp) {
        completedCount += 1
      } else {
        remaining += 1
      }

      const g = r.gainedPoints ?? r.gained_points
      const m = r.maxPoints ?? r.max_points
      if (m !== undefined && m !== null && m > 0) {
        max += m
        if (g !== undefined && g !== null) {
          gained += g
        }
      }

      if (r.grade) {
        const numericGrade = parseFloat(r.grade)
        if (!isNaN(numericGrade)) {
          gradesList.push(numericGrade)
        }
      }
    })

    const ptsExist = max > 0
    const gradesExist = !ptsExist && gradesList.length > 0
    const averageG = gradesExist
      ? (gradesList.reduce((a, b) => a + b, 0) / gradesList.length).toFixed(1)
      : null

    return {
      totalGained: gained,
      totalMax: max,
      remainingCount: remaining,
      hasPoints: ptsExist,
      hasGrades: gradesExist,
      avgGrade: averageG,
      allCompleted: completedCount === requirements.length && requirements.length > 0,
    }
  }, [requirements])

  // Percentage & performance tier calculation
  const percentage = hasPoints && totalMax > 0 ? Math.round((totalGained / totalMax) * 100) : null
  const passThreshold = subject.passThreshold ?? subject.pass_threshold ?? 50
  const tier = getPerformanceTier(percentage, passThreshold)

  const estimatedGradeData = useMemo(() => {
    if (percentage !== null) {
      if (percentage >= 90) return { label: '1 (A)', badgeClass: 'bg-success text-on-success shadow-sm' }
      if (percentage >= 80) return { label: '2 (B)', badgeClass: 'bg-success-container text-on-success-container' }
      if (percentage >= 70) return { label: '3 (C)', badgeClass: 'bg-warning-container text-on-warning-container' }
      return { label: '4 (F)', badgeClass: 'bg-error-container text-on-error-container ring-1 ring-error/20' }
    }
    if (hasGrades && avgGrade) {
      const num = parseFloat(avgGrade)
      if (num <= 1.5) return { label: `${avgGrade} (A)`, badgeClass: 'bg-success text-on-success' }
      if (num <= 2.5) return { label: `${avgGrade} (B)`, badgeClass: 'bg-success-container text-on-success-container' }
      if (num <= 3.5) return { label: `${avgGrade} (C)`, badgeClass: 'bg-warning-container text-on-warning-container' }
      return { label: `${avgGrade} (F)`, badgeClass: 'bg-error-container text-on-error-container' }
    }
    if (allCompleted) {
      return { label: t('academic:subjectDetail.metrics.creditGranted'), badgeClass: 'bg-success-container text-on-success-container' }
    }
    return { label: '—', badgeClass: 'bg-surface-container text-on-surface-variant' }
  }, [percentage, hasGrades, avgGrade, allCompleted, t])

  const completionType = subject.completionType || subject.completion_type
  const isCreditOnly = completionType === 'Credit' && !hasPoints

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* CARD 1: Success Rate / Average Grade / Credit Status */}
      <div className="flex flex-col justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl transition-colors ${tier.iconClass}`}>
            <Percent className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-on-surface-variant">
              {isCreditOnly
                ? t('academic:subjectDetail.metrics.noPointsSubject')
                : hasGrades
                ? t('academic:subjectDetail.metrics.averageGrade')
                : t('academic:subjectDetail.metrics.successRate')}
            </p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className={`font-mono text-2xl font-black ${tier.textClass}`}>
                {hasPoints ? `${percentage}%` : hasGrades ? avgGrade : allCompleted ? '100%' : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Mini Progress Bar */}
        {hasPoints && (
          <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-surface-container">
            <div
              className={`h-full rounded-full transition-all duration-500 ${tier.barClass}`}
              style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
            />
          </div>
        )}
      </div>

      {/* CARD 2: Estimated Grade */}
      <div className="flex flex-col justify-between rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Award className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-xs font-medium text-on-surface-variant">
                {t('academic:subjectDetail.metrics.estimatedGrade')}
              </p>
              <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                {t('academic:subjectDetail.metrics.estimateNote')}
              </span>
            </div>
            <div className="mt-1.5 flex items-center">
              <span className={`inline-flex items-center rounded-lg px-2.5 py-1 font-mono text-lg font-bold ${estimatedGradeData.badgeClass}`}>
                {estimatedGradeData.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CARD 3: Remaining / Unevaluated tasks */}
      <div className="flex items-center gap-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm sm:col-span-2 lg:col-span-1">
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${
            remainingCount > 0
              ? 'bg-warning-container/60 text-on-warning-container'
              : 'bg-success-container text-on-success-container'
          }`}
        >
          {remainingCount > 0 ? (
            <AlertCircle className="size-6" />
          ) : (
            <CheckCircle2 className="size-6" />
          )}
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
