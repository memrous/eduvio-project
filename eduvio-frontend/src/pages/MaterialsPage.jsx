import { MaterialsSkeleton } from '../components/common/Skeleton'
import { useSubjects } from '../hooks/useSubjects'
import { useResources } from '../hooks/useResources'
import { useEvents } from '../hooks/useEvents'
import { useDepartmentLinks } from '../hooks/useDepartmentLinks'
import ResourcesView from '../components/ResourcesView'

const MaterialsPage = () => {
  const { data: subjects, isLoading: subjectsLoading } = useSubjects()
  const {
    data: resources,
    uploadResource: handleUploadResource,
    updateResource: handleUpdateResource,
    deleteResource: handleDeleteResource,
    markResourceSeen: handleMarkSeen,
    assignResourceEvent: handleAssignEvent,
    updateMaterial: handleUpdateMaterial,
    setResourceHidden: handleSetHidden,
    setResourceForExam: handleSetForExam,
    isLoading: resourcesLoading,
  } = useResources()
  const { data: events, isLoading: eventsLoading } = useEvents()
  const departmentLinks = useDepartmentLinks()

  const isLoading = subjectsLoading || resourcesLoading || eventsLoading

  if (isLoading) {
    return <MaterialsSkeleton />
  }

  return (
    <ResourcesView
      resources={resources}
      subjects={subjects}
      events={events}
      onUploadResource={handleUploadResource}
      onUpdateResource={handleUpdateResource}
      onDeleteResource={handleDeleteResource}
      onMarkSeen={handleMarkSeen}
      onAssignEvent={handleAssignEvent}
      onUpdateMaterial={handleUpdateMaterial}
      onSetHidden={handleSetHidden}
      onSetForExam={handleSetForExam}
      departmentLinks={departmentLinks}
    />
  )
}

export default MaterialsPage
