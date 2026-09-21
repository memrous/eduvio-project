/**
 * Room parsing and formatting utility.
 *
 * Typical STAG room format: "BUILDING ROOM_NUMBER" (e.g. "LP 5004", "LP 5.001", "CP-312", "VC 102").
 * The first digit in the room number represents the floor:
 *   - 5004 -> 5th floor (5. patro)
 *   - 0004 -> Ground floor (Přízemí)
 */

/**
 * Parses a room string into structured components.
 * @param {string|null|undefined} roomStr 
 * @returns {{ raw: string, building: string|null, roomNumber: string, floor: number|null } | null}
 */
export function parseRoom(roomStr) {
  if (!roomStr || typeof roomStr !== 'string') return null
  const trimmed = roomStr.trim()
  if (!trimmed) return null

  // Strip leading generic prefixes like "Učebna ", "Místnost ", "Room "
  const cleaned = trimmed.replace(/^(učebna|místnost|room)\s+/i, '')

  // 1. Matches "LP 5004", "LP 5.001", "CP-312", "VC 102", "A 201"
  const matchWithBuilding = cleaned.match(/^([A-Za-z\u00C0-\u024F0-9]+)[\s-]+(\d[\d.]*)$/)
  if (matchWithBuilding) {
    const building = matchWithBuilding[1]
    const roomNumber = matchWithBuilding[2]
    const firstDigit = parseInt(roomNumber.charAt(0), 10)
    return {
      raw: trimmed,
      building,
      roomNumber,
      floor: isNaN(firstDigit) ? null : firstDigit,
    }
  }

  // 2. Matches standalone number e.g. "5004" or "312"
  const matchNumeric = cleaned.match(/^(\d)([\d.]*)$/)
  if (matchNumeric) {
    const firstDigit = parseInt(matchNumeric[1], 10)
    return {
      raw: trimmed,
      building: null,
      roomNumber: cleaned,
      floor: isNaN(firstDigit) ? null : firstDigit,
    }
  }

  // 3. Fallback for non-standard room strings e.g. "Aula", "Online"
  return {
    raw: trimmed,
    building: null,
    roomNumber: cleaned,
    floor: null,
  }
}

/**
 * Formats the floor number for display.
 * @param {number|null} floor 
 * @param {{ short?: boolean, language?: string }} options 
 * @returns {string|null}
 */
export function formatFloor(floor, { short = false, language = 'cs' } = {}) {
  if (floor === null || floor === undefined || isNaN(floor)) return null
  const lang = typeof language === 'string' ? language : 'cs'
  const isEn = lang.startsWith('en')

  if (floor === 0) {
    if (isEn) return short ? 'Gr. fl.' : 'Ground floor'
    return 'Přízemí'
  }

  if (isEn) {
    if (short) return `Fl. ${floor}`
    const s = ['th', 'st', 'nd', 'rd']
    const v = floor % 100
    const suffix = s[(v - 20) % 10] || s[v] || s[0]
    return `${floor}${suffix} floor`
  }

  return short ? `${floor}. p.` : `${floor}. patro`
}

/**
 * Formats a room string into a user-friendly representation with building, room number, and floor.
 * E.g. "LP 5004 · 5. patro", "LP 5004 · 5. p." (short)
 * @param {string|null|undefined} roomStr 
 * @param {{ short?: boolean, language?: string }} options 
 * @returns {string}
 */
export function formatRoom(roomStr, options = {}) {
  const parsed = parseRoom(roomStr)
  if (!parsed) return ''

  const { building, roomNumber, floor, raw } = parsed
  const floorStr = formatFloor(floor, options)

  if (!floorStr) {
    return raw
  }

  const roomDisplay = building ? `${building} ${roomNumber}` : roomNumber
  return `${roomDisplay} · ${floorStr}`
}
