import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, X } from 'lucide-react'
import LessonSelect from './LessonSelect'
import { GENERAL_LESSON, getSubjectLessons } from '../../utils/lessons'
import { getEventIdOf, getSubjectIdOf, isSameId } from '../../utils/ids'
import { isOwnFile } from '../../utils/materialKinds'

// Select value of a material without a subject ("Jiné")
const OTHER_SUBJECT = 'none'
const TYPES = ['PDF', 'NOTES', 'SLIDES', 'RECORDING', 'LINK', 'DOC']

/**
 * Edit an own material: the same fields as the upload, prefilled. An uploaded
 * file can be replaced (the old one is deleted), a link keeps its address field.
 */
const EditMaterialModal = ({ resource, subjects, events, semesterStarts, onClose, onSave }) => {
  const { t } = useTranslation('resources')
  const ownFile = isOwnFile(resource)
  const initialSubjectId = getSubjectIdOf(resource)
  const initialEventId = getEventIdOf(resource)

  const [form, setForm] = useState({
    title: resource.title ?? '',
    subjectId: initialSubjectId != null ? String(initialSubjectId) : OTHER_SUBJECT,
    type: resource.type ?? 'PDF',
    description: resource.description ?? '',
    url: ownFile ? '' : resource.url ?? '',
  })
  const [lessonId, setLessonId] = useState(initialEventId != null ? String(initialEventId) : GENERAL_LESSON)
  const [file, setFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const selectedSubject = subjects.find((s) => isSameId(s.id, form.subjectId))
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const changeSubject = (e) => {
    const subjectId = e.target.value
    setForm((f) => ({ ...f, subjectId }))
    // A lesson belongs to its subject
    if (!isSameId(subjectId, initialSubjectId)) setLessonId(GENERAL_LESSON)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const title = form.title.trim()
    if (!title) return
    if (!ownFile && !/^https?:\/\/\S+$/i.test(form.url.trim())) {
      setSubmitError(t('resources:semesterLinks.errors.invalidUrl'))
      return
    }

    const fields = {
      title,
      description: form.description.trim() || null,
      type: form.type,
      subjectId: selectedSubject ? Number(selectedSubject.id) : null,
      eventId: selectedSubject && lessonId !== GENERAL_LESSON ? Number(lessonId) : null,
    }
    if (!ownFile) fields.url = form.url.trim()
    if (ownFile && file) fields.file = file

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await onSave(fields)
      onClose()
    } catch {
      setSubmitError(t('resources:materialActions.saveFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputCls = 'w-full px-3.5 py-2.5 bg-surface rounded-xl border border-outline-variant text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-colors disabled:opacity-60'
  const labelCls = 'text-xs font-semibold text-on-surface-variant'

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4" onClick={(e) => e.stopPropagation()}>
      <div role="dialog" aria-modal="true" aria-labelledby="edit-material-title" className="bg-surface rounded-2xl shadow-2xl border border-outline-variant w-full max-w-md max-h-[90vh] overflow-y-auto font-inter">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface">
          <h2 id="edit-material-title" className="text-lg font-semibold text-on-surface">{t('resources:materialActions.editTitle')}</h2>
          <button onClick={onClose} disabled={isSubmitting} aria-label={t('resources:modal.actions.cancel')} className="p-1 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface cursor-pointer bg-transparent border-0 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {submitError && (
            <div role="alert" className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-500">
              {submitError}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-material-name" className={labelCls}>{t('resources:modal.fields.resourceTitle')}</label>
            <input id="edit-material-name" required value={form.title} onChange={set('title')} disabled={isSubmitting} className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-material-subject" className={labelCls}>{t('resources:modal.fields.subject')}</label>
              <select id="edit-material-subject" value={form.subjectId} onChange={changeSubject} disabled={isSubmitting} className={inputCls}>
                {subjects.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                <option value={OTHER_SUBJECT}>{t('resources:otherSubject')}</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-material-type" className={labelCls}>{t('resources:modal.fields.documentType')}</label>
              <select id="edit-material-type" value={form.type} onChange={set('type')} disabled={isSubmitting} className={inputCls}>
                {TYPES.map((type) => <option key={type} value={type}>{t(`resources:typeLabels.${type}`)}</option>)}
              </select>
            </div>
          </div>

          {selectedSubject && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-material-lesson" className={labelCls}>{t('resources:lessons.field')}</label>
              <LessonSelect
                id="edit-material-lesson"
                value={lessonId}
                onChange={setLessonId}
                lessons={getSubjectLessons(events, selectedSubject.id)}
                semester={selectedSubject.semester}
                semesterStarts={semesterStarts}
                disabled={isSubmitting}
                className={inputCls}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-material-description" className={labelCls}>{t('resources:modal.fields.description')}</label>
            <textarea id="edit-material-description" rows={2} placeholder={t('resources:modal.placeholders.description')} value={form.description} onChange={set('description')} disabled={isSubmitting} className={`${inputCls} resize-none`} />
          </div>

          {ownFile ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-material-file" className={labelCls}>{t('resources:materialActions.replaceFile')}</label>
              <p className="text-xs text-on-surface-variant">
                {t('resources:materialActions.currentFile', { name: resource.file_name ?? resource.fileName ?? resource.title })}
              </p>
              <input
                id="edit-material-file"
                type="file"
                disabled={isSubmitting}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.jpg,.jpeg,.png,.gif,.svg,.webp,.mp4,.webm,.mov"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className={inputCls}
              />
              {file && <p className="text-xs text-on-surface-variant">{t('resources:materialActions.replaceFileNote')}</p>}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-material-url" className={labelCls}>{t('resources:modal.fields.webUrl')}</label>
              <input id="edit-material-url" type="url" required placeholder="https://" value={form.url} onChange={set('url')} disabled={isSubmitting} className={inputCls} />
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-outline-variant/60 mt-1">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 border border-outline-variant rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer bg-transparent disabled:opacity-50">{t('resources:modal.actions.cancel')}</button>
            <button
              type="submit"
              disabled={isSubmitting}
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

export default EditMaterialModal
