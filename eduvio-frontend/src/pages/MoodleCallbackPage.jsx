import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { extractMoodleToken } from '../utils/moodleToken'
import * as api from '../services/api'

const MoodleCallbackPage = () => {
  const { t } = useTranslation('profile')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const processedRef = useRef(false)

  useEffect(() => {
    if (processedRef.current) return
    processedRef.current = true

    const processToken = async () => {
      const rawToken = searchParams.get('token')
      if (!rawToken) {
        navigate('/profile?moodle=error&reason=missing_token', { replace: true })
        return
      }

      const decoded = extractMoodleToken(rawToken)
      if (!decoded) {
        navigate('/profile?moodle=error&reason=decode_failed', { replace: true })
        return
      }

      try {
        const response = await api.connectMoodleToken(decoded)
        if (response?.status === 'error') {
          navigate('/profile?moodle=error&reason=token_rejected', { replace: true })
          return
        }
        navigate('/profile?moodle=connected', { replace: true })
      } catch {
        navigate('/profile?moodle=error&reason=token_rejected', { replace: true })
      }
    }

    processToken()
  }, [navigate, searchParams])

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm font-medium text-on-surface-variant">
          {t('moodle.callback.connecting', 'Připojování k Moodlu...')}
        </p>
      </div>
    </div>
  )
}

export default MoodleCallbackPage