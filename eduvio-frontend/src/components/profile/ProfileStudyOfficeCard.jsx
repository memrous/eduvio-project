import { useTranslation } from 'react-i18next'
import { Mail, Phone, UserRound } from 'lucide-react'

const clean = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null)

// Only something that looks like an address becomes a mailto: link
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

// tel: needs digits (and a leading +) only
const toTelHref = (value) => {
  const digits = value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '')
  return digits.replace(/\D/g, '').length >= 3 ? `tel:${digits}` : null
}

/**
 * Study department contact from STAG. Rendered only when there is something to show.
 */
const ProfileStudyOfficeCard = ({ user }) => {
  const { t } = useTranslation('profile')

  const name = clean(user.study_officer_name)
  const email = clean(user.study_officer_email)
  const phone = clean(user.study_officer_phone)
  if (!name && !email && !phone) return null

  const telHref = phone ? toTelHref(phone) : null
  const linkClass = 'text-primary hover:underline break-all'

  return (
    <section className="bg-surface border border-outline-variant rounded-2xl p-6 shadow-ambient space-y-3">
      <span className="block text-[11px] font-bold tracking-wider text-on-surface-variant uppercase">
        {t('studyOffice.title')}
      </span>

      <ul className="space-y-2.5 text-sm">
        {name && (
          <li className="flex items-start gap-2 min-w-0">
            <UserRound className="w-4 h-4 mt-0.5 shrink-0 text-on-surface-variant" />
            <span className="min-w-0">
              <span className="block font-medium text-on-surface break-words">{name}</span>
              <span className="block text-xs text-on-surface-variant">{t('studyOffice.officer')}</span>
            </span>
          </li>
        )}
        {email && (
          <li className="flex items-start gap-2 min-w-0">
            <Mail className="w-4 h-4 mt-0.5 shrink-0 text-on-surface-variant" />
            {isEmail(email) ? (
              <a href={`mailto:${email}`} className={linkClass}>{email}</a>
            ) : (
              <span className="text-on-surface break-all">{email}</span>
            )}
          </li>
        )}
        {phone && (
          <li className="flex items-start gap-2 min-w-0">
            <Phone className="w-4 h-4 mt-0.5 shrink-0 text-on-surface-variant" />
            {telHref ? (
              <a href={telHref} className={linkClass}>{phone}</a>
            ) : (
              <span className="text-on-surface break-all">{phone}</span>
            )}
          </li>
        )}
      </ul>
    </section>
  )
}

export default ProfileStudyOfficeCard
