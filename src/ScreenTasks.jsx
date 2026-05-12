import React, { useState, useEffect, useRef } from 'react';
import { sbApi } from './supabase.js';

var ce = React.createElement;

// ── PRIORITY CONFIG ──────────────────────────────────────────────────────────
var PRIORITY = {
  low:    { label: 'Niska',   color: '#94a3b8', bg: 'rgba(148,163,184,0.13)', dot: '#94a3b8' },
  medium: { label: 'Średnia', color: '#f59e0b', bg: 'rgba(245,158,11,0.13)',  dot: '#f59e0b' },
  high:   { label: 'Wysoka',  color: '#ef4444', bg: 'rgba(239,68,68,0.13)',   dot: '#ef4444' },
};

var FILTERS = [
  { id: 'all',    label: 'Wszystkie' },
  { id: 'active', label: 'Aktywne'   },
  { id: 'done',   label: 'Gotowe'    },
  { id: 'urgent', label: 'Pilne'     },
];

// ── HELPERS ──────────────────────────────────────────────────────────────────
function isOverdue(task) {
  if (!task.due_date || task.done) return false;
  var today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(task.due_date) < today;
}
function formatDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
}

// ── QUICK INPUT ───────────────────────────────────────────────────────────────
function QuickInput(p) {
  var ref = useRef(null);
  useEffect(function() { if (ref.current) ref.current.focus(); }, []);
  return ce('input', {
    ref: ref, type: 'text', value: p.value,
    onChange: function(e) { p.onChange(e.target.value); },
    onKeyDown: function(e) {
      if (e.key === 'Enter') p.onConfirm();
      if (e.key === 'Escape') p.onCancel();
    },
    onBlur: p.onConfirm,
    placeholder: p.placeholder || '',
    style: Object.assign({
      border: 'none', outline: 'none', background: 'transparent',
      fontSize: p.fontSize || 14, fontWeight: p.fontWeight || 400,
      color: 'var(--t1)', fontFamily: 'inherit', width: '100%', padding: 0,
    }, p.style || {}),
  });
}

// ── SUBTASK ROW ───────────────────────────────────────────────────────────────
function SubtaskRow(p) {
  var sub = p.sub;
  var s1 = useState(false); var hov = s1[0]; var setHov = s1[1];
  var s2 = useState(false); var editing = s2[0]; var setEditing = s2[1];
  var s3 = useState(sub.title); var val = s3[0]; var setVal = s3[1];

  function commit() {
    var v = val.trim();
    if (v && v !== sub.title) p.onUpdate({ title: v });
    else setVal(sub.title);
    setEditing(false);
  }

  return ce('div', {
    onMouseEnter: function() { setHov(true); },
    onMouseLeave: function() { setHov(false); },
    style: {
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '6px 12px 6px 36px',
      background: hov ? 'rgba(167,139,250,0.06)' : 'transparent',
      borderRadius: 8, transition: 'background .12s',
      opacity: sub.done ? 0.5 : 1,
    },
  },
    ce('div', {
      onClick: function() { p.onUpdate({ done: !sub.done }); },
      style: {
        width: 15, height: 15, borderRadius: 4, flexShrink: 0, cursor: 'pointer',
        border: '1.5px solid ' + (sub.done ? '#34d399' : 'var(--bd2)'),
        background: sub.done ? '#34d399' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .15s',
      },
    }, sub.done ? ce('span', { style: { color: '#fff', fontSize: 8, fontWeight: 700 } }, '✓') : null),

    editing
      ? ce(QuickInput, {
          value: val, fontSize: 13,
          onChange: setVal, onConfirm: commit,
          onCancel: function() { setVal(sub.title); setEditing(false); },
        })
      : ce('span', {
          onDoubleClick: function() { setEditing(true); },
          style: {
            flex: 1, fontSize: 13, color: 'var(--t1)', lineHeight: 1.4,
            textDecoration: sub.done ? 'line-through' : 'none', cursor: 'text',
          },
        }, sub.title),

    hov ? ce('button', {
      onClick: p.onDelete,
      style: {
        border: 'none', background: 'none', cursor: 'pointer',
        fontSize: 14, color: 'var(--t3)', padding: '0 2px', lineHeight: 1, opacity: 0.6,
      },
    }, '×') : null,
  );
}

// ── TASK CARD ─────────────────────────────────────────────────────────────────
function TaskCard(p) {
  var task = p.task;
  var s1 = useState(false); var hov = s1[0]; var setHov = s1[1];
  var s2 = useState(false); var editTitle = s2[0]; var setEditTitle = s2[1];
  var s3 = useState(task.title); var titleVal = s3[0]; var setTitleVal = s3[1];
  var s4 = useState(false); var addingSub = s4[0]; var setAddingSub = s4[1];
  var s5 = useState(''); var newSubVal = s5[0]; var setNewSubVal = s5[1];

  var subtasks = task.subtasks || [];
  var doneCount = subtasks.filter(function(s) { return s.done; }).length;
  var prio = PRIORITY[task.priority] || PRIORITY.medium;
  var progress = subtasks.length > 0 ? Math.round((doneCount / subtasks.length) * 100) : 0;
  var overdue = isOverdue(task);

  function commitTitle() {
    var v = titleVal.trim();
    if (v && v !== task.title) p.onUpdate({ title: v });
    else setTitleVal(task.title);
    setEditTitle(false);
  }

  function addSubtask() {
    var v = newSubVal.trim();
    if (!v) { setAddingSub(false); return; }
    var ns = { id: Date.now() + '_' + Math.random().toString(36).slice(2, 6), title: v, done: false };
    p.onUpdate({ subtasks: subtasks.concat([ns]) });
    setNewSubVal(''); setAddingSub(false);
  }

  function updateSub(sid, patch) {
    p.onUpdate({ subtasks: subtasks.map(function(s) { return s.id === sid ? Object.assign({}, s, patch) : s; }) });
  }

  function deleteSub(sid) {
    p.onUpdate({ subtasks: subtasks.filter(function(s) { return s.id !== sid; }) });
  }

  return ce('div', {
    onMouseEnter: function() { setHov(true); },
    onMouseLeave: function() { setHov(false); },
    style: {
      background: 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.9)',
      borderLeft: '3px solid ' + prio.dot,
      borderRadius: '14px 4px 14px 14px',
      overflow: 'hidden',
      boxShadow: hov ? '0 8px 28px rgba(30,27,75,0.13)' : '0 2px 8px rgba(30,27,75,0.06)',
      transition: 'box-shadow .15s',
      opacity: task.done ? 0.62 : 1,
    },
  },

    // header
    ce('div', { style: { padding: '14px 16px' } },
      ce('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 12 } },

        // checkbox
        ce('div', {
          onClick: function() { p.onUpdate({ done: !task.done }); },
          style: {
            width: 22, height: 22, borderRadius: 7, flexShrink: 0, marginTop: 1, cursor: 'pointer',
            border: '2px solid ' + (task.done ? '#34d399' : 'var(--bd2)'),
            background: task.done ? '#34d399' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .15s',
          },
        }, task.done ? ce('span', { style: { color: '#fff', fontSize: 11, fontWeight: 700 } }, '✓') : null),

        // title + meta
        ce('div', { style: { flex: 1, minWidth: 0 } },
          editTitle
            ? ce(QuickInput, {
                value: titleVal, fontSize: 15, fontWeight: 600,
                onChange: setTitleVal, onConfirm: commitTitle,
                onCancel: function() { setTitleVal(task.title); setEditTitle(false); },
              })
            : ce('div', {
                onDoubleClick: function() { if (!task.done) setEditTitle(true); },
                style: {
                  fontSize: 15, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.3,
                  textDecoration: task.done ? 'line-through' : 'none',
                  cursor: task.done ? 'default' : 'text', wordBreak: 'break-word',
                },
              }, task.title),

          ce('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' } },
            ce('span', {
              style: {
                fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                color: prio.color, background: prio.bg,
                borderRadius: 5, padding: '2px 7px',
              },
            }, prio.label.toUpperCase()),

            task.due_date ? ce('span', {
              style: { fontSize: 11, color: overdue ? '#ef4444' : 'var(--t3)', display: 'flex', alignItems: 'center', gap: 3 },
            }, ce('span', null, '📅'), formatDate(task.due_date)) : null,

            subtasks.length > 0
              ? ce('span', { style: { fontSize: 11, color: 'var(--t3)' } }, doneCount + '/' + subtasks.length + ' podzadań')
              : null,
          ),

          subtasks.length > 0
            ? ce('div', { style: { marginTop: 8, height: 3, background: 'var(--bd3)', borderRadius: 99, overflow: 'hidden' } },
                ce('div', {
                  style: {
                    height: '100%', width: progress + '%',
                    background: progress === 100 ? '#34d399' : 'linear-gradient(90deg,#a78bfa,#34d399)',
                    borderRadius: 99, transition: 'width .3s',
                  },
                }),
              )
            : null,
        ),

        // actions
        ce('div', { style: { display: 'flex', gap: 4, flexShrink: 0 } },
          ce('button', {
            onClick: function(e) {
              e.stopPropagation();
              var keys = Object.keys(PRIORITY);
              var next = keys[(keys.indexOf(task.priority || 'medium') + 1) % keys.length];
              p.onUpdate({ priority: next });
            },
            title: 'Zmień priorytet',
            style: {
              border: '1.5px solid ' + prio.color, background: prio.bg,
              cursor: 'pointer', borderRadius: 7, padding: '4px 7px',
              fontSize: 9, fontWeight: 700, color: prio.color, letterSpacing: '0.05em',
              fontFamily: 'inherit',
            },
          }, prio.label.toUpperCase().slice(0, 3)),

          ce('div', { style: { position: 'relative' } },
            ce('input', {
              type: 'date', value: task.due_date || '',
              onChange: function(e) { p.onUpdate({ due_date: e.target.value || null }); },
              title: 'Termin',
              style: { opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', zIndex: 1 },
            }),
            ce('button', {
              style: {
                border: '1.5px solid var(--bd2)', background: 'rgba(255,255,255,0.5)',
                cursor: 'pointer', borderRadius: 7, padding: '4px 8px',
                fontSize: 13, color: task.due_date ? 'var(--t1)' : 'var(--t3)',
              },
            }, '📅'),
          ),

          ce('button', {
            onClick: p.onDelete,
            title: 'Usuń zadanie',
            style: {
              border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 16, color: 'var(--t3)', padding: '4px 6px', opacity: 0.5, lineHeight: 1,
            },
          }, '×'),
        ),
      ),
    ),

    // subtasks panel
    (subtasks.length > 0 || addingSub)
      ? ce('div', {
          style: {
            borderTop: '1px solid rgba(167,139,250,0.12)',
            paddingTop: 6, paddingBottom: 6,
          },
        },
          subtasks.map(function(sub) {
            return ce(SubtaskRow, {
              key: sub.id, sub: sub,
              onUpdate: function(patch) { updateSub(sub.id, patch); },
              onDelete: function() { deleteSub(sub.id); },
            });
          }),
          addingSub
            ? ce('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px 6px 36px' } },
                ce('div', { style: { width: 15, height: 15, borderRadius: 4, border: '1.5px solid var(--bd2)', flexShrink: 0 } }),
                ce(QuickInput, {
                  value: newSubVal, fontSize: 13, placeholder: 'Nowe podzadanie...',
                  onChange: setNewSubVal, onConfirm: addSubtask,
                  onCancel: function() { setAddingSub(false); setNewSubVal(''); },
                }),
              )
            : null,
          ce('button', {
            onClick: function() { setAddingSub(true); },
            style: {
              display: 'flex', alignItems: 'center', gap: 6,
              margin: '4px 12px 4px 36px', padding: '4px 10px',
              border: '1.5px dashed rgba(167,139,250,0.35)', borderRadius: 8,
              background: 'transparent', cursor: 'pointer',
              fontSize: 11, color: 'var(--t3)', fontFamily: 'inherit',
            },
          }, '+ Dodaj podzadanie'),
        )
      : ce('button', {
          onClick: function() { setAddingSub(true); },
          style: {
            display: 'flex', alignItems: 'center', gap: 6,
            margin: '0 12px 10px 36px', padding: '4px 10px',
            border: '1.5px dashed rgba(167,139,250,0.25)', borderRadius: 8,
            background: 'transparent', cursor: 'pointer',
            fontSize: 11, color: 'var(--t3)', fontFamily: 'inherit',
          },
        }, '+ Dodaj podzadanie'),
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
export function ScreenTasks() {
  var s1 = useState([]); var tasks = s1[0]; var setTasks = s1[1];
  var s2 = useState(true); var loading = s2[0]; var setLoading = s2[1];
  var s3 = useState(null); var error = s3[0]; var setError = s3[1];
  var s4 = useState(''); var newTitle = s4[0]; var setNewTitle = s4[1];
  var s5 = useState(false); var adding = s5[0]; var setAdding = s5[1];
  var s6 = useState('all'); var filter = s6[0]; var setFilter = s6[1];
  var newRef = useRef(null);

  useEffect(function() {
    sbApi.getTasks().then(function(data) {
      setTasks(data || []);
      setLoading(false);
    }).catch(function(e) {
      setLoading(false);
      setError('Błąd Supabase: ' + (e && e.message ? e.message : String(e)));
    });
  }, []);

  function handleAdd() {
    var v = newTitle.trim();
    if (!v) { setAdding(false); return; }
    var nt = {
      title: v, done: false, priority: 'medium',
      due_date: null, subtasks: [], sort_order: tasks.length,
      created_at: new Date().toISOString(),
    };
    sbApi.addTask(nt).then(function(res) {
      var added = (res && res[0]) ? res[0] : nt;
      setTasks(function(ts) { return [added].concat(ts); });
    }).catch(function() {
      setTasks(function(ts) { return [Object.assign({ id: Date.now() + '_' + Math.random().toString(36).slice(2,6) }, nt)].concat(ts); });
    });
    setNewTitle(''); setAdding(false);
  }

  function handleUpdate(id, patch) {
    setTasks(function(ts) {
      return ts.map(function(t) { return String(t.id) === String(id) ? Object.assign({}, t, patch) : t; });
    });
    sbApi.updateTask(id, patch).catch(function() {});
  }

  function handleDelete(id) {
    setTasks(function(ts) { return ts.filter(function(t) { return String(t.id) !== String(id); }); });
    sbApi.deleteTask(id).catch(function() {});
  }

  var visible = tasks.filter(function(t) {
    if (filter === 'active') return !t.done;
    if (filter === 'done')   return !!t.done;
    if (filter === 'urgent') return !t.done && (t.priority === 'high' || isOverdue(t));
    return true;
  });

  var totalDone = tasks.filter(function(t) { return t.done; }).length;
  var totalPct  = tasks.length > 0 ? Math.round((totalDone / tasks.length) * 100) : 0;

  if (loading) {
    return ce('div', { style: { textAlign: 'center', padding: '4rem 0', color: 'var(--t3)' } },
      ce('div', { style: { fontSize: 32, marginBottom: 12 } }, '📋'),
      ce('div', { style: { fontSize: 12, letterSpacing: '0.08em' } }, 'Ładowanie zadań...'),
    );
  }

  return ce('div', { style: { paddingBottom: 40 } },

    // ── POSTĘP GLOBALNY ──
    tasks.length > 0
      ? ce('div', {
          style: {
            background: 'rgba(255,255,255,0.65)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.9)',
            borderRadius: '18px 6px 18px 18px',
            padding: '16px 22px',
            marginBottom: 20,
            boxShadow: '0 4px 20px rgba(30,27,75,0.07)',
          },
        },
          ce('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 } },
            ce('div', { style: { fontSize: 13, fontWeight: 700, color: 'var(--t1)' } }, totalDone + ' / ' + tasks.length + ' ukończonych'),
            ce('div', { style: { fontSize: 12, color: 'var(--t3)', fontWeight: 600 } }, totalPct + '%'),
          ),
          ce('div', { style: { height: 6, background: 'var(--bd3)', borderRadius: 99, overflow: 'hidden' } },
            ce('div', {
              style: {
                height: '100%', width: totalPct + '%',
                background: 'linear-gradient(90deg, #a78bfa, #34d399)',
                borderRadius: 99, transition: 'width .5s',
              },
            }),
          ),
        )
      : null,

    // ── DODAJ ZADANIE ──
    adding
      ? ce('div', {
          style: {
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '2px solid #a78bfa',
            borderRadius: '14px 4px 14px 14px',
            padding: '14px 16px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 12,
            boxShadow: '0 6px 24px rgba(167,139,250,0.2)',
          },
        },
          ce('div', { style: { width: 22, height: 22, borderRadius: 7, border: '2px solid var(--bd2)', flexShrink: 0 } }),
          ce('input', {
            ref: newRef, type: 'text', value: newTitle,
            onChange: function(e) { setNewTitle(e.target.value); },
            onKeyDown: function(e) {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') { setAdding(false); setNewTitle(''); }
            },
            placeholder: 'Nazwa zadania... (Enter = dodaj, Esc = anuluj)',
            style: {
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 15, fontWeight: 600, color: 'var(--t1)', fontFamily: 'inherit',
            },
          }),
          ce('button', {
            onClick: handleAdd,
            style: {
              padding: '7px 16px', borderRadius: 9, border: 'none',
              background: 'var(--t1)', color: '#fff',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            },
          }, 'Dodaj'),
        )
      : ce('button', {
          onClick: function() { setAdding(true); setTimeout(function() { if (newRef.current) newRef.current.focus(); }, 50); },
          style: {
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 20px', marginBottom: 16,
            background: 'rgba(255,255,255,0.65)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1.5px dashed rgba(167,139,250,0.5)',
            borderRadius: '14px 4px 14px 14px',
            cursor: 'pointer', color: '#a78bfa',
            fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
            width: '100%', boxSizing: 'border-box',
          },
        },
          ce('i', { className: 'ti ti-plus', style: { fontSize: 18 } }),
          'Nowe zadanie',
        ),

    // ── FILTRY ──
    ce('div', {
      style: {
        display: 'flex', gap: 3, marginBottom: 18,
        background: 'rgba(255,255,255,0.5)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.85)',
        borderRadius: 12, padding: 4,
      },
    },
      FILTERS.map(function(f) {
        var active = filter === f.id;
        var count =
          f.id === 'all'    ? tasks.length :
          f.id === 'active' ? tasks.filter(function(t) { return !t.done; }).length :
          f.id === 'done'   ? tasks.filter(function(t) { return t.done; }).length :
          tasks.filter(function(t) { return !t.done && (t.priority === 'high' || isOverdue(t)); }).length;
        return ce('button', {
          key: f.id,
          onClick: function() { setFilter(f.id); },
          style: {
            flex: 1, padding: '8px 4px', borderRadius: 9, border: 'none',
            background: active ? 'linear-gradient(135deg,#a78bfa,#818cf8)' : 'transparent',
            color: active ? '#fff' : 'var(--t3)',
            fontWeight: active ? 700 : 400,
            fontSize: 11, cursor: 'pointer',
            boxShadow: active ? '0 2px 8px rgba(167,139,250,0.35)' : 'none',
            transition: 'all .15s',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
            fontFamily: 'inherit',
          },
        },
          ce('span', null, f.label),
          ce('span', { style: { fontSize: 9, opacity: 0.75 } }, count),
        );
      }),
    ),

    // ── ERROR ──
    error ? ce('div', {
      style: {
        background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: 10, padding: '8px 14px', marginBottom: 14,
        fontSize: 11, color: '#b45309',
      },
    }, '⚠ ' + error) : null,

    // ── LISTA ──
    visible.length === 0
      ? ce('div', {
          style: {
            textAlign: 'center', padding: '4rem 0',
            background: 'rgba(255,255,255,0.5)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.85)',
            borderRadius: '20px 6px 20px 20px',
          },
        },
          ce('div', { style: { fontSize: 40, marginBottom: 12, opacity: 0.4 } },
            filter === 'done' ? '🎉' : '📭',
          ),
          ce('div', { style: { fontSize: 13, color: 'var(--t3)', fontWeight: 500 } },
            filter === 'done'   ? 'Brak ukończonych zadań' :
            filter === 'urgent' ? 'Brak pilnych zadań — wszystko pod kontrolą!' :
            tasks.length === 0  ? 'Brak zadań. Kliknij „Nowe zadanie" aby zacząć.' :
            'Brak aktywnych zadań',
          ),
        )
      : ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          visible.map(function(task) {
            return ce(TaskCard, {
              key: task.id, task: task,
              onUpdate: function(patch) { handleUpdate(task.id, patch); },
              onDelete: function() { handleDelete(task.id); },
            });
          }),
        ),
  );
}
