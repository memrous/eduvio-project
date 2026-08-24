import { useTranslation } from 'react-i18next'
import { Landmark, Clock, CheckCircle2, Award } from 'lucide-react'

const SubjectStagResultCard = ({ subject }) => {
  const { t } = useTranslation(['academic', 'common'])

  const status = subject.status || (subject.finalGrade || subject.final_grade ? 'closed' : 'in_progress')
  const finalGrade = subject.finalGrade || subject.final_grade || null
  const isClosed = status === 'closed' || status === 'completed' || !!finalGrade

  return (
    <div className="mt-8 rounded-2xl border-2 border-primary/20 bg-surface-container-lowest p-6 shadow-sm">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between border-b border-outline-variant pb-4">
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

      {/* CONTENT: CLOSED VS PENDING */}
      <div className="mt-5">
        {isClosed ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col rounded-xl bg-surface-container-low p-4">
              <span className="text-xs font-medium text-on-surface-variant">
                {t('academic:subjectDetail.stagSection.finalGrade')}
              </span>
              <span className="mt-1 font-mono text-2xl font-extrabold text-foreground">
                {finalGrade || t('academic:subjectDetail.status.completed')}
              </span>
            </div>

            <div className="flex flex-col rounded-xl bg-surface-container-low p-4">
              <span className="text-xs font-medium text-on-surface-variant">
                {t('academic:subjectDetail.stagSection.creditsAwarded')}
              </span>
              <span className="mt-1 font-mono text-2xl font-extrabold text-primary">
                {subject.credits} ECTS
              </span>
            </div>

            <div className="flex flex-col rounded-xl bg-surface-container-low p-4">
              <span className="text-xs font-medium text-on-surface-variant">
                {t('academic:subjectDetail.stagSection.closedDate')}
              </span>
              <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-success">
                <CheckCircle2 className="size-4" />
                {t('academic:subjectDetail.status.closed')}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4 rounded-xl border border-dashed border-outline-variant bg-surface-container-low/50 p-5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning-container/30 text-on-warning-container">
              <Clock className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                {t('academic:subjectDetail.stagSection.pendingTitle')}
              </h4>
              <p className="mt-1 text-xs text-on-surface-variant leading-relaxed">
                {t('academic:subjectDetail.stagSection.pendingDescription')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SubjectStagResultCard
