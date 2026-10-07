/**
 * Helpers for STAG subject details (people, texts, links, results).
 * The backend sends these fields in snake_case only.
 */

// Descriptions that are placeholders, not something the user wrote
const PLACEHOLDER_DESCRIPTIONS = new Set([
  'imported from is/stag',
  'bez popisu.',
  'no description provided.',
])

/**
 * The user's own description, or null for empty / placeholder values.
 * @param {string|null|undefined} description
 * @returns {string|null}
 */
export function getOwnDescription(description) {
  const text = normalizeText(description)
  if (!text) return null
  return PLACEHOLDER_DESCRIPTIONS.has(text.toLowerCase()) ? null : text
}

/**
 * CRLF -> LF, trimmed; empty -> null.
 * @param {string|null|undefined} value
 * @returns {string|null}
 */
export function normalizeText(value) {
  if (value === null || value === undefined) return null
  const text = String(value).replace(/\r\n?/g, '\n').trim()
  return text || null
}

/**
 * Splits "Mgr. A, RNDr. B, Ph.D., prof. C, Dr." into names. A comma-separated
 * part without a space (Ph.D., CSc., Dr.) is a post-nominal title of the previous name.
 * @param {string|null|undefined} value
 * @returns {string[]}
 */
export function splitPeople(value) {
  const text = normalizeText(value)
  if (!text) return []
  const names = []
  text.split(',').map((part) => part.trim()).filter(Boolean).forEach((part) => {
    if (names.length > 0 && !/\s/.test(part)) {
      names[names.length - 1] += `, ${part}`
    } else {
      names.push(part)
    }
  })
  return names
}

/**
 * "A, B +3" for more than `max` names; full list for the title attribute.
 * @param {string|null|undefined} value
 * @param {number} max
 * @returns {{ short: string, full: string, count: number } | null}
 */
export function summarizePeople(value, max = 2) {
  const names = splitPeople(value)
  if (names.length === 0) return null
  const full = names.join(', ')
  if (names.length <= max) return { short: full, full, count: names.length }
  return { short: `${names.slice(0, max).join(', ')} +${names.length - max}`, full, count: names.length }
}

/**
 * Only absolute https URLs are rendered as links.
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
export function getSafeHttpsUrl(url) {
  const text = normalizeText(url)
  if (!text) return null
  try {
    const parsed = new URL(text)
    return parsed.protocol === 'https:' ? parsed.href : null
  } catch {
    return null
  }
}

/**
 * Which parts the subject's completion consists of.
 * @param {string|null|undefined} completionType - 'Credit' | 'Exam' | 'Credit + Exam'
 * @returns {{ credit: boolean, exam: boolean }}
 */
export function getCompletionParts(completionType) {
  return {
    credit: completionType === 'Credit' || completionType === 'Credit + Exam',
    exam: completionType === 'Exam' || completionType === 'Credit + Exam',
  }
}

const stripDiacritics = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '')

const PASSING = new Set(['1', '1,5', '1.5', '2', '2,5', '2.5', '3', 'A', 'B', 'C', 'D', 'E',
  'S', 'Z', 'ZAP', 'ZAPOCTENO', 'SPLNENO', 'SPLNIL', 'USPEL', 'VYHOVEL', 'ANO', 'VYBORNE', 'VELMI DOBRE', 'DOBRE'])
const FAILING = new Set(['4', 'F', 'N', 'NEZAPOCTENO', 'NESPLNENO', 'NESPLNIL', 'NEUSPEL', 'NEVYHOVEL', 'NE',
  'NEDOSTATECNE'])
// Credit results that are a pass/fail mark, not a grade
const CREDIT_MARKS = new Set(['S', 'Z', 'ZAP', 'ZAPOCTENO', 'SPLNENO', 'SPLNIL', 'ANO', 'N', 'NEZAPOCTENO',
  'NESPLNENO', 'NESPLNIL', 'NE'])

const normalizeResult = (value) =>
  stripDiacritics(String(value ?? '')).trim().replace(/\s+/g, ' ').toUpperCase()

/**
 * Same classification as the backend (StagController::resultStatus).
 * @param {string|null|undefined} result
 * @returns {'passed'|'failed'|null}
 */
export function classifyResult(result) {
  const normalized = normalizeResult(result)
  if (!normalized) return null
  if (PASSING.has(normalized)) return 'passed'
  if (FAILING.has(normalized)) return 'failed'
  return null
}

/**
 * Credit marks ("S", "N", "Započteno") are shown as words; grades as they are.
 * @param {string|null|undefined} result
 * @returns {'creditPassed'|'creditFailed'|null} i18n key suffix, or null to show the raw value
 */
export function getCreditMarkKey(result) {
  const normalized = normalizeResult(result)
  if (!CREDIT_MARKS.has(normalized)) return null
  return classifyResult(result) === 'passed' ? 'creditPassed' : 'creditFailed'
}
