import {
  INITIAL_SUBJECTS,
  INITIAL_EVENTS,
  INITIAL_RESOURCES,
} from '../data/mockData'
import { isSameId } from '../utils/ids'

const MOCK_DELAY = 600 // ms
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const success = (data) => ({ data, error: null, status: 'success' })
const failure = (error) => ({ data: null, error, status: 'error' })

const MOCK_USER_DB = [
  {
    id: 1,
    name: 'Bořek Šarman',
    username: 'boreksarman',
    email: 'borek.sarman@upol.cz',
    password: 'password',
    // Study info as stored by POST /stag/sync-student (whitelisted getStudentInfo fields)
    study_program: 'Aplikovaná informatika',
    study_program_code: 'B0613A140005',
    faculty: 'PRF',
    study_form: 'P',
    study_type: 'B',
    study_type_key: '7',
    study_year: 2,
    study_status: 'S',
    study_officer_name: 'Nováková Jana',
    study_officer_email: 'jana.novakova@example.edu',
    study_officer_phone: '+420 585 634 000',
    study_info_synced_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    stag_student_id: null,
    stag_ticket: null,
    stag_ticket_expires_at: null,
    stag_user_name: null,
    role: 'student',
    // No photo: the UI shows the initials
    avatarUrl: null,
  },
]
const mockRegisteredUsers = [...MOCK_USER_DB]

// STAG sync mode of the mocked backend (config('stag.mode')): 'server' | 'agent'
const MOCK_STAG_MODE = import.meta.env.VITE_MOCK_STAG_MODE === 'agent' ? 'agent' : 'server'
const MOCK_AGENT_TOKEN_TTL_DAYS = 180
// Stable "last sync" for server mode so the value does not change on every status poll
const MOCK_SERVER_SYNCED_AT = new Date().toISOString()

const hasValidAgentToken = (user) =>
  Boolean(user?.stag_agent_token) && new Date(user.stag_agent_token.expires_at) > new Date()

// Mirrors User::stag_connected on the backend:
// - server mode: a ticket that is missing an expiry or not yet expired
// - agent mode: a non-expired agent token
const isStagConnected = (user) => {
  if (MOCK_STAG_MODE === 'agent') return hasValidAgentToken(user)
  return Boolean(user?.stag_ticket) && (!user.stag_ticket_expires_at || new Date(user.stag_ticket_expires_at) > new Date())
}

const sanitizeUser = (user) => {
  const copy = { ...user, stag_connected: isStagConnected(user) }
  delete copy.password
  delete copy.stag_ticket
  delete copy.stag_agent_token
  delete copy.moodle_wstoken
  return copy
}

const getNamespacedKey = (userId, key) => {
  const scope = userId || 'fallback'
  return `eduvio:${scope}:${key}`
}

const getAuthTokenFromStorage = () => {
  const authDataStr = localStorage.getItem('eduvio:auth')
  if (!authDataStr) return null

  try {
    const { token } = JSON.parse(authDataStr)
    return token || null
  } catch {
    return null
  }
}

const getCurrentMockUser = () => {
  const token = getAuthTokenFromStorage()
  if (!token) return null

  const parts = token.split('-')
  const userId = Number(parts[2])
  if (!Number.isFinite(userId)) return null

  return mockRegisteredUsers.find((user) => user.id === userId) ?? null
}

const normalizeRegisterPayload = (args) => {
  if (args.length === 1 && typeof args[0] === 'object') {
    return args[0]
  }

  const [name, username, email, password] = args

  return {
    name,
    username,
    email,
    password,
  }
}

// ── Auth API Functions ───────────────────────────────────────────

export const login = async (email, password) => {
  await delay(MOCK_DELAY)

  const found = mockRegisteredUsers.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  )

  if (!found) {
    return failure('invalid_credentials')
  }

  const token = `mock-token-${found.id}-${Date.now()}`
  return success({ user: sanitizeUser(found), token })
}

export const register = async (...args) => {
  await delay(MOCK_DELAY)

  const payload = normalizeRegisterPayload(args)
  const errors = {}

  if (mockRegisteredUsers.find((u) => u.email.toLowerCase() === payload.email.toLowerCase())) {
    errors.email = ['The email has already been taken.']
  }
  if (payload.username && mockRegisteredUsers.find((u) => u.username && u.username.toLowerCase() === payload.username.toLowerCase())) {
    errors.username = ['The username has already been taken.']
  }

  if (Object.keys(errors).length > 0) {
    return {
      data: null,
      error: 'validation_error',
      errors: errors,
      status: 'error'
    }
  }

  const newUser = {
    id: Date.now(),
    name: payload.name,
    username: payload.username,
    email: payload.email,
    password: payload.password,
    // A freshly registered user has no study info until the first STAG sync
    stag_student_id: null,
    stag_ticket: null,
    stag_ticket_expires_at: null,
    stag_user_name: null,
    role: 'student',
    // No photo: the UI shows the initials
    avatarUrl: null,
  }

  mockRegisteredUsers.push(newUser)
  const token = `mock-token-${newUser.id}-${Date.now()}`
  return success({ user: sanitizeUser(newUser), token })
}

// Registration is always open in the mock
export const getAppConfig = async () => {
  await delay(50)
  return success({ registration: { enabled: true, allowed_domains: [] } })
}

export const checkAvailability = async ({ email, username }) => {
  await delay(MOCK_DELAY)

  const errors = {}

  if (mockRegisteredUsers.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    errors.email = ['The email has already been taken.']
  }
  if (username && mockRegisteredUsers.find((u) => u.username && u.username.toLowerCase() === username.toLowerCase())) {
    errors.username = ['The username has already been taken.']
  }

  if (Object.keys(errors).length > 0) {
    return { data: null, error: 'validation_error', errors, status: 'error' }
  }

  return success({ available: true })
}

export const logout = async (userId) => {
  await delay(200)

  if (userId) {
    localStorage.removeItem(getNamespacedKey(userId, 'subjects'))
    localStorage.removeItem(getNamespacedKey(userId, 'events'))
    localStorage.removeItem(getNamespacedKey(userId, 'materials'))
    localStorage.removeItem(getNamespacedKey(userId, 'dashboard_summary'))
    localStorage.removeItem(getNamespacedKey(userId, 'requirements'))
  }

  return success(null)
}

export const getUser = async (token) => {
  await delay(300)

  const authToken = token || getAuthTokenFromStorage()
  if (!authToken) {
    return failure('unauthorized')
  }

  const parts = authToken.split('-')
  const userId = Number(parts[2])

  const found = mockRegisteredUsers.find((u) => u.id === userId)
  if (!found) {
    return failure('unauthorized')
  }

  return success({ user: sanitizeUser(found) })
}

// Mirrors StudyProgressController on the backend
const MOCK_LETTER_GRADES = { A: 1, B: 1.5, C: 2, D: 2.5, E: 3, F: 4 }
const MOCK_REQUIRED_CREDITS = { B: 180, N: 120, M: 300 }

const mockNumericGrade = (value) => {
  const normalized = String(value ?? '').trim().toUpperCase()
  if (!normalized) return null
  if (normalized in MOCK_LETTER_GRADES) return MOCK_LETTER_GRADES[normalized]
  const grade = Number(normalized.replace(',', '.'))
  return Number.isFinite(grade) && grade >= 1 && grade <= 4 ? grade : null
}

const mockCurrentSemester = (now = new Date()) => {
  const month = now.getMonth() + 1
  const startYear = month >= 9 ? now.getFullYear() : now.getFullYear() - 1
  return `${month >= 9 || month === 1 ? 'ZS' : 'LS'} ${startYear}`
}

const mockSemesterKey = (semester) => {
  const match = String(semester ?? '').match(/^\s*(ZS|LS)\s+(\d{4})/i)
  return match ? `${match[1].toUpperCase()} ${match[2]}` : null
}

export const getStudyProgress = async () => {
  await delay(MOCK_DELAY)
  const user = getCurrentMockUser()
  if (!user) return failure('unauthorized')

  const saved = localStorage.getItem(getNamespacedKey(user.id, 'subjects'))
  const subjects = saved ? JSON.parse(saved) : INITIAL_SUBJECTS
  const completed = subjects.filter((s) => s.status === 'completed')

  let weightedSum = 0
  let weightTotal = 0
  subjects.forEach((s) => {
    const grade = mockNumericGrade(s.final_grade ?? s.finalGrade)
    const credits = Number(s.credits) || 0
    if (grade === null || credits <= 0) return
    weightedSum += grade * credits
    weightTotal += credits
  })

  const currentSemester = mockCurrentSemester()
  return success({
    earned_credits: completed.reduce((sum, s) => sum + (Number(s.credits) || 0), 0),
    completed_subjects: completed.length,
    weighted_average: weightTotal > 0 ? Math.round((weightedSum / weightTotal) * 100) / 100 : null,
    required_credits: MOCK_REQUIRED_CREDITS[String(user.study_type ?? '').toUpperCase()] ?? null,
    required_credits_estimated: true,
    current_semester: currentSemester,
    current_semester_credits: subjects
      .filter((s) => !s.stag_removed_at && mockSemesterKey(s.semester) === currentSemester)
      .reduce((sum, s) => sum + (Number(s.credits) || 0), 0),
  })
}

export const getStagRedirectUrl = async () => {
  await delay(300)
  const currentUser = getCurrentMockUser()
  if (!currentUser) {
    return failure('unauthorized')
  }
  if (MOCK_STAG_MODE === 'agent') return failure('agent_mode')

  return success({
    redirect_url: 'https://stag-ws.upol.cz/ws/login?mock=true',
  })
}

export const disconnectStag = async () => {
  await delay(300)

  const currentUser = getCurrentMockUser()
  if (!currentUser) {
    return failure('unauthorized')
  }

  currentUser.stag_student_id = null
  currentUser.stag_ticket = null
  currentUser.stag_ticket_expires_at = null
  currentUser.stag_user_name = null
  currentUser.stag_sync_status = null
  currentUser.stag_sync_error = null
  currentUser.stag_synced_at = null
  currentUser.stag_last_sync_attempt_at = null

  return success({ user: sanitizeUser(currentUser) })
}

export const getStagSyncStatus = async () => {
  await delay(200)
  const currentUser = getCurrentMockUser()
  if (!currentUser) return failure('unauthorized')

  // Same shape as StagConnectController::status — token metadata only, never the token itself
  const agentToken = currentUser.stag_agent_token ? { ...currentUser.stag_agent_token } : null

  if (MOCK_STAG_MODE === 'agent') {
    return success({
      mode: 'agent',
      stag_connected: isStagConnected(currentUser),
      stag_sync_status: currentUser.stag_sync_status ?? null,
      stag_synced_at: currentUser.stag_synced_at ?? null,
      stag_sync_error: currentUser.stag_sync_error ?? null,
      next_allowed_at: null,
      agent_token: agentToken,
      // The mock has no agent polling; window.__eduvioMock.stagAgentReport() finishes a request
      agent_online: false,
      agent_last_seen_at: null,
      sync_requested_at: currentUser.stag_sync_requested_at ?? null,
    })
  }

  return success({
    mode: 'server',
    stag_connected: isStagConnected(currentUser),
    stag_sync_status: 'success',
    stag_synced_at: MOCK_SERVER_SYNCED_AT,
    stag_sync_error: null,
    next_allowed_at: null,
    agent_token: agentToken,
  })
}

export const createStagAgentToken = async () => {
  await delay(300)
  const currentUser = getCurrentMockUser()
  if (!currentUser) return failure('unauthorized')

  const bytes = crypto.getRandomValues(new Uint8Array(30))
  const secret = Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 40)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + MOCK_AGENT_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Like the backend: replaces any previous token and keeps only metadata
  currentUser.stag_agent_token = {
    created_at: now.toISOString(),
    expires_at: expiresAt,
    last_used_at: null,
  }

  return success({ token: `${Math.floor(Math.random() * 1000) + 1}|${secret}`, expires_at: expiresAt })
}

export const revokeStagAgentToken = async () => {
  await delay(300)
  const currentUser = getCurrentMockUser()
  if (!currentUser) return failure('unauthorized')

  currentUser.stag_agent_token = null
  return success({ message: 'STAG agent token revoked.' })
}

/**
 * Dev helper (mock mode only): simulates the local agent calling POST /stag/agent/report.
 * Usage in the browser console: window.__eduvioMock.stagAgentReport('success')
 *                               window.__eduvioMock.stagAgentReport('failed', 'VPN down')
 */
const mockStagAgentReport = (status = 'success', error = null) => {
  const currentUser = getCurrentMockUser()
  if (!hasValidAgentToken(currentUser)) return false

  currentUser.stag_agent_token.last_used_at = new Date().toISOString()
  // Like the backend: a report finishes a sync requested from the app
  currentUser.stag_sync_requested_at = null
  currentUser.stag_sync_status = status
  if (status === 'success') {
    currentUser.stag_synced_at = new Date().toISOString()
    currentUser.stag_sync_error = null
  } else {
    currentUser.stag_sync_error = error ? String(error).slice(0, 500) : null
  }
  return true
}

if (import.meta.env.VITE_USE_MOCK === 'true' && import.meta.env.DEV && typeof window !== 'undefined') {
  window.__eduvioMock = { ...(window.__eduvioMock ?? {}), stagAgentReport: mockStagAgentReport }
}

export const requestStagSync = async () => {
  await delay(200)
  const currentUser = getCurrentMockUser()
  if (!currentUser) return failure('unauthorized')
  if (MOCK_STAG_MODE !== 'agent') return resyncStag()
  if (!isStagConnected(currentUser)) return failure('agent_not_configured')
  currentUser.stag_sync_requested_at = new Date().toISOString()
  return success({ sync_requested_at: currentUser.stag_sync_requested_at, agent_online: false })
}

export const resyncStag = async () => {
  await delay(400)
  const currentUser = getCurrentMockUser()
  if (!currentUser) return failure('unauthorized')
  if (MOCK_STAG_MODE === 'agent') return failure('agent_mode')
  if (!isStagConnected(currentUser)) return { data: null, error: 'STAG is not connected.', status: 'error' }
  // In mock mode, always succeed
  const nextAllowedAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  return success({
    message: 'Resync started in background.',
    next_allowed_at: nextAllowedAt,
  })
}

export const startMoodleLaunch = async () => {
  await delay(200)

  const currentUser = getCurrentMockUser()
  if (!currentUser) {
    return failure('unauthorized')
  }

  const passport = Math.random().toString(36).slice(2)
  return success({
    launch_url: `https://moodle.example.test/admin/tool/mobile/launch.php?service=moodle_mobile_app&passport=${passport}&urlscheme=web%2Beduvio`,
  })
}

export const connectMoodleToken = async (token) => {
  await delay(400)

  const currentUser = getCurrentMockUser()
  if (!currentUser) {
    return failure('unauthorized')
  }

  currentUser.moodle_wstoken = token
  currentUser.moodle_display_name = 'Mock Moodle User'
  currentUser.moodle_user_id = currentUser.moodle_user_id || 1
  currentUser.moodle_connected = true
  currentUser.moodle_sync_status = 'pending'
  currentUser.moodle_sync_error = null
  currentUser.moodle_synced_at = null
  currentUser.moodle_last_sync_attempt_at = new Date().toISOString()

  return success({ user: sanitizeUser(currentUser) })
}

export const disconnectMoodle = async () => {
  await delay(300)

  const currentUser = getCurrentMockUser()
  if (!currentUser) {
    return failure('unauthorized')
  }

  currentUser.moodle_wstoken = null
  currentUser.moodle_display_name = null
  currentUser.moodle_user_id = null
  currentUser.moodle_connected = false
  currentUser.moodle_sync_status = null
  currentUser.moodle_sync_error = null
  currentUser.moodle_synced_at = null
  currentUser.moodle_last_sync_attempt_at = null

  return success({ user: sanitizeUser(currentUser) })
}

export const getMoodleSyncStatus = async () => {
  await delay(200)
  return success({ moodle_sync_status: 'success', moodle_synced_at: new Date().toISOString(), next_allowed_at: null })
}

export const resyncMoodle = async () => {
  await delay(400)
  const currentUser = getCurrentMockUser()
  if (!currentUser) return failure('unauthorized')
  if (!currentUser.moodle_connected) return { data: null, error: 'Moodle is not connected.', status: 'error' }
  const nextAllowedAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  return success({
    message: 'Resync started in background.',
    next_allowed_at: nextAllowedAt,
  })
}

// ── Application State API Functions ──────────────────────────────

export const getSubjects = async (userId) => {
  await delay(MOCK_DELAY)
  const key = getNamespacedKey(userId, 'subjects')
  const saved = localStorage.getItem(key)
  if (saved) {
    try {
      return success(JSON.parse(saved))
    } catch {
      return success(INITIAL_SUBJECTS)
    }
  }
  localStorage.setItem(key, JSON.stringify(INITIAL_SUBJECTS))
  return success(INITIAL_SUBJECTS)
}

export const createSubject = async (userId, newSubject) => {
  await delay(100)
  const key = getNamespacedKey(userId, 'subjects')
  const saved = localStorage.getItem(key)
  const list = saved ? JSON.parse(saved) : INITIAL_SUBJECTS
  const updatedList = [...list, newSubject]
  localStorage.setItem(key, JSON.stringify(updatedList))
  return success(newSubject)
}

export const deleteSubject = async (userId, subjectId) => {
  await delay(100)
  const key = getNamespacedKey(userId, 'subjects')
  const saved = localStorage.getItem(key)
  const list = saved ? JSON.parse(saved) : INITIAL_SUBJECTS
  const updatedList = list.filter((s) => s.id !== Number(subjectId) && s.id !== subjectId)
  localStorage.setItem(key, JSON.stringify(updatedList))
  return success(subjectId)
}


export const getEvents = async (userId) => {
  await delay(MOCK_DELAY)
  const key = getNamespacedKey(userId, 'events')
  const saved = localStorage.getItem(key)
  if (saved) {
    try {
      return success(JSON.parse(saved))
    } catch {
      return success(INITIAL_EVENTS)
    }
  }
  localStorage.setItem(key, JSON.stringify(INITIAL_EVENTS))
  return success(INITIAL_EVENTS)
}

export const createEvent = async (userId, newEvent) => {
  await delay(100)
  const key = getNamespacedKey(userId, 'events')
  const saved = localStorage.getItem(key)
  const list = saved ? JSON.parse(saved) : INITIAL_EVENTS
  const updatedList = [...list, newEvent]
  localStorage.setItem(key, JSON.stringify(updatedList))
  return success(newEvent)
}

export const editEvent = async (userId, eventId, updatedEvent) => {
  await delay(100)
  const key = getNamespacedKey(userId, 'events')
  const saved = localStorage.getItem(key)
  const list = saved ? JSON.parse(saved) : INITIAL_EVENTS
  const updatedList = list.map((e) => (e.id === Number(eventId) ? updatedEvent : e))
  localStorage.setItem(key, JSON.stringify(updatedList))
  return success(updatedEvent)
}

export const deleteEvent = async (userId, eventId) => {
  await delay(100)
  const key = getNamespacedKey(userId, 'events')
  const saved = localStorage.getItem(key)
  const list = saved ? JSON.parse(saved) : INITIAL_EVENTS
  const updatedList = list.filter((e) => e.id !== Number(eventId))
  localStorage.setItem(key, JSON.stringify(updatedList))
  return success(eventId)
}

export const updateEventStatus = async (userId, eventId, status) => {
  await delay(100)
  const key = getNamespacedKey(userId, 'events')
  const saved = localStorage.getItem(key)
  const list = saved ? JSON.parse(saved) : INITIAL_EVENTS
  const updatedList = list.map((e) => (e.id === Number(eventId) ? { ...e, status } : e))
  localStorage.setItem(key, JSON.stringify(updatedList))
  const updatedEvent = updatedList.find((e) => e.id === Number(eventId))
  return success(updatedEvent)
}

// The mock keeps no file contents (no File objects in localStorage), only its URL if any
export const getMaterialFile = async (resource) => {
  if (!resource?.url) return failure('not_found')
  try {
    const res = await fetch(resource.url)
    if (!res.ok) return failure('not_found')
    return success(await res.blob())
  } catch {
    return failure('network_error')
  }
}

export const getResources = async (userId) => {
  await delay(MOCK_DELAY)
  const key = getNamespacedKey(userId, 'materials')
  const saved = localStorage.getItem(key)
  if (saved) {
    try {
      return success(JSON.parse(saved))
    } catch {
      return success(INITIAL_RESOURCES)
    }
  }
  localStorage.setItem(key, JSON.stringify(INITIAL_RESOURCES))
  return success(INITIAL_RESOURCES)
}

export const createResource = async (userId, newResource) => {
  await delay(100)
  const key = getNamespacedKey(userId, 'materials')
  const saved = localStorage.getItem(key)
  const list = saved ? JSON.parse(saved) : INITIAL_RESOURCES
  // Like the backend: an ID, default category, no File object in storage
  const { file, ...fields } = newResource
  const created = {
    ...fields,
    id: Math.max(0, ...list.map((r) => Number(r.id) || 0)) + 1,
    category: fields.category ?? 'file',
    fileName: file?.name ?? null,
    size: file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : fields.size ?? 'External Link',
    uploadedAt: new Date().toISOString(),
  }
  const updatedList = [...list, created]
  localStorage.setItem(key, JSON.stringify(updatedList))
  return success(created)
}

export const updateResource = async (userId, resourceId, updates) => {
  await delay(100)
  const key = getNamespacedKey(userId, 'materials')
  const saved = localStorage.getItem(key)
  const list = saved ? JSON.parse(saved) : INITIAL_RESOURCES
  let updated = null
  const updatedList = list.map((r) => {
    if (!isSameId(r.id, resourceId)) return r
    updated = { ...r, ...updates, link_source: 'manual' }
    return updated
  })
  if (!updated) return failure('not_found')
  localStorage.setItem(key, JSON.stringify(updatedList))
  return success(updated)
}

export const deleteResource = async (userId, resourceId) => {
  await delay(100)
  const key = getNamespacedKey(userId, 'materials')
  const saved = localStorage.getItem(key)
  const list = saved ? JSON.parse(saved) : INITIAL_RESOURCES
  localStorage.setItem(key, JSON.stringify(list.filter((r) => !isSameId(r.id, resourceId))))
  return success({ id: resourceId })
}

const updateStoredResource = (userId, resourceId, change) => {
  const key = getNamespacedKey(userId, 'materials')
  const saved = localStorage.getItem(key)
  const list = saved ? JSON.parse(saved) : INITIAL_RESOURCES
  let updated = null
  const updatedList = list.map((r) => {
    if (!isSameId(r.id, resourceId)) return r
    updated = { ...r, ...change(r) }
    return updated
  })
  if (!updated) return failure('not_found')
  localStorage.setItem(key, JSON.stringify(updatedList))
  return success(updated)
}

export const updateMaterial = async (userId, resourceId, fields) => {
  await delay(100)
  const { file, ...rest } = fields
  return updateStoredResource(userId, resourceId, () => ({
    ...rest,
    ...('eventId' in rest ? { event_id: rest.eventId, event_manually_set: true } : {}),
    ...('subjectId' in rest ? { subject_id: rest.subjectId } : {}),
    ...(file ? { fileName: file.name, size: `${Math.max(1, Math.round(file.size / 1024))} KB` } : {}),
  }))
}

export const hideResource = async (userId, resourceId) => {
  await delay(100)
  return updateStoredResource(userId, resourceId, () => ({ hidden_at: new Date().toISOString() }))
}

export const unhideResource = async (userId, resourceId) => {
  await delay(100)
  return updateStoredResource(userId, resourceId, () => ({ hidden_at: null }))
}

export const setResourceForExam = async (userId, resourceId, forExam) => {
  await delay(100)
  return updateStoredResource(userId, resourceId, () => ({ for_exam: Boolean(forExam) }))
}

export const assignResourceEvent = async (userId, resourceId, eventId) => {
  await delay(100)
  const key = getNamespacedKey(userId, 'materials')
  const saved = localStorage.getItem(key)
  const list = saved ? JSON.parse(saved) : INITIAL_RESOURCES
  let updated = null
  const updatedList = list.map((r) => {
    if (!isSameId(r.id, resourceId)) return r
    updated = { ...r, eventId, event_id: eventId, event_manually_set: true }
    return updated
  })
  if (!updated) return failure('not_found')
  localStorage.setItem(key, JSON.stringify(updatedList))
  return success(updated)
}

export const markResourceSeen = async (userId, resourceId) => {
  await delay(100)
  const key = getNamespacedKey(userId, 'materials')
  const saved = localStorage.getItem(key)
  const list = saved ? JSON.parse(saved) : INITIAL_RESOURCES
  let updated = null
  const updatedList = list.map((r) => {
    if (!isSameId(r.id, resourceId)) return r
    updated = { ...r, page_links_new: null, seen_at: new Date().toISOString() }
    return updated
  })
  if (!updated) return failure('not_found')
  localStorage.setItem(key, JSON.stringify(updatedList))
  return success(updated)
}

// Department websites are not crawled in mock mode
export const getDepartmentLinksStatus = async () => {
  await delay(MOCK_DELAY)
  return success({ supported: false, status: 'idle', finished_at: null, next_allowed_at: null, retry_after_seconds: 0 })
}

export const refreshDepartmentLinks = async () => {
  await delay(MOCK_DELAY)
  return failure('validation_error')
}

const INITIAL_DASHBOARD_SUMMARY = {
  nextClass: {
    id: 101,
    subjectId: 1,
    title: 'Database Systems Lecture',
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:30',
    type: 'Lecture'
  },
  todaySchedule: [
    {
      id: 101,
      subjectId: 1,
      title: 'Database Systems Lecture',
      date: new Date().toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '11:30',
      type: 'Lecture'
    }
  ],
  needsAttention: [
    {
      id: 1,
      subjectId: 1,
      title: 'Database Project',
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      startTime: '23:59',
      endTime: '23:59',
      type: 'Assignment',
      status: 'In Progress'
    }
  ],
  subjects: [
    { id: 1, code: 'KMI/DBS', name: 'Database Systems', credits: 6 },
    { id: 2, code: 'KMI/WA', name: 'Web Applications', credits: 4 }
  ],
  progress: {
    creditsGained: 22,
    creditsTotal: 30,
    completedSubjects: 3,
    totalSubjects: 6,
    averageScore: 88
  }
}

export const getDashboardSummary = async (userId) => {
  await delay(MOCK_DELAY)
  const key = getNamespacedKey(userId, 'dashboard_summary')
  const saved = localStorage.getItem(key)
  if (saved) {
    try {
      return success(JSON.parse(saved))
    } catch {
      return success(INITIAL_DASHBOARD_SUMMARY)
    }
  }
  localStorage.setItem(key, JSON.stringify(INITIAL_DASHBOARD_SUMMARY))
  return success(INITIAL_DASHBOARD_SUMMARY)
}

const INITIAL_REQUIREMENTS = [
  { id: 1, subjectId: 1, title: 'Database Design', type: 'Project', minPoints: 15, maxPoints: 30, gainedPoints: 25, isCompleted: true },
  { id: 2, subjectId: 1, title: 'SQL Test', type: 'Test', minPoints: 15, maxPoints: 30, gainedPoints: 20, isCompleted: true },
  { id: 3, subjectId: 1, title: 'Final Exam', type: 'Exam', minPoints: 20, maxPoints: 40, gainedPoints: 15, isCompleted: false },
  { id: 4, subjectId: 2, title: 'React Project', type: 'Project', minPoints: 25, maxPoints: 50, gainedPoints: 40, isCompleted: true },
  { id: 5, subjectId: 2, title: 'Final Exam', type: 'Exam', minPoints: 25, maxPoints: 50, gainedPoints: 28, isCompleted: true }
]

export const getRequirements = async (subjectId) => {
  await delay(MOCK_DELAY)
  const user = getCurrentMockUser()
  const userId = user ? user.id : 'fallback'
  const key = getNamespacedKey(userId, 'requirements')
  const saved = localStorage.getItem(key)
  let list = INITIAL_REQUIREMENTS
  if (saved) {
    try {
      list = JSON.parse(saved)
    } catch {
      list = INITIAL_REQUIREMENTS
    }
  } else {
    localStorage.setItem(key, JSON.stringify(INITIAL_REQUIREMENTS))
  }

  if (subjectId) {
    list = list.filter((r) => r.subjectId === Number(subjectId) || r.subjectId === subjectId)
  }
  return success(list)
}

export const createRequirement = async (newRequirement) => {
  await delay(100)
  const user = getCurrentMockUser()
  const userId = user ? user.id : 'fallback'
  const key = getNamespacedKey(userId, 'requirements')
  const saved = localStorage.getItem(key)
  let list = INITIAL_REQUIREMENTS
  if (saved) {
    try {
      list = JSON.parse(saved)
    } catch {
      list = INITIAL_REQUIREMENTS
    }
  }
  const requirement = {
    ...newRequirement,
    id: Date.now(),
    subjectId: Number(newRequirement.subjectId) || newRequirement.subjectId,
    isCompleted: !!newRequirement.isCompleted
  }
  const updatedList = [...list, requirement]
  localStorage.setItem(key, JSON.stringify(updatedList))
  return success(requirement)
}

export const updateRequirement = async (id, updates) => {
  await delay(100)
  const user = getCurrentMockUser()
  const userId = user ? user.id : 'fallback'
  const key = getNamespacedKey(userId, 'requirements')
  const saved = localStorage.getItem(key)
  let list = INITIAL_REQUIREMENTS
  if (saved) {
    try {
      list = JSON.parse(saved)
    } catch {
      list = INITIAL_REQUIREMENTS
    }
  }
  let updatedReq = null
  const updatedList = list.map((r) => {
    if (r.id === Number(id) || r.id === id) {
      updatedReq = { ...r, ...updates }
      return updatedReq
    }
    return r
  })
  localStorage.setItem(key, JSON.stringify(updatedList))
  if (!updatedReq) {
    return failure('Requirement not found')
  }
  return success(updatedReq)
}

export const deleteRequirement = async (id) => {
  await delay(100)
  const user = getCurrentMockUser()
  const userId = user ? user.id : 'fallback'
  const key = getNamespacedKey(userId, 'requirements')
  const saved = localStorage.getItem(key)
  let list = INITIAL_REQUIREMENTS
  if (saved) {
    try {
      list = JSON.parse(saved)
    } catch {
      list = INITIAL_REQUIREMENTS
    }
  }
  const updatedList = list.filter((r) => r.id !== Number(id) && r.id !== id)
  localStorage.setItem(key, JSON.stringify(updatedList))
  return success(id)
}

export const getNote = async (subjectId) => {
  await delay(MOCK_DELAY)
  const user = getCurrentMockUser()
  const userId = user ? user.id : 'fallback'
  const key = getNamespacedKey(userId, `note:${subjectId}`)
  const saved = localStorage.getItem(key)
  return success({ content: saved || '' })
}

export const updateNote = async (subjectId, content) => {
  await delay(MOCK_DELAY)
  const user = getCurrentMockUser()
  const userId = user ? user.id : 'fallback'
  const key = getNamespacedKey(userId, `note:${subjectId}`)
  localStorage.setItem(key, content)
  return success({ content })
}

// ── Exam ────────────────────────────────────────────────────────

const mockUserId = () => getCurrentMockUser()?.id ?? 'fallback'

const isoDateInDays = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Two sample STAG terms per subject (the first one registered), so the UI can be tried out. */
export const getExamTerms = async (subjectId) => {
  await delay(MOCK_DELAY)
  const base = Number(subjectId) || 1
  return success([
    {
      id: base * 10 + 1, subject_id: base, stag_id: `mock-${base}-1`, date: isoDateInDays(14), start_time: '09:00',
      end_time: '11:00', kind: 'exam', room: 'BUF 3.04', examiner: 'Mgr. Jan Novák, Ph.D.', is_registered: true,
      capacity: 30, occupied: 18, deregistration_deadline: isoDateInDays(12), note: null,
    },
    {
      id: base * 10 + 2, subject_id: base, stag_id: `mock-${base}-2`, date: isoDateInDays(28), start_time: '13:00',
      end_time: '15:00', kind: 'exam', room: 'BUF 2.10', examiner: 'Mgr. Jan Novák, Ph.D.', is_registered: false,
      capacity: 30, occupied: 30, deregistration_deadline: null, note: 'Opravný termín',
    },
  ])
}

const topicsKey = (subjectId) => getNamespacedKey(mockUserId(), `exam-topics:${subjectId}`)
const readTopics = (subjectId) => JSON.parse(localStorage.getItem(topicsKey(subjectId)) || '[]')
const writeTopics = (subjectId, topics) => localStorage.setItem(topicsKey(subjectId), JSON.stringify(topics))

/** Finds which subject a topic belongs to (topic ids are unique across subjects). */
const findTopicSubject = (topicId) => {
  const prefix = getNamespacedKey(mockUserId(), 'exam-topics:')
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(prefix)) continue
    const subjectId = key.slice(prefix.length)
    if (readTopics(subjectId).some((t) => isSameId(t.id, topicId))) return subjectId
  }
  return null
}

export const getExamTopics = async (subjectId) => {
  await delay(MOCK_DELAY)
  return success(readTopics(subjectId))
}

export const addExamTopics = async (subjectId, titles) => {
  await delay(100)
  const topics = readTopics(subjectId)
  let position = topics.reduce((max, t) => Math.max(max, t.position ?? 0), 0)
  const created = (titles || [])
    .map((title) => String(title ?? '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((title) => ({ id: Date.now() + Math.random(), subject_id: Number(subjectId), title, is_done: false, position: ++position }))
  if (created.length === 0) return failure('The titles must not be empty.')
  writeTopics(subjectId, [...topics, ...created])
  return success(created)
}

export const updateExamTopic = async (topicId, fields) => {
  await delay(100)
  const subjectId = findTopicSubject(topicId)
  if (subjectId == null) return failure('not_found')
  let updated = null
  writeTopics(subjectId, readTopics(subjectId).map((t) => {
    if (!isSameId(t.id, topicId)) return t
    updated = { ...t, ...fields }
    return updated
  }))
  return success(updated)
}

export const deleteExamTopic = async (topicId) => {
  await delay(100)
  const subjectId = findTopicSubject(topicId)
  if (subjectId == null) return failure('not_found')
  writeTopics(subjectId, readTopics(subjectId).filter((t) => !isSameId(t.id, topicId)))
  return success({ id: topicId })
}

// ── Semester schedule (sample plan for every subject, like a teacher's page) ──

const MOCK_SYLLABUS = [
  [-14, 'Úvod a základní pojmy', 'session', null, 'Organizace předmětu, základní pojmy.'],
  [-7, '1. písemná práce (20 min) + větvení programu', 'assessment', 'test', 'Krátká písemná práce z probraného učiva.'],
  [0, 'Cykly a funkce', 'session', null, null],
  [3, '2. písemná práce (20 min) + řetězce', 'assessment', 'test', 'Krátká písemná práce z probraného učiva.'],
  [10, 'Státní svátek', 'holiday', null, null],
  [24, 'Zápočtová písemka', 'assessment', 'credit_test', null],
  [31, 'Oprava zápočtové písemky', 'assessment', 'retake', null],
]

const hiddenSyllabusKey = () => getNamespacedKey(mockUserId(), 'syllabus-hidden')
const readHiddenSyllabus = () => JSON.parse(localStorage.getItem(hiddenSyllabusKey()) || '[]')

const mockSyllabusFor = (subjectId) => {
  const base = Number(subjectId) || 1
  return MOCK_SYLLABUS.map(([days, title, kind, assessmentType, description], index) => ({
    id: base * 100 + index,
    subject_id: base,
    resource_id: null,
    date: isoDateInDays(days),
    title,
    description,
    links: [],
    kind,
    assessment_type: assessmentType,
    source_url: 'https://www.inf.upol.cz/',
    hidden: false,
  }))
}

export const getSyllabus = async (subjectId, { withHidden = false } = {}) => {
  await delay(MOCK_DELAY)
  const hidden = readHiddenSyllabus()
  const items = mockSyllabusFor(subjectId).map((item) => ({ ...item, hidden: hidden.includes(item.id) }))
  return success(withHidden ? items : items.filter((item) => !item.hidden))
}

export const getWebAssessments = async () => {
  await delay(MOCK_DELAY)
  const key = getNamespacedKey(mockUserId(), 'subjects')
  const subjects = JSON.parse(localStorage.getItem(key) || 'null') ?? INITIAL_SUBJECTS
  const hidden = readHiddenSyllabus()
  return success(subjects.flatMap((subject) =>
    mockSyllabusFor(subject.id)
      .filter((item) => item.kind === 'assessment' && !hidden.includes(item.id))
      .map((item) => ({
        id: `web-${item.id}`, syllabusItemId: item.id, source: 'web', subjectId: subject.id, subject_id: subject.id,
        subjectCode: subject.code, title: item.title, description: item.description, type: item.assessment_type,
        assessmentType: item.assessment_type, date: item.date, dueDate: item.date, completed: false, sourceUrl: item.source_url,
      }))
  ))
}

const setSyllabusHidden = (id, hidden) => {
  const list = readHiddenSyllabus().filter((x) => x !== Number(id))
  localStorage.setItem(hiddenSyllabusKey(), JSON.stringify(hidden ? [...list, Number(id)] : list))
  return success({ id: Number(id), hidden })
}

export const hideSyllabusItem = async (id) => {
  await delay(100)
  return setSyllabusHidden(id, true)
}

export const unhideSyllabusItem = async (id) => {
  await delay(100)
  return setSyllabusHidden(id, false)
}

export const getSubjectDetail = async (subjectId) => {
  await delay(MOCK_DELAY)
  const user = getCurrentMockUser()
  const userId = user ? user.id : 'fallback'
  const key = getNamespacedKey(userId, 'subjects')
  const saved = localStorage.getItem(key)
  const list = saved ? JSON.parse(saved) : INITIAL_SUBJECTS
  const subject = list.find((s) => s.id === Number(subjectId) || s.id === subjectId)
  if (!subject) {
    return failure('Subject not found')
  }
  return success(subject)
}
