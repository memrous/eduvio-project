import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSubjectDetail } from '../hooks/useSubjectDetail'
import { useRequirements } from '../hooks/useRequirements'
import { useNote } from '../hooks/useNote'
import { useResources } from '../hooks/useResources'
import SubjectDetailView from '../components/SubjectDetailView'
import PageState from '../components/PageState'

const SubjectDetailPage = () => {
  const { t } = useTranslation('common')
  const { subjectId } = useParams()
  const navigate = useNavigate()

  const { data: subject, isLoading: subjectLoading } = useSubjectDetail(subjectId)
  const {
    data: requirements,
    isLoading: requirementsLoading,
    createRequirement,
    updateRequirement,
    deleteRequirement,
  } = useRequirements(subjectId)
  const { data: note, saveNote } = useNote(subjectId)
  const { data: resources, uploadResource: handleUploadResource, isLoading: resourcesLoading } = useResources()

  const isLoading = subjectLoading || requirementsLoading || resourcesLoading

  if (isLoading) {
    return <PageState variant="loading" title={t('loading')} />
  }

  // If the subject ID is invalid, redirect back to subjects list
  if (!subject) {
    return <Navigate to="/subjects" replace />
  }

  return (
    <SubjectDetailView
      subject={subject}
      requirements={requirements}
      note={note}
      resources={resources}
      onBack={() => navigate('/subjects')}
      onCreateRequirement={createRequirement}
      onUpdateRequirement={updateRequirement}
      onDeleteRequirement={deleteRequirement}
      onSaveNote={saveNote}
      onUploadResource={handleUploadResource}
    />
  )
}

export default SubjectDetailPage
