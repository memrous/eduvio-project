import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ChevronDown,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Unlink2,
  Link2,
  RefreshCw,
} from 'lucide-react'
import * as api from '../../services/api'
import { extractMoodleToken } from '../../utils/moodleToken'
import { clearMoodleLaunchPending, isMoodleLaunchPending, markMoodleLaunchPending } from '../../utils/moodleLaunch'
import { RESOURCES_KEY } from '../../hooks/useResources'
import { REQUIREMENTS_KEY } from '../../hooks/useRequirements'

// Backend error codes from POST /user/moodle/token that have a dedicated message
const MOODLE_CONNECT_ERROR_KEYS = {
  launch_not_started: 'moodle.errors.launchNotStarted',
  invalid_signature: 'moodle.errors.invalidSignature',
}

const MoodleIntegrationCard = ({
  effectiveUser,
  isMoodleConnected,
  refreshUser,
  toast,
  onUserUpdate,
}) => {
  const { t } = useTranslation('profile')
  const queryClient = useQueryClient()
  const [manualToken, setManualToken] = useState('')
  const [manualError, setManualError] = useState('')
  const [manualSubmitting, setManualSubmitting] = useState(false)
  const [launchStarting, setLaunchStarting] = useState(false)
  const [moodleDisconnecting, setMoodleDisconnecting] = useState(false)
  const [moodleResyncLoading, setMoodleResyncLoading] = useState(false)
  const [moodleSyncStatus, setMoodleSyncStatus] = useState(effectiveUser?.moodle_sync_status ?? null)
  const [moodleNextAllowedAt, setMoodleNextAllowedAt] = useState(null)
  const [moodleCooldownSecs, setMoodleCooldownSecs] = useState(0)

  // eslint-disable-next-line no-unused-vars
  const [moodleSyncPolling, setMoodleSyncPolling] = useState(false)

  // Came back from Moodle (Back button) without the callback: offer the manual paste
  const [launchReturnFailed, setLaunchReturnFailed] = useState(
    () => !isMoodleConnected && isMoodleLaunchPending()
  )
  const [manualOpen, setManualOpen] = useState(launchReturnFailed)

  const supportsMoodleHandler =
    typeof navigator !== 'undefined' && 'registerProtocolHandler' in navigator && window.isSecureContext

  // Connected by any route: a pending launch flag is obsolete
  useEffect(() => {
    if (isMoodleConnected) clearMoodleLaunchPending()
  }, [isMoodleConnected])

  // bfcache restores the page with its old state: stop the spinner and re-check the flag
  useEffect(() => {
    const handlePageShow = (event) => {
      if (!event.persisted) return
      setLaunchStarting(false)
      if (!isMoodleConnected && isMoodleLaunchPending()) {
        setLaunchReturnFailed(true)
        setManualOpen(true)
      }
    }
    window.addEventListener('pageshow', handlePageShow)
    return () => window.removeEventListener('pageshow', handlePageShow)
  }, [isMoodleConnected])

  // Fetch Moodle status on mount
  useEffect(() => {
    let active = true

    const loadMoodleStatus = async () => {
      const moodleStatusRes = await api.getMoodleSyncStatus()
      if (!active) return
      if (moodleStatusRes.status === 'success') {
        if (moodleStatusRes.data?.moodle_sync_status) {
          setMoodleSyncStatus(moodleStatusRes.data.moodle_sync_status)
        }
        if (moodleStatusRes.data?.next_allowed_at) {
          setMoodleNextAllowedAt(moodleStatusRes.data.next_allowed_at)
        }
      }
    }

    loadMoodleStatus()

    return () => {
      active = false
    }
  }, [])

  // Polling effect for Moodle sync status
  useEffect(() => {
    if (!effectiveUser || moodleSyncStatus !== 'pending') return

    setTimeout(() => {
      setMoodleSyncPolling(true)
    }, 0)
    const interval = setInterval(async () => {
      const result = await api.getMoodleSyncStatus()

      if (result.error === 'unauthorized') {
        clearInterval(interval)
        setMoodleSyncPolling(false)
        return
      }

      if (result.status === 'success') {
        const newStatus = result.data?.moodle_sync_status
        setMoodleSyncStatus(newStatus)
        if (result.data?.next_allowed_at) {
          setMoodleNextAllowedAt(result.data.next_allowed_at)
        }
        if (newStatus !== 'pending') {
          clearInterval(interval)
          setMoodleSyncPolling(false)
          if (newStatus === 'success') {
            // Prefix match covers every user / subject variant of both queries.
            queryClient.invalidateQueries({ queryKey: [RESOURCES_KEY] })
            queryClient.invalidateQueries({ queryKey: [REQUIREMENTS_KEY] })
          }
          const refreshed = await refreshUser()
          if (refreshed && onUserUpdate) onUserUpdate(refreshed)
        }
      }
    }, 3000)

    return () => {
      clearInterval(interval)
      setMoodleSyncPolling(false)
    }
  }, [moodleSyncStatus, refreshUser, effectiveUser, onUserUpdate, queryClient])

  // Handle countdown timer based on moodleNextAllowedAt
  useEffect(() => {
    if (!moodleNextAllowedAt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMoodleCooldownSecs(0)
      return
    }

    const calculateCooldown = () => {
      const diffMs = new Date(moodleNextAllowedAt).getTime() - Date.now()
      const diffSecs = Math.max(0, Math.ceil(diffMs / 1000))
      setMoodleCooldownSecs(diffSecs)
      return diffSecs
    }

    const initialDiff = calculateCooldown()
    if (initialDiff <= 0) return

    const interval = setInterval(() => {
      const remaining = calculateCooldown()
      if (remaining <= 0) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [moodleNextAllowedAt])

  const syncUser = async () => {
    const refreshedUser = await refreshUser()
    if (refreshedUser) {
      if (onUserUpdate) onUserUpdate(refreshedUser)
      setMoodleSyncStatus(refreshedUser.moodle_sync_status ?? null)
    }
    return refreshedUser
  }

  const handleConnectMoodle = async () => {
    if (supportsMoodleHandler) {
      const callbackUrl = `${window.location.origin}/moodle/callback?token=%s`
      try {
        navigator.registerProtocolHandler('web+eduvio', callbackUrl)
      } catch {
        // Silently ignore errors (e.g. user already registered or denied)
      }
    }

    setLaunchStarting(true)
    try {
      const response = await api.startMoodleLaunch()
      const launchUrl = response?.data?.launch_url
      if (response?.status === 'error' || !launchUrl) {
        toast.error(t('toast.moodleConnectFailed'))
        setLaunchStarting(false)
        return
      }

      // Whole flow in this tab: profile → Moodle → /moodle/callback → profile.
      // The flag lets the profile notice a return without the callback (Back button).
      markMoodleLaunchPending()
      window.location.assign(launchUrl)
      // The spinner stays until the browser leaves the page (reset on a bfcache return)
    } catch {
      toast.error(t('toast.moodleConnectFailed'))
      setLaunchStarting(false)
    }
  }

  const handleManualSubmit = async (event) => {
    event.preventDefault()
    const trimmed = manualToken.trim()
    if (!trimmed) return

    setManualSubmitting(true)
    setManualError('')

    try {
      const decoded = extractMoodleToken(trimmed)
      if (!decoded) {
        setManualError(t('moodle.errors.decodeFailed'))
        toast.error(t('moodle.errors.decodeFailed'))
        return
      }

      const response = await api.connectMoodleToken(decoded)
      if (response?.status === 'error') {
        const errorKey = MOODLE_CONNECT_ERROR_KEYS[response.error]
        if (errorKey) {
          setManualError(t(errorKey))
          toast.error(t(errorKey))
        } else {
          toast.error(t('toast.moodleConnectFailed'))
        }
        return
      }

      const updatedUser = response?.data?.user || (await syncUser())
      if (updatedUser && onUserUpdate) {
        onUserUpdate(updatedUser)
      }
      clearMoodleLaunchPending()
      setLaunchReturnFailed(false)
      setManualToken('')
      setMoodleSyncStatus('pending')
      toast.success(t('moodle.syncing.background'))
    } catch {
      toast.error(t('toast.moodleConnectFailed'))
    } finally {
      setManualSubmitting(false)
    }
  }

  const handleDisconnectMoodle = async () => {
    setMoodleDisconnecting(true)

    try {
      const response = await api.disconnectMoodle()
      if (response?.status === 'error') {
        toast.error(t('toast.moodleDisconnectFailed'))
        return
      }

      const updatedUser = response?.data?.user || (await syncUser())
      if (updatedUser && onUserUpdate) {
        onUserUpdate(updatedUser)
      }
      setManualToken('')
      setManualError('')
      setMoodleSyncStatus(null)
      setMoodleNextAllowedAt(null)
      toast.success(t('toast.moodleDisconnectSuccess'))
    } catch {
      toast.error(t('toast.moodleDisconnectFailed'))
    } finally {
      setMoodleDisconnecting(false)
    }
  }

  const handleResyncMoodle = async () => {
    setMoodleResyncLoading(true)

    try {
      const response = await api.resyncMoodle()

      if (response?.status === 'error') {
        if (response.error === 'rate_limited') {
          const nextAllowed = response.data?.next_allowed_at
          const retryAfter = response.data?.retry_after_seconds
          const retryMin = retryAfter ? Math.ceil(retryAfter / 60) : 30
          if (nextAllowed) {
            setMoodleNextAllowedAt(nextAllowed)
          }
          toast.error(t('moodle.syncing.recentlyTriggered', { minutes: retryMin }))
        } else {
          toast.error(response.error || t('moodle.syncing.failed'))
        }
        return
      }

      if (response?.data?.next_allowed_at) {
        setMoodleNextAllowedAt(response.data.next_allowed_at)
      }
      toast.success(t('moodle.syncing.started'))
      setMoodleSyncStatus('pending')
    } catch {
      toast.error(t('moodle.syncing.failed'))
    } finally {
      setMoodleResyncLoading(false)
    }
  }

  // Manual paste of the token / final address; shared by both connect variants
  const manualForm = (
    <form onSubmit={handleManualSubmit} className="space-y-3 rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-on-surface" htmlFor="profile-moodle-manual-token">
          {t('moodle.card.manualPasteLabel')}
        </label>
        <p className="text-xs text-on-surface-variant">
          {t('moodle.card.manualPasteHint')}
        </p>
        <input
          id="profile-moodle-manual-token"
          type="text"
          value={manualToken}
          onChange={(e) => {
            setManualToken(e.target.value)
            if (manualError) setManualError('')
          }}
          placeholder={t('moodle.card.manualPastePlaceholder')}
          className={`w-full rounded-lg border px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 ${
            manualError ? 'border-error bg-error-container/20' : 'border-outline-variant bg-surface'
          }`}
        />
        {manualError && (
          <p className="text-xs text-error">{manualError}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={manualSubmitting || !manualToken.trim()}
        className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-on-primary px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
      >
        {manualSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
        {t('moodle.actions.connectManual')}
      </button>
    </form>
  )

  return (
    <div className="space-y-4">
      {isMoodleConnected && moodleSyncStatus === 'pending' && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-primary-container border border-primary/30 rounded-lg">
          <Loader2 className="w-4 h-4 text-on-primary shrink-0 mt-0.5 animate-spin" />
          <p className="text-label-sm text-on-primary">{t('moodle.status.syncing')}</p>
        </div>
      )}

      {isMoodleConnected && moodleSyncStatus === 'success' && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-success-container border border-success/30 rounded-lg">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <p className="text-label-sm text-success">{t('moodle.status.success')}</p>
          </div>
        </div>
      )}

      {isMoodleConnected && moodleSyncStatus === 'failed' && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-error-container border border-error/30 rounded-lg">
          <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
          <p className="text-label-sm text-error">{t('moodle.status.failed')}</p>
        </div>
      )}

      <div className="rounded-2xl border border-outline-variant bg-surface-container-low/80 p-5 space-y-4">
        <div className="flex md:items-center md:flex-row justify-between gap-3 flex-col items-start">
          <div>
            <h3 className="text-lg font-bold text-on-surface">{t('moodle.card.title')}</h3>
            <p className="text-sm text-on-surface-variant">{t('moodle.card.subtitle')}</p>
          </div>
          {isMoodleConnected ? (
            <span className="inline-flex items-center rounded-full bg-success-container text-success px-3 py-1 text-xs font-bold tracking-wide border border-success/30">
              {t('moodle.connected.connected')}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-error-container text-error px-3 py-1 text-xs font-bold tracking-wide border border-error/30">
              {t('moodle.connected.notConnected')}
            </span>
          )}
        </div>

        {!isMoodleConnected ? (
          <div className="space-y-4">
            {launchReturnFailed && (
              <div role="status" className="flex items-start gap-2.5 px-4 py-3 bg-warning-container border border-warning/30 rounded-lg">
                <AlertCircle className="w-4 h-4 text-on-warning-container shrink-0 mt-0.5" />
                <p className="text-label-sm text-on-warning-container">{t('moodle.card.returnFailed')}</p>
              </div>
            )}

            {supportsMoodleHandler ? (
              <div className="space-y-4">
                <p className="text-sm text-on-surface-variant">
                  {t('moodle.card.helper')}
                </p>

                <button
                  type="button"
                  onClick={handleConnectMoodle}
                  disabled={launchStarting}
                  aria-busy={launchStarting}
                  className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-on-primary px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {launchStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  {t('moodle.actions.connect')}
                </button>

                {/* Fallback when the return from Moodle does not reach the app */}
                <div>
                  <button
                    type="button"
                    onClick={() => setManualOpen((open) => !open)}
                    aria-expanded={manualOpen}
                    aria-controls="profile-moodle-manual"
                    className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${manualOpen ? 'rotate-180' : ''}`} />
                    {t('moodle.card.manualToggle')}
                  </button>
                  {manualOpen && <div id="profile-moodle-manual" className="mt-3">{manualForm}</div>}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-on-surface-variant">
                  {t('moodle.card.unsupportedBrowser')}
                </p>

                <div className="flex">
                  <button
                    type="button"
                    onClick={handleConnectMoodle}
                    disabled={launchStarting}
                    aria-busy={launchStarting}
                    className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface px-3.5 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {launchStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                    {t('moodle.actions.openMoodleLogin')}
                  </button>
                </div>

                {manualForm}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-xl border border-success/30 bg-success-container/10 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-success">{t('moodle.labels.username')}</p>
                <p className="mt-1 text-sm font-semibold text-on-surface">{effectiveUser.moodle_display_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-success">{t('moodle.labels.password')}</p>
                <p className="mt-1 text-sm font-semibold tracking-[0.25em] text-on-surface">••••••••</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleResyncMoodle}
                disabled={moodleResyncLoading || moodleSyncStatus === 'pending' || moodleCooldownSecs > 0}
                className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-on-primary px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
              >
                {moodleResyncLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {moodleCooldownSecs > 0
                  ? t('moodle.actions.syncNowCountdown', { time: `${Math.floor(moodleCooldownSecs / 60)}:${(moodleCooldownSecs % 60).toString().padStart(2, '0')}` })
                  : t('moodle.actions.syncNow')}
              </button>

              <button
                type="button"
                onClick={handleDisconnectMoodle}
                disabled={moodleDisconnecting}
                className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg border border-error-container bg-surface px-4 py-2.5 text-sm font-semibold text-error transition-colors hover:bg-error-container/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {moodleDisconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink2 className="h-4 w-4" />}
                {t('moodle.actions.disconnect')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MoodleIntegrationCard