import * as mockApi from './api.mock'
import * as realApi from './api.real'

const isMock = import.meta.env.VITE_USE_MOCK === 'true'
const activeApi = isMock ? mockApi : realApi

export const login = activeApi.login
export const register = activeApi.register
export const checkAvailability = activeApi.checkAvailability
export const logout = activeApi.logout
export const getUser = activeApi.getUser
export const connectStag = activeApi.connectStag
export const disconnectStag = activeApi.disconnectStag
export const getStagSyncStatus = activeApi.getStagSyncStatus
export const resyncStag = activeApi.resyncStag
export const connectMoodle = activeApi.connectMoodle
export const disconnectMoodle = activeApi.disconnectMoodle
export const getMoodleSyncStatus = activeApi.getMoodleSyncStatus
export const resyncMoodle = activeApi.resyncMoodle
export const getSubjects = activeApi.getSubjects
export const createSubject = activeApi.createSubject
export const deleteSubject = activeApi.deleteSubject

export const getEvents = activeApi.getEvents
export const createEvent = activeApi.createEvent
export const editEvent = activeApi.editEvent
export const deleteEvent = activeApi.deleteEvent
export const updateEventStatus = activeApi.updateEventStatus
export const getResources = activeApi.getResources
export const createResource = activeApi.createResource
export const getDashboardSummary = activeApi.getDashboardSummary
export const getRequirements = activeApi.getRequirements
export const createRequirement = activeApi.createRequirement
export const updateRequirement = activeApi.updateRequirement
export const deleteRequirement = activeApi.deleteRequirement
export const getNote = activeApi.getNote
export const updateNote = activeApi.updateNote
export const getSubjectDetail = activeApi.getSubjectDetail