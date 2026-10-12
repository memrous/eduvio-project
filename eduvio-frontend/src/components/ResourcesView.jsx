/* eslint-disable no-unused-vars */
import { useState, useMemo, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import {
  Download,
  ExternalLink,
  Eye,
  Search,
  Plus,
  X,
  Pin,
  Users,
  GraduationCap,
  CalendarDays,
  File,
  SlidersHorizontal,
  Pencil,
  Trash2,
  RefreshCw,
  Loader2,
  Globe,
  Sparkles,
  ChevronDown,
  CalendarClock,
  EyeOff,
  FolderOpen,
} from "lucide-react"
import Dropdown from './common/Dropdown'
import Icon from './common/Icon'
import MaterialTypeIcon from './materials/MaterialTypeIcon'
import { getSubjectColor } from '../utils/subjectColors'
import { getLocaleFromLanguage } from '../utils/locale'
import LessonSelect from './materials/LessonSelect'
import MaterialActionsMenu from './materials/MaterialActionsMenu'
import { useMaterialActions } from './materials/useMaterialActions'
import { getMaterialKind, isHidden } from '../utils/materialKinds'
import SemesterLinkModal from './materials/SemesterLinkModal'
import ResourcePreviewModal from './materials/ResourcePreviewModal'
import { getPreviewInfo } from '../utils/materialPreview'
import MaterialDownloadLink from './materials/MaterialDownloadLink'
import { getSemesterLinkSourceLabel, getSemesterLinkTitle, isAutoSemesterLink } from '../utils/semesterLinks'
import { getEventIdOf, getSubjectIdOf, isPersistedId, isSameId } from '../utils/ids'
import {
  GENERAL_LESSON,
  buildSemesterStarts,
  getLastStartedLesson,
  getMaterialWeek,
  getSemesterWeekInfo,
  getLessonTypeKey,
  getSemesterWeek,
  getSubjectLessons,
} from '../utils/lessons'

// Select/filter value for materials without a subject ("Jiné").
const OTHER_SUBJECT = 'none'

const hasNoSubject = (resource) => resource.subjectId == null && resource.subject_id == null

const getTypeFromFileName = (fileName) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''
  if (['pdf'].includes(ext)) return 'PDF'
  if (['doc', 'docx', 'rtf', 'odt'].includes(ext)) return 'DOC'
  if (['ppt', 'pptx'].includes(ext)) return 'SLIDES'
  if (['txt', 'md'].includes(ext)) return 'NOTES'
  if (['mp4', 'webm', 'mov', 'm4v'].includes(ext)) return 'RECORDING'
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp'].includes(ext)) return 'SLIDES'
  return 'DOC'
}

const TagChip = ({ label }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant">
    {label}
  </span>
)

// ─── Recent Resource Card (horizontal compact) ───────────────
const RecentCard = ({ resource, subjectName, t }) => {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface p-4 flex flex-col gap-3 flex-1 min-w-[220px] max-w-sm transition-colors hover:border-outline-variant/80">
      <div className="flex items-start justify-between">
        <MaterialTypeIcon resource={resource} tile="md" />
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface-variant">
          {t(`resources:typeShort.${resource.type}`, resource.type)}
        </span>
      </div>
      <div>
        <p className="text-sm font-medium text-on-surface leading-snug truncate">{resource.title}</p>
        <p className="text-[11px] text-on-surface-variant/70 mt-0.5 truncate">{subjectName}</p>
      </div>
      <p className="text-[11px] text-on-surface-variant/70 mt-auto font-medium">{resource.size || t('resources:defaults.attachment')} • {resource.uploadDate}</p>
    </div>
  )
}

// ─── Resource Row (used inside session/event cards) ───────────
const ResourceRow = ({ resource, onOpen, menu }) => {
  const { t } = useTranslation('resources')
  const isLink = resource.type === 'LINK'
  const hidden = isHidden(resource)

  return (
    <div
      onClick={onOpen}
      className={`group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-outline-variant hover:bg-surface-container-low/50 cursor-pointer ${hidden ? 'opacity-60' : ''}`}
    >
      <MaterialTypeIcon resource={resource} tile="md" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-on-surface">{resource.title}</p>
        <p className="text-[11px] text-on-surface-variant/70">
          {hidden && <>{t('resources:materialActions.hiddenBadge')} · </>}
          {isLink ? t('resources:library.externalLink') : resource.size || t('resources:defaults.attachment')}
        </p>
      </div>

      {menu && <MaterialActionsMenu label={menu.label} items={menu.items} />}
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant opacity-100 transition-all hover:bg-primary/15 hover:text-primary md:opacity-0 md:group-hover:opacity-100">
        {isLink ? <ExternalLink className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </span>
    </div>
  )
}

// ─── Full Resource Card (grid, "Other materials" section) ────
const ResourceCard = ({ resource, subjectName, onPreview, menu, t }) => {
  const isLink = resource.type === "LINK"
  const previewInfo = getPreviewInfo(resource)

  const handleOpen = () => {
    if (isLink || !previewInfo.canPreview) {
      window.open(resource.url, '_blank', 'noopener,noreferrer')
    } else {
      onPreview(resource)
    }
  }

  const displayDate = resource.uploadDate || (resource.uploadedAt ? resource.uploadedAt.split('T')[0] : '')
  const hidden = isHidden(resource)

  return (
    <div className={`rounded-2xl border border-outline-variant bg-surface transition-colors hover:border-outline-variant/70 font-inter ${hidden ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 p-4 pb-3">
        <MaterialTypeIcon resource={resource} tile="md" />
        <div className="flex flex-wrap gap-1.5 justify-end">
          {hidden && <TagChip label={t('resources:materialActions.hiddenBadge')} />}
          {getMaterialKind(resource) === 'moodle' && <TagChip label={t('resources:moodleBadge')} />}
          <TagChip label={t(`resources:typeShort.${resource.type}`, resource.type)} />
          {subCode(subjectName) && <TagChip label={subCode(subjectName)} />}
        </div>
      </div>

      {/* Title + description */}
      <div className="flex flex-col gap-1 px-4">
        <h4 className="text-sm font-semibold text-on-surface leading-snug line-clamp-2">{resource.title}</h4>
        <p className="text-[12px] text-on-surface-variant/80 leading-relaxed line-clamp-3">{resource.description}</p>
      </div>

      {/* Footer: meta + actions */}
      <div className="flex items-center justify-between mt-3 px-4 py-3 border-t border-outline-variant/60">
        <span className="text-[11px] text-on-surface-variant/70 font-medium truncate pr-2">{resource.size || t('resources:defaults.attachment')} • {displayDate}</span>
        <div className="flex items-center gap-1 shrink-0">
          {!isLink && (
            <MaterialDownloadLink
              resource={resource}
              href={resource.url}
              className="flex size-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-primary/15 hover:text-primary"
              title={t('resources:actions.download')}
            >
              <Download className="size-4" />
            </MaterialDownloadLink>
          )}
          <button
            onClick={handleOpen}
            className="flex size-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-primary/15 hover:text-primary cursor-pointer bg-transparent border-0"
            title={t('resources:actions.open')}
          >
            {isLink || !previewInfo.canPreview ? <ExternalLink className="size-4" /> : <Eye className="size-4" />}
          </button>
          {menu && <MaterialActionsMenu label={menu.label} items={menu.items} />}
        </div>
      </div>
    </div>
  )
}

const subCode = (subjName) => {
  if (!subjName) return '';
  if (subjName.includes('Database')) return 'DBS';
  if (subjName.includes('Web')) return 'WA';
  if (subjName.includes('Programming')) return 'PROG';
  if (subjName.includes('Operating')) return 'OS';
  if (subjName.includes('Software')) return 'SE';
  if (subjName.includes('Network')) return 'NET';
  return '';
};

// ─── Upload Modal ────────────────────────────────────────────
const UploadModal = ({ onClose, onSave, subjects, events, semesterStarts, presetEventId, presetSubjectId }) => {
  const { t } = useTranslation('resources')
  const initialSubjectId = presetSubjectId ? String(presetSubjectId) : String(subjects[0]?.id ?? OTHER_SUBJECT)
  const [form, setForm] = useState({
    title: '',
    subjectId: initialSubjectId,
    type: 'PDF',
    description: ''
  })
  const [sourceType, setSourceType] = useState('local')
  const [file, setFile] = useState(null)
  const [remoteUrl, setRemoteUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  // Lesson: preset from a lesson card, otherwise the last started lesson is only suggested
  const suggestLesson = (subjectId) => {
    if (subjectId === OTHER_SUBJECT) return null
    return getLastStartedLesson(getSubjectLessons(events, Number(subjectId)))
  }
  const [suggestedLessonId, setSuggestedLessonId] = useState(() =>
    presetEventId ? null : suggestLesson(initialSubjectId)?.id ?? null
  )
  const [lessonId, setLessonId] = useState(() =>
    presetEventId ? String(presetEventId) : String(suggestedLessonId ?? GENERAL_LESSON)
  )

  const selectedSubject = subjects.find((s) => String(s.id) === form.subjectId)
  const subjectLessons = selectedSubject ? getSubjectLessons(events, selectedSubject.id) : []
  const showSuggestion = suggestedLessonId != null && lessonId === String(suggestedLessonId)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const changeSubject = (e) => {
    const subjectId = e.target.value
    setForm(f => ({ ...f, subjectId }))
    const suggestion = suggestLesson(subjectId)
    setSuggestedLessonId(suggestion?.id ?? null)
    setLessonId(String(suggestion?.id ?? GENERAL_LESSON))
  }

  const changeLesson = (value) => {
    setLessonId(value)
    setSuggestedLessonId(null) // the user decided; no longer a suggestion
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const title = form.title.trim() || (file?.name ?? '')
    if (!title) return;

    const payload = {
      subjectId: form.subjectId === OTHER_SUBJECT ? null : Number(form.subjectId),
      title,
      type: sourceType === 'local' ? getTypeFromFileName(file.name) : form.type,
      description: form.description || (sourceType === 'local' ? t('resources:defaults.localDescription') : t('resources:defaults.urlDescription')),
    }
    if (lessonId !== GENERAL_LESSON && payload.subjectId) {
      payload.eventId = Number(lessonId);
    }

    if (sourceType === 'local') {
      if (!file) return;
      payload.file = file;
    } else {
      if (!remoteUrl.trim()) return;
      payload.url = remoteUrl.trim();
    }

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      console.error(err);
      setSubmitError(err.message || t('resources:modal.errors.uploadFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputCls = 'w-full px-3.5 py-2.5 bg-surface rounded-xl border border-outline-variant text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-colors disabled:opacity-60'
  const labelCls = 'text-xs font-semibold text-on-surface-variant'

  return (
    <div className="fixed inset-0 bg-scrim/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl border border-outline-variant w-full max-w-md overflow-hidden font-inter">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface">
          <h2 className="text-lg font-semibold text-on-surface">{t('resources:modal.title')}</h2>
          <button onClick={onClose} disabled={isSubmitting} className="p-1 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface cursor-pointer bg-transparent border-0 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {submitError && (
            <div className="p-3 bg-error-container border border-error/30 rounded-xl text-sm text-on-error-container">
              {submitError}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>{t('resources:modal.fields.resourceTitle')}</label>
            <input required placeholder="e.g. SQL JOIN Cheat Sheet" value={form.title} onChange={set('title')} disabled={isSubmitting} className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>{t('resources:modal.fields.subject')}</label>
              <select value={form.subjectId} onChange={changeSubject} disabled={isSubmitting} className={inputCls}>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                <option value={OTHER_SUBJECT}>{t('resources:otherSubject')}</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>{t('resources:modal.fields.documentType')}</label>
              <select value={form.type} onChange={set('type')} disabled={isSubmitting} className={inputCls}>
                {['PDF', 'NOTES', 'SLIDES', 'RECORDING', 'LINK', 'DOC'].map(type => (
                  <option key={type} value={type}>{t(`resources:typeLabels.${type}`)}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedSubject && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="upload-lesson" className={labelCls}>{t('resources:lessons.field')}</label>
              <LessonSelect
                id="upload-lesson"
                value={lessonId}
                onChange={changeLesson}
                lessons={subjectLessons}
                semester={selectedSubject.semester}
                semesterStarts={semesterStarts}
                suggestedId={showSuggestion ? suggestedLessonId : null}
                disabled={isSubmitting}
                className={inputCls}
              />
              {showSuggestion && (
                <p className="flex items-center gap-1.5 text-xs text-primary">
                  <Sparkles className="size-4 shrink-0" aria-hidden="true" />
                  {t('resources:lessons.suggestionNote')}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>{t('resources:modal.fields.description')}</label>
            <textarea rows={2} placeholder={t('resources:modal.placeholders.description')} value={form.description} onChange={set('description')} disabled={isSubmitting} className={`${inputCls} resize-none`} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>{t('resources:modal.fields.addFrom')}</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setSourceType('local')}
                  className={`px-3 py-2 rounded-xl border transition-colors text-sm font-medium ${sourceType === 'local' ? 'border-primary/50 bg-primary/10 text-primary' : 'border-outline-variant bg-surface text-on-surface'} disabled:opacity-50`}
                >
                  {t('resources:modal.sourceButtons.local')}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setSourceType('url')}
                  className={`px-3 py-2 rounded-xl border transition-colors text-sm font-medium ${sourceType === 'url' ? 'border-primary/50 bg-primary/10 text-primary' : 'border-outline-variant bg-surface text-on-surface'} disabled:opacity-50`}
                >
                  {t('resources:modal.sourceButtons.url')}
                </button>
              </div>
            </div>
          </div>

          {sourceType === 'local' ? (
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>{t('resources:modal.fields.chooseFile')}</label>
              <input
                type="file"
                disabled={isSubmitting}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.jpg,.jpeg,.png,.gif,.svg,.webp,.mp4,.webm,.mov"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className={inputCls}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>{t('resources:modal.fields.webUrl')}</label>
              <input
                type="url"
                disabled={isSubmitting}
                placeholder="https://example.com/resource.pdf"
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                className={inputCls}
              />
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-outline-variant/60 mt-1">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 border border-outline-variant rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer bg-transparent disabled:opacity-50">{t('resources:modal.actions.cancel')}</button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-sm font-semibold shadow-sm transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-on-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>{t('resources:modal.actions.uploading')}</span>
                </>
              ) : (
                t('resources:modal.actions.upload')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Semester Link Item (pinned link + new files on its page) ─
const SemesterLinkItem = ({ resource: res, subject, menu, onSeen }) => {
  const { t, i18n } = useTranslation('resources')
  // New links stay listed after "seen" clears them on the server
  const [expandedLinks, setExpandedLinks] = useState(null)

  const isAuto = isAutoSemesterLink(res)
  const title = getSemesterLinkTitle(res, subject, t)
  const newLinks = (res.page_links_new || []).filter((l) => /^https?:\/\//i.test(l.url))
  const listId = `semester-link-new-${res.id}`

  const changedAt = res.content_changed_at
    ? new Date(res.content_changed_at).toLocaleDateString(
        getLocaleFromLanguage(i18n.language),
        i18n.language?.startsWith('cs') ? { day: 'numeric', month: 'numeric' } : { day: 'numeric', month: 'short' }
      )
    : null

  const markSeen = () => {
    if (newLinks.length > 0) onSeen()
  }

  const toggleNew = () => {
    if (expandedLinks) {
      setExpandedLinks(null)
      return
    }
    setExpandedLinks(newLinks)
    markSeen()
  }

  const shownLinks = expandedLinks ?? newLinks
  const hidden = isHidden(res)

  return (
    <div className={`group relative flex flex-col gap-2 rounded-xl border border-outline-variant bg-surface p-3 transition-colors hover:border-primary/40 hover:bg-surface/80 ${hidden ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <MaterialTypeIcon resource={res} tile="md" />
        <div className="min-w-0 flex-1">
          <a
            href={res.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={markSeen}
            className="block truncate text-sm font-medium text-on-surface after:absolute after:inset-0 after:rounded-xl"
          >
            {title}
          </a>
          {isAuto ? (
            <>
              {subject?.code && <p className="font-mono text-xs text-on-surface-variant/80">{subject.code}</p>}
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-on-surface-variant/80">
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                  <Globe className="size-3" aria-hidden="true" />
                  {t('resources:semesterLinks.departmentBadge')}
                </span>
                {hidden && (
                  <span className="rounded-full bg-surface-container-low px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                    {t('resources:materialActions.hiddenBadge')}
                  </span>
                )}
                <span className="min-w-0 truncate">{getSemesterLinkSourceLabel(res, t)}</span>
              </p>
            </>
          ) : (
            (res.description || subject?.code) && (
              <p className="truncate text-xs text-on-surface-variant/80">
                {subject?.code && <span className="font-mono">{subject.code}</span>}
                {subject?.code && res.description && ' · '}
                {res.description}
              </p>
            )
          )}
        </div>
        {menu && <MaterialActionsMenu label={menu.label} items={menu.items} />}
      </div>

      {/* New files and subpages on the linked page */}
      {shownLinks.length > 0 && (
        <div className="relative z-10 pl-12">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={toggleNew}
              aria-expanded={Boolean(expandedLinks)}
              aria-controls={listId}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/15 cursor-pointer border-0"
            >
              <Sparkles className="size-3" aria-hidden="true" />
              {t('resources:pageChanges.newCount', { count: shownLinks.length })}
              <ChevronDown className={`size-3 transition-transform motion-reduce:transition-none ${expandedLinks ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {changedAt && (
              <span className="text-[11px] text-on-surface-variant/80">
                {t('resources:pageChanges.updatedOn', { date: changedAt })}
              </span>
            )}
          </div>
          {expandedLinks && (
            <ul id={listId} className="mt-2 flex flex-col gap-1">
              {expandedLinks.map((link) => (
                <li key={link.url} className="min-w-0">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-md text-xs text-on-surface-variant transition-colors hover:text-primary"
                  >
                    <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{link.text || link.url}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Refresh of links from department websites ────────────────
const RefreshLinksButton = ({ departmentLinks }) => {
  const { t } = useTranslation('resources')
  const { status, nextAllowedAt, refresh, isRefreshing } = departmentLinks
  const [now, setNow] = useState(() => Date.now())

  // Re-render while a cooldown is shown
  useEffect(() => {
    if (!nextAllowedAt) return
    const interval = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(interval)
  }, [nextAllowedAt])

  const minutesLeft = nextAllowedAt ? Math.ceil((new Date(nextAllowedAt).getTime() - now) / 60000) : 0
  const onCooldown = !isRefreshing && minutesLeft > 0

  let label = t('resources:semesterLinks.refresh')
  if (isRefreshing) label = t('resources:semesterLinks.refreshing')
  else if (onCooldown) label = t('resources:semesterLinks.refreshCooldown', { count: minutesLeft })

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => refresh().catch(() => {})}
        disabled={isRefreshing || onCooldown}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-on-surface-variant transition-colors hover:bg-primary/10 hover:text-primary cursor-pointer bg-transparent border-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent disabled:hover:text-on-surface-variant"
      >
        <RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
        {label}
      </button>
      <p role="status" className="text-[11px] text-on-surface-variant/80 empty:hidden">
        {!isRefreshing && status === 'failed' ? t('resources:semesterLinks.refreshFailed') : ''}
      </p>
    </div>
  )
}

// ─── Main ResourcesView Component ────────────────────────────
const ResourcesView = ({ resources, subjects, events, onUploadResource, onUpdateResource, onDeleteResource, onMarkSeen, onAssignEvent, onUpdateMaterial, onSetHidden, onSetForExam, departmentLinks }) => {
  const { t, i18n } = useTranslation(['resources', 'dashboard'])
  // Filters live in the URL (?subject=…&type=…&week=…&q=…&hidden=1): shareable, kept on reload.
  // ?preview=<id> opens the preview of a material (e.g. from the header search).
  const [searchParams, setSearchParams] = useSearchParams()
  const subjectFilter = searchParams.get('subject') ?? 'all'
  const typeFilter = searchParams.get('type') ?? 'all'
  const weekFilter = searchParams.get('week') ?? 'all'
  const searchQuery = searchParams.get('q') ?? ''
  const showHidden = searchParams.get('hidden') === '1'
  const setFilter = (name, value, defaultValue) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value === defaultValue || value === '' || value == null) next.delete(name)
      else next.set(name, value)
      return next
    }, { replace: true })
  }
  const setSubjectFilter = (value) => setFilter('subject', value, 'all')
  const setTypeFilter = (value) => setFilter('type', value, 'all')
  const setWeekFilter = (value) => setFilter('week', value, 'all')
  const setSearchQuery = (value) => setFilter('q', value, '')
  const setShowHidden = (value) => setFilter('hidden', value ? '1' : null, null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [previewResource, setPreviewResource] = useState(null)
  const previewParam = searchParams.get('preview')
  const shownPreview = previewResource
    ?? (previewParam ? (resources || []).find((r) => isSameId(r.id, previewParam)) ?? null : null)
  const closePreview = () => {
    setPreviewResource(null)
    if (previewParam) setFilter('preview', null, null)
  }
  // Adding a new semester link
  const [isAddingLink, setIsAddingLink] = useState(false)

  const semesterStarts = useMemo(() => buildSemesterStarts(events, subjects), [events, subjects])

  // Edit / move / delete / hide — shared with the subject detail
  const materialActions = useMaterialActions({
    subjects,
    events,
    semesterStarts,
    actions: {
      updateMaterial: onUpdateMaterial,
      assignEvent: onAssignEvent,
      updateSemesterLink: onUpdateResource,
      deleteResource: onDeleteResource,
      setHidden: onSetHidden,
      setForExam: onSetForExam,
    },
  })
  const menuFor = (resource) => {
    const items = materialActions.getMenuItems(resource)
    return items.length > 0 ? { label: materialActions.getMenuLabel(resource), items } : null
  }

  const hiddenCount = useMemo(() => (resources || []).filter(isHidden).length, [resources])
  const visibleResources = useMemo(
    () => (showHidden ? resources || [] : (resources || []).filter((r) => !isHidden(r))),
    [resources, showHidden]
  )

  const [presetEventId, setPresetEventId] = useState(null)
  const [presetSubjectId, setPresetSubjectId] = useState(null)

  const SUBJECT_OPTIONS = useMemo(() => [
    { value: 'all', label: t('resources:filters.allSubjects') },
    ...subjects.map(s => ({ value: String(s.id), label: s.name })),
    { value: OTHER_SUBJECT, label: t('resources:otherSubject') },
  ], [subjects, t])

  const TYPE_OPTIONS = [
    { value: 'all',       label: t('resources:filters.allTypes') },
    { value: 'PDF',       label: t('resources:typeLabels.PDF') },
    { value: 'NOTES',     label: t('resources:typeLabels.NOTES') },
    { value: 'SLIDES',    label: t('resources:typeLabels.SLIDES') },
    { value: 'RECORDING', label: t('resources:typeLabels.RECORDING') },
    { value: 'LINK',      label: t('resources:typeLabels.LINK') },
    { value: 'DOC',       label: t('resources:typeLabels.DOC') },
  ]

  const getWeekAndYear = (dateStr) => {
    if (!dateStr) return { week: 0, year: 0 }
    const d = new Date(dateStr)
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    const dayNum = date.getUTCDay() || 7
    date.setUTCDate(date.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
    const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
    return { week, year: date.getUTCFullYear() }
  }

  const currentWeekAndYear = useMemo(() => {
    return getWeekAndYear(new Date().toISOString().split('T')[0])
  }, [])

  // Semester week of every material (lesson week, otherwise the week it was added)
  const materialWeeks = useMemo(() => {
    const weeks = new Map()
    for (const r of visibleResources) {
      if (r.category === 'platform') continue
      weeks.set(r, getMaterialWeek(r, { events, subjects, semesterStarts }))
    }
    return weeks
  }, [visibleResources, events, subjects, semesterStarts])

  const currentWeekKey = useMemo(
    () => getSemesterWeekInfo(new Date(), null, semesterStarts)?.key ?? null,
    [semesterStarts]
  )
  const selectedWeekKey = weekFilter === 'current' ? currentWeekKey : weekFilter

  const filteredResources = useMemo(() => {
    let list = [...visibleResources]
    // Semester materials stay pinned whatever week is chosen
    if (weekFilter !== 'all') {
      list = list.filter(r => r.category === 'platform' || materialWeeks.get(r)?.key === selectedWeekKey)
    }
    if (subjectFilter === OTHER_SUBJECT) {
      list = list.filter(hasNoSubject)
    } else if (subjectFilter !== 'all') {
      list = list.filter(r => isSameId(getSubjectIdOf(r), subjectFilter))
    }
    if (typeFilter !== 'all') {
      list = list.filter(r => r.type === typeFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(r =>
        (r.title || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [visibleResources, subjectFilter, typeFilter, searchQuery, weekFilter, selectedWeekKey, materialWeeks])

  const eventResources = useMemo(() => {
    return filteredResources.filter(r => getEventIdOf(r) != null)
  }, [filteredResources])

  const eventSessions = useMemo(() => {
    const map = new Map()
    eventResources.forEach((res) => {
      const eId = getEventIdOf(res)
      if (!eId) return
      if (!map.has(eId)) {
        const ev = (events || []).find((e) => isSameId(e.id, eId))
        if (ev) {
          const sub = subjects.find((s) => isSameId(s.id, getSubjectIdOf(ev)))
          const { week, year } = getWeekAndYear(ev.date)
          map.set(eId, {
            event: ev,
            subject: sub,
            resources: [],
            week,
            year,
            date: ev.date || '',
          })
        }
      }
      if (map.has(eId)) {
        map.get(eId).resources.push(res)
      }
    })
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date))
  }, [eventResources, events, subjects])

  const weeklyGroups = useMemo(() => {
    const groupsMap = new Map()
    eventSessions.forEach((session) => {
      const key = `${session.year}-W${session.week}`
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          week: session.week,
          year: session.year,
          sessions: [],
        })
      }
      groupsMap.get(key).sessions.push(session)
    })
    return Array.from(groupsMap.values()).sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year
      return b.week - a.week
    })
  }, [eventSessions])

  const generalGrouped = useMemo(() => {
    const generalResources = filteredResources.filter(r => getEventIdOf(r) == null && r.category !== 'platform')
    const groups = subjects.map(subject => ({
      subject,
      items: generalResources.filter(r => isSameId(getSubjectIdOf(r), subject.id)),
    }))
    // Materials without a subject (e.g. Moodle courses outside the study plan) go to "Jiné".
    groups.push({ subject: null, items: generalResources.filter(hasNoSubject) })
    return groups.filter(g => g.items.length > 0)
  }, [filteredResources, subjects])

  const platformResources = useMemo(() => {
    return visibleResources.filter(r => r.category === 'platform')
  }, [visibleResources])

  const addSemesterLink = (values) => onUploadResource({ ...values, type: 'LINK', category: 'platform' })

  const formatEventDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString(getLocaleFromLanguage(i18n.language), {
      weekday: 'short',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric'
    })
  }

  // Weeks that have some material, ascending ("3. týden (5.–11. 10.)")
  const WEEK_OPTIONS = useMemo(() => {
    const locale = getLocaleFromLanguage(i18n.language)
    const englishRange = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })
    // cs "21.–27. 9." / "28. 9. – 4. 10.", en "Sep 21 – 27"
    const formatRange = (from, to) => {
      if (locale !== 'cs-CZ') return englishRange.formatRange(from, to)
      return from.getMonth() === to.getMonth()
        ? `${from.getDate()}.–${to.getDate()}. ${to.getMonth() + 1}.`
        : `${from.getDate()}. ${from.getMonth() + 1}. – ${to.getDate()}. ${to.getMonth() + 1}.`
    }
    const weeks = new Map()
    for (const info of materialWeeks.values()) {
      if (info && !weeks.has(info.key)) weeks.set(info.key, info)
    }
    const sorted = [...weeks.values()].sort((a, b) => a.from - b.from)
    const manySemesters = new Set(sorted.map((w) => w.semester)).size > 1
    return [
      { value: 'all', label: t('resources:weekFilter.all') },
      ...(currentWeekKey ? [{ value: 'current', label: t('resources:weekFilter.current') }] : []),
      ...sorted.map((w) => ({
        value: w.key,
        label: `${manySemesters ? `${w.semester} · ` : ''}${t('resources:weekFilter.option', {
          n: w.week,
          range: formatRange(w.from, w.to),
        })}`,
      })),
    ]
  }, [materialWeeks, currentWeekKey, i18n.language, t])

  const subjectLabel = SUBJECT_OPTIONS.find(o => o.value === subjectFilter)?.label ?? t('resources:filters.subjectFallback')
  const weekLabel = WEEK_OPTIONS.find(o => o.value === weekFilter)?.label ?? t('resources:weekFilter.fallback')
  const typeLabel    = TYPE_OPTIONS.find(o => o.value === typeFilter)?.label ?? t('resources:filters.typeFallback')

  return (
    <>
      <div className="w-full flex flex-col gap-8 font-inter pb-16">
        {/* Page Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 page-section">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-on-surface">{t('resources:library.title')}</h1>
            <p className="mt-1.5 text-sm text-on-surface-variant">{t('resources:library.subtitle')}</p>
          </div>

          <button
            onClick={() => {
              setPresetEventId(null)
              setPresetSubjectId(null)
              setIsModalOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary/90 cursor-pointer"
          >
            <Plus className="size-4" />
            <span>{t('resources:library.uploadButton')}</span>
          </button>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface p-3 sm:flex-row sm:items-center page-section">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder={t('resources:searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-outline-variant bg-surface-container-low py-2.5 pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/70 outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Dropdown label={subjectLabel} icon={SlidersHorizontal} options={SUBJECT_OPTIONS} value={subjectFilter} onChange={setSubjectFilter} />
          <Dropdown label={typeLabel}    icon={SlidersHorizontal} options={TYPE_OPTIONS}    value={typeFilter}    onChange={setTypeFilter} />
          <Dropdown label={weekLabel}    icon={CalendarDays}      options={WEEK_OPTIONS}    value={weekFilter}    onChange={setWeekFilter} menuClassName="max-h-80 overflow-y-auto" />
          {(hiddenCount > 0 || showHidden) && (
            <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-sm text-on-surface-variant select-none">
              <input
                type="checkbox"
                checked={showHidden}
                onChange={(e) => setShowHidden(e.target.checked)}
                className="size-4 accent-primary cursor-pointer"
              />
              <EyeOff className="size-4" aria-hidden="true" />
              {t('resources:materialActions.showHidden', { count: hiddenCount })}
            </label>
          )}
        </div>

        {/* Two Columns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* LEFT COLUMN: Timeline & Other Materials */}
          <div className="lg:col-span-2 flex flex-col gap-10">
            {weeklyGroups.length === 0 && generalGrouped.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-outline-variant bg-surface/50 p-16 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-surface-container-low text-primary rounded-full flex items-center justify-center">
                  <Icon icon={FolderOpen} size="lg" />
                </div>
                {weekFilter !== 'all' ? (
                  <>
                    <p className="text-lg font-semibold text-on-surface">{t('resources:weekFilter.empty')}</p>
                    <button
                      type="button"
                      onClick={() => setWeekFilter('all')}
                      className="mt-1 inline-flex items-center gap-2 rounded-xl border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary cursor-pointer bg-transparent"
                    >
                      <X className="size-4" aria-hidden="true" />
                      {t('resources:weekFilter.clear')}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-on-surface">{t('resources:emptyState.title')}</p>
                    <p className="text-sm text-on-surface-variant">{t('resources:emptyState.description')}</p>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Timeline */}
                {weeklyGroups.map((group) => {
                  const isCurrent = group.week === currentWeekAndYear.week && group.year === currentWeekAndYear.year
                  // Groups are calendar (ISO) weeks; teachers count weeks of the semester
                  const firstSession = group.sessions[0]
                  const semesterWeek = firstSession
                    ? getSemesterWeek(firstSession.date, firstSession.subject?.semester, semesterStarts)
                    : null
                  return (
                    <section key={`${group.year}-W${group.week}`}>
                      {/* Week Heading */}
                      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <h2 className="text-lg font-semibold text-on-surface">
                          {isCurrent
                            ? t('resources:library.thisWeek')
                            : semesterWeek
                              ? t('resources:lessons.semesterWeekHeading', { n: semesterWeek })
                              : t('resources:library.weekLabel', { n: group.week })}
                        </h2>
                        {isCurrent && semesterWeek && (
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                            {t('resources:lessons.semesterWeekHeading', { n: semesterWeek })}
                          </span>
                        )}
                        <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-xs font-medium text-on-surface-variant">
                          {t('resources:lessons.calendarWeek', { n: group.week })}
                        </span>
                        <span className="h-px flex-1 bg-outline-variant" />
                      </div>

                      {/* Sessions within this week */}
                      <div className="relative flex flex-col gap-5 pl-6">
                        <span
                          aria-hidden="true"
                          className="absolute left-[7px] top-2 bottom-2 w-px bg-outline-variant"
                        />
                        {group.sessions.map((session) => {
                          const color = getSubjectColor(session.subject)
                          // STAG sends Czech types ("Přednáška"), manual events English ones ("Lecture")
                          const typeKey = getLessonTypeKey(session.event.type)
                          const TypeIcon = typeKey === 'lecture' ? GraduationCap : Users
                          const eventTypeLabel = typeKey
                            ? t(`resources:lessons.types.${typeKey}`)
                            : t(`dashboard:timetable.eventTypes.${session.event.type}`, session.event.type)

                          return (
                            <div key={session.event.id} className="relative">
                              <span
                                aria-hidden="true"
                                className="absolute -left-[22px] top-6 size-3.5 rounded-full border-2 border-surface bg-primary ring-4 ring-primary/15"
                              />

                              {/* Card */}
                              <article className="rounded-2xl border border-outline-variant bg-surface transition-colors hover:border-outline-variant/70">
                                {/* Header */}
                                <header className="flex flex-col gap-2.5 border-b border-outline-variant/60 p-5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${color.bg} ${color.text}`}>
                                      <span className="font-mono">{session.subject?.code}</span>
                                      <span className="hidden font-normal opacity-80 sm:inline">{session.subject?.name}</span>
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low px-2.5 py-1 text-xs font-medium text-on-surface-variant">
                                      <TypeIcon className="size-4" />
                                      {eventTypeLabel}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h3 className="text-base font-semibold text-on-surface">
                                      {session.event.title}
                                    </h3>
                                    <p className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                                      <CalendarDays className="size-4" />
                                      {formatEventDate(session.event.date)}
                                    </p>
                                  </div>
                                </header>

                                {/* Materials list */}
                                <div className="flex flex-col gap-0.5 p-3">
                                  {session.resources.map((res) => {
                                    const isLink = res.type === 'LINK'
                                    const handleOpen = () => {
                                      if (isLink || !getPreviewInfo(res).canPreview) {
                                        window.open(res.url, '_blank', 'noopener,noreferrer')
                                      } else {
                                        setPreviewResource(res)
                                      }
                                    }
                                    return (
                                      <ResourceRow
                                        key={res.id}
                                        resource={res}
                                        onOpen={handleOpen}
                                        menu={menuFor(res)}
                                      />
                                    )
                                  })}
                                </div>

                                {/* Add own material button */}
                                <footer className="border-t border-outline-variant/60 px-3 py-2.5">
                                  <button
                                    onClick={() => {
                                      setPresetEventId(session.event.id)
                                      setPresetSubjectId(session.event.subjectId)
                                      setIsModalOpen(true)
                                    }}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant px-3 py-2 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary cursor-pointer bg-transparent"
                                  >
                                    <Plus className="size-4" />
                                    <span>{t('resources:library.addCustom')}</span>
                                  </button>
                                </footer>
                              </article>
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  )
                })}

                {/* General materials (Other) */}
                {generalGrouped.length > 0 && (
                  <section className="flex flex-col gap-6">
                    <h2 className="text-lg font-semibold text-on-surface border-b border-outline-variant pb-2">
                      {t('resources:library.otherMaterials')}
                    </h2>
                    {generalGrouped.map(({ subject, items }) => (
                      <div key={subject?.id ?? OTHER_SUBJECT} className="flex flex-col gap-4">
                        <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
                          <Icon icon={FolderOpen} className="text-on-surface-variant" />
                          {subject ? (
                            <>{subject.name} <span className="text-xs text-on-surface-variant font-medium">({subject.code})</span></>
                          ) : t('resources:otherSubject')}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {items.map(r => (
                            <ResourceCard
                              key={r.id}
                              resource={r}
                              subjectName={subject?.name ?? t('resources:otherSubject')}
                              t={t}
                              onPreview={(res) => setPreviewResource(res)}
                              menu={menuFor(r)}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </section>
                )}
              </>
            )}
          </div>

          {/* RIGHT COLUMN: Pinned Semestrální materiály */}
          <aside
            aria-label={t('resources:library.semesterMaterials')}
            className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-5 lg:sticky lg:top-8 page-section"
          >
            <div className="mb-3 flex items-center gap-2">
              <Pin className="size-4 text-primary" />
              <h2 className="text-sm font-semibold text-on-surface">{t('resources:library.semesterMaterials')}</h2>
            </div>
            <p className="mb-4 text-xs text-on-surface-variant/80">
              {t('resources:library.semesterMaterialsSubtitle')}
            </p>

            <div className="flex flex-col gap-2.5">
              {platformResources.length === 0 ? (
                <p className="text-sm text-on-surface-variant italic text-center py-6">{t('resources:semesterLinks.empty')}</p>
              ) : (
                platformResources.map((res) => (
                  <SemesterLinkItem
                    key={res.id ?? res.url}
                    resource={res}
                    subject={subjects.find((s) => isSameId(s.id, getSubjectIdOf(res)))}
                    menu={menuFor(res)}
                    onSeen={() => isPersistedId(res.id) && onMarkSeen?.(res.id)?.catch((err) => console.error(err))}
                  />
                ))
              )}
            </div>

            <div className="mt-4 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddingLink(true)}
                disabled={subjects.length === 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant px-3 py-2 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary cursor-pointer bg-transparent disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="size-4" />
                <span>{t('resources:semesterLinks.add')}</span>
              </button>
              {departmentLinks?.supported && <RefreshLinksButton departmentLinks={departmentLinks} />}
            </div>
          </aside>
        </div>
      </div>

      {/* Upload Modal */}
      {isModalOpen && (
        <UploadModal
          onClose={() => {
            setIsModalOpen(false)
            setPresetEventId(null)
            setPresetSubjectId(null)
          }}
          onSave={onUploadResource}
          subjects={subjects}
          events={events}
          semesterStarts={semesterStarts}
          presetEventId={presetEventId}
          presetSubjectId={presetSubjectId}
        />
      )}

      {/* Edit / move modals of the material actions */}
      {materialActions.modals}

      {/* New semester link */}
      {isAddingLink && (
        <SemesterLinkModal
          link={null}
          subjects={subjects}
          onClose={() => setIsAddingLink(false)}
          onSave={addSemesterLink}
        />
      )}

      {/* Preview Modal */}
      {shownPreview && (
        <ResourcePreviewModal resource={shownPreview} onClose={closePreview} />
      )}
    </>
  )
}

export default ResourcesView