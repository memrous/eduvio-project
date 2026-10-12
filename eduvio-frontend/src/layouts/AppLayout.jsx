import PageTransition from '../components/common/PageTransition'
import { Outlet, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Icon from '../components/common/Icon'
import { NAV_ITEMS, PROFILE_NAV_ITEM } from '../components/navigation/navItems'
import logoImg from '../assets/images/logo.png'

// Desktop Components
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import MobileSearch from '../components/search/MobileSearch'

// Mobile bottom bar: the dashboard in the middle, two sections on each side
const [DASHBOARD_ITEM, ...SECTION_ITEMS] = NAV_ITEMS
const MOBILE_LEFT_ITEMS = SECTION_ITEMS.slice(0, 2)
const MOBILE_RIGHT_ITEMS = [...SECTION_ITEMS.slice(2), PROFILE_NAV_ITEM]

const MobileNavItem = ({ to, icon, labelKey }) => {
  const { t } = useTranslation('common')
  return (
    <NavLink to={to} className="flex min-w-0 justify-center">
      {({ isActive }) => (
        <div className={`flex min-w-0 flex-col items-center gap-1 transition-colors cursor-pointer ${isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
          <div className={`flex items-center justify-center rounded-full px-4 py-1 ${isActive ? 'bg-primary/10' : ''}`}>
            <Icon icon={icon} size="md" />
          </div>
          <span className="max-w-full truncate text-[10px] font-bold tracking-tight">{t(labelKey)}</span>
        </div>
      )}
    </NavLink>
  )
}

/** The dashboard as the core of the app: a raised round button in the middle of the bar. */
const MobileDashboardItem = () => {
  const { t } = useTranslation('common')
  return (
    <NavLink to={DASHBOARD_ITEM.to} aria-label={t(DASHBOARD_ITEM.labelKey)} className="flex min-w-0 justify-center">
      {({ isActive }) => (
        <div className="-mt-10 flex flex-col items-center gap-1">
          <div
            className={`flex size-12 items-center justify-center rounded-full bg-primary text-on-primary ring-4 ring-surface transition-transform cursor-pointer active:scale-95 ${
              isActive ? 'shadow-lg shadow-primary/40' : 'shadow-md'
            }`}
          >
            <Icon icon={DASHBOARD_ITEM.icon} size="md" />
          </div>
          <span className={`text-[10px] font-bold tracking-tight ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
            {t(DASHBOARD_ITEM.labelKey)}
          </span>
        </div>
      )}
    </NavLink>
  )
}

const AppLayout = () => {
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
      <div className="block lg:hidden min-h-screen bg-background pb-24 relative">

        {/* Mobile header: logo on the left, search stretched from the right
            (theme and language are in Profile → Appearance) */}
        <header className="h-14 px-4 bg-surface border-b border-outline-variant flex items-center gap-4 sticky top-0 z-40 shadow-sm font-inter">
          <NavLink to={DASHBOARD_ITEM.to} className="flex shrink-0 items-center gap-2.5">
            <img src={logoImg} alt="" className="w-8 h-8 object-contain" />
            <span className="font-geist font-bold text-lg text-on-surface tracking-tight">Eduvio</span>
          </NavLink>
          <div className="min-w-0 flex-1">
            <MobileSearch />
          </div>
        </header>

        <main className="p-4">
          <PageTransition className="flex flex-col gap-6">
            <Outlet />
          </PageTransition>
        </main>

        {/* Mobile bottom nav — every section, the dashboard raised in the middle */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-outline-variant grid grid-cols-5 items-center px-1 z-40 shadow-nav font-inter">
          {MOBILE_LEFT_ITEMS.map((item) => <MobileNavItem key={item.to} {...item} />)}
          <MobileDashboardItem />
          {MOBILE_RIGHT_ITEMS.map((item) => <MobileNavItem key={item.to} {...item} />)}
        </nav>

      </div>

    </div>
  )
}

export default AppLayout
