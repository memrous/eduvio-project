import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { extractMoodleToken } from '../utils/moodleToken'
import { clearMoodleLaunchPending } from '../utils/moodleLaunch'
import * as api from '../services/api'

// Backend error codes passed through to the profile page as ?reason=
const LAUNCH_ERROR_REASONS = ['launch_not_started', 'invalid_signature']

const MoodleCallbackPage = () => {
  const { t } = useTranslation('profile')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const processedRef = useRef(false)

  useEffect(() => {
    if (processedRef.current) return
    processedRef.current = true

    // The callback ran (success or error): the launch is no longer pending. replace keeps
    // the callback out of the history, so the Back button cannot open it again.
    const finish = (target) => {
      clearMoodleLaunchPending()
      navigate(target, { replace: true })
    }

    const processToken = async () => {
      const rawToken = searchParams.get('token')
      if (!rawToken) {
        finish('/profile?moodle=error&reason=missing_token')
        return
      }

      const decoded = extractMoodleToken(rawToken)
      if (!decoded) {
        finish('/profile?moodle=error&reason=decode_failed')
        return
      }

      try {
        const response = await api.connectMoodleToken(decoded)
        if (response?.status === 'error') {
          const reason = LAUNCH_ERROR_REASONS.includes(response.error) ? response.error : 'token_rejected'
          finish(`/profile?moodle=error&reason=${reason}`)
          return
        }
        finish('/profile?moodle=connected')
      } catch {
        finish('/profile?moodle=error&reason=token_rejected')
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