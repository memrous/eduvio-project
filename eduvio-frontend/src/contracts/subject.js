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
 */

export {} // keeps this a proper ES module
