import { useEffect, useId } from 'react'
import { X } from 'lucide-react'
import Icon from './Icon'

/**
 * Modal with a title and scrollable content ("O předmětu" in the subject detail,
 * agent setup in the profile). Closes on the backdrop, the X button and Escape.
 */
const InfoDialog = ({ open, onClose, title, eyebrow, closeLabel, children }) => {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[85vh] w-full max-w-2xl min-w-0 flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {eyebrow && <p className="font-mono text-xs font-bold text-primary">{eyebrow}</p>}
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-foreground"
          >
            <Icon icon={X} />
          </button>
        </div>
        <div className="mt-4 flex min-w-0 flex-col gap-5 overflow-y-auto pr-1">{children}</div>
      </div>
    </div>
  )
}

export default InfoDialog
