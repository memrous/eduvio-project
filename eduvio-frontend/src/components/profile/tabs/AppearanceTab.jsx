import { useTranslation } from 'react-i18next'
import { Moon, Palette, Sun } from 'lucide-react'
import { useTheme } from '../../../context/ThemeContext'
import LanguageSelect from '../LanguageSelect'

const THEMES = [
  { id: 'light', icon: Sun },
  { id: 'dark', icon: Moon },
]

/** Theme and app language; on mobile the only place to change them (no header toggles there). */
const AppearanceTab = () => {
  const { t } = useTranslation('profile')
  const { theme, setTheme } = useTheme()

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface p-6 space-y-6 shadow-ambient">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Palette className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-bold text-on-surface">{t('tabs.appearance')}</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">{t('appearance.subtitle')}</p>
        </div>
      </div>

      <div className="divide-y divide-outline-variant/60">
        {/* Theme */}
        <div className="pb-4 flex flex-col @xl:flex-row @xl:items-center justify-between gap-3">
          <div>
            <strong className="block text-sm font-semibold text-on-surface">{t('appearance.theme.title')}</strong>
            <p className="text-xs text-on-surface-variant mt-0.5">{t('appearance.theme.subtitle')}</p>
          </div>
          <div role="radiogroup" aria-label={t('appearance.theme.title')} className="inline-flex shrink-0 rounded-xl border border-outline-variant bg-surface-container-low p-1">
            {THEMES.map(({ id, icon: ThemeIcon }) => {
              const isActive = theme === id
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setTheme(id)}
                  className={`cursor-pointer inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-surface text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <ThemeIcon className="w-4 h-4" />
                  {t(`appearance.theme.${id}`)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Language */}
        <div className="pt-4 flex flex-col @xl:flex-row @xl:items-center justify-between gap-3">
          <div>
            <label htmlFor="appearance-lang" className="block text-sm font-semibold text-on-surface">
              {t('appearance.language.title')}
            </label>
            <p className="text-xs text-on-surface-variant mt-0.5">{t('appearance.language.subtitle')}</p>
          </div>
          <div className="w-full @xl:w-56 shrink-0">
            <LanguageSelect id="appearance-lang" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AppearanceTab
