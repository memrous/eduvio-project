import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import { getLocaleFromLanguage } from '../../utils/locale'
import { formatDateTime, formatRelativeTime } from '../../utils/relativeTime'

const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== ''

/**
 * Study details synced from STAG (student/getStudentInfo). Codes (form, type, status)
 * are translated when known, otherwise shown as they came.
 */
const ProfileStudyCard = ({ user }) => {
  const { t, i18n } = useTranslation('profile')
  const locale = getLocaleFromLanguage(i18n.language)

  const code = (group, value) =>
    t(`study.${group}.${String(value).trim().toUpperCase()}`, { defaultValue: String(value) })

  const rows = [
    { key: 'faculty', value: user.faculty },
    { key: 'year', value: hasValue(user.study_year) ? t('study.yearValue', { year: user.study_year }) : null },
    { key: 'form', value: hasValue(user.study_form) ? code('forms', user.study_form) : null },
    { key: 'type', value: hasValue(user.study_type) ? code('types', user.study_type) : null },
    { key: 'status', value: hasValue(user.study_status) ? code('statuses', user.study_status) : null },
  ].filter((row) => hasValue(row.value))

  const hasProgram = hasValue(user.study_program)
  const isEmpty = !hasProgram && rows.length === 0

  return (
    <section className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-ambient space-y-3">
      <span className="block text-[11px] font-bold tracking-wider text-on-surface-variant uppercase">
        {t('study.title')}
      </span>

      {isEmpty ? (
        <p className="flex items-start gap-2 text-sm text-on-surface-variant">
          <Info className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{t('study.empty')}</span>
        </p>
      ) : (
        <>
          {hasProgram && (
            <div className="min-w-0">
              <h2 className="text-base font-bold text-on-surface break-words">{user.study_program}</h2>
              {hasValue(user.study_program_code) && (
                <p className="text-xs font-mono text-on-surface-variant break-all">{user.study_program_code}</p>
              )}
            </div>
          )}

          {rows.length > 0 && (
            <dl className="space-y-2.5 text-xs sm:text-sm border-t border-outline-variant/60 pt-3">
              {rows.map((row) => (
                <div key={row.key} className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant shrink-0">{t(`study.fields.${row.key}`)}</dt>
                  <dd className="font-medium text-on-surface text-right break-words min-w-0">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {user.study_info_synced_at && (
            <p className="text-[11px] text-on-surface-variant" title={formatDateTime(user.study_info_synced_at, locale)}>
              {t('study.syncedAgo', { time: formatRelativeTime(user.study_info_synced_at, locale) })}
            </p>
          )}
        </>
      )}
    </section>
  )
}

export default ProfileStudyCard
