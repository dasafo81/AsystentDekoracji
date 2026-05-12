import React, { useState } from 'react';

var ce = React.createElement;

var GLASS = {
  background: 'rgba(255,255,255,0.68)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.9)',
};
var SHADOW = '0 4px 24px rgba(30,27,75,0.07)';

var STATUS_COLORS = {
  'nowe':         { bg: 'rgba(167,139,250,0.12)', color: '#7c3aed', border: 'rgba(167,139,250,0.25)' },
  'w toku':       { bg: 'rgba(52,211,153,0.12)',  color: '#059669', border: 'rgba(52,211,153,0.25)'  },
  'zrealizowane': { bg: 'rgba(96,165,250,0.12)',  color: '#1d4ed8', border: 'rgba(96,165,250,0.25)'  },
  'odrzucone':    { bg: 'rgba(248,113,113,0.12)', color: '#dc2626', border: 'rgba(248,113,113,0.25)' },
};

var AVATAR_COLORS = [
  { bg: 'linear-gradient(135deg,#ede9fe,#c4b5fd)', color: '#5b21b6' },
  { bg: 'linear-gradient(135deg,#d1fae5,#6ee7b7)', color: '#065f46' },
  { bg: 'linear-gradient(135deg,#fce7f3,#f9a8d4)', color: '#9d174d' },
  { bg: 'linear-gradient(135deg,#fef3c7,#fcd34d)', color: '#92400e' },
  { bg: 'linear-gradient(135deg,#dbeafe,#93c5fd)', color: '#1e40af' },
];

function avatarColor(name) {
  var i = 0;
  for (var j = 0; j < (name || '').length; j++) i += name.charCodeAt(j);
  return AVATAR_COLORS[i % AVATAR_COLORS.length];
}

function initials(name) {
  if (!name) return '?';
  var pts = name.trim().split(' ');
  if (pts.length >= 2) return (pts[0][0] + pts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function clientStats(cl) {
  var rooms = cl.rooms || [];
  var roomCount = rooms.length;
  var winCount = rooms.reduce(function(a, r) { return a + (r.windows || []).length; }, 0);
  var total = rooms.reduce(function(a, r) {
    return a + (r.windows || []).reduce(function(b, w) {
      return b + (w.products || []).reduce(function(c, p) { return c + (p.mp != null ? p.mp : 0); }, 0);
    }, 0);
  }, 0);
  return { roomCount: roomCount, winCount: winCount, total: Math.round(total / 10) * 10 };
}

var CARD_RADII = ['20px 6px 20px 20px', '6px 20px 20px 20px', '20px 20px 6px 20px', '20px 20px 20px 6px'];

function WycenaCard(p) {
  var cl = p.client;
  var idx = p.index;
  var av = avatarColor(cl.name);
  var stats = clientStats(cl);
  var st = STATUS_COLORS[cl.status] || STATUS_COLORS['nowe'];
  var hasQuote = stats.total > 0;

  return ce('div', {
    onClick: p.onClick,
    style: Object.assign({}, GLASS, {
      borderRadius: CARD_RADII[idx % 4],
      padding: '18px 20px',
      cursor: 'pointer',
      boxShadow: SHADOW,
      transition: 'transform .12s, box-shadow .12s',
      display: 'flex', alignItems: 'center', gap: 14,
      borderLeft: hasQuote ? '3px solid #a78bfa' : '3px solid rgba(167,139,250,0.2)',
    }),
    onMouseEnter: function(e) {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 8px 32px rgba(30,27,75,0.13)';
    },
    onMouseLeave: function(e) {
      e.currentTarget.style.transform = 'none';
      e.currentTarget.style.boxShadow = SHADOW;
    },
  },

    // Avatar
    ce('div', {
      style: {
        width: 46, height: 46, flexShrink: 0,
        borderRadius: CARD_RADII[idx % 4].split(' ')[0] + ' 6px 14px 14px',
        background: av.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 800, color: av.color,
      },
    }, initials(cl.name)),

    // Info
    ce('div', { style: { flex: 1, minWidth: 0 } },
      ce('div', { style: { fontSize: 14, fontWeight: 700, color: '#1e1b4b', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, cl.name),
      ce('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
        stats.roomCount > 0
          ? ce('span', { style: { fontSize: 11, color: '#a0aec0' } }, stats.roomCount + ' ' + (stats.roomCount === 1 ? 'pomieszczenie' : stats.roomCount < 5 ? 'pomieszczenia' : 'pomieszczeń'))
          : ce('span', { style: { fontSize: 11, color: '#c4b5fd', fontStyle: 'italic' } }, 'brak pomieszczeń'),
        stats.winCount > 0
          ? ce('span', { style: { fontSize: 11, color: '#a0aec0' } }, '· ' + stats.winCount + ' ' + (stats.winCount === 1 ? 'okno' : stats.winCount < 5 ? 'okna' : 'okien'))
          : null,
        cl.addr ? ce('span', { style: { fontSize: 11, color: '#c4b5fd' } }, '· ' + cl.addr) : null,
      ),
    ),

    // Status badge
    ce('span', {
      style: {
        fontSize: 10, fontWeight: 700, padding: '4px 10px',
        borderRadius: idx % 2 === 0 ? '20px 4px 20px 20px' : '4px 20px 20px 20px',
        background: st.bg, color: st.color, border: '1px solid ' + st.border,
        whiteSpace: 'nowrap', flexShrink: 0,
      },
    }, cl.status || 'nowe'),

    // Wartość
    hasQuote
      ? ce('div', { style: { textAlign: 'right', flexShrink: 0 } },
          ce('div', { style: { fontSize: 16, fontWeight: 800, color: '#1e1b4b' } }, stats.total + ' zł'),
          ce('div', { style: { fontSize: 10, color: '#a0aec0', marginTop: 2 } }, 'wycena'),
        )
      : ce('div', { style: { textAlign: 'right', flexShrink: 0 } },
          ce('div', { style: { fontSize: 12, color: '#c4b5fd', fontWeight: 600 } }, 'brak wyceny'),
        ),

    ce('div', { style: { color: '#a0aec0', fontSize: 18, flexShrink: 0 } },
      ce('i', { className: 'ti ti-chevron-right' }),
    ),
  );
}

export function ScreenWyceny(p) {
  var clients = p.clients || [];
  var s1 = useState(''); var search = s1[0]; var setSearch = s1[1];
  var s2 = useState('all'); var filter = s2[0]; var setFilter = s2[1];

  // Filtrowanie po wyszukiwarce
  var bySearch = clients.filter(function(cl) {
    if (!search) return true;
    var q = search.toLowerCase();
    return (cl.name || '').toLowerCase().includes(q)
      || (cl.addr || '').toLowerCase().includes(q)
      || (cl.email || '').toLowerCase().includes(q);
  });

  // Filtrowanie po statusie
  var filtered = bySearch.filter(function(cl) {
    if (filter === 'all')    return true;
    if (filter === 'active') return cl.status !== 'zrealizowane' && cl.status !== 'odrzucone';
    if (filter === 'done')   return cl.status === 'zrealizowane';
    if (filter === 'brak')   return clientStats(cl).total === 0;
    return true;
  });

  // Posortuj — najpierw ci z wycenami, potem bez
  filtered = filtered.slice().sort(function(a, b) {
    return clientStats(b).total - clientStats(a).total;
  });

  // Sumy
  var totalVal = clients.reduce(function(a, cl) { return a + clientStats(cl).total; }, 0);
  var withQuote = clients.filter(function(cl) { return clientStats(cl).total > 0; }).length;
  var totalRooms = clients.reduce(function(a, cl) { return a + (cl.rooms || []).length; }, 0);

  var FILTERS = [
    { id: 'all',    label: 'Wszystkie', count: clients.length },
    { id: 'active', label: 'Aktywne',   count: clients.filter(function(c) { return c.status !== 'zrealizowane' && c.status !== 'odrzucone'; }).length },
    { id: 'done',   label: 'Zrealizowane', count: clients.filter(function(c) { return c.status === 'zrealizowane'; }).length },
    { id: 'brak',   label: 'Bez wyceny', count: clients.filter(function(c) { return clientStats(c).total === 0; }).length },
  ];

  return ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 18 } },

    // ── HERO STATS ──
    ce('div', {
      style: {
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
        borderRadius: '24px 8px 24px 24px',
        padding: '24px 28px',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(30,27,75,0.22)',
      },
    },
      ce('div', { style: { position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(167,139,250,0.18)', pointerEvents: 'none' } }),
      ce('div', { style: { position: 'absolute', bottom: -30, left: 60, width: 130, height: 130, borderRadius: '50%', background: 'rgba(52,211,153,0.13)', pointerEvents: 'none' } }),

      ce('div', { style: { position: 'relative', zIndex: 1 } },
        ce('div', { style: { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 } }, 'Łączna wartość wycen'),
        ce('div', { style: { fontSize: 34, fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1 } },
          totalVal > 0 ? totalVal + ' zł' : '—'
        ),
        ce('div', { style: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 6 } },
          withQuote + ' wycen · ' + totalRooms + ' ' + (totalRooms === 1 ? 'pomieszczenie' : totalRooms < 5 ? 'pomieszczenia' : 'pomieszczeń')
        ),
      ),

      ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', position: 'relative', zIndex: 1 } },
        ce('div', { style: { background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '20px 6px 20px 20px', padding: '6px 14px', fontSize: 12, color: '#6ee7b7', fontWeight: 600 } },
          withQuote + ' z wyceną'
        ),
        ce('div', { style: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px 20px 20px 20px', padding: '6px 14px', fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 500 } },
          clients.length + ' klientów'
        ),
      ),
    ),

    // ── SEARCH + FILTERS ──
    ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
      ce('div', Object.assign({}, { style: Object.assign({}, GLASS, {
        borderRadius: '14px 4px 14px 14px',
        padding: '11px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 2px 12px rgba(30,27,75,0.05)',
      }) }),
        ce('i', { className: 'ti ti-search', style: { fontSize: 17, color: '#a0aec0' } }),
        ce('input', {
          value: search,
          onChange: function(e) { setSearch(e.target.value); },
          placeholder: 'Szukaj klienta — imię, adres, email…',
          style: {
            border: 'none', background: 'transparent',
            fontSize: 14, color: '#1e1b4b', outline: 'none', width: '100%',
            fontFamily: 'inherit',
          },
        }),
        search ? ce('button', {
          onClick: function() { setSearch(''); },
          style: { border: 'none', background: 'none', cursor: 'pointer', color: '#a0aec0', fontSize: 18, lineHeight: 1 },
        }, '×') : null,
      ),

      // Filtry
      ce('div', {
        style: {
          display: 'flex', gap: 3,
          background: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.85)',
          borderRadius: 12, padding: 4,
        },
      },
        FILTERS.map(function(f) {
          var active = filter === f.id;
          return ce('button', {
            key: f.id,
            onClick: function() { setFilter(f.id); },
            style: {
              flex: 1, padding: '7px 4px', borderRadius: 9, border: 'none',
              background: active ? 'linear-gradient(135deg,#a78bfa,#818cf8)' : 'transparent',
              color: active ? '#fff' : 'var(--t3)',
              fontWeight: active ? 700 : 400, fontSize: 11, cursor: 'pointer',
              boxShadow: active ? '0 2px 8px rgba(167,139,250,0.35)' : 'none',
              transition: 'all .15s',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
              fontFamily: 'inherit',
            },
          },
            ce('span', null, f.label),
            ce('span', { style: { fontSize: 9, opacity: 0.75 } }, f.count),
          );
        }),
      ),
    ),

    // ── LISTA ──
    filtered.length > 0
      ? ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          ce('div', { style: { fontSize: 11, fontWeight: 700, color: '#a0aec0', letterSpacing: '0.09em', textTransform: 'uppercase', marginBottom: 2 } },
            search ? filtered.length + ' wyników' : 'Wyceny klientów',
          ),
          filtered.map(function(cl, i) {
            return ce(WycenaCard, {
              key: cl.id, client: cl, index: i,
              onClick: function() { p.onClientClick && p.onClientClick(cl); },
            });
          }),
        )
      : ce('div', Object.assign({}, { style: Object.assign({}, GLASS, {
          borderRadius: '20px 6px 20px 20px',
          padding: '48px', textAlign: 'center', boxShadow: SHADOW,
        }) }),
          ce('div', { style: { fontSize: 32, marginBottom: 12 } }, search ? '🔍' : '📄'),
          ce('div', { style: { fontSize: 15, fontWeight: 700, color: '#1e1b4b', marginBottom: 6 } },
            search ? 'Brak wyników dla "' + search + '"' : 'Brak klientów'
          ),
          ce('div', { style: { fontSize: 13, color: '#a0aec0' } },
            search ? 'Spróbuj innej frazy' : 'Dodaj klientów w module Klienci'
          ),
        ),
  );
}
