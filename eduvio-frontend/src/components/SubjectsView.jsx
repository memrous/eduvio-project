import { useState, useMemo, useRef, useEffect } from 'react'
import {
  SlidersHorizontal,
  ArrowUpDown,
  Plus,
  X,
  ChevronDown,
  Check,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import SubjectOverviewCard from './SubjectOverviewCard'
import CustomIcon from './CustomIcon'

// ─── Create Subject Modal ────────────────────────────────────
const CreateSubjectModal = ({ onClose, onSave }) => {
  const { t } = useTranslation(['academic', 'dashboard'])
  const [form, setForm] = useState({
    code: '',
    name: '',
    credits: '6',
    isMandatory: 'Mandatory',
    lecturer: '',
    semester: 'Winter',
    description: '',
    completionType: 'Credit + Exam',
  })

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.code.trim()) return
    onSave({
      id: Date.now(),
      code: form.code.toUpperCase(),
      name: form.name,
      credits: Number(form.credits),
      isMandatory: form.isMandatory === 'Mandatory',
      lecturer: form.lecturer || t('academic:subjectsView.defaults.tba'),
      semester: form.semester,
      description: form.description || t('academic:subjectsView.defaults.noDescriptionProvided'),
      completionType: form.completionType,
    })
    onClose()
  }

  const inputCls = 'w-full px-3 py-2 bg-surface rounded-md border border-outline-variant text-body-md text-on-surface focus:outline-none focus:border-primary focus:bg-surface-container transition-colors'
  const labelCls = 'text-label-md font-bold text-on-surface-variant'

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg shadow-2xl border border-outline-variant w-full max-w-lg overflow-hidden font-inter">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-surface">
          <h2 className="text-headline-md font-bold text-on-surface">{t('academic:subjectsView.modalTitle')}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant hover:text-on-surface cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>{t('academic:subjectsView.fields.subjectName')}</label>
            <input required placeholder={t('academic:subjectsView.placeholders.subjectName')} value={form.name} onChange={set('name')} className={inputCls} />
          </div>

          {/* Code + Credits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>{t('academic:subjectsView.fields.courseCode')}</label>
              <input required placeholder={t('academic:subjectsView.placeholders.courseCode')} value={form.code} onChange={set('code')} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>{t('academic:subjectsView.fields.credits')}</label>
              <select value={form.credits} onChange={set('credits')} className={inputCls}>
                {[2, 3, 4, 5, 6, 7, 8, 10].map(c => (
                  <option key={c} value={c}>
                    {t(`academic:subjectsView.creditUnit`, { count: c })}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lecturer */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>{t('academic:subjectsView.fields.lecturer')}</label>
            <input placeholder={t('academic:subjectsView.placeholders.lecturer')} value={form.lecturer} onChange={set('lecturer')} className={inputCls} />
          </div>

          {/* Category + Semester */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>{t('academic:subjectsView.fields.enrollmentBadge')}</label>
              <select value={form.isMandatory} onChange={set('isMandatory')} className={inputCls}>
                <option value="Mandatory">{t('dashboard:subjectCard.mandatory')}</option>
                <option value="Elective">{t('dashboard:subjectCard.elective')}</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>{t('academic:subjectsView.fields.semester')}</label>
              <select value={form.semester} onChange={set('semester')} className={inputCls}>
                <option value="Winter">{t('dashboard:subjectCard.semester.winter')}</option>
                <option value="Summer">{t('dashboard:subjectCard.semester.summer')}</option>
              </select>
            </div>
          </div>

          {/* Completion Type */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>{t('academic:subjectsView.fields.completionType')}</label>
            <select value={form.completionType} onChange={set('completionType')} className={inputCls}>
              <option value="Exam">{t('academic:subjectsView.options.exam')}</option>
              <option value="Credit">{t('academic:subjectsView.options.credit')}</option>
              <option value="Credit + Exam">{t('academic:subjectsView.options.creditPlusExam')}</option>
            </select>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className={labelCls}>{t('academic:subjectsView.fields.subjectDescription')}</label>
            <textarea rows={3} placeholder={t('academic:subjectsView.placeholders.description')} value={form.description} onChange={set('description')} className={`${inputCls} resize-none`} />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-end pt-4 border-t border-[#E2E8F0] mt-2">
            <button type="button" onClick={onClose} className="w-full sm:w-auto px-4 py-2 border border-outline-variant rounded-md text-label-md font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer">{t('academic:subjectsView.actions.cancel')}</button>
            <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-md text-label-md font-semibold shadow-sm transition-colors cursor-pointer">{t('academic:subjectsView.actions.saveSubject')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Dropdown helper ─────────────────────────────────────────
const Dropdown = ({ label, icon: Icon, options, value, onChange }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative w-full sm:w-auto" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full sm:w-auto items-center gap-2 px-3 py-2 bg-surface border border-outline-variant rounded-md text-label-md font-semibold text-on-surface hover:bg-surface-container transition-colors cursor-pointer shadow-ambient"
      >
        <Icon className="w-3.5 h-3.5 text-on-surface-variant" />
        {label}
        <ChevronDown className={`w-3 h-3 text-on-surface-variant transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-30 bg-surface border border-outline-variant rounded-lg shadow-lg min-w-[160px] py-1 overflow-hidden">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-label-md font-medium transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                value === opt.value ? 'text-primary bg-primary-container' : 'text-on-surface hover:bg-surface-container-low'
              }`}
            >
              {opt.label}
              {value === opt.value && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main SubjectsView Component ─────────────────────────────
// eslint-disable-next-line no-unused-vars
const SubjectsView = ({ subjects, onSelectSubject, onAddSubject, onDeleteSubject }) => {
  const { t } = useTranslation(['academic', 'dashboard'])
  const [filterType, setFilterType] = useState('all')     // 'all' | 'Mandatory' | 'Elective'
  const [sortKey, setSortKey] = useState('default')       // 'default' | 'name' | 'code' | 'credits'
  const [isModalOpen, setIsModalOpen] = useState(false)

  const FILTER_OPTIONS = [
    { value: 'all',       label: t('academic:subjectsView.filters.allSubjects') },
    { value: 'Mandatory', label: t('academic:subjectsView.filters.mandatoryOnly') },
    { value: 'Elective',  label: t('academic:subjectsView.filters.electiveOnly') },
  ]

  const SORT_OPTIONS = [
    { value: 'default',  label: t('academic:subjectsView.sorts.defaultOrder') },
    { value: 'name',     label: t('academic:subjectsView.sorts.nameAZ') },
    { value: 'code',     label: t('academic:subjectsView.sorts.courseCode') },
    { value: 'credits',  label: t('academic:subjectsView.sorts.creditsHighLow') },
  ]

  const displayed = useMemo(() => {
    let list = [...subjects]

    // Filter
    if (filterType !== 'all') {
      const isMandatoryVal = filterType === 'Mandatory';
      list = list.filter(s => s.isMandatory === isMandatoryVal)
    }

    // Sort
    if (sortKey === 'name')     list.sort((a, b) => a.name.localeCompare(b.name))
    if (sortKey === 'code')     list.sort((a, b) => a.code.localeCompare(b.code))
    if (sortKey === 'credits')  list.sort((a, b) => b.credits - a.credits)

    return list
  }, [subjects, filterType, sortKey])

  const filterLabel = FILTER_OPTIONS.find(o => o.value === filterType)?.label ?? t('academic:subjectsView.fallbacks.filter')
  const sortLabel   = SORT_OPTIONS.find(o => o.value === sortKey)?.label ?? t('academic:subjectsView.fallbacks.sort')

  return (
    <>
      <div className="w-full flex flex-col gap-8 font-inter pb-16">

        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="text-display text-on-surface">{t('academic:subjectsView.page.title')}</h1>
            <p className="text-body-md text-[#737686]">{t('academic:subjectsView.page.subtitle')}</p>
          </div>

          {/* Filter + Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="w-full sm:w-auto">
              <Dropdown
                label={filterLabel}
                icon={SlidersHorizontal}
                options={FILTER_OPTIONS}
                value={filterType}
                onChange={setFilterType}
              />
            </div>
            <div className="w-full sm:w-auto">
              <Dropdown
                label={sortLabel}
                icon={ArrowUpDown}
                options={SORT_OPTIONS}
                value={sortKey}
                onChange={setSortKey}
              />
            </div>
          </div>
        </div>

        {/* Subjects Grid */}
        {displayed.length === 0 ? (
          <div className="flex flex-col gap-5">
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-16 text-center flex flex-col items-center gap-3 shadow-ambient">
              <div className="w-12 h-12 bg-[#eeefff] text-primary rounded-full flex items-center justify-center">
                <CustomIcon name="book" className="w-6 h-6" />
              </div>
              <p className="text-headline-md font-semibold text-on-surface">
                {subjects.length === 0
                  ? t('academic:subjectsView.emptyState.noDataTitle')
                  : t('academic:subjectsView.emptyState.noMatchingTitle')}
              </p>
              <p className="text-body-md text-[#737686]">
                {subjects.length === 0
                  ? t('academic:subjectsView.emptyState.noDataDescription')
                  : t('academic:subjectsView.emptyState.noMatchingDescription')}
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              <div
                onClick={() => setIsModalOpen(true)}
                className="border-2 border-dashed border-outline-variant hover:border-primary hover:bg-surface-container-low transition-colors rounded-lg p-5 flex flex-col items-center justify-center gap-3 cursor-pointer min-h-[220px] text-center bg-surface-container-lowest shadow-ambient"
              >
                <div className="w-10 h-10 rounded-full border border-dashed border-outline-variant flex items-center justify-center text-outline-variant hover:text-primary">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-body-md font-bold text-on-surface-variant hover:text-primary transition-colors">
                  {t('academic:subjectsView.addManually')}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {displayed.map(subject => (
              <SubjectOverviewCard key={subject.id} subject={subject} onSelect={onSelectSubject} />
            ))}
            {/* "Vložit předmět ručně" Card */}
            <div
              onClick={() => setIsModalOpen(true)}
              className="border-2 border-dashed border-outline-variant hover:border-primary hover:bg-surface-container-low transition-colors rounded-lg p-5 flex flex-col items-center justify-center gap-3 cursor-pointer min-h-[220px] text-center bg-surface-container-lowest shadow-ambient"
            >
              <div className="w-10 h-10 rounded-full border border-dashed border-outline-variant flex items-center justify-center text-outline-variant hover:text-primary">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-body-md font-bold text-on-surface-variant hover:text-primary transition-colors">
                {t('academic:subjectsView.addManually')}
              </span>
            </div>
          </div>
        )}

        <footer className="text-center text-body-md text-[#737686] pt-4 border-t border-[#E2E8F0]">
          {t('academic:subjectsView.page.footer')}
        </footer>
      </div>

      {/* Create Subject Modal */}
      {isModalOpen && (
        <CreateSubjectModal onClose={() => setIsModalOpen(false)} onSave={onAddSubject} />
      )}
    </>
  )
}

export default SubjectsView
