import React, { useState } from 'react';

var ce = React.createElement;

var GLASS = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.9)',
};

var INP = {
  width: '100%',
  padding: '12px 16px',
  fontSize: 14,
  border: '1px solid rgba(255,255,255,0.85)',
  borderRadius: '12px 4px 12px 12px',
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  color: '#1e1b4b',
  boxSizing: 'border-box',
  display: 'block',
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

export function ModalClient(p) {
  var ns = useState(''); var name = ns[0]; var setName = ns[1];
  var as = useState(''); var addr = as[0]; var setAddr = as[1];
  var ps = useState(''); var phone = ps[0]; var setPhone = ps[1];
  var es = useState(''); var email = es[0]; var setEmail = es[1];

  function submit() {
    if (!name.trim()) return;
    p.onOk(name.trim(), addr.trim(), phone.trim(), email.trim());
    p.onClose();
  }

  return ce('div', {
    onClick: function(e) { if (e.target === e.currentTarget) p.onClose(); },
    style: {
      position: 'fixed', inset: 0,
      background: 'rgba(30,27,75,0.35)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 999,
    },
  },
    ce('div', {
      style: Object.assign({}, GLASS, {
        borderRadius: '24px 8px 24px 24px',
        padding: '32px 28px',
        width: 'min(400px, 92vw)',
        boxShadow: '0 20px 60px rgba(30,27,75,0.2)',
        position: 'relative',
      }),
    },

      // Header
      ce('div', { style: { marginBottom: 24 } },
        ce('div', { style: { fontSize: 20, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.3px' } }, 'Nowy klient'),
        ce('div', { style: { fontSize: 12, color: '#a0aec0', marginTop: 4 } }, 'Uzupełnij dane kontaktowe'),
      ),

      // Dekoracyjna kulka
      ce('div', { style: {
        position: 'absolute', top: -30, right: -30,
        width: 120, height: 120, borderRadius: '50%',
        background: 'linear-gradient(135deg, #c4b5fd, #6ee7b7)',
        opacity: 0.25, filter: 'blur(20px)', pointerEvents: 'none',
      }}),

      // Pola
      ce('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },

        ce('div', null,
          ce('label', { style: { fontSize: 10, fontWeight: 700, color: '#a0aec0', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 } }, 'Imię i nazwisko *'),
          ce('input', {
            autoFocus: true,
            value: name,
            onChange: function(e) { setName(e.target.value); },
            onKeyDown: function(e) { if (e.key === 'Enter') submit(); },
            placeholder: 'np. Anna Kowalska',
            style: Object.assign({}, INP, { fontSize: 15, fontWeight: 600 }),
          }),
        ),

        ce('div', null,
          ce('label', { style: { fontSize: 10, fontWeight: 700, color: '#a0aec0', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 } }, 'Adres'),
          ce('input', {
            value: addr,
            onChange: function(e) { setAddr(e.target.value); },
            onKeyDown: function(e) { if (e.key === 'Enter') submit(); },
            placeholder: 'ul. Przykładowa 1, Warszawa',
            style: INP,
          }),
        ),

        ce('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
          ce('div', null,
            ce('label', { style: { fontSize: 10, fontWeight: 700, color: '#a0aec0', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 } }, 'Telefon'),
            ce('input', {
              type: 'tel',
              value: phone,
              onChange: function(e) { setPhone(e.target.value); },
              onKeyDown: function(e) { if (e.key === 'Enter') submit(); },
              placeholder: '+48 600 000 000',
              style: Object.assign({}, INP, { borderRadius: '12px 4px 12px 4px' }),
            }),
          ),
          ce('div', null,
            ce('label', { style: { fontSize: 10, fontWeight: 700, color: '#a0aec0', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 5 } }, 'E-mail'),
            ce('input', {
              type: 'email',
              value: email,
              onChange: function(e) { setEmail(e.target.value); },
              onKeyDown: function(e) { if (e.key === 'Enter') submit(); },
              placeholder: 'email@gmail.com',
              style: Object.assign({}, INP, { borderRadius: '4px 12px 12px 4px' }),
            }),
          ),
        ),
      ),

      // Przyciski
      ce('div', { style: { display: 'flex', gap: 10, marginTop: 24 } },
        ce('button', {
          onClick: p.onClose,
          style: {
            padding: '12px 20px', borderRadius: '12px 4px 12px 12px',
            border: '1px solid rgba(30,27,75,0.1)',
            background: 'rgba(255,255,255,0.6)',
            color: '#6b7280', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          },
        }, 'Anuluj'),
        ce('button', {
          onClick: submit,
          disabled: !name.trim(),
          style: {
            flex: 1, padding: '12px 20px',
            borderRadius: '4px 12px 12px 12px',
            border: 'none',
            background: name.trim() ? '#1e1b4b' : 'rgba(30,27,75,0.2)',
            color: '#fff', fontSize: 13, fontWeight: 700,
            cursor: name.trim() ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            boxShadow: name.trim() ? '0 6px 20px rgba(30,27,75,0.25)' : 'none',
            transition: 'all 0.15s',
          },
        }, 'Dodaj klienta'),
      ),
    ),
  );
}
