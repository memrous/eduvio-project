import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Award,
  BookOpenText,
  Building2,
  ChevronDown,
  ExternalLink,
  Globe,
  GraduationCap,
  Layers,
  Presentation,
  UserCog,
  Users,
} from 'lucide-react'
import Icon from '../common/Icon'
import SubjectSchedule from './SubjectSchedule'
import { getStatutLabelKey, normalizeStatut } from '../../utils/semester'
import { getSafeHttpsUrl, splitPeople } from '../../utils/subjectDetails'
import { getSemesterLinkSourceLabel, getSemesterLinkTitle } from '../../utils/semesterLinks'

// Lecturer values that only mean "not known"
const PLACEHOLDER_LECTURERS = new Set(['nespecifikováno', 'bude upřesněno', 'tba'])

const COMPLETION_KEYS = {
  Credit: 'academic:subjectsView.options.credit',
  Exam: 'academic:subjectsView.options.exam',
  'Credit + Exam': 'academic:subjectsView.options.creditPlusExam',
}

const InfoRow = ({ icon, label, children }) => (
  <div className="flex items-start gap-3 py-3">
    <Icon icon={icon} className="mt-0.5 text-on-surface-variant" />
    <div className="min-w-0 flex-1">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground break-words">{children}</dd>
    </div>
  </div>
)

const linkClass =
  'flex items-center gap-2 rounded-lg px-2 py-1.5 -mx-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary'

/**
 * General facts about the subject (credits, completion, teachers, links,
 * schedule) for the side column of the subject detail. On small screens it
 * collapses so the exam and progress stay at the top.
 */
const SubjectInfoPanel = ({ subject, semesterLinks = [], hasAbout, onShowInfo }) => {
  const { t } = useTranslation(['academic', 'resources'])
  const [isOpen, setIsOpen] = useState(false)
  const contentId = useId()

  const completionType = subject.completion_type || subject.completionType
  const creditBeforeExam = subject.credit_before_exam === true && completionType === 'Credit + Exam'
  const statut = normalizeStatut(subject.statut, subject.isMandatory ?? subject.is_mandatory)
  const stagUrl = getSafeHttpsUrl(subject.stag_url)

  // People from STAG; a manually entered lecturer only when STAG has none
  const people = [
    { key: 'guarantor', icon: UserCog, names: splitPeople(subject.guarantor) },
    { key: 'lecturers', icon: Presentation, names: splitPeople(subject.lecturers) },
    { key: 'tutors', icon: Users, names: splitPeople(subject.tutors) },
  ].filter((p) => p.names.length > 0)
  if (people.length === 0 && subject.lecturer && !PLACEHOLDER_LECTURERS.has(subject.lecturer.trim().toLowerCase())) {
    people.push({ key: 'lecturer', icon: UserCog, names: splitPeople(subject.lecturer) })
  }

  const hasLinks = Boolean(stagUrl) || semesterLinks.length > 0 || hasAbout

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        {/* Header: a toggle on small screens, a plain heading on large ones */}
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className="flex w-full items-center justify-between gap-3 rounded-2xl bg-transparent px-5 py-4 text-left cursor-pointer @5xl/page:hidden"
        >
          <span className="text-sm font-bold text-foreground">{t('academic:subjectDetail.infoPanel.title')}</span>
          <span className="sr-only">
            {t(isOpen ? 'academic:subjectDetail.infoPanel.hide' : 'academic:subjectDetail.infoPanel.show')}
          </span>
          <Icon icon={ChevronDown} className={`text-on-surface-variant transition-transform motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        <h2 className="hidden px-5 pt-5 text-sm font-bold text-foreground @5xl/page:block">
          {t('academic:subjectDetail.infoPanel.title')}
        </h2>

        <div id={contentId} className={`${isOpen ? 'block' : 'hidden'} px-5 pb-5 @5xl/page:block`}>
          <dl className="flex flex-col divide-y divide-outline-variant/60">
            <InfoRow icon={GraduationCap} label={t('academic:subjectDetail.creditsLabel')}>
              {t('academic:subjectDetail.creditsEcts', { count: subject.credits })}
            </InfoRow>
            <InfoRow icon={Award} label={t('academic:subjectDetail.completionLabel')}>
              {COMPLETION_KEYS[completionType] ? t(COMPLETION_KEYS[completionType]) : completionType || '—'}
              {creditBeforeExam && (
                <span className="block text-xs text-on-surface-variant">{t('academic:subjectDetail.creditBeforeExam')}</span>
              )}
            </InfoRow>
            <InfoRow icon={Layers} label={t('academic:subjectDetail.typeLabel')}>
              {t(getStatutLabelKey(statut))}
            </InfoRow>
            {subject.department && (
              <InfoRow icon={Building2} label={t('academic:subjectDetail.departmentLabel')}>
                {subject.department}
              </InfoRow>
            )}
            {people.map((p) => (
              <InfoRow
                key={p.key}
                icon={p.icon}
                label={t(`academic:subjectDetail.people.${p.key}`, { count: p.names.length })}
              >
                <ul className="flex flex-col gap-0.5">
                  {p.names.map((name) => <li key={name}>{name}</li>)}
                </ul>
              </InfoRow>
            ))}
          </dl>

          {hasLinks && (
            <div className="mt-3 border-t border-outline-variant/60 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                {t('academic:subjectDetail.infoPanel.links')}
              </p>
              <ul className="mt-1.5 flex flex-col">
                {hasAbout && (
                  <li>
                    <button type="button" onClick={onShowInfo} className={`${linkClass} w-full bg-transparent border-0 cursor-pointer text-left`}>
                      <Icon icon={BookOpenText} />
                      <span className="min-w-0 truncate">{t('academic:subjectDetail.infoPanel.about')}</span>
                    </button>
                  </li>
                )}
                {stagUrl && (
                  <li>
                    <a href={stagUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                      <Icon icon={ExternalLink} />
                      <span className="min-w-0 truncate">{t('academic:subjectDetail.openInStag')}</span>
                    </a>
                  </li>
                )}
                {semesterLinks.map((link) => {
                  // The subject is already in the heading: automatic links show only the label and person
                  const label = getSemesterLinkSourceLabel(link, t) ?? getSemesterLinkTitle(link, subject, t)
                  return (
                    <li key={link.id ?? link.url}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" title={label} className={linkClass}>
                        <Icon icon={Globe} />
                        <span className="min-w-0 truncate">{label}</span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* Collapsed together with the info on small screens */}
      <div className={`${isOpen ? 'block' : 'hidden'} empty:hidden @5xl/page:block`}>
        <SubjectSchedule subject={subject} />
      </div>
    </div>
  )
}

export default SubjectInfoPanel
