/**
 * Marks a Moodle launch that was started from this tab, so the profile can tell
 * when the user came back (Back button / bfcache) without the callback having run.
 *
 * Stored in sessionStorage (per tab); every access is guarded because storage
 * can be unavailable (private mode, blocked site data).
 */

const KEY = 'moodleLaunchPending'
export const MOODLE_LAUNCH_MAX_AGE_MS = 15 * 60 * 1000

export function markMoodleLaunchPending(now = Date.now()) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ startedAt: now }))
  } catch {
    // Without storage the manual fallback is simply not opened automatically
  }
}

export function clearMoodleLaunchPending() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

/**
 * True when a launch from this tab started less than 15 minutes ago.
 * An older (or unreadable) flag is removed.
 */
export function isMoodleLaunchPending(now = Date.now()) {
  let raw
  try {
    raw = sessionStorage.getItem(KEY)
  } catch {
    return false
  }
  if (!raw) return false

  let startedAt = NaN
  try {
    startedAt = Number(JSON.parse(raw)?.startedAt)
  } catch {
    // malformed value, treated as stale
  }

  const age = now - startedAt
  if (Number.isFinite(age) && age >= 0 && age < MOODLE_LAUNCH_MAX_AGE_MS) return true

  clearMoodleLaunchPending()
  return false
}
