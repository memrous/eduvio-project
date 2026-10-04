/**
 * Extracts and decodes a Moodle mobile launch authentication token.
 *
 * Moodle redirects back via a custom protocol scheme or URL parameter
 * containing a base64-encoded token in the format:
 * "wstoken:::privatetoken:::signature".
 *
 * @param {string} rawValue - Raw URL, query parameter, or pasted token
 * @returns {string|null} Decoded token string containing ":::", or null on failure
 */
export function extractMoodleToken(rawValue) {
  if (typeof rawValue !== 'string') return null

  let tokenCandidate = rawValue.trim()
  if (!tokenCandidate) return null

  // If rawValue contains "token=", take everything after the LAST occurrence of "token="
  const tokenMarker = 'token='
  const lastIndex = tokenCandidate.lastIndexOf(tokenMarker)
  if (lastIndex !== -1) {
    tokenCandidate = tokenCandidate.slice(lastIndex + tokenMarker.length)
  }

  // Try decodeURIComponent on the result; if it throws or returns the same string, keep the original
  try {
    const decodedUri = decodeURIComponent(tokenCandidate)
    if (decodedUri) {
      tokenCandidate = decodedUri
    }
  } catch {
    // Keep the original tokenCandidate
  }

  // Base64-decode it with atob(); if that throws, retry after replacing all spaces with "+"
  // (browsers sometimes turn + into space); if both attempts throw, return null
  let decoded
  try {
    decoded = atob(tokenCandidate)
  } catch {
    try {
      decoded = atob(tokenCandidate.replace(/ /g, '+'))
    } catch {
      return null
    }
  }

  // Return the decoded string (which should contain ":::"), or null on any failure
  if (decoded && decoded.includes(':::')) {
    return decoded
  }

  return null
}