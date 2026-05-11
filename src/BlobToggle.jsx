import React, { useEffect, useRef, useState } from 'react'

// ── Kształty plam dla lewej i prawej strony ──────────────────────────────────
var SHAPES = {
  L: {
    act: "M 34,66 C 18,40 20,10 58,8 C 76,7 92,16 114,12 C 136,8 154,13 172,10 C 192,7 208,13 216,22 C 224,32 222,50 214,68 C 206,84 188,100 160,108 C 130,116 90,114 62,100 C 34,88 18,80 34,66 Z",
    shn: "M 58,24 C 82,14 122,11 158,15 C 180,17 200,23 204,30 C 180,26 134,21 94,24 C 74,25 60,30 58,24 Z",
    drop: { cx: 26, cy: 44 },
  },
  R: {
    act: "M 290,18 C 302,10 330,6 362,10 C 396,14 428,14 452,28 C 470,38 478,56 472,74 C 466,90 448,106 416,114 C 382,122 344,118 314,114 C 284,110 268,94 268,72 C 268,50 278,26 290,18 Z",
    shn: "M 298,26 C 326,14 368,12 406,16 C 430,19 452,26 456,34 C 428,28 378,23 334,26 C 310,28 296,34 298,26 Z",
    drop: { cx: 472, cy: 46 },
  },
}

function morph(el, from, to, ms) {
  var nf = from.match(/[-\d.]+/g).map(Number)
  var nt = to.match(/[-\d.]+/g).map(Number)
  var tpl = from.replace(/[-\d.]+/g, '\x00').split('\x00')
  var t0 = null
  function ease(t) { return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2 }
  requestAnimationFrame(function tick(ts) {
    if (!t0) t0 = ts
    var p = Math.min((ts - t0) / ms, 1), e = ease(p), out = tpl[0]
    for (var i = 0; i < nf.length; i++) out += +(nf[i] + (nt[i] - nf[i]) * e).toFixed(1) + tpl[i + 1]
    el.setAttribute('d', out)
    if (p < 1) requestAnimationFrame(tick)
    else el.setAttribute('d', to)
  })
}

function morphCircle(el, from, to, ms) {
  var t0 = null
  function ease(t) { return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2 }
  requestAnimationFrame(function tick(ts) {
    if (!t0) t0 = ts
    var p = Math.min((ts - t0) / ms, 1), e = ease(p)
    el.setAttribute('cx', +(from.cx + (to.cx - from.cx) * e).toFixed(1))
    el.setAttribute('cy', +(from.cy + (to.cy - from.cy) * e).toFixed(1))
    if (p < 1) requestAnimationFrame(tick)
  })
}

// ── Komponent ─────────────────────────────────────────────────────────────────
export function BlobToggle({ value, onChange, options }) {
  // value: 0 | 1
  // options: [{label, icon}]
  var actRef  = useRef(null)
  var shnRef  = useRef(null)
  var dropRef = useRef(null)
  var curRef  = useRef(value)

  useEffect(function() {
    var i = value
    var prev = curRef.current
    if (i === prev) return
    var pK = prev === 0 ? 'L' : 'R'
    var nK = i === 0 ? 'L' : 'R'
    curRef.current = i
    if (actRef.current)  morph(actRef.current,  SHAPES[pK].act,  SHAPES[nK].act,  560)
    if (shnRef.current)  morph(shnRef.current,  SHAPES[pK].shn,  SHAPES[nK].shn,  560)
    if (dropRef.current) morphCircle(dropRef.current, SHAPES[pK].drop, SHAPES[nK].drop, 560)
  }, [value])

  function handleClick(e, i) {
    e.stopPropagation()
    if (i !== value) onChange(i)
  }

  return (
    <div
      style={{ position: 'relative', width: 500, height: 130, cursor: 'pointer', flexShrink: 0 }}
      onClick={function(e) { onChange(value === 0 ? 1 : 0) }}
    >
      {/* SVG plama */}
      <svg
        viewBox="0 0 500 130"
        xmlns="http://www.w3.org/2000/svg"
        overflow="visible"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <defs>
          <linearGradient id="bt-bgr" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1e1b4b"/>
            <stop offset="100%" stopColor="#312e81"/>
          </linearGradient>
          <linearGradient id="bt-ltr" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,.97)"/>
            <stop offset="55%" stopColor="rgba(216,204,255,.93)"/>
            <stop offset="100%" stopColor="rgba(167,243,208,.88)"/>
          </linearGradient>
          <filter id="bt-glw" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Ciemna plama tła */}
        <path fill="url(#bt-bgr)"
          d="M 52,68 C 36,42 24,12 62,8 C 78,6 94,14 114,10 C 136,6 160,10 184,8
             C 208,6 234,4 260,6 C 288,8 316,5 344,9 C 374,13 404,16 424,26
             C 446,36 460,52 456,68 C 452,84 436,100 406,108 C 376,116 342,110 310,114
             C 280,118 252,126 220,124 C 188,122 158,118 128,120
             C 98,122 66,116 48,102 C 34,92 30,80 52,68 Z"/>

        {/* Aktywna jasna plama */}
        <path ref={actRef} id="bt-act" fill="url(#bt-ltr)" filter="url(#bt-glw)"
          d={SHAPES[value === 0 ? 'L' : 'R'].act}/>

        {/* Blask */}
        <path ref={shnRef} id="bt-shn" fill="rgba(255,255,255,.52)"
          d={SHAPES[value === 0 ? 'L' : 'R'].shn}/>

        {/* Krople dekoracyjne */}
        <circle ref={dropRef} cx={SHAPES[value === 0 ? 'L' : 'R'].drop.cx} cy={SHAPES[value === 0 ? 'L' : 'R'].drop.cy} r="7" fill="url(#bt-bgr)" opacity="0.7"/>
        <circle cx="460" cy="86" r="5.5" fill="url(#bt-bgr)" opacity="0.5"/>
        <circle cx="440" cy="114" r="4"   fill="url(#bt-bgr)" opacity="0.4"/>
        <circle cx="34"  cy="110" r="4.5" fill="url(#bt-bgr)" opacity="0.4"/>
        <circle cx="18"  cy="82"  r="3"   fill="url(#bt-bgr)" opacity="0.3"/>
      </svg>

      {/* Zakładki */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', zIndex: 3 }}>
        {(options || []).map(function(opt, i) {
          var active = value === i
          return (
            <div
              key={i}
              onClick={function(e) { handleClick(e, i) }}
              style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 13, fontWeight: 800, fontFamily: 'inherit',
                height: '100%', cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
                color: active ? '#1e1b4b' : 'rgba(255,255,255,.45)',
                transform: active ? 'scale(1.03)' : 'scale(0.97)',
                transition: 'color .4s ease, transform .5s cubic-bezier(.34,1.5,.64,1)',
              }}
            >
              <i
                className={'ti ' + opt.icon}
                aria-hidden="true"
                style={{
                  fontSize: 15, flexShrink: 0,
                  color: active ? '#5b21b6' : 'inherit',
                  filter: active ? 'drop-shadow(0 0 5px rgba(139,92,246,.75))' : 'none',
                  transition: 'all .4s ease',
                }}
              />
              {opt.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}
