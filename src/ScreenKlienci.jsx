import React, { useState } from 'react';
import { sbApi } from './supabase.js';
import { ModalClient } from './ModalClient.jsx';

var ce = React.createElement;

var GLASS = {
  background: 'rgba(255,255,255,0.68)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.9)',
};

var SHADOW = '0 4px 24px rgba(30,27,75,0.07)';
var SHADOW_SM = '0 2px 12px rgba(30,27,75,0.05)';

var STATUS_COLORS = {
  'nowe':        { bg: 'rgba(167,139,250,0.12)', color: '#7c3aed', border: 'rgba(167,139,250,0.25)' },
  'w toku':      { bg: 'rgba(52,211,153,0.12)',  color: '#059669', border: 'rgba(52,211,153,0.25)'  },
  'zrealizowane':{ bg: 'rgba(96,165,250,0.12)',  color: '#1d4ed8', border: 'rgba(96,165,250,0.25)'  },
  'odrzucone':   { bg: 'rgba(248,113,113,0.12)', color: '#dc2626', border: 'rgba(248,113,113,0.25)' },
};

var AVATAR_COLORS = [
  { bg: 'linear-gradient(135deg,#ede9fe,#c4b5fd)', color: '#5b21b6' },
  { bg: 'linear-gradient(135deg,#d1fae5,#6ee7b7)', color: '#065f46' },
  { bg: 'linear-gradient(135deg,#fce7f3,#f9a8d4)', color: '#9d174d' },
  { bg: 'linear-gradient(135deg,#fef3c7,#fcd34d)', color: '#92400e' },
  { bg: 'linear-gradient(135deg,#dbeafe,#93c5fd)', color: '#1e40af' },
  { bg: 'linear-gradient(135deg,#ffe4e6,#fda4af)', color: '#9f1239' },
];

function avatarColor(name) {
  var i = 0;
  for (var j = 0; j < (name || '').length; j++) i += name.charCodeAt(j);
  return AVATAR_COLORS[i % AVATAR_COLORS.length];
}

function initials(name) {
  if (!name) return '?';
  var parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function clientTotal(cl) {
  if (!cl || !cl.rooms) return 0;
  return (cl.rooms || []).reduce(function(a, r) {
    return a + (r.windows || []).reduce(function(b, w) {
      return b + (w.products || []).reduce(function(c, pr) {
        return c + (pr.mp != null ? pr.mp : 0);
      }, 0);
    }, 0);
  }, 0);
}

function Badge(p) {
  var st = STATUS_COLORS[p.status] || STATUS_COLORS['nowe'];
  return ce('span', {
    style: {
      fontSize: 10, fontWeight: 700,
      padding: '4px 10px',
      borderRadius: p.alt ? '4px 20px 20px 20px' : '20px 4px 20px 20px',
      background: st.bg, color: st.color,
      border: '1px solid ' + st.border,
      whiteSpace: 'nowrap',
    },
  }, p.status || 'nowe');
}

function ClientCard(p) {
  var cl = p.client;
  var av = avatarColor(cl.name);
  var total = clientTotal(cl);
  var idx = p.index;

  var radii = [
    '20px 6px 20px 20px',
    '6px 20px 20px 20px',
    '20px 20px 6px 20px',
    '20px 20px 20px 6px',
  ];
  var avRadii = [
    '14px 6px 14px 14px',
    '6px 14px 14px 14px',
    '14px 14px 6px 14px',
    '14px 14px 14px 6px',
  ];

  return ce('div', {
    onClick: p.onClick,
    style: Object.assign({}, GLASS, {
      borderRadius: radii[idx % 4],
      padding: '16px 18px',
      display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: SHADOW,
      cursor: 'pointer',
      transition: 'transform 0.12s, box-shadow 0.12s',
    }),
    onMouseEnter: function(e) {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 8px 32px rgba(30,27,75,0.12)';
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
        borderRadius: avRadii[idx % 4],
        background: av.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 800, color: av.color,
      },
    }, initials(cl.name)),

    // Info
    ce('div', { style: { flex: 1, minWidth: 0 } },
      ce('div', { style: { fontSize: 14, fontWeight: 700, color: '#1e1b4b', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, cl.name),
      ce('div', { style: { fontSize: 11, color: '#a0aec0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
        [cl.addr, cl.phone].filter(Boolean).join(' · ') || 'Brak danych kontaktowych'
      ),
    ),

    // Badge
    ce(Badge, { status: cl.status, alt: idx % 2 === 1 }),

    // Cena
    total > 0 ? ce('div', { style: { textAlign: 'right', flexShrink: 0 } },
      ce('div', { style: { fontSize: 14, fontWeight: 800, color: '#1e1b4b' } }, Math.round(total / 10) * 10 + ' zł'),
      ce('div', { style: { fontSize: 10, color: '#a0aec0', marginTop: 2 } }, 'wycena'),
    ) : null,

    // Strzałka
    ce('div', { style: { color: '#a0aec0', fontSize: 18, flexShrink: 0 } },
      ce('i', { className: 'ti ti-chevron-right', 'aria-hidden': 'true' }),
    ),
  );
}

export function ScreenKlienci(p) {
  var sSearch = useState(''); var search = sSearch[0]; var setSearch = sSearch[1];
  var sModal = useState(false); var showModal = sModal[0]; var setShowModal = sModal[1];
  var sSaving = useState(false); var saving = sSaving[0]; var setSaving = sSaving[1];

  var clients = p.clients || [];

  // Filtrowanie
  var filtered = clients.filter(function(cl) {
    if (!search) return true;
    var q = search.toLowerCase();
    return (cl.name || '').toLowerCase().includes(q)
      || (cl.addr || '').toLowerCase().includes(q)
      || (cl.phone || '').toLowerCase().includes(q)
      || (cl.email || '').toLowerCase().includes(q);
  });

  // Statystyki
  var total = clients.length;
  var active = clients.filter(function(c) { return c.status !== 'zrealizowane' && c.status !== 'odrzucone'; }).length;
  var totalVal = clients.reduce(function(a, c) { return a + clientTotal(c); }, 0);

  function addClient(name, addr, phone, email) {
    setSaving(true);
    sbApi.addClient({
      name: name, addr: addr, phone: phone, email: email,
      status: 'nowe', rooms: [],
    }).then(function(res) {
      var cl = res && res[0] ? res[0] : { id: Date.now(), name, addr, phone, email, status: 'nowe', rooms: [] };
      p.onClientAdded && p.onClientAdded(cl);
      setSaving(false);
    }).catch(function(e) {
      alert('Błąd: ' + e.message);
      setSaving(false);
    });
  }

  return ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 20 } },

    // Statystyki hero
    ce('div', {
      style: Object.assign({}, {
        background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
        borderRadius: '24px 8px 24px 24px',
        padding: '24px 28px',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(30,27,75,0.2)',
      }),
    },
      ce('div', { style: { position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(167,139,250,0.2)', pointerEvents: 'none' } }),
      ce('div', { style: { position: 'absolute', bottom: -30, left: 60, width: 130, height: 130, borderRadius: '50%', background: 'rgba(52,211,153,0.15)', pointerEvents: 'none' } }),

      ce('div', { style: { position: 'relative', zIndex: 1 } },
        ce('div', { style: { fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 } }, 'Łączna wartość wycen'),
        ce('div', { style: { fontSize: 34, fontWeight: 800, color: '#fff', letterSpacing: '-1px', lineHeight: 1 } },
          totalVal > 0 ? Math.round(totalVal / 10) * 10 + ' zł' : '—'
        ),
        ce('div', { style: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 6 } }, total + ' klientów · ' + active + ' aktywnych'),
      ),

      ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end', position: 'relative', zIndex: 1 } },
        ce('div', { style: { background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: '20px 6px 20px 20px', padding: '6px 14px', fontSize: 12, color: '#6ee7b7', fontWeight: 600 } }, active + ' aktywnych'),
        ce('div', { style: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px 20px 20px 20px', padding: '6px 14px', fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 500 } }, total + ' łącznie'),
      ),
    ),

    // Wyszukiwarka
    ce('div', Object.assign({}, { style: Object.assign({}, GLASS, {
      borderRadius: '14px 4px 14px 14px',
      padding: '11px 16px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: SHADOW_SM,
    }) }),
      ce('i', { className: 'ti ti-search', style: { fontSize: 17, color: '#a0aec0' }, 'aria-hidden': 'true' }),
      ce('input', {
        value: search,
        onChange: function(e) { setSearch(e.target.value); },
        placeholder: 'Szukaj klienta — imię, adres, telefon…',
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

    // Lista klientów
    filtered.length > 0
      ? ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          ce('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 } },
            ce('div', { style: { fontSize: 11, fontWeight: 700, color: '#a0aec0', letterSpacing: '0.09em', textTransform: 'uppercase' } },
              search ? filtered.length + ' wyników' : 'Wszyscy klienci'
            ),
          ),
          filtered.map(function(cl, i) {
            return ce(ClientCard, {
              key: cl.id, client: cl, index: i,
              onClick: function() { p.onClientClick && p.onClientClick(cl); },
            });
          }),
        )
      : ce('div', Object.assign({}, { style: Object.assign({}, GLASS, {
          borderRadius: '20px 6px 20px 20px',
          padding: '48px', textAlign: 'center',
          boxShadow: SHADOW,
        }) }),
          ce('div', { style: { fontSize: 32, marginBottom: 12 } }, search ? '🔍' : '👥'),
          ce('div', { style: { fontSize: 15, fontWeight: 700, color: '#1e1b4b', marginBottom: 6 } },
            search ? 'Brak wyników dla "' + search + '"' : 'Brak klientów'
          ),
          ce('div', { style: { fontSize: 13, color: '#a0aec0' } },
            search ? 'Spróbuj innej frazy' : 'Kliknij „Nowy klient" żeby dodać pierwszego'
          ),
        ),

    // Modal nowego klienta
    (showModal || p.showNewClient) ? ce(ModalClient, {
      onOk: addClient,
      onClose: function() {
        setShowModal(false);
        p.onCloseNewClient && p.onCloseNewClient();
      },
    }) : null,
  );
}
