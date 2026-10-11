import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FolderOpen, X } from 'lucide-react'
import Icon from '../../common/Icon'
import MaterialTypeIcon from '../../materials/MaterialTypeIcon'
import { getPreviewInfo } from '../../../utils/materialPreview'
import { getSemesterLinkTitle } from '../../../utils/semesterLinks'

// Loaded on first open, so docx-preview stays out of this chunk
const ResourcePreviewModal = lazy(() => import('../../materials/ResourcePreviewModal'))

const opensInNewTab = (resource) =>
  resource.category === 'platform' || resource.type === 'LINK' || !getPreviewInfo(resource).canPreview

/** Materials of the subject the student marked for the exam. */
const ExamMaterialsCard = ({ subject, materials, onSetForExam, onShowMaterials }) => {
  const { t } = useTranslation(['academic', 'resources'])
  const [previewResource, setPreviewResource] = useState(null)

  const titleOf = (resource) =>
    resource.category === 'platform' ? getSemesterLinkTitle(resource, subject, t) : resource.title

  const rowClass =
    'flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1.5 text-left transition-colors hover:bg-surface-container-low bg-transparent border-0 cursor-pointer'

  return (
    <section className="flex flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
        <Icon icon={FolderOpen} className="text-on-surface-variant" />
        {t('academic:subjectDetail.exam.materials.title')}
      </h3>

      {materials.length === 0 ? (
        <div className="mt-3 flex flex-col items-start gap-2">
          <p className="text-sm text-on-surface-variant">{t('academic:subjectDetail.exam.materials.empty')}</p>
          <button
            type="button"
            onClick={onShowMaterials}
            className="text-label-md font-semibold text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer"
          >
            {t('academic:subjectDetail.exam.materials.showMaterials')}
          </button>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-1">
          {materials.map((resource) => {
            const title = titleOf(resource)
            const content = (
              <>
                <MaterialTypeIcon resource={resource} tile="sm" />
                <span className="min-w-0 truncate text-sm font-medium text-foreground" title={title}>{title}</span>
              </>
            )
            return (
              <li key={resource.id} className="flex items-center gap-1">
                {opensInNewTab(resource) ? (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('academic:subjectDetail.exam.materials.open', { title })}
                    className={rowClass}
                  >
                    {content}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPreviewResource(resource)}
                    aria-label={t('academic:subjectDetail.exam.materials.open', { title })}
                    className={rowClass}
                  >
                    {content}
                  </button>
                )}
                {onSetForExam && (
                  <button
                    type="button"
                    onClick={() => onSetForExam(resource.id, false)}
                    aria-label={t('academic:subjectDetail.exam.materials.remove', { title })}
                    title={t('resources:materialActions.unmarkForExam')}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent text-on-surface-variant transition-colors hover:bg-surface-container hover:text-foreground cursor-pointer"
                  >
                    <Icon icon={X} />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {previewResource && (
        <Suspense fallback={null}>
          <ResourcePreviewModal resource={previewResource} onClose={() => setPreviewResource(null)} />
        </Suspense>
      )}
    </section>
  )
}

export default ExamMaterialsCard
