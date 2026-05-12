import React, { useState, useEffect } from 'react';
import { sbApi } from './supabase.js';
import { buildFabricRows, FABRICS } from './data.js';

var ce = React.createElement;

var GLASS = {
  background: 'rgba(255,255,255,0.68)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.9)',
};

var STATUS_CFG = {
  nowe:        { label: 'Nowe',        color: '#7c3aed', bg: 'rgba(167,139,250,0.13)', border: 'rgba(167,139,250,0.3)' },
  zamowione:   { label: 'Zamówione',   color: '#d97706', bg: 'rgba(245,158,11,0.13)',  border: 'rgba(245,158,11,0.3)'  },
  dostarczone: { label: 'Dostarczone', color: '#059669', bg: 'rgba(52,211,153,0.13)',  border: 'rgba(52,211,153,0.3)'  },
  anulowane:   { label: 'Anulowane',   color: '#dc2626', bg: 'rgba(239,68,68,0.13)',   border: 'rgba(239,68,68,0.3)'   },
};

var SUPPLIERS = ['MARGO TEXTIL', 'SAMA TEKSTIL', 'KAMELEON.PRO', 'VV design', 'Ridex', 'FIBERO G.ROJEK', 'OZLEM', 'Spagnolo', 'Inne'];

function Badge(p) {
  var s = STATUS_CFG[p.status] || STATUS_CFG.nowe;
  return ce('span', {
    style: {
      fontSize: 10, fontWeight: 700, padding: '4px 10px',
      borderRadius: '20px 4px 20px 20px',
      background: s.bg, color: s.color, border: '1px solid ' + s.border,
      whiteSpace: 'nowrap',
    },
  }, s.label);
}

function StatusSelect(p) {
  return ce('select', {
    value: p.value,
    onChange: function(e) { p.onChange(e.target.value); },
    style: {
      fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 8,
      border: '1px solid rgba(167,139,250,0.3)',
      background: 'rgba(255,255,255,0.8)',
      color: 'var(--t1)', cursor: 'pointer', fontFamily: 'inherit',
      outline: 'none',
    },
  },
    Object.keys(STATUS_CFG).map(function(k) {
      return ce('option', { key: k, value: k }, STATUS_CFG[k].label);
    }),
  );
}

// ── ROW ───────────────────────────────────────────────────────────────────────
function OrderRow(p) {
  var o = p.order;
  var s1 = useState(false); var hov = s1[0]; var setHov = s1[1];
  var s2 = useState(false); var open = s2[0]; var setOpen = s2[1];
  var st = STATUS_CFG[o.status] || STATUS_CFG.nowe;

  return ce('div', {
    style: Object.assign({}, GLASS, {
      borderRadius: '14px 4px 14px 14px',
      overflow: 'hidden',
      boxShadow: hov ? '0 8px 28px rgba(30,27,75,0.12)' : '0 2px 8px rgba(30,27,75,0.05)',
      transition: 'box-shadow .15s',
      borderLeft: '3px solid ' + st.color,
    }),
    onMouseEnter: function() { setHov(true); },
    onMouseLeave: function() { setHov(false); },
  },

    // header
    ce('div', {
      onClick: function() { setOpen(!open); },
      style: {
        padding: '14px 18px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 14,
      },
    },

      // fabric name
      ce('div', { style: { flex: 1, minWidth: 0 } },
        ce('div', { style: { fontSize: 14, fontWeight: 700, color: 'var(--t1)', marginBottom: 2 } }, o.fabName),
        ce('div', { style: { fontSize: 11, color: 'var(--t3)' } },
          o.prod + (o.width ? ' · ' + o.width + ' cm szer.' : '') +
          (o.brutto ? ' · ' + o.brutto + ' zł/mb' : '')
        ),
      ),

      // metry
      ce('div', { style: { textAlign: 'right', flexShrink: 0 } },
        ce('div', { style: { fontSize: 16, fontWeight: 800, color: 'var(--t1)' } },
          (Math.ceil(o.metry * 10) / 10).toFixed(1) + ' mb'
        ),
        ce('div', { style: { fontSize: 10, color: 'var(--t3)', marginTop: 1 } }, 'do zamówienia'),
      ),

      // status
      ce('div', { onClick: function(e) { e.stopPropagation(); }, style: { flexShrink: 0 } },
        ce(StatusSelect, { value: o.status || 'nowe', onChange: function(v) { p.onStatusChange(v); } }),
      ),

      // toggle
      ce('div', { style: { color: 'var(--t3)', fontSize: 16, flexShrink: 0, transition: 'transform .2s', transform: open ? 'rotate(90deg)' : 'none' } },
        ce('i', { className: 'ti ti-chevron-right' }),
      ),
    ),

    // details
    open ? ce('div', {
      style: {
        borderTop: '1px solid rgba(167,139,250,0.12)',
        padding: '12px 18px 14px',
        background: 'rgba(167,139,250,0.04)',
      },
    },
      ce('div', { style: { fontSize: 11, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 } }, 'Pozycje'),
      ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
        (o.rooms || []).map(function(r, i) {
          return ce('div', { key: i, style: { fontSize: 12, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 8 } },
            ce('span', { style: { width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', flexShrink: 0, display: 'inline-block' } }),
            r,
          );
        }),
      ),
      o.note ? ce('div', { style: { marginTop: 10, fontSize: 12, color: 'var(--t3)', fontStyle: 'italic' } }, '📝 ' + o.note) : null,
    ) : null,
  );
}

// ── MODAL NOWEGO ZAMÓWIENIA ───────────────────────────────────────────────────
function ModalNew(p) {
  var s1 = useState(''); var fab = s1[0]; var setFab = s1[1];
  var s2 = useState(''); var sup = s2[0]; var setSup = s2[1];
  var s3 = useState(''); var metry = s3[0]; var setMetry = s3[1];
  var s4 = useState(''); var note = s4[0]; var setNote = s4[1];
  var s5 = useState(''); var kolor = s5[0]; var setKolor = s5[1];
  var s6 = useState(''); var cena = s6[0]; var setCena = s6[1];

  var fabObj = FABRICS.find(function(f) { return f.name === fab; });

  var INP = {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: 13,
    border: '1px solid rgba(167,139,250,0.25)', borderRadius: 10,
    background: 'rgba(255,255,255,0.7)', color: 'var(--t1)',
    outline: 'none', fontFamily: 'inherit',
  };

  function handleOk() {
    if (!sup.trim() || !metry) return;
    p.onOk({
      fabName: fab || 'Tkanina ręczna',
      prod: fabObj ? fabObj.prod : sup.trim(),
      brutto: fabObj ? fabObj.brutto : (cena ? +cena : null),
      width: fabObj ? fabObj.width : null,
      metry: parseFloat(metry) || 0,
      rooms: [],
      kolor: kolor.trim(),
      note: note.trim(),
      status: 'nowe',
      created_at: new Date().toISOString(),
    });
  }

  return ce('div', {
    style: {
      position: 'fixed', inset: 0, background: 'rgba(30,27,75,0.35)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    },
    onClick: function(e) { if (e.target === e.currentTarget) p.onClose(); },
  },
    ce('div', {
      style: Object.assign({}, GLASS, {
        borderRadius: '20px 6px 20px 20px',
        padding: '28px 28px 24px',
        width: 460, maxWidth: '95vw',
        boxShadow: '0 20px 60px rgba(30,27,75,0.2)',
        display: 'flex', flexDirection: 'column', gap: 14,
      }),
    },
      ce('div', { style: { fontSize: 16, fontWeight: 800, color: 'var(--t1)', marginBottom: 4 } }, '+ Nowe zamówienie tkaniny'),

      ce('div', null,
        ce('div', { style: { fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 } }, 'Tkanina (opcjonalnie)'),
        ce('input', {
          list: 'fab-list', value: fab, placeholder: 'Nazwa tkaniny z katalogu lub własna…',
          onChange: function(e) {
            setFab(e.target.value);
            var fo = FABRICS.find(function(f) { return f.name === e.target.value; });
            if (fo) { setSup(fo.prod); setCena(String(fo.brutto || '')); }
          },
          style: INP,
        }),
        ce('datalist', { id: 'fab-list' },
          FABRICS.map(function(f) { return ce('option', { key: f.name, value: f.name }); }),
        ),
      ),

      ce('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
        ce('div', null,
          ce('div', { style: { fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 } }, 'Dostawca *'),
          ce('input', {
            list: 'sup-list', value: sup, placeholder: 'np. MARGO TEXTIL',
            onChange: function(e) { setSup(e.target.value); },
            style: INP,
          }),
          ce('datalist', { id: 'sup-list' },
            SUPPLIERS.map(function(s) { return ce('option', { key: s, value: s }); }),
          ),
        ),
        ce('div', null,
          ce('div', { style: { fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 } }, 'Ilość (mb) *'),
          ce('input', {
            type: 'number', min: '0', step: '0.1', value: metry, placeholder: '0.0',
            onChange: function(e) { setMetry(e.target.value); },
            style: INP,
          }),
        ),
        ce('div', null,
          ce('div', { style: { fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 } }, 'Kolor'),
          ce('input', {
            value: kolor, placeholder: 'np. Ecru 01',
            onChange: function(e) { setKolor(e.target.value); },
            style: INP,
          }),
        ),
        ce('div', null,
          ce('div', { style: { fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 } }, 'Cena brutto (zł/mb)'),
          ce('input', {
            type: 'number', min: '0', value: cena, placeholder: fabObj ? String(fabObj.brutto || '') : '',
            onChange: function(e) { setCena(e.target.value); },
            style: INP,
          }),
        ),
      ),

      ce('div', null,
        ce('div', { style: { fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 } }, 'Notatka'),
        ce('input', {
          value: note, placeholder: 'Dodatkowe informacje…',
          onChange: function(e) { setNote(e.target.value); },
          style: INP,
        }),
      ),

      ce('div', { style: { display: 'flex', gap: 10, marginTop: 4 } },
        ce('button', {
          onClick: p.onClose,
          style: {
            flex: 1, padding: '11px', borderRadius: 10,
            border: '1px solid rgba(167,139,250,0.3)',
            background: 'rgba(255,255,255,0.6)', color: 'var(--t2)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          },
        }, 'Anuluj'),
        ce('button', {
          onClick: handleOk,
          disabled: !sup.trim() || !metry,
          style: {
            flex: 2, padding: '11px', borderRadius: 10, border: 'none',
            background: sup.trim() && metry ? 'var(--t1)' : 'var(--bd2)',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: sup.trim() && metry ? 'pointer' : 'default', fontFamily: 'inherit',
          },
        }, 'Dodaj zamówienie'),
      ),
    ),
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
export function ScreenZamowienia(p) {
  var clients = p.clients || [];
  var s1 = useState([]); var orders = s1[0]; var setOrders = s1[1];
  var s2 = useState(false); var showNew = s2[0]; var setShowNew = s2[1];
  var s3 = useState('all'); var filter = s3[0]; var setFilter = s3[1];
  var s4 = useState(''); var search = s4[0]; var setSearch = s4[1];
  var s5 = useState(false); var autoLoaded = s5[0]; var setAutoLoaded = s5[1];

  // Generuj auto-zamówienia z wycen klientów
  useEffect(function() {
    if (!autoLoaded && clients.length > 0) {
      var auto = [];
      clients.forEach(function(cl) {
        var rows = buildFabricRows(cl);
        rows.forEach(function(row) {
          auto.push(Object.assign({ id: cl.id + '_' + row.fabName, clientName: cl.name, status: 'nowe', created_at: cl.updated_at || '' }, row));
        });
      });
      // Merge auto z ręcznymi (z localStorage)
      var manual = [];
      try { manual = JSON.parse(localStorage.getItem('ad_orders') || '[]'); } catch(e) {}
      setOrders(auto.concat(manual));
      setAutoLoaded(true);
    }
  }, [clients, autoLoaded]);

  function saveManual(list) {
    var manual = list.filter(function(o) { return o._manual; });
    try { localStorage.setItem('ad_orders', JSON.stringify(manual)); } catch(e) {}
  }

  function addOrder(data) {
    var o = Object.assign({ id: Date.now() + '_' + Math.random().toString(36).slice(2,6), _manual: true }, data);
    setOrders(function(prev) { var n = [o].concat(prev); saveManual(n); return n; });
    setShowNew(false);
  }

  function changeStatus(id, status) {
    setOrders(function(prev) { return prev.map(function(o) { return o.id === id ? Object.assign({}, o, { status: status }) : o; }); });
  }

  var FILTERS = [
    { id: 'all',        label: 'Wszystkie' },
    { id: 'nowe',       label: 'Nowe'       },
    { id: 'zamowione',  label: 'Zamówione'  },
    { id: 'dostarczone',label: 'Dostarczone'},
  ];

  var filtered = orders.filter(function(o) {
    var matchFilter = filter === 'all' || o.status === filter;
    var q = search.toLowerCase();
    var matchSearch = !q || (o.fabName || '').toLowerCase().includes(q) || (o.prod || '').toLowerCase().includes(q) || (o.clientName || '').toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  var totalMetry = filtered.reduce(function(a, o) { return a + (o.metry || 0); }, 0);
  var totalWart = filtered.reduce(function(a, o) { return a + (o.metry || 0) * (o.brutto || 0); }, 0);

  return ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 18 } },

    // hero stats
    ce('div', {
      style: {
        background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#4338ca 100%)',
        borderRadius: '24px 8px 24px 24px',
        padding: '22px 28px',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(30,27,75,0.22)',
      },
    },
      ce('div', { style: { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(167,139,250,0.18)', pointerEvents: 'none' } }),
      ce('div', { style: { position: 'relative', zIndex: 1 } },
        ce('div', { style: { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 } }, 'Łączna wartość zamówień'),
        ce('div', { style: { fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1 } },
          totalWart > 0 ? Math.round(totalWart) + ' zł' : '—'
        ),
        ce('div', { style: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 6 } },
          orders.length + ' pozycji · ' + totalMetry.toFixed(1) + ' mb łącznie'
        ),
      ),
      ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', position: 'relative', zIndex: 1 } },
        ce('div', { style: { background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '20px 6px 20px 20px', padding: '6px 14px', fontSize: 12, color: '#6ee7b7', fontWeight: 600 } },
          orders.filter(function(o) { return o.status === 'dostarczone'; }).length + ' dostarczono'
        ),
        ce('div', { style: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px 20px 20px 20px', padding: '6px 14px', fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 500 } },
          orders.filter(function(o) { return o.status === 'zamowione'; }).length + ' w drodze'
        ),
      ),
    ),

    // search + filtry
    ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
      ce('div', Object.assign({}, { style: Object.assign({}, GLASS, {
        borderRadius: '14px 4px 14px 14px', padding: '11px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
      }) }),
        ce('i', { className: 'ti ti-search', style: { fontSize: 17, color: '#a0aec0' } }),
        ce('input', {
          value: search, onChange: function(e) { setSearch(e.target.value); },
          placeholder: 'Szukaj tkaniny, dostawcy, klienta…',
          style: { border: 'none', background: 'transparent', fontSize: 14, color: 'var(--t1)', outline: 'none', width: '100%', fontFamily: 'inherit' },
        }),
        search ? ce('button', { onClick: function() { setSearch(''); }, style: { border: 'none', background: 'none', cursor: 'pointer', color: '#a0aec0', fontSize: 18, lineHeight: 1 } }, '×') : null,
      ),

      ce('div', {
        style: {
          display: 'flex', gap: 3,
          background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.85)', borderRadius: 12, padding: 4,
        },
      },
        FILTERS.map(function(f) {
          var active = filter === f.id;
          var cnt = f.id === 'all' ? orders.length : orders.filter(function(o) { return o.status === f.id; }).length;
          return ce('button', {
            key: f.id,
            onClick: function() { setFilter(f.id); },
            style: {
              flex: 1, padding: '7px 4px', borderRadius: 9, border: 'none',
              background: active ? 'linear-gradient(135deg,#a78bfa,#818cf8)' : 'transparent',
              color: active ? '#fff' : 'var(--t3)',
              fontWeight: active ? 700 : 400, fontSize: 11, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              fontFamily: 'inherit', transition: 'all .15s',
              boxShadow: active ? '0 2px 8px rgba(167,139,250,0.35)' : 'none',
            },
          },
            ce('span', null, f.label),
            ce('span', { style: { fontSize: 9, opacity: 0.75 } }, cnt),
          );
        }),
      ),
    ),

    // dodaj ręcznie
    ce('button', {
      onClick: function() { setShowNew(true); },
      style: {
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 20px',
        background: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        border: '1.5px dashed rgba(167,139,250,0.4)',
        borderRadius: '14px 4px 14px 14px',
        cursor: 'pointer', color: '#a78bfa',
        fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
        width: '100%', boxSizing: 'border-box',
      },
    },
      ce('i', { className: 'ti ti-plus', style: { fontSize: 18 } }),
      'Dodaj zamówienie ręcznie',
    ),

    // lista
    filtered.length === 0
      ? ce('div', Object.assign({}, { style: Object.assign({}, GLASS, {
          borderRadius: '20px 6px 20px 20px', padding: '48px', textAlign: 'center',
        }) }),
          ce('div', { style: { fontSize: 32, marginBottom: 12, opacity: 0.4 } }, '🧵'),
          ce('div', { style: { fontSize: 15, fontWeight: 700, color: 'var(--t1)', marginBottom: 6 } }, search ? 'Brak wyników' : 'Brak zamówień'),
          ce('div', { style: { fontSize: 13, color: '#a0aec0' } }, search ? 'Spróbuj innej frazy' : 'Zamówienia generują się automatycznie z wycen klientów'),
        )
      : ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          filtered.map(function(o) {
            return ce(OrderRow, {
              key: o.id, order: o,
              onStatusChange: function(v) { changeStatus(o.id, v); },
            });
          }),
        ),

    showNew ? ce(ModalNew, { onOk: addOrder, onClose: function() { setShowNew(false); } }) : null,
  );
}
