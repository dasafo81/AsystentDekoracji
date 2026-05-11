import React, { useRef, useEffect } from 'react'

export function BlobToggle({ value, onChange, options }) {
  var pillRef = useRef(null)

  useEffect(function() {
    var pill = pillRef.current
    if (!pill) return
    pill.style.transform = 'translateX(' + (value === 0 ? '0%' : '100%') + ')'
  }, [value])

  return (
    <div style={{
      position: 'relative',
      display: 'inline-flex',
      background: 'rgba(30,27,75,0.85)',
      borderRadius: 999,
      padding: 5,
      gap: 0,
      boxShadow: '0 4px 20px rgba(30,27,75,0.25)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}>

      {/* Ruchomy aktywny pill */}
      <div ref={pillRef} style={{
        position: 'absolute',
        top: 5, bottom: 5,
        left: 5,
        width: 'calc(50% - 5px)',
        background: 'linear-gradient(135deg, rgba(255,255,255,.97), rgba(216,204,255,.93), rgba(167,243,208,.88))',
        borderRadius: 999,
        transition: 'transform 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)',
        boxShadow: '0 2px 12px rgba(139,92,246,0.35), inset 0 1px 0 rgba(255,255,255,0.9)',
        pointerEvents: 'none',
        zIndex: 1,
      }}/>

      {/* Zakładki */}
      {(options || []).map(function(opt, i) {
        var active = value === i
        return (
          <div
            key={i}
            onClick={function() { if (i !== value) onChange(i) }}
            style={{
              position: 'relative', zIndex: 2,
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 22px',
              fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
              cursor: 'pointer', borderRadius: 999,
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              color: active ? '#1e1b4b' : 'rgba(255,255,255,0.4)',
              transition: 'color 0.35s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <i
              className={'ti ' + opt.icon}
              aria-hidden="true"
              style={{
                fontSize: 15,
                color: active ? '#5b21b6' : 'inherit',
                filter: active ? 'drop-shadow(0 0 4px rgba(139,92,246,.6))' : 'none',
                transition: 'color 0.35s ease, filter 0.35s ease',
              }}
            />
            {opt.label}
          </div>
        )
      })}
    </div>
  )
}
