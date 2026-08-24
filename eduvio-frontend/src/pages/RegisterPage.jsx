import { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  AlertCircle,
  CalendarDays,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  IdCard,
  KeyRound,
  ChevronDown,
  Building2,
  Check,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import CustomIcon from '../components/CustomIcon'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { useAuth } from '../context/AuthContext'
import httpClient from '../services/httpClient'
import { checkAvailability } from '../services/api'


const FEATURES = [
  { icon: () => <CustomIcon name="book" className="w-5 h-5" />, key: 'features.manageSubjects' },
  { icon: CalendarDays, key: 'features.calendar' },
  { icon: BarChart3, key: 'features.progress' },
]

const ACADEMIC_YEARS = [
  { value: '1' },
  { value: '2' },
  { value: '3' },
  { value: '4' },
  { value: '5' },
  { value: '6' },
]

const STEP_META = [
  'step1',
  'step2',
  'step3',
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
    { level: 1, color: 'bg-red-400' },
    { level: 2, color: 'bg-amber-400' },
    { level: 3, color: 'bg-emerald-400' },
    { level: 4, color: 'bg-emerald-500' },
  ]
  return map[score] ?? map[0]
}

const validateStep1 = (form) => {
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

const validateStep2 = (form) => {
  const errors = {}
  if (!form.university_id) errors.university_id = 'errors.universityRequired'
  if (!form.faculty_id) errors.faculty_id = 'errors.facultyRequired'
  if (!form.study_program_id) errors.study_program_id = 'errors.studyProgramRequired'
  if (!form.academic_year) errors.academic_year = 'errors.academicYearRequired'
  return errors
}

const validateStep3 = (form, connectStagLater) => {
  if (connectStagLater) return {}
  const errors = {}
  if (!form.stag_student_id.trim()) errors.stag_student_id = 'errors.stagStudentIdRequired'
  if (!form.stag_username.trim()) errors.stag_username = 'errors.stagUsernameRequired'
  if (!form.stag_password) errors.stag_password = 'errors.stagPasswordRequired'
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

  const [currentStep, setCurrentStep] = useState(1)
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    university_id: '',
    faculty_id: '',
    study_program_id: '',
    academic_year: '',
    stag_student_id: '',
    stag_username: '',
    stag_password: '',
  })
  const [connectStagLater, setConnectStagLater] = useState(true)

  const [universities, setUniversities] = useState([])
  const [faculties, setFaculties] = useState([])
  const [programs, setPrograms] = useState([])

  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showStagPass, setShowStagPass] = useState(false)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ── Fetch universities on mount ──────────────────────────────────
  useEffect(() => {
    httpClient
      .get('/academic/universities')
      .then((res) => {
        const list = res.data?.data || res.data || []
        setUniversities(list)
        const upol = list.find((u) => u.code === 'UPOL')
        if (upol) setForm((prev) => ({ ...prev, university_id: String(upol.id) }))
      })
      .catch(() => {})
  }, [])

  // ── Fetch faculties when university changes ──────────────────────
  useEffect(() => {
    if (!form.university_id) {
      setFaculties([])
      setPrograms([])
      return
    }
    setFaculties([])
    setPrograms([])
    setForm((prev) => ({ ...prev, faculty_id: '', study_program_id: '' }))
    httpClient
      .get(`/academic/universities/${form.university_id}/faculties`)
      .then((res) => setFaculties(res.data?.data || res.data || []))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.university_id])

  // ── Fetch programs when faculty changes ──────────────────────────
  useEffect(() => {
    if (!form.faculty_id) {
      setPrograms([])
      return
    }
    setPrograms([])
    setForm((prev) => ({ ...prev, study_program_id: '' }))
    httpClient
      .get(`/academic/faculties/${form.faculty_id}/programs`)
      .then((res) => setPrograms(res.data?.data || res.data || []))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.faculty_id])

  // ── Auth redirect ────────────────────────────────────────────────
  if (isAuthenticated && !authLoading) {
    return <Navigate to="/dashboard" replace />
  }

  // ── Handlers ─────────────────────────────────────────────────────
  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const handleConnectStagLater = (e) => {
    const checked = e.target.checked
    setConnectStagLater(checked)
    if (checked) {
      setForm((prev) => ({
        ...prev,
        stag_student_id: '',
        stag_username: '',
        stag_password: '',
      }))
      setErrors((prev) => {
        const next = { ...prev }
        delete next.stag_student_id
        delete next.stag_username
        delete next.stag_password
        return next
      })
    }
  }

  const [checking, setChecking] = useState(false)

  const handleNext = async () => {
    setServerError('')
    let fieldErrors = {}
    if (currentStep === 1) fieldErrors = validateStep1(form)
    if (currentStep === 2) fieldErrors = validateStep2(form)

    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors)
      return
    }

    // On Step 1, verify email + username are not already taken before advancing
    if (currentStep === 1) {
      setChecking(true)
      const result = await checkAvailability({ email: form.email, username: form.username })
      setChecking(false)
      if (result.status === 'error' && result.errors) {
        setErrors(result.errors)
        return
      }
    }

    setErrors({})
    setCurrentStep((s) => s + 1)
  }

  const handleBack = () => {
    setErrors({})
    setServerError('')
    setCurrentStep((s) => s - 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')

    // Run validation for the current step
    let fieldErrors = {}
    if (currentStep === 1) fieldErrors = validateStep1(form)
    else if (currentStep === 2) fieldErrors = validateStep2(form)
    else if (currentStep === 3) fieldErrors = validateStep3(form, connectStagLater)

    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors)
      return
    }
    setErrors({})

    // If not on last step, advance
    if (currentStep < 3) {
      setCurrentStep((s) => s + 1)
      return
    }

    // Build final payload
    const payload = {
      name: form.name,
      username: form.username,
      email: form.email,
      password: form.password,
      password_confirmation: form.confirmPassword,
      university_id: Number(form.university_id),
      faculty_id: Number(form.faculty_id),
      study_program_id: Number(form.study_program_id),
      academic_year: form.academic_year,
      ...(!connectStagLater
        ? {
            stag_student_id: form.stag_student_id,
            stag_username: form.stag_username,
            stag_password: form.stag_password,
          }
        : {}),
    }

    setSubmitting(true)
    try {
      await register(payload)
    } catch (err) {
      if (err.errors) {
        setErrors(err.errors)
        if (err.errors.username || err.errors.email || err.errors.name || err.errors.password) {
          setCurrentStep(1)
        }
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
    'w-full pl-10 pr-4 py-2.5 bg-[#F8F9FB] rounded-lg border text-body-md text-gray-900 focus:outline-none focus:bg-white transition-colors'
  const inputOk = `${inputBase} border-[#E2E8F0] focus:border-[#004ac6]`
  const inputErr = `${inputBase} border-red-400 focus:border-red-500 bg-red-50`

  const selectBase =
    'w-full pl-10 pr-10 py-2.5 bg-[#F8F9FB] rounded-lg border text-body-md text-gray-900 focus:outline-none focus:bg-white transition-colors appearance-none cursor-pointer'
  const selectOk = `${selectBase} border-[#E2E8F0] focus:border-[#004ac6]`
  const selectErr = `${selectBase} border-red-400 focus:border-red-500 bg-red-50`

  const stagInputBase =
    'w-full px-4 py-2.5 bg-[#F8F9FB] rounded-lg border text-body-md text-gray-900 focus:outline-none focus:bg-white transition-colors'
  const stagInputOk = `${stagInputBase} border-[#E2E8F0] focus:border-[#004ac6]`
  const stagInputErr = `${stagInputBase} border-red-400 focus:border-red-500 bg-red-50`

  const meta = STEP_META[currentStep - 1]
  const progressPercent = Math.round((currentStep / 3) * 100)

  // ── JSX ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex font-inter relative">
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <LanguageSwitcher />
      </div>
      {/* ─── Left branding panel (UNTOUCHED) ─────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[480px] xl:w-[540px] shrink-0 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #001a5e 0%, #003ab0 55%, #0057e8 100%)' }}
      >
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #7eb8ff, transparent 70%)' }} />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #a78bfa, transparent 70%)' }} />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-geist font-bold text-xl text-white tracking-tight">StudyHub</span>
        </div>

        <div className="relative z-10 flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h1 className="text-4xl font-bold text-white leading-tight tracking-tight">
              {t('register.hero.headline')}
            </h1>
            <p className="text-blue-200 text-base leading-relaxed">
              {t('register.hero.subtitle')}
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

        <p className="text-blue-300/60 text-xs relative z-10">
          {t('login.footerCopyright')}
        </p>
      </div>

      {/* ─── Right form panel ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-start lg:justify-center bg-white px-6 pt-20 pb-12 sm:pt-24 lg:pt-12 overflow-y-auto">
        <div className="w-full max-w-[400px] flex flex-col gap-7">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3">
            <div className="w-9 h-9 bg-[#004ac6] rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-geist font-bold text-xl text-gray-900 tracking-tight">StudyHub</span>
          </div>

          {/* ── Progress indicator ─────────────────────────────── */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                {t('register.progress.step', { currentStep })}
              </span>
              <span className="text-[11px] font-bold text-[#004ac6]">{progressPercent}%</span>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                    n <= currentStep ? 'bg-[#004ac6]' : 'bg-[#E2E8F0]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* ── Step title ─────────────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              {t(`register.stepMeta.${meta}.title`)}
            </h2>
            <p className="text-body-md text-gray-500">
              {t(`register.stepMeta.${meta}.subtitle`)}
            </p>
          </div>

          {/* Server error */}
          {serverError && (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-label-sm text-red-700">{t(serverError)}</p>
            </div>
          )}

          {/* ── Form ───────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

            {/* ═══════════════ STEP 1 — Account Creation ═══════════════ */}
            {currentStep === 1 && (
              <>
                {/* Full name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-md font-semibold text-gray-900" htmlFor="reg-name">
                    {t('register.fields.name.label')}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                    <p className="text-label-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {formatError(t, errors.name)}
                    </p>
                  )}
                </div>

                {/* Username */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-md font-semibold text-gray-900" htmlFor="reg-username">
                    {t('register.fields.username.label')}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {formatError(t, errors.username)}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-md font-semibold text-gray-900" htmlFor="reg-email">
                    {t('register.fields.email.label')}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                    <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {formatError(t, errors.email)}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-md font-semibold text-gray-900" htmlFor="reg-password">
                    {t('register.fields.password.label')}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors"
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
                              n <= strength.level ? strength.color : 'bg-[#E2E8F0]'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] font-semibold text-gray-500 shrink-0">
                        {strengthLabelKey ? t(strengthLabelKey) : ''}
                      </span>
                    </div>
                  )}

                  {errors.password && (
                    <p className="text-label-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {formatError(t, errors.password)}
                    </p>
                  )}
                </div>

                {/* Confirm password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-md font-semibold text-gray-900" htmlFor="reg-confirm">
                    {t('register.fields.confirmPassword.label')}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors"
                      aria-label={showConfirm ? t('register.aria.hidePassword') : t('register.aria.showPassword')}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>

                    {form.confirmPassword && form.password === form.confirmPassword && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-9 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-label-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {formatError(t, errors.confirmPassword)}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ═══════════════ STEP 2 — Academic Profile ═══════════════ */}
            {currentStep === 2 && (
              <>
                {/* University */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-md font-semibold text-gray-900" htmlFor="reg-university">
                    {t('register.fields.university.label')}
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      id="reg-university"
                      value={form.university_id}
                      onChange={set('university_id')}
                      className={errors.university_id ? selectErr : selectOk}
                    >
                      <option value="">{t('register.fields.university.placeholder')}</option>
                      {universities.map((u) => (
                        <option key={u.id} value={String(u.id)}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {errors.university_id && (
                    <p className="text-label-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {formatError(t, errors.university_id)}
                    </p>
                  )}
                </div>

                {/* Faculty */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-md font-semibold text-gray-900" htmlFor="reg-faculty">
                    {t('register.fields.faculty.label')}
                  </label>
                  <div className="relative">
                    <CustomIcon name="book" className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      id="reg-faculty"
                      value={form.faculty_id}
                      onChange={set('faculty_id')}
                      disabled={!form.university_id}
                      className={`${errors.faculty_id ? selectErr : selectOk} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <option value="">
                        {form.university_id
                          ? t('register.fields.faculty.placeholder')
                          : t('register.fields.faculty.disabledPlaceholder')}
                      </option>
                      {faculties.map((f) => (
                        <option key={f.id} value={String(f.id)}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {errors.faculty_id && (
                    <p className="text-label-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {formatError(t, errors.faculty_id)}
                    </p>
                  )}
                </div>

                {/* Study Program */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-md font-semibold text-gray-900" htmlFor="reg-program">
                    {t('register.fields.studyProgram.label')}
                  </label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      id="reg-program"
                      value={form.study_program_id}
                      onChange={set('study_program_id')}
                      disabled={!form.faculty_id}
                      className={`${errors.study_program_id ? selectErr : selectOk} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <option value="">
                        {form.faculty_id
                          ? t('register.fields.studyProgram.placeholder')
                          : t('register.fields.studyProgram.disabledPlaceholder')}
                      </option>
                      {programs.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {errors.study_program_id && (
                    <p className="text-label-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {formatError(t, errors.study_program_id)}
                    </p>
                  )}
                </div>

                {/* Academic Year */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-md font-semibold text-gray-900" htmlFor="reg-year">
                    {t('register.fields.academicYear.label')}
                  </label>
                  <div className="relative">
                    <CalendarDays className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      id="reg-year"
                      value={form.academic_year}
                      onChange={set('academic_year')}
                      className={errors.academic_year ? selectErr : selectOk}
                    >
                      <option value="">{t('register.fields.academicYear.placeholder')}</option>
                      {ACADEMIC_YEARS.map((y) => (
                        <option key={y.value} value={y.value}>
                          {t('register.academicYears', { count: Number(y.value), ordinal: true })}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {errors.academic_year && (
                    <p className="text-label-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {formatError(t, errors.academic_year)}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* ═══════════════ STEP 3 — University Sync ═══════════════ */}
            {currentStep === 3 && (
              <>
                {/* Connect STAG later checkbox */}
                <label className="flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8F9FB] px-4 py-3 text-sm text-gray-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={connectStagLater}
                    onChange={handleConnectStagLater}
                    className="mt-1 h-4 w-4 rounded border-[#CBD5E1] text-[#004ac6] focus:ring-[#004ac6]"
                  />
                  <span className="leading-relaxed">
                    <span className="font-semibold">{t('register.info.connectStagLaterTitle')}</span>
                    <span className="block text-gray-500">
                      {t('register.info.connectStagLaterDescription')}
                    </span>
                  </span>
                </label>

                {/* STAG fields (shown when connectStagLater is false) */}
                {!connectStagLater && (
                  <div className="rounded-2xl border border-[#E2E8F0] bg-slate-50/70 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <IdCard className="w-4 h-4 text-[#004ac6]" />
                      <h3 className="text-label-md font-semibold text-gray-900">{t('register.info.stagConnectionTitle')}</h3>
                    </div>

                    <div className="grid gap-4">
                      {/* STAG Student ID */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-label-md font-semibold text-gray-900" htmlFor="stag-student-id">
                          {t('register.fields.stagStudentId.label')}
                        </label>
                        <input
                          id="stag-student-id"
                          type="text"
                          value={form.stag_student_id}
                          onChange={set('stag_student_id')}
                          placeholder={t('register.fields.stagStudentId.placeholder')}
                          className={errors.stag_student_id ? stagInputErr : stagInputOk}
                        />
                        {errors.stag_student_id && (
                          <p className="text-label-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {formatError(t, errors.stag_student_id)}
                          </p>
                        )}
                      </div>

                      {/* STAG Username */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-label-md font-semibold text-gray-900" htmlFor="stag-username">
                          {t('register.fields.stagUsername.label')}
                        </label>
                        <input
                          id="stag-username"
                          type="text"
                          value={form.stag_username}
                          onChange={set('stag_username')}
                          placeholder={t('register.fields.stagUsername.placeholder')}
                          className={errors.stag_username ? stagInputErr : stagInputOk}
                        />
                        {errors.stag_username && (
                          <p className="text-label-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {formatError(t, errors.stag_username)}
                          </p>
                        )}
                      </div>

                      {/* STAG Password */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-label-md font-semibold text-gray-900" htmlFor="stag-password">
                          {t('register.fields.stagPassword.label')}
                        </label>
                        <div className="relative">
                          <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            id="stag-password"
                            type={showStagPass ? 'text' : 'password'}
                            value={form.stag_password}
                            onChange={set('stag_password')}
                            placeholder={t('register.fields.stagPassword.placeholder')}
                            className={`${errors.stag_password ? stagInputErr : stagInputOk} pl-10 pr-10`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowStagPass((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors"
                            aria-label={showStagPass ? t('register.aria.hideStagPassword') : t('register.aria.showStagPassword')}
                          >
                            {showStagPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {errors.stag_password && (
                          <p className="text-label-sm text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {formatError(t, errors.stag_password)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-400 leading-relaxed">
                  {t('register.info.credentialsEncrypted')}
                </p>
              </>
            )}

            {/* ═══════════════ Navigation buttons ═══════════════ */}
            <div className={`flex gap-3 mt-2 ${currentStep === 1 ? '' : 'justify-between'}`}>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center justify-center gap-2 py-2.5 px-5 bg-[#F8F9FB] hover:bg-[#EEF1F5] border border-[#E2E8F0] text-gray-900 font-semibold rounded-lg text-label-md transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> {t('register.actions.back')}
                </button>
              )}

              {currentStep < 3 && (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={checking}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#004ac6] hover:bg-[#003ea8] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-label-md transition-all shadow-sm cursor-pointer"
                >
                  {checking ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {t('register.actions.checking')}</>
                  ) : (
                    <>{t('register.actions.continue')} <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              )}

              {currentStep === 3 && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#004ac6] hover:bg-[#003ea8] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-label-md transition-all shadow-sm cursor-pointer"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {t('register.actions.creatingAccount')}</>
                  ) : (
                    <>{t('register.actions.completeRegistration')} <Check className="w-4 h-4" /></>
                  )}
                </button>
              )}
            </div>
          </form>

          {/* Sign in link */}
          <p className="text-body-md text-gray-500 text-center">
            {t('register.links.haveAccount')}{' '}
            <Link to="/login" className="text-[#004ac6] font-semibold hover:underline">
              {t('register.links.signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage