import { useState, forwardRef, useImperativeHandle } from 'react'

const MobileDayDetailSheet = forwardRef(({ subjects, handleEventSelect, t, getSubjectStyle, getDeadlineIcon }, ref) => {
  const [mobileDetail, setMobileDetail] = useState(null)
  const [sheetVisible, setSheetVisible] = useState(false)

  const openMobileDetail = (day, items) => {
    setMobileDetail({ day, items })
    requestAnimationFrame(() => setSheetVisible(true))
  }

  const closeMobileDetail = () => {
    setSheetVisible(false)
    setTimeout(() => setMobileDetail(null), 250)
  }

  useImperativeHandle(ref, () => ({
    open: (day, items) => openMobileDetail(day, items),
  }))

  if (!mobileDetail) return null

  return (
    <div
      className="sm:hidden fixed inset-0 z-50 flex items-end"
      onClick={closeMobileDetail}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-250 ${
          sheetVisible ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-h-[70vh] overflow-y-auto rounded-t-2xl bg-surface-container-lowest border-t border-outline-variant p-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-transform duration-250 ease-out ${
          sheetVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-outline-variant" />
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-bold text-on-surface">
            {mobileDetail.day.dayNum}. {t(`academic:calendarGrid.days.${mobileDetail.day.dayName}`)}
          </span>
          <button onClick={closeMobileDetail} className="text-xs text-on-surface-variant">
            {t('academic:eventModal.closeButton')}
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {mobileDetail.items.map((item, idx) => {
            if (item._kind === 'deadline') {
              const subject = subjects.find(s => s.id === item.subjectId || s.id === item.subject_id)
              const style = getSubjectStyle(subject)
              const Icon = getDeadlineIcon(item.type)
              return (
                <div
                  key={`d-${item.id ?? idx}`}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 border border-rose-400/30 ${style.bg} ${style.text}`}
                >
                  <Icon className="size-4 shrink-0 text-rose-600" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{item.title}</p>
                    <p className="text-[11px] opacity-80">{item.time || '23:59'}</p>
                  </div>
                </div>
              )
            }
            const subject = subjects.find(s => s.id === item.subjectId || s.name === item.subject)
            const style = getSubjectStyle(subject)
            return (
              <button
                key={`e-${item.id ?? idx}`}
                onClick={() => { handleEventSelect(item); closeMobileDetail() }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 border border-outline-variant/30 text-left ${style.bg} ${style.text}`}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: style.dot }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase truncate">{item.code}</p>
                  <p className="text-sm font-semibold truncate">{item.title}</p>
                </div>
                {item.startTime && (
                  <span className="shrink-0 text-xs tabular-nums opacity-70">{item.startTime}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
})

MobileDayDetailSheet.displayName = 'MobileDayDetailSheet'

export default MobileDayDetailSheet
