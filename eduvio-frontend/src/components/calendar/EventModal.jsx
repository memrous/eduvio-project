
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getSubjectColor } from '../../utils/subjectColors'

const EventModal = ({
  isOpen,
  onClose,
  onSubmit,
  SUBJECTS,
  editingEventId,
  newTitle,
  setNewTitle,
  newType,
  setNewType,
  newSubject,
  setNewSubject,
  newDate,
  setNewDate,
  newTime,
  setNewTime,
  newDuration,
  setNewDuration,
}) => {
  const { t } = useTranslation(['academic', 'dashboard'])
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-opacity animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant w-full max-w-md overflow-hidden relative font-inter animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low/20">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-on-surface-variant">
            {editingEventId ? t('academic:eventModal.editTitle') : t('academic:eventModal.createTitle')}
          </h2>
          <button 
            onClick={onClose}
            className="p-1 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer rounded-full hover:bg-surface-container-low"
            aria-label={t('academic:eventModal.closeButton')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 flex flex-col gap-4">
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">{t('academic:eventModal.fields.eventTitle')}</label>
            <input 
              type="text" 
              required
              placeholder={t('academic:eventModal.placeholders.eventTitle')} 
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-lowest rounded-lg border border-outline-variant text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">{t('academic:eventModal.fields.type')}</label>
            <select 
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-lowest rounded-lg border border-outline-variant text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            >
              <option value="Lecture">{t('dashboard:timetable.eventTypes.Lecture')}</option>
              <option value="Lab">{t('dashboard:timetable.eventTypes.Lab')}</option>
              <option value="Exam">{t('dashboard:timetable.eventTypes.Exam')}</option>
              <option value="Deadline">{t('dashboard:timetable.eventTypes.Deadline')}</option>
              <option value="Quiz">{t('dashboard:timetable.eventTypes.Quiz')}</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">{t('academic:eventModal.fields.subject')}</label>
            <div className="grid grid-cols-2 gap-2">
              {SUBJECTS.map(subj => {
                const isSelected = newSubject === subj.name
                const colorObj = getSubjectColor(subj)
                let dotColor = '#737686'
                if (colorObj.bg === 'bg-primary-container') dotColor = '#1e64ef'
                else if (colorObj.bg === 'bg-secondary-container') dotColor = '#505f76'
                else if (colorObj.bg === 'bg-tertiary-container') dotColor = '#943700'
                else if (colorObj.bg === 'bg-success-container') dotColor = '#35c26d'
                else if (colorObj.bg === 'bg-warning-container') dotColor = '#d97706'
                else if (colorObj.bg === 'bg-error-container') dotColor = '#ba1a1a'

                return (
                  <button
                    key={subj.id}
                    type="button"
                    onClick={() => setNewSubject(subj.name)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs font-semibold transition-all cursor-pointer ${
                      isSelected 
                        ? `bg-primary/10 border-primary text-primary ring-1 ring-primary/25` 
                        : 'bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:bg-surface-container-low/50'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                    <span className="truncate">{subj.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">{t('academic:eventModal.fields.date')}</label>
              <input 
                type="date" 
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-lowest rounded-lg border border-outline-variant text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">{t('academic:eventModal.fields.startTime')}</label>
              <input 
                type="time" 
                required
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-lowest rounded-lg border border-outline-variant text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wide">{t('academic:eventModal.fields.duration')}</label>
            <select 
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-lowest rounded-lg border border-outline-variant text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            >
              <option value="30">{t('academic:eventModal.durationOptions.30')}</option>
              <option value="60">{t('academic:eventModal.durationOptions.60')}</option>
              <option value="90">{t('academic:eventModal.durationOptions.90')}</option>
              <option value="120">{t('academic:eventModal.durationOptions.120')}</option>
              <option value="180">{t('academic:eventModal.durationOptions.180')}</option>
              <option value="0">{t('academic:eventModal.durationOptions.0')}</option>
            </select>
          </div>

          <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-outline-variant/30">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low/50 text-sm font-semibold text-on-surface-variant rounded-lg transition-colors cursor-pointer"
            >
              {t('academic:eventModal.actions.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {t('academic:eventModal.actions.save')}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

export default EventModal
