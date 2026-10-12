/** Helpers for the STAG agent (STAG_MODE=agent). */

// Reports of the agent when the STAG ticket is missing or expired (watch / --non-interactive)
const LOGIN_NEEDED_ERRORS = ['Přihlas se do STAGu na notebooku', 'STAG ticket expired, run stag_agent.py login']

/** Whether the last sync failed only because the user must log in to STAG on the notebook. */
export const isStagLoginNeeded = (error) => LOGIN_NEEDED_ERRORS.includes(String(error ?? '').trim())
