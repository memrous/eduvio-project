/**
 * src/contracts/user.js
 *
 * API contract for the User (authenticated account) entity.
 *
 * This JSDoc typedef is the single source of truth for the User shape
 * shared between the React frontend and the future Laravel backend.
 *
 * Laravel endpoint (planned):
 *   GET  /api/user           → User  (requires Bearer token)
 *   POST /api/login          → { user: User, token: string }
 *   POST /api/register       → { user: User, token: string }
 *   POST /api/logout         → void
 */

/**
 * @typedef {'student'|'teacher'|'admin'} UserRole
 */

/**
 * @typedef {Object} User
 * @property {number}   id            - Unique identifier
 * @property {string}   name          - Full display name
 * @property {string}   email         - Unique email address
 * @property {string}   username      - Unique username
 * @property {UserRole} [role]        - Access level
 * @property {string}   [avatarUrl]   - Profile photo URL
 * @property {boolean}  stag_connected   - Whether STAG is connected
 * @property {boolean}  moodle_connected - Whether Moodle is connected
 *
 * Study details are never entered by the user; they come from the STAG sync
 * (POST /api/stag/sync-student) and are null until the first sync:
 * @property {string|null} [study_program]
 * @property {string|null} [study_program_code]
 * @property {string|null} [faculty]          - Faculty code from STAG, e.g. "PRF"
 * @property {string|null} [study_form]       - e.g. "P" (full-time)
 * @property {string|null} [study_type]       - e.g. "B" (bachelor)
 * @property {number|null} [study_year]
 * @property {string|null} [study_status]
 * @property {string|null} [study_officer_name]
 * @property {string|null} [study_officer_email]
 * @property {string|null} [study_officer_phone]
 * @property {string|null} [study_info_synced_at]
 */

export {} // keeps this a proper ES module
