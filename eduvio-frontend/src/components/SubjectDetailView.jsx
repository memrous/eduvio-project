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
} from 'lucide-react'

import SubjectSummaryStrip from './subject/SubjectSummaryStrip'
import SubjectMoodleActivities from './subject/SubjectMoodleActivities'
import SubjectStagResultCard from './subject/SubjectStagResultCard'

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

const MetaItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-2 rounded-xl bg-surface-container-low/60 px-3 py-2">
    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant">
      <Icon className="size-3.5" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-on-surface-variant font-semibold">{label}</p>
      <p className="truncate text-xs font-semibold text-foreground">{value}</p>
    </div>
  </div>
)

// ─── Header Section ──────────────────────────────────────────

const SubjectHeader = ({ subject, requirements, onShowInfo }) => {
  const { t } = useTranslation(['academic', 'dashboard'])

  const guarantor = subject.guarantor || subject.lecturer || '—'

  const { totalGained, totalMax, hasPoints, allCompleted } = useMemo(() => {
    if (!requirements || requirements.length === 0) {
      return { totalGained: 0, totalMax: 0, hasPoints: false, allCompleted: false }
    }
    const gained = requirements.reduce((s, r) => s + (r.gainedPoints ?? r.gained_points ?? 0), 0)
    const max = requirements.reduce((s, r) => s + (r.maxPoints ?? r.max_points ?? 0), 0)
    const completed = requirements.every((r) => r.isCompleted || r.completed)
    return { totalGained: gained, totalMax: max, hasPoints: max > 0, allCompleted: completed }
  }, [requirements])

  const completionType = subject.completionType || subject.completion_type
  const isCreditOnly = completionType === 'Credit' && !hasPoints

  const statusKey = subject.status || (allCompleted ? 'completed' : 'inProgress')
  const statusLabel = t(`academic:subjectDetail.status.${statusKey}`, t('academic:subjectDetail.status.inProgress'))

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
      {/* TOP BAR: BADGES */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-primary/15 px-2.5 py-1 font-mono text-xs font-bold text-primary">
            {subject.code}
          </span>
          <span className="text-xs font-medium text-on-surface-variant">
            {subject.semester === 'Winter'
              ? t('dashboard:subjectCard.semester.winter')
              : t('dashboard:subjectCard.semester.summer')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Points or binary status */}
          {hasPoints ? (
            <span className="rounded-lg bg-surface-container px-3 py-1 font-mono text-xs font-bold text-foreground">
              {totalGained} / {totalMax} PTS
            </span>
          ) : isCreditOnly ? (
            <span
              className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                allCompleted
                  ? 'bg-success-container text-on-success-container'
                  : 'bg-warning-container text-on-warning-container'
              }`}
            >
              {allCompleted
                ? t('academic:subjectDetail.status.completed')
                : t('academic:subjectDetail.status.inProgress')}
            </span>
          ) : null}

          {/* Status badge */}
          <span className="rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 py-1 text-xs font-bold text-on-surface-variant">
            {statusLabel}
          </span>
        </div>
      </div>

      {/* TITLE & INFO BUTTON */}
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground text-balance">
            {subject.name}
          </h1>
        </div>
        {subject.description && (
          <button
            onClick={onShowInfo}
            aria-label={t('academic:subjectDetail.showInfo')}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-outline-variant text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Info className="size-4" />
          </button>
        )}
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
        />
        <MetaItem
          icon={UserCog}
          label={t('academic:subjectDetail.guarantorLabel')}
          value={guarantor}
        />
        <MetaItem
          icon={Layers}
          label={t('academic:subjectDetail.typeLabel')}
          value={
            subject.isMandatory || subject.is_mandatory
              ? t('dashboard:subjectCard.mandatory')
              : t('dashboard:subjectCard.elective')
          }
        />
      </div>
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
  { key: 'requirements', Icon: ListChecks },
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
}) => {
  const { t } = useTranslation(['academic', 'dashboard'])
  const [activeTab, setActiveTab] = useState('requirements')
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
      <SubjectHeader subject={subject} requirements={requirements} onShowInfo={() => setShowInfo(true)} />

      {/* 2. SUMMARY STRIP (2-3 METRIC CARDS) */}
      <SubjectSummaryStrip subject={subject} requirements={requirements} />

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-outline-variant no-scrollbar pt-2">
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
      {activeTab === 'requirements' && (
        <div className="space-y-8">
          {/* 3. MOODLE CONTINUOUS EVALUATION SECTION */}
          <SubjectMoodleActivities requirements={requirements} resources={resources} />

          {/* 4. STAG OFFICIAL RESULT SECTION (AT VERY BOTTOM) */}
          <SubjectStagResultCard subject={subject} />
        </div>
      )}

      {activeTab === 'materials' && <MaterialsTab subject={subject} resources={resources} />}
      {activeTab === 'notes' && <NotesTab note={note} onSaveNote={onSaveNote} />}

      {/* INFO DIALOG */}
      {showInfo && subject.description && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowInfo(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-2xl"
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
            <p className="mt-4 text-sm leading-relaxed text-on-surface-variant">{subject.description}</p>
            {subject.lecturer && (
              <p className="mt-4 text-xs text-on-surface-variant">
                {t('academic:subjectDetail.infoDialog.importedFromStag', { teacher: subject.lecturer })}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SubjectDetailView