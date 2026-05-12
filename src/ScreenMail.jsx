import React, { useState, useEffect, useRef } from 'react';
import { sbApi } from './supabase.js';

var ce = React.createElement;

// ── SZABLONY ──────────────────────────────────────────────────────────────────
var MAIL_TEMPLATES = [
  {
    id: 'oferta', label: 'Oferta', icon: '📋',
    subject: 'Oferta – {clientName}',
    body: 'Dzień dobry,\n\nPrzesyłam wycenę {honorific} zamówienia.\n\nWartość: {total} zł\nZaliczka 50%: {zaliczka} zł\n\nZ poważaniem,\nPaulina Porter',
  },
  {
    id: 'potwierdzenie', label: 'Potwierdzenie', icon: '✅',
    subject: 'Potwierdzenie zamówienia',
    body: 'Dzień dobry,\n\nPotwierdzam przyjęcie zamówienia.\n\nZ poważaniem,\nPaulina Porter',
  },
  {
    id: 'przypomnienie', label: 'Przypomnienie', icon: '🔔',
    subject: 'Przypomnienie – wycena',
    body: 'Dzień dobry,\n\nPrzypominam o przesłanej wycenie. Oferta ważna 30 dni.\n\nZ poważaniem,\nPaulina Porter',
  },
  { id: 'wlasny', label: 'Własny', icon: '✏️', subject: '', body: '' },
];

var SYSTEM_FOLDERS = [
  { id: 'compose',   label: 'Nowa wiadomość', icon: '✏️' },
  { id: 'drafts',    label: 'Robocze',         icon: '📝' },
  { id: 'sent',      label: 'Wysłane',         icon: '📤' },
  { id: 'templates', label: 'Szablony',        icon: '📋' },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '';
  var d = new Date(iso), t = new Date();
  if (d.toDateString() === t.toDateString())
    return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
}

function initials(name) {
  if (!name) return '?';
  var pts = name.trim().split(' ');
  if (pts.length >= 2) return (pts[0][0] + pts[pts.length - 1][0]).toUpperCase();
  return name[0].toUpperCase();
}

function fillTemplate(tpl, client) {
  var cl = client || {};
  var h = cl.gender === 'male' ? 'Pana' : 'Pani';
  var total = 0;
  if (cl.rooms) {
    total = (cl.rooms || []).reduce(function(a, r) {
      return a + (r.windows || []).reduce(function(b, w) {
        return b + (w.products || []).reduce(function(c, p) { return c + (p.mp != null ? p.mp : 0); }, 0);
      }, 0);
    }, 0);
    total = Math.round(total / 10) * 10;
  }
  var z = Math.round(total * 0.5 / 10) * 10;
  return {
    subject: tpl.subject.replace('{clientName}', cl.name || '').replace('{honorific}', h),
    body: tpl.body
      .replace(/{honorific}/g, h)
      .replace(/{clientName}/g, cl.name || '')
      .replace(/{total}/g, total > 0 ? String(total) : '___')
      .replace(/{zaliczka}/g, z > 0 ? String(z) : '___'),
  };
}

function loadDrafts() {
  try { return JSON.parse(localStorage.getItem('ad_mail_drafts') || '[]'); } catch (e) { return []; }
}
function saveDraftsLocal(list) {
  try { localStorage.setItem('ad_mail_drafts', JSON.stringify(list)); } catch (e) {}
}
function loadSent() {
  try { return JSON.parse(localStorage.getItem('ad_mail_sent') || '[]'); } catch (e) { return []; }
}
function saveSentLocal(list) {
  try { localStorage.setItem('ad_mail_sent', JSON.stringify(list)); } catch (e) {}
}

// ── AVATAR ────────────────────────────────────────────────────────────────────
function Avatar(p) {
  return ce('div', {
    style: {
      width: p.size || 34, height: p.size || 34, borderRadius: '50%',
      background: 'linear-gradient(135deg,#a78bfa,#34d399)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: (p.size || 34) * 0.38, fontWeight: 700, color: '#fff',
      flexShrink: 0, userSelect: 'none',
    },
  }, p.label || '?');
}

// ── COMPOSING PANEL ───────────────────────────────────────────────────────────
function ComposePanel(p) {
  var clients = p.clients || [];
  var s1 = useState(p.draft ? p.draft.to : '');       var to = s1[0]; var setTo = s1[1];
  var s2 = useState(p.draft ? p.draft.subject : ''); var subj = s2[0]; var setSubj = s2[1];
  var s3 = useState(p.draft ? p.draft.body : '');    var body = s3[0]; var setBody = s3[1];
  var s4 = useState(p.draft ? p.draft.clientId : null); var selClientId = s4[0]; var setSelClientId = s4[1];
  var s5 = useState(false);                           var showSug = s5[0]; var setShowSug = s5[1];
  var s6 = useState(null);                            var selTpl = s6[0]; var setSelTpl = s6[1];
  var s7 = useState(false);                           var sent = s7[0]; var setSent = s7[1];

  var selClient = clients.find(function(c) { return String(c.id) === String(selClientId); }) || null;

  var toRef = useRef(null);
  useEffect(function() { if (toRef.current) toRef.current.focus(); }, []);

  var suggestions = to.length > 0
    ? clients.filter(function(c) {
        var q = to.toLowerCase();
        return (c.name && c.name.toLowerCase().includes(q)) || (c.email && c.email.toLowerCase().includes(q));
      }).slice(0, 6)
    : [];

  function applyTemplate(tpl) {
    var filled = fillTemplate(tpl, selClient);
    setSubj(filled.subject);
    setBody(filled.body);
    setSelTpl(tpl.id);
  }

  function handleSend() {
    if (!to.trim() || !subj.trim()) return;
    var msg = {
      id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      to: to.trim(), toName: selClient ? selClient.name : '',
      subject: subj.trim(), body: body,
      clientId: selClientId,
      date: new Date().toISOString(), folder: 'sent',
    };
    var newSent = [msg].concat(loadSent());
    saveSentLocal(newSent);
    setSent(true);
    setTimeout(function() { p.onSent && p.onSent(msg); setSent(false); }, 1200);
    // Mailto fallback
    var mailtoUrl = 'mailto:' + encodeURIComponent(to.trim())
      + '?subject=' + encodeURIComponent(subj.trim())
      + '&body=' + encodeURIComponent(body);
    window.open(mailtoUrl, '_blank');
  }

  function handleSaveDraft() {
    if (!to.trim() && !subj.trim() && !body.trim()) return;
    var draft = {
      id: (p.draft && p.draft.id) || Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      to: to.trim(), toName: selClient ? selClient.name : '',
      subject: subj.trim(), body: body, clientId: selClientId,
      date: new Date().toISOString(),
    };
    var existing = loadDrafts();
    var filtered = existing.filter(function(d) { return d.id !== draft.id; });
    saveDraftsLocal([draft].concat(filtered));
    p.onDraftSaved && p.onDraftSaved(draft);
  }

  var canSend = to.trim() && subj.trim();

  var INP = {
    width: '100%', boxSizing: 'border-box', padding: '10px 14px', fontSize: 13,
    border: '1px solid rgba(167,139,250,0.25)', borderRadius: 10,
    background: 'rgba(255,255,255,0.6)', color: 'var(--t1)',
    outline: 'none', fontFamily: 'inherit', lineHeight: 1.4,
    backdropFilter: 'blur(8px)',
  };

  return ce('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', gap: 0 } },

    // szablony
    ce('div', { style: { display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' } },
      MAIL_TEMPLATES.map(function(tpl) {
        var active = selTpl === tpl.id;
        return ce('button', {
          key: tpl.id,
          onClick: function() { applyTemplate(tpl); },
          style: {
            padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
            border: active ? '1.5px solid #a78bfa' : '1.5px solid rgba(167,139,250,0.3)',
            background: active ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.5)',
            color: active ? '#7c3aed' : 'var(--t2)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit',
          },
        }, tpl.icon, ' ', tpl.label);
      }),
    ),

    // DO
    ce('div', { style: { position: 'relative', marginBottom: 10 } },
      ce('div', { style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--t3)', marginBottom: 5, textTransform: 'uppercase' } }, 'Do'),
      ce('input', {
        ref: toRef, type: 'text', value: to, placeholder: 'Email odbiorcy lub imię klienta...',
        onChange: function(e) { setTo(e.target.value); setShowSug(true); },
        onBlur: function() { setTimeout(function() { setShowSug(false); }, 150); },
        style: INP,
      }),
      showSug && suggestions.length > 0
        ? ce('div', {
            style: {
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(167,139,250,0.3)',
              borderRadius: 10, boxShadow: '0 8px 24px rgba(30,27,75,0.12)',
              overflow: 'hidden', marginTop: 4,
            },
          },
            suggestions.map(function(c) {
              return ce('div', {
                key: c.id,
                onMouseDown: function() {
                  setTo(c.email || c.name || '');
                  setSelClientId(c.id);
                  setShowSug(false);
                },
                style: {
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 14px', cursor: 'pointer',
                  borderBottom: '1px solid rgba(167,139,250,0.1)',
                },
              },
                ce(Avatar, { size: 26, label: initials(c.name) }),
                ce('div', null,
                  ce('div', { style: { fontWeight: 600, color: 'var(--t1)', fontSize: 13 } }, c.name),
                  c.email ? ce('div', { style: { color: 'var(--t3)', fontSize: 11 } }, c.email) : null,
                ),
              );
            }),
          )
        : null,
    ),

    // TEMAT
    ce('div', { style: { marginBottom: 10 } },
      ce('div', { style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--t3)', marginBottom: 5, textTransform: 'uppercase' } }, 'Temat'),
      ce('input', { type: 'text', value: subj, onChange: function(e) { setSubj(e.target.value); }, placeholder: 'Temat wiadomości...', style: INP }),
    ),

    // TREŚĆ
    ce('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', marginBottom: 12 } },
      ce('div', { style: { fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--t3)', marginBottom: 5, textTransform: 'uppercase' } }, 'Treść'),
      ce('textarea', {
        value: body,
        onChange: function(e) { setBody(e.target.value); },
        placeholder: 'Wpisz treść wiadomości...',
        style: Object.assign({}, INP, {
          flex: 1, resize: 'none', minHeight: 200, lineHeight: 1.6,
        }),
      }),
    ),

    // PRZYCISKI
    ce('div', { style: { display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid rgba(167,139,250,0.15)' } },
      ce('button', {
        onClick: handleSaveDraft,
        disabled: !to.trim() && !subj.trim() && !body.trim(),
        style: {
          padding: '10px 16px', borderRadius: 10,
          border: '1.5px solid rgba(167,139,250,0.3)',
          background: 'rgba(255,255,255,0.6)', color: 'var(--t2)',
          fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 6,
        },
      }, '📝 Zapisz roboczy'),
      ce('button', {
        onClick: handleSend, disabled: !canSend,
        style: {
          flex: 1, padding: '10px 18px', borderRadius: 10, border: 'none',
          background: sent ? '#059669' : (canSend ? 'var(--t1)' : 'var(--bd2)'),
          color: '#fff', fontSize: 13, fontWeight: 700, cursor: canSend ? 'pointer' : 'default',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'background .3s',
        },
      }, sent ? '✓ Wysłano!' : '📨 Wyślij przez klienta pocztowego'),
    ),
  );
}

// ── MAIL ROW ──────────────────────────────────────────────────────────────────
function MailRow(p) {
  var m = p.mail;
  var s1 = useState(false); var hov = s1[0]; var setHov = s1[1];
  var active = p.active;
  return ce('div', {
    onMouseEnter: function() { setHov(true); },
    onMouseLeave: function() { setHov(false); },
    onClick: p.onClick,
    style: {
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
      background: active
        ? 'rgba(167,139,250,0.15)'
        : hov ? 'rgba(255,255,255,0.65)' : 'transparent',
      border: active ? '1px solid rgba(167,139,250,0.35)' : '1px solid transparent',
      marginBottom: 4, transition: 'all .12s',
    },
  },
    ce(Avatar, { size: 32, label: initials(m.toName || m.to || '?') }),
    ce('div', { style: { flex: 1, minWidth: 0 } },
      ce('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' } },
        ce('div', { style: { fontWeight: 600, fontSize: 13, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, m.toName || m.to || '—'),
        ce('div', { style: { fontSize: 10, color: 'var(--t3)', flexShrink: 0, marginLeft: 8 } }, fmtDate(m.date)),
      ),
      ce('div', { style: { fontSize: 12, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 } }, m.subject || '(bez tematu)'),
      ce('div', { style: { fontSize: 11, color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2, opacity: 0.7 } }, (m.body || '').replace(/\n/g, ' ').slice(0, 60)),
    ),
  );
}

// ── MAIL PREVIEW ──────────────────────────────────────────────────────────────
function MailPreview(p) {
  var m = p.mail;
  if (!m) {
    return ce('div', {
      style: {
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', color: 'var(--t3)', fontSize: 13,
        gap: 10, opacity: 0.5,
      },
    },
      ce('div', { style: { fontSize: 40 } }, '📬'),
      ce('div', null, 'Wybierz wiadomość'),
    );
  }
  return ce('div', {
    style: {
      flex: 1, overflowY: 'auto', padding: '20px 24px',
      background: 'rgba(255,255,255,0.55)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.9)',
      borderRadius: '16px 4px 16px 16px',
    },
  },
    ce('div', { style: { marginBottom: 16 } },
      ce('div', { style: { fontSize: 18, fontWeight: 700, color: 'var(--t1)', marginBottom: 10 } }, m.subject || '(bez tematu)'),
      ce('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 } },
        ce(Avatar, { size: 36, label: initials(m.toName || m.to || '?') }),
        ce('div', null,
          ce('div', { style: { fontSize: 13, fontWeight: 600, color: 'var(--t1)' } }, m.toName || m.to || '—'),
          ce('div', { style: { fontSize: 11, color: 'var(--t3)' } }, m.to),
        ),
        ce('div', { style: { marginLeft: 'auto', fontSize: 11, color: 'var(--t3)' } }, fmtDate(m.date)),
      ),
    ),
    ce('div', {
      style: {
        borderTop: '1px solid rgba(167,139,250,0.15)', paddingTop: 16,
        fontSize: 14, color: 'var(--t1)', lineHeight: 1.8, whiteSpace: 'pre-wrap',
      },
    }, m.body || ''),
    p.onDelete ? ce('button', {
      onClick: p.onDelete,
      style: {
        marginTop: 24, padding: '8px 16px', borderRadius: 9,
        border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.07)',
        color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        fontFamily: 'inherit',
      },
    }, '🗑 Usuń') : null,
  );
}

// ── TEMPLATES VIEW ────────────────────────────────────────────────────────────
function TemplatesView(p) {
  return ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
    MAIL_TEMPLATES.map(function(tpl) {
      return ce('div', {
        key: tpl.id,
        style: {
          background: 'rgba(255,255,255,0.65)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.9)',
          borderRadius: '14px 4px 14px 14px',
          padding: '16px 20px',
          boxShadow: '0 2px 10px rgba(30,27,75,0.06)',
        },
      },
        ce('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 } },
          ce('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
            ce('span', { style: { fontSize: 18 } }, tpl.icon),
            ce('div', { style: { fontWeight: 700, fontSize: 14, color: 'var(--t1)' } }, tpl.label),
          ),
          ce('button', {
            onClick: function() { p.onUse(tpl); },
            style: {
              padding: '6px 14px', borderRadius: 8, border: 'none',
              background: 'var(--t1)', color: '#fff',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            },
          }, 'Użyj'),
        ),
        tpl.subject ? ce('div', { style: { fontSize: 12, color: 'var(--t2)', marginBottom: 4 } }, '📌 ', tpl.subject) : null,
        ce('div', { style: { fontSize: 12, color: 'var(--t3)', lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, tpl.body || '(pusty)'),
      );
    }),
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
export function ScreenMail(p) {
  var clients = p.clients || [];

  var s1 = useState('compose'); var folder = s1[0]; var setFolder = s1[1];
  var s2 = useState(null);    var selMail = s2[0]; var setSelMail = s2[1];
  var s3 = useState(loadDrafts()); var drafts = s3[0]; var setDrafts = s3[1];
  var s4 = useState(loadSent());   var sent   = s4[0]; var setSent   = s4[1];
  var s5 = useState(null);    var openDraft = s5[0]; var setOpenDraft = s5[1];

  function handleDraftSaved(draft) {
    setDrafts(function(prev) {
      var filtered = prev.filter(function(d) { return d.id !== draft.id; });
      var next = [draft].concat(filtered);
      saveDraftsLocal(next);
      return next;
    });
    setFolder('drafts');
  }

  function handleSent(msg) {
    setSent(function(prev) {
      var next = [msg].concat(prev);
      saveSentLocal(next);
      return next;
    });
    setFolder('sent');
    setSelMail(msg);
  }

  function deleteMail(id, fromFolder) {
    if (fromFolder === 'drafts') {
      setDrafts(function(prev) { var n = prev.filter(function(m) { return m.id !== id; }); saveDraftsLocal(n); return n; });
    } else {
      setSent(function(prev) { var n = prev.filter(function(m) { return m.id !== id; }); saveSentLocal(n); return n; });
    }
    setSelMail(null);
  }

  var folderMails = folder === 'drafts' ? drafts : folder === 'sent' ? sent : [];

  // Right panel
  var rightPanel;
  if (folder === 'compose') {
    rightPanel = ce('div', { style: { flex: 1, padding: '0 0 0 20px', display: 'flex', flexDirection: 'column' } },
      ce(ComposePanel, {
        key: openDraft ? openDraft.id : 'new',
        clients: clients, draft: openDraft,
        onDraftSaved: handleDraftSaved,
        onSent: handleSent,
      }),
    );
  } else if (folder === 'templates') {
    rightPanel = ce('div', { style: { flex: 1, padding: '0 0 0 20px', overflowY: 'auto' } },
      ce(TemplatesView, {
        onUse: function(tpl) {
          setOpenDraft(null);
          setFolder('compose');
          // ComposePanel will use template on mount — we pass it via a re-key
          setTimeout(function() {
            setOpenDraft({ id: null, to: '', subject: tpl.subject, body: tpl.body, clientId: null });
            setFolder('compose');
          }, 10);
        },
      }),
    );
  } else {
    rightPanel = ce('div', { style: { flex: 1, display: 'flex', minWidth: 0, gap: 12, padding: '0 0 0 20px' } },
      // mail list
      ce('div', { style: { width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' } },
        folderMails.length === 0
          ? ce('div', { style: { textAlign: 'center', padding: '3rem 0', color: 'var(--t3)', fontSize: 12 } }, '(brak wiadomości)')
          : folderMails.map(function(m) {
              return ce(MailRow, {
                key: m.id, mail: m,
                active: selMail && selMail.id === m.id,
                onClick: function() { setSelMail(m); },
              });
            }),
      ),
      // preview
      ce(MailPreview, {
        mail: selMail,
        onDelete: selMail ? function() { deleteMail(selMail.id, folder); } : null,
      }),
    );
  }

  return ce('div', { style: { display: 'flex', height: '100%', minHeight: 0 } },

    // Sidebar foldery
    ce('div', { style: { width: 168, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 } },
      SYSTEM_FOLDERS.map(function(f) {
        var active = folder === f.id;
        var badge = f.id === 'drafts' && drafts.length > 0 ? drafts.length : null;
        return ce('button', {
          key: f.id,
          onClick: function() { setFolder(f.id); setSelMail(null); },
          style: {
            width: '100%', textAlign: 'left', padding: '10px 12px',
            borderRadius: active ? '13px 4px 13px 13px' : 11,
            border: active ? '1px solid rgba(167,139,250,0.3)' : '1px solid transparent',
            background: active ? 'rgba(167,139,250,0.14)' : 'transparent',
            color: active ? '#7c3aed' : 'var(--t2)',
            fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            borderLeft: '3px solid ' + (active ? '#a78bfa' : 'transparent'),
            transition: 'all .15s', fontFamily: 'inherit',
          },
        },
          ce('span', { style: { fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 } }, f.icon),
          ce('span', { style: { flex: 1 } }, f.label),
          badge ? ce('span', {
            style: {
              background: '#a78bfa', color: '#fff', borderRadius: 10,
              fontSize: 10, fontWeight: 700, padding: '1px 6px',
            },
          }, badge) : null,
        );
      }),

      // Nowa wiadomość CTA
      ce('button', {
        onClick: function() { setOpenDraft(null); setFolder('compose'); },
        style: {
          marginTop: 12, width: '100%', padding: '11px 12px',
          borderRadius: '13px 4px 13px 13px',
          border: '1.5px dashed rgba(167,139,250,0.4)',
          background: 'rgba(167,139,250,0.07)',
          color: '#7c3aed', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit',
        },
      },
        ce('i', { className: 'ti ti-pencil', style: { fontSize: 16 } }),
        'Nowa wiadomość',
      ),
    ),

    // Right panel
    rightPanel,
  );
}
