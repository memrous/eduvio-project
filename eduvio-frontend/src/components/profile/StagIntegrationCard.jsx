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
import { useStagStatus } from '../../hooks/useStagStatus'
import StagAgentPanel from './StagAgentPanel'

/**
 * Chooses the UI by the backend's STAG mode (GET /user/stag/status → mode):
 * - 'server': ticket login + server-side sync (StagServerCard, unchanged flow)
 * - 'agent':  the local agent syncs; manage its token and show sync status
 */
const StagIntegrationCard = (props) => {
  const { t } = useTranslation('profile')
  const { status, mode, isLoading } = useStagStatus()

  if (mode === 'agent') {
    return (
      <StagAgentPanel
        status={status}
        refreshUser={props.refreshUser}
        onUserUpdate={props.onUserUpdate}
        toast={props.toast}
      />
    )
  }

  // Avoid flashing the server login UI before the mode is known
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface-container-low/80 p-5">
        <div className="flex items-center gap-2 text-sm text-on-surface-variant">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('stag.card.title')}
        </div>
      </div>
    )
  }

  // 'server', or status unavailable (fall back to the existing flow)
  return <StagServerCard {...props} />
}

const StagServerCard = ({
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

  // eslint-disable-next-line no-unused-vars
  const [syncPolling, setSyncPolling] = useState(false)

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
        toast.error(response.error === 'agent_mode' ? t('stag.errors.agentMode') : t('toast.connectFailed'))
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
          // 429 only means a sync is already running
          toast.error(t('stag.syncing.alreadyRunning'))
          setSyncStatus('pending')
        } else if (response.error === 'agent_mode') {
          toast.error(t('stag.errors.agentMode'))
        } else {
          toast.error(response.error || t('stag.syncing.failed'))
        }
        return
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
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-outline-variant bg-surface-container-low/80 p-5">
      <div className="flex md:items-center md:flex-row justify-between gap-3 flex-col items-start">
        <div>
          <h3 className="text-lg font-bold text-on-surface">{t('stag.card.title')}</h3>
          <p className="text-sm text-on-surface-variant">{t('stag.card.subtitle')}</p>
        </div>
        {isStagConnected ? (
          <span className="inline-flex items-center rounded-full bg-success-container text-on-success-container px-3 py-1 text-xs font-bold tracking-wide border border-success/30">
            {t('stag.connected.connected')}
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-error-container text-on-error-container px-3 py-1 text-xs font-bold tracking-wide border border-error/30">
            {t('stag.connected.notConnected')}
          </span>
        )}
      </div>

      {isStagConnected && syncStatus === 'pending' && (
        <div className="flex min-h-13 items-center gap-2.5 px-4 py-3 bg-primary-container border border-primary/30 rounded-lg">
          <Loader2 className="w-4 h-4 text-primary shrink-0 animate-spin" />
          <p className="text-label-sm text-on-primary-container">{t('stag.status.syncing')}</p>
        </div>
      )}

      {isStagConnected && syncStatus === 'success' && (
        <div className="flex min-h-13 items-center justify-between gap-3 px-4 py-3 bg-success-container border border-success/30 rounded-lg">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-success shrink-0" />
            <p className="text-label-sm text-on-success-container">{t('stag.status.success')}</p>
          </div>
          {navigate && (
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="cursor-pointer shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-semibold text-on-success transition-colors"
            >
              <LayoutGrid className="size-4" />
              {t('profile:stag.actions.goToDashboard')}
            </button>
          )}
        </div>
      )}

      {isStagConnected && syncStatus === 'failed' && (
        <div className="flex min-h-13 items-center gap-2.5 px-4 py-3 bg-error-container border border-error/30 rounded-lg">
          <AlertCircle className="w-4 h-4 text-error shrink-0" />
          <p className="text-label-sm text-error">{t('stag.status.failed')}</p>
        </div>
      )}

      {!isStagConnected ? (
        <div className="flex flex-1 flex-col gap-4">
          <p className="text-sm text-on-surface-variant">
            {t('stag.card.helper')}
          </p>

          <button
            type="button"
            onClick={handleStagConnect}
            disabled={stagRedirecting}
            className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-on-primary px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {stagRedirecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            {t('stag.actions.connect')}
          </button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4">
          <div className="grid gap-3 rounded-xl border border-success/30 bg-success-container/10 p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-on-success-container">{t('stag.labels.studentId')}</p>
              <p className="mt-1 text-sm font-semibold text-on-surface">{effectiveUser.stag_student_id || 'N/A'}</p>
            </div>
            {/* Name from getStudentInfo; before the first sync the STAG user name, unless it is just the student ID */}
            {effectiveUser.stag_display_name ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-on-success-container">{t('stag.labels.name')}</p>
                <p className="mt-1 text-sm font-semibold text-on-surface">{effectiveUser.stag_display_name}</p>
              </div>
            ) : effectiveUser.stag_user_name !== effectiveUser.stag_student_id && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-on-success-container">{t('stag.labels.username')}</p>
                <p className="mt-1 text-sm font-semibold text-on-surface">{effectiveUser.stag_user_name || 'N/A'}</p>
              </div>
            )}
          </div>

          <div className="mt-auto flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleResync}
              disabled={resyncLoading || syncStatus === 'pending'}
              className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-on-primary px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resyncLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {t('stag.actions.syncNow')}
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
  )
}

export default StagIntegrationCard
