import { Link } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const NotFoundPage = () => {
  const { t } = useTranslation('common')
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 font-inter">
      <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-xl shadow-ambient p-8 text-center flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-[#eeefff] text-[#004ac6] flex items-center justify-center">
          <SearchX className="w-6 h-6" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-headline-md font-semibold text-on-surface">{t('common:notFound.title')}</h1>
          <p className="text-body-md text-on-surface-variant">
            {t('common:notFound.description')}
          </p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#004ac6] text-white text-label-md font-semibold hover:bg-[#003ea8] transition-colors"
        >
          {t('common:notFound.backToDashboard')}
        </Link>
      </div>
    </div>
  )
}

export default NotFoundPage
