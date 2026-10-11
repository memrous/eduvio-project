import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  CalendarRange,
  FolderOpen,
  GraduationCap,
  NotebookPen,
  Download,
  ExternalLink,
  Info,
  X,
  ListChecks,
  Trash2,
} from 'lucide-react'

import SubjectSummaryStrip from './subject/SubjectSummaryStrip'
import SubjectMoodleActivities from './subject/SubjectMoodleActivities'
import SubjectInfoPanel from './subject/SubjectInfoPanel'
import SubjectExamTab from './subject/SubjectExamTab'
import SubjectSyllabusTab from './subject/SubjectSyllabusTab'
import ExpandableText from './common/ExpandableText'
import Icon from './common/Icon'
import { formatSemesterLabel } from '../utils/semester'
import { getOwnDescription, getSafeHttpUrl, normalizeText } from '../utils/subjectDetails'
import { getSemesterLinkSourceLabel, getSemesterLinkTitle, isAutoSemesterLink } from '../utils/semesterLinks'
import { getSubjectIdOf, isSameId } from '../utils/ids'
import { isHidden } from '../utils/materialKinds'
import { buildSemesterStarts } from '../utils/lessons'
import MaterialActionsMenu from './materials/MaterialActionsMenu'
import MaterialTypeIcon from './materials/MaterialTypeIcon'
import { useMaterialActions } from './materials/useMaterialActions'
import { useToast } from '../context/ToastContext'
import { useSyllabus } from '../hooks/useSyllabus'

// ─── Title ───────────────────────────────────────────────────

const SubjectTitle = ({ subject, requirements }) => {
  const { t } = useTranslation(['academic', 'dashboard'])

  const { totalGained, totalMax, hasPoints } = useMemo(() => {
    const gained = (requirements || []).reduce((s, r) => s + (r.gainedPoints ?? r.gained_points ?? 0), 0)
    const max = (requirements || []).reduce((s, r) => s + (r.maxPoints ?? r.max_points ?? 0), 0)
    return { totalGained: gained, totalMax: max, hasPoints: max > 0 }
  }, [requirements])

  const statusKey = !subject.status || subject.status === 'in_progress' ? 'inProgress' : subject.status
  const statusLabel = t(`academic:subjectDetail.status.${statusKey}`, t('academic:subjectDetail.status.inProgress'))

  return (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-primary/10 px-2.5 py-1 font-mono text-xs font-bold text-primary">
          {subject.code}
        </span>
        <span className="text-xs font-medium text-on-surface-variant">
          {formatSemesterLabel(subject.semester, t)}
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-2">
          {hasPoints && (
            <span className="rounded-lg bg-surface-container px-3 py-1 font-mono text-xs font-bold text-foreground">
              {totalGained} / {totalMax} PTS
            </span>
          )}
          {subject.stag_removed_at && (
            <span className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-1 text-xs font-bold text-on-surface-variant">
              {t('academic:stagRemoved.badge')}
            </span>
          )}
          <span className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-1 text-xs font-bold text-on-surface-variant">
            {statusLabel}
          </span>
        </span>
      </div>
      <h1 className="min-w-0 text-2xl font-extrabold tracking-tight text-foreground text-balance break-words">
        {subject.name}
      </h1>
    </header>
  )
}

// ─── Removed from STAG notice ────────────────────────────────

const StagRemovedNotice = ({ subject, onDelete }) => {
  const { t } = useTranslation('academic')

  const handleDelete = () => {
    if (window.confirm(t('academic:stagRemoved.deleteConfirm', { name: subject.name }))) {
      onDelete(subject.id)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface-container-low/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 size-4 shrink-0 text-on-surface-variant" />
        <p className="text-sm text-on-surface-variant">{t('academic:stagRemoved.description')}</p>
      </div>
      {onDelete && (
        <button
          onClick={handleDelete}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium text-on-surface-variant transition-colors hover:border-error-container/50 hover:bg-error-container/40 hover:text-error cursor-pointer"
        >
          <Trash2 className="size-4" />
          {t('academic:stagRemoved.delete')}
        </button>
      )}
    </div>
  )
}

// ─── TAB: Materials ──────────────────────────────────────────

const MaterialsTab = ({ subject, materials, menuFor, onSetForExam }) => {
  const { t } = useTranslation(['academic', 'resources'])

  // Same labels as the Materials page
  const badgesOf = (res) => {
    const badges = []
    if (res.moodle_cmid != null || res.moodle_section_id != null) badges.push(t('resources:moodleBadge'))
    if (res.category === 'platform') {
      badges.push(isAutoSemesterLink(res) ? t('resources:semesterLinks.departmentBadge') : t('resources:library.semesterMaterials'))
    } else {
      badges.push(t(`resources:typeShort.${res.type}`, res.type))
    }
    return badges
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-on-surface-variant">
        {t('academic:subjectDetail.materialsUploaded', { count: materials.length })}
      </p>

      {materials.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 text-center text-sm text-on-surface-variant italic">
          {t('academic:subjectDetail.noMaterials')}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {materials.map((res) => {
            const isLink = res.type === 'LINK'
            // Semester links: automatic ones have no stored title (subject is the page itself)
            const isSemesterLink = res.category === 'platform'
            const heading = isSemesterLink
              ? getSemesterLinkSourceLabel(res, t) ?? getSemesterLinkTitle(res, subject, t)
              : res.title
            const caption = isSemesterLink ? null : res.description
            const menu = menuFor?.(res)
            const forExam = Boolean(res.for_exam)

            return (
              <div
                key={res.id ?? res.url}
                className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MaterialTypeIcon resource={res} tile="lg" />
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold leading-tight text-foreground">{heading}</h4>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      {forExam && (
                        <span className="inline-flex items-center rounded-full bg-primary-container px-2 py-0.5 text-[11px] font-semibold text-on-primary-container">
                          {t('resources:materialActions.forExamBadge')}
                        </span>
                      )}
                      {badgesOf(res).map((badge) => (
                        <span key={badge} className="inline-flex items-center rounded-full bg-surface-container-low px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                          {badge}
                        </span>
                      ))}
                      {caption && (
                        <span className="min-w-0 truncate text-[11px] text-on-surface-variant">{caption}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {onSetForExam && (
                    <button
                      type="button"
                      onClick={() => onSetForExam(res.id, !forExam)}
                      aria-pressed={forExam}
                      title={t(forExam ? 'resources:materialActions.unmarkForExam' : 'resources:materialActions.markForExam')}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                        forExam
                          ? 'border-primary/30 bg-primary/10 text-primary'
                          : 'border-outline-variant bg-transparent text-foreground hover:bg-surface-container'
                      }`}
                    >
                      <Icon icon={GraduationCap} />
                      <span>{t('resources:materialActions.forExamBadge')}</span>
                    </button>
                  )}
                  <a
                    href={res.url || '#'}
                    target={isLink ? '_blank' : '_self'}
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-container"
                  >
                    {isLink ? <ExternalLink className="size-4" /> : <Download className="size-4" />}
                    <span>{isLink ? t('academic:subjectDetail.preview') : t('academic:subjectDetail.download')}</span>
                  </a>
                  {menu && <MaterialActionsMenu label={menu.label} items={menu.items} />}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── TAB: Notes ──────────────────────────────────────────────

const NotesTab = ({ note, onSaveNote }) => {
  const { t } = useTranslation('academic')
  const [content, setContent] = useState(note?.content || '')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    onSaveNote?.(content)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value)
          setSaved(false)
        }}
        placeholder={t('academic:subjectDetail.notes.placeholder')}
        rows={16}
        className="w-full rounded-2xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-sm text-foreground placeholder:text-on-surface-variant transition-colors focus:border-primary focus:outline-none resize-none"
      />
      <div className="flex items-center justify-between gap-3">
        {saved ? (
          <span className="text-xs font-semibold text-on-success-container">
            ✓ {t('academic:subjectDetail.notes.saved')}
          </span>
        ) : note?.updated_at ? (
          <span className="text-xs text-on-surface-variant">
            {t('academic:subjectDetail.notes.lastSaved', {
              time: new Date(note.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            })}
          </span>
        ) : (
          <span />
        )}
        <button
          onClick={handleSave}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
        >
          {t('academic:subjectDetail.notes.save')}
        </button>
      </div>
    </div>
  )
}

// ─── Tab config ──────────────────────────────────────────────

const TABS = [
  { key: 'exam', Icon: GraduationCap },
  { key: 'syllabus', Icon: CalendarRange },
  { key: 'tasks', Icon: ListChecks },
  { key: 'materials', Icon: FolderOpen },
  { key: 'notes', Icon: NotebookPen },
]

// ─── Main SubjectDetailView Component ───────────────────────

const NO_ACTIONS = {}

const SubjectDetailView = ({
  subject,
  requirements = [],
  note,
  resources = [],
  subjects = [],
  events = [],
  materialActions = NO_ACTIONS,
  onBack,
  onSaveNote,
  onDeleteSubject,
}) => {
  const { t } = useTranslation(['academic', 'dashboard', 'resources'])
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('exam')
  const [showInfo, setShowInfo] = useState(false)
  // Semester schedule from the teacher's course page (also feeds the exam tab)
  const syllabus = useSyllabus(subject?.id)
  const hideSyllabusItem = (item) =>
    syllabus.hideItem(item.id).catch(() => toast.error(t('academic:subjectDetail.exam.assessments.hideFailed')))

  // Same material actions as on the Materials page (edit, move, delete, hide, for the exam)
  const semesterStarts = useMemo(() => buildSemesterStarts(events, subjects), [events, subjects])
  const actions = useMaterialActions({ subjects, events, semesterStarts, actions: materialActions })
  const menuFor = (resource) => {
    if (materialActions === NO_ACTIONS) return null
    const items = actions.getMenuItems(resource)
    return items.length > 0 ? { label: actions.getMenuLabel(resource), items } : null
  }
  const setForExam = materialActions.setForExam
    ? (id, forExam) =>
        materialActions.setForExam(id, forExam).catch(() => toast.error(t('resources:materialActions.forExamFailed')))
    : null

  if (!subject) {
    return (
      <div className="py-20 text-center text-on-surface-variant font-medium">
        {t('academic:subjectDetail.noSubjectSelected')}
        {onBack && (
          <button
            onClick={onBack}
            className="mx-auto mt-4 block rounded-lg bg-primary px-4 py-2 text-primary-foreground"
          >
            {t('academic:subjectDetail.goBack')}
          </button>
        )}
      </div>
    )
  }

  // Hidden Moodle / automatic materials are only listed on the Materials page.
  // Everything of the subject, as on the Materials page: own files and links,
  // Moodle imports, materials of lessons or requirements, semester links
  const subjectMaterials = resources.filter((r) => !isHidden(r) && isSameId(getSubjectIdOf(r), subject.id))
  const examMaterials = subjectMaterials.filter((r) => r.for_exam)
  // Topic lists the teacher published on the course pages
  const webTopics = subjectMaterials.filter((r) => r.is_exam_topics)

  // "About the subject": STAG texts and the user's own description (never the import placeholder)
  const annotation = normalizeText(subject.stag_annotation)
  const ownDescription = getOwnDescription(subject.description)
  const aboutSections = [
    { key: 'annotation', text: annotation },
    { key: 'syllabus', text: normalizeText(subject.stag_syllabus) },
    { key: 'literature', text: normalizeText(subject.stag_literature) },
    { key: 'ownDescription', text: ownDescription !== annotation ? ownDescription : null },
  ].filter((section) => section.text)

  // Semester links of this subject (course pages found on department websites or added by hand)
  const semesterLinks = subjectMaterials
    .filter((r) => r.category === 'platform')
    .map((r) => ({ ...r, url: getSafeHttpUrl(r.url) }))
    .filter((r) => r.url)

  // A credit-only subject has a "Credit" tab instead of "Exam"
  const completionType = subject.completion_type || subject.completionType
  const tabLabel = (key) =>
    key === 'exam' && completionType === 'Credit'
      ? t('academic:subjectDetail.tabs.credit')
      : t(`academic:subjectDetail.tabs.${key}`)

  return (
    <div className="w-full pb-16">
      {/* BACK BUTTON */}
      {onBack && (
        <button
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t('academic:subjectDetail.backToSubjects')}
        </button>
      )}

      {/*
        Small screens: title, (collapsed) info, then the main content.
        Wide screens (xl): info and schedule in a sticky left column, title and content on the right.
      */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:gap-8 xl:grid-rows-[auto_1fr] xl:items-start">
        <div className="page-section xl:col-start-2 xl:row-start-1">
          <SubjectTitle subject={subject} requirements={requirements} />
        </div>

        <aside className="page-section xl:sticky xl:top-0 xl:col-start-1 xl:row-span-2 xl:row-start-1 xl:max-h-[calc(180vh-9rem)] xl:overflow-y-auto">
          <SubjectInfoPanel
            subject={subject}
            semesterLinks={semesterLinks}
            hasAbout={aboutSections.length > 0}
            onShowInfo={() => setShowInfo(true)}
          />
        </aside>

        <div className="flex min-w-0 flex-col gap-6 xl:col-start-2 xl:row-start-2">
          {subject.stag_removed_at && (
            <div className="page-section"><StagRemovedNotice subject={subject} onDelete={onDeleteSubject} /></div>
          )}

          {/* PROGRESS SUMMARY */}
          <div className="page-section"><SubjectSummaryStrip subject={subject} requirements={requirements} /></div>

          {/* TABS NAVIGATION */}
          <div role="tablist" className="flex items-center gap-1 overflow-x-auto border-b border-outline-variant no-scrollbar page-section">
            {TABS.map(({ key, Icon: TabIcon }) => {
              const active = activeTab === key
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(key)}
                  className={`relative inline-flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors ${
                    active ? 'text-foreground' : 'text-on-surface-variant hover:text-foreground'
                  }`}
                >
                  <TabIcon className="size-4" />
                  {tabLabel(key)}
                  {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
                </button>
              )
            })}
          </div>

          {/* TAB CONTENTS */}
          <div role="tabpanel" className="page-section">
            {activeTab === 'exam' && (
              <SubjectExamTab
                subject={subject}
                materials={examMaterials}
                webTopics={webTopics}
                syllabus={syllabus.data}
                syllabusLoading={syllabus.isLoading}
                sourceUrl={semesterLinks[0]?.url ?? null}
                onHideSyllabusItem={hideSyllabusItem}
                onSetForExam={setForExam}
                onShowMaterials={() => setActiveTab('materials')}
              />
            )}
            {activeTab === 'syllabus' && (
              <SubjectSyllabusTab
                items={syllabus.data}
                isLoading={syllabus.isLoading}
                error={syllabus.error}
                sourceUrl={semesterLinks[0]?.url ?? null}
              />
            )}
            {activeTab === 'tasks' && <SubjectMoodleActivities requirements={requirements} resources={resources} />}
            {activeTab === 'materials' && (
              <MaterialsTab subject={subject} materials={subjectMaterials} menuFor={menuFor} onSetForExam={setForExam} />
            )}
            {activeTab === 'notes' && <NotesTab note={note} onSaveNote={onSaveNote} />}
          </div>
        </div>
      </div>

      {/* MATERIAL DIALOGS */}
      {actions.modals}

      {/* ABOUT DIALOG */}
      {showInfo && aboutSections.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/60 p-4 backdrop-blur-sm"
          onClick={() => setShowInfo(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs font-bold text-primary">{subject.code}</p>
                <h2 className="text-lg font-semibold text-foreground">
                  {t('academic:subjectDetail.infoDialog.title')}
                </h2>
              </div>
              <button
                onClick={() => setShowInfo(false)}
                aria-label={t('academic:subjectDetail.infoDialog.close')}
                className="flex size-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-5 overflow-y-auto pr-1">
              {aboutSections.map(({ key, text }) => (
                <section key={key}>
                  <h3 className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
                    {t(`academic:subjectDetail.infoDialog.${key}`)}
                  </h3>
                  <div className="mt-1">
                    <ExpandableText text={text} />
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SubjectDetailView
