import React, { useState, useEffect, useCallback } from 'react';
import { gcalLogin, gcalGetToken, gcalLogout, gcalWaitReady } from './gcal.js';

var ce = React.createElement;

var GLASS = {
  background: 'rgba(255,255,255,0.68)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.9)',
};

var EVT_COLORS = {
  montaz:    { color: '#7c3aed', bg: 'rgba(167,139,250,0.15)', label: 'Montaż'     },
  pomiar:    { color: '#059669', bg: 'rgba(52,211,153,0.15)',  label: 'Pomiar'      },
  spotkanie: { color: '#1d4ed8', bg: 'rgba(96,165,250,0.15)',  label: 'Spotkanie'   },
  dostawa:   { color: '#d97706', bg: 'rgba(245,158,11,0.15)',  label: 'Dostawa'     },
  inne:      { color: '#6b7280', bg: 'rgba(156,163,175,0.15)', label: 'Inne'        },
};

var GCAL_COLOR = '#4285f4';
var DAYS_PL   = ['Pn','Wt','Śr','Cz','Pt','So','Nd'];
var MONTHS_PL = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];
var MONTHS_GEN= ['stycznia','lutego','marca','kwietnia','maja','czerwca','lipca','sierpnia','września','października','listopada','grudnia'];

// ── HELPERS ───────────────────────────────────────────────────────────────────
function startOfWeek(date) {
  var d = new Date(date); var day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0); return d;
}
function addDays(date, n) { var d = new Date(date); d.setDate(d.getDate() + n); return d; }
function sameDay(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function fmtKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
function fmtLocalDT(d) {
  // yyyy-MM-ddTHH:mm format for datetime-local input
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + 'T' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}
function evtTypeFromTitle(title) {
  var t = (title || '').toLowerCase();
  if (t.includes('montaż') || t.includes('montaz')) return 'montaz';
  if (t.includes('pomiar')) return 'pomiar';
  if (t.includes('dostawa')) return 'dostawa';
  if (t.includes('spotkanie') || t.includes('meeting')) return 'spotkanie';
  return 'inne';
}
function gcalEvtToLocal(gcalEvt) {
  var start = gcalEvt.start && (gcalEvt.start.dateTime || gcalEvt.start.date) || '';
  var d = start ? new Date(start) : null;
  return {
    id: gcalEvt.id,
    title: gcalEvt.summary || '(bez tytułu)',
    date: d ? fmtKey(d) : '',
    time: d && gcalEvt.start.dateTime ? String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') : '',
    note: gcalEvt.description || '',
    client: '',
    type: evtTypeFromTitle(gcalEvt.summary),
    _gcal: true,
    _gcalRaw: gcalEvt,
  };
}

function loadLocalEvents() {
  try { return JSON.parse(localStorage.getItem('ad_calendar') || '[]'); } catch(e) { return []; }
}
function saveLocalEvents(evts) {
  var local = evts.filter(function(e) { return !e._gcal; });
  try { localStorage.setItem('ad_calendar', JSON.stringify(local)); } catch(e) {}
}

// ── GCAL API ──────────────────────────────────────────────────────────────────
function gcalFetch(token, url) {
  return fetch(url, { headers: { Authorization: 'Bearer ' + token } }).then(function(r) {
    if (!r.ok) { var err = new Error('HTTP ' + r.status); err.status = r.status; throw err; }
    return r.json();
  });
}

function gcalPost(token, calId, body) {
  return fetch('https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(calId) + '/events', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
}

function gcalDelete(token, calId, evtId) {
  return fetch('https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(calId) + '/events/' + encodeURIComponent(evtId), {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token },
  }).then(function(r) { if (r.status !== 204 && !r.ok) throw new Error('HTTP ' + r.status); });
}

function fetchGcalEvents(token, calId, yearMonth) {
  var year  = yearMonth.year;
  var month = yearMonth.month;
  var tMin  = new Date(year, month, 1).toISOString();
  var tMax  = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
  var url   = 'https://www.googleapis.com/calendar/v3/calendars/'
    + encodeURIComponent(calId)
    + '/events?singleEvents=true&orderBy=startTime&maxResults=250&timeMin='
    + encodeURIComponent(tMin) + '&timeMax=' + encodeURIComponent(tMax);
  return gcalFetch(token, url).then(function(d) { return (d.items || []).map(gcalEvtToLocal); });
}

// ── MODAL WYDARZENIA ──────────────────────────────────────────────────────────
function ModalEvent(p) {
  var evt = p.evt || {};
  var isEdit = !!evt.id;
  var isGcal = !!evt._gcal;

  var s1 = useState(evt.title || '');    var title  = s1[0]; var setTitle  = s1[1];
  var s2 = useState(evt.type  || 'montaz'); var type = s2[0]; var setType  = s2[1];
  var s3 = useState(evt.date  || p.defaultDate || fmtKey(new Date())); var date = s3[0]; var setDate = s3[1];
  var s4 = useState(evt.time  || '09:00'); var time  = s4[0]; var setTime  = s4[1];
  var s5 = useState(evt.note  || '');    var note   = s5[0]; var setNote  = s5[1];
  var s6 = useState(evt.client|| '');    var client = s6[0]; var setClient= s6[1];
  var s7 = useState(false);              var saving = s7[0]; var setSaving = s7[1];

  var INP = {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px', fontSize: 13,
    border: '1px solid rgba(167,139,250,0.25)', borderRadius: 10,
    background: 'rgba(255,255,255,0.7)', color: 'var(--t1)',
    outline: 'none', fontFamily: 'inherit',
  };

  function handleOk() {
    if (!title.trim() || saving) return;
    setSaving(true);
    p.onOk({
      id: evt.id || null,
      title: title.trim(), type: type, date: date,
      time: time, note: note.trim(), client: client.trim(),
      _gcal: isGcal,
    }, function() { setSaving(false); });
  }

  return ce('div', {
    style: { position: 'fixed', inset: 0, background: 'rgba(30,27,75,0.35)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
    onClick: function(e) { if (e.target === e.currentTarget) p.onClose(); },
  },
    ce('div', Object.assign({}, GLASS, {
      style: Object.assign({}, GLASS, {
        borderRadius: '20px 6px 20px 20px', padding: '28px',
        width: 440, maxWidth: '95vw',
        boxShadow: '0 20px 60px rgba(30,27,75,0.2)',
        display: 'flex', flexDirection: 'column', gap: 14,
      }),
    }),
      ce('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 } },
        ce('div', { style: { fontSize: 16, fontWeight: 800, color: 'var(--t1)', flex: 1 } },
          isEdit ? '✏️ Edytuj wydarzenie' : '+ Nowe wydarzenie'
        ),
        isGcal ? ce('span', { style: { fontSize: 10, fontWeight: 700, color: GCAL_COLOR, background: 'rgba(66,133,244,0.1)', borderRadius: 6, padding: '3px 8px' } }, '📅 Google Calendar') : null,
      ),

      // typ
      ce('div', null,
        ce('div', { style: { fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 } }, 'Typ'),
        ce('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
          Object.entries(EVT_COLORS).map(function(kv) {
            var k = kv[0]; var v = kv[1]; var active = type === k;
            return ce('button', {
              key: k, onClick: function() { setType(k); },
              style: { padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, border: active ? '1.5px solid ' + v.color : '1.5px solid rgba(167,139,250,0.2)', background: active ? v.bg : 'rgba(255,255,255,0.5)', color: active ? v.color : 'var(--t2)', cursor: 'pointer', fontFamily: 'inherit' },
            }, v.label);
          }),
        ),
      ),

      ce('div', null,
        ce('div', { style: { fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 } }, 'Tytuł *'),
        ce('input', { value: title, onChange: function(e) { setTitle(e.target.value); }, placeholder: 'Nazwa wydarzenia…', style: INP }),
      ),

      ce('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
        ce('div', null,
          ce('div', { style: { fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 } }, 'Data'),
          ce('input', { type: 'date', value: date, onChange: function(e) { setDate(e.target.value); }, style: INP }),
        ),
        ce('div', null,
          ce('div', { style: { fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 } }, 'Godzina'),
          ce('input', { type: 'time', value: time, onChange: function(e) { setTime(e.target.value); }, style: INP }),
        ),
      ),

      ce('div', null,
        ce('div', { style: { fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 } }, 'Klient'),
        ce('input', {
          value: client, onChange: function(e) { setClient(e.target.value); },
          placeholder: 'Imię klienta…', list: 'cal-clients', style: INP,
        }),
        ce('datalist', { id: 'cal-clients' },
          (p.clients || []).map(function(c) { return ce('option', { key: c.id, value: c.name }); }),
        ),
      ),

      ce('div', null,
        ce('div', { style: { fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5 } }, 'Notatka'),
        ce('input', { value: note, onChange: function(e) { setNote(e.target.value); }, placeholder: 'Dodatkowe informacje…', style: INP }),
      ),

      ce('div', { style: { display: 'flex', gap: 10, marginTop: 4 } },
        ce('button', {
          onClick: p.onClose,
          style: { flex: 1, padding: '11px', borderRadius: 10, border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(255,255,255,0.6)', color: 'var(--t2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
        }, 'Anuluj'),
        isEdit ? ce('button', {
          onClick: function() { p.onDelete(evt.id, isGcal); },
          style: { padding: '11px 14px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.07)', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
        }, '🗑') : null,
        ce('button', {
          onClick: handleOk, disabled: !title.trim() || saving,
          style: { flex: 2, padding: '11px', borderRadius: 10, border: 'none', background: title.trim() && !saving ? 'var(--t1)' : 'var(--bd2)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: title.trim() ? 'pointer' : 'default', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
        }, saving ? '⏳ Zapisuję…' : (isEdit ? 'Zapisz' : '+ Dodaj')),
      ),
    ),
  );
}

// ── MONTH VIEW ────────────────────────────────────────────────────────────────
function MonthView(p) {
  var events = p.events; var today = p.today; var year = p.year; var month = p.month;
  var firstDay = new Date(year, month, 1);
  var lastDay  = new Date(year, month + 1, 0);
  var startDow = firstDay.getDay();
  var offset   = startDow === 0 ? 6 : startDow - 1;

  var cells = [];
  for (var i = 0; i < offset; i++) cells.push(null);
  for (var d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month, d));

  var weeks = [];
  for (var w = 0; w < Math.ceil(cells.length / 7); w++) weeks.push(cells.slice(w * 7, w * 7 + 7));

  function evtsFor(d) {
    if (!d) return [];
    var key = fmtKey(d);
    return events.filter(function(e) { return e.date === key; }).sort(function(a, b) { return (a.time||'').localeCompare(b.time||''); });
  }

  return ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
    ce('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 } },
      DAYS_PL.map(function(d) { return ce('div', { key: d, style: { textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--t3)', letterSpacing: '0.07em', padding: '4px 0' } }, d); }),
    ),
    weeks.map(function(week, wi) {
      return ce('div', { key: wi, style: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 } },
        week.map(function(day, di) {
          if (!day) return ce('div', { key: di, style: { minHeight: 80 } });
          var isToday = sameDay(day, today);
          var isSel   = p.selected && sameDay(day, p.selected);
          var dayEvts = evtsFor(day);
          var isWE    = di === 5 || di === 6;
          return ce('div', {
            key: di, onClick: function() { p.onDayClick(day); },
            style: Object.assign({}, GLASS, {
              minHeight: 80, borderRadius: 10, padding: '6px 8px', cursor: 'pointer',
              background: isToday ? 'rgba(167,139,250,0.18)' : isSel ? 'rgba(52,211,153,0.12)' : isWE ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.62)',
              border: isToday ? '2px solid rgba(167,139,250,0.5)' : isSel ? '2px solid rgba(52,211,153,0.4)' : '1px solid rgba(255,255,255,0.9)',
              transition: 'all .12s',
            }),
          },
            ce('div', { style: { fontSize: 12, fontWeight: isToday ? 800 : 500, color: isToday ? '#7c3aed' : isWE ? '#9ca3af' : 'var(--t1)', marginBottom: 4 } }, day.getDate()),
            ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
              dayEvts.slice(0, 3).map(function(e, ei) {
                var ec = e._gcal ? { color: GCAL_COLOR, bg: 'rgba(66,133,244,0.12)' } : (EVT_COLORS[e.type] || EVT_COLORS.inne);
                return ce('div', {
                  key: ei,
                  style: { fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 4, background: ec.bg, color: ec.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                }, (e.time ? e.time + ' ' : '') + e.title);
              }),
              dayEvts.length > 3 ? ce('div', { style: { fontSize: 9, color: 'var(--t3)', paddingLeft: 4 } }, '+' + (dayEvts.length - 3) + ' więcej') : null,
            ),
          );
        }),
      );
    }),
  );
}

// ── WEEK VIEW ─────────────────────────────────────────────────────────────────
function WeekView(p) {
  var events = p.events; var today = p.today;
  var week = []; for (var i = 0; i < 7; i++) week.push(addDays(p.weekStart, i));

  function evtsFor(d) {
    var key = fmtKey(d);
    return events.filter(function(e) { return e.date === key; }).sort(function(a, b) { return (a.time||'').localeCompare(b.time||''); });
  }

  return ce('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 } },
    week.map(function(day, di) {
      var isToday = sameDay(day, today); var isWE = di === 5 || di === 6;
      var dayEvts = evtsFor(day);
      return ce('div', {
        key: di, onClick: function() { p.onDayClick(day); },
        style: Object.assign({}, GLASS, {
          borderRadius: '12px 4px 12px 12px', padding: '10px 8px', cursor: 'pointer', minHeight: 160,
          background: isToday ? 'rgba(167,139,250,0.15)' : isWE ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.65)',
          border: isToday ? '2px solid rgba(167,139,250,0.45)' : '1px solid rgba(255,255,255,0.9)',
        }),
      },
        ce('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 8 } },
          ce('div', { style: { fontSize: 10, color: 'var(--t3)', fontWeight: 600 } }, DAYS_PL[di]),
          ce('div', { style: { fontSize: 20, fontWeight: 800, color: isToday ? '#7c3aed' : isWE ? '#9ca3af' : 'var(--t1)', lineHeight: 1.2 } }, day.getDate()),
        ),
        ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          dayEvts.map(function(e, ei) {
            var ec = e._gcal ? { color: GCAL_COLOR, bg: 'rgba(66,133,244,0.12)' } : (EVT_COLORS[e.type] || EVT_COLORS.inne);
            return ce('div', {
              key: ei,
              onClick: function(ev) { ev.stopPropagation(); p.onEventClick(e); },
              style: { padding: '5px 8px', borderRadius: 8, background: ec.bg, borderLeft: '2px solid ' + ec.color, cursor: 'pointer' },
            },
              e.time ? ce('div', { style: { fontSize: 9, color: ec.color, fontWeight: 700, marginBottom: 1 } }, e.time) : null,
              ce('div', { style: { fontSize: 11, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.3 } }, e.title),
              e.client ? ce('div', { style: { fontSize: 10, color: 'var(--t3)', marginTop: 1 } }, e.client) : null,
            );
          }),
        ),
      );
    }),
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
export function ScreenKalendarz(p) {
  var gcalToken    = p.gcalToken    || null;
  var setGcalToken = p.setGcalToken || function() {};
  var gsiReady     = !!p.gsiReady;
  var clients      = p.clients      || [];

  var today = new Date();

  var s1 = useState(loadLocalEvents()); var localEvts  = s1[0]; var setLocalEvts  = s1[1];
  var s2 = useState([]);               var gcalEvts   = s2[0]; var setGcalEvts   = s2[1];
  var s3 = useState(today.getFullYear()); var year     = s3[0]; var setYear       = s3[1];
  var s4 = useState(today.getMonth());    var month    = s4[0]; var setMonth      = s4[1];
  var s5 = useState('month');             var view     = s5[0]; var setView       = s5[1];
  var s6 = useState(null);               var modal    = s6[0]; var setModal      = s6[1];
  var s7 = useState(null);               var selDay   = s7[0]; var setSelDay     = s7[1];
  var s8 = useState(startOfWeek(today)); var weekStart = s8[0]; var setWeekStart  = s8[1];
  var s9 = useState(false);              var gcalLoading = s9[0]; var setGcalLoading = s9[1];
  var s10= useState(null);              var gcalError = s10[0]; var setGcalError  = s10[1];
  var s11= useState('primary');         var calId     = s11[0]; var setCalId      = s11[1];
  var s12= useState([]);                var calList   = s12[0]; var setCalList    = s12[1];

  // Pobierz listę kalendarzy po zalogowaniu
  useEffect(function() {
    if (!gcalToken) { setGcalEvts([]); return; }
    fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer', {
      headers: { Authorization: 'Bearer ' + gcalToken },
    }).then(function(r) { return r.json(); }).then(function(d) {
      var items = (d.items || []).map(function(c) {
        return { id: c.id, summary: c.summary, color: c.backgroundColor || GCAL_COLOR, primary: !!c.primary };
      });
      items.sort(function(a, b) { return a.primary ? -1 : b.primary ? 1 : 0; });
      setCalList(items);
    }).catch(function() {});
  }, [gcalToken]);

  // Pobierz wydarzenia z GCal przy zmianie miesiąca / kalendarza / tokenu
  useEffect(function() {
    if (!gcalToken) { setGcalEvts([]); return; }
    setGcalLoading(true); setGcalError(null);
    fetchGcalEvents(gcalToken, calId, { year: year, month: month })
      .then(function(evts) { setGcalEvts(evts); setGcalLoading(false); })
      .catch(function(e) {
        if (e.status === 401) {
          gcalGetToken().then(function(fresh) { setGcalToken(fresh); }).catch(function() { setGcalToken(null); });
        } else {
          setGcalError('Błąd pobierania z Google Calendar');
        }
        setGcalLoading(false);
      });
  }, [gcalToken, calId, year, month]);

  var allEvents = localEvts.concat(gcalEvts);

  // ── Login ──
  function handleLogin() {
    if (!gsiReady) { alert('Biblioteka Google się ładuje, spróbuj za chwilę.'); return; }
    gcalLogin().then(function(tok) { setGcalToken(tok); setGcalError(null); })
      .catch(function(e) { alert('Błąd logowania: ' + (e.message || 'nieznany')); });
  }

  // ── Dodaj / edytuj wydarzenie ──
  function handleModalOk(data, done) {
    var dt = data.date + 'T' + (data.time || '09:00') + ':00';
    var start = new Date(dt);
    var end   = new Date(start.getTime() + 3600000);

    if (gcalToken) {
      // Utwórz w GCal
      var body = {
        summary:     data.title,
        description: (data.note ? data.note + '\n' : '') + (data.client ? 'Klient: ' + data.client : ''),
        start: { dateTime: start.toISOString(), timeZone: 'Europe/Warsaw' },
        end:   { dateTime: end.toISOString(),   timeZone: 'Europe/Warsaw' },
      };
      gcalPost(gcalToken, calId, body).then(function(created) {
        setGcalEvts(function(prev) { return prev.concat([gcalEvtToLocal(created)]); });
        setModal(null); if (done) done();
      }).catch(function(e) {
        // Fallback: zapisz lokalnie
        var local = Object.assign({ id: Date.now() + '_' + Math.random().toString(36).slice(2,6) }, data);
        setLocalEvts(function(prev) { var n = [local].concat(prev); saveLocalEvents(n); return n; });
        setModal(null); if (done) done();
        alert('⚠️ Błąd GCal (' + e.message + ') — zapisano lokalnie.');
      });
    } else {
      // Tylko lokalnie
      var local2 = Object.assign({ id: Date.now() + '_' + Math.random().toString(36).slice(2,6) }, data);
      setLocalEvts(function(prev) { var n = [local2].concat(prev); saveLocalEvents(n); return n; });
      setModal(null); if (done) done();
    }
  }

  // ── Usuń ──
  function handleDelete(id, isGcal) {
    if (isGcal && gcalToken) {
      gcalDelete(gcalToken, calId, id).then(function() {
        setGcalEvts(function(prev) { return prev.filter(function(e) { return e.id !== id; }); });
        setModal(null);
      }).catch(function(e) { alert('Błąd usuwania z GCal: ' + e.message); });
    } else {
      setLocalEvts(function(prev) { var n = prev.filter(function(e) { return e.id !== id; }); saveLocalEvents(n); return n; });
      setModal(null);
    }
  }

  // ── Nawigacja ──
  function prevPeriod() {
    if (view === 'month') { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); }
    else setWeekStart(addDays(weekStart, -7));
  }
  function nextPeriod() {
    if (view === 'month') { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); }
    else setWeekStart(addDays(weekStart, 7));
  }
  function goToday() { setYear(today.getFullYear()); setMonth(today.getMonth()); setWeekStart(startOfWeek(today)); }

  var weekEnd = addDays(weekStart, 6);
  var periodLabel = view === 'month'
    ? MONTHS_PL[month] + ' ' + year
    : weekStart.getDate() + ' ' + MONTHS_GEN[weekStart.getMonth()] + ' – ' + weekEnd.getDate() + ' ' + MONTHS_GEN[weekEnd.getMonth()] + ' ' + weekEnd.getFullYear();

  var selDayEvts = selDay
    ? allEvents.filter(function(e) { return e.date === fmtKey(selDay); })
        .sort(function(a, b) { return (a.time||'').localeCompare(b.time||''); })
    : [];

  return ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },

    // ── GCAL PANEL ──
    ce('div', Object.assign({}, GLASS, {
      style: Object.assign({}, GLASS, {
        borderRadius: '14px 4px 14px 14px', padding: '12px 18px',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        boxShadow: '0 2px 12px rgba(30,27,75,0.06)',
      }),
    }),
      ce('div', { style: { width: 10, height: 10, borderRadius: '50%', background: gcalToken ? '#10b981' : '#d1d5db', flexShrink: 0, boxShadow: gcalToken ? '0 0 0 3px rgba(16,185,129,0.2)' : 'none' } }),
      ce('span', { style: { fontSize: 13, fontWeight: 600, color: 'var(--t1)', flex: 1 } },
        gcalToken ? '✓ Google Calendar połączony' : 'Google Calendar — nie połączono',
      ),
      gcalLoading ? ce('span', { style: { fontSize: 11, color: 'var(--t3)' } }, '⏳ Synchronizuję…') : null,
      gcalError ? ce('span', { style: { fontSize: 11, color: '#ef4444' } }, '⚠ ' + gcalError) : null,

      // wybór kalendarza
      gcalToken && calList.length > 1 ? ce('select', {
        value: calId, onChange: function(e) { setCalId(e.target.value); },
        style: { fontSize: 11, padding: '4px 8px', borderRadius: 8, border: '1px solid rgba(66,133,244,0.3)', background: 'rgba(66,133,244,0.07)', color: GCAL_COLOR, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' },
      },
        calList.map(function(cal) { return ce('option', { key: cal.id, value: cal.id }, cal.summary + (cal.primary ? ' (główny)' : '')); }),
      ) : null,

      gcalToken
        ? ce('button', {
            onClick: function() { gcalLogout().then(function() { setGcalToken(null); setGcalEvts([]); }); },
            style: { padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
          }, 'Wyloguj')
        : ce('button', {
            onClick: handleLogin, disabled: !gsiReady,
            style: { padding: '7px 14px', borderRadius: 9, border: 'none', background: GCAL_COLOR, color: '#fff', fontSize: 12, fontWeight: 700, cursor: gsiReady ? 'pointer' : 'default', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, opacity: gsiReady ? 1 : 0.5 },
          }, '🔑 Zaloguj przez Google'),
    ),

    // ── TOOLBAR ──
    ce('div', Object.assign({}, GLASS, {
      style: Object.assign({}, GLASS, {
        borderRadius: '14px 4px 14px 14px', padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        boxShadow: '0 2px 12px rgba(30,27,75,0.05)',
      }),
    }),
      ce('button', { onClick: prevPeriod, style: { border: 'none', background: 'rgba(167,139,250,0.1)', color: '#7c3aed', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } }, ce('i', { className: 'ti ti-chevron-left' })),
      ce('div', { style: { fontSize: 16, fontWeight: 800, color: 'var(--t1)', minWidth: 220, textAlign: 'center' } }, periodLabel),
      ce('button', { onClick: nextPeriod, style: { border: 'none', background: 'rgba(167,139,250,0.1)', color: '#7c3aed', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } }, ce('i', { className: 'ti ti-chevron-right' })),
      ce('button', { onClick: goToday, style: { border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(255,255,255,0.6)', color: '#7c3aed', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' } }, 'Dziś'),
      ce('div', { style: { marginLeft: 'auto', display: 'flex', gap: 4 } },
        ['month', 'week'].map(function(v) {
          var active = view === v;
          return ce('button', {
            key: v, onClick: function() { setView(v); },
            style: { padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, fontFamily: 'inherit', border: active ? '1.5px solid #a78bfa' : '1.5px solid rgba(167,139,250,0.2)', background: active ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.5)', color: active ? '#7c3aed' : 'var(--t2)', cursor: 'pointer' },
          }, v === 'month' ? 'Miesiąc' : 'Tydzień');
        }),
      ),
      ce('button', {
        onClick: function() { setModal({ date: selDay ? fmtKey(selDay) : fmtKey(today) }); },
        style: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: 'none', background: 'var(--t1)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
      }, ce('i', { className: 'ti ti-plus', style: { fontSize: 15 } }), 'Dodaj'),
    ),

    // ── WIDOK ──
    view === 'month'
      ? ce(MonthView, { year: year, month: month, today: today, events: allEvents, selected: selDay, onDayClick: function(d) { setSelDay(d); } })
      : ce(WeekView, { weekStart: weekStart, today: today, events: allEvents, onDayClick: function(d) { setSelDay(d); setModal({ date: fmtKey(d) }); }, onEventClick: function(e) { setModal({ evt: e }); } }),

    // ── PANEL DNIA ──
    view === 'month' && selDay ? ce('div', Object.assign({}, GLASS, {
      style: Object.assign({}, GLASS, {
        borderRadius: '16px 4px 16px 16px', padding: '18px 20px',
        boxShadow: '0 4px 20px rgba(30,27,75,0.08)',
      }),
    }),
      ce('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 } },
        ce('div', { style: { fontSize: 14, fontWeight: 800, color: 'var(--t1)' } },
          selDay.getDate() + ' ' + MONTHS_GEN[selDay.getMonth()] + ' ' + selDay.getFullYear()
        ),
        ce('button', {
          onClick: function() { setModal({ date: fmtKey(selDay) }); },
          style: { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, border: 'none', background: 'var(--t1)', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
        }, ce('i', { className: 'ti ti-plus' }), 'Dodaj'),
      ),
      selDayEvts.length === 0
        ? ce('div', { style: { fontSize: 13, color: 'var(--t3)', textAlign: 'center', padding: '16px 0' } }, 'Brak wydarzeń')
        : ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            selDayEvts.map(function(e) {
              var ec = e._gcal ? { color: GCAL_COLOR, bg: 'rgba(66,133,244,0.12)', label: 'GCal' } : (EVT_COLORS[e.type] || EVT_COLORS.inne);
              return ce('div', {
                key: e.id,
                onClick: function() { setModal({ evt: e }); },
                style: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', background: ec.bg, borderLeft: '3px solid ' + ec.color, transition: 'opacity .12s' },
              },
                ce('div', { style: { flexShrink: 0, minWidth: 36 } },
                  ce('div', { style: { fontSize: 12, fontWeight: 700, color: ec.color } }, e.time || '—'),
                ),
                ce('div', { style: { flex: 1 } },
                  ce('div', { style: { fontSize: 13, fontWeight: 700, color: 'var(--t1)' } }, e.title),
                  e.client ? ce('div', { style: { fontSize: 11, color: 'var(--t3)', marginTop: 2 } }, '👤 ' + e.client) : null,
                  e.note ? ce('div', { style: { fontSize: 11, color: 'var(--t3)', marginTop: 2, fontStyle: 'italic' } }, e.note) : null,
                ),
                ce('span', { style: { fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: ec.bg, color: ec.color, flexShrink: 0 } }, e._gcal ? '📅' : ec.label),
              );
            }),
          ),
    ) : null,

    // ── MODAL ──
    modal ? ce(ModalEvent, {
      evt: modal.evt || null,
      defaultDate: modal.date || fmtKey(today),
      clients: clients,
      onOk: handleModalOk,
      onDelete: handleDelete,
      onClose: function() { setModal(null); },
    }) : null,
  );
}
