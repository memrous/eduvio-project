import calendarIcon from '../assets/icons/calendar.png'
import bellIcon from '../assets/icons/bell.png'
import bookIcon from '../assets/icons/book.png'
import clockIcon from '../assets/icons/clock.png'
import folderIcon from '../assets/icons/folder.png'
import planningIcon from '../assets/icons/planning.png'
import dashboardIcon from '../assets/icons/dashboard.png'
import profileIcon from '../assets/icons/profile.png'
import fileIcon from '../assets/icons/file.png'
import imageIcon from '../assets/icons/image.png'

const iconMap = {
  calendar: calendarIcon,
  bell: bellIcon,
  book: bookIcon,
  clock: clockIcon,
  folder: folderIcon,
  planning: planningIcon,
  dashboard: dashboardIcon,
  profile: profileIcon,
  file: fileIcon,
  image: imageIcon,
}

export const CustomIcon = ({ name, className = 'w-4 h-4', alt = '' }) => {
  const src = iconMap[name]
  if (!src) return null
  return (
    <img
      src={src}
      className={`${className} object-contain`}
      alt={alt || `${name} icon`}
    />
  )
}

export default CustomIcon
