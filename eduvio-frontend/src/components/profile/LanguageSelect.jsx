import { useTranslation } from 'react-i18next'

// Each language is named in itself, so it can be found whatever the current language is
const LANGUAGES = [
  { code: 'cs', label: 'Čeština' },
  { code: 'en', label: 'English' },
]

/**
 * App language picker. i18n's LanguageDetector caches the choice in localStorage
 * (same as LanguageSwitcher), so it is remembered across visits.
 */
const LanguageSelect = ({ id }) => {
  const { i18n } = useTranslation()
  const active = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0]

  return (
    <select
      id={id}
      value={active}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className="w-full cursor-pointer bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
    >
      {LANGUAGES.map(({ code, label }) => (
        <option key={code} value={code} lang={code}>
          {label}
        </option>
      ))}
    </select>
  )
}

export default LanguageSelect
