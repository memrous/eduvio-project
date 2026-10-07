import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { normalizeText } from '../../utils/subjectDetails'

const COLLAPSED_LINES = 6
const CHARS_PER_LINE = 80

// Rough visual line count (paragraph lines + wrapping), avoids measuring the DOM
const estimateLines = (text) =>
  text.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / CHARS_PER_LINE)), 0)

/**
 * Plain text with preserved paragraphs; longer texts are collapsed to ~6 lines.
 */
const ExpandableText = ({ text, className = '' }) => {
  const { t } = useTranslation('academic')
  const [expanded, setExpanded] = useState(false)
  const value = normalizeText(text)
  if (!value) return null

  const collapsible = estimateLines(value) > COLLAPSED_LINES

  return (
    <div className="min-w-0">
      <p
        className={`whitespace-pre-line break-words text-sm leading-relaxed text-on-surface-variant ${
          collapsible && !expanded ? 'line-clamp-6' : ''
        } ${className}`}
      >
        {value}
      </p>
      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
        >
          {expanded ? t('academic:subjectDetail.showLess') : t('academic:subjectDetail.showMore')}
        </button>
      )}
    </div>
  )
}

export default ExpandableText
