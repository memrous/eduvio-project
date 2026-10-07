import { useTranslation } from 'react-i18next'
import { ShieldCheck, KeyRound, LogOut } from 'lucide-react'

// Password change and signing out other devices need backend endpoints (next step)
const ComingSoon = () => {
  const { t } = useTranslation('profile')
  return (
    <span className="rounded-full bg-surface-container px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
      {t('security.comingSoon')}
    </span>
  )
}

const SecurityTab = () => {
  const { t } = useTranslation('profile')

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface p-6 space-y-6 shadow-ambient">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-bold text-on-surface">{t('tabs.security')}</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">{t('security.subtitle')}</p>
        </div>
      </div>

      <div className="divide-y divide-outline-variant/60">
        {/* Password */}
        <div className="pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <strong className="block text-sm font-semibold text-on-surface">{t('security.password.title')}</strong>
            <p className="text-xs text-on-surface-variant mt-0.5">{t('security.password.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ComingSoon />
            <button
              type="button"
              disabled
              className="cursor-not-allowed opacity-60 inline-flex items-center gap-1.5 bg-surface-container-low border border-outline-variant text-on-surface-variant text-xs font-semibold px-3.5 py-2 rounded-xl"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{t('security.password.action')}</span>
            </button>
          </div>
        </div>

        {/* Sessions */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <strong className="block text-sm font-semibold text-on-surface">{t('security.sessions.title')}</strong>
            <p className="text-xs text-on-surface-variant mt-0.5">{t('security.sessions.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ComingSoon />
            <button
              type="button"
              disabled
              className="cursor-not-allowed opacity-60 inline-flex items-center gap-1.5 bg-surface-container-low border border-outline-variant text-on-surface-variant text-xs font-semibold px-3.5 py-2 rounded-xl"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('security.sessions.action')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SecurityTab
