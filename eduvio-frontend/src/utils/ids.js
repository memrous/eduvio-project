/**
 * IDs arrive as numbers from the API, as strings from route params, form
 * selects and FormData, and resources carry both subjectId and subject_id.
 * Compare them only through these helpers.
 */

/** Same entity ID regardless of number/string; null never matches. */
export const isSameId = (a, b) => a != null && b != null && a !== '' && b !== '' && String(a) === String(b)

/** Subject ID of a material or event (camelCase or snake_case field). */
export const getSubjectIdOf = (item) => item?.subjectId ?? item?.subject_id ?? null

/** Event ID of a material (camelCase or snake_case field). */
export const getEventIdOf = (item) => item?.eventId ?? item?.event_id ?? null

// Prefix of IDs given to optimistic list entries before the server answers
const TEMP_ID_PREFIX = 'temp-'

export const createTempId = () => `${TEMP_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/** True for IDs the server knows (edit / delete / move are possible). */
export const isPersistedId = (id) => id != null && !String(id).startsWith(TEMP_ID_PREFIX)
