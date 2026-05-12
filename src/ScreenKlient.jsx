import React, { useState, useEffect, Fragment } from 'react';
import { sbApi } from './supabase.js';
import {
  PROD_TYPES, ROOM_PRESETS, InlineEdit,
  IMG_ROOM_SALON, IMG_ROOM_KUCHNIA, IMG_ROOM_SYPIALNIA,
  IMG_ROOM_GABINET, IMG_ROOM_POKÓJ, IMG_OKNO,
  calc, mg, getPanelsForProd, roundTo10,
  generateOfferPDF, generateKarniszOrderPDF,
  buildFabricRows, buildOfferRows,
} from './data.js';
import {
  generateFabricOrderPDF, generateSewingOrderPDF, generateSimplifiedPDF, generateClientEmail,
} from './pdf.js';
import {
  ModalRoom, ModalWindow,
  ModalConfirmDelete, ModalConfirmRemove, ModalConfirmTypeChange,
} from './ModalRoom.jsx';
import { ProdCard } from './ProdCard.jsx';
import { ModalSewing } from './ModalSewing.jsx';

var ce = React.createElement;

// ── Helpers ───────────────────────────────────────────────────────────────────
function wt(w) {
  return (w.products || []).reduce(function(a, p) {
    var pfc = (p.type === 'zaslona' || p.type === 'firana')
      ? mg(p, { panels: getPanelsForProd(p) }) : p;
    return a + (p.mp != null ? p.mp : (calc(pfc).total || 0));
  }, 0);
}
function rt(r)  { return (r.windows || []).reduce(function(a, w) { return a + wt(w); }, 0); }
function clientTotal(cl) { return (cl.rooms || []).reduce(function(a, r) { return a + rt(r); }, 0); }
function hasWinData(w)  { return !!(w.products && w.products.length > 0); }
function hasRoomData(r) { return !!(r.windows && r.windows.some(function(w) { return hasWinData(w); })); }

// ── Główny komponent ──────────────────────────────────────────────────────────
export function ScreenKlient(p) {
  var sScreen  = useState('rooms');  var screen = sScreen[0];  var setScreen = sScreen[1];
  var sClient  = useState(p.client); var client = sClient[0];  var setClientLocal = sClient[1];
  var sRoomId  = useState(null);     var curRoomId = sRoomId[0]; var setCurRoomId = sRoomId[1];
  var sWin     = useState(null);     var curWin = sWin[0];     var setCurWin = sWin[1];
  var sRoomMod = useState(false);    var showRoomModal = sRoomMod[0]; var setShowRoomModal = sRoomMod[1];
  var sWinMod  = useState(false);    var showWinModal = sWinMod[0];  var setShowWinModal = sWinMod[1];
  var sSewMod  = useState(false);    var showSewingModal = sSewMod[0]; var setShowSewingModal = sSewMod[1];
  var sSave    = useState(null);     var saveStatus = sSave[0]; var setSaveStatus = sSave[1];
  var sConfDel = useState(null);     var confirmDelete = sConfDel[0]; var setConfirmDelete = sConfDel[1];
  var sConfRem = useState(null);     var confirmRemove = sConfRem[0]; var setConfirmRemove = sConfRem[1];
  var sConfTyp = useState(null);     var confirmTypeChange = sConfTyp[0]; var setConfirmTypeChange = sConfTyp[1];
  var sComm    = useState(String(p.client.commission || '')); var commissionInput = sComm[0]; var setCommissionInput = sComm[1];
  var sMont    = useState(String(p.client.install_fee || '')); var montazInput = sMont[0]; var setMontazInput = sMont[1];

  var curRoom = (client.rooms || []).find(function(r) { return r.id === curRoomId; }) || null;

  useEffect(function() {
    if (screen === 'detail') window.scrollTo({ top: 0, behavior: 'instant' });
  }, [screen, curWin && curWin.id]);

  // ── Zapis ─────────────────────────────────────────────────────────────────
  function saveClientToSb(updated) {
    setSaveStatus('saving');
    sbApi.updateClient(updated.id, {
      name: updated.name, addr: updated.addr || '',
      phone: updated.phone || '', email: updated.email || '',
      rooms: updated.rooms,
      commission: updated.commission || '',
      install_fee: updated.install_fee || '',
    }).then(function() {
      setSaveStatus('ok');
      setTimeout(function() { setSaveStatus(null); }, 1500);
      p.onSave && p.onSave(updated);
    }).catch(function(e) {
      console.error('Błąd zapisu:', e);
      setSaveStatus('error');
    });
  }

  function updateClient(fn) {
    setClientLocal(function(cl) {
      var updated = fn(cl);
      saveClientToSb(updated);
      return updated;
    });
  }

  // ── Nawigacja ─────────────────────────────────────────────────────────────
  function openRoom(id) { setCurRoomId(id); setScreen('windows'); }
  function openWin(w)   { setCurWin(JSON.parse(JSON.stringify(w))); setScreen('detail'); }
  function newWin(name) { setCurWin({ id: Date.now(), name: name, products: [] }); setScreen('detail'); }

  // ── Operacje na pokojach ──────────────────────────────────────────────────
  function addRoom(name, img) {
    var newRoom = { id: Date.now(), name: name, img: img || null, windows: [] };
    updateClient(function(cl) { return mg(cl, { rooms: (cl.rooms || []).concat([newRoom]) }); });
  }

  // ── Operacje na oknach ────────────────────────────────────────────────────
  function saveWin() {
    updateClient(function(cl) {
      var newRooms = (cl.rooms || []).map(function(r) {
        if (r.id !== curRoomId) return r;
        var found = (r.windows || []).find(function(w) { return w.id === curWin.id; });
        var newWins = found
          ? (r.windows || []).map(function(w) { return w.id === curWin.id ? curWin : w; })
          : (r.windows || []).concat([curWin]);
        return mg(r, { windows: newWins });
      });
      return mg(cl, { rooms: newRooms });
    });
    setScreen('windows');
  }

  function duplicateWinAsVariant(win) {
    updateClient(function(cl) {
      var newRooms = (cl.rooms || []).map(function(r) {
        if (r.id !== curRoomId) return r;
        var wins = r.windows || [];
        var grpId = win.variantGroup || ('vg_' + win.id);
        var letters = 'ABCDEFGHIJ';
        var newWins = wins.map(function(w) {
          if (w.id !== win.id) return w;
          if (!w.variantGroup) {
            return mg(w, { variantGroup: grpId, variantLabel: 'A', variantBaseName: w.name, name: w.name + ' \u2014 Wariant A' });
          }
          return w;
        });
        var countInGroup = newWins.filter(function(w) { return w.variantGroup === grpId; }).length;
        var nextLetter = letters[countInGroup] || '?';
        var srcWin = newWins.find(function(w) { return w.id === win.id; }) || win;
        var baseName = srcWin.variantBaseName || win.name;
        var newVariant = JSON.parse(JSON.stringify(srcWin));
        newVariant.id = Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        newVariant.variantGroup = grpId;
        newVariant.variantLabel = nextLetter;
        newVariant.variantBaseName = baseName;
        newVariant.name = baseName + ' \u2014 Wariant ' + nextLetter;
        return mg(r, { windows: newWins.concat([newVariant]) });
      });
      return mg(cl, { rooms: newRooms });
    });
  }

  function duplicateWinAsVariantMarszczenie(win) {
    var firstCurtain = (win.products || []).find(function(p) { return p.type === 'zaslona' || p.type === 'firana'; });
    if (!firstCurtain) { alert('Brak zasłony/firany w tym oknie.'); return; }
    var curMars = +(firstCurtain.c && firstCurtain.c.mars != null ? firstCurtain.c.mars : 1.5);
    var nextMars = (+curMars.toFixed(2) === 1.5) ? 2.0 : 1.5;
    var nextMarsPct = Math.round(nextMars * 100) + '%';
    updateClient(function(cl) {
      var newRooms = (cl.rooms || []).map(function(r) {
        if (r.id !== curRoomId) return r;
        var wins = r.windows || [];
        var grpId = win.variantGroup || ('vg_' + win.id);
        var letters = 'ABCDEFGHIJ';
        var newWins = wins.map(function(w) {
          if (w.id !== win.id) return w;
          if (!w.variantGroup) {
            return mg(w, { variantGroup: grpId, variantLabel: 'A', variantBaseName: w.name, name: w.name + ' \u2014 Wariant A' });
          }
          return w;
        });
        var countInGroup = newWins.filter(function(w) { return w.variantGroup === grpId; }).length;
        var nextLetter = letters[countInGroup] || '?';
        var srcWin = newWins.find(function(w) { return w.id === win.id; }) || win;
        var baseName = srcWin.variantBaseName || win.name;
        var newVariant = JSON.parse(JSON.stringify(srcWin));
        newVariant.id = Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        newVariant.variantGroup = grpId;
        newVariant.variantLabel = nextLetter;
        newVariant.variantBaseName = baseName;
        newVariant.name = baseName + ' \u2014 Wariant ' + nextLetter + ' (' + nextMarsPct + ')';
        newVariant.products = (newVariant.products || []).map(function(pp) {
          if (pp.type === 'zaslona' || pp.type === 'firana') return mg(pp, { c: mg(pp.c || {}, { mars: nextMars.toFixed(2) }) });
          return pp;
        });
        return mg(r, { windows: newWins.concat([newVariant]) });
      });
      return mg(cl, { rooms: newRooms });
    });
  }

  // ── Operacje na produktach ────────────────────────────────────────────────
  function addProd() {
    setCurWin(function(w) {
      return mg(w, { products: (w.products || []).concat([{ id: Date.now(), type: 'zaslona', c: {}, par: {}, panels: [{ side: 'Zasłona lewa', w: '' }], mp: null, fabName: null, fabP: null, fabW: null, fabMan: null }]) });
    });
  }
  function updProd(i, prod) { setCurWin(function(w) { return mg(w, { products: (w.products || []).map(function(x, j) { return j === i ? prod : x; }) }); }); }
  function remProd(i)       { setCurWin(function(w) { return mg(w, { products: (w.products || []).filter(function(_, j) { return j !== i; }) }); }); }
  function dupProd(i)       { setCurWin(function(w) { var prods = w.products || []; var copy = mg(prods[i], { id: Date.now() }); return mg(w, { products: prods.slice(0, i + 1).concat([copy]).concat(prods.slice(i + 1)) }); }); }

  // ── Podsumowanie helpers ──────────────────────────────────────────────────
  function clientTotalWithVariants(cl) {
    var sum = 0;
    (cl.rooms || []).forEach(function(r) {
      var groups = {};
      (r.windows || []).forEach(function(w) {
        if (w.variantGroup) { if (!groups[w.variantGroup]) groups[w.variantGroup] = []; groups[w.variantGroup].push(w); }
        else { sum += wt(w); }
      });
      Object.keys(groups).forEach(function(gid) {
        var sorted = groups[gid].slice().sort(function(a, b) { return (a.variantLabel || '').localeCompare(b.variantLabel || ''); });
        sum += wt(sorted[0]);
      });
    });
    return sum;
  }

  // ── Style ─────────────────────────────────────────────────────────────────
  var GLASS = { background: 'rgba(255,255,255,0.68)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.9)' };
  var SHADOW = '0 4px 24px rgba(30,27,75,0.07)';

  function Btn(label, onClick, primary) {
    return ce('button', {
      onClick: onClick,
      style: { padding: '12px 20px', borderRadius: '14px 4px 14px 14px', border: primary ? 'none' : '1.5px solid rgba(30,27,75,0.12)', background: primary ? '#1e1b4b' : 'rgba(255,255,255,0.7)', color: primary ? '#fff' : '#1e1b4b', fontSize: 13, fontWeight: primary ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', boxShadow: primary ? '0 4px 16px rgba(30,27,75,0.2)' : '0 2px 8px rgba(30,27,75,0.05)', transition: 'all .15s' }
    }, label);
  }

  // ── Breadcrumb ────────────────────────────────────────────────────────────
  function BC() {
    var parts = [];
    function cr(label, oc) { return ce('span', { key: label, onClick: oc, style: { cursor: oc ? 'pointer' : 'default', color: oc ? '#a0aec0' : '#1e1b4b', fontWeight: oc ? 400 : 700, fontSize: 13 } }, label); }
    function sep(i) { return ce('span', { key: 's' + i, style: { color: '#a0aec0', margin: '0 6px', fontSize: 13 } }, '/'); }
    parts.push(cr('Klienci', function() { p.onBack && p.onBack(); }));
    parts.push(sep(1));
    parts.push(cr(client.name, screen !== 'rooms' ? function() { setScreen('rooms'); } : null));
    if ((screen === 'windows' || screen === 'detail') && curRoom) { parts.push(sep(2)); parts.push(cr(curRoom.name, screen === 'detail' ? function() { setScreen('windows'); } : null)); }
    if (screen === 'detail' && curWin) { parts.push(sep(3)); parts.push(cr(curWin.name, null)); }
    if (screen === 'sum') { parts.push(sep(4)); parts.push(cr('Podsumowanie', null)); }
    return ce('div', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid rgba(30,27,75,0.08)' } }, parts);
  }

  var content = null;
  var comm = (+commissionInput || 0) / 100;
  function withComm(price) { return comm > 0 ? roundTo10(price * (1 + comm)) : roundTo10(price); }

  // ══════════════════════════════════════════════════════════════════════════
  // EKRAN: POKOJE
  // ══════════════════════════════════════════════════════════════════════════
  if (screen === 'rooms') {
    var rooms = client.rooms || [];

    function roomImg(r) {
      var n = (r.name || '').toLowerCase();
      if (r.img) return r.img;
      if (n.includes('salon'))    return IMG_ROOM_SALON;
      if (n.includes('kuchnia'))  return IMG_ROOM_KUCHNIA;
      if (n.includes('sypialnia'))return IMG_ROOM_SYPIALNIA;
      if (n.includes('gabinet'))  return IMG_ROOM_GABINET;
      if (n.includes('pok'))      return IMG_ROOM_POKÓJ;
      return null;
    }

    var roomTiles = rooms.map(function(r) {
      var rTotal = rt(r);
      var img = roomImg(r);
      return ce('div', {
        key: r.id,
        style: Object.assign({}, GLASS, { borderRadius: '16px 6px 16px 16px', padding: '16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: SHADOW, position: 'relative' }),
      },
        img
          ? ce('img', { onClick: function() { openRoom(r.id); }, src: img, style: { width: 90, height: 90, objectFit: 'cover', borderRadius: '12px 4px 12px 12px', cursor: 'pointer', flexShrink: 0 } })
          : ce('div', { onClick: function() { openRoom(r.id); }, style: { width: 90, height: 90, borderRadius: '12px 4px 12px 12px', background: 'rgba(167,139,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 28 } }, r.name && r.name[0] || '□'),
        ce('div', { onClick: function() { openRoom(r.id); }, style: { flex: 1, cursor: 'pointer', minWidth: 0 } },
          ce('div', { style: { fontSize: 15, fontWeight: 700, color: '#1e1b4b', marginBottom: 3 } },
            ce(InlineEdit, {
              value: r.name,
              onSave: function(v) { updateClient(function(cl) { return mg(cl, { rooms: (cl.rooms || []).map(function(x) { return x.id === r.id ? mg(x, { name: v }) : x; }) }); }); },
              inputStyle: { fontSize: 14, fontWeight: 700 },
            })
          ),
          ce('div', { style: { fontSize: 11, color: '#a0aec0' } }, (r.windows || []).length + ' okien'),
        ),
        rTotal ? ce('span', { onClick: function() { openRoom(r.id); }, style: { fontSize: 13, fontWeight: 700, color: '#5b21b6', cursor: 'pointer', whiteSpace: 'nowrap' } }, withComm(rTotal) + ' zł') : null,
        ce('span', { onClick: function() { openRoom(r.id); }, style: { color: '#a0aec0', fontSize: 18, cursor: 'pointer' } }, '›'),
        ce('button', {
          onClick: function(ev) {
            ev.stopPropagation();
            var doDelete = function() { updateClient(function(cl) { return mg(cl, { rooms: (cl.rooms || []).filter(function(x) { return x.id !== r.id; }) }); }); };
            if (hasRoomData(r)) { setConfirmDelete({ type: 'room', label: r.name, onConfirm: doDelete }); } else { doDelete(); }
          },
          style: { position: 'absolute', top: 8, right: 8, border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#a0aec0', padding: '4px 8px', lineHeight: 1, opacity: 0.6 }
        }, '×'),
      );
    });

    content = ce(Fragment, null,
      // Karta klienta
      ce('div', { style: Object.assign({}, GLASS, { borderRadius: '20px 6px 20px 20px', padding: '20px', marginBottom: 20, boxShadow: SHADOW }) },
        ce('div', { style: { fontSize: 10, fontWeight: 700, color: '#a0aec0', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 } }, 'Klient'),
        ce('div', { style: { fontSize: 18, fontWeight: 800, color: '#1e1b4b', marginBottom: 6 } },
          ce(InlineEdit, { value: client.name, onSave: function(v) { updateClient(function(cl) { return mg(cl, { name: v }); }); }, inputStyle: { fontSize: 18, fontWeight: 800 } })
        ),
        ce('div', { style: { fontSize: 13, color: '#4b5563', lineHeight: 1.5 } },
          ce(InlineEdit, { value: client.addr || '(brak adresu)', onSave: function(v) { updateClient(function(cl) { return mg(cl, { addr: v }); }); }, inputStyle: { fontSize: 13 } })
        ),
        ce('div', { style: { fontSize: 13, color: '#4b5563', lineHeight: 1.5 } },
          ce(InlineEdit, { value: client.phone || '(brak telefonu)', onSave: function(v) { updateClient(function(cl) { return mg(cl, { phone: v }); }); }, inputStyle: { fontSize: 13 } })
        ),
        ce('div', { style: { fontSize: 13, color: '#4b5563', lineHeight: 1.5 } },
          ce(InlineEdit, { value: client.email || '(brak e-mail)', onSave: function(v) { updateClient(function(cl) { return mg(cl, { email: v }); }); }, inputStyle: { fontSize: 13 } })
        ),
        clientTotal(client) > 0 ? ce('div', { style: { fontSize: 16, fontWeight: 800, color: '#5b21b6', marginTop: 10 } }, withComm(clientTotal(client)) + ' zł łącznie') : null,
      ),
      ce('div', { style: { fontSize: 10, fontWeight: 700, color: '#a0aec0', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 } }, 'Pomieszczenia'),
      ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 } },
        roomTiles,
        ce('div', {
          onClick: function() { setShowRoomModal(true); },
          style: { border: '2px dashed rgba(167,139,250,0.3)', borderRadius: '16px 6px 16px 16px', padding: '18px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, color: '#a0aec0', background: 'rgba(255,255,255,0.4)', transition: 'all .15s' },
        },
          ce('span', { style: { fontSize: 22, fontWeight: 300 } }, '+'),
          ce('span', { style: { fontSize: 14 } }, 'Dodaj pomieszczenie')
        ),
      ),
      rooms.length > 0 ? ce('div', { style: { display: 'flex', gap: 10 } }, Btn('Podsumowanie ↗', function() { setScreen('sum'); }, true)) : null,
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EKRAN: OKNA
  // ══════════════════════════════════════════════════════════════════════════
  else if (screen === 'windows' && curRoom) {
    var winRows = (curRoom.windows || []).map(function(w) {
      var t = wt(w);
      var labels = (w.products || []).map(function(pr) { return (PROD_TYPES.find(function(pt) { return pt.id === pr.type; }) || { label: pr.type }).label; }).join(', ');
      var isVariant = !!w.variantGroup;
      var hasCurtain = (w.products || []).some(function(pr) { return pr.type === 'zaslona' || pr.type === 'firana'; });

      return ce('div', {
        key: w.id,
        style: Object.assign({}, GLASS, {
          borderRadius: isVariant ? '6px 16px 16px 16px' : '16px 6px 16px 16px',
          padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: SHADOW,
          borderLeft: isVariant ? '3px solid #a78bfa' : 'none',
        }),
      },
        ce('div', { onClick: function() { openWin(w); }, style: { flex: 1, cursor: 'pointer', minWidth: 0, display: 'flex', alignItems: 'center', gap: 12 } },
          ce('img', { src: IMG_OKNO, style: { width: 60, height: 60, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }, onError: function(e) { e.target.style.display = 'none'; } }),
          ce('div', { style: { flex: 1, minWidth: 0 } },
            ce('div', { style: { fontSize: 14, fontWeight: 700, color: '#1e1b4b', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 } },
              w.name,
              isVariant ? ce('span', { style: { fontSize: 10, fontWeight: 700, background: 'rgba(167,139,250,0.15)', color: '#7c3aed', borderRadius: 6, padding: '2px 6px' } }, 'Wariant ' + w.variantLabel) : null,
            ),
            ce('div', { style: { fontSize: 11, color: '#a0aec0' } }, labels || '\u2014'),
            t ? ce('div', { style: { fontSize: 13, fontWeight: 700, color: '#5b21b6', marginTop: 2 } }, withComm(t) + ' zł') : null,
          ),
          ce('span', { style: { color: '#a0aec0', fontSize: 18 } }, '›'),
        ),
        ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 } },
          ce('button', { onClick: function(ev) { ev.stopPropagation(); duplicateWinAsVariant(w); }, style: { border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.08)', cursor: 'pointer', fontSize: 11, color: '#7c3aed', padding: '4px 8px', borderRadius: 6, fontWeight: 600, whiteSpace: 'nowrap', fontFamily: 'inherit' } }, '\u21bb Wariant'),
          hasCurtain ? ce('button', { onClick: function(ev) { ev.stopPropagation(); duplicateWinAsVariantMarszczenie(w); }, style: { border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.06)', cursor: 'pointer', fontSize: 11, color: '#7c3aed', padding: '4px 8px', borderRadius: 6, fontWeight: 600, whiteSpace: 'nowrap', fontFamily: 'inherit' } }, '\uD83E\uDDF5 Mars.') : null,
          ce('button', {
            onClick: function(ev) {
              ev.stopPropagation();
              var doDelete = function() { updateClient(function(cl) { return mg(cl, { rooms: (cl.rooms || []).map(function(r) { if (r.id !== curRoomId) return r; return mg(r, { windows: (r.windows || []).filter(function(x) { return x.id !== w.id; }) }); }) }); }); };
              if (hasWinData(w)) { setConfirmDelete({ type: 'window', label: w.name, onConfirm: doDelete }); } else { doDelete(); }
            },
            style: { border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#a0aec0', padding: '4px 8px', lineHeight: 1 }
          }, '×'),
        ),
      );
    });

    content = ce(Fragment, null,
      ce('div', { style: { fontSize: 10, fontWeight: 700, color: '#a0aec0', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 } },
        ce(InlineEdit, {
          value: curRoom.name + ' \u2014 okna',
          onSave: function(v) {
            var n = v.replace(/\s*\u2014\s*okna$/i, '').trim();
            updateClient(function(cl) { return mg(cl, { rooms: (cl.rooms || []).map(function(r) { return r.id === curRoomId ? mg(r, { name: n }) : r; }) }); });
          },
          inputStyle: { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a0aec0' }
        })
      ),
      (curRoom.windows || []).length === 0 ? ce('div', { style: { color: '#a0aec0', fontSize: 14, textAlign: 'center', padding: '24px 0' } }, 'Brak okien. Dodaj pierwsze.') : null,
      winRows.length ? ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 } }, winRows) : null,
      Btn('+ Dodaj okno', function() { setShowWinModal(true); }, false),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EKRAN: PRODUKTY OKNA
  // ══════════════════════════════════════════════════════════════════════════
  else if (screen === 'detail' && curWin) {
    var wtv = wt(curWin);
    content = ce(Fragment, null,
      ce('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(30,27,75,0.08)' } },
        ce('div', { style: { fontSize: 18, fontWeight: 700, color: '#1e1b4b' } },
          ce(InlineEdit, { value: curWin.name, onSave: function(v) { setCurWin(function(w) { return mg(w, { name: v }); }); }, inputStyle: { fontSize: 14, fontWeight: 500 } })
        ),
        wtv ? ce('div', { style: { fontSize: 16, fontWeight: 800, color: '#5b21b6', background: 'rgba(167,139,250,0.1)', padding: '6px 14px', borderRadius: '12px 4px 12px 12px' } }, withComm(wtv) + ' zł') : null,
      ),
      // Skróty nawigacyjne po produktach
      (curWin.products || []).length >= 2 ? ce('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.6)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.9)' } },
        (curWin.products || []).map(function(prod, i) {
          var label = (PROD_TYPES.find(function(pt) { return pt.id === prod.type; }) || { label: prod.type }).label;
          return ce('button', {
            key: prod.id,
            onClick: function() { var el = document.getElementById('prod-anchor-' + prod.id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
            style: { padding: '5px 12px', borderRadius: 20, border: '1px solid rgba(30,27,75,0.1)', background: 'rgba(255,255,255,0.7)', color: '#4b5563', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }
          }, label);
        })
      ) : null,
      (curWin.products || []).length === 0 ? ce('div', { style: { color: '#a0aec0', fontSize: 14, textAlign: 'center', padding: '24px 0', marginBottom: 16 } }, 'Brak produktów. Dodaj pierwszy.') : null,
      ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 } },
        (curWin.products || []).map(function(prod, i) {
          return ce('div', { key: prod.id, id: 'prod-anchor-' + prod.id },
            ce(ProdCard, {
              prod: prod,
              index: i,
              winName: curWin.name,
              onChange: function(updated) { updProd(i, updated); },
              onRemove: function() {
                if (hasWinData({ products: [prod] })) {
                  setConfirmRemove({ label: (PROD_TYPES.find(function(pt) { return pt.id === prod.type; }) || { label: prod.type }).label, onConfirm: function() { remProd(i); } });
                } else { remProd(i); }
              },
              onDuplicate: function() { dupProd(i); },
              onTypeChange: function(newType, doChange) { setConfirmTypeChange({ onConfirm: function() { doChange(); } }); },
              clients: p.clients || [],
            })
          );
        })
      ),
      ce('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
        Btn('+ Dodaj produkt', addProd, false),
        Btn('Zapisz \u2713', saveWin, true),
      ),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EKRAN: PODSUMOWANIE (1:1 z Porter Design)
  // ══════════════════════════════════════════════════════════════════════════
  else if (screen === 'sum') {
    var sRooms = (client.rooms || []).filter(function(r) { return (r.windows || []).length > 0; });
    var hasAnyVariants = (client.rooms || []).some(function(r) { return (r.windows || []).some(function(w) { return !!w.variantGroup; }); });

    function renderRoomSummary(r) {
      var wins = r.windows || [];
      var variantGroups = {};
      var plainWins = [];
      wins.forEach(function(w) {
        if (w.variantGroup) { if (!variantGroups[w.variantGroup]) variantGroups[w.variantGroup] = []; variantGroups[w.variantGroup].push(w); }
        else { plainWins.push(w); }
      });
      var hasVariants = Object.keys(variantGroups).length > 0;
      var roomBaseTotal = plainWins.reduce(function(a, w) { return a + wt(w); }, 0);
      Object.keys(variantGroups).forEach(function(gid) {
        var sorted = variantGroups[gid].slice().sort(function(a, b) { return (a.variantLabel || '').localeCompare(b.variantLabel || ''); });
        roomBaseTotal += wt(sorted[0]);
      });

      function winCard(w, extraStyle) {
        var t = wt(w);
        var desc = (w.products || []).map(function(pp) { var l = (PROD_TYPES.find(function(pt) { return pt.id === pp.type; }) || { label: pp.type }).label; return pp.fabName ? l + ' (' + pp.fabName + ')' : l; }).join(', ');
        return ce('div', { key: w.id, style: Object.assign({ padding: '14px 16px', background: 'rgba(255,255,255,0.6)', borderRadius: 12, marginBottom: 6, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, border: '1px solid rgba(255,255,255,0.9)' }, extraStyle || {}) },
          ce('div', { style: { flex: 1, minWidth: 0 } },
            ce('div', { style: { fontSize: 14, fontWeight: 600, color: '#1e1b4b', marginBottom: 3 } }, '\uD83E\uDE9F ' + w.name),
            ce('div', { style: { fontSize: 11, color: '#a0aec0', marginTop: 2 } }, desc || '\u2014')
          ),
          ce('div', { style: { fontSize: 15, fontWeight: 700, color: '#5b21b6', whiteSpace: 'nowrap' } }, withComm(t) + ' zł')
        );
      }

      var rows = [];
      plainWins.forEach(function(w) { rows.push(winCard(w)); });
      Object.keys(variantGroups).forEach(function(gid) {
        var group = variantGroups[gid].slice().sort(function(a, b) { return (a.variantLabel || '').localeCompare(b.variantLabel || ''); });
        var baseName = group[0].variantBaseName || group[0].name;
        rows.push(ce('div', { key: 'vg_' + gid, style: { border: '2px solid rgba(167,139,250,0.4)', borderRadius: 14, marginBottom: 8, overflow: 'hidden' } },
          ce('div', { style: { background: 'rgba(167,139,250,0.1)', padding: '8px 14px', fontSize: 11, fontWeight: 700, color: '#7c3aed', letterSpacing: '0.07em', textTransform: 'uppercase' } }, '\uD83D\uDD00 Warianty \u2014 ' + baseName),
          group.map(function(w, gi) {
            var t = wt(w);
            var desc = (w.products || []).map(function(pp) { var l = (PROD_TYPES.find(function(pt) { return pt.id === pp.type; }) || { label: pp.type }).label; return pp.fabName ? l + ' (' + pp.fabName + ')' : l; }).join(', ');
            return ce('div', { key: w.id, style: { padding: '12px 14px', borderBottom: gi < group.length - 1 ? '1px solid rgba(167,139,250,0.2)' : 'none', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, background: gi % 2 === 0 ? 'rgba(255,255,255,0.7)' : 'rgba(167,139,250,0.04)' } },
              ce('div', { style: { flex: 1 } },
                ce('div', { style: { fontSize: 13, fontWeight: 700, color: '#7c3aed', marginBottom: 2 } }, 'Wariant ' + w.variantLabel),
                ce('div', { style: { fontSize: 11, color: '#a0aec0' } }, desc || '\u2014')
              ),
              ce('div', { style: { fontSize: 15, fontWeight: 700, color: '#7c3aed', whiteSpace: 'nowrap' } }, withComm(t) + ' zł')
            );
          })
        ));
      });

      return ce('div', { key: r.id, style: { marginBottom: 20 } },
        ce('div', { style: { fontSize: 13, fontWeight: 700, color: '#1e1b4b', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10 } },
          r.name + (hasVariants ? ' \u2014 od ' + withComm(roomBaseTotal) + ' zł' : ' \u2014 ' + withComm(roomBaseTotal) + ' zł')
        ),
        rows
      );
    }

    content = ce(Fragment, null,
      sRooms.map(function(r) { return renderRoomSummary(r); }),
      sRooms.length === 0 ? ce('div', { style: { color: '#a0aec0', fontSize: 12, padding: '12px 0' } }, 'Brak okien do podsumowania.') : null,
      // Polecenie
      ce('div', { style: Object.assign({}, GLASS, { borderRadius: 12, padding: '14px 16px', marginBottom: 10, marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, boxShadow: SHADOW }) },
        ce('span', { style: { fontSize: 13, fontWeight: 600, color: '#4b5563', flex: 1 } }, '\uD83E\uDD1D Polecenie (%)'),
        ce('input', { type: 'number', min: 0, max: 100, step: 1, value: commissionInput, onChange: function(ev) { var v = ev.target.value; setCommissionInput(v); updateClient(function(cl) { return mg(cl, { commission: v }); }); }, placeholder: 'np. 7', style: { width: 80, padding: '8px 12px', fontSize: 14, border: '1.5px solid rgba(255,255,255,0.85)', borderRadius: 8, background: 'rgba(255,255,255,0.7)', color: '#1e1b4b', textAlign: 'right', fontFamily: 'inherit', outline: 'none' } }),
        commissionInput ? ce('span', { style: { fontSize: 13, color: '#5b21b6', fontWeight: 600 } }, '+' + commissionInput + '%') : null,
        commissionInput ? ce('button', { onClick: function() { setCommissionInput(''); updateClient(function(cl) { return mg(cl, { commission: '' }); }); }, style: { border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#a0aec0' } }, '\u00d7') : null,
      ),
      // Montaż
      ce('div', { style: Object.assign({}, GLASS, { borderRadius: 12, padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, boxShadow: SHADOW }) },
        ce('span', { style: { fontSize: 13, fontWeight: 600, color: '#4b5563', flex: 1 } }, '\uD83D\uDD28 Montaż (%)'),
        ce('input', { type: 'number', min: 0, max: 100, step: 1, value: montazInput, onChange: function(ev) { var v = ev.target.value; setMontazInput(v); updateClient(function(cl) { return mg(cl, { install_fee: v }); }); }, placeholder: 'np. 10', style: { width: 80, padding: '8px 12px', fontSize: 14, border: '1.5px solid rgba(255,255,255,0.85)', borderRadius: 8, background: 'rgba(255,255,255,0.7)', color: '#1e1b4b', textAlign: 'right', fontFamily: 'inherit', outline: 'none' } }),
        montazInput ? ce('span', { style: { fontSize: 13, color: '#5b21b6', fontWeight: 600 } }, '+' + montazInput + '%') : null,
        montazInput ? ce('button', { onClick: function() { setMontazInput(''); updateClient(function(cl) { return mg(cl, { install_fee: '' }); }); }, style: { border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#a0aec0' } }, '\u00d7') : null,
      ),
      // Total
      ce('div', { style: { background: '#1e1b4b', borderRadius: '18px 6px 18px 18px', padding: '20px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, boxShadow: '0 8px 24px rgba(30,27,75,0.25)' } },
        ce('span', { style: { fontSize: 14, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.04em' } },
          hasAnyVariants
            ? (commissionInput && (+commissionInput) > 0 ? 'Łącznie od (Wariant A) + ' + commissionInput + '% polecenie' : 'Łącznie od (Wariant A)')
            : (commissionInput && (+commissionInput) > 0 ? 'Łącznie + ' + commissionInput + '% polecenie' : 'Łącznie cała wizyta')
        ),
        ce('span', { style: { fontSize: 22, fontWeight: 800, color: '#fff' } }, withComm(clientTotalWithVariants(client)) + ' zł'),
      ),
      // Przyciski PDF
      ce('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
        Btn('\u2190 Edytuj', function() { setScreen('rooms'); }, false),
        ce('button', { onClick: function() { try { generateOfferPDF(client, comm, (+montazInput || 0) / 100); } catch(e) { alert('Błąd PDF: ' + e.message); } }, style: { padding: '12px 18px', borderRadius: '14px 4px 14px 14px', border: 'none', background: '#5b21b6', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' } }, '\uD83D\uDCC4 Wycena PDF'),
        ce('button', { onClick: function() { try { generateSimplifiedPDF(client, comm, (+montazInput || 0) / 100); } catch(e) { alert('Błąd PDF: ' + e.message); } }, style: { padding: '12px 18px', borderRadius: '4px 14px 14px 14px', border: 'none', background: '#7c3aed', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' } }, '\uD83D\uDCCB Uproszczona'),
        ce('button', { onClick: function() { try { generateFabricOrderPDF(client); } catch(e) { alert('Błąd PDF: ' + e.message); } }, style: { padding: '12px 18px', borderRadius: '14px 4px 14px 4px', border: 'none', background: '#4b5563', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' } }, '\uD83E\uDDF5 Tkaniny'),
        ce('button', { onClick: function() { setShowSewingModal(true); }, style: { padding: '12px 18px', borderRadius: '4px 14px 4px 14px', border: 'none', background: '#374151', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' } }, '\u2702\uFE0F Zlecenie'),
      ),
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return ce('div', { style: { minHeight: '100%', position: 'relative' } },
    // Status zapisu
    saveStatus ? ce('div', { style: { position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', background: saveStatus === 'ok' ? '#059669' : saveStatus === 'error' ? '#dc2626' : '#4b5563', color: '#fff', fontSize: 12, padding: '6px 18px', borderRadius: '0 0 10px 10px', zIndex: 9999, letterSpacing: '0.04em', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' } }, saveStatus === 'saving' ? 'Zapisuję...' : saveStatus === 'ok' ? '\u2713 Zapisano' : '\u26a0 Błąd zapisu') : null,

    BC(),
    content,

    // Modals
    showRoomModal   ? ce(ModalRoom,              { onOk: addRoom, onClose: function() { setShowRoomModal(false); } }) : null,
    showWinModal    ? ce(ModalWindow,            { onOk: newWin,  onClose: function() { setShowWinModal(false); } }) : null,
    showSewingModal ? ce(ModalSewing,            { client: client, onClose: function() { setShowSewingModal(false); } }) : null,
    confirmDelete   ? ce(ModalConfirmDelete,     { itemType: confirmDelete.type, label: confirmDelete.label, onConfirm: function() { confirmDelete.onConfirm(); setConfirmDelete(null); }, onClose: function() { setConfirmDelete(null); } }) : null,
    confirmRemove   ? ce(ModalConfirmRemove,     { label: confirmRemove.label,   onConfirm: function() { confirmRemove.onConfirm(); setConfirmRemove(null); }, onClose: function() { setConfirmRemove(null); } }) : null,
    confirmTypeChange ? ce(ModalConfirmTypeChange, { onConfirm: function() { confirmTypeChange.onConfirm(); setConfirmTypeChange(null); }, onClose: function() { setConfirmTypeChange(null); } }) : null,
  );
}
