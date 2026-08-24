import { User, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import CustomIcon from './CustomIcon'

const SubjectIcon = () => <CustomIcon name="book" className="w-5 h-5" />

const SubjectCard = ({ subject, onSelect, onDelete }) => {
  const { t } = useTranslation('dashboard')

  const getSemesterLabel = (semester) => {
    if (semester === 'Winter') return t('subjectCard.semester.winter')
    if (semester === 'Summer') return t('subjectCard.semester.summer')
    return semester
  }

  const getScoreColorClass = (score) => {
    if (score >= 70) return 'bg-success-container text-success'
    if (score >= 40) return 'bg-warning-container text-warning'
    return 'bg-error-container text-error'
  }

  const gained = subject.gainedPoints !== undefined ? subject.gainedPoints : subject.gained_points
  const max = subject.maxPoints !== undefined ? subject.maxPoints : subject.max_points
  const hasPoints = (gained !== undefined && gained !== null) && (max !== undefined && max !== null)
  
  return (
    <div className="bg-surface-container border border-outline-variant rounded-lg shadow-ambient hover:shadow-md transition-shadow flex flex-col p-5 gap-4 font-inter">
      {/* Header: Icon + Mandatory/Elective Badge + Score */}
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 bg-surface-container-highest text-primary flex items-center justify-center rounded-md shrink-0">
          <SubjectIcon code={subject.code} />
        </div>
        <div className="flex items-center gap-2">
          {subject.score !== undefined && subject.score !== null && (
            <span className={`text-label-sm font-bold px-2 py-0.5 rounded-sm ${getScoreColorClass(subject.score)}`}>
              {subject.score}%
            </span>
          )}
          <span className={`text-label-sm font-bold px-2.5 py-0.5 rounded-sm ${
            subject.isMandatory 
              ? 'bg-surface-container-highest text-primary' 
              : 'bg-surface-container-low text-emerald-700'
          }`}>
            {subject.isMandatory ? t('subjectCard.mandatory') : t('subjectCard.elective')}
          </span>
        </div>
      </div>

      {/* Meta Row: Code + Credits */}
      <div className="flex items-center gap-2">
        <span className="text-label-sm font-extrabold text-primary uppercase tracking-wide">
          {subject.code}
        </span>
        <span className="w-1 h-1 rounded-full bg-outline shrink-0" />
        <span className="text-label-sm text-on-surface-variant font-semibold">
          {t('subjectCard.credits', { count: subject.credits })}
        </span>
      </div>

      {/* Title & Description */}
      <div className="flex flex-col gap-1.5">
        <h3 className="text-headline-md font-bold text-on-surface leading-snug">
          {subject.name}
        </h3>
        {hasPoints && (
          <div className="text-body-md text-on-surface-variant font-medium">
            {gained} / {max} {t('subjectCard.points', 'bodů')}
          </div>
        )}
        <p className="text-body-md text-on-surface-variant line-clamp-2 leading-relaxed">
          {subject.description}
        </p>
      </div>

      {/* Course Info details */}
      <div className="grid grid-cols-2 gap-2 text-body-md text-on-surface-variant mt-1">
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 shrink-0 text-on-surface-variant" />
          <span className="truncate text-[13px] font-medium" title={subject.lecturer}>
            {subject.lecturer}
          </span>
        </div>
        <div className="flex items-center gap-1.5 justify-end">
          <span className="text-[13px] font-semibold bg-surface-container-low text-on-surface-variant px-2 py-0.5 rounded-sm">
            {subject.completionType}
          </span>
        </div>
      </div>

      {/* Semester Details & Open Button */}
      <div className="flex items-center justify-between mt-2 pt-3 border-t border-outline-variant">
        <span className="text-label-sm text-on-surface-variant font-semibold">
          {getSemesterLabel(subject.semester)}
        </span>
        
        <div className="flex items-center gap-2">
          {onDelete && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(t('subjectCard.deleteConfirm', { name: subject.name }))) {
                  onDelete(subject.id);
                }
              }}
              className="text-on-surface-variant hover:text-error hover:bg-error-container/40 p-2 rounded-md transition-all cursor-pointer border border-transparent hover:border-error-container/50"
              title={t('subjectCard.deleteSubject')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={() => onSelect?.(subject)}
            className="bg-primary hover:bg-primary-container active:scale-[0.98] text-on-primary font-semibold px-4 py-2 rounded-md text-label-md transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
          >
            {t('subjectCard.openSubject')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SubjectCard
