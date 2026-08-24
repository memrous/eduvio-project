import { useSubjects } from '../hooks/useSubjects'
import { useTranslation } from 'react-i18next'
import { useResources } from '../hooks/useResources'
import { useEvents } from '../hooks/useEvents'
import ResourcesView from '../components/ResourcesView'
import PageState from '../components/PageState'

const MaterialsPage = () => {
  const { t } = useTranslation('common')
  const { data: subjects, isLoading: subjectsLoading } = useSubjects()
  const { data: resources, uploadResource: handleUploadResource, isLoading: resourcesLoading } = useResources()
  const { data: events, isLoading: eventsLoading } = useEvents()

  const isLoading = subjectsLoading || resourcesLoading || eventsLoading

  if (isLoading) {
    return <PageState variant="loading" title={t('loading')} />
  }

  return (
    <ResourcesView
      resources={resources}
      subjects={subjects}
      events={events}
      onUploadResource={handleUploadResource}
    />
  )
}

export default MaterialsPage
