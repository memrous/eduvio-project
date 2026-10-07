import ProgressBar from './common/ProgressBar'
import { useMemo } from 'react'
import { User, BookOpen, AlertTriangle, CheckCircle2, ArrowRight, Building2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRequirements } from '../hooks/useRequirements'
import { getSemesterShort, getStatutStyles, getStatutLabelKey, normalizeStatut } from '../utils/semester'

const SubjectOverviewCard = ({ subject, onSelect }) => {
  const { t } = useTranslation(['dashboard', 'academic'])
  const { data: requirements } = useRequirements(subject.id)

  const gained =
    subject.gainedPoints !== undefined
      ? subject.gainedPoints
      : subject.gained_points
  const max =
    subject.maxPoints !== undefined ? subject.maxPoints : subject.max_points
  const hasPoints =
    gained !== undefined && gained !== null && max !== undefined && max !== null
  const percentage = hasPoints && max > 0 ? (gained / max) * 100 : 0

  const hasRequirements = requirements && requirements.length > 0
  const allCompleted =
    hasRequirements && requirements.every((r) => r.isCompleted)

  const incompleteUrgentCount = useMemo(() => {
    if (!requirements) return 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const threeDaysFromNow = new Date(
      today.getTime() + 3 * 24 * 60 * 60 * 1000
    )

    return requirements.filter((r) => {
      if (r.isCompleted) return false
      if (!r.date) return false
      const dueDate = new Date(r.date)
      return dueDate >= today && dueDate <= threeDaysFromNow
    }).length
  }, [requirements])

  const isUrgent = incompleteUrgentCount > 0
  const progressColor = percentage < 50 ? 'bg-warning' : 'bg-success'

  const semesterShort = getSemesterShort(subject.semester)
  const statut = normalizeStatut(subject.statut, subject.isMandatory)
  const statutStyle = getStatutStyles(statut)
  const statutLabelKey = getStatutLabelKey(statut)
  const statutLabel = t(statutLabelKey)

  return (
    <button
      type="button"
      onClick={() => onSelect?.(subject)}
      className="group flex flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 text-left transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 cursor-pointer"
    >
      {/* Top row: book icon + semester badge + statut badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary shrink-0">
          <BookOpen className="size-5" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {semesterShort && (
            <span
              className="rounded-md px-2 py-1 text-xs font-semibold bg-surface-container-high text-on-surface-variant"
              title={subject.semester}
            >
              {semesterShort}
            </span>
          )}
          {subject.stag_removed_at && (
            <span className="rounded-md px-2 py-1 text-xs font-semibold bg-surface-container-high text-on-surface-variant">
              {t('academic:stagRemoved.badge')}
            </span>
          )}
          <span
            className={`rounded-md px-2 py-1 text-xs font-medium ${statutStyle.bg} ${statutStyle.text}`}
          >
            {statutLabel}
          </span>
        </div>
      </div>

      {/* Code + credits + name + lecturer */}
      <div className="mt-4">
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="font-mono text-primary">{subject.code}</span>
          <span className="text-on-surface-variant">·</span>
          <span className="text-on-surface-variant">
            {t('dashboard:subjectCard.credits', { count: subject.credits })}
          </span>
        </div>
        <h3 className="mt-1 text-lg font-semibold tracking-tight text-foreground text-balance">
          {subject.name}
        </h3>
        {(subject.lecturer || subject.department) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-on-surface-variant">
            {subject.lecturer && (
              <div className="flex items-center gap-1.5 min-w-0">
                <User className="size-3.5 shrink-0" />
                <span className="truncate">{subject.lecturer}</span>
              </div>
            )}
            {subject.department && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-medium text-on-surface-variant/80 bg-surface-container-low px-1.5 py-0.5 rounded-sm shrink-0"
                title={subject.department}
              >
                <Building2 className="w-3 h-3 shrink-0" />
                {subject.department}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Gained points & progress bar */}
      {hasPoints && (
        <div className="mt-5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-on-surface-variant">{t('dashboard:subjectOverviewCard.gainedPoints')}</span>
            <span className="font-mono font-semibold text-foreground">
              {gained} / {max} <span className="text-on-surface-variant">{t('dashboard:subjectOverviewCard.pts')}</span>
            </span>
          </div>
          <ProgressBar
            value={percentage}
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-container"
            barClassName={`h-full rounded-full ${progressColor}`}
          />
        </div>
      )}

      {/* Bottom row: status badge + open link */}
      <div className="mt-5 flex items-center justify-between border-t border-outline-variant pt-4">
        <div>
          {hasRequirements && (
            <>
              {isUrgent ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-container px-2.5 py-1 text-xs font-medium text-on-warning-container ring-1 ring-inset ring-warning/20">
                  <AlertTriangle className="size-3.5" />
                  {t('dashboard:subjectOverviewCard.urgentTasks', {
                    count: incompleteUrgentCount,
                  })}
                </span>
              ) : allCompleted ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success-container px-2.5 py-1 text-xs font-medium text-on-success-container ring-1 ring-inset ring-success/20">
                  <CheckCircle2 className="size-3.5" />
                  {t('dashboard:subjectOverviewCard.allDone')}
                </span>
              ) : null}
            </>
          )}
        </div>

        <span className="flex items-center gap-1 text-sm font-medium text-primary transition-transform group-hover:translate-x-0.5">
          {t('dashboard:subjectOverviewCard.open')}
          <ArrowRight className="size-4" />
        </span>
      </div>
    </button>
  )
}

export default SubjectOverviewCard
