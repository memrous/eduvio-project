/**
 * Semester and STAG Statut utility.
 */

/**
 * Normalizes a statut string to 'A', 'B', or 'C'.
 * Falls back to isMandatory if statut is absent.
 * @param {string|null|undefined} statut
 * @param {boolean|null|undefined} isMandatory
 * @returns {'A'|'B'|'C'}
 */
export function normalizeStatut(statut, isMandatory) {
  if (statut && typeof statut === 'string') {
    const s = statut.trim().toUpperCase()
    if (s === 'A' || s === 'B' || s === 'C') return s
  }
  return isMandatory ? 'A' : 'C'
}

/**
 * Parses a semester string into structured components.
 * @param {string|null|undefined} semesterStr - e.g. "ZS 2026", "LS 2026", "Winter", "Summer"
 * @returns {{ raw: string, type: 'ZS'|'LS'|null, year: string|null } | null}
 */
export function parseSemester(semesterStr) {
  if (!semesterStr || typeof semesterStr !== 'string') return null
  const trimmed = semesterStr.trim()
  if (!trimmed) return null

  const match = trimmed.match(/^(ZS|LS)(?:\s+(.+))?$/i)
  if (match) {
    return {
      raw: trimmed,
      type: match[1].toUpperCase(),
      year: match[2] || null,
    }
  }

  // Fallback: try to detect "Winter"/"Summer" or "Zimní"/"Letní" variants
  const lower = trimmed.toLowerCase()
  if (lower.startsWith('winter') || lower.startsWith('zimn') || lower.startsWith('zs')) {
    return { raw: trimmed, type: 'ZS', year: null }
  }
  if (lower.startsWith('summer') || lower.startsWith('letn') || lower.startsWith('ls')) {
    return { raw: trimmed, type: 'LS', year: null }
  }

  return { raw: trimmed, type: null, year: null }
}

/**
 * Returns a short semester label ("ZS" or "LS").
 * @param {string|null|undefined} semesterStr
 * @returns {string|null}
 */
export function getSemesterShort(semesterStr) {
  const parsed = parseSemester(semesterStr)
  return parsed?.type ?? null
}

/**
 * Determines if a semester string represents winter semester.
 * @param {string|null|undefined} semesterStr
 * @returns {boolean}
 */
export function isWinterSemester(semesterStr) {
  return parseSemester(semesterStr)?.type === 'ZS'
}

/**
 * Returns Tailwind CSS classes for statut badge based on STAG statut value.
 * Uses design tokens from the project's design system (DESIGN.md).
 *
 * A = Povinný (Mandatory)              -> primary tones
 * B = Povinně volitelný (Semi-elective) -> tertiary/amber tones
 * C = Volitelný (Elective)             -> surface/neutral tones
 *
 * @param {'A'|'B'|'C'|null|undefined} statut
 * @returns {{ bg: string, text: string }}
 */
export function getStatutStyles(statut) {
  switch (statut) {
    case 'A':
      return {
        bg: 'bg-surface-container-highest',
        text: 'text-primary',
      }
    case 'B':
      return {
        bg: 'bg-tertiary-fixed',
        text: 'text-on-tertiary-fixed-variant',
      }
    case 'C':
      return {
        bg: 'bg-surface-container',
        text: 'text-on-surface-variant',
      }
    default:
      return {
        bg: 'bg-surface-container',
        text: 'text-on-surface-variant',
      }
  }
}

/**
 * Returns the i18n key for a statut value.
 * @param {'A'|'B'|'C'|null|undefined} statut
 * @returns {string} translation key under 'dashboard:subjectCard'
 */
export function getStatutLabelKey(statut) {
  switch (statut) {
    case 'A': return 'dashboard:subjectCard.statutA'
    case 'B': return 'dashboard:subjectCard.statutB'
    case 'C': return 'dashboard:subjectCard.statutC'
    default: return 'dashboard:subjectCard.statutC'
  }
}
