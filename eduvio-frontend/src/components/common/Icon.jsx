import { ICON_SIZES, ICON_STROKE_WIDTH } from './iconScale'

/**
 * Thin wrapper over lucide-react icons with the app's sizes.
 *
 *   sm 16 px — in text, badges, small buttons
 *   md 20 px — navigation, buttons
 *   lg 24 px — empty states, card headings
 *
 * Stroke 1.75 (also the app-wide LucideProvider default), color from
 * `currentColor` (set it with a text-* token class). Decorative unless
 * `label` is given.
 */
const Icon = ({ icon: Glyph, size = 'sm', label, className = '' }) => (
  <Glyph
    size={ICON_SIZES[size] ?? ICON_SIZES.sm}
    strokeWidth={ICON_STROKE_WIDTH}
    color="currentColor"
    className={`shrink-0 ${className}`}
    aria-hidden={label ? undefined : true}
    aria-label={label}
    role={label ? 'img' : undefined}
  />
)

export default Icon
