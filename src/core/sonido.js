// Música sintetizada en el navegador (WebAudio) y los efectos del kit.
// Los temas se escriben como notas: 'D5:1 F#5:0.5 r:1' (nota:duración en tiempos, r es silencio).

import { E } from './estado.js';

let ctx = null, salida = null, musicaGain = null;
let actual = null; // { nombre, timer, parar }

const NOTAS = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const hz = (n) => {
  const m = /^([A-G][#b]?)(\d)$/.exec(n);
  if (!m) return 0;
  return 440 * 2 ** ((NOTAS[m[1]] + (+m[2] + 1) * 12 - 69) / 12);
};

function parse(txt) {
  return txt.trim().split(/\s+/).filter((t) => t !== '|').map((t) => {
    const [n, d] = t.split(':');
    return { n, f: n === 'r' ? 0 : hz(n), d: +(d || 1) };
  });
}

export function iniciarAudio(scene) {
  if (ctx) return ctx;
  ctx = scene.sound.context;
  if (!ctx) return null;
  salida = ctx.createGain();
  salida.gain.value = E.volumen;
  salida.connect(ctx.destination);
  musicaGain = ctx.createGain();
  musicaGain.gain.value = 0.32;
  musicaGain.connect(salida);
  return ctx;
}

export function despertar() {
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

let ruidoBuf = null;
function ruido() {
  if (ruidoBuf) return ruidoBuf;
  ruidoBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = ruidoBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ruidoBuf;
}

// ---------- instrumentos ----------
function env(g, t, at, dur, pico, rel = 0.08) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(pico, t + at);
  g.gain.setValueAtTime(pico, t + Math.max(at, dur - rel));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
}

/** onda de pulso (como las consolas de 8 bits): duty de 0 a 1 */
const pulsos = {};
function pulso(duty) {
  if (pulsos[duty]) return pulsos[duty];
  const n = 48, re = new Float32Array(n), im = new Float32Array(n);
  for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
  return (pulsos[duty] = ctx.createPeriodicWave(re, im));
}

const INST = {
  // el lead de 8 bits: pulso de 25 % con un vibrato que entra tarde
  chip(t, f, dur, dest, vol = 0.1) {
    const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.setPeriodicWave(pulso(0.25)); o.frequency.value = f;
    lfo.frequency.value = 6; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(0, t + 0.12); lg.gain.linearRampToValueAtTime(f * 0.015, t + 0.3);
    lfo.connect(lg); lg.connect(o.frequency);
    o.connect(g); g.connect(dest);
    env(g, t, 0.005, dur * 0.92, vol, 0.03);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.08); lfo.stop(t + dur + 0.08);
  },
  // segunda voz: pulso fino de 12,5 %
  chip2(t, f, dur, dest, vol = 0.06) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.setPeriodicWave(pulso(0.125)); o.frequency.value = f;
    o.connect(g); g.connect(dest);
    env(g, t, 0.005, dur * 0.85, vol, 0.03);
    o.start(t); o.stop(t + dur + 0.08);
  },
  // arpegio cortito
  arp(t, f, dur, dest, vol = 0.035) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.setPeriodicWave(pulso(0.5)); o.frequency.value = f;
    o.connect(g); g.connect(dest);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.9);
    o.start(t); o.stop(t + dur);
  },
  flauta(t, f, dur, dest, vol = 0.22) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = f; o2.frequency.value = f * 2;
    lfo.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.3, dur));
    lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency);
    const g2 = ctx.createGain(); g2.gain.value = 0.18; o2.connect(g2); g2.connect(g);
    o.connect(g); g.connect(dest);
    env(g, t, 0.04, dur * 0.95, vol);
    [o, o2, lfo].forEach((x) => { x.start(t); x.stop(t + dur + 0.2); });
  },
  cuerdas(t, f, dur, dest, vol = 0.12) {
    const g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 2200;
    for (const det of [-6, 6]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      o.connect(lp); o.start(t); o.stop(t + dur + 0.4);
    }
    lp.connect(g); g.connect(dest);
    env(g, t, 0.12, dur, vol, 0.25);
  },
  cuadrada(t, f, dur, dest, vol = 0.09) {
    const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'square'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 3000;
    o.connect(lp); lp.connect(g); g.connect(dest);
    env(g, t, 0.01, dur * 0.9, vol, 0.04);
    o.start(t); o.stop(t + dur + 0.1);
  },
  organo(t, f, dur, dest, vol = 0.08) {
    const g = ctx.createGain();
    for (const [m, v, tp] of [[1, 1, 'square'], [2, 0.5, 'sine'], [0.5, 0.6, 'sine']]) {
      const o = ctx.createOscillator(), gg = ctx.createGain();
      o.type = tp; o.frequency.value = f * m; gg.gain.value = v;
      o.connect(gg); gg.connect(g); o.start(t); o.stop(t + dur + 0.1);
    }
    g.connect(dest);
    env(g, t, 0.01, dur * 0.85, vol, 0.05);
  },
  bajo(t, f, dur, dest, vol = 0.28) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    o.connect(g); g.connect(dest);
    env(g, t, 0.01, dur * 0.85, vol, 0.06);
    o.start(t); o.stop(t + dur + 0.1);
  },
  metal(t, f, dur, dest, vol = 0.1) {
    const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass';
    lp.frequency.setValueAtTime(400, t); lp.frequency.linearRampToValueAtTime(1600, t + 0.08); lp.frequency.linearRampToValueAtTime(700, t + dur);
    o.connect(lp); lp.connect(g); g.connect(dest);
    env(g, t, 0.03, dur * 0.9, vol, 0.08);
    o.start(t); o.stop(t + dur + 0.15);
  },
  campana(t, f, dur, dest, vol = 0.12) {
    const g = ctx.createGain();
    for (const [m, v] of [[1, 1], [2.76, 0.4], [5.4, 0.2]]) {
      const o = ctx.createOscillator(), gg = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f * m; gg.gain.value = v;
      o.connect(gg); gg.connect(g); o.start(t); o.stop(t + 1.6);
    }
    g.connect(dest);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
  },
  voz(t, f, dur, dest, vol = 0.2) {
    // una voz de niña sintética: diente de sierra con dos formantes de vocal
    const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = f;
    lfo.frequency.value = 6; lg.gain.value = f * 0.01; lfo.connect(lg); lg.connect(o.frequency);
    const mezcla = ctx.createGain();
    for (const [fr, q, v] of [[800, 6, 1], [1150, 8, 0.6], [2900, 10, 0.25]]) {
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = q;
      const gg = ctx.createGain(); gg.gain.value = v;
      o.connect(bp); bp.connect(gg); gg.connect(mezcla);
    }
    mezcla.connect(g); g.connect(dest);
    env(g, t, 0.02, dur * 0.9, vol, 0.05);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
  },
};

const PERC = {
  k(t, dest, v = 0.6) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.2); },
  s(t, dest, v = 0.3) { nz(t, dest, v, 'bandpass', 1800, 0.12); },
  h(t, dest, v = 0.1) { nz(t, dest, v, 'highpass', 7000, 0.04); },
  c(t, dest, v = 0.28) { for (const d of [0, 0.012, 0.024]) nz(t + d, dest, v, 'bandpass', 1300, 0.05); },
  t(t, dest, v = 0.18) { nz(t, dest, v, 'bandpass', 3200, 0.025); }, // castañuela
  T(t, dest, v = 0.7) { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.4); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.6); o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.7); }, // timbal
};
function nz(t, dest, v, tipo, fr, dur) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = ruido(); f.type = tipo; f.frequency.value = fr;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}

// ---------- la canción de la muñeca en 8 bits ----------
// "Mu-gung-hwa kko-chi pi-eot-seum-ni-da", la canción del juego infantil coreano, en chiptune: la canción,
// una respuesta, y otra vez una octava arriba con segunda voz. Bajo triangular, arpegios y batería de ruido.
const CANTO = (o) => `G${o}:1 G${o}:1 E${o}:1 G${o}:0.5 G${o}:0.5 E${o}:0.5 A${o}:0.5 G${o}:0.5 E${o}:0.5 D${o}:1 r:1`;
const RESPUESTA = (o) => `B${o}:1 B${o}:1 G${o}:1 B${o}:0.5 B${o}:0.5 G${o}:0.5 C${o + 1}:0.5 B${o}:0.5 G${o}:0.5 A${o}:1 r:1`;
const CIERRE = (o) => `G${o}:1 G${o}:1 E${o}:1 G${o}:0.5 G${o}:0.5 E${o}:0.5 A${o}:0.5 G${o}:0.5 E${o}:0.5 G${o}:2`;
const ACORDES = [['E', 'G', 'B'], ['C', 'E', 'G'], ['A', 'C', 'E'], ['D', 'F#', 'A']];
const BAJOS = ['E', 'C', 'A', 'D'];
const vueltas = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join(' ');
const CANCION_MUNECA = {
  bpm: 138, pistas: [
    // 12 compases de lead: canto x2, respuesta y cierre, canto arriba x2
    ['chip', [CANTO(4), CANTO(4), RESPUESTA(4), CIERRE(4), CANTO(5), CANTO(5)].join(' ')],
    // la segunda voz solo en la última parte (una tercera abajo)
    ['chip2', `r:32 ${[CANTO(4), CANTO(4)].join(' ').replace(/\b([GEAD])4:/g, (_, n) => ({ G: 'E4:', E: 'C4:', A: 'F#4:', D: 'B3:' })[n])}`],
    // bajo en octavas, de a corcheas: Em C Am D
    ['bajo', vueltas(12, (i) => { const b = BAJOS[i % 4]; return `${b}2:0.5 ${b}3:0.5 ${b}2:0.5 ${b}3:0.5 ${b}2:0.5 ${b}3:0.5 ${b}2:0.5 ${b}3:0.5`; }), 0.24],
    // arpegio de semicorcheas sobre el acorde de cada compás
    ['arp', vueltas(12, (i) => { const [a, b, c] = ACORDES[i % 4]; return vueltas(4, () => `${a}5:0.25 ${b}5:0.25 ${c}5:0.25 ${b}5:0.25`); })],
    // batería: tranquila, después más llena
    ['perc', 'k.h.s.h.k.hks.h.'.repeat(2) + 'k.hks.hkk.hks.hs'.repeat(2) + 'kkhks.hkk.hksshs'.repeat(2)],
  ],
};

// ---------- los temas ----------
// pistas: [instrumento, notas] o ['perc', 'k.h.s.h.' (un carácter por paso de 1/2 tiempo, '.' es nada)]
const TEMAS = {
  muneca: CANCION_MUNECA,
  // la flauta del inicio: vals triste en re menor con palmas y castañuelas
  flauta: {
    bpm: 104, pistas: [
      ['flauta', `A4:1 D5:1 E5:1 F5:1 E5:0.5 D5:0.5 C5:1 A4:2 G4:1 A4:1 Bb4:1 A4:1 G4:0.5 F4:0.5 E4:1 D4:2
                  A4:1 D5:1 E5:1 F5:1 G5:0.5 F5:0.5 E5:1 C5:2 D5:1 C5:0.5 Bb4:0.5 A4:1 G4:1 A4:1 E4:1 D4:2`],
      ['bajo', `D3:2 A2:2 F2:2 C3:2 G2:2 D3:2 A2:2 D3:2 D3:2 A2:2 C3:2 F2:2 Bb2:2 G2:2 A2:2 D3:2`],
      ['perc', 't.c.t.c.t.c.t.c.'],
    ],
  },
  // el Danubio Azul (Strauss, dominio público): la mañana en el dormitorio
  danubio: {
    bpm: 168, pistas: [
      ['cuerdas', `D4:1 F#4:1 A4:1 A4:2 r:1 A5:1 A5:2 F#5:1 F#5:2 D4:1 F#4:1 A4:1 A4:2 r:1 A5:1 A5:2 G5:1 G5:2
                   C#4:1 E4:1 B4:1 B4:2 r:1 B5:1 B5:2 G5:1 G5:2 C#4:1 E4:1 B4:1 B4:2 r:1 B5:1 B5:2 F#5:1 F#5:2
                   D4:1 F#4:1 A4:1 D5:2 r:1 D6:1 D6:2 A5:1 A5:2 D4:1 F#4:1 A4:1 D5:2 r:1 D6:1 D6:2 B5:1 B5:2
                   E5:1 G5:1 B5:1 B5:3 G#5:1 A5:2 F#6:3 D6:1 F#5:2 F#5:1 E5:2 B5:1 A5:2 D5:3 r:3`],
      ['bajo', `D3:1 r:1 r:1 D3:1 r:2 D3:1 r:2 D3:1 r:2 D3:1 r:2 D3:1 r:2 D3:1 r:2 D3:1 r:2
                A2:1 r:2 A2:1 r:2 A2:1 r:2 A2:1 r:2 A2:1 r:2 A2:1 r:2 A2:1 r:2 A2:1 r:2
                D3:1 r:2 D3:1 r:2 D3:1 r:2 D3:1 r:2 D3:1 r:2 D3:1 r:2 D3:1 r:2 D3:1 r:2
                E3:1 r:2 E3:1 r:2 E3:1 r:2 D3:1 r:2 A2:1 r:2 A2:1 r:2 D3:1 r:2 D3:1 r:2`],
      ['organo', `r:1 F#4:1 F#4:1 r:1 F#4:1 F#4:1 r:1 F#4:1 F#4:1 r:1 F#4:1 F#4:1 r:1 F#4:1 F#4:1 r:1 F#4:1 F#4:1 r:1 G4:1 G4:1 r:1 G4:1 G4:1
                  r:1 G4:1 G4:1 r:1 G4:1 G4:1 r:1 G4:1 G4:1 r:1 G4:1 G4:1 r:1 G4:1 G4:1 r:1 G4:1 G4:1 r:1 F#4:1 F#4:1 r:1 F#4:1 F#4:1
                  r:1 F#4:1 F#4:1 r:1 F#4:1 F#4:1 r:1 F#4:1 F#4:1 r:1 F#4:1 F#4:1 r:1 F#4:1 F#4:1 r:1 F#4:1 F#4:1 r:1 G4:1 G4:1 r:1 G4:1 G4:1
                  r:1 G4:1 G4:1 r:1 G4:1 G4:1 r:1 G4:1 G4:1 r:1 A4:1 A4:1 r:1 G4:1 G4:1 r:1 G4:1 G4:1 r:1 F#4:1 F#4:1 r:1 F#4:1 F#4:1`, 0.035],
    ],
  },
  // la marcha de los guardias: metales graves y redoblante
  guardias: {
    bpm: 112, pistas: [
      ['metal', `E3:1.5 E3:0.5 G3:1 E3:1 B3:2 A3:1 G3:1 F#3:1.5 F#3:0.5 A3:1 F#3:1 E3:4
                 E3:1.5 E3:0.5 G3:1 B3:1 E4:2 D4:1 B3:1 C4:1.5 B3:0.5 A3:1 F#3:1 E3:4`],
      ['bajo', `E2:1 E2:1 E2:1 E2:1 E2:1 E2:1 E2:1 E2:1 D2:1 D2:1 D2:1 D2:1 E2:1 E2:1 E2:1 E2:1
                E2:1 E2:1 E2:1 E2:1 E2:1 E2:1 E2:1 E2:1 C2:1 C2:1 D2:1 D2:1 E2:1 E2:1 E2:1 E2:1`],
      ['perc', 'k.sss.k.s.ssk.s.'],
    ],
  },
  // tensión de juego: ostinato grave y reloj
  tension: {
    bpm: 128, pistas: [
      ['bajo', `E2:0.5 E2:0.5 E3:0.5 E2:0.5 E2:0.5 E2:0.5 G2:0.5 E2:0.5 E2:0.5 E2:0.5 E3:0.5 E2:0.5 F2:0.5 F2:0.5 F#2:0.5 F2:0.5`],
      ['cuerdas', `B3:4 C4:4 B3:4 A#3:4`, 0.06],
      ['perc', 'k.t.k.t.k.tsk.t.'],
    ],
  },
  // el carrusel de Mingle: organito en 3/4, alegre y torcido
  mingle: {
    bpm: 150, pistas: [
      ['organo', `G4:1 C5:1 E5:1 G5:2 E5:1 F5:1 E5:1 D5:1 C5:3 A4:1 D5:1 F5:1 A5:2 F5:1 G5:1 F5:1 E5:1 D5:3
                  G4:1 C5:1 E5:1 G5:2 E5:1 G#5:1 A5:1 B5:1 C6:3 B5:1 A5:1 G5:1 F5:1 E5:1 D5:1 C5:3 r:3`],
      ['bajo', `C3:1 r:2 G2:1 r:2 C3:1 r:2 C3:1 r:2 D3:1 r:2 A2:1 r:2 G2:1 r:2 G2:1 r:2 C3:1 r:2 G2:1 r:2 E3:1 r:2 A2:1 r:2 F2:1 r:2 G2:1 r:2 C3:1 r:2 C3:1 r:2`],
      ['perc', 'k.h.h.k.h.h.'],
    ],
  },
  // la gran final: tambores y cuerdas
  epica: {
    bpm: 140, pistas: [
      ['cuerdas', `E4:2 G4:2 B4:2 A4:2 G4:2 F#4:2 E4:4 C5:2 B4:2 A4:2 G4:2 F#4:2 G4:2 B4:4`],
      ['metal', `E3:1 r:1 E3:1 r:1 E3:0.5 E3:0.5 G3:1 F#3:2 E3:1 r:1 E3:1 r:1 C3:0.5 C3:0.5 D3:1 B2:2`],
      ['bajo', `E2:0.5 E2:0.5 E2:0.5 E2:0.5 E2:0.5 E2:0.5 E2:0.5 E2:0.5 C2:0.5 C2:0.5 C2:0.5 C2:0.5 D2:0.5 D2:0.5 B1:0.5 B1:0.5`],
      ['perc', 'k.skk.s.k.skkss'],
    ],
  },
  // la tormenta del mar: un drone oscuro y timbales
  tormenta: {
    bpm: 70, pistas: [
      ['cuerdas', `D3:4 C3:4 Bb2:4 A2:4`, 0.09],
      ['cuerdas', `A3:4 G3:4 F3:4 E3:4`, 0.05],
      ['perc', 'T.......T...T...'],
    ],
  },
  // la noche en el dormitorio: campanita y flauta suave
  noche: {
    bpm: 76, pistas: [
      ['campana', `D5:2 A4:2 F5:2 E5:2 D5:2 C5:2 A4:4`],
      ['flauta', `r:8 F4:2 G4:2 A4:4`, 0.12],
      ['bajo', `D2:4 Bb1:4 C2:4 A1:4`, 0.18],
    ],
  },
};

export function musica(nombre) {
  if (!ctx) return;
  if (actual && actual.nombre === nombre) return;
  pararMusica();
  const tema = TEMAS[nombre];
  if (!tema) return;
  const seg = 60 / tema.bpm;
  const pistas = tema.pistas.map(([inst, txt, vol]) => inst === 'perc'
    ? { perc: txt.split(''), i: 0, t: 0, vol }
    : { inst, notas: parse(txt), i: 0, t: 0, vol });
  const bus = ctx.createGain(); bus.gain.value = 1; bus.connect(musicaGain);
  const inicio = ctx.currentTime + 0.08;
  // cada pista lleva su propio tiempo (en tiempos de negra) y se repite sola
  const programar = () => {
    const hasta = ctx.currentTime + 0.25;
    for (const p of pistas) {
      for (;;) {
        const t = inicio + p.t * seg;
        if (t > hasta) break;
        // si la pestaña estuvo dormida no se toca todo lo atrasado de golpe
        const tarde = t < ctx.currentTime - 0.05;
        if (p.perc) {
          const ch = p.perc[p.i % p.perc.length];
          if (PERC[ch] && !tarde) PERC[ch](t, bus);
          p.t += 0.5;
        } else {
          const n = p.notas[p.i % p.notas.length];
          if (n.f && !tarde) INST[p.inst](t, n.f, n.d * seg, bus, p.vol);
          p.t += n.d;
        }
        p.i++;
      }
    }
  };
  const timer = setInterval(programar, 50);
  programar();
  actual = { nombre, timer, bus };
}

export function pararMusica(fade = 0.3) {
  if (!actual) return;
  clearInterval(actual.timer);
  const b = actual.bus;
  try { b.gain.setTargetAtTime(0.0001, ctx.currentTime, fade / 3); setTimeout(() => b.disconnect(), fade * 1000 + 400); } catch { /* ya cortado */ }
  actual = null;
}

export function musicaActual() { return actual ? actual.nombre : null; }

/** La canción de la muñeca: "mu-gung-hwa kko-chi pi-eot-seum-ni-da" repartida en `dur` segundos. */
export function cancionMuneca(dur) {
  if (!ctx) return;
  // la misma melodía de la canción del menú: mu-gung-hwa kko-chi pi-eot-seum-ni-da
  const notas = ['G4', 'G4', 'E4', 'G4', 'G4', 'E4', 'A4', 'G4', 'E4', 'D4'];
  const t0 = ctx.currentTime + 0.02;
  // las primeras sílabas lentas y la última frase de corrido, como en la serie
  const pesos = [1.1, 1, 1.1, 0.6, 0.6, 0.6, 0.55, 0.55, 0.6, 1.4];
  const total = pesos.reduce((a, b) => a + b, 0);
  let t = t0;
  notas.forEach((n, i) => {
    const d = (pesos[i] / total) * dur;
    INST.voz(t, hz(n), d * 0.92, salida, 0.22);
    t += d;
  });
}

/** Un tono corto (interfaz y efectos sintéticos). */
export function tono(f = 880, dur = 0.08, inst = 'cuadrada', vol = 0.12) {
  if (!ctx) return;
  INST[inst](ctx.currentTime + 0.005, f, dur, salida, vol);
}

export function bloque(scene, ...notas) {
  if (!ctx) return;
  let t = ctx.currentTime + 0.01;
  for (const [n, d, inst = 'cuadrada', vol = 0.1] of notas) {
    if (n !== 'r') INST[inst](t, hz(n), d, salida, vol);
    t += d;
  }
}

export function fanfarria() {
  bloque(null, ['C5', 0.12, 'metal', 0.14], ['E5', 0.12, 'metal', 0.14], ['G5', 0.12, 'metal', 0.14], ['C6', 0.5, 'metal', 0.16]);
}

/** Efecto del kit por nombre ('pistola', 'silbato'...) */
export function sfx(scene, nombre, vol = 0.7) {
  const key = 'sfx_' + nombre;
  if (!scene.cache.audio.exists(key)) return;
  try { scene.sound.play(key, { volume: vol * E.volumen }); } catch { /* sin audio */ }
}

/** Ambiente en bucle del kit ('mar', 'noche', 'viento'). Devuelve el sonido para pararlo. */
export function ambiente(scene, nombre, vol = 0.5) {
  const key = 'ambientes_' + nombre;
  if (!scene.cache.audio.exists(key)) return null;
  const s = scene.sound.add(key, { loop: true, volume: vol * E.volumen });
  try { s.play(); } catch { /* sin audio */ }
  scene.events.once('shutdown', () => { try { s.stop(); s.destroy(); } catch { /* listo */ } });
  return s;
}

/** Blip de voz de un personaje para los diálogos. */
export function blip(scene, id) {
  const quien = scene.cache.audio.exists(`voz_${id}_0`) ? id : 'locutor';
  const key = `voz_${quien}_${Math.floor(Math.random() * 4)}`;
  if (!scene.cache.audio.exists(key)) return;
  try { scene.sound.play(key, { volume: 0.35 * E.volumen }); } catch { /* sin audio */ }
}

export function volumen(v) {
  E.volumen = v;
  if (salida) salida.gain.value = v;
}
