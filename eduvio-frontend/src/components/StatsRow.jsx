import { useTranslation } from 'react-i18next'
import CustomIcon from './CustomIcon'

const StatsRow = ({ subjects, events }) => {
  const { t } = useTranslation('dashboard')
  const todayStr = new Date().toISOString().split('T')[0];

  const activeSubjectsCount = subjects.length;
  
  const pendingTasksCount = events.filter(
    e => (e.type === 'Assignment' || e.type === 'Test') && e.status !== 'Submitted' && e.status !== 'Completed'
  ).length;

  const upcomingExamsCount = events.filter(
    e => e.type === 'Exam' && e.date >= todayStr
  ).length;

  return (
    <>
      {/* Mobile Stats Row (flex overflow-x-auto) */}
      <div className="flex lg:hidden overflow-x-auto gap-3 pb-2 no-scrollbar font-inter">
        {/* Active Subjects Card */}
        <div className="bg-surface border border-outline-variant p-4 rounded-lg shadow-ambient min-w-[130px] flex-1 flex flex-col items-start justify-between">
          <div className="w-8 h-8 bg-primary-container text-primary flex items-center justify-center rounded-sm">
            <CustomIcon name="book" className="w-4 h-4" />
          </div>
          <div className="mt-4">
            <span className="text-display font-semibold text-on-surface leading-none">{activeSubjectsCount}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mt-1">{t('stats.activeSubjects')}</span>
          </div>
        </div>

        {/* Pending Tasks Card */}
        <div className="bg-surface border border-outline-variant p-4 rounded-lg shadow-ambient min-w-[130px] flex-1 flex flex-col items-start justify-between">
          <div className="w-8 h-8 bg-surface-container-low text-on-surface-variant flex items-center justify-center rounded-sm">
            <CustomIcon name="planning" className="w-4 h-4" />
          </div>
          <div className="mt-4">
            <span className="text-display font-semibold text-on-surface leading-none">{pendingTasksCount}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mt-1">{t('stats.pendingTasks')}</span>
          </div>
        </div>

        {/* Upcoming Exams Card */}
        <div className="bg-surface border border-outline-variant p-4 rounded-lg shadow-ambient min-w-[130px] flex-1 flex flex-col items-start justify-between">
          <div className="w-8 h-8 bg-warning-container text-warning flex items-center justify-center rounded-sm">
            <CustomIcon name="clock" className="w-4 h-4" />
          </div>
          <div className="mt-4">
            <span className="text-display font-semibold text-on-surface leading-none">{upcomingExamsCount}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mt-1">{t('stats.upcomingExams')}</span>
          </div>
        </div>
      </div>

      {/* Desktop Stats Row (grid-cols-3) */}
      <div className="hidden lg:grid grid-cols-3 gap-6 font-inter">
        {/* Active Subjects Card */}
        <div className="bg-surface border border-outline-variant p-5 rounded-lg shadow-ambient flex items-center gap-4">
          <div className="w-12 h-12 bg-surface-container text-primary flex items-center justify-center rounded-md shrink-0">
            <CustomIcon name="book" className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">{t('stats.activeSubjects')}</span>
            <span className="text-display text-on-surface leading-none mt-1">{activeSubjectsCount}</span>
          </div>
        </div>

        {/* Pending Tasks Card */}
        <div className="bg-surface border border-outline-variant p-5 rounded-lg shadow-ambient flex items-center gap-4">
          <div className="w-12 h-12 bg-surface-container-low text-on-surface-variant flex items-center justify-center rounded-md shrink-0">
            <CustomIcon name="planning" className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">{t('stats.pendingTasks')}</span>
            <span className="text-display text-on-surface leading-none mt-1">{pendingTasksCount}</span>
          </div>
        </div>

        {/* Upcoming Exams Card */}
        <div className="bg-surface border border-outline-variant p-5 rounded-lg shadow-ambient flex items-center gap-4">
          <div className="w-12 h-12 bg-surface-container text-warning flex items-center justify-center rounded-md shrink-0">
            <CustomIcon name="clock" className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <span className="text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">{t('stats.upcomingExams')}</span>
            <span className="text-display text-on-surface leading-none mt-1">{upcomingExamsCount}</span>
          </div>
        </div>
      </div>
    </>
  )
}

export default StatsRow
