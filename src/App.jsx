import React, { useState } from 'react'

// ── Ekrany (placeholder — każdy zastąpimy właściwym komponentem) ──
function ScreenPlaceholder({ name }) {
  return (
    <div style={{ padding: '40px', color: 'var(--m-muted)', fontSize: '15px' }}>
      <div style={{
        background: 'var(--m-bg)',
        borderRadius: 'var(--r-lg)',
        padding: '48px',
        textAlign: 'center',
        boxShadow: 'var(--neu-in)',
      }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🚧</div>
        <div style={{ fontWeight: 700, color: 'var(--m-text)', marginBottom: '6px' }}>{name}</div>
        <div>Moduł w budowie</div>
      </div>
    </div>
  )
}

// ── Nawigacja ──
const NAV = [
  { id: 'crm',       label: 'Klienci',      icon: 'ti-users' },
  { id: 'wyceny',    label: 'Wyceny',       icon: 'ti-file-invoice' },
  { id: 'zamowienia',label: 'Zamówienia',   icon: 'ti-shopping-bag' },
  { id: 'zlecenia',  label: 'Zlecenia',     icon: 'ti-needle' },
  { id: 'poczta',    label: 'Poczta',       icon: 'ti-mail' },
  { id: 'zadania',   label: 'Zadania',      icon: 'ti-checkbox' },
  { id: 'kalendarz', label: 'Kalendarz',    icon: 'ti-calendar' },
]

// ── Style inline (neumorphism tokeny z :root) ──
const S = {
  app: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
  },

  // ── Sidebar ──
  sidebar: {
    width: '220px',
    flexShrink: 0,
    background: 'var(--sb-bg)',
    display: 'flex',
    flexDirection: 'column',
    padding: '28px 0',
    boxShadow:
      'inset -5px 0 15px var(--sb-dark), inset 3px 3px 10px var(--sb-light), 8px 0 24px rgba(80,110,100,0.3)',
    zIndex: 10,
  },

  logoArea: {
    padding: '0 20px 22px',
    borderBottom: '1px solid rgba(255,255,255,0.12)',
  },
  logoPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '9px',
    background: 'var(--sb-bg)',
    borderRadius: 'var(--r-lg)',
    padding: '9px 13px',
    boxShadow: 'var(--neu-sb-out)',
    marginBottom: '12px',
  },
  logoIcon: { fontSize: '20px', color: 'var(--sb-accent)' },
  logoTitle: { fontSize: '14px', fontWeight: 700, color: 'var(--sb-text)', lineHeight: 1.25 },
  logoSub: { fontSize: '10px', color: 'var(--sb-muted)', letterSpacing: '0.07em', marginTop: '3px' },

  nav: { flex: 1, padding: '14px 0', display: 'flex', flexDirection: 'column', gap: '3px' },

  navItem: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '0 12px',
    padding: '11px 14px',
    fontSize: '13px',
    color: active ? 'var(--sb-text)' : 'var(--sb-muted)',
    fontWeight: active ? 700 : 400,
    cursor: 'pointer',
    borderRadius: 'var(--r-md)',
    background: 'var(--sb-bg)',
    boxShadow: active ? 'var(--neu-sb-out)' : 'none',
    transition: 'all 0.15s',
  }),
  navIcon: (active) => ({
    fontSize: '17px',
    color: active ? 'var(--sb-accent)' : 'inherit',
  }),
  navChip: {
    marginLeft: 'auto',
    background: 'var(--sb-bg)',
    color: 'var(--sb-accent)',
    fontSize: '10px',
    fontWeight: 700,
    padding: '3px 8px',
    borderRadius: '20px',
    boxShadow: 'var(--neu-sb-out)',
  },

  sbFoot: {
    padding: '16px 20px 0',
    borderTop: '1px solid rgba(255,255,255,0.12)',
  },
  avRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  avatar: {
    width: '36px', height: '36px', borderRadius: '50%',
    background: 'var(--sb-bg)',
    boxShadow: 'var(--neu-sb-out)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '12px', fontWeight: 700, color: 'var(--sb-accent)',
    flexShrink: 0,
  },
  avName: { fontSize: '12px', color: 'var(--sb-text)', fontWeight: 600 },
  avRole: { fontSize: '10px', color: 'var(--sb-muted)' },

  // ── Main ──
  main: {
    flex: 1,
    background: 'var(--m-bg)',
    overflowY: 'auto',
    boxShadow: 'inset 6px 0 20px var(--m-dark)',
  },

  topbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '28px 28px 0',
    marginBottom: '24px',
  },
  pageTitle: { fontSize: '22px', fontWeight: 700, color: 'var(--m-text)' },
  pageSub: { fontSize: '12px', color: 'var(--m-muted)', marginTop: '3px' },

  btnPrimary: {
    background: 'var(--m-bg)',
    color: 'var(--accent)',
    border: 'none',
    borderRadius: 'var(--r-md)',
    padding: '11px 18px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    boxShadow: 'var(--neu-out)',
  },
}

// ── Formatowanie daty ──
function dzisiaj() {
  return new Date().toLocaleDateString('pl-PL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ── Główny komponent ──
export default function App() {
  const [screen, setScreen] = useState('crm')

  const cur = NAV.find(n => n.id === screen)

  return (
    <div style={S.app}>

      {/* ── Sidebar ── */}
      <aside style={S.sidebar}>
        <div style={S.logoArea}>
          <div style={S.logoPill}>
            <i className="ti ti-ripple" style={S.logoIcon} aria-hidden="true" />
            <div>
              <div style={S.logoTitle}>Asystent<br />Dekoracji</div>
            </div>
          </div>
          <div style={S.logoSub}>by Porter Design</div>
        </div>

        <nav style={S.nav}>
          {NAV.map(item => (
            <div
              key={item.id}
              style={S.navItem(screen === item.id)}
              onClick={() => setScreen(item.id)}
            >
              <i className={`ti ${item.icon}`} style={S.navIcon(screen === item.id)} aria-hidden="true" />
              {item.label}
            </div>
          ))}
        </nav>

        <div style={S.sbFoot}>
          <div style={S.avRow}>
            <div style={S.avatar}>PP</div>
            <div>
              <div style={S.avName}>Paulina Porter</div>
              <div style={S.avRole}>Administrator</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Główna treść ── */}
      <main style={S.main}>
        <div style={S.topbar}>
          <div>
            <div style={S.pageTitle}>{cur?.label}</div>
            <div style={S.pageSub}>{dzisiaj()}</div>
          </div>
          <button style={S.btnPrimary}>
            <i className="ti ti-plus" aria-hidden="true" />
            Nowy
          </button>
        </div>

        {/* ── Router ekranów ── */}
        {screen === 'crm'        && <ScreenPlaceholder name="Klienci / CRM" />}
        {screen === 'wyceny'     && <ScreenPlaceholder name="Wyceny" />}
        {screen === 'zamowienia' && <ScreenPlaceholder name="Zamówienia tkanin" />}
        {screen === 'zlecenia'   && <ScreenPlaceholder name="Zlecenia szycia" />}
        {screen === 'poczta'     && <ScreenPlaceholder name="Poczta" />}
        {screen === 'zadania'    && <ScreenPlaceholder name="Zadania" />}
        {screen === 'kalendarz'  && <ScreenPlaceholder name="Kalendarz" />}
      </main>

    </div>
  )
}
