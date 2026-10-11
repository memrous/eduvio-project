import { useState } from 'react'

/** "Jan Novák" → "JN" */
const getInitials = (name) =>
  String(name ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

const SIZES = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-16 text-xl',
}

/**
 * User photo, or the initials when there is none or it fails to load. Decorative by default
 * (the name is usually shown next to it); pass `alt` when it stands alone.
 */
const Avatar = ({ name, src, size = 'sm', alt = '', className = '' }) => {
  const sizeClass = SIZES[size] ?? SIZES.sm
  const [failedSrc, setFailedSrc] = useState(null)

  if (src && src !== failedSrc) {
    return (
      <img
        src={src}
        alt={alt}
        onError={() => setFailedSrc(src)}
        className={`${sizeClass} shrink-0 rounded-full border border-outline-variant object-cover ${className}`}
      />
    )
  }
  return (
    <span
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={`${sizeClass} grid shrink-0 place-items-center rounded-full border border-outline-variant bg-primary-container font-semibold text-on-primary-container ${className}`}
    >
      {getInitials(name)}
    </span>
  )
}

export default Avatar
