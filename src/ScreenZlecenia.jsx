import React, { useState, useEffect } from 'react';
import { buildSewingRows } from './data.js';

var ce = React.createElement;

var GLASS = {
  background: 'rgba(255,255,255,0.68)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.9)',
};

var STATUS_CFG = {
  nowe:       { label: 'Nowe',       color: '#7c3aed', bg: 'rgba(167,139,250,0.13)', border: 'rgba(167,139,250,0.3)' },
  w_realizacji:{ label: 'W realizacji', color: '#d97706', bg: 'rgba(245,158,11,0.13)', border: 'rgba(245,158,11,0.3)' },
  gotowe:     { label: 'Gotowe',     color: '#059669', bg: 'rgba(52,211,153,0.13)',  border: 'rgba(52,211,153,0.3)'  },
  wydane:     { label: 'Wydane',     color: '#1d4ed8', bg: 'rgba(96,165,250,0.13)',  border: 'rgba(96,165,250,0.3)'  },
};

var DETAIL_LABELS = {
  type:          'Typ',
  fabric:        'Tkanina',
  fabW:          'Szer. tkaniny',
  kolor:         'Kolor',
  metry:         'Ilość (mb)',
  hCm:           'Wys. (cm)',
  wCm:           'Szer. (cm)',
  nadprozeCm:    'Nadproże (cm)',
  szStyle:       'Styl szycia',
  marszczenie:   'Marszczenie',
  tasma:         'Taśma',
  haczyk:        'Haczyk',
  split:         'Podział',
  bottom:        'Dół',
  glide:         'Glide',
  leadInSides:   'Lead-in boki',
  podszewka:     'Podszewka',
  boczki:        'Boczki',
  rSystem:       'System',
  stronaObslugi: 'Strona obsługi',
  lancuszek:     'Łańcuszek',
  tasmaNaStojaco:'Taśma na stojąco',
};

function StatusSelect(p) {
  return ce('select', {
    value: p.value,
    onChange: function(e) { p.onChange(e.target.value); },
    onClick: function(e) { e.stopPropagation(); },
    style: {
      fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 8,
      border: '1px solid rgba(167,139,250,0.3)',
      background: 'rgba(255,255,255,0.8)',
      color: 'var(--t1)', cursor: 'pointer', fontFamily: 'inherit', outline: 'none',
    },
  },
    Object.keys(STATUS_CFG).map(function(k) {
      return ce('option', { key: k, value: k }, STATUS_CFG[k].label);
    }),
  );
}

function ZlecenieRow(p) {
  var z = p.zlecenie;
  var s1 = useState(false); var hov = s1[0]; var setHov = s1[1];
  var s2 = useState(false); var open = s2[0]; var setOpen = s2[1];
  var st = STATUS_CFG[z.status] || STATUS_CFG.nowe;
  var isRoleta = z._type === 'roleta';

  // Wybierz odpowiednie pola do wyświetlenia
  var detailFields = isRoleta
    ? ['type', 'fabric', 'kolor', 'metry', 'hCm', 'wCm', 'nadprozeCm', 'podszewka', 'boczki', 'rSystem', 'stronaObslugi', 'lancuszek']
    : ['type', 'fabric', 'kolor', 'metry', 'hCm', 'wCm', 'szStyle', 'marszczenie', 'tasma', 'haczyk', 'split', 'bottom', 'glide', 'leadInSides', 'podszewka', 'tasmaNaStojaco'];

  return ce('div', {
    style: Object.assign({}, GLASS, {
      borderRadius: '14px 4px 14px 14px', overflow: 'hidden',
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
      style: { padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 14 },
    },
      ce('div', { style: { flex: 1, minWidth: 0 } },
        ce('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 } },
          ce('span', { style: { fontSize: 14, fontWeight: 700, color: 'var(--t1)' } }, z.clientName),
          ce('span', { style: { fontSize: 11, color: 'var(--t3)' } }, '·'),
          ce('span', { style: { fontSize: 12, color: 'var(--t2)' } }, z.room + ' / ' + z.win),
        ),
        ce('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          ce('span', { style: { fontSize: 11, color: '#a78bfa', fontWeight: 600 } }, z.type),
          z.fabric && z.fabric !== '(brak)'
            ? ce('span', { style: { fontSize: 11, color: 'var(--t3)' } }, '· ' + z.fabric)
            : null,
          z.kolor && z.kolor !== '-'
            ? ce('span', { style: { fontSize: 11, color: 'var(--t3)' } }, '· ' + z.kolor)
            : null,
        ),
        z.note ? ce('div', { style: { fontSize: 11, color: 'var(--t3)', marginTop: 3, fontStyle: 'italic' } }, '📝 ' + z.note) : null,
      ),

      // wymiary
      ce('div', { style: { textAlign: 'right', flexShrink: 0, fontSize: 12, color: 'var(--t2)' } },
        ce('div', { style: { fontWeight: 700, fontSize: 13, color: 'var(--t1)' } }, z.wCm + ' × ' + z.hCm + ' cm'),
        z.metry > 0 ? ce('div', { style: { fontSize: 11, color: 'var(--t3)', marginTop: 1 } }, z.metry.toFixed(2) + ' mb') : null,
      ),

      ce('div', { onClick: function(e) { e.stopPropagation(); }, style: { flexShrink: 0, alignSelf: 'center' } },
        ce(StatusSelect, { value: z.status || 'nowe', onChange: function(v) { p.onStatusChange(v); } }),
      ),

      ce('div', { style: { color: 'var(--t3)', fontSize: 16, flexShrink: 0, alignSelf: 'center', transition: 'transform .2s', transform: open ? 'rotate(90deg)' : 'none' } },
        ce('i', { className: 'ti ti-chevron-right' }),
      ),
    ),

    // szczegóły
    open ? ce('div', {
      style: {
        borderTop: '1px solid rgba(167,139,250,0.12)',
        padding: '14px 18px',
        background: 'rgba(167,139,250,0.03)',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px 20px',
      },
    },
      detailFields.filter(function(f) {
        var v = z[f];
        return v != null && v !== '' && v !== '-' && v !== 0;
      }).map(function(f) {
        var v = z[f];
        if (f === 'metry') v = Number(v).toFixed(3) + ' mb';
        return ce('div', { key: f, style: { display: 'flex', flexDirection: 'column' } },
          ce('div', { style: { fontSize: 9, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase' } }, DETAIL_LABELS[f] || f),
          ce('div', { style: { fontSize: 12, color: 'var(--t1)', fontWeight: 500, marginTop: 1 } }, String(v)),
        );
      }),
    ) : null,
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
export function ScreenZlecenia(p) {
  var clients = p.clients || [];
  var s1 = useState([]); var zlecenia = s1[0]; var setZlecenia = s1[1];
  var s2 = useState('all'); var filter = s2[0]; var setFilter = s2[1];
  var s3 = useState(''); var search = s3[0]; var setSearch = s3[1];

  // Generuj zlecenia z wycen
  useEffect(function() {
    if (clients.length > 0) {
      var rows = [];
      clients.forEach(function(cl) {
        var sewRows = buildSewingRows(cl);
        sewRows.forEach(function(r) {
          rows.push(Object.assign({
            id: cl.id + '_' + r.room + '_' + r.win + '_' + r.type + '_' + Math.random(),
            clientName: cl.name,
            status: 'nowe',
          }, r));
        });
      });
      setZlecenia(rows);
    }
  }, [clients]);

  function changeStatus(id, status) {
    setZlecenia(function(prev) {
      return prev.map(function(z) { return z.id === id ? Object.assign({}, z, { status: status }) : z; });
    });
  }

  var FILTERS = [
    { id: 'all',         label: 'Wszystkie'    },
    { id: 'nowe',        label: 'Nowe'         },
    { id: 'w_realizacji',label: 'W realizacji' },
    { id: 'gotowe',      label: 'Gotowe'       },
    { id: 'wydane',      label: 'Wydane'       },
  ];

  var filtered = zlecenia.filter(function(z) {
    var matchFilter = filter === 'all' || z.status === filter;
    var q = search.toLowerCase();
    var matchSearch = !q
      || (z.clientName || '').toLowerCase().includes(q)
      || (z.room || '').toLowerCase().includes(q)
      || (z.type || '').toLowerCase().includes(q)
      || (z.fabric || '').toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  var totalMetry = filtered.reduce(function(a, z) { return a + (z.metry || 0); }, 0);

  return ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 18 } },

    // hero stats
    ce('div', {
      style: {
        background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 55%,#0d9488 100%)',
        borderRadius: '24px 8px 24px 24px', padding: '22px 28px',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(30,27,75,0.22)',
      },
    },
      ce('div', { style: { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(52,211,153,0.15)', pointerEvents: 'none' } }),
      ce('div', { style: { position: 'relative', zIndex: 1 } },
        ce('div', { style: { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 } }, 'Zlecenia szycia'),
        ce('div', { style: { fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1 } }, zlecenia.length + ' szt.'),
        ce('div', { style: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 6 } },
          totalMetry.toFixed(1) + ' mb łącznie · ' + clients.length + ' klientów'
        ),
      ),
      ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', position: 'relative', zIndex: 1 } },
        ce('div', { style: { background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '20px 6px 20px 20px', padding: '6px 14px', fontSize: 12, color: '#6ee7b7', fontWeight: 600 } },
          zlecenia.filter(function(z) { return z.status === 'gotowe' || z.status === 'wydane'; }).length + ' ukończono'
        ),
        ce('div', { style: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px 20px 20px 20px', padding: '6px 14px', fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 500 } },
          zlecenia.filter(function(z) { return z.status === 'w_realizacji'; }).length + ' w realizacji'
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
          placeholder: 'Szukaj klienta, pomieszczenia, tkaniny…',
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
          var cnt = f.id === 'all' ? zlecenia.length : zlecenia.filter(function(z) { return z.status === f.id; }).length;
          return ce('button', {
            key: f.id,
            onClick: function() { setFilter(f.id); },
            style: {
              flex: 1, padding: '7px 4px', borderRadius: 9, border: 'none',
              background: active ? 'linear-gradient(135deg,#a78bfa,#34d399)' : 'transparent',
              color: active ? '#fff' : 'var(--t3)',
              fontWeight: active ? 700 : 400, fontSize: 10, cursor: 'pointer',
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

    // lista
    filtered.length === 0
      ? ce('div', Object.assign({}, { style: Object.assign({}, GLASS, {
          borderRadius: '20px 6px 20px 20px', padding: '48px', textAlign: 'center',
        }) }),
          ce('div', { style: { fontSize: 32, marginBottom: 12, opacity: 0.4 } }, '✂️'),
          ce('div', { style: { fontSize: 15, fontWeight: 700, color: 'var(--t1)', marginBottom: 6 } }, search ? 'Brak wyników' : 'Brak zleceń'),
          ce('div', { style: { fontSize: 13, color: '#a0aec0' } },
            search ? 'Spróbuj innej frazy' : 'Zlecenia generują się automatycznie z wycen klientów (zasłony, rolety, firanki)'
          ),
        )
      : ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          filtered.map(function(z) {
            return ce(ZlecenieRow, {
              key: z.id, zlecenie: z,
              onStatusChange: function(v) { changeStatus(z.id, v); },
            });
          }),
        ),
  );
}
