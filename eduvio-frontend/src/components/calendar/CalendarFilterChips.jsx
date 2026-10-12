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
    <div className="flex flex-col gap-2 px-4 pb-3 @2xl:px-6">
      <span className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
        <Filter className="size-4" />
        {t('academic:calendarView.filterLabel', 'Filtr:')}
      </span>
      {/* Chips of the same width; long names end with "…" (full name on hover) */}
      <div className="grid grid-cols-2 gap-2 @xl:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]">
        {SUBJECTS.map((subj) => {
          const subject = currentSubjects.find(s => s.name === subj.name || s.code === subj.name)
          const style = getSubjectStyle(subject)
          const isActive = selectedSubjects.includes(subj.name)
          return (
            <button
              key={subj.id}
              onClick={() => handleSubjectToggle(subj.name)}
              aria-pressed={isActive}
              title={subj.name}
              className={`flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-left text-xs font-medium transition-colors ${
                isActive
                  ? 'border-outline-variant bg-surface-container-lowest text-foreground'
                  : 'border-transparent bg-surface-container text-on-surface-variant opacity-60'
              }`}
            >
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: style.dot }}
              />
              <span className="min-w-0 truncate">{subj.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default CalendarFilterChips
