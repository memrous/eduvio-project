import { ProfileSkeleton } from './common/Skeleton'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Check,
  ChevronRight,
  Copy,
  GraduationCap,
  LockKeyhole,
  RefreshCw,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import AccountTab from './profile/tabs/AccountTab'
import SecurityTab from './profile/tabs/SecurityTab'
import StagIntegrationCard from './profile/StagIntegrationCard'
import MoodleIntegrationCard from './profile/MoodleIntegrationCard'
import LanguageSelect from './profile/LanguageSelect'
import ProfileStudyCard from './profile/ProfileStudyCard'
import ProfileStudyOfficeCard from './profile/ProfileStudyOfficeCard'
import ProfileProgressCard from './profile/ProfileProgressCard'
import { getLocaleFromLanguage } from '../utils/locale'
import { formatDateTime, formatRelativeTime } from '../utils/relativeTime'
import { isMoodleLaunchPending } from '../utils/moodleLaunch'

// Version from package.json, injected by vite.config.js
const APP_VERSION = import.meta.env.APP_VERSION

const Profile = ({ user: initialUser }) => {
  const { t, i18n } = useTranslation('profile')
  const navigate = useNavigate()
  const location = useLocation()
  const { refreshUser } = useAuth()
  const toast = useToast()
  const [user, setUser] = useState(initialUser ?? null)
  const [isFetching] = useState(!initialUser)
  const [activeTab, setActiveTab] = useState(() => {
    // After registration AuthContext opens the tab with the STAG and Moodle cards
    if (location.state?.profileTab === 'account') return 'account'
    // Back from Moodle without the callback: the Moodle card offers the manual paste
    if (!initialUser?.moodle_connected && isMoodleLaunchPending()) return 'account'
    const params = new URLSearchParams(window.location.search)
    return params.get('stag') || params.get('moodle') ? 'account' : 'overview'
  })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true

    const loadUser = async () => {
      const refreshed = await refreshUser()
      if (!active) return

      if (refreshed) {
        setUser(refreshed)
      }
    }

    loadUser()

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const stag = params.get('stag')
    const reason = params.get('reason')

    if (!stag) return

    if (stag === 'connected') {
      toast.success(t('stag.syncing.background'))
    } else if (stag === 'error') {
      const errorMessages = {
        state_invalid: 'Platnost přihlašovací relace vypršela. Zkuste to prosím znovu.',
        cancelled: 'Přihlášení ke STAGu bylo zrušeno.',
        no_student_role: 'K tomuto STAG účtu nebyla nalezena role studenta.',
        unexpected: t('toast.connectFailed'),
      }
      toast.error(errorMessages[reason] || t('toast.connectFailed'))
    }

    navigate('/profile', { replace: true })
  }, [navigate, t, toast])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const moodle = params.get('moodle')
    const reason = params.get('reason')

    if (!moodle) return

    if (moodle === 'connected') {
      refreshUser().then((refreshed) => {
        if (refreshed) setUser(refreshed)
      })
      toast.success(t('moodle.syncing.background'))
    } else if (moodle === 'error') {
      const errorMessages = {
        missing_token: t('moodle.errors.missingToken', 'Chybí ověřovací token z Moodlu.'),
        decode_failed: t('moodle.errors.decodeFailed', 'Nepodařilo se zpracovat token z Moodlu.'),
        token_rejected: t('moodle.errors.tokenRejected', 'Ověřovací token byl systémem Moodle odmítnut.'),
        launch_not_started: t('moodle.errors.launchNotStarted'),
        invalid_signature: t('moodle.errors.invalidSignature'),
      }
      toast.error(errorMessages[reason] || t('toast.moodleConnectFailed'))
    }

    navigate('/profile', { replace: true })
  }, [navigate, refreshUser, t, toast])

  const effectiveUser = user ?? initialUser
  const isStagConnected = Boolean(effectiveUser?.stag_connected)
  const isMoodleConnected = Boolean(effectiveUser?.moodle_connected)
  const studentId = effectiveUser?.stag_student_id || null

  const copyId = async () => {
    if (!studentId) return
    await navigator.clipboard?.writeText(studentId)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  if (isFetching && !effectiveUser) {
    return <ProfileSkeleton />
  }

  if (!effectiveUser) {
    return (
      <div className="max-w-2xl mx-auto rounded-2xl border border-outline-variant bg-surface-container-low p-6 text-on-surface">
        <p className="font-semibold text-on-surface">{t('unavailable.title')}</p>
        <p className="mt-1 text-sm text-on-surface-variant">{t('unavailable.hint')}</p>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: t('tabs.overview', 'Přehled'), icon: UserRound },
    { id: 'account', label: t('tabs.account', 'Osobní údaje'), icon: SlidersHorizontal },
    { id: 'security', label: t('tabs.security', 'Zabezpečení'), icon: LockKeyhole },
  ]

  const displayName = effectiveUser.name || effectiveUser.username || effectiveUser.email || ''
  const userInitials = displayName
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  // Last sync: the newer of STAG and Moodle; pulsing dot only while a sync is running
  const locale = getLocaleFromLanguage(i18n.language)
  const lastSyncedAt = [effectiveUser.stag_synced_at, effectiveUser.moodle_synced_at]
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))[0] ?? null
  const isSyncPending = effectiveUser.stag_sync_status === 'pending' || effectiveUser.moodle_sync_status === 'pending'

  const integrations = [
    { id: 'stag', name: t('overview.stag'), description: t('overview.stagDesc'), connected: isStagConnected },
    { id: 'moodle', name: t('overview.moodle'), description: t('overview.moodleDesc'), connected: isMoodleConnected },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 lg:gap-8 items-start">
        {/* ================= LEFT SIDEBAR (Side Cards) ================= */}
        <aside className="flex flex-col gap-5 w-full min-w-0">
          {/* Card 1: Identity Card */}
          <section className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-ambient">
            <div className="w-16 h-16 rounded-full bg-surface-container-high border-2 border-outline-variant text-on-surface font-bold text-xl flex items-center justify-center mb-4">
              {effectiveUser.avatarUrl ? (
                <img
                  src={effectiveUser.avatarUrl}
                  alt={t('header.avatarAlt', 'Avatar')}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : userInitials ? (
                userInitials
              ) : (
                <UserRound className="w-7 h-7 text-on-surface-variant" />
              )}
            </div>

            <div className="space-y-1 mb-4 min-w-0">
              {isStagConnected && (
                <span className="block text-[11px] font-bold tracking-wider text-primary uppercase">
                  {t('sidebar.badge', 'INSTITUCIONÁLNÍ ÚČET')}
                </span>
              )}
              <h1 className="text-xl font-bold text-on-surface leading-snug break-words">
                {effectiveUser.name || effectiveUser.username}
              </h1>
              <p className="text-xs sm:text-sm text-on-surface-variant truncate">
                {effectiveUser.email}
              </p>
            </div>

            {isStagConnected && (
              <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-4">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>{t('sidebar.role', 'Student')}</span>
              </div>
            )}

            {studentId && (
              <div className="flex items-center justify-between bg-surface-container-low border border-outline-variant/60 rounded-xl p-3">
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold tracking-wider text-on-surface-variant uppercase">
                    {t('stag.labels.studentId', 'STUDENTSKÉ ID')}
                  </span>
                  <strong className="text-sm text-on-surface font-mono break-all">{studentId}</strong>
                </div>
                <button
                  type="button"
                  onClick={copyId}
                  className="cursor-pointer text-on-surface-variant hover:text-primary p-1.5 rounded-lg transition-colors"
                  title={t('sidebar.copyId', 'Kopírovat ID')}
                  aria-label={t('sidebar.copyId', 'Kopírovat ID')}
                >
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            )}
          </section>

          {/* Card 2: Study details from STAG */}
          <ProfileStudyCard user={effectiveUser} />

          {/* Card 3: Study department contact (only with data) */}
          <ProfileStudyOfficeCard user={effectiveUser} />

          {/* Card 4: Study progress computed from subjects */}
          <ProfileProgressCard />
        </aside>

        {/* ================= RIGHT CONTENT COLUMN ================= */}
        <section className="flex flex-col gap-6 w-full min-w-0">
          {/* Header Intro */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-outline-variant/60 pb-4 page-section">
            <div>
              <span className="block text-xs font-bold tracking-wider text-primary uppercase mb-1">
                {t('intro.badge', 'NASTAVENÍ ÚČTU')}
              </span>
              <h2 className="text-2xl font-bold text-on-surface">{t('intro.title', 'Profil a nastavení')}</h2>
              <p className="text-sm text-on-surface-variant mt-0.5">
                {t('intro.subtitle', 'Spravujte své osobní údaje a preference účtu.')}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              {isSyncPending && (
                <span
                  className="w-2 h-2 rounded-full bg-success ring-4 ring-success/20 animate-pulse"
                  role="status"
                  aria-label={t('intro.syncing')}
                  title={t('intro.syncing')}
                />
              )}
              {lastSyncedAt ? (
                <span title={formatDateTime(lastSyncedAt, locale)}>
                  {t('intro.syncedAgo', { time: formatRelativeTime(lastSyncedAt, locale) })}
                </span>
              ) : (
                <span>{t('intro.neverSynced')}</span>
              )}
            </div>
          </div>

          {/* Tabs Navigation Bar */}
          <nav className="flex items-center gap-2 border-b border-outline-variant/60 pb-3 overflow-x-auto no-scrollbar page-section">
            {tabs.map((tabItem) => {
              const Icon = tabItem.icon
              const isActive = activeTab === tabItem.id
              return (
                <button
                  key={tabItem.id}
                  type="button"
                  onClick={() => setActiveTab(tabItem.id)}
                  className={`cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-primary/10 border border-primary/30 text-primary shadow-sm'
                      : 'border border-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tabItem.label}</span>
                </button>
              )
            })}
          </nav>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Panel 1: Personal details */}
              <section className="bg-surface border border-outline-variant rounded-2xl p-6 space-y-5 shadow-ambient">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <UserRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-on-surface">{t('overview.personalInfo', 'Osobní údaje')}</h3>
                    <p className="text-xs text-on-surface-variant">{t('overview.personalInfoDesc')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-on-surface-variant" htmlFor="overview-name">
                      {t('stag.labels.username', 'Jméno a příjmení')}
                    </label>
                    <input
                      id="overview-name"
                      type="text"
                      readOnly
                      value={effectiveUser.name || effectiveUser.username || ''}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-sm text-on-surface outline-none cursor-default"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-on-surface-variant" htmlFor="overview-email">E-mail</label>
                    <input
                      id="overview-email"
                      type="email"
                      readOnly
                      value={effectiveUser.email || ''}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-sm text-on-surface outline-none cursor-default"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-on-surface-variant" htmlFor="overview-lang">
                      {t('academic.appLanguage', 'Jazyk aplikace')}
                    </label>
                    <LanguageSelect id="overview-lang" />
                  </div>
                </div>
              </section>

              {/* Panel 2: University integrations (state only; managed in the Account tab) */}
              <section className="bg-surface border border-outline-variant rounded-2xl p-6 space-y-4 shadow-ambient">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-on-surface">{t('overview.integrationsTitle', 'Univerzitní integrace')}</h3>
                    <p className="text-xs text-on-surface-variant">{t('overview.integrationsDesc', 'Propojené služby a synchronizace.')}</p>
                  </div>
                </div>

                <div className="divide-y divide-outline-variant/60">
                  {integrations.map((item) => (
                    <div key={item.id} className="py-3 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <strong className="block text-sm font-semibold text-on-surface">{item.name}</strong>
                        <p className="text-xs text-on-surface-variant mt-0.5">{item.description}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                            item.connected
                              ? 'bg-success-container border border-success/30 text-success'
                              : 'bg-surface-container border border-outline-variant text-on-surface-variant'
                          }`}
                        >
                          {item.connected ? <Check className="w-3 h-3" /> : null}
                          <span>{item.connected ? t('overview.connected') : t('overview.notConnected')}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('account')}
                          className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          <span>{item.connected ? t('overview.manage') : t('overview.connect')}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: ACCOUNT (Osobní údaje + STAG/Moodle cards) */}
          {activeTab === 'account' && (
            <div className="space-y-6 page-section">
              <AccountTab effectiveUser={effectiveUser} />

              <div className="grid gap-4 lg:grid-cols-2 pt-2">
                <StagIntegrationCard
                  effectiveUser={effectiveUser}
                  isStagConnected={isStagConnected}
                  refreshUser={refreshUser}
                  toast={toast}
                  navigate={navigate}
                  onUserUpdate={setUser}
                />

                <MoodleIntegrationCard
                  effectiveUser={effectiveUser}
                  isMoodleConnected={isMoodleConnected}
                  refreshUser={refreshUser}
                  toast={toast}
                  onUserUpdate={setUser}
                />
              </div>
            </div>
          )}

          {/* TAB 3: SECURITY */}
          {activeTab === 'security' && (
            <div className="page-section"><SecurityTab /></div>
          )}

          <p className="text-center text-xs text-on-surface-variant pt-2">
            {t('footer.version', { version: APP_VERSION })}
          </p>
        </section>
      </div>
    </div>
  )
}

export default Profile
