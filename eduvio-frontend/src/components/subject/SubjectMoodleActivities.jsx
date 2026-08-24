import { useTranslation } from 'react-i18next'
import {
  Clock,
  CheckSquare,
  Square,
  Link as LinkIcon,
  Download,
  BookOpenCheck,
} from 'lucide-react'

import { formatAcademicGrade } from '../../utils/subjectColors'

const getDayDiff = (dateStr) => {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / (1000 * 60 * 60 * 24))
}

const getItemBadgeStyle = (gained, max, grade) => {
  if (max !== undefined && max !== null && max > 0 && gained !== undefined && gained !== null) {
    const pct = (gained / max) * 100
    if (pct >= 90) return 'bg-success text-on-success font-extrabold shadow-sm px-2.5 py-0.5 rounded-md'
    if (pct >= 75) return 'bg-success-container text-on-success-container font-bold px-2.5 py-0.5 rounded-md'
    if (pct >= 50) return 'bg-warning-container text-on-warning-container font-bold px-2.5 py-0.5 rounded-md'
    return 'bg-error-container text-on-error-container font-bold ring-1 ring-error/20 px-2.5 py-0.5 rounded-md'
  }

  if (grade) {
    const formatted = formatAcademicGrade(grade)
    if (formatted === 'A') return 'bg-success text-on-success font-extrabold shadow-sm px-2.5 py-0.5 rounded-md'
    if (formatted === 'B' || formatted === 'C') return 'bg-success-container text-on-success-container font-bold px-2.5 py-0.5 rounded-md'
    if (formatted === 'D' || formatted === 'E') return 'bg-warning-container text-on-warning-container font-bold px-2.5 py-0.5 rounded-md'
    if (formatted === 'F') return 'bg-error-container text-on-error-container font-bold ring-1 ring-error/20 px-2.5 py-0.5 rounded-md'
    return 'bg-success-container text-on-success-container font-bold px-2.5 py-0.5 rounded-md'
  }

  return 'bg-surface-container text-on-surface-variant font-medium px-2 py-0.5 rounded-md'
}

const SubjectMoodleActivities = ({ requirements = [], resources = [] }) => {
  const { t } = useTranslation(['academic', 'common'])

  if (!requirements || requirements.length === 0) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center text-sm text-on-surface-variant italic">
        {t('academic:subjectDetail.requirements.noRequirements')}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* SECTION HEADER WITH SUBTLE MOODLE BADGE */}
      <div className="flex items-center justify-between border-b border-outline-variant pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BookOpenCheck className="size-4" />
          </div>
          <h3 className="text-base font-semibold tracking-tight text-foreground">
            {t('academic:subjectDetail.sections.moodleHeader')}
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-low px-2.5 py-0.5 text-[11px] font-semibold text-on-surface-variant">
          <span className="size-1.5 rounded-full bg-primary" />
          {t('academic:subjectDetail.sections.moodleBadge')}
        </span>
      </div>

      {/* ACTIVITIES LIST */}
      <div className="flex flex-col gap-3">
        {requirements.map((req) => {
          const isCompleted = req.isCompleted || req.completed
          const gained = req.gainedPoints ?? req.gained_points
          const max = req.maxPoints ?? req.max_points
          const hasPoints = max !== undefined && max !== null && Number(max) > 0
          const hasGrade = !!req.grade

          const diff = getDayDiff(req.date || req.due_date)

          let statusEl = null
          if (isCompleted) {
            statusEl = (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-container px-2.5 py-0.5 text-[11px] font-bold text-on-success-container">
                {t('academic:subjectDetail.requirements.statusCompleted')}
              </span>
            )
          } else if (diff !== null && diff === 0) {
            statusEl = (
              <span className="inline-flex items-center gap-1 rounded-full bg-error-container px-2.5 py-0.5 text-[11px] font-bold text-error">
                <Clock className="size-3" />
                {t('academic:subjectDetail.requirements.statusDueToday')}
              </span>
            )
          } else if (diff !== null && diff > 0 && diff <= 14) {
            statusEl = (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  diff <= 3 ? 'bg-error-container text-error' : 'bg-warning-container text-on-warning-container'
                }`}
              >
                <Clock className="size-3" />
                {t('academic:subjectDetail.requirements.statusDueSoon', { count: diff })}
              </span>
            )
          } else if (req.date || req.due_date) {
            statusEl = (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-on-surface-variant">
                <Clock className="size-3" />
                {req.date || req.due_date}
              </span>
            )
          }

          const linkedMaterials = resources
            ? resources.filter((r) => r.requirementId === req.id || r.requirement_id === req.id)
            : []

          const reqTypeName = t(`academic:subjectDetail.requirements.types.${req.type}`, req.type)

          // CASE 1: CHECKLIST ROW (No points and no grade)
          if (!hasPoints && !hasGrade) {
            return (
              <div
                key={req.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3.5 transition-colors hover:bg-surface-container/30"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 text-primary">
                    {isCompleted ? (
                      <CheckSquare className="size-5 text-success" />
                    ) : (
                      <Square className="size-5 text-on-surface-variant/60" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-surface-container px-1.5 py-0.5 text-[10px] font-bold uppercase text-on-surface-variant">
                        {reqTypeName}
                      </span>
                      <h4
                        className={`truncate text-sm font-medium ${
                          isCompleted ? 'line-through text-on-surface-variant' : 'text-foreground'
                        }`}
                      >
                        {req.title}
                      </h4>
                    </div>
                  </div>
                </div>
                <div className="shrink-0">{statusEl}</div>
              </div>
            )
          }

          // CASE 2: REGULAR ACTIVITY CARD (With Points or Grade)
          const badgeStyle = getItemBadgeStyle(gained, max, req.grade)

          return (
            <div
              key={req.id}
              className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition-all hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="rounded-md bg-surface-container px-2 py-0.5 text-[11px] font-bold uppercase text-on-surface-variant">
                    {reqTypeName}
                  </span>
                  {req.weight !== undefined && req.weight !== null && (
                    <span className="text-[11px] font-semibold text-on-surface-variant">
                      {t('academic:subjectDetail.requirements.weight', { weight: req.weight })}
                    </span>
                  )}
                </div>

                <div className="text-right shrink-0">
                  {hasPoints ? (
                    <span className={`inline-flex font-mono text-xs ${badgeStyle}`}>
                      {gained !== null && gained !== undefined
                        ? gained
                        : t('academic:subjectDetail.requirements.noPts')}{' '}
                      / {max} PTS
                    </span>
                  ) : hasGrade ? (
                    <span className={`inline-flex font-mono text-xs ${badgeStyle}`}>
                      {t('academic:subjectDetail.moodleSection.gradeLabel', { grade: formatAcademicGrade(req.grade) })}
                    </span>
                  ) : null}
                  {statusEl && <div className="mt-1 flex justify-end">{statusEl}</div>}
                </div>
              </div>

              <h4 className="text-sm font-semibold leading-snug text-foreground">{req.title}</h4>

              {req.description && (
                <p className="text-xs text-on-surface-variant leading-relaxed">{req.description}</p>
              )}

              {linkedMaterials.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-outline-variant">
                  {linkedMaterials.map((mat) => {
                    const isLink = mat.type === 'LINK' || mat.url?.startsWith('http')
                    return (
                      <a
                        key={mat.id}
                        href={mat.url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-outline-variant px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant transition-colors hover:bg-surface-container"
                      >
                        {isLink ? <LinkIcon className="size-3" /> : <Download className="size-3" />}
                        {mat.title}
                      </a>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SubjectMoodleActivities
