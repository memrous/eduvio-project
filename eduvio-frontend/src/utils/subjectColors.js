// Subject colors (tokens in index.css, light + dark): 8 clearly different hues.
// Full class names stay literal so Tailwind generates them.
export const SUBJECT_COLOR_PALETTE = [
  { bg: 'bg-subject-1', text: 'text-on-subject-1', dot: 'var(--color-subject-dot-1)' },
  { bg: 'bg-subject-2', text: 'text-on-subject-2', dot: 'var(--color-subject-dot-2)' },
  { bg: 'bg-subject-3', text: 'text-on-subject-3', dot: 'var(--color-subject-dot-3)' },
  { bg: 'bg-subject-4', text: 'text-on-subject-4', dot: 'var(--color-subject-dot-4)' },
  { bg: 'bg-subject-5', text: 'text-on-subject-5', dot: 'var(--color-subject-dot-5)' },
  { bg: 'bg-subject-6', text: 'text-on-subject-6', dot: 'var(--color-subject-dot-6)' },
  { bg: 'bg-subject-7', text: 'text-on-subject-7', dot: 'var(--color-subject-dot-7)' },
  { bg: 'bg-subject-8', text: 'text-on-subject-8', dot: 'var(--color-subject-dot-8)' },
]

const NO_SUBJECT_COLOR = {
  bg: 'bg-surface-container',
  text: 'text-on-surface-variant',
  dot: 'var(--color-outline-variant)',
}

const subjectKey = (subject) => subject?.code || String(subject?.id || '')

// Code → palette slot for the user's subjects, sorted by code: with up to
// 8 subjects no two share a color (a hash of the code alone collides often)
let colorSlots = new Map()

/** Called with the user's subjects whenever they are fetched (useSubjects). */
export const registerSubjectColors = (subjects = []) => {
  const keys = [...new Set(subjects.map(subjectKey).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  colorSlots = new Map(keys.map((key, index) => [key, index % SUBJECT_COLOR_PALETTE.length]))
}

export const getSubjectColor = (subject) => {
  const key = subjectKey(subject)
  if (!key) return NO_SUBJECT_COLOR
  if (colorSlots.has(key)) return SUBJECT_COLOR_PALETTE[colorSlots.get(key)]

  // Unknown subject (list not loaded yet): stable hash of the code
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) % SUBJECT_COLOR_PALETTE.length
  }
  return SUBJECT_COLOR_PALETTE[Math.abs(hash) % SUBJECT_COLOR_PALETTE.length]
}

/**
 * Normalizes grades to university A–F scale.
 * Handles existing letter grades (A, B, C, D, E, F) as well as numeric grades (1–5 -> A–F).
 */
export const formatAcademicGrade = (grade) => {
  if (grade === null || grade === undefined || grade === '') return null
  const str = String(grade).trim().toUpperCase()

  const numericMap = {
    '1': 'A',
    '1.0': 'A',
    '1.5': 'B',
    '2': 'B',
    '2.0': 'B',
    '2.5': 'C',
    '3': 'C',
    '3.0': 'C',
    '3.5': 'D',
    '4': 'D',
    '4.0': 'E',
    '5': 'F',
  }

  return numericMap[str] || str
}

