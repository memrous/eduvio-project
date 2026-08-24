import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  Loader2,
  ShieldCheck,
  Unlink2,
  Link2,
  KeyRound,
  RefreshCw,
} from 'lucide-react'
import * as api from '../../services/api'

const emptyMoodleForm = {
  moodleUsername: '',
  moodlePassword: '',
}

const MoodleIntegrationCard = ({
  effectiveUser,
  isMoodleConnected,
  refreshUser,
  toast,
  onUserUpdate,
}) => {
  const { t } = useTranslation('profile')
  const [showMoodleForm, setShowMoodleForm] = useState(false)
  const [moodleForm, setMoodleForm] = useState(emptyMoodleForm)
  const [moodleErrors, setMoodleErrors] = useState({})
  const [moodleSubmitting, setMoodleSubmitting] = useState(false)
  const [moodleDisconnecting, setMoodleDisconnecting] = useState(false)
  const [moodleResyncLoading, setMoodleResyncLoading] = useState(false)
  const [moodleSyncStatus, setMoodleSyncStatus] = useState(effectiveUser?.moodle_sync_status ?? null)
  const [moodleNextAllowedAt, setMoodleNextAllowedAt] = useState(null)
  const [moodleCooldownSecs, setMoodleCooldownSecs] = useState(0)

  // eslint-disable-next-line no-unused-vars
  const [moodleSyncPolling, setMoodleSyncPolling] = useState(false)

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
          const refreshed = await refreshUser()
          if (refreshed && onUserUpdate) onUserUpdate(refreshed)
        }
      }
    }, 3000)

    return () => {
      clearInterval(interval)
      setMoodleSyncPolling(false)
    }
  }, [moodleSyncStatus, refreshUser, effectiveUser, onUserUpdate])

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

  const handleMoodleInput = (field) => (event) => {
    const { value } = event.target
    setMoodleForm((prev) => ({ ...prev, [field]: value }))
    setMoodleErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validateMoodleForm = () => {
    const errors = {}

    if (!moodleForm.moodleUsername.trim()) {
      errors.moodleUsername = t('validation.usernameRequired')
    }

    if (!moodleForm.moodlePassword.trim()) {
      errors.moodlePassword = t('validation.passwordRequired')
    }

    return errors
  }

  const syncUser = async () => {
    const refreshedUser = await refreshUser()
    if (refreshedUser) {
      if (onUserUpdate) onUserUpdate(refreshedUser)
      setMoodleSyncStatus(refreshedUser.moodle_sync_status ?? null)
    }
    return refreshedUser
  }

  const handleMoodleSubmit = async (event) => {
    event.preventDefault()

    const errors = validateMoodleForm()
    if (Object.keys(errors).length) {
      setMoodleErrors(errors)
      return
    }

    setMoodleSubmitting(true)
    try {
      const response = await api.connectMoodle({
        moodle_username: moodleForm.moodleUsername.trim(),
        moodle_password: moodleForm.moodlePassword,
      })

      if (response.status === 'error') {
        toast.error(t('toast.moodleConnectFailed'))
        return
      }

      const updatedUser = response.data?.user || (await syncUser())
      if (updatedUser && onUserUpdate) {
        onUserUpdate(updatedUser)
      }
      setShowMoodleForm(false)
      setMoodleForm(emptyMoodleForm)
      setMoodleErrors({})
      setMoodleSyncStatus('pending')
      toast.success(t('moodle.syncing.background'))
    } catch {
      toast.error(t('toast.moodleConnectFailed'))
    } finally {
      setMoodleSubmitting(false)
    }
  }

  const handleDisconnectMoodle = async () => {
    setMoodleDisconnecting(true)

    try {
      const response = await api.disconnectMoodle()
      if (response.status === 'error') {
        toast.error(t('toast.moodleDisconnectFailed'))
        return
      }

      const updatedUser = response.data?.user || (await syncUser())
      if (updatedUser && onUserUpdate) {
        onUserUpdate(updatedUser)
      }
      setShowMoodleForm(false)
      setMoodleForm(emptyMoodleForm)
      setMoodleErrors({})
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

      if (response.status === 'error') {
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

      if (response.data?.next_allowed_at) {
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
            <p className="text-sm text-on-surface-variant">
              {t('moodle.card.helper')}
            </p>

            {!showMoodleForm ? (
              <button
                type="button"
                onClick={() => setShowMoodleForm(true)}
                className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-on-primary px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors hover:bg-primary-container"
              >
                <Link2 className="h-4 w-4" />
                {t('moodle.actions.connect')}
              </button>
            ) : (
              <form onSubmit={handleMoodleSubmit} className="space-y-4 rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
                <div className="grid gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-on-surface" htmlFor="profile-moodle-username">
                      {t('moodle.labels.username')}
                    </label>
                    <input
                      id="profile-moodle-username"
                      type="text"
                      value={moodleForm.moodleUsername}
                      onChange={handleMoodleInput('moodleUsername')}
                      className={`w-full rounded-lg border px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 ${moodleErrors.moodleUsername ? 'border-error bg-error-container' : 'border-outline-variant bg-surface'}`}
                    />
                    {moodleErrors.moodleUsername && (
                      <p className="text-xs text-error">{moodleErrors.moodleUsername}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-on-surface" htmlFor="profile-moodle-password">
                      {t('moodle.labels.password')}
                    </label>
                    <div className="relative">
                      <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                      <input
                        id="profile-moodle-password"
                        type="password"
                        value={moodleForm.moodlePassword}
                        onChange={handleMoodleInput('moodlePassword')}
                        className={`w-full rounded-lg border px-4 py-2.5 pl-10 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 ${moodleErrors.moodlePassword ? 'border-error bg-error-container' : 'border-outline-variant bg-surface'}`}
                      />
                    </div>
                    {moodleErrors.moodlePassword && (
                      <p className="text-xs text-error">{moodleErrors.moodlePassword}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={moodleSubmitting}
                    className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-on-primary px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {moodleSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                    {t('moodle.actions.connect')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoodleForm(false)
                      setMoodleForm(emptyMoodleForm)
                      setMoodleErrors({})
                    }}
                    className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-4 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-low"
                  >
                    {t('moodle.actions.cancel')}
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-xl border border-success/30 bg-success-container/10 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-success">{t('moodle.labels.username')}</p>
                <p className="mt-1 text-sm font-semibold text-on-surface">{effectiveUser.moodle_username || 'N/A'}</p>
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
