import { SubjectDetailSkeleton } from '../components/common/Skeleton'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { useSubjectDetail } from '../hooks/useSubjectDetail'
import { useSubjects } from '../hooks/useSubjects'
import { useToast } from '../context/ToastContext'
import { useRequirements } from '../hooks/useRequirements'
import { useNote } from '../hooks/useNote'
import { useResources } from '../hooks/useResources'
import { useEvents } from '../hooks/useEvents'
import SubjectDetailView from '../components/SubjectDetailView'

const SubjectDetailPage = () => {
  const { subjectId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: subject, isLoading: subjectLoading } = useSubjectDetail(subjectId)
  const { data: subjects, deleteSubject } = useSubjects()
  const {
    data: requirements,
    isLoading: requirementsLoading,
    createRequirement,
    updateRequirement,
    deleteRequirement,
  } = useRequirements(subjectId)
  const { data: note, saveNote } = useNote(subjectId)
  const {
    data: resources,
    uploadResource: handleUploadResource,
    updateResource,
    deleteResource,
    assignResourceEvent,
    updateMaterial,
    setResourceHidden,
    isLoading: resourcesLoading,
  } = useResources()
  // Lessons for "Move to a week / lesson"
  const { data: events } = useEvents()

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
      subjects={subjects}
      events={events}
      materialActions={{
        updateMaterial,
        assignEvent: assignResourceEvent,
        updateSemesterLink: updateResource,
        deleteResource,
        setHidden: setResourceHidden,
      }}
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
