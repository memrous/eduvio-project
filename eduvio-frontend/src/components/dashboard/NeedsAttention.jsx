import { AlertTriangle, TrendingDown, Upload, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const NeedsAttention = ({ alerts, subjects, onUploadClick, onViewSubject }) => {
  const { t } = useTranslation('dashboard')

  const isEmpty = !alerts || alerts.length === 0

  const getSubjectCode = (alert) => {
    if (alert.subjectCode) return alert.subjectCode
    if (alert.subjectId && subjects) {
      const sub = subjects.find((s) => s.id === alert.subjectId)
      if (sub) return sub.code
    }
    return ''
  }

  return (
    <section aria-labelledby="attention-heading" className="w-full">
      <div className="mb-3 flex items-center gap-2">
        <h2 id="attention-heading" className="text-lg font-semibold text-foreground">
          {t('needsAttention.title')}
        </h2>
        {!isEmpty && (
          <span className="flex size-5 items-center justify-center rounded-full bg-error-container text-xs font-bold text-error">
            {alerts.length}
          </span>
        )}
      </div>

      {isEmpty ? (
        <div className="flex items-center gap-4 rounded-xl border border-success/30 bg-success-container/40 p-5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-success-container text-success">
            <CheckCircle2 className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{t('needsAttention.allDone')}</p>
            <p className="text-sm text-on-surface-variant">
              {t('needsAttention.noAlerts')}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {alerts.map((alert, index) => {
            const subjectCode = getSubjectCode(alert)
            const isDeadline = alert.type === 'deadline'
            const Icon = isDeadline ? AlertTriangle : TrendingDown

            return (
              <div
                key={`${alert.type}-${alert.requirementId ?? alert.subjectId}-${index}`}
                className="flex items-start gap-4 rounded-xl border border-outline-variant border-l-4 border-l-error bg-surface-container-lowest p-4 shadow-sm"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-error-container text-error">
                  <Icon className="size-5" aria-hidden="true" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{alert.title}</h3>
                    {subjectCode && (
                      <span className="rounded-md bg-surface-container-high px-1.5 py-0.5 font-mono text-[11px] font-semibold text-on-surface-variant">
                        {subjectCode}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-on-surface-variant">
                    {isDeadline
                      ? t('needsAttention.deadlineMessage', { count: alert.days })
                      : t('needsAttention.lowScoreMessage', { score: alert.score })}
                  </p>

                  <div className="mt-3">
                    {isDeadline ? (
                      <button
                        type="button"
                        onClick={() => onUploadClick?.(alert)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                      >
                        <Upload className="size-3.5" aria-hidden="true" />
                        {t('needsAttention.uploadSolution')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onViewSubject?.(alert.subjectId || alert)}
                        className="inline-flex items-center gap-1 rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-container-high"
                      >
                        {t('needsAttention.viewDetail')}
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default NeedsAttention