import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyRound, Laptop, Loader2, RefreshCw } from 'lucide-react'
import Icon from '../common/Icon'
import * as api from '../../services/api'
import { useStagStatus } from '../../hooks/useStagStatus'
import { useToast } from '../../context/ToastContext'
import { getLocaleFromLanguage } from '../../utils/locale'
import { formatDateTime, formatRelativeTime } from '../../utils/relativeTime'
import { isStagLoginNeeded } from '../../utils/stagAgent'

const POLL_INTERVAL_MS = 10 * 1000
const POLL_FOR_MS = 3 * 60 * 1000

/** "Notebook online" / "Notebook offline – naposledy před 3 h" from the agent's polls. */
const AgentPresence = ({ status }) => {
  const { t, i18n } = useTranslation('profile')
  const locale = getLocaleFromLanguage(i18n.language)
  const online = Boolean(status?.agent_online)
  const lastSeen = status?.agent_last_seen_at ?? null

  return (
    <span className="inline-flex min-w-0 items-center gap-2 text-sm text-on-surface">
      <span
        aria-hidden="true"
        className={`size-2.5 shrink-0 rounded-full ${online ? 'bg-success' : 'bg-outline'}`}
      />
      <Icon icon={Laptop} className="text-on-surface-variant" />
      {online ? (
        <span className="font-semibold">{t('stag.agent.sync.online')}</span>
      ) : lastSeen ? (
        <span title={formatDateTime(lastSeen, locale)}>
          {t('stag.agent.sync.offline', { time: formatRelativeTime(lastSeen, locale) })}
        </span>
      ) : (
        <span>{t('stag.agent.sync.neverSeen')}</span>
      )}
    </span>
  )
}

/**
 * "Sync now" for agent mode: asks the server to have the notebook agent sync
 * (POST /user/stag/request-sync), then polls the status every 10 s for up to
 * 3 minutes. useStagStatus refreshes subjects, schedule and dashboard as soon
 * as stag_synced_at changes. `compact` is the one-line variant for the profile
 * overview (first thing seen on mobile).
 */
const StagAgentSyncControl = ({ compact = false }) => {
  const { t } = useTranslation('profile')
  const toast = useToast()
  const { status, refetch } = useStagStatus()
  const [requesting, setRequesting] = useState(false)
  const [pollUntil, setPollUntil] = useState(0)
  const baselineSyncedAt = useRef(null)

  const connected = Boolean(status?.stag_connected)
  const online = Boolean(status?.agent_online)
  const waiting = Boolean(status?.sync_requested_at)
  const loginNeeded = status?.stag_sync_status === 'failed' && isStagLoginNeeded(status?.stag_sync_error)

  // While a requested sync is open: refetch every 10 s, stop when the agent reported or after 3 min
  useEffect(() => {
    if (!pollUntil) return
    const timer = setInterval(async () => {
      const { data } = await refetch()
      const synced = data && data.stag_synced_at !== baselineSyncedAt.current
      if (synced || (data && !data.sync_requested_at)) {
        if (synced && data.stag_sync_status === 'success') toast.success(t('stag.agent.sync.done'))
        setPollUntil(0)
      } else if (Date.now() > pollUntil) {
        setPollUntil(0)
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [pollUntil, refetch, toast, t])

  const handleSync = async () => {
    setRequesting(true)
    const result = await api.requestStagSync()
    setRequesting(false)

    if (result.status === 'error') {
      if (result.error === 'rate_limited') {
        toast.error(t('stag.agent.sync.tooSoon', { seconds: result.data?.retry_after ?? 120 }))
      } else if (result.error === 'agent_not_configured') {
        toast.error(t('stag.agent.sync.notConfigured'))
      } else {
        toast.error(t('stag.agent.sync.requestFailed'))
      }
      return
    }

    baselineSyncedAt.current = status?.stag_synced_at ?? null
    setPollUntil(Date.now() + POLL_FOR_MS)
    await refetch()
  }

  const syncButton = (
    <button
      type="button"
      onClick={handleSync}
      disabled={!connected || waiting || requesting}
      className={`cursor-pointer inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary text-on-primary font-semibold shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 ${
        compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'
      }`}
    >
      <Icon icon={requesting || waiting ? Loader2 : RefreshCw} className={requesting || waiting ? 'animate-spin' : ''} />
      {t('stag.agent.sync.syncNow')}
    </button>
  )

  const waitingNote = waiting && (
    <p className="flex items-center gap-1.5 text-xs text-on-surface-variant" role="status">
      <Icon icon={Loader2} className="animate-spin text-primary" />
      {online ? t('stag.agent.sync.waitingOnline') : t('stag.agent.sync.waitingOffline')}
    </p>
  )

  const loginNote = loginNeeded && (
    <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-container px-3 py-2 text-xs text-on-warning-container">
      <Icon icon={KeyRound} className="mt-0.5" />
      <div className="space-y-0.5">
        <p className="font-semibold">{t('stag.agent.sync.loginNeeded')}</p>
        {!compact && <p>{t('stag.agent.sync.loginNeededHint')}</p>}
      </div>
    </div>
  )

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <AgentPresence status={status} />
          {syncButton}
        </div>
        {waitingNote}
        {loginNote}
      </div>
    )
  }

  return (
    <section className="space-y-3 rounded-xl border border-outline-variant bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-on-surface">{t('stag.agent.sync.title')}</h4>
          <AgentPresence status={status} />
        </div>
        {syncButton}
      </div>
      {waitingNote}
      {!connected && <p className="text-xs text-on-surface-variant">{t('stag.agent.sync.notConfigured')}</p>}
      {loginNote}
    </section>
  )
}

export default StagAgentSyncControl
