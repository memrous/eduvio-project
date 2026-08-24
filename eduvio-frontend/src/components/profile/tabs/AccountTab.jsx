// Telefon a jazyk: placeholder, chybí v API
import { useTranslation } from 'react-i18next'
import { Info, UserRound } from 'lucide-react'

const AccountTab = ({ effectiveUser }) => {
  const { t } = useTranslation('profile')

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/10 p-4 text-on-surface">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-on-surface">
            {t('academic.infoBanner', 'Pro změnu osobních údajů kontaktujte studijní oddělení.')}
          </p>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {t('academic.infoBannerSub', 'Osobní identifikační údaje jsou synchronizovány s centrální univerzitní databází a nelze je upravovat přímo v aplikaci.')}
          </p>
        </div>
      </div>

      {/* Account Details Panel */}
      <div className="rounded-2xl border border-outline-variant bg-surface p-6 space-y-6 shadow-ambient">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <UserRound className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-on-surface">{t('tabs.account', 'Osobní údaje')}</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {t('overview.personalInfoDesc', 'Údaje synchronizované ze STAGu lze upravit pouze v univerzitním systému.')}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-on-surface-variant" htmlFor="account-name">
              {t('stag.labels.username', 'Jméno a příjmení')}
            </label>
            <input
              id="account-name"
              type="text"
              readOnly
              value={effectiveUser?.name || effectiveUser?.username || ''}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-sm text-on-surface outline-none cursor-default"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-on-surface-variant" htmlFor="account-email">
              E-mail
            </label>
            <input
              id="account-email"
              type="email"
              readOnly
              value={effectiveUser?.email || ''}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-sm text-on-surface outline-none cursor-default"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-on-surface-variant" htmlFor="account-phone">
              {t('academic.phone', 'Telefon')}
            </label>
            <input
              id="account-phone"
              type="text"
              readOnly
              value={t('academic.defaults.phone', '+420 777 123 456')}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-sm text-on-surface outline-none cursor-default"
            />
            <small className="block text-[11px] text-on-surface-variant/80">{t('overview.phoneHint', 'Viditelné pouze vám')}</small>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-on-surface-variant" htmlFor="account-lang">
              {t('academic.appLanguage', 'Jazyk aplikace')}
            </label>
            <input
              id="account-lang"
              type="text"
              readOnly
              value={t('academic.defaults.appLanguage', 'Čeština')}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-sm text-on-surface outline-none cursor-default"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountTab
