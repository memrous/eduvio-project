import { useTranslation } from 'react-i18next'
import { GraduationCap, Mail } from 'lucide-react'

const ProfileIdentityCard = ({ effectiveUser }) => {
  const { t } = useTranslation('profile')

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-5 space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <img
            src={effectiveUser?.avatarUrl || 'src/assets/icons/user.png'}
            alt={t('header.avatarAlt')}
            className="w-16 h-16 rounded-full object-cover border border-outline-variant shadow-sm"
          />
          <div className="absolute -bottom-1 -right-1 bg-primary text-white w-6 h-6 rounded-full grid place-items-center border-2 border-surface-container-low shadow-sm">
            <GraduationCap className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold truncate">
            {t('header.badge')}
          </p>
          <h2 className="text-headline-md font-bold text-on-surface truncate mt-0.5">
            {effectiveUser?.username || effectiveUser?.name}
          </h2>
          {effectiveUser?.username && effectiveUser?.name && (
            <p className="text-sm text-on-surface-variant truncate font-normal">
              {effectiveUser.name}
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-outline-variant pt-3 text-body-md text-on-surface-variant">
        <span className="flex items-center gap-2 truncate">
          <Mail className="w-4 h-4 text-on-surface-variant shrink-0" />
          <span className="truncate">{effectiveUser?.email}</span>
        </span>
      </div>
    </div>
  )
}

export default ProfileIdentityCard