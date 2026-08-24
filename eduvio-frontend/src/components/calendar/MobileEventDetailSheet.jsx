import { useState, useEffect } from 'react'
import EventDetailContent from './EventDetailContent'

const MobileEventDetailSheet = ({
  selectedDetailEvent,
  currentSubjects,
  onClose,
  onOpenSubject,
  onEditClick,
  onDeleteEvent,
  deleteConfirmId,
  setDeleteConfirmId,
}) => {
  const [sheetVisible, setSheetVisible] = useState(false)
  const [closingEvent, setClosingEvent] = useState(null)

  useEffect(() => {
    if (selectedDetailEvent) {
      setClosingEvent(selectedDetailEvent)
      requestAnimationFrame(() => setSheetVisible(true))
    } else if (closingEvent) {
      setSheetVisible(false)
      const timer = setTimeout(() => setClosingEvent(null), 300)
      return () => clearTimeout(timer)
    }
  }, [selectedDetailEvent])

  if (!closingEvent) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop overlay */}
      <div 
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ${
          sheetVisible ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {/* Sheet container */}
      <div 
        role="dialog"
        aria-modal="true"
        className={`absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-outline-variant bg-surface-container-lowest shadow-2xl transition-transform duration-300 ease-out p-5 pb-6 ${
          sheetVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Drag handle line */}
        <div className="sticky top-0 flex justify-center bg-surface-container-lowest pt-1 pb-3">
          <span className="h-1.5 w-10 rounded-full bg-outline-variant/60" />
        </div>
        
        <EventDetailContent
          selectedDetailEvent={closingEvent}
          currentSubjects={currentSubjects}
          onClose={onClose}
          onOpenSubject={onOpenSubject}
          onEditClick={onEditClick}
          onDeleteEvent={onDeleteEvent}
          deleteConfirmId={deleteConfirmId}
          setDeleteConfirmId={setDeleteConfirmId}
        />
      </div>
    </div>
  )
}

export default MobileEventDetailSheet
