/**
 * Display texts of semester links (resources with category "platform").
 *
 * Automatic links (found on department websites) have no stored title: they
 * are shown as the subject name with a translated "teacher's website" label.
 * Manual links keep the title the user entered.
 */

const SOURCE_ROLES = ['guarantor', 'lecturer', 'tutor']

export const isAutoSemesterLink = (resource) => resource?.link_source === 'auto'

/**
 * Main text: the subject name for automatic links (and manual ones without
 * a title), otherwise the stored title.
 */
export const getSemesterLinkTitle = (resource, subject, t) => {
  const ownTitle = isAutoSemesterLink(resource) ? '' : String(resource?.title ?? '').trim()
  return ownTitle || subject?.name || t('resources:library.externalLink')
}

/**
 * "Web vyučujícího · Jan Outrata (garant)" for automatic links, null otherwise.
 */
export const getSemesterLinkSourceLabel = (resource, t) => {
  if (!isAutoSemesterLink(resource)) return null

  const role = SOURCE_ROLES.includes(resource.source_role)
    ? t(`resources:semesterLinks.roles.${resource.source_role}`)
    : null
  const person = resource.source_person
    ? (role ? t('resources:semesterLinks.personWithRole', { person: resource.source_person, role }) : resource.source_person)
    : role

  return person
    ? t('resources:semesterLinks.teacherWebsiteWithPerson', { person })
    : t('resources:semesterLinks.teacherWebsite')
}
