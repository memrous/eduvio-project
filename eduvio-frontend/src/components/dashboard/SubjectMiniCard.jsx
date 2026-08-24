import { useTranslation } from 'react-i18next'

const getScoreClasses = (score) => {
  if (score >= 70) return 'bg-success/12 text-success'
  if (score >= 40) return 'bg-primary/12 text-primary'
  return 'bg-error/12 text-error'
}

const SubjectMiniCard = ({ subject, onSelect }) => {
  const { t } = useTranslation('dashboard')

  const gained =
    subject.gainedPoints !== undefined
      ? subject.gainedPoints
      : subject.gained_points
  const max =
    subject.maxPoints !== undefined
      ? subject.maxPoints
      : subject.max_points
  const hasPoints =
    gained !== undefined &&
    gained !== null &&
    max !== undefined &&
    max !== null &&
    Number(max) > 0

  const score = hasPoints ? Math.round((gained / max) * 100) : null
  const hasScore = score !== null

  return (
    <button
      type="button"
      onClick={() => onSelect?.(subject)}
      className="group flex flex-col rounded-xl border border-outline-variant bg-surface-container-lowest p-3 text-left shadow-ambient transition-colors hover:border-primary/40 hover:bg-surface-container/40"
    >
      {/* Top row: code pill + score badge */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold text-primary truncate max-w-[60%] lg:max-w-[65%]">
          {subject.code}
        </span>
        {hasScore && (
          <span
            className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums shrink-0 ${getScoreClasses(score)}`}
          >
            {score}%
          </span>
        )}
      </div>

      {/* Subject name */}
      <p className="mt-2 text-sm font-medium leading-snug text-foreground line-clamp-2 text-pretty">
        {subject.name}
      </p>

      {/* Points earned line */}
      {hasPoints && (
        <span className="mt-1 text-[11px] font-medium text-on-surface-variant">
          {t('subjectMiniCard.points', { gained, max })}
        </span>
      )}
    </button>
  )
}

export default SubjectMiniCard