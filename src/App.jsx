import React, { useState, useEffect } from 'react'
import { sbApi } from './supabase.js'
import { gcalWaitReady, gcalGetToken, gcalHasValidToken } from './gcal.js'
import { ScreenCRM } from './ScreenCRM.jsx'

var NAV = [
  { id: 'crm',        label: 'Klienci',    icon: 'ti-users' },
  { id: 'wyceny',     label: 'Wyceny',     icon: 'ti-file-invoice' },
  { id: 'zamowienia', label: 'Zamówienia', icon: 'ti-shopping-bag' },
  { id: 'zlecenia',   label: 'Zlecenia',   icon: 'ti-needle' },
  { id: 'poczta',     label: 'Poczta',     icon: 'ti-mail' },
  { id: 'zadania',    label: 'Zadania',    icon: 'ti-checkbox' },
  { id: 'kalendarz',  label: 'Kalendarz',  icon: 'ti-calendar' },
]

function ScreenPlaceholder({ name }) {
  return (
    <div style={{ padding: '32px' }}>
      <div style={{
        background: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.85)',
        borderRadius: '24px 6px 24px 24px',
        padding: '56px',
        textAlign: 'center',
        boxShadow: '0 4px 24px rgba(30,27,75,0.07)',
      }}>
        <div style={{ fontSize: 36, marginBottom: 14 }}>🚧</div>
        <div style={{ fontWeight: 800, color: 'var(--t1)', fontSize: 16, marginBottom: 6 }}>{name}</div>
        <div style={{ color: 'var(--t3)', fontSize: 13 }}>Moduł w budowie</div>
      </div>
    </div>
  )
}

function dzisiaj() {
  return new Date().toLocaleDateString('pl-PL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

export default function App() {
  const [screen, setScreen]         = useState('crm')
  const [clients, setClients]       = useState([])
  const [curClientId, setCurClientId] = useState(null)
  const [gcalToken, setGcalToken]   = useState(null)
  const [gsiReady, setGsiReady]     = useState(false)

  useEffect(function() {
    sbApi.getClients().then(function(d) { setClients(d || []) }).catch(function() {})
  }, [])

  useEffect(function() {
    gcalWaitReady().then(function() {
      setGsiReady(true)
      if (gcalHasValidToken()) {
        gcalGetToken().then(function(t) { setGcalToken(t) }).catch(function() {})
      }
    }).catch(function() {})
  }, [])

  var cur = NAV.find(function(n) { return n.id === screen })

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', position: 'relative', background: 'var(--bg)' }}>

      {/* ── Holograficzne blobsy ── */}
      <div className="blob" style={{ width: 420, height: 420, background: 'var(--blob1)', top: -140, left: 60 }} />
      <div className="blob" style={{ width: 320, height: 320, background: 'var(--blob2)', top: 220, right: -80 }} />
      <div className="blob" style={{ width: 260, height: 260, background: 'var(--blob3)', bottom: -60, left: 280 }} />
      <div className="blob" style={{ width: 200, height: 200, background: 'var(--blob4)', bottom: 100, right: 200 }} />

      {/* ── Sidebar ── */}
      <aside style={{
        width: 230,
        flexShrink: 0,
        background: 'var(--sb-bg)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        position: 'relative',
        zIndex: 10,
        boxShadow: '4px 0 32px rgba(30,27,75,0.25)',
      }}>

        {/* Logo */}
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--sb-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <div style={{
              width: 42, height: 42, borderRadius: '14px 6px 14px 14px',
              background: 'linear-gradient(135deg, #a78bfa, #34d399)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 900, color: '#fff', flexShrink: 0,
              boxShadow: '0 4px 20px rgba(167,139,250,0.5)',
            }}>A</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--sb-text)', lineHeight: 1.2 }}>
                Asystent<br />Dekoracji
              </div>
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--sb-muted)', letterSpacing: '0.08em', paddingLeft: 54 }}>
            by Porter Design
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NAV.map(function(item) {
            var active = screen === item.id
            return (
              <div
                key={item.id}
                onClick={function() { setScreen(item.id) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: '11px 14px',
                  borderRadius: active ? '14px 6px 14px 14px' : '12px',
                  cursor: 'pointer',
                  color: active ? '#fff' : 'var(--sb-muted)',
                  fontWeight: active ? 700 : 400,
                  fontSize: 13,
                  background: active ? 'var(--sb-active)' : 'transparent',
                  borderLeft: active ? '3px solid #a78bfa' : '3px solid transparent',
                  transition: 'all 0.15s',
                  position: 'relative',
                }}
              >
                <i
                  className={'ti ' + item.icon}
                  style={{ fontSize: 18, color: active ? '#a78bfa' : 'inherit', flexShrink: 0 }}
                  aria-hidden="true"
                />
                {item.label}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '16px 20px 0', borderTop: '1px solid var(--sb-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #a78bfa, #34d399)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
              boxShadow: '0 2px 10px rgba(167,139,250,0.4)',
            }}>PP</div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--sb-text)', fontWeight: 700 }}>Paulina Porter</div>
              <div style={{ fontSize: 10, color: 'var(--sb-muted)', marginTop: 1 }}>Administrator</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* Topbar */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '28px 32px 0',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.5px' }}>
              {cur?.label}
            </div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>{dzisiaj()}</div>
          </div>

          {screen === 'crm' && (
            <button
              style={{
                background: 'var(--sb-bg)',
                color: '#fff', border: 'none',
                borderRadius: '20px 8px 20px 8px',
                padding: '12px 22px',
                fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: 'var(--shadow-btn)',
              }}
            >
              <i className="ti ti-plus" style={{ fontSize: 16 }} aria-hidden="true" />
              Nowy klient
            </button>
          )}
        </div>

        {/* Treść */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px 40px' }}>
          {screen === 'crm' && (
            <ScreenCRM
              clients={clients}
              setScreen={setScreen}
              setCurClientId={setCurClientId}
              gcalToken={gcalToken}
              setGcalToken={setGcalToken}
              gsiReady={gsiReady}
              onClientStatusChange={function(clientId, status) {
                setClients(function(prev) {
                  return prev.map(function(c) {
                    return String(c.id) === String(clientId)
                      ? Object.assign({}, c, { status })
                      : c
                  })
                })
              }}
            />
          )}
          {screen === 'wyceny'     && <ScreenPlaceholder name="Wyceny" />}
          {screen === 'zamowienia' && <ScreenPlaceholder name="Zamówienia tkanin" />}
          {screen === 'zlecenia'   && <ScreenPlaceholder name="Zlecenia szycia" />}
          {screen === 'poczta'     && <ScreenPlaceholder name="Poczta" />}
          {screen === 'zadania'    && <ScreenPlaceholder name="Zadania" />}
          {screen === 'kalendarz'  && <ScreenPlaceholder name="Kalendarz" />}
        </div>
      </main>
    </div>
  )
}
