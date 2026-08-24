// MOCK: bez backendu, needitovatelné
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, KeyRound } from 'lucide-react'

const SecurityTab = () => {
  const { t } = useTranslation('profile')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-outline-variant bg-surface p-6 space-y-6 shadow-ambient">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-on-surface">{t('security.twoFactor.title', 'Zabezpečení')}</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">{t('security.twoFactor.subtitle', 'Spravujte přístup a ochranu svého účtu.')}</p>
          </div>
        </div>

        <div className="divide-y divide-outline-variant/60">
          {/* 2FA Row */}
          <div className="py-4 first:pt-0 flex items-center justify-between gap-4">
            <div>
              <strong className="block text-sm font-semibold text-on-surface">{t('overview.twoFactor', 'Dvoufázové ověření')}</strong>
              <p className="text-xs text-on-surface-variant mt-0.5">{t('security.twoFactor.subtitle', 'Ověření pomocí školní aplikace při každém novém přihlášení.')}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={twoFactorEnabled}
              onClick={() => setTwoFactorEnabled((prev) => !prev)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                twoFactorEnabled ? 'bg-primary' : 'bg-surface-container-highest'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Password Row */}
          <div className="py-4 flex items-center justify-between gap-4">
            <div>
              <strong className="block text-sm font-semibold text-on-surface">{t('security.password.title', 'Heslo')}</strong>
              <p className="text-xs text-on-surface-variant mt-0.5">{t('overview.passwordDesc', 'Naposledy změněno před 3 měsíci.')}</p>
            </div>
            <button
              type="button"
              disabled
              className="cursor-not-allowed inline-flex items-center gap-1.5 bg-surface-container-low border border-outline-variant text-on-surface-variant text-xs font-semibold px-3.5 py-2 rounded-xl"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{t('security.password.action', 'Změnit heslo')}</span>
            </button>
          </div>

          {/* Danger Zone */}
          <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <strong className="block text-sm font-semibold text-error">{t('security.sessions.title', 'Odhlásit všechna zařízení')}</strong>
              <p className="text-xs text-on-surface-variant mt-0.5">{t('security.sessions.subtitle', 'Ukončí všechna aktivní přihlášení k vašemu účtu.')}</p>
            </div>
            <button
              type="button"
              onClick={() => {}}
              className="cursor-pointer inline-flex items-center justify-center gap-1.5 bg-error-container/20 border border-error-container text-error hover:bg-error-container/30 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all"
            >
              <span>{t('security.sessions.action', 'Odhlásit zařízení')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SecurityTab
