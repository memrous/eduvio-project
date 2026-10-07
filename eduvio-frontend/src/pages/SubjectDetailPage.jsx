import { SubjectDetailSkeleton } from '../components/common/Skeleton'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { useSubjectDetail } from '../hooks/useSubjectDetail'
import { useSubjects } from '../hooks/useSubjects'
import { useToast } from '../context/ToastContext'
import { useRequirements } from '../hooks/useRequirements'
import { useNote } from '../hooks/useNote'
import { useResources } from '../hooks/useResources'
import SubjectDetailView from '../components/SubjectDetailView'

const SubjectDetailPage = () => {
  const { subjectId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: subject, isLoading: subjectLoading } = useSubjectDetail(subjectId)
  const { deleteSubject } = useSubjects()
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
    return <SubjectDetailSkeleton />
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
      onDeleteSubject={(id) =>
        deleteSubject(id, {
          onSuccess: () => navigate('/subjects', { replace: true }),
          onError: (err) => toast.error(err.message),
        })
      }
      onUploadResource={handleUploadResource}
    />
  )
}

export default SubjectDetailPage
