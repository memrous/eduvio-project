import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarClock, Eye, EyeOff, Pencil, Trash2 } from 'lucide-react'
import { useToast } from '../../context/ToastContext'
import { getSubjectIdOf, isPersistedId, isSameId } from '../../utils/ids'
import { getMaterialKind, isHidden, isOwnFile, isSemesterLink } from '../../utils/materialKinds'
import { getSemesterLinkTitle } from '../../utils/semesterLinks'
import EditMaterialModal from './EditMaterialModal'
import MoveMaterialModal from './MoveMaterialModal'
import SemesterLinkModal from './SemesterLinkModal'

/**
 * Actions of one material, the same on the Materials page and in the subject detail:
 * - own file / link: Edit, Move to a week / lesson, Delete
 * - Moodle: Move to a week / lesson, Hide (or Show again)
 * - department website link: Edit (becomes the user's own link), Hide (or Show again)
 * Semester links are not assigned to lessons.
 *
 * @param {{
 *   subjects: object[], events: object[], semesterStarts: Map<string, Date>,
 *   actions: {
 *     updateMaterial: (id, fields) => Promise, assignEvent: (id, eventId) => Promise,
 *     updateSemesterLink: (id, values) => Promise, deleteResource: (id) => Promise,
 *     setHidden: (id, hidden) => Promise,
 *   },
 * }} options
 * @returns {{ getMenuItems: (resource) => object[], getMenuLabel: (resource) => string, modals: JSX.Element|null }}
 */
export const useMaterialActions = ({ subjects, events, semesterStarts, actions }) => {
  const { t } = useTranslation('resources')
  const toast = useToast()
  // { kind: 'edit' | 'move' | 'editLink', resource }
  const [dialog, setDialog] = useState(null)

  const subjectOf = (resource) => subjects.find((s) => isSameId(s.id, getSubjectIdOf(resource)))
  const titleOf = (resource) =>
    isSemesterLink(resource) ? getSemesterLinkTitle(resource, subjectOf(resource), t) : resource.title || t('resources:defaults.attachment')

  const run = (promise, errorKey) =>
    Promise.resolve(promise).catch((err) => {
      console.error(err)
      toast.error(t(errorKey))
    })

  const confirmDelete = (resource) => {
    const title = titleOf(resource)
    const message = isOwnFile(resource)
      ? t('resources:materialActions.deleteFileConfirm', { title })
      : t('resources:materialActions.deleteLinkConfirm', { title })
    if (window.confirm(message)) {
      run(actions.deleteResource(resource.id), 'resources:materialActions.deleteFailed')
    }
  }

  const getMenuItems = (resource) => {
    if (!isPersistedId(resource?.id)) return []

    const kind = getMaterialKind(resource)
    const semesterLink = isSemesterLink(resource)
    const canMove = !semesterLink && Boolean(subjectOf(resource))
    const items = []

    if (kind === 'manual' || (kind === 'auto' && semesterLink)) {
      items.push({
        key: 'edit',
        label: t('resources:materialActions.edit'),
        icon: Pencil,
        onSelect: () => setDialog({ kind: semesterLink ? 'editLink' : 'edit', resource }),
      })
    }
    if (canMove) {
      items.push({
        key: 'move',
        label: t('resources:lessons.moveShort'),
        icon: CalendarClock,
        onSelect: () => setDialog({ kind: 'move', resource }),
      })
    }
    if (kind === 'manual') {
      items.push({ key: 'delete', label: t('resources:materialActions.delete'), icon: Trash2, danger: true, onSelect: () => confirmDelete(resource) })
    } else if (isHidden(resource)) {
      items.push({ key: 'unhide', label: t('resources:materialActions.unhide'), icon: Eye, onSelect: () => run(actions.setHidden(resource.id, false), 'resources:materialActions.hideFailed') })
    } else {
      items.push({ key: 'hide', label: t('resources:materialActions.hide'), icon: EyeOff, onSelect: () => run(actions.setHidden(resource.id, true), 'resources:materialActions.hideFailed') })
    }

    return items
  }

  const getMenuLabel = (resource) => t('resources:materialActions.menu', { title: titleOf(resource) })

  const close = () => setDialog(null)
  let modals = null
  if (dialog?.kind === 'edit') {
    modals = (
      <EditMaterialModal
        resource={dialog.resource}
        subjects={subjects}
        events={events}
        semesterStarts={semesterStarts}
        onClose={close}
        onSave={(fields) => actions.updateMaterial(dialog.resource.id, fields)}
      />
    )
  } else if (dialog?.kind === 'move' && subjectOf(dialog.resource)) {
    modals = (
      <MoveMaterialModal
        resource={dialog.resource}
        subject={subjectOf(dialog.resource)}
        events={events}
        semesterStarts={semesterStarts}
        onClose={close}
        onSave={(eventId) => actions.assignEvent(dialog.resource.id, eventId)}
      />
    )
  } else if (dialog?.kind === 'editLink') {
    modals = (
      <SemesterLinkModal
        link={dialog.resource}
        subjects={subjects}
        onClose={close}
        onSave={(values) => actions.updateSemesterLink(dialog.resource.id, values)}
      />
    )
  }

  return { getMenuItems, getMenuLabel, modals }
}
