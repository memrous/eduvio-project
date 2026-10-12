/**
 * Build-time configuration (Vite env, see .env.example).
 * The only place with the local fallback of the API address.
 */

/** Base URL of the Laravel API, e.g. https://api.example.com/api */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:80/api'

/**
 * Called once at startup. A production build must talk to the API over https:
 * the page itself is served over https (Vercel), so an http API would be blocked
 * as mixed content and the Bearer token would travel unencrypted.
 */
export const checkProductionConfig = () => {
  if (import.meta.env.DEV || import.meta.env.VITE_USE_MOCK === 'true') return

  if (!import.meta.env.VITE_API_BASE_URL) {
    console.error(
      '[Eduvio] VITE_API_BASE_URL is not set: this build falls back to ' + API_BASE_URL + '. ' +
      'Set VITE_API_BASE_URL=https://<your-api>/api in the Vercel project (Settings → Environment Variables) and redeploy.'
    )
  } else if (!API_BASE_URL.startsWith('https://')) {
    console.error(
      '[Eduvio] VITE_API_BASE_URL must use https:// in production (now: ' + API_BASE_URL + '). ' +
      'Browsers block http requests from an https page (mixed content).'
    )
  }
}
