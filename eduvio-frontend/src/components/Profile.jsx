import ProgressBar from './common/ProgressBar'
import { ProfileSkeleton } from './common/Skeleton'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Copy,
  Download,
  GraduationCap,
  KeyRound,
  LockKeyhole,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import AccountTab from './profile/tabs/AccountTab'
import SecurityTab from './profile/tabs/SecurityTab'
import NotificationsTab from './profile/tabs/NotificationsTab'
import StagIntegrationCard from './profile/StagIntegrationCard'
import MoodleIntegrationCard from './profile/MoodleIntegrationCard'

const Profile = ({ user: initialUser }) => {
  const { t } = useTranslation('profile')
  const navigate = useNavigate()
  const { refreshUser, logout } = useAuth()
  const toast = useToast()
  const [user, setUser] = useState(initialUser ?? null)
  const [isFetching] = useState(!initialUser)
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('stag') ? 'account' : 'overview'
  })
  const [copied, setCopied] = useState(false)

  // Mock switches for overview tab
  const [overview2FA, setOverview2FA] = useState(true)
  const [overviewMoodle, setOverviewMoodle] = useState(true)
  const [overviewCalendar, setOverviewCalendar] = useState(false)

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

  const effectiveUser = user ?? initialUser
  const isStagConnected = Boolean(effectiveUser?.stag_student_id)
  const isMoodleConnected = Boolean(effectiveUser?.moodle_username)

  const copyId = async () => {
    const studentId = effectiveUser?.stag_student_id || 'UPOL-241087'
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
    { id: 'notifications', label: t('tabs.notifications', 'Oznámení'), icon: Bell },
  ]

  const userInitials = (effectiveUser.name || effectiveUser.username || 'JN')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen bg-background text-foreground font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 lg:gap-8 items-start">
        {/* ================= LEFT SIDEBAR (Side Cards) ================= */}
        <aside className="flex flex-col gap-5 w-full">
          {/* Card 1: Identity Card */}
          <section className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-ambient">
            <div className="relative w-16 h-16 rounded-full bg-surface-container-high border-2 border-outline-variant text-on-surface font-bold text-xl flex items-center justify-center mb-4">
              {effectiveUser.avatarUrl ? (
                <img
                  src={effectiveUser.avatarUrl}
                  alt={t('header.avatarAlt', 'Avatar')}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                userInitials
              )}
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-success border-2 border-surface" />
            </div>

            <div className="space-y-1 mb-4">
              <span className="block text-[11px] font-bold tracking-wider text-primary uppercase">
                {t('sidebar.badge', 'INSTITUCIONÁLNÍ ÚČET')}
              </span>
              <h1 className="text-xl font-bold text-on-surface leading-snug">
                {effectiveUser.name || effectiveUser.username}
              </h1>
              <p className="text-xs sm:text-sm text-on-surface-variant truncate">
                {effectiveUser.email}
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-4">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>{t('sidebar.role', 'Student')}</span>
            </div>

            <div className="flex items-center justify-between bg-surface-container-low border border-outline-variant/60 rounded-xl p-3">
              <div>
                <span className="block text-[10px] font-bold tracking-wider text-on-surface-variant uppercase">
                  {t('stag.labels.studentId', 'STUDENTSKÉ ID')}
                </span>
                <strong className="text-sm text-on-surface font-mono">
                  {effectiveUser.stag_student_id || 'UPOL-241087'}
                </strong>
              </div>
              <button
                type="button"
                onClick={copyId}
                className="cursor-pointer text-on-surface-variant hover:text-primary p-1.5 rounded-lg transition-colors"
                title={t('sidebar.copyId', 'Kopírovat ID')}
              >
                {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </section>

          {/* Card 2: Current Study */}
          <section className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-ambient space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="block text-[11px] font-bold tracking-wider text-on-surface-variant uppercase">
                  {t('sidebar.currentStudy', 'AKTUÁLNÍ STUDIUM')}
                </span>
                <h2 className="text-base font-bold text-on-surface mt-0.5">
                  {effectiveUser.program || t('academic.defaults.studyProgram', 'Applied Informatics')}
                </h2>
              </div>
              <span className="bg-success-container border border-success/30 text-success text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase shrink-0">
                {t('sidebar.active', 'AKTIVNÍ')}
              </span>
            </div>

            <dl className="space-y-2.5 text-xs sm:text-sm border-t border-outline-variant/60 pt-3">
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">{t('academic.university', 'Univerzita')}</dt>
                <dd className="font-medium text-on-surface text-right">{effectiveUser.university || t('academic.defaults.university', 'Univerzita Palackého')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">{t('academic.faculty', 'Fakulta')}</dt>
                <dd className="font-medium text-on-surface text-right">{effectiveUser.faculty || t('academic.defaults.faculty', 'Přírodovědecká fakulta')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">{t('academic.academicYear', 'Ročník')}</dt>
                <dd className="font-medium text-on-surface">{effectiveUser.year || t('academic.defaults.academicYear', '2. ročník')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-on-surface-variant">{t('sidebar.studyMode', 'Forma')}</dt>
                <dd className="font-medium text-on-surface">{t('sidebar.fullTime', 'Prezenční')}</dd>
              </div>
            </dl>
          </section>

          {/* Card 3: Study Progress */}
          <section className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-ambient space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold tracking-wider text-on-surface-variant uppercase">
                {t('progress.title', 'POSTUP STUDIEM')}
              </span>
              <strong className="text-sm font-bold text-success">62 %</strong>
            </div>

            <ProgressBar
              value={62}
              className="w-full h-2 bg-surface-container rounded-full overflow-hidden"
              barClassName="h-full bg-success rounded-full"
            />

            <div className="flex justify-between text-xs text-on-surface-variant">
              <span>{t('progress.creditsFoot', { current: 74, total: 120, defaultValue: '74 z 120 kreditů' })}</span>
              <span>{t('progress.semesterFoot', { semester: 4, defaultValue: '4. semestr' })}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-outline-variant/60 pt-3 text-center">
              <div>
                <strong className="block text-lg font-bold text-on-surface">1.48</strong>
                <span className="text-[11px] text-on-surface-variant">{t('progress.averageGrade', 'Průměr')}</span>
              </div>
              <div>
                <strong className="block text-lg font-bold text-on-surface">28</strong>
                <span className="text-[11px] text-on-surface-variant">{t('progress.completedSubjects', 'Splněných předmětů')}</span>
              </div>
            </div>
          </section>
    
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
              <span className="w-2 h-2 rounded-full bg-success ring-4 ring-success/20 animate-pulse" />
              <span>{t('intro.syncedAgo', 'Synchronizováno před 2 min')}</span>
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
              {/* Panel 1: Osobní údaje */}
              <section className="bg-surface border border-outline-variant rounded-2xl p-6 space-y-5 shadow-ambient">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <UserRound className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-on-surface">{t('overview.personalInfo', 'Osobní údaje')}</h3>
                      <p className="text-xs text-on-surface-variant">{t('overview.personalInfoDesc', 'Základní informace z univerzitního systému.')}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('account')}
                    className="cursor-pointer inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline transition-colors"
                  >
                    <span>{t('overview.edit', 'Upravit')}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-on-surface-variant">{t('stag.labels.username', 'Jméno a příjmení')}</label>
                    <input
                      type="text"
                      readOnly
                      value={effectiveUser.name || effectiveUser.username || ''}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-sm text-on-surface outline-none cursor-default"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-on-surface-variant">E-mail</label>
                    <input
                      type="email"
                      readOnly
                      value={effectiveUser.email || ''}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-sm text-on-surface outline-none cursor-default"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-on-surface-variant">{t('academic.phone', 'Telefon')}</label>
                    <input
                      type="text"
                      readOnly
                      value={t('academic.defaults.phone', '+420 777 123 456')}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-sm text-on-surface outline-none cursor-default"
                    />
                    <small className="block text-[11px] text-on-surface-variant/80">{t('overview.phoneHint', 'Viditelné pouze vám')}</small>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-on-surface-variant">{t('academic.appLanguage', 'Jazyk aplikace')}</label>
                    <input
                      type="text"
                      readOnly
                      value={t('academic.defaults.appLanguage', 'Čeština')}
                      className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-3.5 py-2.5 text-sm text-on-surface outline-none cursor-default"
                    />
                  </div>
                </div>
              </section>

              {/* Panel 2: Bezpečnost účtu */}
              {/* <section className="bg-surface border border-outline-variant rounded-2xl p-6 space-y-4 shadow-ambient">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-on-surface">{t('overview.securityTitle', 'Bezpečnost účtu')}</h3>
                      <p className="text-xs text-on-surface-variant">{t('overview.securityDesc', 'Váš účet je chráněný a v pořádku.')}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 bg-success-container border border-success/30 text-success text-xs font-semibold px-2.5 py-1 rounded-full">
                    <Check className="w-3.5 h-3.5" />
                    <span>{t('overview.secured', 'Zabezpečeno')}</span>
                  </span>
                </div>

                <div className="divide-y divide-outline-variant/60 pt-2">
                  <div className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <strong className="block text-sm font-semibold text-on-surface">{t('overview.twoFactor', 'Dvoufázové ověření')}</strong>
                      <p className="text-xs text-on-surface-variant mt-0.5">{t('overview.twoFactorDesc', 'Přidejte další vrstvu ochrany při přihlašování.')}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={overview2FA}
                      onClick={() => setOverview2FA(!overview2FA)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        overview2FA ? 'bg-primary' : 'bg-surface-container-highest'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          overview2FA ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="pt-3 flex items-center justify-between gap-4">
                    <div>
                      <strong className="block text-sm font-semibold text-on-surface">{t('overview.password', 'Heslo')}</strong>
                      <p className="text-xs text-on-surface-variant mt-0.5">{t('overview.passwordDesc', 'Naposledy změněno před 3 měsíci.')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('security')}
                      className="cursor-pointer inline-flex items-center gap-1.5 bg-surface-container-low border border-outline-variant text-on-surface hover:bg-surface-container text-xs font-semibold px-3.5 py-2 rounded-xl transition-all"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{t('overview.changePassword', 'Změnit heslo')}</span>
                    </button>
                  </div>
                </div>
              </section> */}

              {/* Panel 3: Univerzitní integrace */}
              {/* <section className="bg-surface border border-outline-variant rounded-2xl p-6 space-y-4 shadow-ambient">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-on-surface">{t('overview.integrationsTitle', 'Univerzitní integrace')}</h3>
                    <p className="text-xs text-on-surface-variant">{t('overview.integrationsDesc', 'Propojené služby a synchronizace.')}</p>
                  </div>
                </div>

                <div className="divide-y divide-outline-variant/60 pt-2">
                  <div className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <strong className="block text-sm font-semibold text-on-surface">{t('overview.moodle', 'Moodle')}</strong>
                      <p className="text-xs text-on-surface-variant mt-0.5">{t('overview.moodleDesc', 'Kurzy, úkoly a termíny')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                        isMoodleConnected
                          ? 'bg-success-container border border-success/30 text-success'
                          : 'bg-surface-container border border-outline-variant text-on-surface-variant'
                      }`}>
                        {isMoodleConnected ? <Check className="w-3 h-3" /> : null}
                        <span>{isMoodleConnected ? t('overview.connected', 'Připojeno') : t('overview.disconnected', 'Odpojeno')}</span>
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={overviewMoodle}
                        onClick={() => setOverviewMoodle(!overviewMoodle)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          overviewMoodle ? 'bg-primary' : 'bg-surface-container-highest'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            overviewMoodle ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-between gap-4">
                    <div>
                      <strong className="block text-sm font-semibold text-on-surface">{t('overview.calendar', 'Kalendář')}</strong>
                      <p className="text-xs text-on-surface-variant mt-0.5">{t('overview.calendarDesc', 'Export rozvrhu do kalendáře')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center bg-surface-container border border-outline-variant text-on-surface-variant text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        {t('overview.disconnected', 'Odpojeno')}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={overviewCalendar}
                        onClick={() => setOverviewCalendar(!overviewCalendar)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          overviewCalendar ? 'bg-primary' : 'bg-surface-container-highest'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            overviewCalendar ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </section> */}
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

          {/* TAB 4: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="page-section"><NotificationsTab /></div>
         )}

          {/* Bottom Action Buttons */}
          {/* <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              className="cursor-pointer inline-flex items-center gap-2 bg-surface-container-low border border-outline-variant text-on-surface hover:bg-surface-container text-xs font-semibold px-4 py-2.5 rounded-xl transition-all"
            >
              <Download className="w-4 h-4" />
              <span>{t('actions.exportData', 'Exportovat údaje')}</span>
            </button>
            <button
              type="button"
              className="cursor-pointer inline-flex items-center gap-2 bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all"
            >
              <CalendarDays className="w-4 h-4" />
              <span>{t('actions.addToCalendar', 'Přidat do kalendáře')}</span>
            </button>
          </div> */}

          <p className="text-center text-xs text-on-surface-variant pt-2">
            {t('footer.help', 'Potřebujete pomoc?')} <button type="button" className="text-primary hover:underline">{t('footer.contactSupport', 'Kontaktujte podporu')}</button> · {t('footer.version', 'Verze 2.4.1')}
          </p>
        </section>
      </div>
    </div>
  )
}

export default Profile
