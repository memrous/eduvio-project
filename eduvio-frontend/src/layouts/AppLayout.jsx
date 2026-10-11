import PageTransition from '../components/common/PageTransition'
import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  X,
  LogOut,
  Menu
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/common/Icon'
import Avatar from '../components/common/Avatar'
import { NAV_ITEMS, PROFILE_NAV_ITEM, getNavLinkClass } from '../components/navigation/navItems'
import DarkModeToggle from '../components/DarkModeToggle'
import LanguageSwitcher from '../components/LanguageSwitcher'
import logoImg from '../assets/images/logo.png'

// Desktop Components
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import MobileSearch from '../components/search/MobileSearch'

const MOBILE_DRAWER_ITEMS = [...NAV_ITEMS, PROFILE_NAV_ITEM]

const AppLayout = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const { user, logout } = useAuth()
  const { t } = useTranslation('common')


  return (
    <div className="min-h-screen bg-background text-on-background font-inter">

      {/* ========================================== */}
      {/* DESKTOP LAYOUT                            */}
      {/* ========================================== */}
      <div className="hidden lg:flex h-screen">
          <Sidebar />
          
          <div className="flex-1 flex flex-col min-w-0 h-screen">
            <Header />
          
            <main className="flex-1 overflow-y-auto bg-surface p-8">
              <PageTransition className="max-w-[1600px] w-full mx-auto flex flex-col gap-6">
                <Outlet />
              </PageTransition>
            </main>
          </div>
        </div>

      {/* ========================================== */}
      {/* MOBILE LAYOUT                             */}
      {/* ========================================== */}
      <div className="block lg:hidden min-h-screen bg-background pb-20 relative">

        {/* Mobile Header inline */}
        <header className="h-14 px-4 bg-surface border-b border-outline-variant flex items-center justify-between sticky top-0 z-40 shadow-sm font-inter">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-1 text-on-surface-variant hover:text-on-surface focus:outline-none cursor-pointer"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-geist font-bold text-lg text-on-surface tracking-tight">Eduvio</span>
          </div>
          <div className="flex items-center gap-2">
            <MobileSearch />
            <LanguageSwitcher />
            <DarkModeToggle />
          </div>
        </header>

        <main className="p-4">
          <PageTransition className="flex flex-col gap-6">
            <Outlet />
          </PageTransition>
        </main>

        {/* Mobile Bottom Nav inline */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-outline-variant flex justify-around items-center px-2 z-40 shadow-nav font-inter">
          {NAV_ITEMS.map(({ to, icon, labelKey }) => (
            <NavLink key={to} to={to}>
              {({ isActive }) => (
                <div className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
                  }`}>
                  <div className={
                    isActive
                      ? 'bg-primary/10 px-4 py-1 rounded-full flex items-center justify-center'
                      : 'px-4 py-1 flex items-center justify-center'
                  }>
                    <Icon icon={icon} size="md" />
                  </div>
                  <span className="text-[10px] font-bold tracking-tight">{t(labelKey)}</span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Mobile Sidebar Navigation Drawer inline */}
        <>
          {/* Backdrop Overlay */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className={`fixed inset-0 bg-scrim/40 z-50 transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
          />

          {/* Drawer Sidebar Panel */}
          <aside
            className={`fixed top-0 bottom-0 left-0 w-[260px] bg-surface border-r border-outline-variant flex flex-col justify-between p-6 shadow-2xl z-50 transition-transform duration-300 transform font-inter ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
              }`}
          >
            <div className="flex flex-col gap-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={logoImg}
                    alt="Eduvio"
                    className="w-9 h-9 object-contain"
                  />
                  <span className="font-geist font-bold text-xl tracking-tight text-on-surface">Eduvio</span>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 text-on-surface-variant hover:text-on-surface focus:outline-none cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex flex-col gap-1">
                {MOBILE_DRAWER_ITEMS.map(({ to, icon, labelKey }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setIsDrawerOpen(false)}
                    className={getNavLinkClass}
                  >
                    <Icon icon={icon} size="md" />
                    {t(labelKey)}
                  </NavLink>
                ))}
              </nav>
            </div>

            {user && (
              <div className="flex flex-col gap-4">
                <div className="border-t border-outline-variant"></div>
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

                <button
                  onClick={() => {
                    setIsDrawerOpen(false)
                    logout()
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 bg-surface-container-low hover:bg-surface-container text-error rounded-md text-label-md transition-all cursor-pointer font-medium border border-error/20"
                >
                  <Icon icon={LogOut} size="md" />
                  {t('sidebar.logout')}
                </button>
              </div>
            )}
          </aside>
        </>

      </div>

    </div>
  )
}

export default AppLayout
