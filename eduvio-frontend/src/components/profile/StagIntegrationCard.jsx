import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  Loader2,
  ShieldCheck,
  Unlink2,
  Link2,
  LayoutGrid,
  RefreshCw,
} from 'lucide-react'
import * as api from '../../services/api'

const StagIntegrationCard = ({
  effectiveUser,
  isStagConnected,
  refreshUser,
  toast,
  navigate,
  onUserUpdate,
}) => {
  const { t } = useTranslation('profile')
  const [stagRedirecting, setStagRedirecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [resyncLoading, setResyncLoading] = useState(false)
  const [syncStatus, setSyncStatus] = useState(effectiveUser?.stag_sync_status ?? null)
  const [nextAllowedAt, setNextAllowedAt] = useState(null)
  const [cooldownSecs, setCooldownSecs] = useState(0)

  // eslint-disable-next-line no-unused-vars
  const [syncPolling, setSyncPolling] = useState(false)

  // Fetch STAG status on mount to retrieve next_allowed_at
  useEffect(() => {
    let active = true

    const loadStagStatus = async () => {
      const statusRes = await api.getStagSyncStatus()
      if (!active) return
      if (statusRes.status === 'success' && statusRes.data?.next_allowed_at) {
        setNextAllowedAt(statusRes.data.next_allowed_at)
      }
    }

    loadStagStatus()

    return () => {
      active = false
    }
  }, [])

  // Polling effect for STAG sync status
  useEffect(() => {
    if (!effectiveUser || syncStatus !== 'pending') return

    setTimeout(() => {
      setSyncPolling(true)
    }, 0)
    const interval = setInterval(async () => {
      const result = await api.getStagSyncStatus()

      // Guard: stop polling immediately if the session ended (logout / token expiry)
      if (result.error === 'unauthorized') {
        clearInterval(interval)
        setSyncPolling(false)
        return
      }

      if (result.status === 'success') {
        const newStatus = result.data?.stag_sync_status
        setSyncStatus(newStatus)
        if (result.data?.next_allowed_at) {
          setNextAllowedAt(result.data.next_allowed_at)
        }
        if (newStatus !== 'pending') {
          clearInterval(interval)
          setSyncPolling(false)
          // Refresh user data to update the connected badge
          const refreshed = await refreshUser()
          if (refreshed && onUserUpdate) onUserUpdate(refreshed)
          // Auto-navigate to dashboard after sync completes
          if (newStatus === 'success' && navigate) {
            setTimeout(() => navigate('/dashboard'), 2000)
          }
        }
      }
    }, 3000)

    return () => {
      clearInterval(interval)
      setSyncPolling(false)
    }
  }, [syncStatus, refreshUser, effectiveUser, navigate, onUserUpdate])

  // Handle countdown timer based on nextAllowedAt
  useEffect(() => {
    if (!nextAllowedAt) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCooldownSecs(0)
      return
    }

    const calculateCooldown = () => {
      const diffMs = new Date(nextAllowedAt).getTime() - Date.now()
      const diffSecs = Math.max(0, Math.ceil(diffMs / 1000))
      setCooldownSecs(diffSecs)
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
  }, [nextAllowedAt])

  const syncUser = async () => {
    const refreshedUser = await refreshUser()
    if (refreshedUser) {
      if (onUserUpdate) onUserUpdate(refreshedUser)
      setSyncStatus(refreshedUser.stag_sync_status ?? null)
    }
    return refreshedUser
  }

  const handleStagConnect = async () => {
    setStagRedirecting(true)
    try {
      const response = await api.getStagRedirectUrl()
      if (response.status === 'error' || !response.data?.redirect_url) {
        toast.error(t('toast.connectFailed'))
        setStagRedirecting(false)
        return
      }
      window.location.href = response.data.redirect_url
    } catch {
      toast.error(t('toast.connectFailed'))
      setStagRedirecting(false)
    }
  }

  const handleDisconnectStag = async () => {
    setDisconnecting(true)

    try {
      const response = await api.disconnectStag()
      if (response.status === 'error') {
        toast.error(t('toast.disconnectFailed'))
        return
      }

      const updatedUser = response.data?.user || (await syncUser())
      if (updatedUser && onUserUpdate) {
        onUserUpdate(updatedUser)
      }
      setSyncStatus(null)
      setNextAllowedAt(null)
      toast.success(t('toast.disconnectSuccess'))
    } catch {
      toast.error(t('toast.disconnectFailed'))
    } finally {
      setDisconnecting(false)
    }
  }

  const handleResync = async () => {
    setResyncLoading(true)

    try {
      const response = await api.resyncStag()

      if (response.status === 'error') {
        if (response.error === 'rate_limited') {
          const nextAllowed = response.data?.next_allowed_at
          const retryAfter = response.data?.retry_after_seconds
          const retryMin = retryAfter ? Math.ceil(retryAfter / 60) : 30
          if (nextAllowed) {
            setNextAllowedAt(nextAllowed)
          }
          toast.error(t('stag.syncing.recentlyTriggered', { minutes: retryMin }))
        } else {
          toast.error(response.error || t('stag.syncing.failed'))
        }
        return
      }

      if (response.data?.next_allowed_at) {
        setNextAllowedAt(response.data.next_allowed_at)
      }
      toast.success(t('stag.syncing.started'))
      setSyncStatus('pending')
    } catch {
      toast.error(t('stag.syncing.failed'))
    } finally {
      setResyncLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {isStagConnected && syncStatus === 'pending' && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-primary-container border border-primary/30 rounded-lg">
          <Loader2 className="w-4 h-4 text-on-primary shrink-0 mt-0.5 animate-spin" />
          <p className="text-label-sm text-on-primary">{t('stag.status.syncing')}</p>
        </div>
      )}

      {isStagConnected && syncStatus === 'success' && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-success-container border border-success/30 rounded-lg">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <p className="text-label-sm text-success">{t('stag.status.success')}</p>
          </div>
          {navigate && (
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="cursor-pointer shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-on-success transition-colors"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {t('profile:stag.actions.goToDashboard')}
            </button>
          )}
        </div>
      )}

      {isStagConnected && syncStatus === 'failed' && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-error-container border border-error/30 rounded-lg">
          <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
          <p className="text-label-sm text-error">{t('stag.status.failed')}</p>
        </div>
      )}

      <div className="rounded-2xl border border-outline-variant bg-surface-container-low/80 p-5 space-y-4">
        <div className="flex md:items-center md:flex-row justify-between gap-3 flex-col items-start">
          <div>
            <h3 className="text-lg font-bold text-on-surface">{t('stag.card.title')}</h3>
            <p className="text-sm text-on-surface-variant">{t('stag.card.subtitle')}</p>
          </div>
          {isStagConnected ? (
            <span className="inline-flex items-center rounded-full bg-success-container text-success px-3 py-1 text-xs font-bold tracking-wide border border-success/30">
              {t('stag.connected.connected')}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-error-container text-error px-3 py-1 text-xs font-bold tracking-wide border border-error/30">
              {t('stag.connected.notConnected')}
            </span>
          )}
        </div>

        {!isStagConnected ? (
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">
              {t('stag.card.helper')}
            </p>

            <button
              type="button"
              onClick={handleStagConnect}
              disabled={stagRedirecting}
              className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-on-primary px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
            >
              {stagRedirecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              {t('stag.actions.connect')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-xl border border-success/30 bg-success-container/10 p-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-success">{t('stag.labels.studentId')}</p>
                <p className="mt-1 text-sm font-semibold text-on-surface">{effectiveUser.stag_student_id || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-success">{t('stag.labels.username')}</p>
                <p className="mt-1 text-sm font-semibold text-on-surface">{effectiveUser.stag_user_name || effectiveUser.stag_username || 'N/A'}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleResync}
                disabled={resyncLoading || syncStatus === 'pending' || cooldownSecs > 0}
                className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-on-primary px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resyncLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {cooldownSecs > 0
                  ? t('stag.actions.syncNowCountdown', { time: `${Math.floor(cooldownSecs / 60)}:${(cooldownSecs % 60).toString().padStart(2, '0')}` })
                  : t('stag.actions.syncNow')}
              </button>

              <button
                type="button"
                onClick={handleDisconnectStag}
                disabled={disconnecting}
                className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg border border-error-container bg-surface px-4 py-2.5 text-sm font-semibold text-error transition-colors hover:bg-error-container/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink2 className="h-4 w-4" />}
                {t('stag.actions.disconnect')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StagIntegrationCard
