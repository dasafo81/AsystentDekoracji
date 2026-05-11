import React, { useEffect, useRef } from 'react'

var SHAPES = {
  L: {
    act: "M 18,36 C 10,22 12,6 30,5 C 40,4 50,9 62,7 C 76,5 88,8 98,6 C 110,4 120,8 126,14 C 132,20 130,30 126,40 C 120,52 108,60 90,64 C 70,68 46,66 30,58 C 16,50 10,46 18,36 Z",
    shn: "M 30,12 C 44,7 66,6 84,9 C 96,11 108,15 110,19 C 96,16 68,13 46,15 C 36,16 28,19 30,12 Z",
    drop: { cx: 12, cy: 26 },
  },
  R: {
    act: "M 174,10 C 180,5 196,3 214,6 C 234,9 252,8 266,14 C 280,20 286,32 284,44 C 282,56 270,64 252,68 C 232,72 208,68 190,62 C 172,56 162,46 164,34 C 166,22 170,13 174,10 Z",
    shn: "M 180,15 C 196,8 222,7 246,10 C 260,12 274,17 276,22 C 258,18 228,15 202,17 C 188,18 178,22 180,15 Z",
    drop: { cx: 286, cy: 28 },
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
    var p = Math.min((ts-t0)/ms, 1), e = ease(p), out = tpl[0]
    for (var i = 0; i < nf.length; i++) out += +(nf[i]+(nt[i]-nf[i])*e).toFixed(1)+tpl[i+1]
    el.setAttribute('d', out)
    if (p < 1) requestAnimationFrame(tick)
    else el.setAttribute('d', to)
  })
}

function morphC(el, from, to, ms) {
  var t0 = null
  function ease(t) { return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2 }
  requestAnimationFrame(function tick(ts) {
    if (!t0) t0 = ts
    var p = Math.min((ts-t0)/ms, 1), e = ease(p)
    el.setAttribute('cx', +(from.cx+(to.cx-from.cx)*e).toFixed(1))
    el.setAttribute('cy', +(from.cy+(to.cy-from.cy)*e).toFixed(1))
    if (p < 1) requestAnimationFrame(tick)
  })
}

export function BlobToggle({ value, onChange, options }) {
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
    if (actRef.current)  morph(actRef.current,  SHAPES[pK].act,  SHAPES[nK].act,  520)
    if (shnRef.current)  morph(shnRef.current,  SHAPES[pK].shn,  SHAPES[nK].shn,  520)
    if (dropRef.current) morphC(dropRef.current, SHAPES[pK].drop, SHAPES[nK].drop, 520)
  }, [value])

  var iL = value === 0

  return (
    <div
      style={{ position: 'relative', width: 300, height: 76, cursor: 'pointer', flexShrink: 0 }}
      onClick={function() { onChange(value === 0 ? 1 : 0) }}
    >
      <svg
        viewBox="0 0 300 76"
        xmlns="http://www.w3.org/2000/svg"
        overflow="visible"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        <defs>
          <linearGradient id="bt-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1e1b4b"/>
            <stop offset="100%" stopColor="#312e81"/>
          </linearGradient>
          <linearGradient id="bt-lt" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,.97)"/>
            <stop offset="55%" stopColor="rgba(216,204,255,.93)"/>
            <stop offset="100%" stopColor="rgba(167,243,208,.88)"/>
          </linearGradient>
          <filter id="bt-gw" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Ciemna plama tła */}
        <path fill="url(#bt-bg)"
          d="M 28,40 C 18,24 20,6 42,5 C 54,4 66,10 82,8 C 100,6 118,10 140,8 C 162,6 186,5 210,7 C 236,9 258,8 276,14 C 292,20 300,30 298,42 C 296,54 282,64 260,68 C 238,72 210,68 184,70 C 160,72 136,76 110,74 C 84,72 58,70 38,62 C 24,56 16,50 28,40 Z"/>

        {/* Aktywna jasna plama */}
        <path ref={actRef} fill="url(#bt-lt)" filter="url(#bt-gw)"
          d={SHAPES[iL ? 'L' : 'R'].act}/>

        {/* Blask */}
        <path ref={shnRef} fill="rgba(255,255,255,.55)"
          d={SHAPES[iL ? 'L' : 'R'].shn}/>

        {/* Krople */}
        <circle ref={dropRef}
          cx={SHAPES[iL ? 'L' : 'R'].drop.cx}
          cy={SHAPES[iL ? 'L' : 'R'].drop.cy}
          r="4" fill="url(#bt-bg)" opacity="0.7"/>
        <circle cx="294" cy="52" r="3.5" fill="url(#bt-bg)" opacity="0.45"/>
        <circle cx="280" cy="70" r="2.5" fill="url(#bt-bg)" opacity="0.35"/>
        <circle cx="18"  cy="58" r="3"   fill="url(#bt-bg)" opacity="0.4"/>
        <circle cx="8"   cy="44" r="2"   fill="url(#bt-bg)" opacity="0.3"/>
      </svg>

      {/* Zakładki */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', zIndex: 3 }}>
        {(options || []).map(function(opt, i) {
          var active = value === i
          return (
            <div
              key={i}
              onClick={function(e) { e.stopPropagation(); if (i !== value) onChange(i) }}
              style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontSize: 12, fontWeight: 800, fontFamily: 'inherit',
                height: '100%', cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
                color: active ? '#1e1b4b' : 'rgba(255,255,255,.42)',
                transform: active ? 'scale(1.03)' : 'scale(0.97)',
                transition: 'color .4s ease, transform .5s cubic-bezier(.34,1.5,.64,1)',
              }}
            >
              <i
                className={'ti ' + opt.icon}
                aria-hidden="true"
                style={{
                  fontSize: 14, flexShrink: 0,
                  color: active ? '#5b21b6' : 'inherit',
                  filter: active ? 'drop-shadow(0 0 4px rgba(139,92,246,.7))' : 'none',
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
