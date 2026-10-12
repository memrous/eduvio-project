/* eslint-disable no-unused-vars */
import httpClient, { setAuthToken } from './httpClient'

const success = (data) => ({ data, error: null, status: 'success' })
const failure = (error) => ({ data: null, error, status: 'error' })

const dispatchUnauthorized = () => {
  window.dispatchEvent(new Event('eduvio:unauthorized'))
}

const isNetworkError = (error) => !error.response

const normalizeHttpError = (error) => {
  if (error?.response?.status === 401) {
    dispatchUnauthorized()
    return failure('unauthorized')
  }

  if (isNetworkError(error)) {
    return failure('network_error')
  }

  if (error?.response?.status === 422) {
    const errors = error?.response?.data?.errors
    // Domain errors (e.g. Moodle launch checks) come as { error: 'code' } without a validation bag
    const errorCode = typeof error?.response?.data?.error === 'string' ? error.response.data.error : null
    const errKey = (errors?.email || errors?.password) ? 'invalid_credentials' : (Object.values(errors ?? {}).flat()[0] ?? errorCode ?? 'validation_error')
    return {
      data: null,
      error: errKey,
      errors: errors,
      status: 'error'
    }
  }

  if (error?.response?.status === 403 && typeof error?.response?.data?.error === 'string') {
    // Forbidden with a machine-readable code (e.g. 'registration_disabled')
    return failure(error.response.data.error)
  }

  if (error?.response?.status === 409 && typeof error?.response?.data?.error === 'string') {
    // Conflict with a machine-readable code (e.g. 'agent_mode' when STAG is synced by the local agent)
    return failure(error.response.data.error)
  }

  if (error?.response?.status === 429) {
    // Preserve the full body so callers can read retry_after_seconds / next_allowed_at
    return {
      data: error.response.data ?? null,
      error: 'rate_limited',
      status: 'error',
    }
  }

  if (error?.response?.status === 500) {
    return failure('server_error')
  }

  return failure(error?.response?.data?.message || error?.message || 'unknown_error')
}

const request = async (handler) => {
  try {
    const data = await handler()
    return success(data)
  } catch (error) {
    return normalizeHttpError(error)
  }
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

export const login = async (email, password) => {
  const result = await request(() => httpClient.post('/login', { email, password }).then((res) => res.data))
  if (result.status === 'success' && result.data?.token) {
    setAuthToken(result.data.token)
  }
  return result
}

export const register = async (...args) => {
  const payload = normalizeRegisterPayload(args)
  const result = await request(() => httpClient.post('/register', payload).then((res) => res.data))
  if (result.status === 'success' && result.data?.token) {
    setAuthToken(result.data.token)
  }
  return result
}

// Public settings before login (whether registration is open)
export const getAppConfig = async () => {
  return request(() => httpClient.get('/config').then((res) => res.data))
}

export const checkAvailability = async ({ email, username }) => {
  return request(() => httpClient.post('/check-availability', { email, username }).then((res) => res.data))
}

export const logout = async () => {
  const result = await request(() => httpClient.post('/logout').then((res) => res.data))
  setAuthToken(null)
  return result
}

export const getUser = async () => {
  return request(() => httpClient.get('/user').then((res) => res.data))
}

export const getStudyProgress = async () => {
  return request(() => httpClient.get('/user/study-progress').then((res) => res.data))
}

export const getStagRedirectUrl = async () => {
  return request(() => httpClient.get('/user/stag/redirect').then((res) => res.data))
}

// The plain token is in the response only — callers must keep it in local component state.
export const createStagAgentToken = async () => {
  return request(() => httpClient.post('/user/stag/agent-token').then((res) => res.data))
}

export const revokeStagAgentToken = async () => {
  return request(() => httpClient.delete('/user/stag/agent-token').then((res) => res.data))
}

export const disconnectStag = async () => {
  return request(() => httpClient.delete('/user/stag').then((res) => res.data))
}

export const getStagSyncStatus = async () => {
  return request(() => httpClient.get('/user/stag/status').then((res) => res.data))
}

export const resyncStag = async () => {
  return request(() => httpClient.post('/user/stag/resync').then((res) => res.data))
}

// "Sync now": agent mode leaves a request for the notebook agent, server mode resyncs
export const requestStagSync = async () => {
  return request(() => httpClient.post('/user/stag/request-sync').then((res) => res.data))
}

export const startMoodleLaunch = async () => {
  return request(() => httpClient.post('/user/moodle/launch').then((res) => res.data))
}

export const connectMoodleToken = async (token) => {
  return request(() => httpClient.post('/user/moodle/token', { token }).then((res) => res.data))
}

export const disconnectMoodle = async () => {
  return request(() => httpClient.delete('/user/moodle').then((res) => res.data))
}

export const getMoodleSyncStatus = async () => {
  return request(() => httpClient.get('/user/moodle/status').then((res) => res.data))
}

export const resyncMoodle = async () => {
  return request(() => httpClient.post('/user/moodle/resync').then((res) => res.data))
}

export const getSubjects = async (userId) => {
  return request(() => httpClient.get('/subjects').then((res) => res.data))
}

export const createSubject = async (userId, newSubject) => {
  return request(() => httpClient.post('/subjects', newSubject).then((res) => res.data))
}

export const deleteSubject = async (userId, subjectId) => {
  return request(() => httpClient.delete(`/subjects/${subjectId}`).then((res) => res.data))
}


export const getEvents = async (userId) => {
  return request(() => httpClient.get('/events').then((res) => res.data))
}

export const createEvent = async (userId, newEvent) => {
  return request(() => httpClient.post('/events', newEvent).then((res) => res.data))
}

export const editEvent = async (userId, eventId, updatedEvent) => {
  return request(() => httpClient.put(`/events/${eventId}`, updatedEvent).then((res) => res.data))
}

export const deleteEvent = async (userId, eventId) => {
  return request(() => httpClient.delete(`/events/${eventId}`).then((res) => res.data))
}

export const updateEventStatus = async (userId, eventId, status) => {
  return request(() => httpClient.patch(`/events/${eventId}/status`, { status }).then((res) => res.data))
}

export const getResources = async (userId) => {
  return request(() => httpClient.get('/materials').then((res) => res.data))
}

// Uploaded file of a material (private storage): fetched with the Bearer token as a Blob
export const getMaterialFile = async (resource, { download = false } = {}) => {
  return request(() =>
    httpClient.get(`/materials/${resource.id}/file`, {
      params: download ? { download: 1 } : undefined,
      responseType: 'blob',
      // Files may have up to 50 MB
      timeout: 120000,
    }).then((res) => res.data)
  )
}

export const createResource = async (userId, newResource) => {
  if (newResource.file) {
    const formData = new FormData()
    Object.keys(newResource).forEach((key) => {
      if (newResource[key] !== null && newResource[key] !== undefined) {
        formData.append(key, newResource[key])
      }
    })
    return request(() =>
      httpClient.post('/materials', formData, {
        headers: {
          'Content-Type': undefined,
        },
      }).then((res) => res.data)
    )
  }
  return request(() => httpClient.post('/materials', newResource).then((res) => res.data))
}

export const updateResource = async (userId, resourceId, updates) => {
  return request(() => httpClient.put(`/materials/${resourceId}`, updates).then((res) => res.data))
}

export const deleteResource = async (userId, resourceId) => {
  return request(() => httpClient.delete(`/materials/${resourceId}`).then((res) => res.data))
}

/**
 * Change a material (PATCH). A new file goes as multipart POST with
 * _method=PATCH, because PHP does not parse multipart PATCH bodies.
 */
export const updateMaterial = async (userId, resourceId, fields) => {
  if (fields.file) {
    const formData = new FormData()
    formData.append('_method', 'PATCH')
    Object.entries(fields).forEach(([key, value]) => {
      // FormData has no null: an empty value clears a nullable field
      formData.append(key, value === null || value === undefined ? '' : value)
    })
    return request(() =>
      httpClient.post(`/materials/${resourceId}`, formData, { headers: { 'Content-Type': undefined } }).then((res) => res.data)
    )
  }
  return request(() => httpClient.patch(`/materials/${resourceId}`, fields).then((res) => res.data))
}

export const hideResource = async (userId, resourceId) => {
  return request(() => httpClient.post(`/materials/${resourceId}/hide`).then((res) => res.data))
}

export const unhideResource = async (userId, resourceId) => {
  return request(() => httpClient.post(`/materials/${resourceId}/unhide`).then((res) => res.data))
}

export const setResourceForExam = async (userId, resourceId, forExam) => {
  const method = forExam ? 'post' : 'delete'
  return request(() => httpClient[method](`/materials/${resourceId}/for-exam`).then((res) => res.data))
}

export const assignResourceEvent = async (userId, resourceId, eventId) => {
  return request(() => httpClient.patch(`/materials/${resourceId}`, { eventId }).then((res) => res.data))
}

export const markResourceSeen = async (userId, resourceId) => {
  return request(() => httpClient.post(`/materials/${resourceId}/seen`).then((res) => res.data))
}

export const getDepartmentLinksStatus = async () => {
  return request(() => httpClient.get('/user/department-links/status').then((res) => res.data))
}

export const refreshDepartmentLinks = async () => {
  return request(() => httpClient.post('/user/department-links/refresh').then((res) => res.data))
}

export const getDashboardSummary = async () => {
  return request(() => httpClient.get('/dashboard/summary').then((res) => res.data))
}

export const getRequirements = async (subjectId) => {
  return request(() => httpClient.get('/requirements', { params: subjectId ? { subjectId } : {} }).then((res) => res.data))
}
export const createRequirement = async (newRequirement) => {
  return request(() => httpClient.post('/requirements', newRequirement).then((res) => res.data))
}
export const updateRequirement = async (id, updates) => {
  return request(() => httpClient.put(`/requirements/${id}`, updates).then((res) => res.data))
}
export const deleteRequirement = async (id) => {
  return request(() => httpClient.delete(`/requirements/${id}`).then((res) => res.data))
}
export const getNote = async (subjectId) => {
  return request(() => httpClient.get(`/subjects/${subjectId}/note`).then((res) => res.data))
}
export const updateNote = async (subjectId, content) => {
  return request(() => httpClient.put(`/subjects/${subjectId}/note`, { content }).then((res) => res.data))
}
export const getSubjectDetail = async (subjectId) => {
  return request(() => httpClient.get(`/subjects/${subjectId}`).then((res) => res.data))
}

// Exam: terms from STAG (read-only) and the student's topic checklist
export const getExamTerms = async (subjectId) => {
  return request(() => httpClient.get(`/subjects/${subjectId}/exam-terms`).then((res) => res.data))
}
export const getExamTopics = async (subjectId) => {
  return request(() => httpClient.get(`/subjects/${subjectId}/exam-topics`).then((res) => res.data))
}
export const addExamTopics = async (subjectId, titles) => {
  return request(() => httpClient.post(`/subjects/${subjectId}/exam-topics`, { titles }).then((res) => res.data))
}
export const updateExamTopic = async (topicId, fields) => {
  return request(() => httpClient.patch(`/exam-topics/${topicId}`, fields).then((res) => res.data))
}
export const deleteExamTopic = async (topicId) => {
  return request(() => httpClient.delete(`/exam-topics/${topicId}`).then((res) => res.data))
}

// Semester schedule from teachers' course pages
export const getSyllabus = async (subjectId, { withHidden = false } = {}) => {
  const params = withHidden ? { with_hidden: 1 } : undefined
  return request(() => httpClient.get(`/subjects/${subjectId}/syllabus`, { params }).then((res) => res.data))
}
export const getWebAssessments = async () => {
  return request(() => httpClient.get('/syllabus/assessments').then((res) => res.data))
}
export const hideSyllabusItem = async (id) => {
  return request(() => httpClient.post(`/syllabus-items/${id}/hide`).then((res) => res.data))
}
export const unhideSyllabusItem = async (id) => {
  return request(() => httpClient.post(`/syllabus-items/${id}/unhide`).then((res) => res.data))
}