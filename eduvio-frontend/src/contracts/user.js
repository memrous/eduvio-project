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
 * @property {UserRole} role          - Access level
 * @property {string}   [program]     - e.g. "Computer Science, Bc."
 * @property {string}   [avatarUrl]   - Profile photo URL
 * @property {string}   [university]  - University name
 * @property {string}   [faculty]     - Faculty name
 * @property {string}   [year]        - Study year, e.g. "1st Year"
 * @property {boolean}  [stagConnected] - Whether connected to STAG system
 */

export {} // keeps this a proper ES module
