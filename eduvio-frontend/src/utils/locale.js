export const getLocaleFromLanguage = (language) => (
  language?.startsWith('cs') ? 'cs-CZ' : 'en-US'
)
