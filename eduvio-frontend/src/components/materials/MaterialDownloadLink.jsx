import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../../context/ToastContext'
import { hasPrivateFile } from '../../utils/materialKinds'
import { downloadMaterialFile } from '../../utils/materialPreview'

/**
 * Download control for a material: uploaded files are fetched with the
 * Bearer token (private storage), anything else stays a plain link.
 */
const MaterialDownloadLink = ({ resource, href, className, title, newTab = true, children }) => {
  const { t } = useTranslation('resources')
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  if (!hasPrivateFile(resource)) {
    return (
      <a
        href={href}
        download
        target={newTab ? '_blank' : undefined}
        rel={newTab ? 'noreferrer' : undefined}
        className={className}
        title={title}
      >
        {children}
      </a>
    )
  }

  return (
    <button
      type="button"
      disabled={busy}
      aria-busy={busy}
      title={title}
      onClick={async () => {
        setBusy(true)
        try {
          await downloadMaterialFile(resource)
        } catch {
          toast.error(t('resources:preview.downloadFailed'))
        } finally {
          setBusy(false)
        }
      }}
      className={`${className} cursor-pointer disabled:opacity-60`}
    >
      {children}
    </button>
  )
}

export default MaterialDownloadLink
