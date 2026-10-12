import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2, Search, X } from 'lucide-react'
import Icon from '../common/Icon'
import { useSubjects } from '../../hooks/useSubjects'
import { useResources } from '../../hooks/useResources'
import { MIN_QUERY_LENGTH, normalizeText, searchMaterials, searchSubjects } from '../../utils/search'
import { isAutoSemesterLink } from '../../utils/semesterLinks'
import { formatSemesterLabel } from '../../utils/semester'
import MaterialTypeIcon from '../materials/MaterialTypeIcon'
import MaterialSourceBadge from '../materials/MaterialSourceBadge'
import { SEARCH_SHORTCUT_LABEL, useSearchShortcut } from './searchShortcut'

const MAX_PER_GROUP = 5
const DEBOUNCE_MS = 150

const isWebUrl = (url) => /^https?:\/\//i.test(url ?? '')

/** Links open in a new tab; files open in the preview on the Materials page. */
const opensInNewTab = (resource) =>
  (resource.category === 'platform' || resource.type === 'LINK') && isWebUrl(resource.url)

/** The matched part in bold (not by color). */
const Highlight = ({ text, match }) => {
  const value = String(text ?? '')
  if (!match) return value
  return (
    <>
      {value.slice(0, match.start)}
      <strong className="font-bold text-on-surface">{value.slice(match.start, match.end)}</strong>
      {value.slice(match.end)}
    </>
  )
}

/**
 * Search in the user's subjects and materials (combobox with a result list).
 *
 * variant "header": field in the desktop header with a dropdown and the
 * Ctrl+K / "/" shortcut. variant "mobile": full-width field in the mobile
 * search overlay with the list below it; `onDone` closes the overlay.
 */
const GlobalSearch = ({ variant = 'header', autoFocus = false, onDone }) => {
  const { t } = useTranslation(['common', 'academic', 'resources'])
  const navigate = useNavigate()
  const isMobile = variant === 'mobile'
  const listId = useId()
  const inputRef = useRef(null)
  const rootRef = useRef(null)

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  // Subjects and materials are fetched on the first focus (unless already cached)
  const [isActivated, setIsActivated] = useState(false)

  const { data: subjects, isLoading: subjectsLoading } = useSubjects({ enabled: isActivated })
  const { data: resources, isLoading: resourcesLoading } = useResources({ enabled: isActivated })
  const isLoading = isActivated && (subjectsLoading || resourcesLoading)

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  // The mobile overlay is opened by its own button (see MobileSearch)
  useSearchShortcut(inputRef, () => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, !isMobile)

  const subjectResults = useMemo(() => searchSubjects(subjects, debouncedQuery), [subjects, debouncedQuery])
  const materialResults = useMemo(
    () => searchMaterials(resources, subjects, debouncedQuery, t),
    [resources, subjects, debouncedQuery, t]
  )

  const hasQuery = normalizeText(debouncedQuery).length >= MIN_QUERY_LENGTH
  const showPanel = isOpen && hasQuery

  // Flat list of options in display order (for ↑/↓ and aria-activedescendant)
  const options = useMemo(() => {
    const list = [
      ...subjectResults.slice(0, MAX_PER_GROUP).map((result) => ({ kind: 'subject', key: `s-${result.subject.id}`, result })),
      ...materialResults.slice(0, MAX_PER_GROUP).map((result) => ({ kind: 'material', key: `m-${result.resource.id}`, result })),
    ]
    if (materialResults.length > 0) list.push({ kind: 'showAll', key: 'show-all' })
    return list.map((option, index) => ({ ...option, index, id: `${listId}-${option.key}` }))
  }, [subjectResults, materialResults, listId])

  const active = showPanel && activeIndex >= 0 && activeIndex < options.length ? activeIndex : -1
  const optionsOf = (kind) => options.filter((o) => o.kind === kind)
  const activeId = active >= 0 ? options[active].id : undefined

  // Keep the option chosen with ↑/↓ visible in the scrolling list
  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' })
  }, [activeId])

  const reset = () => {
    setQuery('')
    setDebouncedQuery('')
    setIsOpen(false)
    setActiveIndex(-1)
  }

  const select = (option) => {
    if (option.kind === 'subject') {
      navigate(`/subjects/${option.result.subject.id}`)
    } else if (option.kind === 'material') {
      const { resource } = option.result
      if (opensInNewTab(resource)) window.open(resource.url, '_blank', 'noopener,noreferrer')
      else navigate(`/materials?preview=${encodeURIComponent(resource.id)}`)
    } else {
      navigate(`/materials?q=${encodeURIComponent(query.trim())}`)
    }
    reset()
    if (isMobile) onDone?.()
    else inputRef.current?.blur()
  }

  const handleKeyDown = (event) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault()
        setIsOpen(true)
        if (options.length === 0) return
        const step = event.key === 'ArrowDown' ? 1 : -1
        const from = active === -1 ? (step === 1 ? -1 : 0) : active
        setActiveIndex((from + step + options.length) % options.length)
        return
      }
      case 'Enter':
        if (showPanel && options.length > 0) {
          event.preventDefault()
          select(options[active === -1 ? 0 : active])
        }
        return
      case 'Escape':
        event.preventDefault()
        if (showPanel) setIsOpen(false)
        else if (query) reset()
        else if (isMobile) onDone?.()
        else inputRef.current?.blur()
        return
      default:
    }
  }

  const renderSubject = (option) => {
    const { subject, codeMatch, nameMatch } = option.result
    const semester = formatSemesterLabel(subject.semester, t)
    return (
      <>
        <span className="flex min-w-0 items-baseline gap-2">
          {subject.code && (
            <span className="shrink-0 font-mono text-xs text-on-surface-variant">
              <Highlight text={subject.code} match={codeMatch} />
            </span>
          )}
          <span className="truncate text-sm text-on-surface">
            <Highlight text={subject.name} match={nameMatch} />
          </span>
        </span>
        {semester && <span className="block truncate text-xs text-on-surface-variant">{semester}</span>}
      </>
    )
  }

  const renderMaterial = (option) => {
    const { resource, subject, title, isSemesterLink, titleMatch, subjectMatch } = option.result
    const autoLink = isSemesterLink && isAutoSemesterLink(resource)
    return (
      <span className="flex min-w-0 items-center gap-3">
        <MaterialTypeIcon resource={resource} tile="sm" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm text-on-surface">
            <Highlight text={title} match={titleMatch} />
          </span>
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-on-surface-variant">
            <MaterialSourceBadge resource={resource} />
            <span className="min-w-0 truncate">
              {autoLink
                ? t('resources:semesterLinks.teacherWebsite')
                : subject
                  ? <Highlight text={subject.name} match={subjectMatch} />
                  : t('resources:otherSubject')}
            </span>
          </span>
        </span>
      </span>
    )
  }

  const renderOption = (option, content) => (
    <li
      key={option.key}
      id={option.id}
      role="option"
      aria-selected={option.index === active}
      // Keep the focus in the field; the click selects
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => select(option)}
      onMouseMove={() => option.index !== active && setActiveIndex(option.index)}
      className={`cursor-pointer rounded-lg px-2.5 py-2 ${option.index === active ? 'bg-surface-container' : ''}`}
    >
      {content}
    </li>
  )

  const renderGroup = (kind, label) => {
    const groupOptions = optionsOf(kind)
    if (groupOptions.length === 0) return null
    const headingId = `${listId}-${kind}-heading`
    return (
      <li role="presentation">
        <div id={headingId} className="px-2.5 pb-1 pt-2 text-label-sm uppercase text-on-surface-variant">
          {label}
        </div>
        <ul role="group" aria-labelledby={headingId} className="flex flex-col">
          {groupOptions.map((option) => renderOption(option, kind === 'subject' ? renderSubject(option) : renderMaterial(option)))}
        </ul>
      </li>
    )
  }

  const showAllOption = optionsOf('showAll')[0]
  const resultCount = subjectResults.length + materialResults.length

  return (
    <div
      ref={rootRef}
      className={isMobile ? 'flex w-full min-w-0 flex-col' : 'relative w-full'}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget)) setIsOpen(false)
      }}
    >
      <div className="relative">
        <Icon icon={Search} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label={t('common:search.label')}
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={showPanel && options.length > 0 ? listId : undefined}
          aria-activedescendant={activeId}
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          value={query}
          placeholder={t('common:search.placeholder')}
          onChange={(event) => {
            setQuery(event.target.value)
            setIsOpen(true)
            setActiveIndex(-1)
          }}
          onFocus={() => {
            setIsActivated(true)
            setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          className="w-full rounded-md border border-outline-variant bg-surface-container-lowest py-2 pl-9 pr-16 text-body-md text-on-surface placeholder:text-on-surface-variant transition-colors focus:border-primary focus:outline-none"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              reset()
              inputRef.current?.focus()
            }}
            aria-label={t('common:search.clear')}
            className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded border-0 bg-transparent text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <Icon icon={X} />
          </button>
        ) : (
          !isMobile && (
            <kbd
              title={t('common:search.shortcutHint', { keys: SEARCH_SHORTCUT_LABEL })}
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-outline-variant bg-surface-container-low px-1.5 py-0.5 font-inter text-[11px] font-medium text-on-surface-variant"
            >
              {SEARCH_SHORTCUT_LABEL}
            </kbd>
          )
        )}
      </div>

      {/* Result count for screen readers */}
      <div role="status" aria-live="polite" className="sr-only">
        {showPanel && !isLoading ? t('common:search.resultsCount', { count: resultCount }) : ''}
      </div>

      {showPanel && (
        <div
          className={
            isMobile
              ? 'mt-2 max-h-[calc(100dvh-6rem)] overflow-y-auto'
              : 'absolute left-0 top-full z-50 mt-2 max-h-[min(70vh,34rem)] w-[min(26.25rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-1.5 shadow-lg'
          }
        >
          {isLoading && resultCount === 0 ? (
            <p className="flex items-center gap-2 px-2.5 py-3 text-sm text-on-surface-variant">
              <Icon icon={Loader2} className="animate-spin" />
              {t('common:search.loading')}
            </p>
          ) : options.length === 0 ? (
            <p className="px-2.5 py-3 text-sm text-on-surface-variant">
              {t('common:search.noResults', { query: query.trim() })}
            </p>
          ) : (
            <ul id={listId} role="listbox" aria-label={t('common:search.label')} className="flex flex-col">
              {renderGroup('subject', t('common:search.subjects'))}
              {renderGroup('material', t('common:search.materials'))}
              {showAllOption && (
                <li role="presentation" className="mt-1 border-t border-outline-variant pt-1">
                  <ul role="group" aria-label={t('common:search.showAll')}>
                    {renderOption(
                      showAllOption,
                      <span className="text-label-md font-semibold text-primary">{t('common:search.showAll')}</span>
                    )}
                  </ul>
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export default GlobalSearch
