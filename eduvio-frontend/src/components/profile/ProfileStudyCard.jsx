import { useTranslation } from 'react-i18next'

const ProfileStudyCard = ({ effectiveUser }) => {
  const { t } = useTranslation('profile')

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-5 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-on-surface">{t('sections.academicDetails.title')}</h3>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg bg-surface border border-outline-variant/40 p-3">
          <p className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">
            {t('academic.university')}
          </p>
          <p className="mt-1 text-sm font-semibold text-on-surface">
            {effectiveUser?.university || t('academic.defaults.university')}
          </p>
        </div>

        <div className="rounded-lg bg-surface border border-outline-variant/40 p-3">
          <p className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">
            {t('academic.faculty')}
          </p>
          <p className="mt-1 text-sm font-semibold text-on-surface">
            {effectiveUser?.faculty || t('academic.defaults.faculty')}
          </p>
        </div>

        <div className="rounded-lg bg-surface border border-outline-variant/40 p-3">
          <p className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">
            {t('academic.studyProgram')}
          </p>
          <p className="mt-1 text-sm font-semibold text-on-surface">
            {effectiveUser?.program || t('academic.defaults.studyProgram')}
          </p>
        </div>

        <div className="rounded-lg bg-surface border border-outline-variant/40 p-3">
          <p className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">
            {t('academic.academicYear')}
          </p>
          <p className="mt-1 text-sm font-semibold text-on-surface">
            {effectiveUser?.year || t('academic.defaults.academicYear')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default ProfileStudyCard