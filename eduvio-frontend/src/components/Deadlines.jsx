import { AlertCircle, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import CustomIcon from './CustomIcon'
import { getLocaleFromLanguage } from '../utils/locale'

const getTypeStyles = (type) => {
  switch (type) {
    case 'Assignment': return { dot: 'bg-warning', badgeBg: 'bg-warning-container', badgeText: 'text-warning' };
    case 'Test': return { dot: 'bg-error', badgeBg: 'bg-error-container', badgeText: 'text-error' };
    case 'Exam': return { dot: 'bg-error', badgeBg: 'bg-error-container', badgeText: 'text-error' };
    default: return { dot: 'bg-surface-container-highest', badgeBg: 'bg-surface-container-low', badgeText: 'text-on-surface-variant' };
  }
};

const getMobileUrgencyStyles = (type) => {
  switch (type) {
    case 'Exam': return 'bg-error-container text-error border-error/20';
    case 'Test': return 'bg-error-container text-error border-error/20';
    default: return 'bg-warning-container text-warning border-warning/20';
  }
};

const Deadlines = ({ events, subjects, onDeadlineClick }) => {
  const { t, i18n } = useTranslation('dashboard')
  const todayStr = new Date().toISOString().split('T')[0];
  const locale = getLocaleFromLanguage(i18n.language)

  const formatDueDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString(locale, { day: 'numeric', month: 'long' })

  const getDeadlineLabel = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return t('deadlines.dueToday')
    if (diffDays === 1) return t('deadlines.dueTomorrow')
    if (diffDays > 1) return t('deadlines.dueOnDate', { date: formatDueDate(dateStr) })
    if (diffDays < 0) return t('deadlines.overdueByDays', { count: Math.abs(diffDays) })
    return t('deadlines.dueOnDate', { date: formatDueDate(dateStr) })
  };

  const getRelativeDaysLabel = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return t('deadlines.dueToday')
    if (diffDays === 1) return t('deadlines.dueTomorrow')
    if (diffDays > 1) return t('deadlines.dueOnDate', { date: formatDueDate(dateStr) })
    if (diffDays < 0) return t('deadlines.overdueByDays', { count: Math.abs(diffDays) })
    return t('deadlines.dueOnDate', { date: formatDueDate(dateStr) })
  };

  const renderTypeLabel = (type) => t(`deadlines.eventTypes.${type}`, type)

  // Desktop deadlines (up to 4)
  const upcomingDeadlines = (events || [])
    .filter(e => e.type !== 'Lecture' && e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  // Mobile deadlines (up to 3)
  const urgentList = (events || [])
    .filter(e => e.type !== 'Lecture' && e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  return (
    <>
      {/* MOBILE LAYOUT: Urgent Deadlines */}
      <section className="flex lg:hidden flex-col gap-3 font-inter text-on-surface">
        <h3 className="text-headline-md font-semibold">{t('deadlines.urgent')}</h3>
        
        <div className="flex flex-col gap-3">
          {urgentList.length === 0 ? (
              <div className="bg-surface border border-outline-variant p-4 rounded-lg text-center text-body-md text-on-surface-variant italic">
              {t('deadlines.noUrgent')}
            </div>
          ) : (
            urgentList.map(dl => {
              const subject = (subjects || []).find(s => s.id === dl.subjectId);
              const subCode = subject ? subject.code : '';
              const isCritical = dl.date === todayStr || dl.type === 'Exam' || dl.type === 'Test';
              const urgencyClass = getMobileUrgencyStyles(dl.type);

              return (
                <div 
                  key={dl.id} 
                  onClick={() => onDeadlineClick?.(dl.id)}
                  className="bg-surface border border-outline-variant p-4 rounded-lg shadow-ambient flex items-center justify-between cursor-pointer hover:bg-surface-container transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-sm shrink-0 flex items-center justify-center ${
                      isCritical ? 'bg-error-container text-error' : 'bg-primary-container text-primary'
                    }`}>
                      {isCritical ? <AlertCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-label-md font-semibold leading-snug">
                        {dl.title} {subCode && `(${subCode})`}
                      </h4>
                      <span className="text-label-sm text-on-surface-variant block mt-0.5">
                        {getRelativeDaysLabel(dl.date)}
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-sm shrink-0 border ${urgencyClass}`}>
                    {renderTypeLabel(dl.type)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* DESKTOP LAYOUT: Upcoming Deadlines */}
      <div className="hidden lg:flex bg-surface border border-outline-variant p-5 rounded-lg shadow-ambient flex-col gap-4 font-inter text-on-surface">
        <div className="flex items-center gap-2">
          <CustomIcon name="bell" className="w-5 h-5" />
          <h2 className="text-headline-md font-semibold">{t('deadlines.upcoming')}</h2>
        </div>

        <div className="flex flex-col gap-4">
          {upcomingDeadlines.length === 0 ? (
            <p className="text-body-md text-on-surface-variant italic text-center py-2">{t('deadlines.noUpcoming')}</p>
          ) : (
            upcomingDeadlines.map((dl, idx) => {
              const subject = (subjects || []).find(s => s.id === dl.subjectId);
              const subCode = subject ? subject.code : '';
              const styles = getTypeStyles(dl.type);
              const isLast = idx === upcomingDeadlines.length - 1;

              return (
                <div
                  key={dl.id}
                  onClick={() => onDeadlineClick?.(dl.id)}
                  className="flex gap-3 items-start relative pl-4 cursor-pointer hover:bg-surface-container transition-colors"
                >
                  <div className={`absolute left-[4px] top-[7px] w-2 h-2 rounded-full ${styles.dot}`}></div>
                  {!isLast && (
                    <div className="absolute left-[7px] top-[15px] bottom-[-20px] w-[1px] bg-outline-variant/40"></div>
                  )}
                  
                  <div className="flex-1 flex flex-col gap-1">
                    <h4 className="text-label-md font-semibold leading-tight">
                      {dl.title} {subCode && `(${subCode})`}
                    </h4>
                    <span className="text-label-sm text-on-surface-variant">
                      {getDeadlineLabel(dl.date)}
                    </span>
                    <span className={`text-[10px] font-bold tracking-wider ${styles.badgeBg} ${styles.badgeText} px-2 py-0.5 rounded-sm w-fit mt-1 uppercase`}>
                      {renderTypeLabel(dl.type)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  )
}

export default Deadlines
