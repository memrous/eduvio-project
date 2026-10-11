import { useTranslation } from 'react-i18next'
import { getMaterialKind } from '../../utils/materialKinds'

const LABEL_KEYS = {
  moodle: 'resources:moodleBadge',
  auto: 'resources:semesterLinks.departmentBadge',
  manual: 'resources:ownBadge',
}

/** "Moodle" / "Web katedry" / "Vlastní" chip in the style of the Materials page. */
const MaterialSourceBadge = ({ resource }) => {
  const { t } = useTranslation('resources')

  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-surface-container-low px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
      {t(LABEL_KEYS[getMaterialKind(resource)])}
    </span>
  )
}

export default MaterialSourceBadge
