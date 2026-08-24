// MOCK: bez backendu
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'

const NotificationsTab = () => {
  const { t } = useTranslation('profile')
  const [emailNews, setEmailNews] = useState(true)
  const [moodleSyncNotif, setMoodleSyncNotif] = useState(true)
  const [calendarAlerts, setCalendarAlerts] = useState(false)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-outline-variant bg-surface p-6 space-y-6 shadow-ambient">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-on-surface">{t('notifications.title', 'Oznámení')}</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">{t('notifications.subtitle', 'Vyberte, o čem chcete být informováni.')}</p>
          </div>
        </div>

        <div className="divide-y divide-outline-variant/60">
          {/* Email news */}
          <div className="py-4 first:pt-0 flex items-center justify-between gap-4">
            <div>
              <strong className="block text-sm font-semibold text-on-surface">{t('notifications.emailNews.title', 'Novinky e-mailem')}</strong>
              <p className="text-xs text-on-surface-variant mt-0.5">{t('notifications.emailNews.subtitle', 'Důležité informace o účtu a studiu.')}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={emailNews}
              onClick={() => setEmailNews((prev) => !prev)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                emailNews ? 'bg-primary' : 'bg-surface-container-highest'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  emailNews ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Moodle sync */}
          <div className="py-4 flex items-center justify-between gap-4">
            <div>
              <strong className="block text-sm font-semibold text-on-surface">{t('notifications.moodleSync.title', 'Synchronizace Moodlu')}</strong>
              <p className="text-xs text-on-surface-variant mt-0.5">{t('notifications.moodleSync.subtitle', 'Upozornění na nové úkoly a změny termínů.')}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={moodleSyncNotif}
              onClick={() => setMoodleSyncNotif((prev) => !prev)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                moodleSyncNotif ? 'bg-primary' : 'bg-surface-container-highest'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  moodleSyncNotif ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Calendar */}
          <div className="py-4 flex items-center justify-between gap-4">
            <div>
              <strong className="block text-sm font-semibold text-on-surface">{t('notifications.calendarAlerts.title', 'Kalendář')}</strong>
              <p className="text-xs text-on-surface-variant mt-0.5">{t('notifications.calendarAlerts.subtitle', 'Nové události přidané do vašeho rozvrhu.')}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={calendarAlerts}
              onClick={() => setCalendarAlerts((prev) => !prev)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                calendarAlerts ? 'bg-primary' : 'bg-surface-container-highest'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  calendarAlerts ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotificationsTab
