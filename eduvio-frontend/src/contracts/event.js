/**
 * src/contracts/event.js
 *
 * API contract for the Event (calendar entry) entity.
 *
 * This JSDoc typedef is the single source of truth for the Event shape
 * shared between the React frontend and the future Laravel backend.
 *
 * Laravel endpoint (planned):
 *   GET  /api/events         → Event[]
 *   POST /api/events         → Event
 *   PUT  /api/events/:id     → Event
 *   DEL  /api/events/:id     → void
 */

/**
 * @typedef {'Lecture'|'Lab'|'Assignment'|'Test'|'Quiz'|'Exam'|'Deadline'} EventType
 */

/**
 * @typedef {'Not Started'|'In Progress'|'Done'} EventStatus
 */

/**
 * @typedef {Object} Event
 * @property {number}      id          - Unique identifier
 * @property {number}      subjectId   - FK → Subject.id
 * @property {string}      title       - Display title, e.g. "Midterm Exam"
 * @property {EventType}   type        - Category of the event
 * @property {string}      date        - ISO date string YYYY-MM-DD
 * @property {string}      [startTime] - Start time, e.g. "10:00"
 * @property {string}      [endTime]   - End time, e.g. "11:30"
 * @property {EventStatus} [status]    - Completion status
 * @property {string}      [description] - Optional notes
 */

export {} // keeps this a proper ES module
