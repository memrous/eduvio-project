export const SUBJECT_COLOR_PALETTE = [
  { bg: 'bg-primary-container', text: 'text-on-primary-container' },
  { bg: 'bg-secondary-container', text: 'text-on-secondary-container' },
  { bg: 'bg-tertiary-container', text: 'text-on-tertiary-container' },
  { bg: 'bg-success-container', text: 'text-on-success-container' },
  { bg: 'bg-warning-container', text: 'text-on-warning-container' },
  { bg: 'bg-error-container', text: 'text-on-error-container' },
]

export const getSubjectColor = (subject) => {
  const key = subject?.code || String(subject?.id || '')
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

