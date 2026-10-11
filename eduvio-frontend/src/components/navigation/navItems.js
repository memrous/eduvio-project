import { BookOpen, CalendarDays, FolderOpen, LayoutDashboard, UserRound } from 'lucide-react'

/** Main sections — the same icons in the sidebar, the mobile drawer and the bottom bar. */
export const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'sidebar.dashboard' },
  { to: '/subjects', icon: BookOpen, labelKey: 'sidebar.subjects' },
  { to: '/calendar', icon: CalendarDays, labelKey: 'sidebar.calendar' },
  { to: '/materials', icon: FolderOpen, labelKey: 'sidebar.resources' },
]

export const PROFILE_NAV_ITEM = { to: '/profile', icon: UserRound, labelKey: 'sidebar.profile' }

/**
 * Sidebar / drawer link: the active item has a light primary tint with
 * primary icon and text; inactive items are muted with a subtle hover.
 */
export const getNavLinkClass = ({ isActive }) => {
  const base = 'flex items-center gap-3 px-3 py-2.5 rounded-md text-label-md font-medium transition-colors cursor-pointer'
  return isActive
    ? `${base} bg-primary/10 text-primary`
    : `${base} text-on-surface-variant hover:bg-surface-container hover:text-on-surface`
}
