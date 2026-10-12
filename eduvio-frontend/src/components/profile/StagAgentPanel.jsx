import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Check,
  Info,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import Icon from '../common/Icon'
import * as api from '../../services/api'
import { STAG_STATUS_KEY } from '../../hooks/useStagStatus'
import { getLocaleFromLanguage } from '../../utils/locale'
import { formatDate, formatDateTime, formatRelativeTime } from '../../utils/relativeTime'
import StagAgentSyncControl from './StagAgentSyncControl'
import StagAgentSetupDialog from './StagAgentSetupDialog'
import CopyButton from './CopyButton'
import { isStagLoginNeeded } from '../../utils/stagAgent'

const STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1000

const primaryButton =
  'cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-on-primary px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButton =
  'cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface px-3.5 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors disabled:cursor-not-allowed disabled:opacity-60'
const dangerButton =
  'cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg border border-error-container bg-surface px-3.5 py-2 text-sm font-semibold text-error transition-colors hover:bg-error-container/20 disabled:cursor-not-allowed disabled:opacity-60'

/**
 * IS/STAG card in agent mode: sync status, notebook presence with "Sync now"
 * and the agent token. The setup guide is in a dialog behind the (i) button.
 */
const StagAgentPanel = ({ status, refreshUser, onUserUpdate, toast }) => {
  const { t, i18n } = useTranslation('profile')
  const queryClient = useQueryClient()
  const locale = getLocaleFromLanguage(i18n.language)

  // The plain token lives only here: never in the query cache, storage or a mutation result.
  // It is dropped when the user dismisses it, replaces/revokes the token or leaves the page.
  const [revealedToken, setRevealedToken] = useState(null)
  const [pendingConfirm, setPendingConfirm] = useState(null) // 'regenerate' | 'revoke' | null
  const [creating, setCreating] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)

  const agentToken = status?.agent_token ?? null
  const syncedAt = status?.stag_synced_at ?? null
  const syncStatus = status?.stag_sync_status ?? null
  const syncError = status?.stag_sync_error ?? null
  const isConnected = Boolean(status?.stag_connected)
  // eslint-disable-next-line react-hooks/purity -- staleness only needs to be as fresh as the last render
  const isStale = !syncedAt || Date.now() - new Date(syncedAt).getTime() > STALE_AFTER_MS

  const refreshAfterTokenChange = async () => {
    await queryClient.invalidateQueries({ queryKey: [STAG_STATUS_KEY] })
    const refreshed = await refreshUser?.()
    if (refreshed && onUserUpdate) onUserUpdate(refreshed)
  }

  const handleCreateToken = async () => {
    setPendingConfirm(null)
    setCreating(true)
    setRevealedToken(null)
    try {
      // Plain API call on purpose — useMutation would keep the token in the mutation cache
      const response = await api.createStagAgentToken()
      if (response.status === 'error' || !response.data?.token) {
        toast.error(t('stag.agent.errors.createFailed'))
        return
      }
      setRevealedToken(response.data.token)
      await refreshAfterTokenChange()
    } catch {
      toast.error(t('stag.agent.errors.createFailed'))
    } finally {
      setCreating(false)
    }
  }

  const handleRevokeToken = async () => {
    setPendingConfirm(null)
    setRevoking(true)
    try {
      const response = await api.revokeStagAgentToken()
      if (response.status === 'error') {
        toast.error(t('stag.agent.errors.revokeFailed'))
        return
      }
      setRevealedToken(null)
      toast.success(t('stag.agent.token.revoked'))
      await refreshAfterTokenChange()
    } catch {
      toast.error(t('stag.agent.errors.revokeFailed'))
    } finally {
      setRevoking(false)
    }
  }

  const statusBanner = (() => {
    const lastSync = syncedAt ? (
      <span title={formatDateTime(syncedAt, locale)} className="font-semibold underline decoration-dotted underline-offset-2">
        {formatRelativeTime(syncedAt, locale)}
      </span>
    ) : (
      <span className="font-semibold">{t('stag.agent.status.never')}</span>
    )

    if (syncStatus === 'failed') {
      return (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-error-container border border-error/30 rounded-lg">
          <Icon icon={AlertCircle} className="text-error mt-0.5" />
          <div className="min-w-0 text-label-sm text-error space-y-0.5">
            <p className="font-semibold">{t('stag.agent.status.title')} · {t('stag.agent.status.failed')}</p>
            <p>{t('stag.agent.status.lastSync')} {lastSync}</p>
            {syncError && (
              <p className="break-words">
                {isStagLoginNeeded(syncError)
                  ? t('stag.agent.sync.loginNeeded')
                  : t('stag.agent.status.error', { error: syncError })}
              </p>
            )}
          </div>
        </div>
      )
    }

    if (syncStatus === 'success' && syncedAt) {
      return (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-success-container border border-success/30 rounded-lg">
          <Icon icon={ShieldCheck} className="text-success mt-0.5" />
          <div className="min-w-0 text-label-sm text-on-success-container space-y-0.5">
            <p className="font-semibold">{t('stag.agent.status.title')} · {t('stag.agent.status.success')}</p>
            <p>{t('stag.agent.status.lastSync')} {lastSync}</p>
          </div>
        </div>
      )
    }

    return (
      <div className="flex items-start gap-2.5 px-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg">
        <Icon icon={RefreshCw} className="text-on-surface-variant mt-0.5" />
        <div className="min-w-0 text-label-sm text-on-surface-variant space-y-0.5">
          <p className="font-semibold text-on-surface">{t('stag.agent.status.title')}</p>
          <p>{t('stag.agent.status.lastSync')} {lastSync}</p>
        </div>
      </div>
    )
  })()

  return (
    <div className="@container flex h-full min-w-0 flex-col gap-4 rounded-2xl border border-outline-variant bg-surface-container-low/80 p-5">
      <div className="flex @md:items-center @md:flex-row justify-between gap-3 flex-col items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-lg font-bold text-on-surface">{t('stag.card.title')}</h3>
            <button
              type="button"
              onClick={() => setSetupOpen(true)}
              aria-label={t('stag.agent.setupDialog.open')}
              title={t('stag.agent.setupDialog.open')}
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-foreground"
            >
              <Icon icon={Info} />
            </button>
          </div>
          <p className="text-sm text-on-surface-variant">{t('stag.agent.card.subtitle')}</p>
        </div>
        {isConnected ? (
          <span className="inline-flex shrink-0 items-center rounded-full bg-success-container text-on-success-container px-3 py-1 text-xs font-bold tracking-wide border border-success/30">
            {t('stag.connected.connected')}
          </span>
        ) : (
          <span className="inline-flex shrink-0 items-center rounded-full bg-error-container text-on-error-container px-3 py-1 text-xs font-bold tracking-wide border border-error/30">
            {t('stag.connected.notConnected')}
          </span>
        )}
      </div>

      {statusBanner}

      {/* Notebook agent: online state and "Sync now" */}
      <StagAgentSyncControl />

      {agentToken && isStale && (
        <p className="flex items-start gap-2 text-xs text-on-surface-variant">
          <Icon icon={AlertCircle} className="mt-0.5" />
          {syncedAt ? t('stag.agent.stale.old') : t('stag.agent.stale.never')}
        </p>
      )}

      {/* ── One-time token reveal ── */}
      {revealedToken && (
        <div className="space-y-3 rounded-xl border border-primary/30 bg-surface p-4 shadow-sm">
          <div className="flex items-start gap-2.5">
            <Icon icon={KeyRound} className="text-primary mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-on-surface">{t('stag.agent.reveal.title')}</p>
              <p className="text-xs text-on-surface-variant">{t('stag.agent.reveal.warning')}</p>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-2 @md:flex-row">
            <input
              type="text"
              readOnly
              value={revealedToken}
              onFocus={(e) => e.target.select()}
              aria-label={t('stag.agent.reveal.label')}
              autoComplete="off"
              spellCheck={false}
              data-1p-ignore
              className="w-full min-w-0 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <CopyButton text={revealedToken} label={t('stag.agent.reveal.copyLabel')} toast={toast} />
          </div>
          <button type="button" onClick={() => setRevealedToken(null)} className={secondaryButton}>
            <Icon icon={Check} />
            {t('stag.agent.reveal.done')}
          </button>
        </div>
      )}

      {/* ── Token management ── */}
      <div className="mt-auto space-y-3">
        <h4 className="text-sm font-bold text-on-surface">{t('stag.agent.token.title')}</h4>

        {!agentToken ? (
          <div className="space-y-3">
            <p className="text-sm text-on-surface-variant">{t('stag.agent.token.none')}</p>
            <button type="button" onClick={handleCreateToken} disabled={creating} className={primaryButton}>
              <Icon icon={creating ? Loader2 : KeyRound} className={creating ? 'animate-spin' : ''} />
              {t('stag.agent.token.create')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-3 rounded-xl border border-outline-variant bg-surface p-4 grid-cols-[repeat(auto-fit,minmax(7rem,1fr))]">
              {[
                ['created', agentToken.created_at],
                ['expires', agentToken.expires_at],
                ['lastUsed', agentToken.last_used_at],
              ].map(([key, value]) => (
                <div key={key} className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                    {t(`stag.agent.token.${key}`)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-on-surface" title={value ? formatDateTime(value, locale) : undefined}>
                    {value ? formatDate(value, locale) : t('stag.agent.token.neverUsed')}
                  </p>
                </div>
              ))}
            </div>

            {pendingConfirm ? (
              <div className="space-y-3 rounded-xl border border-error/30 bg-error-container/10 p-4">
                <p className="text-sm text-on-surface">
                  {pendingConfirm === 'regenerate'
                    ? t('stag.agent.confirm.regenerate')
                    : t('stag.agent.confirm.revoke')}
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={pendingConfirm === 'regenerate' ? handleCreateToken : handleRevokeToken}
                    className={pendingConfirm === 'regenerate' ? primaryButton : dangerButton}
                  >
                    <Icon icon={pendingConfirm === 'regenerate' ? RefreshCw : Trash2} />
                    {pendingConfirm === 'regenerate'
                      ? t('stag.agent.confirm.regenerateConfirm')
                      : t('stag.agent.confirm.revokeConfirm')}
                  </button>
                  <button type="button" onClick={() => setPendingConfirm(null)} className={secondaryButton}>
                    {t('stag.actions.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setPendingConfirm('regenerate')}
                  disabled={creating || revoking}
                  className={secondaryButton}
                >
                  <Icon icon={creating ? Loader2 : RefreshCw} className={creating ? 'animate-spin' : ''} />
                  {t('stag.agent.token.regenerate')}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingConfirm('revoke')}
                  disabled={creating || revoking}
                  className={dangerButton}
                >
                  <Icon icon={revoking ? Loader2 : Trash2} className={revoking ? 'animate-spin' : ''} />
                  {t('stag.agent.token.revoke')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <StagAgentSetupDialog open={setupOpen} onClose={() => setSetupOpen(false)} toast={toast} />
    </div>
  )
}

export default StagAgentPanel
