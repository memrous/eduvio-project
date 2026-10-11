import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  UserRound,
  AlertCircle,
  CalendarDays,
  BarChart3,
  Loader2,
  CheckCircle2,
  Check,
  Info,
  BookOpen,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { checkAvailability } from '../services/api'
import logoImg from '../assets/images/logo.png'


const FEATURES = [
  { icon: BookOpen, key: 'features.manageSubjects' },
  { icon: CalendarDays, key: 'features.calendar' },
  { icon: BarChart3, key: 'features.progress' },
]

const getStrength = (pw) => {
  if (!pw) return { level: 0, color: '' }
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const map = [
    { level: 0, color: '' },
    { level: 1, color: 'bg-error' },
    { level: 2, color: 'bg-warning' },
    { level: 3, color: 'bg-success-soft' },
    { level: 4, color: 'bg-success' },
  ]
  return map[score] ?? map[0]
}

const validateForm = (form) => {
  const errors = {}
  if (!form.name.trim()) errors.name = 'errors.nameRequired'
  if (!form.username || !form.username.trim()) {
    errors.username = 'errors.usernameRequired'
  } else if (!/^[A-Za-z0-9-_]+$/.test(form.username)) {
    errors.username = 'errors.usernameInvalid'
  }
  if (!form.email.trim()) {
    errors.email = 'errors.emailRequired'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'errors.emailInvalid'
  }
  if (!form.password) {
    errors.password = 'errors.passwordRequired'
  } else if (form.password.length < 8) {
    errors.password = 'errors.passwordTooShort'
  }
  if (!form.confirmPassword) {
    errors.confirmPassword = 'errors.confirmPasswordRequired'
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'errors.passwordMismatch'
  }
  return errors
}

const formatError = (t, error) => {
  if (Array.isArray(error)) return t(error[0])
  return error ? t(error) : ''
}

const getStrengthLabelKey = (level) => {
  switch (level) {
    case 1:
      return 'register.passwordStrength.weak'
    case 2:
      return 'register.passwordStrength.fair'
    case 3:
      return 'register.passwordStrength.good'
    case 4:
      return 'register.passwordStrength.strong'
    default:
      return ''
  }
}

const RegisterPage = () => {
  const { register, isAuthenticated, isLoading: authLoading } = useAuth()
  const { t } = useTranslation('auth')
  const toast = useToast()

  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checking, setChecking] = useState(false)

  // ── Auth redirect (already signed in) ────────────────────────────
  if (isAuthenticated && !authLoading) {
    return <Navigate to="/dashboard" replace />
  }

  // ── Handlers ─────────────────────────────────────────────────────
  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')

    const fieldErrors = validateForm(form)
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors)
      return
    }

    // Verify that the email and username are not taken yet
    setChecking(true)
    const availability = await checkAvailability({ email: form.email, username: form.username })
    setChecking(false)
    if (availability.status === 'error' && availability.errors) {
      setErrors(availability.errors)
      return
    }
    setErrors({})

    // Account details only; study details come from the STAG sync
    const payload = {
      name: form.name,
      username: form.username,
      email: form.email,
      password: form.password,
      password_confirmation: form.confirmPassword,
    }

    setSubmitting(true)
    try {
      // On success AuthContext opens the profile's integrations tab
      await register(payload)
      toast.success(t('register.welcomeToast'))
    } catch (err) {
      if (err.errors) {
        setErrors(err.errors)
      } else {
        setServerError(err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const strength = getStrength(form.password)
  const strengthLabelKey = getStrengthLabelKey(strength.level)

  // ── Style tokens ─────────────────────────────────────────────────
  const inputBase =
    'w-full pl-10 pr-4 py-2.5 bg-surface-container-low rounded-lg border text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest transition-colors'
  const inputOk = `${inputBase} border-outline-variant focus:border-primary`
  const inputErr = `${inputBase} border-error focus:border-error bg-error-container`
  const busy = checking || submitting

  // ── JSX ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex font-inter relative">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <LanguageSwitcher />
      </div>
      {/* ─── Left branding panel (UNTOUCHED) ─────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[480px] xl:w-[540px] shrink-0 flex-col justify-between p-12 relative overflow-hidden bg-midnight"      >
        <div className="flex items-center gap-3 relative z-10">
          <img
            src={logoImg}
            alt="Eduvio"
            className="w-10 h-10 object-contain"
          />
          <span className="font-geist font-bold text-xl text-midnight-foreground tracking-tight">Eduvio</span>
        </div>

        <div className="relative z-10 flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-bold text-midnight-foreground leading-tight tracking-tight">
              {t('register.hero.headline')}
            </h1>
            <p className="text-midnight-muted text-base leading-relaxed">
              {t('register.hero.subtitle')}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {FEATURES.map(({ icon: Icon, key }) => (
              <div key={key} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-midnight-foreground/8 border border-midnight-foreground/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-midnight-muted" />
                </div>
                <p className="text-sm text-midnight-foreground leading-snug">{t(key)}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-midnight-muted text-xs relative z-10">
          {t('login.footerCopyright')}
        </p>
      </div>

      {/* ─── Right form panel ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-start lg:justify-center bg-surface-container-lowest px-6 pt-20 pb-12 sm:pt-24 lg:pt-12 overflow-y-auto">
        <div className="w-full max-w-[400px] flex flex-col gap-7">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3">
            <img
              src={logoImg}
              alt="Eduvio"
              className="w-9 h-9 object-contain"
            />
            <span className="font-geist font-bold text-xl text-on-surface tracking-tight">Eduvio</span>
          </div>

          {/* ── Title ──────────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl font-bold text-on-surface tracking-tight">
              {t('register.title')}
            </h2>
            <p className="text-body-md text-on-surface-variant">
              {t('register.subtitle')}
            </p>
          </div>

          {/* Server error */}
          {serverError && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-error-container border border-error/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
              <p className="text-label-sm text-on-error-container">{t(serverError)}</p>
            </div>
          )}

          {/* ── Form ───────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

            {/* ═══════════════ Account details ═══════════════ */}
            {/* Full name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-label-md font-semibold text-on-surface" htmlFor="reg-name">
                {t('register.fields.name.label')}
              </label>
              <div className="relative">
                <UserRound className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="reg-name"
                  type="text"
                  autoComplete="name"
                  value={form.name}
                  onChange={set('name')}
                  placeholder={t('register.fields.name.placeholder')}
                  className={errors.name ? inputErr : inputOk}
                />
              </div>
              {errors.name && (
                <p className="text-label-sm text-error flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {formatError(t, errors.name)}
                </p>
              )}
            </div>

            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label className="text-label-md font-semibold text-on-surface" htmlFor="reg-username">
                {t('register.fields.username.label')}
              </label>
              <div className="relative">
                <UserRound className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="reg-username"
                  type="text"
                  autoComplete="username"
                  value={form.username}
                  onChange={set('username')}
                  placeholder={t('register.fields.username.placeholder')}
                  className={errors.username ? inputErr : inputOk}
                />
              </div>
              {errors.username && (
                <p className="text-error text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {formatError(t, errors.username)}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-label-md font-semibold text-on-surface" htmlFor="reg-email">
                {t('register.fields.email.label')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder={t('register.fields.email.placeholder')}
                  className={errors.email ? inputErr : inputOk}
                />
              </div>
              {errors.email && (
                <p className="text-error text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {formatError(t, errors.email)}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-label-md font-semibold text-on-surface" htmlFor="reg-password">
                {t('register.fields.password.label')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="reg-password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={set('password')}
                  placeholder={t('register.fields.password.placeholder')}
                  className={`${errors.password ? inputErr : inputOk} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                  aria-label={showPass ? t('register.aria.hidePassword') : t('register.aria.showPassword')}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {form.password && (
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4].map((n) => (
                      <div
                        key={n}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          n <= strength.level ? strength.color : 'bg-outline-variant'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-semibold text-on-surface-variant shrink-0">
                    {strengthLabelKey ? t(strengthLabelKey) : ''}
                  </span>
                </div>
              )}

              {errors.password && (
                <p className="text-label-sm text-error flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {formatError(t, errors.password)}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-label-md font-semibold text-on-surface" htmlFor="reg-confirm">
                {t('register.fields.confirmPassword.label')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="reg-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  placeholder={t('register.fields.confirmPassword.placeholder')}
                  className={`${errors.confirmPassword ? inputErr : inputOk} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
                  aria-label={showConfirm ? t('register.aria.hidePassword') : t('register.aria.showPassword')}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>

                {form.confirmPassword && form.password === form.confirmPassword && (
                  <CheckCircle2 className="w-4 h-4 text-success absolute right-9 top-1/2 -translate-y-1/2" />
                )}
              </div>
              {errors.confirmPassword && (
                <p className="text-label-sm text-error flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {formatError(t, errors.confirmPassword)}
                </p>
              )}
            </div>

            {/* ═══════════════ Submit ═══════════════ */}
            <div className="flex gap-3 mt-2">
              <button
                type="submit"
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-primary hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-on-primary font-semibold rounded-lg text-label-md transition-all shadow-sm cursor-pointer"
              >
                {checking ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {t('register.actions.checking')}</>
                ) : submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> {t('register.actions.creatingAccount')}</>
                ) : (
                  <>{t('register.actions.completeRegistration')} <Check className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </form>

          {/* Study details are not entered by hand; they come from STAG */}
          <p className="flex items-start gap-2 text-sm text-on-surface-variant leading-relaxed">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>{t('register.stagNote')}</span>
          </p>

          {/* Sign in link */}
          <p className="text-body-md text-on-surface-variant text-center">
            {t('register.links.haveAccount')}{' '}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              {t('register.links.signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage