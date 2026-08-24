import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getEventStyle } from './useCalendarState'
import CustomIcon from '../CustomIcon'
import { getLocaleFromLanguage } from '../../utils/locale'

const EventDetailContent = ({
  selectedDetailEvent,
  currentSubjects,
  onClose,
  onOpenSubject,
  onEditClick,
  onDeleteEvent,
  deleteConfirmId,
  setDeleteConfirmId,
}) => {
  const { t, i18n } = useTranslation(['academic', 'dashboard'])
  if (!selectedDetailEvent) return null

  const targetSubject = currentSubjects.find(s => s.id === selectedDetailEvent.subjectId)
  const styleObj = getEventStyle(selectedDetailEvent.type)
  const locale = getLocaleFromLanguage(i18n.language)
  const completionLabel = (() => {
    switch (targetSubject?.completionType) {
      case 'Credit':
        return t('academic:subjectsView.options.credit')
      case 'Exam':
        return t('academic:subjectsView.options.exam')
      case 'Credit + Exam':
        return t('academic:subjectsView.options.creditPlusExam')
      default:
        return targetSubject?.completionType
    }
  })()

  return (
    <div className="flex flex-col gap-4 font-inter">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          {t('academic:eventDetail.title', 'Detail události')}
        </h2>
        <button 
          onClick={onClose}
          className="p-1 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer rounded-full hover:bg-surface-container-low"
          aria-label={t('academic:eventDetail.closeButton')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <span className="h-1 w-12 rounded-full shrink-0" style={{ backgroundColor: styleObj.dot }} />

      <div>
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: styleObj.dot }}>
          {selectedDetailEvent.code} · {t(`dashboard:timetable.eventTypes.${selectedDetailEvent.type}`, selectedDetailEvent.type)}
        </p>
        <h3 className="text-lg font-bold text-on-surface leading-tight mt-1">
          {selectedDetailEvent.title}
        </h3>
        <p className="text-sm font-semibold text-primary mt-1">
          {targetSubject ? targetSubject.name : t('academic:eventDetail.unknownSubject')}
        </p>
      </div>

      <dl className="flex flex-col gap-3.5 text-sm border-t border-outline-variant/30 pt-4 mt-2">
        <div className="flex items-start gap-3">
          <CustomIcon name="calendar" className="mt-0.5 size-4 shrink-0 text-on-surface-variant" />
          <div className="min-w-0">
            <span className="block text-xs text-on-surface-variant font-medium">{t('academic:eventModal.fields.date', 'Datum')}</span>
            <span className="font-semibold text-on-surface">
              {new Date(selectedDetailEvent.date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <CustomIcon name="clock" className="mt-0.5 size-4 shrink-0 text-on-surface-variant" />
          <div className="min-w-0">
            <span className="block text-xs text-on-surface-variant font-medium">{t('academic:eventModal.fields.startTime', 'Čas')}</span>
            <span className="font-semibold text-on-surface">
              {selectedDetailEvent.startTime} {selectedDetailEvent.endTime && `– ${selectedDetailEvent.endTime}`}
            </span>
          </div>
        </div>
        {targetSubject && (
          <>
            <div className="flex items-start gap-3">
              <CustomIcon name="user" className="mt-0.5 size-4 shrink-0 text-on-surface-variant" />
              <div className="min-w-0">
                <span className="block text-xs text-on-surface-variant font-medium">{t('academic:eventDetail.lecturer', 'Vyučující')}</span>
                <span className="font-semibold text-on-surface">
                  {targetSubject.lecturer || t('academic:eventDetail.notSpecified')}
                </span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CustomIcon name="graduation-cap" className="mt-0.5 size-4 shrink-0 text-on-surface-variant" />
              <div className="min-w-0">
                <span className="block text-xs text-on-surface-variant font-medium">{t('academic:eventDetail.creditsCompletion', 'Ukončení')}</span>
                <span className="font-semibold text-on-surface">
                  {targetSubject.credits} STAG ({completionLabel})
                </span>
              </div>
            </div>
          </>
        )}
      </dl>

      {targetSubject && targetSubject.description && (
        <div className="flex flex-col gap-1.5 mt-2 bg-surface-container-low/40 p-3 rounded-lg border border-outline-variant/50">
          <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wide">
            {t('academic:eventDetail.subjectDescription')}
          </span>
          <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-4">
            {targetSubject.description}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-outline-variant/30">
        <button
          onClick={() => {
            if (targetSubject && onOpenSubject) {
              onOpenSubject(targetSubject.id)
            }
            onClose()
          }}
          className="w-full bg-primary hover:bg-primary/95 text-primary-foreground py-2 rounded-lg font-semibold text-sm transition-colors shadow-sm cursor-pointer text-center"
        >
          {t('academic:eventDetail.openSubjectHub')}
        </button>
        
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onEditClick}
            className="border border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low text-on-surface-variant font-semibold py-2 rounded-lg text-sm transition-colors cursor-pointer text-center"
          >
            {t('academic:eventDetail.editEvent')}
          </button>

          {deleteConfirmId === selectedDetailEvent.id ? (
            <button
              type="button"
              onClick={() => {
                if (onDeleteEvent) {
                  onDeleteEvent(selectedDetailEvent.id)
                }
                onClose()
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg text-sm transition-all cursor-pointer shadow-sm animate-pulse text-center"
            >
              {t('academic:eventDetail.areYouSure')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setDeleteConfirmId(selectedDetailEvent.id)}
              className="border border-red-200 text-red-600 hover:bg-red-50/50 font-semibold py-2 rounded-lg text-sm transition-colors cursor-pointer text-center"
            >
              {t('academic:eventDetail.deleteEvent')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default EventDetailContent
