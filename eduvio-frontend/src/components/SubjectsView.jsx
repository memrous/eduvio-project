import { useState, useMemo, useCallback } from 'react'
import {
  SlidersHorizontal,
  ArrowUpDown,
  Plus,
  X,
  ChevronDown,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Dropdown from './common/Dropdown'
import SubjectOverviewCard from './SubjectOverviewCard'
import CustomIcon from './CustomIcon'
import { parseSemester, normalizeStatut } from '../utils/semester'

// ─── Add Manually Card ───────────────────────────────────────
const AddManuallyCard = ({ onAdd, label }) => (
  <div
    onClick={onAdd}
    className="border-2 border-dashed border-outline-variant hover:border-primary hover:bg-surface-container-low transition-colors rounded-2xl p-5 flex flex-col items-center justify-center gap-3 cursor-pointer min-h-[200px] text-center bg-surface-container-lowest shadow-ambient"
  >
    <div className="w-10 h-10 rounded-full border border-dashed border-outline-variant flex items-center justify-center text-outline-variant hover:text-primary">
      <Plus className="w-5 h-5" />
    </div>
    <span className="text-body-md font-bold text-on-surface-variant hover:text-primary transition-colors">
      {label}
    </span>
  </div>
)

// ─── Create Subject Modal ────────────────────────────────────
const CreateSubjectModal = ({ onClose, onSave }) => {
  const { t } = useTranslation(['academic', 'dashboard'])
  const [form, setForm] = useState({
    code: '',
    name: '',
    credits: '6',
    isMandatory: 'Mandatory',
    statut: 'A',
    lecturer: '',
    semester: 'ZS 2026',
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
      isMandatory: form.statut === 'A' || form.isMandatory === 'Mandatory',
      statut: form.statut,
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

          {/* Category / Statut + Semester */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>{t('academic:subjectsView.fields.enrollmentBadge')}</label>
              <select value={form.statut} onChange={set('statut')} className={inputCls}>
                <option value="A">{t('academic:subjectsView.filters.statutA')}</option>
                <option value="B">{t('academic:subjectsView.filters.statutB')}</option>
                <option value="C">{t('academic:subjectsView.filters.statutC')}</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>{t('academic:subjectsView.fields.semester')}</label>
              <select value={form.semester} onChange={set('semester')} className={inputCls}>
                <option value="ZS 2026">{t('academic:subjectsView.semesters.winter')}</option>
                <option value="LS 2026">{t('academic:subjectsView.semesters.summer')}</option>
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

// ─── Main SubjectsView Component ─────────────────────────────
// eslint-disable-next-line no-unused-vars
const SubjectsView = ({ subjects, onSelectSubject, onAddSubject, onDeleteSubject }) => {
  const { t } = useTranslation(['academic', 'dashboard'])
  const [filterType, setFilterType] = useState('all')     // 'all' | 'A' | 'B' | 'C' | 'Mandatory' | 'Elective'
  const [sortKey, setSortKey] = useState('default')       // 'default' | 'name' | 'code' | 'credits'
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isWinterOpen, setIsWinterOpen] = useState(true)
  const [isSummerOpen, setIsSummerOpen] = useState(true)

  const FILTER_OPTIONS = [
    { value: 'all', label: t('academic:subjectsView.filters.allSubjects') },
    { value: 'A',   label: t('academic:subjectsView.filters.statutA') },
    { value: 'B',   label: t('academic:subjectsView.filters.statutB') },
    { value: 'C',   label: t('academic:subjectsView.filters.statutC') },
  ]

  const SORT_OPTIONS = [
    { value: 'default',  label: t('academic:subjectsView.sorts.defaultOrder') },
    { value: 'name',     label: t('academic:subjectsView.sorts.nameAZ') },
    { value: 'code',     label: t('academic:subjectsView.sorts.courseCode') },
    { value: 'credits',  label: t('academic:subjectsView.sorts.creditsHighLow') },
  ]

  const displayed = useMemo(() => {
    let list = [...subjects]

    // Filter by statut or legacy isMandatory
    if (filterType !== 'all') {
      if (filterType === 'A' || filterType === 'Mandatory') {
        list = list.filter(s => normalizeStatut(s.statut, s.isMandatory) === 'A')
      } else if (filterType === 'B') {
        list = list.filter(s => normalizeStatut(s.statut, s.isMandatory) === 'B')
      } else if (filterType === 'C' || filterType === 'Elective') {
        list = list.filter(s => normalizeStatut(s.statut, s.isMandatory) === 'C')
      }
    }

    // Sort
    if (sortKey === 'name') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    } else if (sortKey === 'code') {
      list.sort((a, b) => (a.code || '').localeCompare(b.code || ''))
    } else if (sortKey === 'credits') {
      list.sort((a, b) => (b.credits || 0) - (a.credits || 0))
    } else {
      // Default order: Sort by statut (A -> B -> C), then by code
      const order = { A: 1, B: 2, C: 3 }
      list.sort((a, b) => {
        const statutA = normalizeStatut(a.statut, a.isMandatory)
        const statutB = normalizeStatut(b.statut, b.isMandatory)
        if (order[statutA] !== order[statutB]) {
          return order[statutA] - order[statutB]
        }
        return (a.code || '').localeCompare(b.code || '')
      })
    }

    return list
  }, [subjects, filterType, sortKey])

  // Split into Winter and Summer semester groups
  const { winterSubjects, summerSubjects } = useMemo(() => {
    const winter = []
    const summer = []

    displayed.forEach(s => {
      const parsed = parseSemester(s.semester)
      if (parsed?.type === 'LS') {
        summer.push(s)
      } else {
        // ZS or unassigned defaults to current/winter semester
        winter.push(s)
      }
    })

    return { winterSubjects: winter, summerSubjects: summer }
  }, [displayed])

  const winterCredits = useMemo(
    () => winterSubjects.reduce((acc, s) => acc + (Number(s.credits) || 0), 0),
    [winterSubjects]
  )

  const summerCredits = useMemo(
    () => summerSubjects.reduce((acc, s) => acc + (Number(s.credits) || 0), 0),
    [summerSubjects]
  )

  // Group a semester's subject list into subsections: Mandatory (A), Compulsory Elective (B), Elective (C)
  const getSubsections = useCallback((list) => {
    const mandatory = []
    const semiElective = []
    const elective = []

    list.forEach(s => {
      const st = normalizeStatut(s.statut, s.isMandatory)
      if (st === 'A') mandatory.push(s)
      else if (st === 'B') semiElective.push(s)
      else elective.push(s)
    })

    const sections = []
    if (mandatory.length > 0) {
      sections.push({
        key: 'mandatory',
        title: t('academic:subjectsView.statutSections.mandatory'),
        items: mandatory,
      })
    }
    if (semiElective.length > 0) {
      sections.push({
        key: 'semiElective',
        title: t('academic:subjectsView.statutSections.semiElective'),
        items: semiElective,
      })
    }
    if (elective.length > 0) {
      sections.push({
        key: 'elective',
        title: t('academic:subjectsView.statutSections.elective'),
        items: elective,
      })
    }
    return sections
  }, [t])

  const winterSubsections = useMemo(() => getSubsections(winterSubjects), [winterSubjects, getSubsections])
  const summerSubsections = useMemo(() => getSubsections(summerSubjects), [summerSubjects, getSubsections])

  const filterLabel = FILTER_OPTIONS.find(o => o.value === filterType)?.label ?? t('academic:subjectsView.fallbacks.filter')
  const sortLabel   = SORT_OPTIONS.find(o => o.value === sortKey)?.label ?? t('academic:subjectsView.fallbacks.sort')

  return (
    <>
      <div className="w-full flex flex-col gap-8 font-inter pb-16 page-section">

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

        {/* Entirely Empty State */}
        {subjects.length === 0 ? (
          <div className="flex flex-col gap-5">
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-16 text-center flex flex-col items-center gap-3 shadow-ambient">
              <div className="w-12 h-12 bg-[#eeefff] text-primary rounded-full flex items-center justify-center">
                <CustomIcon name="book" className="w-6 h-6" />
              </div>
              <p className="text-headline-md font-semibold text-on-surface">
                {t('academic:subjectsView.emptyState.noDataTitle')}
              </p>
              <p className="text-body-md text-[#737686]">
                {t('academic:subjectsView.emptyState.noDataDescription')}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              <AddManuallyCard onAdd={() => setIsModalOpen(true)} label={t('academic:subjectsView.addManually')} />
            </div>
          </div>
        ) : displayed.length === 0 ? (
          /* Filter produced 0 results */
          <div className="flex flex-col gap-5">
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-16 text-center flex flex-col items-center gap-3 shadow-ambient">
              <div className="w-12 h-12 bg-[#eeefff] text-primary rounded-full flex items-center justify-center">
                <CustomIcon name="book" className="w-6 h-6" />
              </div>
              <p className="text-headline-md font-semibold text-on-surface">
                {t('academic:subjectsView.emptyState.noMatchingTitle')}
              </p>
              <p className="text-body-md text-[#737686]">
                {t('academic:subjectsView.emptyState.noMatchingDescription')}
              </p>
            </div>
          </div>
        ) : (
          /* Semester Sections */
          <div className="flex flex-col gap-10">
            {/* 1. Winter Semester Section (Active) */}
            <section className="flex flex-col gap-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold text-on-surface tracking-tight">
                    {t('academic:subjectsView.semesters.winter')}
                  </h2>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {t('academic:subjectsView.semesters.activeBadge')}
                  </span>
                  <span className="text-xs font-medium text-[#737686]">
                    {t('academic:subjectsView.semesters.subjectsCount', { count: winterSubjects.length })} · {t('academic:subjectsView.semesters.creditsCount', { count: winterCredits })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWinterOpen(!isWinterOpen)}
                  className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
                  title={isWinterOpen ? t('academic:subjectsView.semesters.collapse') : t('academic:subjectsView.semesters.expand')}
                  aria-label={isWinterOpen ? t('academic:subjectsView.semesters.collapse') : t('academic:subjectsView.semesters.expand')}
                >
                  <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isWinterOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {isWinterOpen && (
                winterSubjects.length > 0 ? (
                  <div className="flex flex-col gap-6">
                    {winterSubsections.map(section => (
                      <div key={section.key} className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-label-md font-bold text-on-surface-variant uppercase tracking-wider text-xs">
                            {section.title}
                          </h3>
                          <span className="text-xs font-medium text-[#737686]">
                            ({section.items.length})
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                          {section.items.map(subject => (
                            <SubjectOverviewCard key={subject.id} subject={subject} onSelect={onSelectSubject} />
                          ))}
                        </div>
                      </div>
                    ))}
                    <div>
                      <AddManuallyCard onAdd={() => setIsModalOpen(true)} label={t('academic:subjectsView.addManually')} />
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-surface-container-lowest border border-dashed border-outline-variant rounded-2xl">
                    <p className="text-body-md text-[#737686]">
                      {filterType !== 'all'
                        ? t('academic:subjectsView.semesters.emptyFilter')
                        : t('academic:subjectsView.semesters.emptyWinter')}
                    </p>
                  </div>
                )
              )}
            </section>

            {/* 2. Summer Semester Section */}
            <section className="flex flex-col gap-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold text-on-surface tracking-tight">
                    {t('academic:subjectsView.semesters.summer')}
                  </h2>
                  <span className="text-xs font-medium text-[#737686]">
                    {t('academic:subjectsView.semesters.subjectsCount', { count: summerSubjects.length })} · {t('academic:subjectsView.semesters.creditsCount', { count: summerCredits })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSummerOpen(!isSummerOpen)}
                  className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
                  title={isSummerOpen ? t('academic:subjectsView.semesters.collapse') : t('academic:subjectsView.semesters.expand')}
                  aria-label={isSummerOpen ? t('academic:subjectsView.semesters.collapse') : t('academic:subjectsView.semesters.expand')}
                >
                  <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isSummerOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {isSummerOpen && (
                summerSubjects.length > 0 ? (
                  <div className="flex flex-col gap-6">
                    {summerSubsections.map(section => (
                      <div key={section.key} className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-label-md font-bold text-on-surface-variant uppercase tracking-wider text-xs">
                            {section.title}
                          </h3>
                          <span className="text-xs font-medium text-[#737686]">
                            ({section.items.length})
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                          {section.items.map(subject => (
                            <SubjectOverviewCard key={subject.id} subject={subject} onSelect={onSelectSubject} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-surface-container-lowest border border-dashed border-outline-variant rounded-2xl">
                    <p className="text-body-md text-[#737686]">
                      {filterType !== 'all'
                        ? t('academic:subjectsView.semesters.emptyFilter')
                        : t('academic:subjectsView.semesters.emptySummer')}
                    </p>
                  </div>
                )
              )}
            </section>
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
