import { ChevronLeft, ChevronRight, Plus, PanelRightClose, PanelRightOpen } from 'lucide-react'
import Dropdown from '../common/Dropdown'

const CalendarToolbar = ({
  activeView,
  setActiveView,
  currentMonth,
  setCurrentMonth,
  selectedDate,
  handlePrev,
  handleNext,
  handleGoToToday,
  getMonthName,
  openCreateModal,
  panelOpen,
  setPanelOpen,
  t,
  VIEWS,
}) => {
  const changeView = (view) => {
    setActiveView(view)
    if (view === 'month') {
      setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
    }
  }

  const title = (
    <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
      {t('academic:calendarView.title')}
    </h1>
  )

  const prevNext = (
    <div className="flex shrink-0 items-center rounded-lg border border-outline-variant">
      <button
        aria-label={t('academic:calendarView.previous', 'Předchozí')}
        onClick={handlePrev}
        className="flex size-8 items-center justify-center rounded-l-lg text-on-surface-variant transition-colors hover:bg-surface-container hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
      </button>
      <button
        aria-label={t('academic:calendarView.next', 'Následující')}
        onClick={handleNext}
        className="flex size-8 items-center justify-center rounded-r-lg border-l border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container hover:text-foreground"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  )

  const periodLabel = (
    <span className="min-w-0 truncate text-xs font-medium capitalize text-on-surface-variant md:text-sm">
      {activeView === 'month' ? getMonthName(currentMonth) : getMonthName(selectedDate)}
    </span>
  )

  const todayButton = (
    <button
      onClick={handleGoToToday}
      className="shrink-0 rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-container"
    >
      {t('academic:calendarView.today', 'Dnes')}
    </button>
  )

  const createButton = (
    <button
      onClick={openCreateModal}
      aria-label={t('academic:calendarView.createNewEvent')}
      className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
    >
      <Plus className="size-4" />
      <span className="hidden sm:inline">{t('academic:calendarView.createNewEvent')}</span>
    </button>
  )

  return (
    <>
      {/* Mobile: title + add on top, view picker and navigation left-aligned below */}
      <div className="flex flex-col gap-3 px-4 pb-3 pt-4 md:hidden">
        <div className="flex items-center justify-between gap-3">
          {title}
          {createButton}
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <Dropdown
            label={t(`academic:calendarView.views.${activeView}`)}
            ariaLabel={t('academic:calendarView.viewLabel', 'Zobrazení')}
            options={VIEWS.map((view) => ({ value: view, label: t(`academic:calendarView.views.${view}`) }))}
            value={activeView}
            onChange={changeView}
            align="left"
            className="shrink-0"
          />
          {prevNext}
          {periodLabel}
          <span className="ml-auto">{todayButton}</span>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden flex-wrap items-center gap-3 px-6 pb-3 pt-5 md:flex">
        <div className="flex flex-wrap items-center gap-3">
          {title}
          {prevNext}
          {periodLabel}
          {todayButton}
        </div>

        <div className="ml-auto flex items-center gap-3">
          {/* Segmented control */}
          <div className="flex items-center rounded-lg border border-outline-variant bg-surface-container-lowest p-0.5">
            {VIEWS.map((view) => (
              <button
                key={view}
                onClick={() => changeView(view)}
                aria-pressed={activeView === view}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeView === view
                    ? 'bg-primary text-primary-foreground'
                    : 'text-on-surface-variant hover:text-foreground'
                }`}
              >
                {t(`academic:calendarView.views.${view}`)}
              </button>
            ))}
          </div>

          {createButton}

          {/* Collapse toggle */}
          <button
            onClick={() => setPanelOpen((prev) => !prev)}
            aria-label={
              panelOpen
                ? t('academic:calendarView.hidePanel', 'Skrýt panel')
                : t('academic:calendarView.showPanel', 'Zobrazit panel')
            }
            className="flex size-9 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container hover:text-foreground"
          >
            {panelOpen ? (
              <PanelRightClose className="size-4" />
            ) : (
              <PanelRightOpen className="size-4" />
            )}
          </button>
        </div>
      </div>
    </>
  )
}

export default CalendarToolbar
