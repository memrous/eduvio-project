import * as mockApi from './api.mock'
import * as realApi from './api.real'

const isMock = import.meta.env.VITE_USE_MOCK === 'true'
const activeApi = isMock ? mockApi : realApi

export const login = activeApi.login
export const register = activeApi.register
export const getAppConfig = activeApi.getAppConfig
export const checkAvailability = activeApi.checkAvailability
export const logout = activeApi.logout
export const getUser = activeApi.getUser
export const getStudyProgress = activeApi.getStudyProgress
export const getStagRedirectUrl = activeApi.getStagRedirectUrl
export const disconnectStag = activeApi.disconnectStag
export const createStagAgentToken = activeApi.createStagAgentToken
export const revokeStagAgentToken = activeApi.revokeStagAgentToken
export const getStagSyncStatus = activeApi.getStagSyncStatus
export const resyncStag = activeApi.resyncStag
export const requestStagSync = activeApi.requestStagSync
export const startMoodleLaunch = activeApi.startMoodleLaunch
export const connectMoodleToken = activeApi.connectMoodleToken
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
export const getMaterialFile = activeApi.getMaterialFile
export const createResource = activeApi.createResource
export const updateResource = activeApi.updateResource
export const deleteResource = activeApi.deleteResource
export const markResourceSeen = activeApi.markResourceSeen
export const assignResourceEvent = activeApi.assignResourceEvent
export const updateMaterial = activeApi.updateMaterial
export const hideResource = activeApi.hideResource
export const unhideResource = activeApi.unhideResource
export const setResourceForExam = activeApi.setResourceForExam
export const getDepartmentLinksStatus = activeApi.getDepartmentLinksStatus
export const refreshDepartmentLinks = activeApi.refreshDepartmentLinks
export const getDashboardSummary = activeApi.getDashboardSummary
export const getRequirements = activeApi.getRequirements
export const createRequirement = activeApi.createRequirement
export const updateRequirement = activeApi.updateRequirement
export const deleteRequirement = activeApi.deleteRequirement
export const getNote = activeApi.getNote
export const updateNote = activeApi.updateNote
export const getExamTerms = activeApi.getExamTerms
export const getExamTopics = activeApi.getExamTopics
export const addExamTopics = activeApi.addExamTopics
export const updateExamTopic = activeApi.updateExamTopic
export const deleteExamTopic = activeApi.deleteExamTopic
export const getSyllabus = activeApi.getSyllabus
export const getWebAssessments = activeApi.getWebAssessments
export const hideSyllabusItem = activeApi.hideSyllabusItem
export const unhideSyllabusItem = activeApi.unhideSyllabusItem
export const getSubjectDetail = activeApi.getSubjectDetail