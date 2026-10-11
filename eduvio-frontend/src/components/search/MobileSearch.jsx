import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'
import Icon from '../common/Icon'
import GlobalSearch from './GlobalSearch'
import { useSearchShortcut } from './searchShortcut'

/**
 * Magnifier button for the mobile header. Opens the same search as the
 * desktop header in a full-width panel at the top of the screen.
 */
const MobileSearch = () => {
  const { t } = useTranslation('common')
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef(null)

  const close = () => {
    setIsOpen(false)
    buttonRef.current?.focus()
  }

  useSearchShortcut(buttonRef, () => setIsOpen(true), !isOpen)

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={t('search.open')}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="flex size-9 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
      >
        <Icon icon={Search} size="md" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-scrim/40" onClick={close} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('search.label')}
            // Esc in the field is handled there first (closes the list, then clears)
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !event.defaultPrevented) close()
            }}
            className="relative border-b border-outline-variant bg-surface p-3 shadow-lg font-inter"
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <GlobalSearch variant="mobile" autoFocus onDone={close} />
              </div>
              <button
                type="button"
                onClick={close}
                aria-label={t('search.close')}
                className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
              >
                <Icon icon={X} size="md" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MobileSearch
