import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react'
import Icon from '../../common/Icon'
import ProgressBar from '../../common/ProgressBar'
import { useExamTopics } from '../../../hooks/useExam'
import { useToast } from '../../../context/ToastContext'
import { parseTopicList } from '../../../utils/examTopics'

const iconButtonBase =
  'flex size-8 shrink-0 items-center justify-center rounded-lg border-0 transition-colors cursor-pointer'
const iconButton = `${iconButtonBase} bg-transparent text-on-surface-variant hover:bg-surface-container hover:text-foreground`

const TopicRow = ({ topic, onToggle, onRename, onDelete }) => {
  const { t } = useTranslation('academic')
  const [draft, setDraft] = useState(null)
  const isEditing = draft !== null
  // Delete takes two clicks: the first turns the bin red, the second deletes
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(timer)
  }, [armed])

  const save = () => {
    const title = draft.replace(/\s+/g, ' ').trim()
    setDraft(null)
    if (title && title !== topic.title) onRename(title)
  }

  return (
    <li className="group flex items-center gap-3 rounded-lg px-2 py-1.5 -mx-2 hover:bg-surface-container-low">
      <input
        type="checkbox"
        checked={topic.is_done}
        onChange={(e) => onToggle(e.target.checked)}
        aria-label={t('academic:subjectDetail.exam.topics.markDone', { title: topic.title })}
        className="size-4 shrink-0 cursor-pointer accent-primary"
      />
      {isEditing ? (
        <input
          type="text"
          value={draft}
          autoFocus
          maxLength={500}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              save()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              setDraft(null)
            }
          }}
          className="min-w-0 flex-1 rounded-md border border-primary bg-surface-container-lowest px-2 py-1 text-sm text-foreground focus:outline-none"
        />
      ) : (
        <span className={`min-w-0 flex-1 break-words text-sm ${topic.is_done ? 'text-on-surface-variant line-through' : 'text-foreground'}`}>
          {topic.title}
        </span>
      )}
      {!isEditing && (
        <span className={`flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100 ${armed ? '' : 'md:opacity-0'}`}>
          <button
            type="button"
            onClick={() => setDraft(topic.title)}
            aria-label={t('academic:subjectDetail.exam.topics.edit', { title: topic.title })}
            className={iconButton}
          >
            <Icon icon={Pencil} />
          </button>
          <button
            type="button"
            onClick={() => (armed ? onDelete() : setArmed(true))}
            onBlur={() => setArmed(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setArmed(false)
            }}
            aria-label={t(armed ? 'academic:subjectDetail.exam.topics.deleteArmed' : 'academic:subjectDetail.exam.topics.delete', { title: topic.title })}
            title={armed ? t('academic:subjectDetail.exam.topics.deleteArmed', { title: topic.title }) : undefined}
            className={armed
              ? `${iconButtonBase} bg-error-container text-error ring-1 ring-error hover:bg-error-container`
              : `${iconButton} hover:text-error`}
          >
            <Icon icon={Trash2} />
          </button>
        </span>
      )}
    </li>
  )
}

/** The student's own checklist of exam topics with progress. */
const ExamTopicsCard = ({ subjectId, webTopics = [] }) => {
  const { t } = useTranslation('academic')
  const toast = useToast()
  const { data: topics, isLoading, error, isAdding, addTopics, updateTopic, deleteTopic } = useExamTopics(subjectId)
  const [newTitle, setNewTitle] = useState('')

  const done = topics.filter((topic) => topic.is_done).length
  const percentage = topics.length > 0 ? Math.round((done / topics.length) * 100) : 0

  const report = (promise) =>
    promise.catch(() => toast.error(t('academic:subjectDetail.exam.topics.saveFailed')))

  const add = (titles) => {
    if (titles.length === 0) return
    report(addTopics(titles).then(() => setNewTitle('')))
  }

  const handleDelete = (topic) => report(deleteTopic(topic.id))

  return (
    <section className="flex flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Icon icon={ListChecks} className="text-on-surface-variant" />
          {t('academic:subjectDetail.exam.topics.title')}
        </h3>
        {topics.length > 0 && (
          <span className="text-xs font-semibold text-on-surface-variant tabular-nums">
            {t('academic:subjectDetail.exam.topics.progress', { done, total: topics.length })}
          </span>
        )}
      </div>

      {topics.length > 0 && (
        <ProgressBar
          value={percentage}
          className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-container"
          barClassName="h-full rounded-full bg-success-soft"
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={topics.length}
          aria-label={t('academic:subjectDetail.exam.topics.title')}
        />
      )}

      {/* Topic lists published by the teacher (found on the course pages) */}
      {webTopics.length > 0 && (
        <div className="mt-3 rounded-xl bg-surface-container-low p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
            {t('academic:subjectDetail.exam.topics.fromWeb')}
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {webTopics.map((topic) => (
              <li key={topic.id} className="min-w-0">
                <a
                  href={topic.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <Icon icon={FileText} />
                  <span className="truncate">{topic.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isLoading ? (
        <div className="mt-4 h-24 animate-pulse rounded-xl bg-surface-container-low" aria-hidden="true" />
      ) : error ? (
        <p className="mt-3 text-sm text-error">{t('academic:subjectDetail.exam.topics.loadError')}</p>
      ) : topics.length === 0 ? (
        <p className="mt-3 text-sm text-on-surface-variant">{t('academic:subjectDetail.exam.topics.empty')}</p>
      ) : (
        <ul className="mt-3 flex flex-col">
          {topics.map((topic) => (
            <TopicRow
              key={topic.id}
              topic={topic}
              onToggle={(isDone) => report(updateTopic(topic.id, { is_done: isDone }))}
              onRename={(title) => report(updateTopic(topic.id, { title }))}
              onDelete={() => handleDelete(topic)}
            />
          ))}
        </ul>
      )}

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          add(parseTopicList(newTitle))
        }}
      >
        <input
          type="text"
          value={newTitle}
          maxLength={500}
          onChange={(e) => setNewTitle(e.target.value)}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text')
            if (!/\r?\n/.test(text.trim())) return
            e.preventDefault()
            add(parseTopicList(text))
          }}
          placeholder={t('academic:subjectDetail.exam.topics.addPlaceholder')}
          aria-label={t('academic:subjectDetail.exam.topics.addPlaceholder')}
          disabled={isAdding}
          className="min-w-0 flex-1 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-foreground placeholder:text-on-surface-variant focus:border-primary focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={isAdding || !newTitle.trim()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          <Icon icon={Plus} />
          <span className="hidden @xl:inline">{t('academic:subjectDetail.exam.topics.add')}</span>
          <span className="sr-only @xl:hidden">{t('academic:subjectDetail.exam.topics.add')}</span>
        </button>
      </form>
      <p className="mt-2 text-xs text-on-surface-variant">{t('academic:subjectDetail.exam.topics.pasteHint')}</p>
    </section>
  )
}

export default ExamTopicsCard
