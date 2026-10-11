import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FolderOpen } from 'lucide-react'
import Icon from './common/Icon'
import MaterialTypeIcon from './materials/MaterialTypeIcon'
import MaterialSourceBadge from './materials/MaterialSourceBadge'
import { isHidden } from '../utils/materialKinds'
import { getPreviewInfo } from '../utils/materialPreview'
import { getSubjectIdOf, isSameId } from '../utils/ids'
import { getLocaleFromLanguage } from '../utils/locale'
import { formatDateTime, formatRelativeTime } from '../utils/relativeTime'

// Loaded on first open, so docx-preview stays out of the dashboard chunk
const ResourcePreviewModal = lazy(() => import('./materials/ResourcePreviewModal'))

const MAX_ITEMS = 5

const isWebUrl = (url) => /^https?:\/\//i.test(url ?? '')

/**
 * Newest materials (by created_at) and new items on linked course pages
 * (by content_changed_at), newest first. Hidden materials and locked Moodle
 * sections are left out.
 */
const buildRecentItems = (resources) => {
  const items = []

  for (const res of resources ?? []) {
    if (isHidden(res) || res.moodle_section_id != null) continue

    if (res.category === 'platform') {
      for (const link of res.page_links_new ?? []) {
        if (!isWebUrl(link?.url)) continue
        items.push({ key: `page-${res.id}-${link.url}`, resource: res, isPageLink: true, title: link.text || link.url, url: link.url, date: res.content_changed_at })
      }
    } else if ((res.category ?? 'file') === 'file') {
      // Optimistic uploads only have uploadedAt until the refetch
      items.push({ key: `material-${res.id}`, resource: res, isPageLink: false, title: res.title, url: res.url, date: res.created_at ?? res.uploadedAt })
    }
  }

  const time = (item) => (item.date ? new Date(item.date).getTime() : 0)
  return items.sort((a, b) => time(b) - time(a)).slice(0, MAX_ITEMS)
}

const RecentMaterials = ({ resources, subjects, isLoading, onMarkSeen }) => {
  const { t, i18n } = useTranslation(['dashboard', 'resources'])
  const locale = getLocaleFromLanguage(i18n.language)
  const [previewResource, setPreviewResource] = useState(null)

  const items = useMemo(() => buildRecentItems(resources), [resources])

  const getSubjectName = (res) => {
    const subjectId = getSubjectIdOf(res)
    if (subjectId == null) return t('resources:otherSubject')
    return (subjects ?? []).find((s) => isSameId(s.id, subjectId))?.name ?? ''
  }

  // Links and files without an in-app preview open in a new tab
  const opensInNewTab = (item) =>
    item.isPageLink || item.resource.type === 'LINK' || !getPreviewInfo(item.resource).canPreview

  const rowClass = 'flex w-full min-w-0 items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-surface-container-low cursor-pointer bg-transparent border-0'

  const renderRowContent = (item) => {
    const subjectName = getSubjectName(item.resource)
    return (
      <>
        <MaterialTypeIcon resource={item.resource} tile="md" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm font-medium text-on-surface" title={item.title}>
            {item.title}
          </span>
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-on-surface-variant">
            <MaterialSourceBadge resource={item.resource} />
            {subjectName && <span className="min-w-0 truncate">{subjectName}</span>}
            {item.date && (
              <time dateTime={item.date} title={formatDateTime(item.date, locale)} className="shrink-0">
                {subjectName && '· '}{formatRelativeTime(item.date, locale)}
              </time>
            )}
          </span>
        </span>
      </>
    )
  }

  return (
    <section
      aria-labelledby="recent-materials-heading"
      className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-ambient w-full"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon icon={FolderOpen} size="md" />
          </span>
          <h2 id="recent-materials-heading" className="truncate text-base font-semibold text-foreground">
            {t('recentMaterials.title')}
          </h2>
        </div>
        <Link to="/materials" className="shrink-0 text-label-md font-semibold text-primary hover:underline">
          {t('recentMaterials.viewAll')}
        </Link>
      </div>

      {isLoading ? (
        <ul className="flex flex-col gap-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-3 py-2">
              <span className="size-9 shrink-0 animate-pulse rounded-lg bg-surface-container-low" />
              <span className="h-4 flex-1 animate-pulse rounded bg-surface-container-low" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-start gap-2 py-1">
          <p className="text-sm text-on-surface-variant">{t('recentMaterials.empty')}</p>
          <Link to="/materials" className="text-label-md font-semibold text-primary hover:underline">
            {t('recentMaterials.uploadMaterial')}
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.key} className="min-w-0">
              {opensInNewTab(item) ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={item.isPageLink ? () => onMarkSeen?.(item.resource.id) : undefined}
                  className={rowClass}
                >
                  {renderRowContent(item)}
                </a>
              ) : (
                <button type="button" onClick={() => setPreviewResource(item.resource)} className={rowClass}>
                  {renderRowContent(item)}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {previewResource && (
        <Suspense fallback={null}>
          <ResourcePreviewModal resource={previewResource} onClose={() => setPreviewResource(null)} />
        </Suspense>
      )}
    </section>
  )
}

export default RecentMaterials
