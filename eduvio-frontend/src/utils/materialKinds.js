/**
 * Kinds of materials and what the user may do with them.
 *
 * - manual: uploaded file or link added by the user → edit, move, delete
 * - moodle: imported from Moodle (module or locked section) → move, hide
 * - auto:   course page found on a department website → hide
 *
 * Moodle and automatic materials come back on the next sync, so they are
 * hidden instead of deleted.
 */

export const getMaterialKind = (resource) => {
  if (resource?.moodle_cmid != null || resource?.moodle_section_id != null) return 'moodle'
  if (resource?.link_source === 'auto') return 'auto'
  return 'manual'
}

export const isSemesterLink = (resource) => resource?.category === 'platform'

export const isHidden = (resource) => Boolean(resource?.hidden_at)

/** File uploaded to our storage (it can be replaced, and is deleted with the material). */
export const isOwnFile = (resource) => {
  try {
    return new URL(resource?.url ?? '', 'http://local').pathname.startsWith('/storage/materials/')
  } catch {
    return false
  }
}
