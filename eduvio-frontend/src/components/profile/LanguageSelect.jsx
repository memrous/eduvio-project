import { useTranslation } from 'react-i18next'
import Dropdown from '../common/Dropdown'

// Each language is named in itself, so it can be found whatever the current language is
const LANGUAGES = [
  { value: 'cs', label: 'Čeština', lang: 'cs' },
  { value: 'en', label: 'English', lang: 'en' },
]

/**
 * App language picker. i18n's LanguageDetector caches the choice in localStorage
 * (same as LanguageSwitcher), so it is remembered across visits.
 */
const LanguageSelect = ({ id }) => {
  const { i18n } = useTranslation()
  const active = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0]
  const activeLabel = LANGUAGES.find((lang) => lang.value === active)?.label ?? active

  return (
    <Dropdown
      id={id}
      label={activeLabel}
      options={LANGUAGES}
      value={active}
      onChange={(code) => i18n.changeLanguage(code)}
      fullWidth
    />
  )
}

export default LanguageSelect
