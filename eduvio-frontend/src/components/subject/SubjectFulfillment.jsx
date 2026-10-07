import { useTranslation } from 'react-i18next'
import { ClipboardCheck, Scale, PenLine, Info } from 'lucide-react'
import ExpandableText from '../common/ExpandableText'
import SubjectStagResultCard from './SubjectStagResultCard'
import { normalizeText } from '../../utils/subjectDetails'

const Section = ({ icon: Icon, title, children }) => (
  <div className="flex gap-3">
    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface-container text-on-surface-variant">
      <Icon className="size-3.5" />
    </div>
    <div className="min-w-0 flex-1">
      <h3 className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">{title}</h3>
      <div className="mt-1">{children}</div>
    </div>
  </div>
)

/**
 * "What do I need to pass": requirements and assessment from STAG, then the official result.
 */
const SubjectFulfillment = ({ subject }) => {
  const { t } = useTranslation('academic')

  const requirements = normalizeText(subject.stag_requirements)
  const assessment = normalizeText(subject.stag_assessment)
  const examForm = normalizeText(subject.exam_form)
  const hasAny = requirements || assessment || examForm

  return (
    <div className="space-y-6">
      {hasAny ? (
        <div className="flex flex-col gap-5 rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
          {requirements && (
            <Section icon={ClipboardCheck} title={t('academic:subjectDetail.fulfillment.requirements')}>
              <ExpandableText text={requirements} />
            </Section>
          )}
          {assessment && (
            <Section icon={Scale} title={t('academic:subjectDetail.fulfillment.assessment')}>
              <ExpandableText text={assessment} />
            </Section>
          )}
          {examForm && (
            <Section icon={PenLine} title={t('academic:subjectDetail.fulfillment.examForm')}>
              <p className="text-sm text-on-surface-variant">{examForm}</p>
            </Section>
          )}
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 text-sm text-on-surface-variant">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>{t('academic:subjectDetail.fulfillment.empty')}</p>
        </div>
      )}

      <SubjectStagResultCard subject={subject} />
    </div>
  )
}

export default SubjectFulfillment
