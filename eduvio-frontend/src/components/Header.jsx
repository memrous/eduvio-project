import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import DarkModeToggle from './DarkModeToggle'
import LanguageSwitcher from './LanguageSwitcher'

const Header = () => {
  const { user } = useAuth()
  const { t } = useTranslation('common')

  return (
    <header className="h-16 px-8 bg-surface border-b border-outline-variant flex items-center justify-between sticky top-0 z-10 shadow-sm font-inter">
      {/* Search Bar */}
      <div className="relative w-80">
        <Search className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder={t('header.searchPlaceholder')}
          className="w-full pl-9 pr-4 py-2 bg-surface-container-lowest rounded-md border border-outline-variant text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:border-outline focus:bg-surface-container-lowest transition-colors"
        />
      </div>

      {/* Quick Actions & User Info */}
      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <DarkModeToggle />
        <div className="border-l border-outline-variant h-6"></div>
        {/* Profile link */}
        <Link
          to="/profile"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <img
            src={user.avatarUrl || "src/assets/icons/user.png"}
            alt={user.name}
            className="w-8 h-8 rounded-full object-cover border border-outline-variant"
          />
          <span className="text-body-md text-on-surface">{user.name}</span>
        </Link>
      </div>
    </header>
  )
}

export default Header
