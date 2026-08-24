import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSubjects } from '../hooks/useSubjects'
import SubjectsView from '../components/SubjectsView'
import PageState from '../components/PageState'

const SubjectsPage = () => {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { data: subjects, addSubject: handleAddSubject, deleteSubject: handleDeleteSubject, isLoading, error, refetch: reloadData } = useSubjects()

  if (isLoading) {
    return <PageState variant="loading" title={t('loading')} />
  }

  if (error) {
    return (
      <PageState
        variant="error"
        title={error}
        description={t('errorDescription')}
        actionLabel={t('tryAgain')}
        onAction={reloadData}
      />
    )
  }

  const handleSelectSubject = (subject) => {
    navigate(`/subjects/${subject.id}`)
  }

  return (
    <SubjectsView
      subjects={subjects}
      onSelectSubject={handleSelectSubject}
      onAddSubject={handleAddSubject}
      onDeleteSubject={handleDeleteSubject}
    />
  )
}

export default SubjectsPage
