import { AlertCircle, Inbox, Loader2 } from 'lucide-react'

const VARIANTS = {
  loading: {
    icon: Loader2,
    iconClassName: 'animate-spin text-primary',
  },
  error: {
    icon: AlertCircle,
    iconClassName: 'text-error',
  },
  empty: {
    icon: Inbox,
    iconClassName: 'text-on-surface-variant',
  },
}

const PageState = ({ variant = 'loading', title, description, actionLabel, onAction }) => {
  const state = VARIANTS[variant] || VARIANTS.loading
  const Icon = state.icon

  return (
    <div className="min-h-[320px] flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-surface border border-outline-variant rounded-xl shadow-ambient p-8 text-center flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center">
          <Icon className={`w-6 h-6 ${state.iconClassName}`} />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-headline-md font-semibold text-on-surface">{title}</h1>
          {description ? (
            <p className="text-body-md text-on-surface-variant">{description}</p>
          ) : null}
        </div>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-primary text-on-primary text-label-md font-semibold hover:bg-primary-container transition-colors"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default PageState
