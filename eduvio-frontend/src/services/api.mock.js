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
    stag_username: null,
    stag_password: null,
    role: 'student',
    avatarUrl:
      'src/assets/icons/user.png',
  },
]
const mockRegisteredUsers = [...MOCK_USER_DB]

const sanitizeUser = (user) => {
  const copy = { ...user }
  delete copy.password
  return copy
}

const getNamespacedKey = (userId, key) => {
  const scope = userId || 'fallback'
  return `studyhub:${scope}:${key}`
}

const getAuthTokenFromStorage = () => {
  const authDataStr = localStorage.getItem('studyhub:auth')
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

  const [name, username, email, password, stagStudentId, stagUsername, stagPassword] = args

  return {
    name,
    username,
    email,
    password,
    stag_student_id: stagStudentId || null,
    stag_username: stagUsername || null,
    stag_password: stagPassword || null,
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
    stag_student_id: payload.stag_student_id ?? null,
    stag_username: payload.stag_username ?? null,
    stag_password: payload.stag_password ?? null,
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

export const connectStag = async (payload) => {
  await delay(400)

  const currentUser = getCurrentMockUser()
  if (!currentUser) {
    return failure('unauthorized')
  }

  currentUser.stag_student_id = payload.stag_student_id ?? payload.stagStudentId ?? null
  currentUser.stag_username = payload.stag_username ?? payload.stagUsername ?? null
  currentUser.stag_password = payload.stag_password ?? payload.stagPassword ?? null

  return success({ user: sanitizeUser(currentUser) })
}

export const disconnectStag = async () => {
  await delay(300)

  const currentUser = getCurrentMockUser()
  if (!currentUser) {
    return failure('unauthorized')
  }

  currentUser.stag_student_id = null
  currentUser.stag_username = null
  currentUser.stag_password = null

  return success({ user: sanitizeUser(currentUser) })
}

export const getStagSyncStatus = async () => {
  await delay(200)
  return success({ stag_sync_status: 'success', stag_synced_at: new Date().toISOString(), next_allowed_at: null })
}

export const resyncStag = async () => {
  await delay(400)
  const currentUser = getCurrentMockUser()
  if (!currentUser) return failure('unauthorized')
  if (!currentUser.stag_student_id) return { data: null, error: 'STAG is not connected.', status: 'error' }
  // In mock mode, always succeed
  const nextAllowedAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()
  return success({
    message: 'Resync started in background.',
    next_allowed_at: nextAllowedAt,
  })
}

export const connectMoodle = async (payload) => {
  await delay(400)

  const currentUser = getCurrentMockUser()
  if (!currentUser) {
    return failure('unauthorized')
  }

  currentUser.moodle_username = payload.moodle_username ?? payload.moodleUsername ?? null
  currentUser.moodle_password = payload.moodle_password ?? payload.moodlePassword ?? null

  return success({ user: sanitizeUser(currentUser) })
}

export const disconnectMoodle = async () => {
  await delay(300)

  const currentUser = getCurrentMockUser()
  if (!currentUser) {
    return failure('unauthorized')
  }

  currentUser.moodle_username = null
  currentUser.moodle_password = null

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
  if (!currentUser.moodle_username) return { data: null, error: 'Moodle is not connected.', status: 'error' }
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
