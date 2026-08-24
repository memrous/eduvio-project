import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CalendarDays,
  BarChart3,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import CustomIcon from '../components/CustomIcon'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useAuth } from '../context/AuthContext'

// ── Left brand panel feature list ────────────────────────────────
const FEATURES = [
  { icon: () => <CustomIcon name="book" className="w-5 h-5" />, key: 'features.manageSubjects' },
  { icon: CalendarDays, key: 'features.calendar' },
  { icon: BarChart3, key: 'features.progress' },
]

// ── Form field validation ─────────────────────────────────────────
const validate = (email, password) => {
  const errors = {}
  if (!email.trim()) errors.email = 'errors.emailRequired'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'errors.invalidEmail'
  if (!password) errors.password = 'errors.passwordRequired'
  return errors
}

const LoginPage = () => {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth()
  const { t } = useTranslation('auth')

  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [errors,      setErrors]      = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting,  setSubmitting]  = useState(false)

  // Already logged in — bounce to dashboard
  if (isAuthenticated && !authLoading) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')

    const fieldErrors = validate(email, password)
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors)
      return
    }
    setErrors({})

    setSubmitting(true)
    try {
      await login(email, password)
      // AuthContext navigates to /dashboard on success
    } catch (err) {
      setServerError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const inputBase =
    'w-full pl-10 pr-4 py-2.5 bg-[#F8F9FB] rounded-lg border text-body-md text-gray-900 focus:outline-none focus:bg-white transition-colors'
  const inputOk  = `${inputBase} border-[#E2E8F0] focus:border-[#004ac6]`
  const inputErr = `${inputBase} border-red-400 focus:border-red-500 bg-red-50`

  return (
    <div className="min-h-screen flex font-inter relative">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <LanguageSwitcher />
      </div>

      {/* ── Left brand panel (desktop only) ───────────────────── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] shrink-0 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #001a5e 0%, #003ab0 55%, #0057e8 100%)' }}>

        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #7eb8ff, transparent 70%)' }} />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #a78bfa, transparent 70%)' }} />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-geist font-bold text-xl text-white tracking-tight">StudyHub</span>
        </div>

        {/* Headline */}
        <div className="relative z-10 flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-bold text-white leading-tight tracking-tight">
              {t('login.headline').split('\n').map((line, index, lines) => (
                <span key={`${line}-${index}`}>
                  {line}
                  {index < lines.length - 1 ? <br /> : null}
                </span>
              ))}
            </h1>
            <p className="text-blue-200 text-base leading-relaxed">
              {t('login.subtitle')}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {FEATURES.map(({ icon: Icon, key }) => (
              <div key={key} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-blue-200" />
                </div>
                <p className="text-sm text-blue-100 leading-snug">{t(key)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer credit */}
        <p className="text-blue-300/60 text-xs relative z-10">
          {t('login.footerCopyright')}
        </p>
      </div>

      {/* ── Right form panel ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-start lg:justify-center bg-white px-6 pt-20 pb-12 sm:pt-24 lg:pt-12">
        <div className="w-full max-w-[400px] flex flex-col gap-8">

          {/* Mobile logo (hidden on desktop) */}
          <div className="flex lg:hidden items-center gap-3">
            <div className="w-9 h-9 bg-[#004ac6] rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-geist font-bold text-xl text-gray-900 tracking-tight">StudyHub</span>
          </div>

          {/* Heading */}
          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{t('login.welcomeBack')}</h2>
            <p className="text-body-md text-gray-500">{t('login.welcomeSubtitle')}</p>
          </div>

          {/* Mock credentials hint */}
          <div className="flex items-start gap-2.5 px-4 py-3 bg-[#eeefff] border border-[#c5caff] rounded-lg">
            <AlertCircle className="w-4 h-4 text-[#004ac6] shrink-0 mt-0.5" />
            <p className="text-label-sm text-[#004ac6] leading-snug">
              <span className="font-bold">{t('login.demoCredentials.label')} </span>
              student@studyhub.cz · password
            </p>
          </div>

          {/* Server error banner */}
          {serverError && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-label-sm text-red-700">{t(serverError)}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-label-md font-semibold text-gray-900" htmlFor="login-email">
                {t('login.fields.email.label')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: '' })) }}
                  placeholder={t('login.fields.email.placeholder')}
                  className={errors.email ? inputErr : inputOk}
                />
              </div>
              {errors.email && (
                <p className="text-label-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {t(errors.email)}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-label-md font-semibold text-gray-900" htmlFor="login-password">
                  {t('login.fields.password.label')}
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })) }}
                  placeholder={t('login.fields.password.placeholder')}
                  className={`${errors.password ? inputErr : inputOk} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors"
                  aria-label={showPass ? t('login.aria.hidePassword') : t('login.aria.showPassword')}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-label-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {t(errors.password)}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#004ac6] hover:bg-[#003ea8] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-label-md transition-all shadow-sm mt-1 cursor-pointer"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {t('login.actions.signingIn')}</>
              ) : (
                <>{t('login.actions.signIn')} <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          {/* Register link */}
          <p className="text-body-md text-gray-500 text-center">
            {t('login.links.noAccount')}{' '}
            <Link to="/register" className="text-[#004ac6] font-semibold hover:underline">
              {t('login.links.createOne')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage