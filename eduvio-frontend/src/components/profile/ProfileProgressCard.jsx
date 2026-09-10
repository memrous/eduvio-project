import ProgressBar from '../common/ProgressBar'
﻿// MOCK: vizuální placeholder, zatím bez API napojení

const ProfileProgressCard = () => {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-on-surface">Průběh studia</h3>
        <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-bold">
          62 %
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs text-on-surface-variant font-medium">
          <span>Celkový postup</span>
          <span>62 %</span>
        </div>
        <ProgressBar
          value={62}
          className="w-full bg-surface rounded-full h-2.5 overflow-hidden border border-outline-variant/30"
          barClassName="bg-primary h-2.5 rounded-full"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-outline-variant">
        <div className="rounded-lg bg-surface border border-outline-variant/40 p-3">
          <p className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">Kredity</p>
          <p className="mt-1 text-sm font-semibold text-on-surface">74 z 120 kreditů</p>
        </div>

        <div className="rounded-lg bg-surface border border-outline-variant/40 p-3">
          <p className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">Průměr</p>
          <p className="mt-1 text-sm font-semibold text-on-surface">1.48</p>
        </div>

        <div className="rounded-lg bg-surface border border-outline-variant/40 p-3">
          <p className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">Semestr</p>
          <p className="mt-1 text-sm font-semibold text-on-surface">4. semestr</p>
        </div>

        <div className="rounded-lg bg-surface border border-outline-variant/40 p-3">
          <p className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">Předměty</p>
          <p className="mt-1 text-sm font-semibold text-on-surface">28 splněných</p>
        </div>
      </div>
    </div>
  )
}

export default ProfileProgressCard