import { useState, useRef, useEffect } from 'react'
import { renderAsync } from 'docx-preview'
import { useTranslation } from 'react-i18next'
import { Download, File, X } from 'lucide-react'
import { getPreviewInfo, resolveResourceUrl } from '../../utils/materialPreview'

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
    <div className="fixed inset-0 bg-scrim/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
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
              <Download className="size-4" />
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
                    <File className="w-12 h-12 text-error mb-3" />
                    <p className="text-sm text-error font-semibold mb-1">{t('resources:preview.failedRenderDocument')}</p>
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

export default ResourcePreviewModal
