/**
 * How a material is opened: in-app preview (by file extension) or a new tab.
 * Shared by the Materials page and the dashboard box of recent materials.
 *
 * Uploaded files live in private storage: they are fetched with the Bearer
 * token as a Blob (loadMaterialFile / downloadMaterialFile), never through a
 * plain link. So they always open in the preview, which offers a download
 * for types it cannot show.
 */
import * as api from '../services/api'
import { hasPrivateFile } from './materialKinds'

export const getPreviewInfo = (resource) => {
  const rawUrl = resource.url || ""
  const source = resource.fileName || resource.file_name || rawUrl
  const ext = source.split(".").pop()?.toLowerCase() || ""
  const ownFile = hasPrivateFile(resource)
  // Office Online can only open files on the public internet: not ours (private, or the
  // old /storage/ address of files uploaded before the move to private storage)
  const isRemote = /^https?:\/\//i.test(rawUrl) && !ownFile && !rawUrl.includes("/storage/")
  if (['jpg','jpeg','png','gif','svg','webp'].includes(ext)) return { canPreview: true, type: 'image' }
  if (ext === 'pdf') return { canPreview: true, type: 'pdf' }
  if (['txt','md'].includes(ext)) return { canPreview: true, type: 'text' }
  if (['mp4','webm','mov'].includes(ext)) return { canPreview: true, type: 'video' }
  if (ext === 'docx') return { canPreview: true, type: 'office-docx' }
  if (['doc','docx','ppt','pptx'].includes(ext) && isRemote) return { canPreview: true, type: 'office-remote' }
  if (['doc','ppt','pptx'].includes(ext)) return { canPreview: true, type: 'office-local' }
  // Own files cannot be opened by address: the preview shows a download button instead
  return { canPreview: ownFile, type: 'unsupported' }
}

/**
 * Mobile browsers can't show a PDF inside an iframe (Android Chrome shows
 * nothing, iOS only the first page), so there it is drawn with pdf.js.
 */
export const needsCanvasPdfViewer = () => {
  if (typeof window === 'undefined') return false
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false
  return coarsePointer || navigator.pdfViewerEnabled === false
}

/** Contents of an uploaded file as a Blob (rejects when it cannot be loaded). */
export const loadMaterialFile = async (resource, options) => {
  const result = await api.getMaterialFile(resource, options)
  if (result.status !== 'success' || !(result.data instanceof Blob)) {
    throw new Error(result.error || 'load_failed')
  }
  return result.data
}

/** Saves an uploaded file under its original name. */
export const downloadMaterialFile = async (resource) => {
  const blob = await loadMaterialFile(resource, { download: true })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = resource.file_name || resource.fileName || resource.title || 'file'
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Give the browser time to start the download before the URL is released
  setTimeout(() => URL.revokeObjectURL(objectUrl), 10000)
}
