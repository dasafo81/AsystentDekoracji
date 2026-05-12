import React, { useState, Fragment } from 'react';
import { sbApi } from './supabase.js';
import {
  calc, mg, getPanelsForProd, roundTo10, InlineEdit,
  IMG_ROOM_SALON, IMG_ROOM_KUCHNIA, IMG_ROOM_SYPIALNIA,
  IMG_ROOM_GABINET, IMG_ROOM_POKÓJ, IMG_OKNO, PROD_TYPES, ROOM_PRESETS,
} from './data.js';
import { ModalRoom, ModalWindow, ModalConfirmDelete, ModalConfirmRemove, ModalConfirmTypeChange, ModalSimple } from './ModalRoom.jsx';
import { ProdCard } from './ProdCard.jsx';

var ce = React.createElement;

// ── Helpers ───────────────────────────────────────────────────────────────────
function wt(w) {
  return (w.products || []).reduce(function(a, p) {
    var pfc = (p.type === 'zaslona' || p.type === 'firana')
      ? mg(p, { panels: getPanelsForProd(p) }) : p;
    return a + (p.mp != null ? p.mp : (calc(pfc).total || 0));
  }, 0);
}
function rt(r) { return (r.windows || []).reduce(function(a, w) { return a + wt(w); }, 0); }
function clientTotal(cl) { return (cl.rooms || []).reduce(function(a, r) { return a + rt(r); }, 0); }
function hasWinData(w) { return !!(w.products && w.products.length > 0); }
function hasRoomData(r) { return !!(r.windows && r.windows.some(function(w) { return hasWinData(w); })); }

// ── Główny komponent ──────────────────────────────────────────────────────────
export function ScreenKlient(p) {
  // p.client, p.clients, p.onBack, p.onSave

  var sScreen  = useState('rooms'); var screen = sScreen[0]; var setScreen = sScreen[1];
  var sClient  = useState(p.client); var client = sClient[0]; var setClientLocal = sClient[1];
  var sRoomId  = useState(null); var curRoomId = sRoomId[0]; var setCurRoomId = sRoomId[1];
  var sWin     = useState(null); var curWin = sWin[0]; var setCurWin = sWin[1];
  var sRoomMod = useState(false); var showRoomModal = sRoomMod[0]; var setShowRoomModal = sRoomMod[1];
  var sWinMod  = useState(false); var showWinModal = sWinMod[0]; var setShowWinModal = sWinMod[1];
  var sSave    = useState(null); var saveStatus = sSave[0]; var setSaveStatus = sSave[1];
  var sConfDel = useState(null); var confirmDelete = sConfDel[0]; var setConfirmDelete = sConfDel[1];
  var sConfRem = useState(null); var confirmRemove = sConfRem[0]; var setConfirmRemove = sConfRem[1];
  var sConfTyp = useState(null); var confirmTypeChange = sConfTyp[0]; var setConfirmTypeChange = sConfTyp[1];

  var curRoom = (client.rooms || []).find(function(r) { return r.id === curRoomId; }) || null;

  function updateClient(fn) {
    setClientLocal(function(cl) {
      var updated = fn(cl);
      setSaveStatus('saving');
      sbApi.updateClient(updated.id, {
        name: updated.name, addr: updated.addr,
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
      return updated;
    });
  }

  function addRoom(name, img) {
    var newRoom = { id: Date.now(), name: name, img: img || null, windows: [] };
    updateClient(function(cl) { return mg(cl, { rooms: (cl.rooms || []).concat([newRoom]) }); });
  }

  function openRoom(id) { setCurRoomId(id); setScreen('windows'); }
  function openWin(w)   { setCurWin(JSON.parse(JSON.stringify(w))); setScreen('detail'); }
  function newWin(name) { setCurWin({ id: Date.now(), name: name, products: [] }); setScreen('detail'); }

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
            var baseName = w.name;
            return mg(w, { variantGroup: grpId, variantLabel: 'A', variantBaseName: baseName, name: baseName + ' \u2014 Wariant A' });
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
        newWins = newWins.concat([newVariant]);
        return mg(r, { windows: newWins });
      });
      return mg(cl, { rooms: newRooms });
    });
  }

  function addProd() {
    setCurWin(function(w) {
      return mg(w, { products: (w.products || []).concat([{ id: Date.now(), type: 'zaslona', c: {}, par: {}, panels: [{ side: 'Zasłona lewa', w: '' }], mp: null, fabName: null, fabP: null, fabW: null, fabMan: null }]) });
    });
  }
  function updProd(i, prod) { setCurWin(function(w) { return mg(w, { products: (w.products || []).map(function(x, j) { return j === i ? prod : x; }) }); }); }
  function remProd(i)       { setCurWin(function(w) { return mg(w, { products: (w.products || []).filter(function(_, j) { return j !== i; }) }); }); }
  function dupProd(i)       { setCurWin(function(w) { var prods = w.products || []; var src = prods[i]; var copy = mg(src, { id: Date.now() }); return mg(w, { products: prods.slice(0, i + 1).concat([copy]).concat(prods.slice(i + 1)) }); }); }

  // Breadcrumb
  function BC() {
    var parts = [];
    function cr(label, oc) {
      return ce('span', { key: label, onClick: oc, style: { cursor: oc ? 'pointer' : 'default', color: oc ? 'var(--t3)' : 'var(--t1)', fontWeight: oc ? 400 : 700, fontSize: 13, transition: 'color .15s' } }, label);
    }
    function sep(i) { return ce('span', { key: 's' + i, style: { color: 'var(--t3)', margin: '0 6px', fontSize: 13 } }, '/'); }
    parts.push(cr('Klienci', function() { p.onBack && p.onBack(); }));
    parts.push(sep(1));
    parts.push(cr(client.name, screen !== 'rooms' ? function() { setScreen('rooms'); } : null));
    if ((screen === 'windows' || screen === 'detail') && curRoom) { parts.push(sep(2)); parts.push(cr(curRoom.name, screen === 'detail' ? function() { setScreen('windows'); } : null)); }
    if (screen === 'detail' && curWin) { parts.push(sep(3)); parts.push(cr(curWin.name, null)); }
    if (screen === 'sum') { parts.push(sep(4)); parts.push(cr('Podsumowanie', null)); }
    return ce('div', { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(30,27,75,0.08)' } }, parts);
  }

  function Btn(label, onClick, primary) {
    return ce('button', {
      onClick: onClick,
      style: {
        padding: '13px 22px', borderRadius: '14px 4px 14px 14px',
        border: primary ? 'none' : '1.5px solid rgba(30,27,75,0.12)',
        background: primary ? '#1e1b4b' : 'rgba(255,255,255,0.7)',
        color: primary ? '#fff' : '#1e1b4b',
        fontSize: 14, fontWeight: primary ? 700 : 500,
        cursor: 'pointer', fontFamily: 'inherit',
        boxShadow: primary ? '0 4px 16px rgba(30,27,75,0.2)' : '0 2px 8px rgba(30,27,75,0.05)',
        transition: 'all .15s',
      }
    }, label);
  }

  var GLASS = {
    background: 'rgba(255,255,255,0.68)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.9)',
  };

  var SHADOW = '0 4px 24px rgba(30,27,75,0.07)';

  // ── EKRAN: Pokoje ─────────────────────────────────────────────────────────
  var content = null;

  if (screen === 'rooms') {
    var rooms = client.rooms || [];
    var roomTiles = rooms.map(function(r) {
      var rTotal = rt(r);
      var _img = r.img || null;
      return ce('div', {
        key: r.id,
        style: Object.assign({}, GLASS, { borderRadius: '16px 6px 16px 16px', padding: '16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: SHADOW, position: 'relative' }),
      },
        _img
          ? ce('img', { onClick: function() { openRoom(r.id); }, src: _img, style: { width: 90, height: 90, objectFit: 'cover', borderRadius: '12px 4px 12px 12px', cursor: 'pointer', flexShrink: 0 } })
          : ce('div', { onClick: function() { openRoom(r.id); }, style: { width: 90, height: 90, borderRadius: '12px 4px 12px 12px', background: 'rgba(167,139,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 28 } }, r.name && r.name[0] || '□'),
        ce('div', { onClick: function() { openRoom(r.id); }, style: { flex: 1, cursor: 'pointer', minWidth: 0 } },
          ce('div', { style: { fontSize: 15, fontWeight: 700, color: '#1e1b4b', marginBottom: 2 } }, r.name),
          ce('div', { style: { fontSize: 11, color: '#a0aec0' } }, (r.windows || []).length + ' okien'),
        ),
        rTotal ? ce('span', { onClick: function() { openRoom(r.id); }, style: { fontSize: 13, fontWeight: 700, color: '#5b21b6', cursor: 'pointer' } }, roundTo10(rTotal) + ' zł') : null,
        ce('span', { onClick: function() { openRoom(r.id); }, style: { color: '#a0aec0', fontSize: 16, cursor: 'pointer' } }, '›'),
        ce('button', {
          onClick: function(ev) {
            ev.stopPropagation();
            var doDelete = function() { updateClient(function(cl) { return mg(cl, { rooms: (cl.rooms || []).filter(function(x) { return x.id !== r.id; }) }); }); };
            if (hasRoomData(r)) { setConfirmDelete({ type: 'room', label: r.name, onConfirm: doDelete }); } else { doDelete(); }
          },
          style: { position: 'absolute', top: 8, right: 8, border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#a0aec0', padding: '4px 8px', lineHeight: 1 }
        }, '×')
      );
    });

    content = ce(Fragment, null,
      // Info klienta
      ce('div', { style: Object.assign({}, GLASS, { borderRadius: '20px 6px 20px 20px', padding: '20px', marginBottom: 20, boxShadow: SHADOW }) },
        ce('div', { style: { fontSize: 10, fontWeight: 700, color: '#a0aec0', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 } }, 'Klient'),
        ce('div', { style: { fontSize: 18, fontWeight: 800, color: '#1e1b4b', marginBottom: 6 } }, client.name),
        client.addr  ? ce('div', { style: { fontSize: 13, color: '#4b5563' } }, client.addr)  : null,
        client.phone ? ce('div', { style: { fontSize: 13, color: '#4b5563' } }, client.phone) : null,
        client.email ? ce('div', { style: { fontSize: 13, color: '#4b5563' } }, client.email) : null,
        clientTotal(client) > 0 ? ce('div', { style: { fontSize: 16, fontWeight: 800, color: '#5b21b6', marginTop: 10 } }, roundTo10(clientTotal(client)) + ' zł') : null,
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

  // ── EKRAN: Okna ──────────────────────────────────────────────────────────
  else if (screen === 'windows' && curRoom) {
    var winRows = (curRoom.windows || []).map(function(w) {
      var t = wt(w);
      var labels = (w.products || []).map(function(pr) { return (PROD_TYPES.find(function(pt) { return pt.id === pr.type; }) || { label: pr.type }).label; }).join(', ');
      var isVariant = !!w.variantGroup;
      var hasCurtain = (w.products || []).some(function(pr) { return pr.type === 'zaslona' || pr.type === 'firana'; });

      return ce('div', {
        key: w.id,
        style: Object.assign({}, GLASS, { borderRadius: isVariant ? '6px 16px 16px 16px' : '16px 6px 16px 16px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: SHADOW, borderLeft: isVariant ? '3px solid #a78bfa' : 'none' }),
      },
        ce('div', { onClick: function() { openWin(w); }, style: { flex: 1, cursor: 'pointer', minWidth: 0, display: 'flex', alignItems: 'center', gap: 12 } },
          ce('div', { style: { width: 56, height: 56, borderRadius: 10, background: 'rgba(167,139,250,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 } }, '🪟'),
          ce('div', { style: { flex: 1, minWidth: 0 } },
            ce('div', { style: { fontSize: 14, fontWeight: 700, color: '#1e1b4b', marginBottom: 2 } }, w.name, isVariant ? ce('span', { style: { fontSize: 10, fontWeight: 700, background: 'rgba(167,139,250,0.15)', color: '#7c3aed', borderRadius: 6, padding: '2px 6px', marginLeft: 6 } }, 'Wariant ' + w.variantLabel) : null),
            ce('div', { style: { fontSize: 11, color: '#a0aec0' } }, labels || '—'),
            t ? ce('div', { style: { fontSize: 13, fontWeight: 700, color: '#5b21b6', marginTop: 2 } }, roundTo10(t) + ' zł') : null,
          ),
          ce('span', { style: { color: '#a0aec0', fontSize: 16 } }, '›'),
        ),
        ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
          ce('button', { onClick: function(ev) { ev.stopPropagation(); duplicateWinAsVariant(w); }, style: { border: '1px solid rgba(167,139,250,0.3)', background: 'rgba(167,139,250,0.08)', cursor: 'pointer', fontSize: 11, color: '#7c3aed', padding: '4px 8px', borderRadius: 6, fontWeight: 600, whiteSpace: 'nowrap', fontFamily: 'inherit' } }, '↻ Wariant'),
          ce('button', {
            onClick: function(ev) {
              ev.stopPropagation();
              var doDelete = function() {
                updateClient(function(cl) {
                  return mg(cl, { rooms: (cl.rooms || []).map(function(r) {
                    if (r.id !== curRoomId) return r;
                    return mg(r, { windows: (r.windows || []).filter(function(x) { return x.id !== w.id; }) });
                  }) });
                });
              };
              if (hasWinData(w)) { setConfirmDelete({ type: 'window', label: w.name, onConfirm: doDelete }); } else { doDelete(); }
            },
            style: { border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#a0aec0', padding: '4px 8px', lineHeight: 1 }
          }, '×'),
        ),
      );
    });

    content = ce(Fragment, null,
      ce('div', { style: { fontSize: 10, fontWeight: 700, color: '#a0aec0', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 } }, curRoom.name + ' — okna'),
      (curRoom.windows || []).length === 0 ? ce('div', { style: { color: '#a0aec0', fontSize: 14, textAlign: 'center', padding: '24px 0' } }, 'Brak okien. Dodaj pierwsze.') : null,
      winRows.length ? ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 } }, winRows) : null,
      Btn('+ Dodaj okno', function() { setShowWinModal(true); }, false),
    );
  }

  // ── EKRAN: Produkty okna ─────────────────────────────────────────────────
  else if (screen === 'detail' && curWin) {
    var wtv = wt(curWin);
    content = ce(Fragment, null,
      ce('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid rgba(30,27,75,0.08)' } },
        ce('div', { style: { fontSize: 18, fontWeight: 700, color: '#1e1b4b' } }, curWin.name),
        wtv ? ce('div', { style: { fontSize: 16, fontWeight: 800, color: '#5b21b6', background: 'rgba(167,139,250,0.1)', padding: '6px 14px', borderRadius: '12px 4px 12px 12px' } }, roundTo10(wtv) + ' zł') : null,
      ),
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
              onTypeChange: function(newType, doChange) {
                setConfirmTypeChange({ onConfirm: function() { doChange(); } });
              },
              clients: p.clients || [],
            })
          );
        })
      ),
      ce('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
        Btn('+ Dodaj produkt', addProd, false),
        Btn('Zapisz ✓', saveWin, true),
      ),
    );
  }

  // ── EKRAN: Podsumowanie ───────────────────────────────────────────────────
  else if (screen === 'sum') {
    var total = clientTotal(client);
    content = ce(Fragment, null,
      ce('div', { style: Object.assign({}, GLASS, { borderRadius: '20px 6px 20px 20px', padding: '24px', marginBottom: 20, boxShadow: SHADOW }) },
        ce('div', { style: { fontSize: 10, fontWeight: 700, color: '#a0aec0', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 } }, 'Podsumowanie wyceny'),
        ce('div', { style: { fontSize: 28, fontWeight: 800, color: '#1e1b4b', marginBottom: 6 } }, roundTo10(total) + ' zł'),
        ce('div', { style: { fontSize: 13, color: '#a0aec0' } }, client.name),
      ),
      (client.rooms || []).map(function(r) {
        var rTotal = rt(r);
        if (!rTotal) return null;
        return ce('div', { key: r.id, style: Object.assign({}, GLASS, { borderRadius: '16px 6px 16px 16px', padding: '16px', marginBottom: 10, boxShadow: SHADOW }) },
          ce('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
            ce('div', { style: { fontSize: 14, fontWeight: 700, color: '#1e1b4b' } }, r.name),
            ce('div', { style: { fontSize: 14, fontWeight: 700, color: '#5b21b6' } }, roundTo10(rTotal) + ' zł'),
          ),
          (r.windows || []).filter(function(w) { return wt(w) > 0; }).map(function(w) {
            return ce('div', { key: w.id, style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#4b5563', padding: '3px 0' } },
              ce('span', null, w.name),
              ce('span', { style: { fontWeight: 600 } }, roundTo10(wt(w)) + ' zł'),
            );
          }),
        );
      }),
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return ce('div', { style: { minHeight: '100%' } },
    BC(),
    saveStatus === 'saving' ? ce('div', { style: { fontSize: 11, color: '#a0aec0', marginBottom: 12 } }, 'Zapisuję…') : null,
    saveStatus === 'ok'     ? ce('div', { style: { fontSize: 11, color: '#059669', marginBottom: 12 } }, '✓ Zapisano') : null,
    saveStatus === 'error'  ? ce('div', { style: { fontSize: 11, color: '#dc2626', marginBottom: 12 } }, '⚠ Błąd zapisu') : null,
    content,

    // Modals
    showRoomModal ? ce(ModalRoom, { onOk: addRoom, onClose: function() { setShowRoomModal(false); } }) : null,
    showWinModal  ? ce(ModalWindow, { onOk: newWin, onClose: function() { setShowWinModal(false); } }) : null,
    confirmDelete ? ce(ModalConfirmDelete, { label: confirmDelete.label, onConfirm: function() { confirmDelete.onConfirm(); setConfirmDelete(null); }, onClose: function() { setConfirmDelete(null); } }) : null,
    confirmRemove ? ce(ModalConfirmRemove, { label: confirmRemove.label, onConfirm: function() { confirmRemove.onConfirm(); setConfirmRemove(null); }, onClose: function() { setConfirmRemove(null); } }) : null,
    confirmTypeChange ? ce(ModalConfirmTypeChange, { onConfirm: function() { confirmTypeChange.onConfirm(); setConfirmTypeChange(null); }, onClose: function() { setConfirmTypeChange(null); } }) : null,
  );
}
