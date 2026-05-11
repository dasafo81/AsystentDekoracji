import React, { useState, useEffect, Fragment } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { sbApi, SB_URL, SB_KEY } from './supabase.js';
import { gcalLogin, gcalLogout, gcalGetToken, gcalWaitReady } from './gcal.js';

var ce = React.createElement;

// ── Stałe ────────────────────────────────────────────────────────────────────
export var CRM_STAGES = [
  { id: 'zapytanie',  label: 'Zapytanie',  color: '#a78bfa' },
  { id: 'pomiar',     label: 'Pomiar',     color: '#fb923c' },
  { id: 'wycena',     label: 'Wycena',     color: '#34d399' },
  { id: 'zamowienie', label: 'Zamówienie', color: '#60a5fa' },
  { id: 'realizacja', label: 'Realizacja', color: '#a78bfa' },
  { id: 'montaz',     label: 'Montaż',     color: '#f472b6' },
  { id: 'zakonczone', label: 'Zakończone', color: '#94a3b8', clientStatus: 'zrealizowane' },
];
export var STAGE_ODRZUCONE = { id: 'odrzucone', label: 'Odrzucone', color: '#f87171', clientStatus: 'odrzucone' };

// ── Style ──────────────────────────────────────────────────────────────────
var GLASS = {
  background: 'rgba(255,255,255,0.68)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.85)',
};
var SHADOW = '0 4px 24px rgba(30,27,75,0.07)';
var SHADOW_SM = '0 2px 12px rgba(30,27,75,0.05)';

var S = {
  input: {
    width: '100%', padding: '10px 13px', borderRadius: '12px 4px 12px 12px',
    border: '1px solid rgba(255,255,255,0.85)',
    background: 'rgba(255,255,255,0.7)',
    backdropFilter: 'blur(8px)',
    color: 'var(--t1)', fontSize: 13,
    fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none',
  },
  label: {
    fontSize: 10, fontWeight: 700, color: 'var(--t3)',
    letterSpacing: '0.1em', textTransform: 'uppercase',
    marginBottom: 6, display: 'block',
  },
  sec: { marginBottom: 20 },
  btn: {
    padding: '10px 18px', borderRadius: '14px 6px 14px 14px', border: 'none',
    background: 'rgba(255,255,255,0.8)', color: 'var(--t1)',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    boxShadow: SHADOW, fontFamily: 'inherit',
  },
  btnAccent: {
    padding: '10px 18px', borderRadius: '14px 6px 14px 14px', border: 'none',
    background: 'var(--sb-bg)', color: '#fff',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    boxShadow: 'var(--shadow-btn)', fontFamily: 'inherit',
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
export function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function clientTotal(cl) {
  if (!cl || !cl.rooms) return 0;
  return (cl.rooms || []).reduce(function(a, r) {
    return a + (r.windows || []).reduce(function(b, w) {
      return b + (w.products || []).reduce(function(c, p) {
        return c + (p.mp != null ? p.mp : 0);
      }, 0);
    }, 0);
  }, 0);
}

// ── Modal Deal ────────────────────────────────────────────────────────────────
export function ModalDeal(p) {
  var d = p.deal;
  var cl = p.client;
  var gcalToken = p.gcalToken || null;
  var setGcalToken = p.setGcalToken || function() {};
  var calList = p.calList || [];

  var sNotes = useState(d.notes || ''); var notes = sNotes[0]; var setNotes = sNotes[1];
  var sVisit = useState(d.visit_date ? d.visit_date.slice(0, 16) : ''); var visitDate = sVisit[0]; var setVisitDate = sVisit[1];
  var sDeliv = useState(d.delivery_date ? d.delivery_date.slice(0, 16) : ''); var delivDate = sDeliv[0]; var setDelivDate = sDeliv[1];
  var sAcq   = useState(d.acquisition || ''); var acquisition = sAcq[0]; var setAcquisition = sAcq[1];
  var sInstCal = useState(d.installer_calendar_id || ''); var installerCalId = sInstCal[0]; var setInstallerCalId = sInstCal[1];
  var sAtts  = useState([]); var attachments = sAtts[0]; var setAttachments = sAtts[1];
  var sUpl   = useState(false); var uploading = sUpl[0]; var setUploading = sUpl[1];
  var sBusy  = useState(false); var busy = sBusy[0]; var setBusy = sBusy[1];

  useEffect(function() {
    sbApi.getAttachments(d.id).then(function(a) { setAttachments(a || []); });
  }, [d.id]);

  function save() {
    setBusy(true);
    sbApi.updateDeal(d.id, {
      notes: notes, visit_date: visitDate || null,
      delivery_date: delivDate || null,
      installer_calendar_id: installerCalId || null,
      acquisition: acquisition || null,
      updated_at: new Date().toISOString(),
    }).then(function() {
      p.onSave({ notes, visit_date: visitDate || null, delivery_date: delivDate || null, installer_calendar_id: installerCalId || null, acquisition: acquisition || null });
      setBusy(false);
      p.onClose();
    }).catch(function(e) { alert('Błąd: ' + e.message); setBusy(false); });
  }

  function uploadFile(file) {
    setUploading(true);
    var path = 'deals/' + d.id + '/' + Date.now() + '_' + file.name.replace(/\s/g, '_');
    fetch(SB_URL + '/storage/v1/object/deal-attachments/' + path, {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': file.type, 'x-upsert': 'true' },
      body: file,
    }).then(function(r) {
      if (!r.ok) return r.text().then(function(t) { throw new Error(t); });
      var url = SB_URL + '/storage/v1/object/public/deal-attachments/' + path;
      return sbApi.addAttachment(d.id, url, file.name);
    }).then(function(res) {
      var att = res && res[0] ? res[0] : { id: Date.now(), url: '', name: file.name };
      setAttachments(function(a) { return a.concat([att]); });
      setUploading(false);
    }).catch(function(e) { alert('Błąd uploadu: ' + e.message); setUploading(false); });
  }

  function addToGcal(title, dateStr) {
    if (!dateStr) { alert('Nie wybrano daty.'); return; }
    if (!gcalToken) { alert('Zaloguj się najpierw do Google Calendar.'); return; }
    var targetCalId = 'primary';
    if (title.indexOf('Montaż') !== -1 && installerCalId) targetCalId = installerCalId;
    var date = new Date(dateStr);
    var body = {
      summary: title,
      description: 'Klient: ' + (cl ? cl.name : '(brak)'),
      start: { dateTime: date.toISOString(), timeZone: 'Europe/Warsaw' },
      end: { dateTime: new Date(date.getTime() + 3600000).toISOString(), timeZone: 'Europe/Warsaw' },
    };
    function doPost(t) {
      return fetch('https://www.googleapis.com/calendar/v3/calendars/' + encodeURIComponent(targetCalId) + '/events', {
        method: 'POST', headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
    }
    doPost(gcalToken).then(function(r) {
      if (r.status === 401) return gcalGetToken().then(function(fresh) { setGcalToken(fresh); return doPost(fresh); });
      return r;
    }).then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function() { alert('\u2705 Dodano do Google Calendar.'); })
      .catch(function(e) { alert('\u26A0\uFE0F B\u0142\u0105d: ' + e.message); });
  }

  var total = cl ? clientTotal(cl) : 0;
  var clientName = cl ? cl.name : '(brak klienta)';
  var ACQOPTS = ['', 'Polecenie', 'porterdesign.pl', 'kapadesign.pl', 'Projektant'];

  // Overlay
  return ce('div', {
    style: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 2000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
    onClick: function(e) { if (e.target === e.currentTarget) p.onClose(); },
  },
    ce('div', {
      style: {
        background: 'rgba(245,243,255,0.97)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', width: '100%', maxWidth: 520,
        borderRadius: '24px 24px 0 0', maxHeight: '92vh', overflowY: 'auto',
        padding: '28px 24px 40px',
        boxShadow: '0 -8px 40px rgba(30,27,75,0.2)',
      }
    },
      // Header
      ce('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 } },
        ce('div', null,
          ce('div', { style: { fontSize: 18, fontWeight: 700, color: 'var(--t1)' } }, 'Karta Deala'),
          ce('div', { style: { fontSize: 13, color: 'var(--m-muted)', marginTop: 3 } }, clientName),
        ),
        ce('button', {
          onClick: p.onClose,
          style: { border: 'none', background: 'var(--m-bg)', fontSize: 20, cursor: 'pointer', color: 'var(--t3)', borderRadius: 10, width: 36, height: 36, boxShadow: NEU_OUT, display: 'flex', alignItems: 'center', justifyContent: 'center' },
        }, '\u00D7'),
      ),

      // Dane klienta
      cl ? ce('div', { style: { ...S.sec, background: 'var(--m-bg)', borderRadius: 16, padding: '14px 16px', boxShadow: NEU_IN } },
        ce('div', { style: S.label }, 'DANE KLIENTA'),
        cl.phone ? ce('div', { style: { display: 'flex', gap: 8, marginBottom: 6 } },
          ce('span', { style: { fontSize: 12, color: 'var(--m-muted)', width: 52 } }, 'Telefon'),
          ce('a', { href: 'tel:' + cl.phone, style: { fontSize: 13, color: 'var(--m-text)', textDecoration: 'none', fontWeight: 500 } }, cl.phone),
        ) : null,
        cl.email ? ce('div', { style: { display: 'flex', gap: 8, marginBottom: 6 } },
          ce('span', { style: { fontSize: 12, color: 'var(--m-muted)', width: 52 } }, 'E-mail'),
          ce('a', { href: 'mailto:' + cl.email, style: { fontSize: 13, color: 'var(--accent)', textDecoration: 'none' } }, cl.email),
        ) : null,
        cl.addr ? ce('div', { style: { display: 'flex', gap: 8 } },
          ce('span', { style: { fontSize: 12, color: 'var(--m-muted)', width: 52 } }, 'Adres'),
          ce('span', { style: { fontSize: 13, color: 'var(--m-text)' } }, cl.addr),
        ) : null,
        ce('button', {
          onClick: p.onGoToClient,
          style: { marginTop: 12, width: '100%', ...S.btn, color: 'var(--accent)', fontSize: 12 },
        }, '\u2192 Przejdź do wyceny'),
      ) : null,

      // Źródło pozyskania
      ce('div', { style: S.sec },
        ce('label', { style: S.label }, 'SPOSÓB POZYSKANIA'),
        ce('select', {
          value: acquisition, onChange: function(e) { setAcquisition(e.target.value); },
          style: { ...S.input, appearance: 'none' },
        },
          ACQOPTS.map(function(o) { return ce('option', { key: o, value: o }, o || '— wybierz —'); }),
        ),
      ),

      // Terminarz
      ce('div', { style: { ...S.sec, background: 'var(--m-bg)', borderRadius: 16, padding: '16px', boxShadow: NEU_IN } },
        ce('div', { style: S.label }, 'TERMINARZ'),
        ce('div', { style: { marginBottom: 14 } },
          ce('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 } },
            ce('label', { style: { ...S.label, marginBottom: 0 } }, 'Spotkanie / Pomiar'),
            visitDate && gcalToken ? ce('button', {
              onClick: function() { addToGcal('Spotkanie \u2014 ' + clientName, visitDate); },
              style: { fontSize: 11, color: '#4285f4', background: 'none', border: '1px solid #4285f4', borderRadius: 6, padding: '2px 8px', cursor: 'pointer' },
            }, '\uD83D\uDCC5 GCal') : null,
          ),
          ce('input', { type: 'datetime-local', value: visitDate, onChange: function(e) { setVisitDate(e.target.value); }, style: S.input }),
        ),
        ce('div', null,
          ce('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 } },
            ce('label', { style: { ...S.label, marginBottom: 0 } }, 'Montaż'),
            delivDate && gcalToken ? ce('button', {
              onClick: function() { addToGcal('Monta\u017c \u2014 ' + clientName, delivDate); },
              style: { fontSize: 11, color: '#4285f4', background: 'none', border: '1px solid #4285f4', borderRadius: 6, padding: '2px 8px', cursor: 'pointer' },
            }, '\uD83D\uDCC5 GCal') : null,
          ),
          ce('input', { type: 'datetime-local', value: delivDate, onChange: function(e) { setDelivDate(e.target.value); }, style: S.input }),
          gcalToken && calList.length > 0 ? ce('select', {
            value: installerCalId, onChange: function(e) { setInstallerCalId(e.target.value); },
            style: { ...S.input, marginTop: 8, appearance: 'none' },
          },
            ce('option', { value: '' }, '\u2014 kalendarz monta\u017cysty \u2014'),
            calList.filter(function(c) { return !c.primary; }).map(function(c) {
              return ce('option', { key: c.id, value: c.id }, c.summary);
            }),
          ) : null,
        ),
      ),

      // Wartość
      total > 0 ? ce('div', { style: { ...S.sec, background: 'var(--m-bg)', borderRadius: 16, padding: '14px 16px', boxShadow: NEU_IN } },
        ce('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          ce('span', { style: { fontSize: 12, color: 'var(--m-muted)' } }, 'Warto\u015b\u0107 zamówienia'),
          ce('span', { style: { fontSize: 20, fontWeight: 700, color: 'var(--m-text)' } }, Math.round(total / 10) * 10 + ' z\u0142'),
        ),
      ) : null,

      // Notatki
      ce('div', { style: S.sec },
        ce('label', { style: S.label }, 'NOTATKI'),
        ce('textarea', {
          value: notes, onChange: function(e) { setNotes(e.target.value); },
          rows: 4, placeholder: 'Historia kontaktu, uwagi...',
          style: { ...S.input, resize: 'vertical', lineHeight: 1.5 },
        }),
      ),

      // Załączniki
      ce('div', { style: S.sec },
        ce('label', { style: S.label }, 'ZA\u0141\u0104CZNIKI'),
        attachments.length > 0 ? ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 } },
          attachments.map(function(a) {
            return ce('div', { key: a.id, style: { display: 'flex', alignItems: 'center', gap: 8, background: 'var(--m-bg)', borderRadius: 10, padding: '8px 12px', boxShadow: NEU_SM } },
              ce('span', null, '\uD83D\uDCCE'),
              ce('a', { href: a.url, target: '_blank', rel: 'noopener noreferrer', style: { flex: 1, fontSize: 12, color: 'var(--m-text)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, a.name || 'Plik'),
              ce('button', { onClick: function() { sbApi.deleteAttachment(a.id).then(function() { setAttachments(function(arr) { return arr.filter(function(x) { return x.id !== a.id; }); }); }); }, style: { border: 'none', background: 'none', cursor: 'pointer', color: 'var(--m-muted)', fontSize: 16 } }, '\u00D7'),
            );
          }),
        ) : null,
        ce('label', { style: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--m-bg)', borderRadius: 12, cursor: 'pointer', fontSize: 13, color: 'var(--m-muted)', boxShadow: NEU_IN } },
          uploading ? '\u23F3 Wysyłanie...' : '+ Dodaj zdjęcie / plik',
          ce('input', { type: 'file', accept: 'image/*,.pdf', style: { display: 'none' }, onChange: function(e) { var f = e.target.files && e.target.files[0]; if (f) uploadFile(f); e.target.value = ''; }, disabled: uploading }),
        ),
      ),

      // Przyciski
      ce('div', { style: { display: 'flex', gap: 10 } },
        ce('button', {
          onClick: save, disabled: busy,
          style: { flex: 1, padding: '13px', borderRadius: 14, border: 'none', background: 'var(--m-bg)', color: 'var(--accent)', fontSize: 14, fontWeight: 700, cursor: busy ? 'wait' : 'pointer', boxShadow: NEU_OUT },
        }, busy ? 'Zapisuję...' : 'Zapisz'),
        ce('button', {
          onClick: function() { if (window.confirm('Usunąć ten deal?')) p.onDelete(); },
          style: { padding: '13px 18px', borderRadius: 14, border: 'none', background: 'var(--m-bg)', color: 'var(--accent-ros)', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: NEU_OUT },
        }, 'Usuń'),
      ),
    ),
  );
}

// ── Kanban ────────────────────────────────────────────────────────────────────
function DealCard(cp) {
  var deal = cp.deal; var stage = cp.stage; var index = cp.index;
  var clients = cp.clients; var openDeal = cp.openDeal;
  var cl = clients.find(function(c) { return String(c.id) === String(deal.client_id); }) || null;
  var name = cl ? cl.name : '(nieznany)';
  var total = cl ? clientTotal(cl) : 0;

  return ce(Draggable, { draggableId: String(deal.id), index: index }, function(provided, snapshot) {
    return ce('div', Object.assign({ ref: provided.innerRef }, provided.draggableProps, provided.dragHandleProps, {
      onClick: function() { if (!snapshot.isDragging) openDeal(deal); },
      style: Object.assign({}, provided.draggableProps.style, {
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.9)',
        borderRadius: '16px 6px 16px 16px',
        padding: '12px 14px',
        marginBottom: 10,
        cursor: snapshot.isDragging ? 'grabbing' : 'grab',
        boxShadow: snapshot.isDragging ? '0 12px 32px rgba(30,27,75,0.18)' : SHADOW,
        borderTop: '3px solid ' + stage.color,
        userSelect: 'none',
      }),
    }),
      ce('div', { style: { fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 4 } }, name),
      total > 0 ? ce('div', { style: { fontSize: 12, fontWeight: 700, color: stage.color } }, Math.round(total / 10) * 10 + ' z\u0142') : null,
      deal.visit_date ? ce('div', { style: { fontSize: 10, color: 'var(--t3)', marginTop: 4 } }, '\uD83D\uDCCF Pomiar: ' + fmtDate(deal.visit_date)) : null,
      deal.delivery_date ? ce('div', { style: { fontSize: 10, color: 'var(--t3)' } }, '\uD83D\uDE9A Montaż: ' + fmtDate(deal.delivery_date)) : null,
      deal.notes ? ce('div', { style: { fontSize: 11, color: 'var(--t3)', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } }, deal.notes) : null,
    );
  });
}

function KanbanCol(kp) {
  var stage = kp.stage; var deals = kp.deals;
  var stageDeals = (deals || []).filter(function(d) { return d.stage === stage.id; });

  return ce('div', { style: { flex: '1 1 0', minWidth: 180, maxWidth: 260 } },
    ce('div', { style: { background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.8)', borderRadius: '20px 6px 20px 20px', padding: '12px 10px', height: '100%', boxShadow: SHADOW } },
      ce('div', { style: { display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid rgba(30,27,75,0.07)' } },
        ce('div', { style: { width: 10, height: 10, borderRadius: '50%', background: stage.color, boxShadow: '2px 2px 4px var(--m-dark), -1px -1px 3px var(--m-light)', flexShrink: 0 } }),
        ce('div', { style: { fontSize: 11, fontWeight: 700, color: 'var(--t1)', letterSpacing: '0.06em', textTransform: 'uppercase', flex: 1 } }, stage.label),
        stageDeals.length > 0 ? ce('div', { style: { fontSize: 11, color: 'var(--t3)', background: 'rgba(255,255,255,0.8)', borderRadius: 20, padding: '2px 7px', boxShadow: SHADOW_SM } }, stageDeals.length) : null,
      ),
      ce(Droppable, { droppableId: stage.id }, function(provided, snapshot) {
        return ce('div', Object.assign({ ref: provided.innerRef, style: { minHeight: 60, background: snapshot.isDraggingOver ? 'rgba(167,139,250,0.06)' : 'transparent', borderRadius: 10, padding: '2px 0', transition: 'background .15s' } }, provided.droppableProps),
          stageDeals.map(function(deal, i) {
            return ce(DealCard, { key: deal.id, deal: deal, stage: stage, index: i, clients: kp.clients, openDeal: kp.openDeal });
          }),
          provided.placeholder,
          stageDeals.length === 0 && !snapshot.isDraggingOver ? ce('div', { style: { fontSize: 11, color: 'var(--t3)', textAlign: 'center', padding: '20px 0', opacity: 0.5 } }, 'Brak') : null,
        );
      }),
    ),
  );
}

function KanbanBoard(kp) {
  function onDragEnd(result) {
    if (!result.destination) return;
    var toStage = result.destination.droppableId;
    var fromStage = result.source.droppableId;
    if (toStage === fromStage) return;
    kp.moveStage(result.draggableId, toStage);
  }
  return ce(DragDropContext, { onDragEnd: onDragEnd },
    ce(Fragment, null,
      ce('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap', paddingBottom: 12 } },
        CRM_STAGES.map(function(stage) {
          return ce(KanbanCol, { key: stage.id, stage: stage, deals: kp.deals, clients: kp.clients, openDeal: kp.openDeal });
        }),
      ),
      ce('div', { style: { margin: '12px 0 8px', height: 1, background: 'var(--m-dark)' } }),
      ce('div', { style: { display: 'flex', gap: 10 } },
        ce(KanbanCol, { stage: STAGE_ODRZUCONE, deals: kp.deals, clients: kp.clients, openDeal: kp.openDeal }),
      ),
    ),
  );
}

// ── Główny komponent ──────────────────────────────────────────────────────────
export function ScreenCRM(p) {
  var gcalToken = p.gcalToken || null;
  var setGcalToken = p.setGcalToken || function() {};
  var gsiReady = !!p.gsiReady;

  var sDeals   = useState(null);   var deals = sDeals[0]; var setDeals = sDeals[1];
  var sModal   = useState(null);   var modalDeal = sModal[0]; var setModalDeal = sModal[1];
  var sLoading = useState(true);   var loading = sLoading[0]; var setLoading = sLoading[1];
  var sNewCl   = useState('');     var newClientId = sNewCl[0]; var setNewClientId = sNewCl[1];
  var sAdding  = useState(false);  var adding = sAdding[0]; var setAdding = sAdding[1];
  var sCalList = useState([]);     var calList = sCalList[0]; var setCalList = sCalList[1];

  useEffect(function() {
    sbApi.getDeals().then(function(data) { setDeals(data || []); setLoading(false); })
      .catch(function() { setDeals([]); setLoading(false); });
  }, []);

  useEffect(function() {
    if (!gcalToken) return;
    fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer', {
      headers: { Authorization: 'Bearer ' + gcalToken },
    }).then(function(r) { return r.json(); }).then(function(data) {
      var items = (data.items || []).map(function(c) {
        return { id: c.id, summary: c.summary, color: c.backgroundColor || '#4285f4', primary: !!c.primary };
      });
      items.sort(function(a, b) { if (a.primary) return -1; if (b.primary) return 1; return 0; });
      setCalList(items);
    }).catch(function() {});
  }, [gcalToken]);

  function addDeal() {
    if (!newClientId) return;
    setAdding(true);
    sbApi.addDeal(newClientId).then(function(res) {
      var d = res && res[0] ? res[0] : null;
      if (d) setDeals(function(prev) { return prev.concat([d]); });
      setNewClientId('');
      setAdding(false);
    }).catch(function(e) { alert('Błąd: ' + e.message); setAdding(false); });
  }

  function moveStage(dealId, stage) {
    setDeals(function(prev) { return prev.map(function(d) { return String(d.id) === String(dealId) ? Object.assign({}, d, { stage: stage }) : d; }); });
    sbApi.updateDeal(dealId, { stage: stage, updated_at: new Date().toISOString() });
    var deal = (deals || []).find(function(d) { return String(d.id) === String(dealId); });
    var stageObj = CRM_STAGES.concat([STAGE_ODRZUCONE]).find(function(s) { return s.id === stage; });
    if (deal && stageObj && stageObj.clientStatus) {
      sbApi.updateClientStatus(deal.client_id, stageObj.clientStatus);
      p.onClientStatusChange && p.onClientStatusChange(deal.client_id, stageObj.clientStatus);
    }
  }

  function gcalLogin2() {
    if (!gsiReady) { alert('Biblioteka Google się ładuje, spróbuj za chwilę.'); return; }
    gcalLogin().then(function(tok) { setGcalToken(tok); }).catch(function(e) { alert('Błąd logowania: ' + (e.message || 'nieznany')); });
  }

  if (loading) return ce('div', { style: { textAlign: 'center', padding: '3rem', color: 'var(--m-muted)' } }, 'Ładowanie CRM...');

  var dealClientIds = (deals || []).map(function(d) { return String(d.client_id); });
  var clientsForSelect = (p.clients || []).filter(function(cl) { return !dealClientIds.includes(String(cl.id)); });

  return ce('div', null,

    // Panel Google Calendar
    ce('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.85)', borderRadius: '14px 6px 14px 14px', padding: '12px 16px', boxShadow: SHADOW } },
      ce('span', { style: { fontSize: 13, fontWeight: 600, color: 'var(--t1)', flex: 1 } },
        gcalToken ? '\u2713 Google Calendar po\u0142\u0105czony' : 'Google Calendar',
      ),
      gcalToken
        ? ce('button', { onClick: function() { gcalLogout().then(function() { setGcalToken(null); }); }, style: { ...S.btn, color: 'var(--accent-ros)', fontSize: 12 } }, 'Wyloguj')
        : ce('button', { onClick: gcalLogin2, style: { ...S.btnAccent, fontSize: 12 } }, '\uD83D\uDD11 Zaloguj przez Google'),
    ),

    // Dodaj deal
    ce('div', { style: { display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' } },
      ce('select', {
        value: newClientId,
        onChange: function(e) { setNewClientId(e.target.value); },
        style: { flex: 1, padding: '10px 13px', borderRadius: '12px 4px 12px 12px', border: '1px solid rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)', color: 'var(--t1)', fontSize: 13, fontFamily: 'inherit', outline: 'none', appearance: 'none' },
      },
        ce('option', { value: '' }, 'Wybierz klienta\u2026'),
        clientsForSelect.map(function(cl) { return ce('option', { key: cl.id, value: cl.id }, cl.name); }),
      ),
      ce('button', {
        onClick: addDeal, disabled: !newClientId || adding,
        style: { ...S.btnAccent, opacity: !newClientId ? 0.4 : 1, whiteSpace: 'nowrap' },
      }, adding ? '\u23F3' : '+ Deal'),
    ),

    // Kanban
    ce(KanbanBoard, { deals: deals, clients: p.clients || [], moveStage: moveStage, openDeal: function(deal) { setModalDeal(deal); } }),

    // Modal
    modalDeal ? ce(ModalDeal, {
      deal: modalDeal,
      client: (p.clients || []).find(function(c) { return String(c.id) === String(modalDeal.client_id); }) || null,
      gcalToken: gcalToken, setGcalToken: setGcalToken,
      calList: calList,
      onSave: function(data) {
        setDeals(function(prev) { return prev.map(function(d) { return d.id === modalDeal.id ? Object.assign({}, d, data) : d; }); });
        setModalDeal(null);
      },
      onDelete: function() {
        sbApi.deleteDeal(modalDeal.id).then(function() {
          setDeals(function(prev) { return prev.filter(function(d) { return d.id !== modalDeal.id; }); });
          setModalDeal(null);
        });
      },
      onClose: function() { setModalDeal(null); },
      onGoToClient: function() { p.setCurClientId && p.setCurClientId(modalDeal.client_id); p.setScreen && p.setScreen('rooms'); },
    }) : null,
  );
}
