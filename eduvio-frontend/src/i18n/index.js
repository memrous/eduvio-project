import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enCommon from './locales/en/common.json'
import csCommon from './locales/cs/common.json'
import enAuth from './locales/en/auth.json'
import csAuth from './locales/cs/auth.json'
import enDashboard from './locales/en/dashboard.json'
import csDashboard from './locales/cs/dashboard.json'
import enAcademic from './locales/en/academic.json'
import csAcademic from './locales/cs/academic.json'
import enResources from './locales/en/resources.json'
import csResources from './locales/cs/resources.json'
import enProfile from './locales/en/profile.json'
import csProfile from './locales/cs/profile.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        auth: enAuth,
        dashboard: enDashboard,
        academic: enAcademic,
        resources: enResources,
        profile: enProfile,
      },
      cs: {
        common: csCommon,
        auth: csAuth,
        dashboard: csDashboard,
        academic: csAcademic,
        resources: csResources,
        profile: csProfile,
      },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'cs'],
    ns: ['common', 'auth', 'dashboard', 'academic', 'resources', 'profile'],
    defaultNS: 'common',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
