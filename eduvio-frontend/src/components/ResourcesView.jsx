/* eslint-disable no-unused-vars */
import { useState, useMemo, useRef, useEffect } from 'react'
import { renderAsync } from 'docx-preview'
import { useTranslation } from 'react-i18next'
import {
  Download,
  ExternalLink,
  Eye,
  ChevronDown,
  Search,
  Plus,
  X,
  Check,
  Pin,
  Users,
  GraduationCap,
  CalendarDays,
  File,
} from "lucide-react"
import pdfIcon from '../assets/icons/pdf.png'
import bookIcon from '../assets/icons/book.png'
import imageIcon from '../assets/icons/image.png'
import fileIcon from '../assets/icons/file.png'
import folderIcon from '../assets/icons/folder.png'
import CustomIcon from './CustomIcon'
import { getSubjectColor } from '../utils/subjectColors'
import { getLocaleFromLanguage } from '../utils/locale'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:80/api"

const MATERIAL_ICONS = {
  PDF: pdfIcon,
  NOTES: bookIcon,
  SLIDES: imageIcon,
  RECORDING: fileIcon,
  LINK: folderIcon,
  DOC: fileIcon,
}

const MaterialTypeIcon = ({ type, className = 'w-4.5 h-4.5' }) => (
  <img
    src={MATERIAL_ICONS[type] || fileIcon}
    alt=""
    aria-hidden="true"
    className={`${className} object-contain`}
  />
)

const resolveResourceUrl = (url) => {
  if (!url) return ""
  if (!import.meta.env.DEV) return url

  try {
    const parsed = new URL(url, window.location.origin)
    const backend = new URL(API_BASE_URL, window.location.origin)

    if (parsed.origin === backend.origin && parsed.pathname.startsWith("/storage/")) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    }
  } catch {
    // Fall back to the original URL when parsing fails.
  }

  return url
}

// ─── Type Config (colored icon tints, one per material type) ─
const TYPE_CONFIG = {
  PDF:       { Icon: (props) => <MaterialTypeIcon type="PDF" {...props} />,       iconBg: 'bg-red-500/10',     iconColor: 'text-red-500',     badgeBg: 'bg-surface-container-low', badgeText: 'text-on-surface-variant' },
  NOTES:     { Icon: (props) => <MaterialTypeIcon type="NOTES" {...props} />,     iconBg: 'bg-amber-500/10',   iconColor: 'text-amber-500',   badgeBg: 'bg-surface-container-low', badgeText: 'text-on-surface-variant' },
  SLIDES:    { Icon: (props) => <MaterialTypeIcon type="SLIDES" {...props} />,    iconBg: 'bg-indigo-500/10',  iconColor: 'text-indigo-500',  badgeBg: 'bg-surface-container-low', badgeText: 'text-on-surface-variant' },
  RECORDING: { Icon: (props) => <MaterialTypeIcon type="RECORDING" {...props} />, iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', badgeBg: 'bg-surface-container-low', badgeText: 'text-on-surface-variant' },
  LINK:      { Icon: (props) => <MaterialTypeIcon type="LINK" {...props} />,      iconBg: 'bg-sky-500/10',     iconColor: 'text-sky-500',     badgeBg: 'bg-surface-container-low', badgeText: 'text-on-surface-variant' },
  DOC:       { Icon: (props) => <MaterialTypeIcon type="DOC" {...props} />,       iconBg: 'bg-blue-500/10',    iconColor: 'text-blue-500',    badgeBg: 'bg-surface-container-low', badgeText: 'text-on-surface-variant' },
}

const getTypeConfig = (type) => TYPE_CONFIG[type] ?? TYPE_CONFIG['DOC']

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

const getPreviewInfo = (resource) => {
  const rawUrl = resource.url || ""
  const source = resource.fileName || resource.file_name || rawUrl
  const ext = source.split(".").pop()?.toLowerCase() || ""
  const isRemote = /^https?:\/\//i.test(rawUrl)
  const isStorageUrl = rawUrl.includes("/storage/")
  if (['jpg','jpeg','png','gif','svg','webp'].includes(ext)) return { canPreview: true, type: 'image' }
  if (ext === 'pdf') return { canPreview: true, type: 'pdf' }
  if (['txt','md'].includes(ext)) return { canPreview: true, type: 'text' }
  if (['mp4','webm','mov'].includes(ext)) return { canPreview: true, type: 'video' }
  if (ext === 'docx') return { canPreview: true, type: 'office-docx' }
  if (['doc','ppt','pptx'].includes(ext) && isRemote && !isStorageUrl) return { canPreview: true, type: 'office-remote' }
  if (['docx','ppt','pptx'].includes(ext) && isRemote && !isStorageUrl) return { canPreview: true, type: 'office-remote' }
  if (['doc','ppt','pptx'].includes(ext)) return { canPreview: true, type: 'office-local' }
  return { canPreview: false, type: 'unsupported' }
}

const TagChip = ({ label }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low px-2.5 py-1 text-[11px] font-semibold text-on-surface-variant">
    {label}
  </span>
)

// ─── Recent Resource Card (horizontal compact) ───────────────
const RecentCard = ({ resource, subjectName, t }) => {
  const cfg = getTypeConfig(resource.type)
  const { Icon } = cfg
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface p-4 flex flex-col gap-3 flex-1 min-w-[220px] max-w-sm transition-colors hover:border-outline-variant/80">
      <div className="flex items-start justify-between">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${cfg.iconBg} ${cfg.iconColor}`}>
          <Icon className="w-4.5 h-4.5" />
        </span>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${cfg.badgeBg} ${cfg.badgeText}`}>
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
const ResourceRow = ({ resource, onOpen }) => {
  const cfg = getTypeConfig(resource.type)
  const isLink = resource.type === 'LINK'

  return (
    <div
      onClick={onOpen}
      className="group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-outline-variant hover:bg-surface-container-low/50 cursor-pointer"
    >
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${cfg.iconBg} ${cfg.iconColor}`}>
        <MaterialTypeIcon type={resource.type} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-on-surface">{resource.title}</p>
        <p className="text-[11px] text-on-surface-variant/70">
          {isLink ? 'Externí odkaz' : resource.size || 'Soubor'}
        </p>
      </div>

      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant opacity-100 transition-all hover:bg-primary/15 hover:text-primary md:opacity-0 md:group-hover:opacity-100">
        {isLink ? <ExternalLink className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </span>
    </div>
  )
}

// ─── Full Resource Card (grid, "Other materials" section) ────
const ResourceCard = ({ resource, subjectName, onPreview, t }) => {
  const cfg = getTypeConfig(resource.type)
  const { Icon } = cfg
  const isLink = resource.type === "LINK"
  const previewInfo = getPreviewInfo(resource)
  const url = resolveResourceUrl(resource.url)

  const handleOpen = () => {
    if (isLink || !previewInfo.canPreview) {
      window.open(resource.url, '_blank', 'noopener,noreferrer')
    } else {
      onPreview(resource)
    }
  }

  const displayDate = resource.uploadDate || (resource.uploadedAt ? resource.uploadedAt.split('T')[0] : '')

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface transition-colors hover:border-outline-variant/70 font-inter">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 p-4 pb-3">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${cfg.iconBg} ${cfg.iconColor}`}>
          <Icon className="w-4.5 h-4.5" />
        </span>
        <div className="flex flex-wrap gap-1.5 justify-end">
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
            <a
              href={url}
              download
              target="_blank"
              rel="noreferrer"
              className="flex size-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-primary/15 hover:text-primary"
              title={t('resources:actions.download')}
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={handleOpen}
            className="flex size-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-primary/15 hover:text-primary cursor-pointer bg-transparent border-0"
            title={t('resources:actions.open')}
          >
            {isLink || !previewInfo.canPreview ? <ExternalLink className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  )
}

const subCode = (subjName) => {
  if (subjName.includes('Database')) return 'DBS';
  if (subjName.includes('Web')) return 'WA';
  if (subjName.includes('Programming')) return 'PROG';
  if (subjName.includes('Operating')) return 'OS';
  if (subjName.includes('Software')) return 'SE';
  if (subjName.includes('Network')) return 'NET';
  return '';
};

// ─── Upload Modal ────────────────────────────────────────────
const UploadModal = ({ onClose, onSave, subjects, presetEventId, presetSubjectId }) => {
  const { t } = useTranslation('resources')
  const [form, setForm] = useState({
    title: '',
    subjectId: presetSubjectId ? String(presetSubjectId) : (subjects[0]?.id || ''),
    type: 'PDF',
    description: ''
  })
  const [sourceType, setSourceType] = useState('local')
  const [file, setFile] = useState(null)
  const [remoteUrl, setRemoteUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subjectId) return;
    const title = form.title.trim() || (file?.name ?? '')
    if (!title) return;

    const payload = {
      subjectId: Number(form.subjectId),
      title,
      type: sourceType === 'local' ? getTypeFromFileName(file.name) : form.type,
      description: form.description || (sourceType === 'local' ? t('resources:defaults.localDescription') : t('resources:defaults.urlDescription')),
    }
    if (presetEventId) {
      payload.eventId = Number(presetEventId);
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl border border-outline-variant w-full max-w-md overflow-hidden font-inter">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface">
          <h2 className="text-lg font-semibold text-on-surface">{t('resources:modal.title')}</h2>
          <button onClick={onClose} disabled={isSubmitting} className="p-1 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface cursor-pointer bg-transparent border-0 disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {submitError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-500">
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
              <select value={form.subjectId} onChange={set('subjectId')} disabled={isSubmitting} className={inputCls}>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
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

// ─── Preview Modal ────────────────────────────────────────────
const ResourcePreviewModal = ({ resource, onClose }) => {
  const { t } = useTranslation('resources')
  const [textContent, setTextContent] = useState('')
  const [loadingText, setLoadingText] = useState(false)
  const [textError, setTextError] = useState(null)
  const [loadingDocx, setLoadingDocx] = useState(false)
  const [docxError, setDocxError] = useState(null)
  const renderedDocxUrlRef = useRef(null)

  const previewInfo = resource ? getPreviewInfo(resource) : { canPreview: false, type: 'unsupported' }
  const url = resolveResourceUrl(resource?.url || "")

  useEffect(() => {
    if (previewInfo.type !== 'text' || !url) return

    let active = true
    const loadText = async () => {
      setLoadingText(true)
      setTextError(null)
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error('preview.loadTextError')
        const text = await res.text()
        if (!active) return
        setTextContent(text)
      } catch (err) {
        if (!active) return
        setTextError(err.message)
      } finally {
        if (active) setLoadingText(false)
      }
    }

    void loadText()
    return () => {
      active = false
    }
  }, [previewInfo.type, url])

  const docxCallbackRef = (container) => {
    if (!container || previewInfo.type !== 'office-docx' || !url) return
    if (renderedDocxUrlRef.current === url) return

    renderedDocxUrlRef.current = url
    setLoadingDocx(true)
    setDocxError(null)
    container.innerHTML = ''
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('preview.loadDocxError')
        return res.arrayBuffer()
      })
      .then((data) => renderAsync(data, container, undefined, {
        className: 'docx-preview-container',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        useBase64URL: true,
      }))
      .then(() => setLoadingDocx(false))
      .catch((err) => {
        renderedDocxUrlRef.current = null
        setDocxError(err.message)
        setLoadingDocx(false)
      })
  }

  if (!resource) return null

  const docPreviewUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-2xl shadow-2xl border border-outline-variant w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden font-inter">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-semibold text-on-surface truncate">{resource.title}</h2>
            <span className="inline-flex items-center rounded-full bg-surface-container-low px-2.5 py-1 text-[10px] font-semibold text-on-surface-variant">
              {resource.type}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={url}
              download
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant hover:bg-surface-container rounded-xl text-sm font-semibold text-on-surface transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('resources:actions.download')}</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface cursor-pointer bg-transparent border-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-surface-container-low overflow-hidden p-6 flex flex-col">
          <div className="mb-4 shrink-0">
            <p className="text-sm font-semibold text-on-surface">{resource.title}</p>
            <p className="text-sm text-on-surface-variant">{resource.description}</p>
          </div>

          <div className="flex-1 bg-surface rounded-2xl overflow-hidden border border-outline-variant flex items-center justify-center relative">
            {previewInfo.type === 'image' && (
              <img src={url} alt={resource.title} className="w-full h-full object-contain" />
            )}

            {previewInfo.type === 'pdf' && (
              <iframe src={url} title={resource.title} className="w-full h-full border-0" />
            )}

            {previewInfo.type === 'video' && (
              <video controls src={url} className="max-w-full max-h-full" />
            )}

            {previewInfo.type === 'text' && (
              <div className="w-full h-full overflow-auto p-6 bg-surface self-stretch text-left">
                {loadingText ? (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-on-surface-variant font-medium">{t('resources:preview.loadingText')}</span>
                  </div>
                ) : textError ? (
                  <div className="flex items-center justify-center h-full text-error font-medium">
                    <span>{t(`resources:${textError}`, t('resources:preview.loadTextError'))}</span>
                  </div>
                ) : (
                  <pre className="text-sm font-mono whitespace-pre-wrap text-on-surface">
                    {textContent}
                  </pre>
                )}
              </div>
            )}

            {previewInfo.type === 'office-remote' && (
              <iframe src={docPreviewUrl} title={resource.title} className="w-full h-full border-0" />
            )}

            {previewInfo.type === 'office-docx' && (
              <div className="w-full h-full overflow-auto bg-surface-container-low relative">
                {loadingDocx && (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface/90 z-10">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="text-sm font-medium text-on-surface-variant">{t('resources:preview.renderingDocument')}</span>
                    </div>
                  </div>
                )}
                {docxError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                    <File className="w-12 h-12 text-red-500 mb-3" />
                    <p className="text-sm text-red-500 font-semibold mb-1">{t('resources:preview.failedRenderDocument')}</p>
                    <p className="text-sm text-on-surface-variant mb-4">{docxError}</p>
                    <a href={url} download className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm">
                      <Download className="w-4 h-4" />
                      <span>{t('resources:actions.downloadFile')}</span>
                    </a>
                  </div>
                )}
                <div
                  ref={docxCallbackRef}
                  className="w-full h-full"
                />
              </div>
            )}

            {previewInfo.type === 'office-local' && (
              <div className="flex flex-col items-center justify-center text-center p-8">
                <File className="w-16 h-16 text-on-surface-variant mb-4" />
                <p className="text-sm text-on-surface font-semibold mb-2">{t('resources:preview.directPreviewLocalOffice')}</p>
                <p className="text-sm text-on-surface-variant mb-4">{t('resources:preview.pleaseDownload')}</p>
                <a
                  href={url}
                  download
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>{t('resources:actions.downloadFile')}</span>
                </a>
              </div>
            )}

            {previewInfo.type === 'unsupported' && (
              <div className="flex flex-col items-center justify-center text-center p-8">
                <File className="w-16 h-16 text-on-surface-variant mb-4" />
                <p className="text-sm text-on-surface mb-4">{t('resources:preview.noPreview')}</p>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary rounded-xl text-sm font-semibold transition-colors shadow-sm"
                >
                  {t('resources:openInNewTab')}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const Dropdown = ({ label, icon: Icon, options, value, onChange }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3.5 py-2 bg-surface border border-outline-variant rounded-xl text-sm font-medium text-on-surface hover:border-primary/40 transition-colors cursor-pointer"
      >
        {Icon && <Icon className="w-3.5 h-3.5 text-on-surface-variant" />}
        {label}
        <ChevronDown className={`w-3.5 h-3.5 text-on-surface-variant transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 bg-surface border border-outline-variant rounded-xl shadow-lg min-w-[160px] py-1 overflow-hidden">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                value === opt.value ? 'text-primary bg-primary/10' : 'text-on-surface hover:bg-surface-container-low'
              }`}
            >
              {opt.label}
              {value === opt.value && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main ResourcesView Component ────────────────────────────
const ResourcesView = ({ resources, subjects, events, onUploadResource }) => {
  const { t, i18n } = useTranslation(['resources', 'dashboard'])
  const [searchQuery, setSearchQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [previewResource, setPreviewResource] = useState(null)

  const [presetEventId, setPresetEventId] = useState(null)
  const [presetSubjectId, setPresetSubjectId] = useState(null)

  const SUBJECT_OPTIONS = useMemo(() => [
    { value: 'all', label: t('resources:filters.allSubjects') },
    ...subjects.map(s => ({ value: String(s.id), label: s.name })),
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

  const filteredResources = useMemo(() => {
    let list = [...(resources || [])]
    if (subjectFilter !== 'all') {
      list = list.filter(r => String(r.subjectId) === subjectFilter)
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
  }, [resources, subjectFilter, typeFilter, searchQuery])

  const eventResources = useMemo(() => {
    return filteredResources.filter(r => r.eventId || r.event_id)
  }, [filteredResources])

  const eventSessions = useMemo(() => {
    const map = new Map()
    eventResources.forEach((res) => {
      const eId = res.eventId || res.event_id
      if (!eId) return
      if (!map.has(eId)) {
        const ev = (events || []).find((e) => e.id === eId || e.id === Number(eId))
        if (ev) {
          const sub = subjects.find((s) => s.id === ev.subjectId)
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
    const generalResources = filteredResources.filter(r => !r.eventId && !r.event_id && r.category !== 'platform')
    return subjects
      .map(subject => ({
        subject,
        items: generalResources.filter(r => r.subjectId === subject.id),
      }))
      .filter(g => g.items.length > 0)
  }, [filteredResources, subjects])

  const platformResources = useMemo(() => {
    return (resources || []).filter(r => r.category === 'platform')
  }, [resources])

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

  const subjectLabel = SUBJECT_OPTIONS.find(o => o.value === subjectFilter)?.label ?? t('resources:filters.subjectFallback')
  const typeLabel    = TYPE_OPTIONS.find(o => o.value === typeFilter)?.label ?? t('resources:filters.typeFallback')

  return (
    <>
      <div className="w-full flex flex-col gap-8 font-inter pb-16">
        {/* Page Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
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
        <div className="flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface p-3 sm:flex-row sm:items-center">
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
          <Dropdown label={subjectLabel} icon={null} options={SUBJECT_OPTIONS} value={subjectFilter} onChange={setSubjectFilter} />
          <Dropdown label={typeLabel}    icon={null} options={TYPE_OPTIONS}    value={typeFilter}    onChange={setTypeFilter} />
        </div>

        {/* Two Columns Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* LEFT COLUMN: Timeline & Other Materials */}
          <div className="lg:col-span-2 flex flex-col gap-10">
            {weeklyGroups.length === 0 && generalGrouped.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-outline-variant bg-surface/50 p-16 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-surface-container-low text-primary rounded-full flex items-center justify-center">
                  <CustomIcon name="book" className="w-6 h-6" />
                </div>
                <p className="text-lg font-semibold text-on-surface">{t('resources:emptyState.title')}</p>
                <p className="text-sm text-on-surface-variant">{t('resources:emptyState.description')}</p>
              </div>
            ) : (
              <>
                {/* Timeline */}
                {weeklyGroups.map((group) => {
                  const isCurrent = group.week === currentWeekAndYear.week && group.year === currentWeekAndYear.year
                  return (
                    <section key={`${group.year}-W${group.week}`}>
                      {/* Week Heading */}
                      <div className="mb-4 flex items-center gap-3">
                        <h2 className="text-lg font-semibold text-on-surface">
                          {isCurrent ? t('resources:library.thisWeek') : t('resources:library.weekLabel', { n: group.week })}
                        </h2>
                        <span className="rounded-full bg-surface-container-high px-2.5 py-0.5 text-xs font-medium text-on-surface-variant">
                          {t('resources:library.weekLabel', { n: group.week })}
                        </span>
                        <span className="h-px flex-1 bg-outline-variant" />
                      </div>

                      {/* Sessions within this week */}
                      <div className="relative flex flex-col gap-5 pl-6">
                        <span
                          aria-hidden="true"
                          className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-outline-variant via-outline-variant to-transparent"
                        />
                        {group.sessions.map((session) => {
                          const color = getSubjectColor(session.subject)
                          const isLecture = session.event.type === 'Lecture'
                          const TypeIcon = isLecture ? GraduationCap : Users
                          const eventTypeLabel = isLecture
                            ? t('dashboard:timetable.eventTypes.Lecture')
                            : t('dashboard:timetable.eventTypes.Lab')

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
                                      <TypeIcon className="size-3.5" />
                                      {eventTypeLabel}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h3 className="text-base font-semibold text-on-surface">
                                      {session.event.title}
                                    </h3>
                                    <p className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                                      <CalendarDays className="size-3.5" />
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
                                    return <ResourceRow key={res.id} resource={res} onOpen={handleOpen} />
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
                      <div key={subject.id} className="flex flex-col gap-4">
                        <h3 className="text-sm font-semibold text-on-surface flex items-center gap-2">
                          <CustomIcon name="folder" className="w-4 h-4" />
                          {subject.name} <span className="text-xs text-on-surface-variant font-medium">({subject.code})</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {items.map(r => (
                            <ResourceCard
                              key={r.id}
                              resource={r}
                              subjectName={subject.name}
                              t={t}
                              onPreview={(res) => setPreviewResource(res)}
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
            className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-5 lg:sticky lg:top-8"
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
                <p className="text-sm text-on-surface-variant italic text-center py-6">Žádné semestrální materiály.</p>
              ) : (
                platformResources.map((res) => {
                  const cfg = getTypeConfig(res.type)
                  const isLink = res.type === 'LINK'
                  const url = resolveResourceUrl(res.url)
                  const handleOpen = () => {
                    window.open(res.url || url, '_blank', 'noopener,noreferrer')
                  }

                  return (
                    <div
                      key={res.id}
                      onClick={handleOpen}
                      className="group flex items-start gap-3 rounded-xl border border-outline-variant bg-surface p-3 transition-colors hover:border-primary/40 hover:bg-surface/80 cursor-pointer"
                    >
                      <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${cfg.iconBg} ${cfg.iconColor}`}>
                        {isLink ? <ExternalLink className="w-4.5 h-4.5" /> : <MaterialTypeIcon type={res.type} />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-on-surface">{res.title}</p>
                        {res.description && (
                          <p className="truncate text-xs text-on-surface-variant/80">{res.description}</p>
                        )}
                      </div>
                      <ExternalLink className="ml-auto size-3.5 shrink-0 text-on-surface-variant opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  )
                })
              )}
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
          presetEventId={presetEventId}
          presetSubjectId={presetSubjectId}
        />
      )}

      {/* Preview Modal */}
      {previewResource && (
        <ResourcePreviewModal resource={previewResource} onClose={() => setPreviewResource(null)} />
      )}
    </>
  )
}

export default ResourcesView