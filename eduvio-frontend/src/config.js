/**
 * Build-time configuration (Vite env, see .env.example).
 * The only place with the local fallback of the API address.
 */

/** Base URL of the Laravel API, e.g. https://api.example.com/api */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:80/api'
