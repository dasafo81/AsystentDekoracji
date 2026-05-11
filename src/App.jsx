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

var NEU_OUT = '6px 6px 16px var(--m-dark), -4px -4px 12px var(--m-light)'
var NEU_IN  = 'inset 4px 4px 10px var(--m-dark), inset -3px -3px 8px var(--m-light)'

function ScreenPlaceholder({ name }) {
  return (
    <div style={{ padding: '32px' }}>
      <div style={{ background: 'var(--m-bg)', borderRadius: 18, padding: '48px', textAlign: 'center', boxShadow: NEU_IN }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🚧</div>
        <div style={{ fontWeight: 700, color: 'var(--m-text)', marginBottom: 6 }}>{name}</div>
        <div style={{ color: 'var(--m-muted)', fontSize: 13 }}>Moduł w budowie</div>
      </div>
    </div>
  )
}

function dzisiaj() {
  return new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function App() {
  const [screen, setScreen] = useState('crm')
  const [clients, setClients] = useState([])
  const [curClientId, setCurClientId] = useState(null)
  const [gcalToken, setGcalToken] = useState(null)
  const [gsiReady, setGsiReady] = useState(false)

  useEffect(function() {
    sbApi.getClients().then(function(data) { setClients(data || []) }).catch(function() {})
  }, [])

  useEffect(function() {
    gcalWaitReady().then(function() {
      setGsiReady(true)
      if (gcalHasValidToken()) {
        gcalGetToken().then(function(tok) { setGcalToken(tok) }).catch(function() {})
      }
    }).catch(function() {})
  }, [])

  var cur = NAV.find(function(n) { return n.id === screen })

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>

      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0, background: 'var(--sb-bg)',
        display: 'flex', flexDirection: 'column', padding: '28px 0', zIndex: 10,
        boxShadow: 'inset -5px 0 15px var(--sb-dark), inset 3px 3px 10px var(--sb-light), 8px 0 24px rgba(80,110,100,0.3)',
      }}>
        {/* Logo */}
        <div style={{ padding: '0 20px 22px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 9,
            background: 'var(--sb-bg)', borderRadius: 16, padding: '9px 13px', marginBottom: 12,
            boxShadow: 'var(--neu-sb-out)',
          }}>
            <i className="ti ti-ripple" style={{ fontSize: 20, color: 'var(--sb-accent)' }} aria-hidden="true" />
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sb-text)', lineHeight: 1.25 }}>
              Asystent<br />Dekoracji
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--sb-muted)', letterSpacing: '0.07em' }}>by Porter Design</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '14px 0', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NAV.map(function(item) {
            var active = screen === item.id
            return (
              <div
                key={item.id}
                onClick={function() { setScreen(item.id) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  margin: '0 12px', padding: '11px 14px',
                  fontSize: 13, borderRadius: 14, cursor: 'pointer',
                  color: active ? 'var(--sb-text)' : 'var(--sb-muted)',
                  fontWeight: active ? 700 : 400,
                  background: 'var(--sb-bg)',
                  boxShadow: active ? 'var(--neu-sb-out)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                <i className={'ti ' + item.icon} style={{ fontSize: 17, color: active ? 'var(--sb-accent)' : 'inherit' }} aria-hidden="true" />
                {item.label}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '16px 20px 0', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--sb-bg)', boxShadow: 'var(--neu-sb-out)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: 'var(--sb-accent)',
            }}>PP</div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--sb-text)', fontWeight: 600 }}>Paulina Porter</div>
              <div style={{ fontSize: 10, color: 'var(--sb-muted)' }}>Administrator</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, background: 'var(--m-bg)', overflowY: 'auto', boxShadow: 'inset 6px 0 20px var(--m-dark)' }}>

        {/* Topbar */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '28px 28px 0', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--m-text)' }}>{cur?.label}</div>
            <div style={{ fontSize: 12, color: 'var(--m-muted)', marginTop: 3 }}>{dzisiaj()}</div>
          </div>
          {screen === 'crm' && (
            <button
              onClick={function() { setScreen('crm') }}
              style={{ background: 'var(--m-bg)', color: 'var(--accent)', border: 'none', borderRadius: 14, padding: '11px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, boxShadow: NEU_OUT }}
            >
              <i className="ti ti-plus" aria-hidden="true" /> Nowy klient
            </button>
          )}
        </div>

        {/* Zawartość ekranu */}
        <div style={{ padding: '0 28px 40px' }}>
          {screen === 'crm' && (
            <ScreenCRM
              clients={clients}
              setScreen={setScreen}
              setCurClientId={setCurClientId}
              gcalToken={gcalToken}
              setGcalToken={setGcalToken}
              gsiReady={gsiReady}
              onClientStatusChange={function(clientId, status) {
                setClients(function(prev) { return prev.map(function(c) { return String(c.id) === String(clientId) ? Object.assign({}, c, { status: status }) : c }) })
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
