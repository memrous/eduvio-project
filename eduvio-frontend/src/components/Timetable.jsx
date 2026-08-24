import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react';
import CustomIcon from './CustomIcon';
import { getLocaleFromLanguage } from '../utils/locale'

const TYPE_COLOR_MAP = {
  'Lecture': { border: 'border-primary', bg: 'bg-primary-container', text: 'text-primary' },
  'Lab': { border: 'border-primary', bg: 'bg-primary-container', text: 'text-primary' },
  'Assignment': { border: 'border-success', bg: 'bg-success-container', text: 'text-success' },
  'Test': { border: 'border-warning', bg: 'bg-warning-container', text: 'text-warning' },
  'Quiz': { border: 'border-warning', bg: 'bg-warning-container', text: 'text-warning' },
  'Exam': { border: 'border-error', bg: 'bg-error-container', text: 'text-error' },
  'Deadline': { border: 'border-error', bg: 'bg-error-container', text: 'text-error' },
  'default': { border: 'border-outline-variant', bg: 'bg-surface-container-low', text: 'text-on-surface-variant' }
};

const Timetable = ({ events, subjects, onOpenSubject }) => {
  const { t, i18n } = useTranslation('dashboard')
  const DEFAULT_DATE = useMemo(() => new Date(2026, 5, 7), []);
  const today = new Date(); 
  const todayStr = today.toISOString().split('T')[0];
  const locale = getLocaleFromLanguage(i18n.language)

  const [currentDate, setCurrentDate] = useState(DEFAULT_DATE);
  const [selectedDetailEvent, setSelectedDetailEvent] = useState(null);

  const currentDay = currentDate.getDay();
  const monday = new Date(currentDate);
  monday.setDate(currentDate.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
  monday.setHours(0, 0, 0, 0);

  const defaultMonday = useMemo(() => {
    const dMon = new Date(DEFAULT_DATE);
    const dDay = DEFAULT_DATE.getDay();
    dMon.setDate(DEFAULT_DATE.getDate() - (dDay === 0 ? 6 : dDay - 1));
    dMon.setHours(0, 0, 0, 0);
    return dMon;
  }, [DEFAULT_DATE]);

  const msInWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksDiff = Math.round((monday.getTime() - defaultMonday.getTime()) / msInWeek);

  const isPrevDisabled = weeksDiff <= -1;
  const isNextDisabled = weeksDiff >= 1;

  const handlePrevWeek = () => {
    if (isPrevDisabled) return;
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const handleNextWeek = () => {
    if (isNextDisabled) return;
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    setCurrentDate(DEFAULT_DATE);
  };

  const formattedDateRange = monday.toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  const formatDateKey = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri']
  const days = dayKeys.map((dayKey, index) => {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + index);
    const dateStr = formatDateKey(dayDate);
    
    const dayLectures = (events || [])
      .filter(e => (e.type === 'Lecture' || e.type === 'Lab') && e.date === dateStr)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

    const isToday = formatDateKey(today) === dateStr;

    return {
      name: t(`timetable.days.${dayKey}`),
      isToday,
      lectures: dayLectures
    };
  });

  // Mobile schedule calculations
  const formattedToday = today.toLocaleDateString(locale, { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });

  const renderEventType = (type) => t(`timetable.eventTypes.${type}`, type)

  const todayLectures = (events || [])
    .filter(e => e.type === 'Lecture' && e.date === todayStr)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  return (
    <>
      {/* MOBILE LAYOUT: Today's Schedule */}
      <section className="flex lg:hidden flex-col gap-3 font-inter">
        <div className="flex justify-between items-center">
          <h3 className="text-headline-md text-on-surface font-semibold">{t('timetable.titleMobile')}</h3>
          <span className="text-label-md text-primary font-bold">{formattedToday}</span>
        </div>

        <div className="bg-surface border border-outline-variant p-4 rounded-lg shadow-ambient flex flex-col gap-4">
          {todayLectures.length === 0 ? (
            <p className="text-body-md text-on-surface-variant italic text-center py-2">
              {t('timetable.noClassesToday')}
            </p>
          ) : (
            todayLectures.map(lec => {
              const subject = (subjects || []).find(s => s.id === lec.subjectId);
              const subCode = subject ? subject.code : t('timetable.fallbacks.subjectCode');
              const subName = subject ? subject.name : lec.title;
              const subLecturer = subject ? subject.lecturer : t('timetable.fallbacks.notSpecified');
              const roomInfo = subject ? (subject.code === 'KMI/DBS' ? t('timetable.fallbacks.room201') : t('timetable.fallbacks.room105')) : t('timetable.fallbacks.mainHall');

              return (
                <div 
                  key={lec.id} 
                  onClick={() => setSelectedDetailEvent({ ...lec, subject: subName, code: subCode })}
                  className="flex items-center gap-4 relative pl-4 cursor-pointer hover:bg-surface-container-low/80 p-1.5 -mx-1.5 rounded-md transition-colors group"
                >
                  <div className="absolute left-0 w-1 h-8 bg-primary rounded-full group-hover:scale-y-105 transition-transform"></div>
                  <span className="text-label-sm font-semibold text-on-surface shrink-0 pt-0.5 ml-0.5">
                    {lec.startTime}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-label-md text-on-surface font-bold leading-tight truncate group-hover:text-primary transition-colors">
                      {subName}
                    </h4>
                    <span className="text-label-sm text-on-surface-variant mt-0.5 block truncate">
                      {roomInfo} • {subLecturer}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* DESKTOP LAYOUT: Weekly Timetable */}
      <section className="hidden lg:flex flex-col gap-4 font-inter text-on-surface">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <h2 className="text-headline-md text-on-surface font-semibold">{t('timetable.titleDesktop')}</h2>
            <span className="text-sm text-on-surface-variant capitalize">{formattedDateRange}</span>
          </div>
          
          <div className="flex items-center gap-2 bg-surface-container-low p-1 rounded-lg border border-outline-variant">
            <button 
              onClick={handlePrevWeek}
              disabled={isPrevDisabled}
              className={`px-2 py-1 text-xs font-semibold rounded-md transition-all shadow-sm ${
                isPrevDisabled 
                  ? 'opacity-40 text-on-surface-variant bg-transparent' 
                  : 'hover:bg-surface-container-low text-on-surface hover:text-on-surface cursor-pointer'
              }`}
            >
              {t('timetable.prev')}
            </button>
            <button 
              onClick={handleToday}
              className="px-2 py-1 text-xs font-bold rounded-md bg-primary text-on-primary border border-outline-variant shadow-sm cursor-pointer"
            >
              {t('timetable.current')}
            </button>
            <button 
              onClick={handleNextWeek}
              disabled={isNextDisabled}
              className={`px-2 py-1 text-xs font-semibold rounded-md transition-all shadow-sm ${
                isNextDisabled 
                  ? 'opacity-40 text-on-surface-variant bg-transparent' 
                  : 'hover:bg-surface-container-low text-on-surface hover:text-on-surface cursor-pointer'
              }`}
            >
              {t('timetable.next')}
            </button>
          </div>
        </div>

        <div className="bg-surface border border-outline-variant rounded-lg p-5 shadow-ambient grid grid-cols-5 gap-4">
          {days.map((day) => (
            <div key={day.name} className="flex flex-col gap-3">
              <div className="flex justify-center">
                {day.isToday ? (
                  <span className="text-label-sm bg-primary text-on-primary px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold text-center">
                    {day.name}
                  </span>
                ) : (
                  <span className="text-label-sm text-on-surface-variant uppercase tracking-wider text-center block font-semibold">
                    {day.name}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2 min-h-[110px]">
                {day.lectures.length === 0 ? (
                  <div className="bg-surface-container-low border border-dashed border-surface-container rounded-md flex-1 min-h-[96px] flex items-center justify-center text-[10px] text-on-surface-variant italic text-center p-1 select-none">
                    {t('timetable.noClasses')}
                  </div>
                ) : (
                  day.lectures.map(lec => {
                    const subject = (subjects || []).find(s => s.id === lec.subjectId);
                    const subCode = subject ? subject.code : t('timetable.fallbacks.subjectCode');
                    const subName = subject ? subject.name : lec.title;
                    
                    const colorConfig = TYPE_COLOR_MAP[lec.type] || TYPE_COLOR_MAP['default'];

                    return (
                      <div 
                        key={lec.id}
                        onClick={() => setSelectedDetailEvent({ ...lec, subject: subName, code: subCode })}
                        title={`${subName} (${lec.startTime} – ${lec.endTime})`}
                        className={`${colorConfig.bg} border-l-4 ${colorConfig.border} px-3 py-2 rounded-r-md flex flex-col justify-center min-h-[48px] shadow-sm hover:brightness-95 transition-all cursor-pointer`}
                      >
                        <span className={`text-[11px] font-bold ${colorConfig.text}`}>
                          {subCode.split('/')[1] || subCode}
                        </span>
                        <span className="text-[10px] text-on-surface-variant font-semibold mt-0.5">
                          {lec.startTime}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* POP-UP MODAL: DETAIL UDÁLOSTI (Shared by Mobile & Desktop) */}
      {selectedDetailEvent && (() => {
        const targetSubject = (subjects || []).find(s => s.id === selectedDetailEvent.subjectId);
        const styleObj = TYPE_COLOR_MAP[selectedDetailEvent.type] || TYPE_COLOR_MAP['default'];
        
        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-opacity">
            <div className="bg-surface-container rounded-lg shadow-2xl border border-outline-variant w-full max-w-md overflow-hidden relative font-inter text-left animate-in fade-in zoom-in-95 duration-150">
              
              <div className={`px-6 py-4 border-b border-outline-variant ${styleObj.bg} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-extrabold uppercase px-2 py-0.5 rounded-sm bg-surface-container-highest border border-outline-variant/30 ${styleObj.text}`}>
                    {selectedDetailEvent.code}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-sm bg-surface-container-low/60 ${styleObj.text}`}>
                    {renderEventType(selectedDetailEvent.type)}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedDetailEvent(null)}
                  className="p-1 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer rounded-full hover:bg-black/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-4.5">
                <div>
                  <h3 className="text-headline-md font-bold text-on-surface leading-tight">
                    {selectedDetailEvent.title || selectedDetailEvent.subject}
                  </h3>
                  <p className="text-body-md font-semibold text-primary mt-1">
                    {targetSubject ? targetSubject.name : t('timetable.fallbacks.unknownSubject')}
                  </p>
                </div>

              <div className="grid grid-cols-2 gap-3 bg-surface-container-low p-3 rounded-lg border border-outline-variant">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <CustomIcon name="calendar" className="w-4 h-4 shrink-0" />
                  <span className="text-label-md font-medium text-on-surface">
                      {new Date(selectedDetailEvent.date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                  <div className="flex items-center gap-2 text-on-surface-variant">
                    <CustomIcon name="clock" className="w-4 h-4 shrink-0" />
                    <span className="text-label-md font-medium text-on-surface text-xs md:text-sm">
                      {selectedDetailEvent.startTime} {selectedDetailEvent.endTime && `– ${selectedDetailEvent.endTime}`}
                    </span>
                  </div>
                </div>

                {targetSubject && (
                  <div className="flex flex-col gap-2.5 border-t border-outline-variant pt-4">
                    <div className="flex justify-between items-center text-body-md">
                      <span className="text-on-surface-variant font-medium">{t('timetable.lecturer')}</span>
                      <span className="font-bold text-on-surface">{targetSubject.lecturer || t('timetable.fallbacks.notSpecified')}</span>
                    </div>
                    <div className="flex justify-between items-center text-body-md">
                      <span className="text-on-surface-variant font-medium">{t('timetable.creditsCompletion')}</span>
                      <span className="font-semibold text-on-surface">
                        {targetSubject.credits} STAG Credits ({targetSubject.completionType})
                      </span>
                    </div>
                    {targetSubject.description && (
                      <div className="flex flex-col gap-1 mt-1 bg-surface-container-low p-2.5 rounded border border-surface-container">
                        <span className="text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">{t('timetable.subjectDescription')}</span>
                        <p className="text-label-sm text-on-surface-variant leading-relaxed line-clamp-3">
                          {targetSubject.description}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-outline-variant">
                  <button
                    type="button"
                    onClick={() => {
                      if (targetSubject && onOpenSubject) {
                        onOpenSubject(targetSubject.id);
                      }
                      setSelectedDetailEvent(null);
                    }}
                    className="w-full bg-primary hover:bg-primary/90 text-on-primary py-2 rounded-md font-semibold text-label-md transition-colors shadow-sm cursor-pointer text-center"
                  >
                    {t('timetable.openSubjectHub')}
                  </button>
                </div>

              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
};

export default Timetable;
