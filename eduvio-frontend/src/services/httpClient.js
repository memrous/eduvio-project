import axios from 'axios'

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:80/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

/**
 * Call this immediately after login/register and on logout.
 * Sets or clears the Bearer token on the Axios instance so the
 * NEXT request already has the correct header — no race condition.
 */
export const setAuthToken = (token) => {
  if (token) {
    httpClient.defaults.headers.common['Authorization'] = `Bearer ${token}`
  } else {
    delete httpClient.defaults.headers.common['Authorization']
  }
}

// Request interceptor — fallback for page reload (reads from localStorage)
httpClient.interceptors.request.use(
  (config) => {
    // If header is already set (via setAuthToken), do not overwrite it
    if (config.headers.Authorization) return config

    const authDataStr = localStorage.getItem('studyhub:auth')
    if (authDataStr) {
      try {
        const { token } = JSON.parse(authDataStr)
        if (token) config.headers.Authorization = `Bearer ${token}`
      } catch (err) {
        console.error('Error parsing token from storage:', err)
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — 401 triggers clean logout
httpClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('studyhub:unauthorized'))
    }
    return Promise.reject(error)
  }
)

export default httpClient
