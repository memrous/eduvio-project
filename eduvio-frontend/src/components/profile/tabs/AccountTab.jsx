import { useTranslation } from 'react-i18next'
import { UserRound } from 'lucide-react'
import LanguageSelect from '../LanguageSelect'

const AccountTab = ({ effectiveUser }) => {
  const { t } = useTranslation('profile')

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface p-6 space-y-6 shadow-ambient">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <UserRound className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-bold text-on-surface">{t('tabs.account', 'Osobní údaje')}</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">{t('overview.personalInfoDesc')}</p>
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
          <label className="block text-xs font-medium text-on-surface-variant" htmlFor="account-lang">
            {t('academic.appLanguage', 'Jazyk aplikace')}
          </label>
          <LanguageSelect id="account-lang" />
        </div>
      </div>
    </div>
  )
}

export default AccountTab
