import { ICON_SIZES } from './iconScale'

/**
 * Thin wrapper over Phosphor icons with the app's sizes.
 *
 *   sm 16 px — in text, badges, small buttons
 *   md 20 px — navigation, buttons
 *   lg 24 px — empty states, card headings
 *
 * Color from `currentColor` (set it with a text-* token class). Decorative unless
 * `label` is given.
 */
const Icon = ({ icon: Glyph, size = 'sm', weight = 'regular', label, className = '' }) => (
  <Glyph
    size={typeof size === 'number' ? size : (ICON_SIZES[size] ?? ICON_SIZES.sm)}
    weight={weight}
    color="currentColor"
    className={`shrink-0 ${className}`}
    aria-hidden={label ? undefined : true}
    aria-label={label}
    role={label ? 'img' : undefined}
  />
)

export default Icon
