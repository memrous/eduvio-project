/**
 * How a material is opened: in-app preview (by file extension) or a new tab.
 * Shared by the Materials page and the dashboard box of recent materials.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:80/api"

/** In dev, files from backend storage go through the Vite proxy. */
export const resolveResourceUrl = (url) => {
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

export const getPreviewInfo = (resource) => {
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
