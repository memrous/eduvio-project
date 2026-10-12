import { NavLink } from 'react-router-dom'
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useStagStatus } from '../hooks/useStagStatus'
import Icon from './common/Icon'
import Avatar from './common/Avatar'
import { NAV_ITEMS, PROFILE_NAV_ITEM, getNavLinkClass } from './navigation/navItems'
import logoImg from '../assets/images/logo.png'

/** Label of an icon-only control, shown to the right on hover and keyboard focus. */
const RailTooltip = ({ children }) => (
  <span
    role="presentation"
    className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-inverse-surface px-2 py-1 text-label-sm font-medium text-inverse-on-surface opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
  >
    {children}
  </span>
)

const railLinkClass = ({ isActive }) =>
  `group relative flex size-12 items-center justify-center rounded-md transition-colors cursor-pointer ${
    isActive ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
  }`

const STATUS_DOT = {
  connected: 'bg-success-soft',
  offline: 'bg-outline',
  disconnected: 'bg-error',
}

/**
 * Desktop navigation: the full sidebar (260 px) or the icon rail (72 px).
 * `collapsed` and `onToggle` come from useSidebarCollapsed in AppLayout.
 */
const Sidebar = ({ collapsed = false, onToggle }) => {
  const { t } = useTranslation('common')
  const { user, logout } = useAuth()
  // Same source as the IS/STAG card: stag_connected (ticket in server mode, agent token in agent mode)
  const { status: stagStatus, mode: stagMode } = useStagStatus()
  const stagConnected = Boolean(stagStatus?.stag_connected ?? user?.stag_connected)
  const notebookOffline = stagConnected && stagMode === 'agent' && !stagStatus?.agent_online
  const moodleConnected = Boolean(user?.moodle_connected)

  const stagState = notebookOffline ? 'offline' : stagConnected ? 'connected' : 'disconnected'
  const stagLabel = notebookOffline
    ? t('sidebar.connectedNotebookOffline')
    : stagConnected ? t('sidebar.connected') : t('sidebar.notConnected')
  const moodleLabel = moodleConnected ? t('sidebar.connected') : t('sidebar.notConnected')

  const toggleLabel = collapsed ? t('sidebar.expand') : t('sidebar.collapse')
  const toggleButton = (
    <button
      type="button"
      onClick={onToggle}
      aria-label={toggleLabel}
      aria-expanded={!collapsed}
      className="group relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
    >
      <Icon icon={collapsed ? PanelLeftOpen : PanelLeftClose} size="md" />
      {collapsed && <RailTooltip>{toggleLabel}</RailTooltip>}
    </button>
  )

  if (collapsed) {
    return (
      <aside className="relative z-20 w-[72px] bg-surface border-r border-outline-variant flex flex-col items-center justify-between py-6 shrink-0 sticky top-0 h-screen font-inter">
        <div className="flex flex-col items-center gap-6">
          <img src={logoImg} alt="Eduvio" className="w-9 h-9 object-contain" />
          {toggleButton}
          <nav className="flex flex-col items-center gap-1">
            {NAV_ITEMS.map(({ to, icon, labelKey }) => (
              <NavLink key={to} to={to} className={railLinkClass} aria-label={t(labelKey)}>
                <Icon icon={icon} size="md" />
                <RailTooltip>{t(labelKey)}</RailTooltip>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="w-10 border-t border-outline-variant" />
          <NavLink
            to={PROFILE_NAV_ITEM.to}
            className={railLinkClass}
            aria-label={`${t(PROFILE_NAV_ITEM.labelKey)} – ${t('sidebar.stagAccount')}: ${stagLabel}, ${t('sidebar.moodleAccount')}: ${moodleLabel}`}
          >
            <span className="relative">
              <Avatar name={user.name} src={user.avatarUrl} size="sm" />
              {/* STAG and Moodle status at the avatar */}
              <span className="absolute -bottom-1 -right-1.5 flex gap-0.5 rounded-full bg-surface p-0.5">
                <span className={`size-2 rounded-full ${STATUS_DOT[stagState]}`} />
                <span className={`size-2 rounded-full ${moodleConnected ? STATUS_DOT.connected : STATUS_DOT.disconnected}`} />
              </span>
            </span>
            <RailTooltip>
              <span className="block font-semibold">{user.name}</span>
              <span className="block">{t('sidebar.stagAccount')}: {stagLabel}</span>
              <span className="block">{t('sidebar.moodleAccount')}: {moodleLabel}</span>
            </RailTooltip>
          </NavLink>
          <button
            type="button"
            onClick={logout}
            aria-label={t('sidebar.logout')}
            className="group relative flex size-12 cursor-pointer items-center justify-center rounded-md border border-error/20 bg-surface-container-low text-error transition-all hover:bg-surface-container"
          >
            <Icon icon={LogOut} size="md" />
            <RailTooltip>{t('sidebar.logout')}</RailTooltip>
          </button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="relative z-20 w-[260px] bg-surface border-r border-outline-variant flex flex-col justify-between p-6 shrink-0 sticky top-0 h-screen font-inter">
      <div className="flex flex-col gap-8">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <img
            src={logoImg}
            alt="Eduvio"
            className="w-9 h-9 object-contain"
          />
          <span className="font-geist font-bold text-xl tracking-tight text-on-surface">Eduvio</span>
          <span className="ml-auto">{toggleButton}</span>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, icon, labelKey }) => (
            <NavLink key={to} to={to} className={getNavLinkClass}>
              <Icon icon={icon} size="md" />
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Profile Section at bottom */}
      <div className="flex flex-col gap-4">
        <div className="border-t border-outline-variant"></div>
        <NavLink to={PROFILE_NAV_ITEM.to} className={getNavLinkClass}>
          <Icon icon={PROFILE_NAV_ITEM.icon} size="md" />
          {t(PROFILE_NAV_ITEM.labelKey)}
        </NavLink>
        {/* Profile Card */}
        <div className="bg-surface-container-low border border-outline-variant p-4 rounded-lg flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} src={user.avatarUrl} size="md" className="shadow-sm" />
            <div className="flex flex-col min-w-0">
              <span className="text-label-md text-on-surface font-semibold truncate leading-tight">{user.name}</span>
              <span className="text-label-sm text-on-surface-variant truncate leading-none mt-0.5">{user.program}</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 text-label-sm font-semibold pt-1 border-t border-outline-variant">
            <span className="shrink-0 text-on-surface-variant">{t('sidebar.stagAccount')}</span>
            {notebookOffline ? (
              <span className="flex min-w-0 items-center gap-1.5 text-right text-on-surface-variant">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-outline"></span>
                {t('sidebar.connectedNotebookOffline')}
              </span>
            ) : stagConnected ? (
              <span className="flex items-center gap-1.5 text-on-success-container">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-soft opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success-soft"></span>
                </span>
                {t('sidebar.connected')}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-error">
                <span className="h-1.5 w-1.5 rounded-full bg-error"></span>
                {t('sidebar.notConnected')}
              </span>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 bg-surface-container-low hover:bg-surface-container text-error rounded-md text-label-md transition-all cursor-pointer font-medium border border-error/20"
        >
          <Icon icon={LogOut} size="md" />
          {t('sidebar.logout')}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
