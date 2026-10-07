import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  GraduationCap,
  Award,
  UserCog,
  Layers,
  FolderOpen,
  NotebookPen,
  Download,
  ExternalLink,
  FileText,
  Info,
  X,
  ListChecks,
  Building2,
  Trash2,
  ClipboardCheck,
  Presentation,
  Users,
} from 'lucide-react'

import SubjectSummaryStrip from './subject/SubjectSummaryStrip'
import SubjectMoodleActivities from './subject/SubjectMoodleActivities'
import SubjectFulfillment from './subject/SubjectFulfillment'
import SubjectSchedule from './subject/SubjectSchedule'
import ExpandableText from './common/ExpandableText'
import { formatSemesterLabel, normalizeStatut, getStatutLabelKey } from '../utils/semester'
import { getOwnDescription, getSafeHttpsUrl, normalizeText, summarizePeople } from '../utils/subjectDetails'

// ─── Helpers ─────────────────────────────────────────────────

const renderCompletionType = (value, t) => {
  switch (value) {
    case 'Credit':
      return t('academic:subjectsView.options.credit')
    case 'Exam':
      return t('academic:subjectsView.options.exam')
    case 'Credit + Exam':
      return t('academic:subjectsView.options.creditPlusExam')
    default:
      return value || '—'
  }
}

// ─── Meta Row ────────────────────────────────────────────────

const MetaItem = ({ icon: Icon, label, value, title, note }) => (
  <div className="flex items-center gap-2 rounded-xl bg-surface-container-low/60 px-3 py-2 min-w-0">
    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant">
      <Icon className="size-3.5" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-on-surface-variant font-semibold">{label}</p>
      <p className="truncate text-xs font-semibold text-foreground" title={title || undefined}>{value}</p>
      {note && <p className="text-[11px] text-on-surface-variant">{note}</p>}
    </div>
  </div>
)

// Lecturer values that only mean "not known"
const PLACEHOLDER_LECTURERS = new Set(['nespecifikováno', 'bude upřesněno', 'tba'])

// ─── Header Section ──────────────────────────────────────────

const SubjectHeader = ({ subject, requirements, onShowInfo, hasAbout }) => {
  const { t } = useTranslation(['academic', 'dashboard'])

  const { totalGained, totalMax, hasPoints } = useMemo(() => {
    const gained = (requirements || []).reduce((s, r) => s + (r.gainedPoints ?? r.gained_points ?? 0), 0)
    const max = (requirements || []).reduce((s, r) => s + (r.maxPoints ?? r.max_points ?? 0), 0)
    return { totalGained: gained, totalMax: max, hasPoints: max > 0 }
  }, [requirements])

  const completionType = subject.completion_type || subject.completionType
  const creditBeforeExam = subject.credit_before_exam === true && completionType === 'Credit + Exam'

  const statusKey = !subject.status || subject.status === 'in_progress' ? 'inProgress' : subject.status
  const statusLabel = t(`academic:subjectDetail.status.${statusKey}`, t('academic:subjectDetail.status.inProgress'))

  const statut = normalizeStatut(subject.statut, subject.isMandatory ?? subject.is_mandatory)
  const stagUrl = getSafeHttpsUrl(subject.stag_url)

  // People from STAG; a manually entered lecturer only when STAG has none
  const people = [
    { key: 'guarantor', icon: UserCog, value: subject.guarantor },
    { key: 'lecturers', icon: Presentation, value: subject.lecturers },
    { key: 'tutors', icon: Users, value: subject.tutors },
  ]
    .map((p) => ({ ...p, summary: summarizePeople(p.value) }))
    .filter((p) => p.summary)
  if (people.length === 0 && subject.lecturer && !PLACEHOLDER_LECTURERS.has(subject.lecturer.trim().toLowerCase())) {
    people.push({ key: 'lecturer', icon: UserCog, summary: summarizePeople(subject.lecturer) })
  }

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm page-section">
      {/* TOP BAR: BADGES */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-lg bg-primary/15 px-2.5 py-1 font-mono text-xs font-bold text-primary">
            {subject.code}
          </span>
          <span className="text-xs font-medium text-on-surface-variant">
            {formatSemesterLabel(subject.semester, t)}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Points from continuous assessment */}
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

          {/* Status badge */}
          <span className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-1 text-xs font-bold text-on-surface-variant">
            {statusLabel}
          </span>
        </div>
      </div>

      {/* TITLE, STAG LINK & ABOUT BUTTON */}
      <div className="mt-4 flex items-start justify-between gap-4">
        <h1 className="min-w-0 text-2xl font-extrabold tracking-tight text-foreground text-balance break-words">
          {subject.name}
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          {stagUrl && (
            <a
              href={stagUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={t('academic:subjectDetail.openInStag')}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-outline-variant px-3 text-sm font-medium text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary"
            >
              <ExternalLink className="size-4" />
              <span className="hidden sm:inline">{t('academic:subjectDetail.openInStag')}</span>
            </a>
          )}
          {hasAbout && (
            <button
              onClick={onShowInfo}
              aria-label={t('academic:subjectDetail.showInfo')}
              title={t('academic:subjectDetail.showInfo')}
              className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-outline-variant text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary cursor-pointer"
            >
              <Info className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* META STRIP */}
      <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <MetaItem
          icon={GraduationCap}
          label={t('academic:subjectDetail.creditsLabel')}
          value={t('academic:subjectDetail.creditsEcts', { count: subject.credits })}
        />
        <MetaItem
          icon={Award}
          label={t('academic:subjectDetail.completionLabel')}
          value={renderCompletionType(completionType, t)}
          note={creditBeforeExam ? t('academic:subjectDetail.creditBeforeExam') : null}
        />
        <MetaItem
          icon={Layers}
          label={t('academic:subjectDetail.typeLabel')}
          value={t(getStatutLabelKey(statut))}
        />
        {subject.department && (
          <MetaItem
            icon={Building2}
            label={t('academic:subjectDetail.departmentLabel', 'Katedra')}
            value={subject.department}
          />
        )}
        {people.map((p) => (
          <MetaItem
            key={p.key}
            icon={p.icon}
            label={t(`academic:subjectDetail.people.${p.key}`, { count: p.summary.count })}
            value={p.summary.short}
            title={p.summary.full}
          />
        ))}
      </div>
    </div>
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
    <div className="flex flex-col gap-3 rounded-2xl border border-outline-variant bg-surface-container-low/60 p-4 sm:flex-row sm:items-center sm:justify-between page-section">
      <div className="flex items-start gap-3">
        <Info className="mt-0.5 size-4 shrink-0 text-on-surface-variant" />
        <p className="text-sm text-on-surface-variant">{t('academic:stagRemoved.description')}</p>
      </div>
      {onDelete && (
        <button
          onClick={handleDelete}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium text-on-surface-variant transition-colors hover:border-error-container/50 hover:bg-error-container/40 hover:text-error cursor-pointer"
        >
          <Trash2 className="size-3.5" />
          {t('academic:stagRemoved.delete')}
        </button>
      )}
    </div>
  )
}

// ─── TAB 2: Materials ────────────────────────────────────────

const MaterialsTab = ({ subject, resources }) => {
  const { t } = useTranslation('academic')

  const subjectMaterials = (resources || []).filter(
    (r) =>
      (r.subjectId === subject.id || r.subject_id === subject.id) &&
      !r.requirementId &&
      !r.requirement_id
  )

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-on-surface-variant">
        {t('academic:subjectDetail.materialsUploaded', { count: subjectMaterials.length })}
      </p>

      {subjectMaterials.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 text-center text-sm text-on-surface-variant italic">
          {t('academic:subjectDetail.noMaterials')}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {subjectMaterials.map((res) => {
            const isLink = res.type === 'LINK'
            const Icon = isLink ? ExternalLink : FileText

            return (
              <div
                key={res.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold leading-tight text-foreground">{res.title}</h4>
                    {res.description && (
                      <p className="mt-0.5 truncate text-[11px] text-on-surface-variant">{res.description}</p>
                    )}
                  </div>
                </div>
                <a
                  href={res.url || '#'}
                  target={isLink ? '_blank' : '_self'}
                  rel="noreferrer"
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-container"
                >
                  {isLink ? <ExternalLink className="size-3.5" /> : <Download className="size-3.5" />}
                  <span>{isLink ? t('academic:subjectDetail.preview') : t('academic:subjectDetail.download')}</span>
                </a>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── TAB 3: Notes ────────────────────────────────────────────

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
          <span className="text-xs font-semibold text-success">
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
  { key: 'fulfillment', Icon: ClipboardCheck },
  { key: 'tasks', Icon: ListChecks },
  { key: 'materials', Icon: FolderOpen },
  { key: 'notes', Icon: NotebookPen },
]

// ─── Main SubjectDetailView Component ───────────────────────

const SubjectDetailView = ({
  subject,
  requirements = [],
  note,
  resources = [],
  onBack,
  onSaveNote,
  onDeleteSubject,
}) => {
  const { t } = useTranslation(['academic', 'dashboard'])
  const [activeTab, setActiveTab] = useState('fulfillment')
  const [showInfo, setShowInfo] = useState(false)

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

  // "About the subject": STAG texts and the user's own description (never the import placeholder)
  const annotation = normalizeText(subject.stag_annotation)
  const ownDescription = getOwnDescription(subject.description)
  const aboutSections = [
    { key: 'annotation', text: annotation },
    { key: 'syllabus', text: normalizeText(subject.stag_syllabus) },
    { key: 'literature', text: normalizeText(subject.stag_literature) },
    { key: 'ownDescription', text: ownDescription !== annotation ? ownDescription : null },
  ].filter((section) => section.text)

  return (
    <div className="w-full space-y-6 pb-16">
      {/* BACK BUTTON */}
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t('academic:subjectDetail.backToSubjects')}
        </button>
      )}

      {/* 1. HEADER SECTION */}
      <SubjectHeader
        subject={subject}
        requirements={requirements}
        onShowInfo={() => setShowInfo(true)}
        hasAbout={aboutSections.length > 0}
      />

      {subject.stag_removed_at && <StagRemovedNotice subject={subject} onDelete={onDeleteSubject} />}

      {/* SCHEDULE */}
      <div className="page-section empty:hidden"><SubjectSchedule subject={subject} /></div>

      {/* 2. SUMMARY STRIP (2-3 METRIC CARDS) */}
      <div className="page-section"><SubjectSummaryStrip subject={subject} requirements={requirements} /></div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-outline-variant no-scrollbar pt-2 page-section">
        {TABS.map(({ key, Icon }) => {
          const active = activeTab === key
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`relative inline-flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors ${
                active ? 'text-foreground' : 'text-on-surface-variant hover:text-foreground'
              }`}
            >
              <Icon className="size-4" />
              {t(`academic:subjectDetail.tabs.${key}`)}
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          )
        })}
      </div>

      {/* TAB CONTENTS */}
      {activeTab === 'fulfillment' && (
        <div className="page-section">
          {/* 3. WHAT IS NEEDED TO PASS + OFFICIAL STAG RESULT */}
          <SubjectFulfillment subject={subject} />
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="page-section">
          {/* 4. MOODLE CONTINUOUS EVALUATION SECTION */}
          <SubjectMoodleActivities requirements={requirements} resources={resources} />
        </div>
      )}

      {activeTab === 'materials' && <div className="page-section"><MaterialsTab subject={subject} resources={resources} /></div>}
      {activeTab === 'notes' && <div className="page-section"><NotesTab note={note} onSaveNote={onSaveNote} /></div>}

      {/* ABOUT DIALOG */}
      {showInfo && aboutSections.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
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