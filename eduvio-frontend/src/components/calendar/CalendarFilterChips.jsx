import { Filter } from 'lucide-react'

const CalendarFilterChips = ({
  SUBJECTS,
  currentSubjects,
  selectedSubjects,
  handleSubjectToggle,
  getSubjectStyle,
  t,
}) => {
  if (!SUBJECTS || SUBJECTS.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pb-3 md:px-6">
      <span className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
        <Filter className="size-3.5" />
        {t('academic:calendarView.filterLabel', 'Filtr:')}
      </span>
      {SUBJECTS.map((subj) => {
        const subject = currentSubjects.find(s => s.name === subj.name || s.code === subj.name)
        const style = getSubjectStyle(subject)
        const isActive = selectedSubjects.includes(subj.name)
        return (
          <button
            key={subj.id}
            onClick={() => handleSubjectToggle(subj.name)}
            aria-pressed={isActive}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              isActive
                ? 'border-outline-variant bg-surface-container-lowest text-foreground'
                : 'border-transparent bg-surface-container text-on-surface-variant opacity-60'
            }`}
          >
            <span
              className="size-2 rounded-full shrink-0"
              style={{ backgroundColor: style.dot }}
            />
            {subj.name}
          </button>
        )
      })}
    </div>
  )
}

export default CalendarFilterChips
