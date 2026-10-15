import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { File } from 'lucide-react'
// Legacy build: runs on older mobile Safari/Chrome too
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.min.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

// Sharp enough on phones without huge canvases on 3x screens
const MAX_PIXEL_RATIO = 2


const PdfPage = ({ doc, pageNumber, width, scrollRoot }) => {
  const wrapperRef = useRef(null)
  const canvasRef = useRef(null)
  const [aspect, setAspect] = useState(Math.SQRT2)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = wrapperRef.current
    if (!el || visible) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { root: scrollRoot, rootMargin: '600px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [scrollRoot, visible])

  useEffect(() => {
    if (!visible || !width) return
    let task = null
    let active = true
    doc.getPage(pageNumber).then((page) => {
      if (!active) return
      const base = page.getViewport({ scale: 1 })
      setAspect(base.height / base.width)
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
      const viewport = page.getViewport({ scale: (width / base.width) * ratio })
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      task = page.render({ canvasContext: canvas.getContext('2d'), viewport })
      task.promise.catch(() => {})
    }).catch(() => {})
    return () => {
      active = false
      task?.cancel()
    }
  }, [doc, pageNumber, visible, width])

  return (
    <div
      ref={wrapperRef}
      className="bg-white shadow-sm"
      style={{ width, height: width ? width * aspect : undefined }}
    >
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  )
}

/** PDF drawn with pdf.js, pages rendered lazily as they scroll near the viewport. */
const PdfCanvasViewer = ({ url }) => {
  const { t } = useTranslation('resources')
  const [scrollEl, setScrollEl] = useState(null)
  const [state, setState] = useState({ url: null, doc: null, error: false })
  const [width, setWidth] = useState(0)

  useEffect(() => {
    let active = true
    const task = pdfjs.getDocument({ url })
    task.promise
      .then((doc) => { if (active) setState({ url, doc, error: false }) })
      .catch(() => { if (active) setState({ url, doc: null, error: true }) })
    return () => {
      active = false
      void task.destroy()
    }
  }, [url])

  useEffect(() => {
    if (!scrollEl) return
    const observer = new ResizeObserver(([entry]) => {
      // Content box, i.e. without the padding
      setWidth(Math.floor(entry.contentRect.width))
    })
    observer.observe(scrollEl)
    return () => observer.disconnect()
  }, [scrollEl])

  const loaded = state.url === url
  const doc = loaded ? state.doc : null

  return (
    <div ref={setScrollEl} className="size-full overflow-auto bg-surface-container-low p-2 self-stretch">
      {!loaded && (
        <div className="flex h-full items-center justify-center">
          <span className="text-sm font-medium text-on-surface-variant">{t('resources:preview.renderingDocument')}</span>
        </div>
      )}
      {loaded && state.error && (
        <div className="flex h-full flex-col items-center justify-center text-center p-8">
          <File className="w-12 h-12 text-error mb-3" />
          <p className="text-sm text-error font-semibold">{t('resources:preview.failedRenderDocument')}</p>
        </div>
      )}
      {doc && (
        <div className="flex flex-col items-center gap-2">
          {Array.from({ length: doc.numPages }, (_, i) => (
            <PdfPage key={i} doc={doc} pageNumber={i + 1} width={width} scrollRoot={scrollEl} />
          ))}
        </div>
      )}
    </div>
  )
}

export default PdfCanvasViewer
