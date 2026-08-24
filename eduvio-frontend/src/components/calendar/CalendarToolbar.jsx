import { ChevronLeft, ChevronRight, Plus, PanelRightClose, PanelRightOpen } from 'lucide-react'

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
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 pb-3 pt-4 md:px-6 md:pt-5">
      <div className="flex items-center gap-2 md:gap-3 flex-wrap">
        <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
          {t('academic:calendarView.title')}
        </h1>

        <div className="flex items-center rounded-lg border border-outline-variant">
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

        <span className="text-xs font-medium capitalize text-on-surface-variant md:text-sm">
          {activeView === 'month' ? getMonthName(currentMonth) : getMonthName(selectedDate)}
        </span>

        <button
          onClick={handleGoToToday}
          className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-container"
        >
          {t('academic:calendarView.today', 'Dnes')}
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2 md:gap-3">
        {/* Segmented control (desktop) */}
        <div className="hidden items-center rounded-lg border border-outline-variant bg-surface-container-lowest p-0.5 md:flex">
          {VIEWS.map((view) => (
            <button
              key={view}
              onClick={() => {
                setActiveView(view)
                if (view === 'month') {
                  setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
                }
              }}
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

        {/* View dropdown (mobile) */}
        <select
          value={activeView}
          onChange={(e) => {
            const view = e.target.value
            setActiveView(view)
            if (view === 'month') {
              setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
            }
          }}
          aria-label={t('academic:calendarView.viewLabel', 'Zobrazení')}
          className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-sm font-medium text-foreground md:hidden"
        >
          {VIEWS.map((view) => (
            <option key={view} value={view}>
              {t(`academic:calendarView.views.${view}`)}
            </option>
          ))}
        </select>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">{t('academic:calendarView.createNewEvent')}</span>
        </button>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => setPanelOpen((prev) => !prev)}
          aria-label={
            panelOpen
              ? t('academic:calendarView.hidePanel', 'Skrýt panel')
              : t('academic:calendarView.showPanel', 'Zobrazit panel')
          }
          className="hidden size-9 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container hover:text-foreground md:flex"
        >
          {panelOpen ? (
            <PanelRightClose className="size-4" />
          ) : (
            <PanelRightOpen className="size-4" />
          )}
        </button>
      </div>
    </div>
  )
}

export default CalendarToolbar
