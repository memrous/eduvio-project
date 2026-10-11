import { NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import Icon from './common/Icon'
import Avatar from './common/Avatar'
import { NAV_ITEMS, PROFILE_NAV_ITEM, getNavLinkClass } from './navigation/navItems'
import logoImg from '../assets/images/logo.png'

const Sidebar = () => {
  const { t } = useTranslation('common')
  const { user, logout } = useAuth()
  return (
    <aside className="w-[260px] bg-surface border-r border-outline-variant flex flex-col justify-between p-6 shrink-0 sticky top-0 h-screen font-inter">
      <div className="flex flex-col gap-8">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <img
            src={logoImg}
            alt="Eduvio"
            className="w-9 h-9 object-contain"
          />
          <span className="font-geist font-bold text-xl tracking-tight text-on-surface">Eduvio</span>
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
          <div className="flex items-center justify-between text-label-sm font-semibold pt-1 border-t border-outline-variant">
            <span className="text-on-surface-variant">{t('sidebar.stagAccount')}</span>
            {user?.stag_student_id ? (
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
