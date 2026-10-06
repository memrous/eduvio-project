const UNITS = [
  ['year', 365 * 24 * 60 * 60],
  ['month', 30 * 24 * 60 * 60],
  ['week', 7 * 24 * 60 * 60],
  ['day', 24 * 60 * 60],
  ['hour', 60 * 60],
  ['minute', 60],
]

/**
 * "před 2 dny" / "2 days ago" for an ISO timestamp, in the given BCP 47 locale.
 */
export const formatRelativeTime = (isoDate, locale, now = Date.now()) => {
  if (!isoDate) return ''
  const diffSeconds = Math.round((new Date(isoDate).getTime() - now) / 1000)
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  for (const [unit, seconds] of UNITS) {
    if (Math.abs(diffSeconds) >= seconds) {
      return formatter.format(Math.trunc(diffSeconds / seconds), unit)
    }
  }
  // Under a minute: "nyní" / "now"
  return formatter.format(0, 'second')
}

/** Full date and time for tooltips. */
export const formatDateTime = (isoDate, locale) => {
  if (!isoDate) return ''
  return new Date(isoDate).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
}

/** Date only, e.g. for token creation / expiry. */
export const formatDate = (isoDate, locale) => {
  if (!isoDate) return ''
  return new Date(isoDate).toLocaleDateString(locale, { dateStyle: 'medium' })
}
