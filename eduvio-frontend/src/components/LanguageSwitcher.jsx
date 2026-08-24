import { useTranslation } from 'react-i18next'

import czFlag from '../assets/flags/cz.png'
import enFlag from '../assets/flags/en.png'

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation()

  const activeLanguage = (i18n.language || 'en').split('-')[0]

  const getButtonClassName = (languageCode) => {
    const isActive = activeLanguage === languageCode

    return [
      'inline-flex items-center justify-center overflow-hidden transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface cursor-pointer',
      isActive ? 'opacity-100' : 'opacity-50 hover:opacity-100',
    ].join(' ')
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => i18n.changeLanguage('cs')}
        className={getButtonClassName('cs')}
        aria-pressed={activeLanguage === 'cs'}
        aria-label={t('language.czech')}
        title={t('language.czech')}
      >
        <img src={czFlag} alt={t('language.czech')} className="w-6 h-6 object-cover" />
      </button>
      <button
        type="button"
        onClick={() => i18n.changeLanguage('en')}
        className={getButtonClassName('en')}
        aria-pressed={activeLanguage === 'en'}
        aria-label={t('language.english')}
        title={t('language.english')}
      >
        <img src={enFlag} alt={t('language.english')} className="w-6 h-6 object-cover" />
      </button>
    </div>
  )
}

export default LanguageSwitcher
