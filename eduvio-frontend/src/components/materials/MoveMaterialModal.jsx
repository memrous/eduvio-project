import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, X } from 'lucide-react'
import LessonSelect from './LessonSelect'
import { GENERAL_LESSON, getSubjectLessons } from '../../utils/lessons'
import { getEventIdOf } from '../../utils/ids'

// ─── Move Material Modal (assign to a lesson / week, or general) ─
const MoveMaterialModal = ({ resource, subject, events, semesterStarts, onClose, onSave }) => {
  const { t } = useTranslation('resources')
  const currentEventId = getEventIdOf(resource)
  const [lessonId, setLessonId] = useState(currentEventId != null ? String(currentEventId) : GENERAL_LESSON)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await onSave(lessonId === GENERAL_LESSON ? null : Number(lessonId))
      onClose()
    } catch {
      setSubmitError(t('resources:lessons.moveFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputCls = 'w-full px-3.5 py-2.5 bg-surface rounded-xl border border-outline-variant text-sm text-on-surface focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-colors disabled:opacity-60'

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="move-material-title" className="bg-surface rounded-2xl shadow-2xl border border-outline-variant w-full max-w-md overflow-hidden font-inter">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface">
          <h2 id="move-material-title" className="text-lg font-semibold text-on-surface">{t('resources:lessons.moveTitle')}</h2>
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

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-on-surface">{resource.title}</p>
            <p className="text-xs text-on-surface-variant">{subject.name}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="move-lesson" className="text-xs font-semibold text-on-surface-variant">{t('resources:lessons.field')}</label>
            <LessonSelect
              id="move-lesson"
              value={lessonId}
              onChange={setLessonId}
              lessons={getSubjectLessons(events, subject.id)}
              semester={subject.semester}
              semesterStarts={semesterStarts}
              disabled={isSubmitting}
              className={inputCls}
            />
            {resource.moodle_cmid != null && (
              <p className="text-xs text-on-surface-variant">{t('resources:lessons.moodleNote')}</p>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-outline-variant/60 mt-1">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 border border-outline-variant rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer bg-transparent disabled:opacity-50">{t('resources:modal.actions.cancel')}</button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-sm font-semibold shadow-sm transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {t('resources:lessons.moveSave')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default MoveMaterialModal
