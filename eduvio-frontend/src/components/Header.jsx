import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import DarkModeToggle from './DarkModeToggle'
import LanguageSwitcher from './LanguageSwitcher'
import GlobalSearch from './search/GlobalSearch'
import Avatar from './common/Avatar'

const Header = () => {
  const { user } = useAuth()

  return (
    <header className="h-16 px-8 bg-surface border-b border-outline-variant flex items-center justify-between sticky top-0 z-10 shadow-sm font-inter">
      <GlobalSearch />

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
          {/* The name is next to it, so the avatar is decorative */}
          <Avatar name={user.name} src={user.avatarUrl} />
          <span className="text-body-md text-on-surface">{user.name}</span>
        </Link>
      </div>
    </header>
  )
}

export default Header
