import {
  INITIAL_SUBJECTS,
  INITIAL_EVENTS,
  INITIAL_RESOURCES,
} from '../data/mockData'

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
    university: 'Palacký University Olomouc',
    faculty: 'Faculty of Science',
    program: 'Applied Informatics',
    year: '1st Year',
    stag_student_id: null,
    stag_ticket: null,
    stag_ticket_expires_at: null,
    stag_user_name: null,
    role: 'student',
    avatarUrl:
      'src/assets/icons/user.png',
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
    university: 'Palacký University Olomouc',
    faculty: 'Faculty of Science',
    program: 'Student',
    year: '1st Year',
    stag_student_id: null,
    stag_ticket: null,
    stag_ticket_expires_at: null,
    stag_user_name: null,
    role: 'student',
    avatarUrl:
      'src/assets/icons/user.png',
  }

  mockRegisteredUsers.push(newUser)
  const token = `mock-token-${newUser.id}-${Date.now()}`
  return success({ user: sanitizeUser(newUser), token })
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
  const updatedList = [...list, newResource]
  localStorage.setItem(key, JSON.stringify(updatedList))
  return success(newResource)
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
