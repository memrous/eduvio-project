import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Check,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Terminal,
  Trash2,
} from 'lucide-react'
import * as api from '../../services/api'
import { STAG_STATUS_KEY } from '../../hooks/useStagStatus'
import { getLocaleFromLanguage } from '../../utils/locale'
import { formatDate, formatDateTime, formatRelativeTime } from '../../utils/relativeTime'

const STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1000

const AGENT_COMMANDS = [
  { key: 'setup', command: 'python3 stag_agent.py setup' },
  { key: 'login', command: 'python3 stag_agent.py login' },
  { key: 'sync', command: 'python3 stag_agent.py' },
]

const primaryButton =
  'cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-on-primary px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-60'
const secondaryButton =
  'cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant bg-surface px-3.5 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors disabled:cursor-not-allowed disabled:opacity-60'
const dangerButton =
  'cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg border border-error-container bg-surface px-3.5 py-2 text-sm font-semibold text-error transition-colors hover:bg-error-container/20 disabled:cursor-not-allowed disabled:opacity-60'

const copyToClipboard = async (text) => {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }
  // Fallback for non-secure contexts (e.g. LAN dev server over http)
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    if (!document.execCommand('copy')) throw new Error('copy failed')
  } finally {
    document.body.removeChild(textarea)
  }
}

const CopyButton = ({ text, label, toast }) => {
  const { t } = useTranslation('profile')
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await copyToClipboard(text)
      setCopied(true)
      toast.success(t('stag.agent.copied'))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('stag.agent.copyFailed'))
    }
  }

  return (
    <button type="button" onClick={handleCopy} className={secondaryButton} aria-label={label}>
      {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      {t('stag.agent.copy')}
    </button>
  )
}

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
          <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
          <div className="text-label-sm text-error space-y-0.5">
            <p className="font-semibold">{t('stag.agent.status.title')} · {t('stag.agent.status.failed')}</p>
            <p>{t('stag.agent.status.lastSync')} {lastSync}</p>
            {syncError && <p className="break-words">{t('stag.agent.status.error', { error: syncError })}</p>}
          </div>
        </div>
      )
    }

    if (syncStatus === 'success' && syncedAt) {
      return (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-success-container border border-success/30 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-success shrink-0 mt-0.5" />
          <div className="text-label-sm text-success space-y-0.5">
            <p className="font-semibold">{t('stag.agent.status.title')} · {t('stag.agent.status.success')}</p>
            <p>{t('stag.agent.status.lastSync')} {lastSync}</p>
          </div>
        </div>
      )
    }

    return (
      <div className="flex items-start gap-2.5 px-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg">
        <RefreshCw className="w-4 h-4 text-on-surface-variant shrink-0 mt-0.5" />
        <div className="text-label-sm text-on-surface-variant space-y-0.5">
          <p className="font-semibold text-on-surface">{t('stag.agent.status.title')}</p>
          <p>{t('stag.agent.status.lastSync')} {lastSync}</p>
        </div>
      </div>
    )
  })()

  return (
    <div className="space-y-4">
      {statusBanner}

      {agentToken && isStale && (
        <p className="flex items-start gap-2 text-xs text-on-surface-variant">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {syncedAt ? t('stag.agent.stale.old') : t('stag.agent.stale.never')}
        </p>
      )}

      <div className="rounded-2xl border border-outline-variant bg-surface-container-low/80 p-5 space-y-5">
        <div className="flex md:items-center md:flex-row justify-between gap-3 flex-col items-start">
          <div>
            <h3 className="text-lg font-bold text-on-surface">{t('stag.card.title')}</h3>
            <p className="text-sm text-on-surface-variant">{t('stag.agent.card.subtitle')}</p>
          </div>
          {isConnected ? (
            <span className="inline-flex items-center rounded-full bg-success-container text-success px-3 py-1 text-xs font-bold tracking-wide border border-success/30">
              {t('stag.connected.connected')}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-error-container text-error px-3 py-1 text-xs font-bold tracking-wide border border-error/30">
              {t('stag.connected.notConnected')}
            </span>
          )}
        </div>

        <p className="text-sm text-on-surface-variant">{t('stag.agent.card.helper')}</p>

        {/* ── One-time token reveal ── */}
        {revealedToken && (
          <div className="space-y-3 rounded-xl border border-primary/30 bg-surface p-4 shadow-sm">
            <div className="flex items-start gap-2.5">
              <KeyRound className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-on-surface">{t('stag.agent.reveal.title')}</p>
                <p className="text-xs text-on-surface-variant">{t('stag.agent.reveal.warning')}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                readOnly
                value={revealedToken}
                onFocus={(e) => e.target.select()}
                aria-label={t('stag.agent.reveal.label')}
                autoComplete="off"
                spellCheck={false}
                data-1p-ignore
                className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 font-mono text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <CopyButton text={revealedToken} label={t('stag.agent.reveal.copyLabel')} toast={toast} />
            </div>
            <button type="button" onClick={() => setRevealedToken(null)} className={secondaryButton}>
              <Check className="h-4 w-4" />
              {t('stag.agent.reveal.done')}
            </button>
          </div>
        )}

        {/* ── Token management ── */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-on-surface">{t('stag.agent.token.title')}</h4>

          {!agentToken ? (
            <div className="space-y-3">
              <p className="text-sm text-on-surface-variant">{t('stag.agent.token.none')}</p>
              <button type="button" onClick={handleCreateToken} disabled={creating} className={primaryButton}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {t('stag.agent.token.create')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 rounded-xl border border-outline-variant bg-surface p-4 sm:grid-cols-3">
                {[
                  ['created', agentToken.created_at],
                  ['expires', agentToken.expires_at],
                  ['lastUsed', agentToken.last_used_at],
                ].map(([key, value]) => (
                  <div key={key}>
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
                      {pendingConfirm === 'regenerate' ? <RefreshCw className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
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
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    {t('stag.agent.token.regenerate')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingConfirm('revoke')}
                    disabled={creating || revoking}
                    className={dangerButton}
                  >
                    {revoking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {t('stag.agent.token.revoke')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── How to run the agent ── */}
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-sm font-bold text-on-surface">
            <Terminal className="h-4 w-4" />
            {t('stag.agent.guide.title')}
          </h4>
          <ol className="space-y-3">
            {AGENT_COMMANDS.map(({ key, command }, index) => (
              <li key={key} className="space-y-1.5">
                <p className="text-sm text-on-surface-variant">
                  {index + 1}. {t(`stag.agent.guide.${key}`)}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="block w-full overflow-x-auto whitespace-nowrap rounded-lg border border-outline-variant bg-surface px-3 py-2 font-mono text-sm text-on-surface">
                    {command}
                  </code>
                  <CopyButton text={command} label={t('stag.agent.guide.copyLabel', { command })} toast={toast} />
                </div>
              </li>
            ))}
          </ol>
          <p className="text-xs text-on-surface-variant">{t('stag.agent.guide.footer')}</p>
        </div>
      </div>
    </div>
  )
}

export default StagAgentPanel
