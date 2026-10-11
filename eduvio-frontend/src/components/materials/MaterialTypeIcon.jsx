import { FileText, FileType2, Globe, Link, NotebookText, Presentation, Video } from 'lucide-react'
import Icon from '../common/Icon'

/**
 * Icon and tinted tile of a material type — the same mapping on the
 * Materials page, Recent materials, the search and the subject detail.
 * WEBSITE is a course page link (category "platform").
 */
const MATERIAL_TYPES = {
  PDF:       { icon: FileType2,    tile: 'bg-error-container text-error' },
  DOC:       { icon: FileText,     tile: 'bg-primary-container text-primary' },
  SLIDES:    { icon: Presentation, tile: 'bg-tertiary-container text-on-tertiary-container' },
  NOTES:     { icon: NotebookText, tile: 'bg-warning-container text-on-warning-container' },
  RECORDING: { icon: Video,        tile: 'bg-success-container text-success' },
  LINK:      { icon: Link,         tile: 'bg-secondary-container text-on-secondary-container' },
  WEBSITE:   { icon: Globe,        tile: 'bg-secondary-container text-on-secondary-container' },
}

const TILE_SIZES = {
  sm: { box: 'size-8', icon: 'sm' },
  md: { box: 'size-9', icon: 'md' },
  lg: { box: 'size-10', icon: 'md' },
}

/**
 * Pass `resource` (detects course page links) or `type`.
 * `tile` ("sm" | "md" | "lg") draws the icon on a tinted square.
 */
const MaterialTypeIcon = ({ resource, type, tile, size = 'sm', className = '' }) => {
  const key = resource?.category === 'platform' ? 'WEBSITE' : (resource?.type ?? type)
  const config = MATERIAL_TYPES[key] ?? MATERIAL_TYPES.DOC

  if (!tile) return <Icon icon={config.icon} size={size} className={className} />

  const { box, icon } = TILE_SIZES[tile] ?? TILE_SIZES.md
  return (
    <span className={`flex ${box} shrink-0 items-center justify-center rounded-lg ${config.tile} ${className}`}>
      <Icon icon={config.icon} size={icon} />
    </span>
  )
}

export default MaterialTypeIcon
