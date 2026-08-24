import { NavLink } from 'react-router-dom'
import { GraduationCap, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import CustomIcon from './CustomIcon'

const NAV_ITEMS = [
  { to: '/dashboard', customIcon: 'dashboard', labelKey: 'sidebar.dashboard' },
  { to: '/subjects', customIcon: 'book', labelKey: 'sidebar.subjects' },
  { to: '/calendar', customIcon: 'calendar', labelKey: 'sidebar.calendar' },
  { to: '/materials', customIcon: 'folder', labelKey: 'sidebar.resources' },
]

const Sidebar = () => {
  const { t } = useTranslation('common')
  const { user, logout } = useAuth()
  const getClass = ({ isActive }) => {
    const base = 'flex items-center gap-3 px-3 py-2.5 rounded-md text-label-md transition-all cursor-pointer'
    return isActive
      ? `${base} bg-primary-fixed text-on-primary-fixed-variant font-semibold`
      : `${base} text-on-surface-variant hover:bg-surface-container hover:text-on-surface`
  }

  const getIconClass = ({ isActive }) =>
    isActive ? 'text-primary' : 'text-on-surface-variant'

  return (
    <aside className="w-[260px] bg-surface border-r border-outline-variant flex flex-col justify-between p-6 shrink-0 sticky top-0 h-screen font-inter">
      <div className="flex flex-col gap-8">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-container text-on-primary-container flex items-center justify-center rounded-md">
            <GraduationCap className="w-5 h-5 text-current" />
          </div>
          <span className="font-geist font-bold text-xl tracking-tight text-on-surface">StudyHub</span>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, icon: Icon, customIcon, labelKey }) => (
            <NavLink key={to} to={to} className={getClass}>
              {({ isActive }) => (
                <>
                  {customIcon ? (
                    <CustomIcon name={customIcon} className="w-4 h-4" />
                  ) : (
                    <Icon className={`w-4 h-4 ${getIconClass({ isActive })}`} />
                  )}
                  {t(labelKey)}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Profile Section at bottom */}
      <div className="flex flex-col gap-4">
        <div className="border-t border-outline-variant"></div>
        <NavLink to="/profile" className={getClass}>
          {() => (
            <>
              <CustomIcon name="profile" className="w-4 h-4" />
              {t('sidebar.profile')}
            </>
          )}
        </NavLink>
        {/* Profile Card */}
        <div className="bg-surface-container-low border border-outline-variant p-4 rounded-lg flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <img
              src={user.avatarUrl || "src/assets/icons/user.png"}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover border border-outline-variant shadow-sm"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-label-md text-on-surface font-semibold truncate leading-tight">{user.name}</span>
              <span className="text-label-sm text-on-surface-variant truncate leading-none mt-0.5">{user.program}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-label-sm font-semibold pt-1 border-t border-outline-variant">
            <span className="text-outline">{t('sidebar.stagAccount')}</span>
            {user?.stag_student_id ? (
              <span className="flex items-center gap-1.5 text-green-600">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                </span>
                {t('sidebar.connected')}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-red-500/80">
                <span className="h-1.5 w-1.5 rounded-full bg-red-400"></span>
                {t('sidebar.notConnected')}
              </span>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 bg-surface-container-low hover:bg-surface-container text-red-600 rounded-md text-label-md transition-all cursor-pointer font-medium border border-red-200/50"
        >
          <LogOut className="w-4 h-4 text-red-600" />
          {t('sidebar.logout')}
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
