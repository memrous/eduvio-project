import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, X } from 'lucide-react'
import { getSemesterLinkTitle } from '../../utils/semesterLinks'
import { getSubjectIdOf, isSameId } from '../../utils/ids'

// ─── Semester Link Modal (add / edit a course page link) ─────
const SemesterLinkModal = ({ link, subjects, onClose, onSave }) => {
  const { t } = useTranslation('resources')
  const [form, setForm] = useState({
    subjectId: String(getSubjectIdOf(link) ?? subjects[0]?.id ?? ''),
    // Automatic links have no stored title; start from what the list shows
    title: link
      ? getSemesterLinkTitle(link, subjects.find((s) => isSameId(s.id, getSubjectIdOf(link))), t)
      : '',
    url: link?.url ?? '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const url = form.url.trim()
    if (!/^https?:\/\/\S+$/i.test(url)) {
      setSubmitError(t('resources:semesterLinks.errors.invalidUrl'))
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await onSave({
        subjectId: form.subjectId ? Number(form.subjectId) : null,
        title: form.title.trim(),
        url,
      })
      onClose()
    } catch {
      setSubmitError(t('resources:semesterLinks.errors.saveFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputCls = 'w-full px-3.5 py-2.5 bg-surface rounded-xl border border-outline-variant text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-colors disabled:opacity-60'
  const labelCls = 'text-xs font-semibold text-on-surface-variant'

  return (
    <div className="fixed inset-0 bg-scrim/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="semester-link-title" className="bg-surface rounded-2xl shadow-2xl border border-outline-variant w-full max-w-md overflow-hidden font-inter">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface">
          <h2 id="semester-link-title" className="text-lg font-semibold text-on-surface">
            {link ? t('resources:semesterLinks.editTitle') : t('resources:semesterLinks.addTitle')}
          </h2>
          <button onClick={onClose} disabled={isSubmitting} aria-label={t('resources:modal.actions.cancel')} className="p-1 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface cursor-pointer bg-transparent border-0 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {submitError && (
            <div role="alert" className="p-3 bg-error-container border border-error/30 rounded-xl text-sm text-on-error-container">
              {submitError}
            </div>
          )}

          {link?.link_source === 'auto' && (
            <p className="text-xs text-on-surface-variant">{t('resources:semesterLinks.editAutoNote')}</p>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="semester-link-subject" className={labelCls}>{t('resources:modal.fields.subject')}</label>
            <select id="semester-link-subject" required value={form.subjectId} onChange={set('subjectId')} disabled={isSubmitting} className={inputCls}>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="semester-link-name" className={labelCls}>{t('resources:semesterLinks.fields.title')}</label>
            <input id="semester-link-name" required placeholder={t('resources:semesterLinks.placeholders.title')} value={form.title} onChange={set('title')} disabled={isSubmitting} className={inputCls} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="semester-link-url" className={labelCls}>{t('resources:semesterLinks.fields.url')}</label>
            <input id="semester-link-url" type="url" required placeholder="https://" value={form.url} onChange={set('url')} disabled={isSubmitting} className={inputCls} />
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-outline-variant/60 mt-1">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 border border-outline-variant rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer bg-transparent disabled:opacity-50">{t('resources:modal.actions.cancel')}</button>
            <button
              type="submit"
              disabled={isSubmitting || subjects.length === 0}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-sm font-semibold shadow-sm transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {t('resources:semesterLinks.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SemesterLinkModal
