/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// ── Types ─────────────────────────────────────────────────────────
// variant: 'success' | 'error' | 'info'
// { id: string, variant: string, message: string }

const ToastContext = createContext(null)

const AUTO_DISMISS_MS = 4000

const VARIANT_STYLES = {
  success: {
    container:
      'bg-success-container border-success/30 text-on-success-container',
    icon:
      'text-success',
    bar:
      'bg-success-soft',
    Icon: CheckCircle2,
  },

  error: {
    container:
      'bg-error-container border-error/30 text-on-error-container',
    icon:
      'text-error',
    bar:
      'bg-error',
    Icon: XCircle,
  },

  info: {
    container:
      'bg-primary-container border-primary/30 text-on-primary-container',
    icon:
      'text-primary',
    bar:
      'bg-primary',
    Icon: Info,
  },
}

// ── Single Toast card ─────────────────────────────────────────────
const ToastCard = ({ id, variant, message, onDismiss }) => {
  const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.info
  const { Icon } = styles
  const { t } = useTranslation('common')

  return (
    <div
      className={`
        relative flex items-start gap-3 w-80 max-w-[calc(100vw-2rem)]
        rounded-xl border shadow-lg px-4 py-3.5 font-inter overflow-hidden
        ${styles.container}
        animate-in slide-in-from-right-full fade-in duration-300
      `}
      role="alert"
      aria-live="polite"
    >
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-[3px] ${styles.bar} rounded-b-xl`}
        style={{ animation: `eduvio-toast-shrink ${AUTO_DISMISS_MS}ms linear forwards` }}
      />

      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${styles.icon}`} />

      <p className="flex-1 text-sm font-medium leading-snug">{message}</p>

      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 -mt-0.5 -mr-1 p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
        aria-label={t('common:toast.dismiss')}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── Provider ──────────────────────────────────────────────────────
export const ToastProvider = ({ children }) => {
  const { t: translate } = useTranslation('common')
  const [toasts, setToasts] = useState([])
  const counterRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((variant, message) => {
    const id = `toast-${++counterRef.current}`
    setToasts((prev) => [...prev, { id, variant, message }])
    setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
  }, [dismiss])

  const toast = {
    success: (msg) => addToast('success', msg),
    error:   (msg) => addToast('error',   msg),
    info:    (msg) => addToast('info',    msg),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Fixed container — bottom-right on desktop, bottom-center on mobile */}
      <div
        aria-label={translate('common:toast.container')}
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastCard
              id={t.id}
              variant={t.variant}
              message={t.message}
              onDismiss={dismiss}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────
export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}