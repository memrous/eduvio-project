import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import DarkModeToggle from './DarkModeToggle'
import LanguageSwitcher from './LanguageSwitcher'
import GlobalSearch from './search/GlobalSearch'
import MobileSearch from './search/MobileSearch'
import Avatar from './common/Avatar'

const Header = () => {
  const { user } = useAuth()

  return (
    <header className="@container/header h-16 bg-surface border-b border-outline-variant sticky top-0 z-10 shadow-sm font-inter">
      <div className="flex h-full items-center justify-between gap-4 px-6 @[1100px]/header:px-8">
      {/* Search: a field from 1100 px of header width (200–320 px wide), a magnifier below */}
      <div className="hidden min-w-[200px] max-w-80 flex-1 @[1100px]/header:block">
        <GlobalSearch />
      </div>
      <div className="@[1100px]/header:hidden">
        <MobileSearch compact />
      </div>

      {/* Quick Actions & User Info */}
      <div className="flex shrink-0 items-center gap-4">
        <LanguageSwitcher />
        <DarkModeToggle />
        <div className="border-l border-outline-variant h-6"></div>
        {/* Profile link */}
        <Link
          to="/profile"
          aria-label={user.name}
          className="flex min-w-0 items-center gap-3 hover:opacity-80 transition-opacity"
        >
          {/* The link is labelled with the name, so the avatar is decorative */}
          <Avatar name={user.name} src={user.avatarUrl} />
          {/* The name gives way before the avatar on narrow headers */}
          <span className="hidden max-w-48 truncate text-body-md text-on-surface @4xl/header:inline">{user.name}</span>
        </Link>
      </div>
      </div>
    </header>
  )
}

export default Header
