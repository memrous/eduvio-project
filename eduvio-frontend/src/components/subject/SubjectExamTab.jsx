import { useTranslation } from 'react-i18next'
import ContinuousAssessmentCard from './exam/ContinuousAssessmentCard'
import ExamTermsCard from './exam/ExamTermsCard'
import ExamTopicsCard from './exam/ExamTopicsCard'
import ExamMaterialsCard from './exam/ExamMaterialsCard'
import SubjectFulfillment from './SubjectFulfillment'

/**
 * Everything for the exam (or credit) in one place: written tests from the
 * teacher's page, exam terms from STAG, the topic checklist with the
 * teacher's topic lists, materials marked for the exam, then the
 * requirements and the official result.
 */
const SubjectExamTab = ({
  subject,
  materials,
  webTopics,
  syllabus,
  hiddenSyllabus,
  syllabusLoading,
  sourceUrl,
  onHideSyllabusItem,
  onUnhideSyllabusItem,
  onSetForExam,
  onShowMaterials,
}) => {
  const { t } = useTranslation('academic')

  return (
    <div className="flex flex-col gap-6">
      <ContinuousAssessmentCard
        items={syllabus}
        hiddenItems={hiddenSyllabus}
        isLoading={syllabusLoading}
        sourceUrl={sourceUrl}
        onHide={onHideSyllabusItem}
        onUnhide={onUnhideSyllabusItem}
      />

      <ExamTermsCard subject={subject} />

      <div className="grid items-start gap-6 @3xl:grid-cols-2">
        <ExamTopicsCard subjectId={subject.id} webTopics={webTopics} />
        <ExamMaterialsCard
          subject={subject}
          materials={materials}
          onSetForExam={onSetForExam}
          onShowMaterials={onShowMaterials}
        />
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-foreground">{t('academic:subjectDetail.exam.conditions')}</h3>
        <SubjectFulfillment subject={subject} />
      </section>
    </div>
  )
}

export default SubjectExamTab
