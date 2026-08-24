'use client'

import { useState } from 'react'
import {
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Copy,
  Download,
  GraduationCap,
  KeyRound,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  X,
} from 'lucide-react'

type Tab = 'overview' | 'account' | 'security' | 'notifications'

const tabs: { id: Tab; label: string; icon: typeof UserRound }[] = [
  { id: 'overview', label: 'Přehled', icon: UserRound },
  { id: 'account', label: 'Osobní údaje', icon: SlidersHorizontal },
  { id: 'security', label: 'Zabezpečení', icon: LockKeyhole },
  { id: 'notifications', label: 'Oznámení', icon: Bell },
]

function Switch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      className={`switch ${enabled ? 'switch-on' : ''}`}
      onClick={onToggle}
      aria-pressed={enabled}
      aria-label={enabled ? 'Vypnout' : 'Zapnout'}
    >
      <span />
    </button>
  )
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="input-wrap">
        <input value={value} readOnly />
      </div>
      {hint && <small>{hint}</small>}
    </label>
  )
}

export default function Page() {
  const [tab, setTab] = useState<Tab>('overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [moodle, setMoodle] = useState(true)
  const [email, setEmail] = useState(true)
  const [calendar, setCalendar] = useState(false)

  const copyId = async () => {
    await navigator.clipboard?.writeText('UPOL-241087')
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <main className="profile-page">
      <style>{`
        .profile-page {
          min-height: 100vh;
          background-color: #080c14;
          color: #e2e8f0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          padding: 24px 32px 48px;
        }

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 28px;
          padding-bottom: 16px;
          border-bottom: 1px solid #161f30;
        }

        .page-header .brand-mark {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #1e293b;
          color: #38bdf8;
        }

        .page-header .crumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #64748b;
          margin-left: 12px;
          flex: 1;
        }

        .page-header .crumb strong {
          color: #f8fafc;
        }

        .menu-button {
          display: none;
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .icon-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #131b2c;
          border: 1px solid #1e293b;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s;
        }

        .icon-button:hover {
          color: #f8fafc;
          border-color: #334155;
        }

        .avatar-small {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #1e293b;
          border: 1px solid #334155;
          color: #f8fafc;
          font-weight: 600;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .layout-grid {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 28px;
          max-width: 1400px;
          margin: 0 auto;
        }

        @media (max-width: 1024px) {
          .layout-grid {
            grid-template-columns: 1fr;
          }
          .menu-button {
            display: block;
          }
        }

        .surface {
          background: #0f1523;
          border: 1px solid #1a2333;
          border-radius: 16px;
          padding: 24px;
        }

        .identity-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .identity-card {
          text-align: left;
        }

        .profile-avatar {
          position: relative;
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: #1e293b;
          border: 2px solid #334155;
          color: #f8fafc;
          font-size: 24px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .online-dot {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #10b981;
          border: 2.5px solid #0f1523;
        }

        .eyebrow {
          display: block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #38bdf8;
          margin-bottom: 6px;
        }

        .identity-copy h1 {
          font-size: 22px;
          font-weight: 700;
          color: #f8fafc;
          margin: 0 0 4px;
        }

        .identity-copy p {
          font-size: 14px;
          color: #94a3b8;
          margin: 0 0 14px;
        }

        .role-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #162032;
          border: 1px solid #223049;
          color: #38bdf8;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 9999px;
          margin-bottom: 20px;
        }

        .identity-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #090e18;
          border: 1px solid #1b2537;
          border-radius: 12px;
          padding: 12px 14px;
        }

        .identity-meta span {
          display: block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: #64748b;
        }

        .identity-meta strong {
          font-size: 14px;
          color: #f1f5f9;
          font-family: monospace;
        }

        .copy-button {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
        }

        .copy-button:hover {
          color: #38bdf8;
        }

        .study-card .section-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .study-card h2 {
          font-size: 17px;
          font-weight: 700;
          color: #f8fafc;
          margin: 0;
        }

        .status-dot {
          background: #064e3b;
          border: 1px solid #059669;
          color: #34d399;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          padding: 3px 8px;
          border-radius: 9999px;
        }

        .study-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin: 0;
        }

        .study-list div {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }

        .study-list dt {
          color: #64748b;
        }

        .study-list dd {
          color: #cbd5e1;
          font-weight: 500;
          margin: 0;
        }

        .progress-card .progress-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .progress-card .progress-top strong {
          font-size: 15px;
          color: #34d399;
        }

        .progress-track {
          width: 100%;
          height: 6px;
          background: #192336;
          border-radius: 9999px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-track span {
          display: block;
          height: 100%;
          background: linear-gradient(90deg, #10b981, #34d399);
          border-radius: 9999px;
        }

        .progress-foot {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #64748b;
          margin-bottom: 16px;
        }

        .metric-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          border-top: 1px solid #161f30;
          padding-top: 14px;
        }

        .metric-row div strong {
          display: block;
          font-size: 18px;
          font-weight: 700;
          color: #f8fafc;
        }

        .metric-row div span {
          font-size: 11px;
          color: #64748b;
        }

        .logout-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          padding: 8px 4px;
          transition: color 0.2s;
        }

        .logout-button:hover {
          color: #f87171;
        }

        .content-column {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .content-intro {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 4px;
        }

        .content-intro h2 {
          font-size: 24px;
          font-weight: 700;
          color: #f8fafc;
          margin: 0 0 4px;
        }

        .content-intro p {
          font-size: 14px;
          color: #94a3b8;
          margin: 0;
        }

        .sync-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #64748b;
        }

        .sync-pulse {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
        }

        .tabs {
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid #161f30;
          padding-bottom: 8px;
          overflow-x: auto;
        }

        .tab {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 10px;
          background: transparent;
          border: 1px solid transparent;
          color: #94a3b8;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .tab:hover {
          color: #f8fafc;
          background: #131b2a;
        }

        .tab.active {
          color: #38bdf8;
          background: rgba(56, 189, 248, 0.08);
          border-color: rgba(56, 189, 248, 0.25);
        }

        .panels {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .panel {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .panel-title {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .title-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: rgba(56, 189, 248, 0.1);
          color: #38bdf8;
          flex-shrink: 0;
        }

        .title-icon.blue {
          background: rgba(59, 130, 246, 0.1);
          color: #60a5fa;
        }

        .title-icon.green {
          background: rgba(16, 185, 129, 0.1);
          color: #34d399;
        }

        .panel-title h3 {
          font-size: 16px;
          font-weight: 700;
          color: #f8fafc;
          margin: 0;
        }

        .panel-title p {
          font-size: 13px;
          color: #64748b;
          margin: 2px 0 0;
        }

        .text-button {
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: transparent;
          border: none;
          color: #38bdf8;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
        }

        .secure-badge {
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #064e3b;
          border: 1px solid #059669;
          color: #34d399;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 9999px;
        }

        .field-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        @media (max-width: 640px) {
          .field-grid {
            grid-template-columns: 1fr;
          }
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field span {
          font-size: 12px;
          font-weight: 600;
          color: #94a3b8;
        }

        .field input {
          width: 100%;
          background: #090e18;
          border: 1px solid #1b2537;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 14px;
          color: #f1f5f9;
          outline: none;
          box-sizing: border-box;
        }

        .field input:focus {
          border-color: #38bdf8;
        }

        .field small {
          font-size: 11px;
          color: #64748b;
        }

        .setting-row, .integration-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 0;
          border-top: 1px solid #161f30;
          gap: 16px;
        }

        .setting-row:first-of-type, .integration-row:first-of-type {
          border-top: none;
          padding-top: 0;
        }

        .setting-row div strong, .integration-row div strong {
          display: block;
          font-size: 14px;
          color: #f8fafc;
          font-weight: 600;
        }

        .setting-row div p, .integration-row div p {
          font-size: 13px;
          color: #64748b;
          margin: 2px 0 0;
        }

        .connected {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #064e3b;
          border: 1px solid #059669;
          color: #34d399;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 9999px;
          margin-left: auto;
        }

        .connected.muted {
          background: #162032;
          border-color: #223049;
          color: #64748b;
        }

        .switch {
          position: relative;
          width: 44px;
          height: 24px;
          border-radius: 9999px;
          background: #1e293b;
          border: none;
          cursor: pointer;
          padding: 2px;
          transition: background 0.2s;
          flex-shrink: 0;
        }

        .switch span {
          display: block;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #f8fafc;
          transition: transform 0.2s;
        }

        .switch-on {
          background: #3b82f6;
        }

        .switch-on span {
          transform: translateX(20px);
        }

        .outline-button {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #090e18;
          border: 1px solid #1b2537;
          color: #f1f5f9;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .outline-button:hover {
          border-color: #334155;
          background: #131b2c;
        }

        .notice {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(56, 189, 248, 0.08);
          border: 1px solid rgba(56, 189, 248, 0.2);
          color: #e0f2fe;
          padding: 14px 16px;
          border-radius: 12px;
          font-size: 13px;
        }

        .danger-zone {
          border-top: 1px solid #161f30;
          padding-top: 16px;
        }

        .danger-zone strong {
          display: block;
          font-size: 14px;
          color: #f87171;
          font-weight: 600;
        }

        .danger-zone p {
          font-size: 13px;
          color: #64748b;
          margin: 2px 0 12px;
        }

        .danger-button {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #f87171;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 16px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .danger-button:hover {
          background: rgba(239, 68, 68, 0.18);
        }

        .bottom-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
        }

        .export-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #0f1523;
          border: 1px solid #1e293b;
          color: #e2e8f0;
          font-size: 13px;
          font-weight: 600;
          padding: 10px 18px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .export-button:hover {
          background: #162032;
          border-color: #334155;
        }

        .calendar-button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(56, 189, 248, 0.1);
          border: 1px solid rgba(56, 189, 248, 0.25);
          color: #38bdf8;
          font-size: 13px;
          font-weight: 600;
          padding: 10px 18px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .calendar-button:hover {
          background: rgba(56, 189, 248, 0.18);
        }

        .footer-note {
          font-size: 12px;
          color: #475569;
          margin-top: 12px;
          text-align: center;
        }

        .footer-note button {
          background: transparent;
          border: none;
          color: #38bdf8;
          cursor: pointer;
          font-size: 12px;
          padding: 0;
        }
      `}</style>

      <div className="page-header">
        <div className="brand-mark"><GraduationCap size={19} /></div>
        <div className="crumb"><span>STUDYHUB</span><ChevronRight size={14} /><strong>Profil</strong></div>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Otevřít menu"><Menu size={20} /></button>
        <div className={`header-actions ${menuOpen ? 'is-open' : ''}`}>
          <button className="icon-button" aria-label="Nápověda"><CircleHelp size={19} /></button>
          <button className="avatar-small">JN</button>
        </div>
      </div>

      <div className="layout-grid">
        <aside className="identity-column">
          <section className="surface identity-card">
            <div className="profile-avatar">JN<span className="online-dot" /></div>
            <div className="identity-copy">
              <span className="eyebrow">INSTITUCIONÁLNÍ ÚČET</span>
              <h1>Jan Novák</h1>
              <p>jan.novak@upol.cz</p>
              <div className="role-chip"><GraduationCap size={15} /> Student</div>
            </div>
            <div className="identity-meta">
              <div><span>STUDENTSKÉ ID</span><strong>UPOL-241087</strong></div>
              <button className="copy-button" onClick={copyId} aria-label="Kopírovat ID">{copied ? <Check size={16} /> : <Copy size={16} />}</button>
            </div>
          </section>

          <section className="surface study-card">
            <div className="section-heading"><div><span className="eyebrow">AKTUÁLNÍ STUDIUM</span><h2>Applied Informatics</h2></div><span className="status-dot">AKTIVNÍ</span></div>
            <dl className="study-list">
              <div><dt>Univerzita</dt><dd>Univerzita Palackého</dd></div>
              <div><dt>Fakulta</dt><dd>Přírodovědecká fakulta</dd></div>
              <div><dt>Ročník</dt><dd>2. ročník</dd></div>
              <div><dt>Forma</dt><dd>Prezenční</dd></div>
            </dl>
          </section>

          <section className="surface progress-card">
            <div className="progress-top"><span className="eyebrow">POSTUP STUDIEM</span><strong>62 %</strong></div>
            <div className="progress-track"><span style={{ width: '62%' }} /></div>
            <div className="progress-foot"><span>74 z 120 kreditů</span><span>4. semestr</span></div>
            <div className="metric-row"><div><strong>1.48</strong><span>Průměr</span></div><div><strong>28</strong><span>Splněných předmětů</span></div></div>
          </section>

          <button className="logout-button"><LogOut size={17} /> Odhlásit se</button>
        </aside>

        <section className="content-column">
          <div className="content-intro"><div><span className="eyebrow">NASTAVENÍ ÚČTU</span><h2>Profil a nastavení</h2><p>Spravujte své osobní údaje a preference účtu.</p></div><div className="sync-label"><span className="sync-pulse" /> Synchronizováno před 2 min</div></div>
          <nav className="tabs" aria-label="Nastavení profilu">
            {tabs.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'tab active' : 'tab'} onClick={() => setTab(id)}><Icon size={17} />{label}</button>)}
          </nav>

          {tab === 'overview' && <div className="panels">
            <section className="surface panel"><div className="panel-title"><div className="title-icon"><UserRound size={18} /></div><div><h3>Osobní údaje</h3><p>Základní informace z univerzitního systému.</p></div><button className="text-button" onClick={() => setTab('account')}>Upravit <ChevronRight size={16} /></button></div><div className="field-grid"><Field label="Jméno a příjmení" value="Jan Novák" /><Field label="Univerzitní e-mail" value="jan.novak@upol.cz" /><Field label="Telefon" value="+420 777 123 456" hint="Viditelné pouze vám" /><Field label="Jazyk aplikace" value="Čeština" /></div></section>
            <section className="surface panel"><div className="panel-title"><div className="title-icon blue"><ShieldCheck size={18} /></div><div><h3>Bezpečnost účtu</h3><p>Váš účet je chráněný a v pořádku.</p></div><span className="secure-badge"><Check size={14} /> Zabezpečeno</span></div><div className="setting-row"><div><strong>Dvoufázové ověření</strong><p>Přidejte další vrstvu ochrany při přihlašování.</p></div><Switch enabled onToggle={() => {}} /></div><div className="setting-row"><div><strong>Heslo</strong><p>Naposledy změněno před 3 měsíci.</p></div><button className="outline-button" onClick={() => setTab('security')}><KeyRound size={16} /> Změnit heslo</button></div></section>
            <section className="surface panel"><div className="panel-title"><div className="title-icon green"><RefreshCw size={18} /></div><div><h3>Univerzitní integrace</h3><p>Propojené služby a synchronizace.</p></div></div><div className="integration-row"><div><strong>Moodle</strong><p>Kurzy, úkoly a termíny</p></div><span className="connected"><Check size={14} /> Připojeno</span><Switch enabled={moodle} onToggle={() => setMoodle(!moodle)} /></div><div className="integration-row"><div><strong>Kalendář</strong><p>Export rozvrhu do kalendáře</p></div><span className="connected muted">Odpojeno</span><Switch enabled={calendar} onToggle={() => setCalendar(!calendar)} /></div></section>
          </div>}

          {tab === 'account' && <section className="surface panel single-panel"><div className="panel-title"><div className="title-icon"><UserRound size={18} /></div><div><h3>Osobní údaje</h3><p>Údaje synchronizované ze STAGu lze upravit pouze v univerzitním systému.</p></div></div><div className="field-grid"><Field label="Jméno a příjmení" value="Jan Novák" /><Field label="Univerzitní e-mail" value="jan.novak@upol.cz" /><Field label="Telefon" value="+420 777 123 456" /><Field label="Jazyk aplikace" value="Čeština" /></div><div className="notice"><Mail size={18} /><span>Pro změnu osobních údajů kontaktujte studijní oddělení.</span></div></section>}
          {tab === 'security' && <section className="surface panel single-panel"><div className="panel-title"><div className="title-icon blue"><ShieldCheck size={18} /></div><div><h3>Zabezpečení</h3><p>Spravujte přístup a ochranu svého účtu.</p></div></div><div className="setting-row"><div><strong>Dvoufázové ověření</strong><p>Ověření pomocí školní aplikace při každém novém přihlášení.</p></div><Switch enabled onToggle={() => {}} /></div><div className="setting-row"><div><strong>Heslo</strong><p>Naposledy změněno před 3 měsíci.</p></div><button className="outline-button">Změnit heslo</button></div><div className="danger-zone"><strong>Odhlásit všechna zařízení</strong><p>Ukončí všechna aktivní přihlášení k vašemu účtu.</p><button className="danger-button">Odhlásit zařízení</button></div></section>}
          {tab === 'notifications' && <section className="surface panel single-panel"><div className="panel-title"><div className="title-icon"><Bell size={18} /></div><div><h3>Oznámení</h3><p>Vyberte, o čem chcete být informováni.</p></div></div><div className="setting-row"><div><strong>Novinky e-mailem</strong><p>Důležité informace o účtu a studiu.</p></div><Switch enabled={email} onToggle={() => setEmail(!email)} /></div><div className="setting-row"><div><strong>Synchronizace Moodlu</strong><p>Upozornění na nové úkoly a změny termínů.</p></div><Switch enabled={moodle} onToggle={() => setMoodle(!moodle)} /></div><div className="setting-row"><div><strong>Kalendář</strong><p>Nové události přidané do vašeho rozvrhu.</p></div><Switch enabled={calendar} onToggle={() => setCalendar(!calendar)} /></div></section>}

          <div className="bottom-actions"><button className="export-button"><Download size={17} /> Exportovat údaje</button><button className="calendar-button"><CalendarDays size={17} /> Přidat do kalendáře</button></div>
          <p className="footer-note">Potřebujete pomoc? <button>Kontaktujte podporu</button> · Verze 2.4.1</p>
        </section>
      </div>
    </main>
  )
}
