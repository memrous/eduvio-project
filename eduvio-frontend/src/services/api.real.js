/* eslint-disable no-unused-vars */
import httpClient, { setAuthToken } from './httpClient'

const success = (data) => ({ data, error: null, status: 'success' })
const failure = (error) => ({ data: null, error, status: 'error' })

const dispatchUnauthorized = () => {
  window.dispatchEvent(new Event('studyhub:unauthorized'))
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
    const errKey = (errors?.email || errors?.password) ? 'invalid_credentials' : (Object.values(errors ?? {}).flat()[0] ?? 'validation_error')
    return {
      data: null,
      error: errKey,
      errors: errors,
      status: 'error'
    }
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

  const [name, username, email, password, stagStudentId, stagUsername, stagPassword] = args

  return {
    name,
    username,
    email,
    password,
    ...(stagStudentId ? { stag_student_id: stagStudentId } : {}),
    ...(stagUsername ? { stag_username: stagUsername } : {}),
    ...(stagPassword ? { stag_password: stagPassword } : {}),
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

export const connectStag = async (payload) => {
  return request(() => httpClient.post('/user/stag', payload).then((res) => res.data))
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

export const connectMoodle = async (payload) => {
  return request(() => httpClient.post('/user/moodle', payload).then((res) => res.data))
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