/**
 * src/contracts/subject.js
 *
 * API contract for the Subject entity.
 *
 * This JSDoc typedef is the single source of truth for the Subject shape
 * shared between the React frontend and the future Laravel backend.
 *
 * Laravel endpoint (planned):
 *   GET  /api/subjects        → Subject[]
 *   POST /api/subjects        → Subject
 *   PUT  /api/subjects/:id    → Subject
 *   DEL  /api/subjects/:id    → void
 */

/**
 * @typedef {Object} Subject
 * @property {number}  id              - Unique identifier (auto-increment from DB)
 * @property {string}  code            - Subject code, e.g. "KIV/DB1"
 * @property {string}  name            - Full subject name, e.g. "Database Systems"
 * @property {number}  credits         - ECTS credit count
 * @property {string}  lecturer        - Primary lecturer full name
 * @property {string}  semester        - e.g. "ZS 2024/2025" (Czech: zimní semestr)
 * @property {boolean} isMandatory     - Whether this subject is mandatory
 * @property {string}  [completionType]- e.g. "Exam", "Credit", "Classified Credit"
 * @property {string}  [description]   - Optional syllabus description
 * @property {'stag'|'manual'} [source] - Where the subject came from
 * @property {string|null} [stag_removed_at] - ISO timestamp when the subject disappeared
 *                                     from STAG but was kept because it holds user data
 *
 * STAG details (snake_case only; texts are plain text with \r\n, people are "A, B, Ph.D."):
 * @property {string|null}  [guarantor]
 * @property {string|null}  [lecturers]
 * @property {string|null}  [tutors]
 * @property {string|null}  [stag_annotation]
 * @property {string|null}  [stag_requirements]
 * @property {string|null}  [stag_syllabus]
 * @property {string|null}  [stag_literature]
 * @property {string|null}  [stag_assessment]
 * @property {string|null}  [exam_form]
 * @property {boolean|null} [credit_before_exam]
 * @property {string|null}  [stag_url]
 * @property {string|null}  [stag_completion_state]
 * @property {string|null}  [credit_result]
 * @property {string|null}  [credit_date]      - YYYY-MM-DD
 * @property {number|null}  [credit_attempt]
 * @property {string|null}  [credit_examiner]
 * @property {string|null}  [exam_result]
 * @property {string|null}  [exam_date]        - YYYY-MM-DD
 * @property {number|null}  [exam_attempt]
 * @property {number|null}  [exam_points]
 * @property {string|null}  [exam_examiner]
 * @property {string|null}  [final_grade]      - derived from the results by the backend
 * @property {'in_progress'|'completed'|'failed'|'closed'} [status]
 * @property {number|null}  [pass_threshold]   - percent of points, only when really set
 */

export {} // keeps this a proper ES module
