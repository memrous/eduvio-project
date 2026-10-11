/**
 * Client-side search over the user's subjects and materials (a few dozen items).
 *
 * Text is compared lower-cased, without diacritics and with collapsed
 * whitespace, so "ucetni" finds "Účetní". A match at the start of a word
 * ranks above a match inside a word.
 */
import { getMaterialKind, isHidden } from './materialKinds'
import { getSemesterLinkTitle, isAutoSemesterLink } from './semesterLinks'
import { getSubjectIdOf, isSameId } from './ids'

export const MIN_QUERY_LENGTH = 2

const COMBINING_MARKS = /[̀-ͯ]/g
const WORD_CHAR = /[\p{L}\p{N}]/u

/** "  Účetní   Systémy " → "ucetni systemy" */
export const normalizeText = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Normalized text plus, for every normalized character, the index of the
 * original character it came from (to highlight the match in the original).
 */
const normalizeWithMap = (text) => {
  let value = ''
  const map = []
  const source = String(text ?? '')
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]
    if (/\s/.test(ch)) {
      // Collapse whitespace runs; drop leading whitespace
      if (value !== '' && !value.endsWith(' ')) {
        value += ' '
        map.push(i)
      }
      continue
    }
    const normalized = ch.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase()
    for (const n of normalized) {
      value += n
      map.push(i)
    }
  }
  if (value.endsWith(' ')) {
    value = value.slice(0, -1)
    map.pop()
  }
  return { value, map }
}

/**
 * Finds `query` (already normalized) in `text`, preferring a match at the start
 * of a word. Returns { start, end, atStart, wordStart } with indices into the
 * original text, or null.
 */
export const findMatch = (text, query) => {
  if (!query) return null
  const { value, map } = normalizeWithMap(text)

  let first = null
  let from = 0
  while (from <= value.length - query.length) {
    const index = value.indexOf(query, from)
    if (index === -1) break
    const wordStart = index === 0 || !WORD_CHAR.test(value[index - 1])
    const match = {
      start: map[index],
      end: map[index + query.length - 1] + 1,
      atStart: index === 0,
      wordStart,
    }
    if (wordStart) return match
    first ??= match
    from = index + 1
  }
  return first
}

const compareText = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), undefined, { sensitivity: 'base' })

const PEOPLE_FIELDS = ['lecturer', 'guarantor', 'lecturers', 'tutors']

/**
 * Subjects matching the query: code first, then name starting with the query,
 * then a word in the name or a teacher's name, then matches inside words.
 * Each result: { subject, codeMatch, nameMatch }.
 */
export const searchSubjects = (subjects, rawQuery) => {
  const query = normalizeText(rawQuery)
  if (query.length < MIN_QUERY_LENGTH) return []

  const results = []
  for (const subject of subjects ?? []) {
    const codeMatch = findMatch(subject.code, query)
    const nameMatch = findMatch(subject.name, query)
    const peopleMatch = PEOPLE_FIELDS
      .map((field) => findMatch(subject[field], query))
      .filter(Boolean)
      .sort((a, b) => Number(b.wordStart) - Number(a.wordStart))[0] ?? null

    let rank
    if (codeMatch) rank = codeMatch.wordStart ? 0 : 1
    else if (nameMatch?.atStart) rank = 2
    else if (nameMatch?.wordStart) rank = 3
    else if (peopleMatch?.wordStart) rank = 4
    else if (nameMatch) rank = 5
    else if (peopleMatch) rank = 6
    else continue

    results.push({ subject, codeMatch, nameMatch, rank })
  }

  return results.sort((a, b) => a.rank - b.rank || compareText(a.subject.name, b.subject.name))
}

/**
 * Materials matching the query in their title or their subject's name.
 * Hidden materials and locked Moodle sections are left out; semester links
 * are shown with their display title (the subject name for automatic links).
 * Each result: { resource, subject, title, isSemesterLink, titleMatch, subjectMatch }.
 */
export const searchMaterials = (resources, subjects, rawQuery, t) => {
  const query = normalizeText(rawQuery)
  if (query.length < MIN_QUERY_LENGTH) return []

  const results = []
  for (const resource of resources ?? []) {
    if (isHidden(resource) || resource.moodle_section_id != null) continue

    const subjectId = getSubjectIdOf(resource)
    const subject = subjectId == null ? null : (subjects ?? []).find((s) => isSameId(s.id, subjectId)) ?? null
    const isSemesterLink = resource.category === 'platform'
    const title = isSemesterLink ? getSemesterLinkTitle(resource, subject, t) : resource.title

    const titleMatch = findMatch(title, query)
    // An automatic link's title already is the subject name
    const subjectMatch = isSemesterLink && isAutoSemesterLink(resource) ? null : findMatch(subject?.name, query)

    let rank
    if (titleMatch?.wordStart) rank = 0
    else if (subjectMatch?.wordStart) rank = 1
    else if (titleMatch) rank = 2
    else if (subjectMatch) rank = 3
    else continue

    results.push({ resource, subject, title, isSemesterLink, kind: getMaterialKind(resource), titleMatch, subjectMatch, rank })
  }

  return results.sort((a, b) => a.rank - b.rank || compareText(a.title, b.title))
}
