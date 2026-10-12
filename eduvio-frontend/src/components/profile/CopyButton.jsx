import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy } from 'lucide-react'
import Icon from '../common/Icon'

const copyToClipboard = async (text) => {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }
  // Fallback for non-secure contexts (e.g. LAN dev server over http)
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    if (!document.execCommand('copy')) throw new Error('copy failed')
  } finally {
    document.body.removeChild(textarea)
  }
}

/** "Kopírovat" button for the agent token and the agent setup commands. */
const CopyButton = ({ text, label, toast }) => {
  const { t } = useTranslation('profile')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await copyToClipboard(text)
      setCopied(true)
      toast.success(t('stag.agent.copied'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('stag.agent.copyFailed'))
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label}
      className="cursor-pointer inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface px-3.5 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
    >
      <Icon icon={copied ? Check : Copy} className={copied ? 'text-success' : ''} />
      {t('stag.agent.copy')}
    </button>
  )
}

export default CopyButton
