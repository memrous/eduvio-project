import { useTranslation } from 'react-i18next'
import StagIntegrationCard from '../StagIntegrationCard'
import MoodleIntegrationCard from '../MoodleIntegrationCard'

const OverviewTab = ({
  effectiveUser,
  isStagConnected,
  isMoodleConnected,
  refreshUser,
  toast,
  navigate,
}) => {
  const { t } = useTranslation('profile')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-headline-md font-bold text-on-surface">
          {t('sections.universityIntegration.title')}
        </h2>
        <p className="text-body-md text-on-surface-variant mt-0.5">
          {t('sections.universityIntegration.subtitle')}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StagIntegrationCard
          effectiveUser={effectiveUser}
          isStagConnected={isStagConnected}
          refreshUser={refreshUser}
          toast={toast}
          navigate={navigate}
        />
        <MoodleIntegrationCard
          effectiveUser={effectiveUser}
          isMoodleConnected={isMoodleConnected}
          refreshUser={refreshUser}
          toast={toast}
        />
      </div>
    </div>
  )
}

export default OverviewTab