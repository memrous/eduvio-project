import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'
import Icon from '../common/Icon'
import InfoDialog from '../common/InfoDialog'
import CopyButton from './CopyButton'
import { AGENT_GUIDE_URL } from '../../config'

const SETUP_STEPS = [
  { key: 'setup', command: 'python3 stag_agent.py setup' },
  { key: 'login', command: 'python3 stag_agent.py login' },
  { key: 'install', command: 'powershell -ExecutionPolicy Bypass -File .\\install-agent.ps1 -StartNow' },
]

/** How to set up the notebook agent: setup → login → background run on Windows. */
const StagAgentSetupDialog = ({ open, onClose, toast }) => {
  const { t } = useTranslation('profile')

  return (
    <InfoDialog
      open={open}
      onClose={onClose}
      eyebrow={t('stag.card.title')}
      title={t('stag.agent.setupDialog.title')}
      closeLabel={t('stag.agent.setupDialog.close')}
    >
      <p className="text-sm text-on-surface-variant">{t('stag.agent.setupDialog.intro')}</p>

      <ol className="flex flex-col gap-5">
        {SETUP_STEPS.map(({ key, command }, index) => (
          <li key={key} className="min-w-0 space-y-2">
            <h3 className="text-sm font-semibold text-on-surface">
              {index + 1}. {t(`stag.agent.setupDialog.steps.${key}.title`)}
            </h3>
            <p className="text-sm text-on-surface-variant break-words">
              {t(`stag.agent.setupDialog.steps.${key}.text`)}
            </p>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <code className="block min-w-0 flex-1 break-all rounded-lg border border-outline-variant bg-surface px-3 py-2 font-mono text-sm text-on-surface">
                {command}
              </code>
              <CopyButton text={command} label={t('stag.agent.setupDialog.copyLabel', { command })} toast={toast} />
            </div>
          </li>
        ))}
      </ol>

      <a
        href={AGENT_GUIDE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-primary hover:underline"
      >
        <Icon icon={ExternalLink} />
        {t('stag.agent.setupDialog.guideLink')}
      </a>
    </InfoDialog>
  )
}

export default StagAgentSetupDialog
