// La voz del altavoz de la isla: la síntesis de voz del navegador. Anuncia los juegos y los eliminados, y si hay
// una voz coreana, la muñeca canta "mugunghwa kkochi pieotseumnida" de verdad. Si el navegador no tiene voces,
// no pasa nada: el juego sigue con sus sonidos.

import { E } from './estado.js';

let voces = [];
const hay = typeof window !== 'undefined' && 'speechSynthesis' in window;
function leer() { try { voces = window.speechSynthesis.getVoices(); } catch { voces = []; } }
if (hay) { leer(); try { window.speechSynthesis.onvoiceschanged = leer; } catch { /* sin voces */ } }

function voz(lang) {
  return voces.find((v) => v.lang && v.lang.toLowerCase().startsWith(lang)) || null;
}

/** Habla con voz grave de altavoz. prioridad: si es baja y ya está hablando, no se encima */
export function altavoz(texto, { tono = 0.55, vel = 0.92, baja = false } = {}) {
  if (!hay || !E.voz) return;
  try {
    const s = window.speechSynthesis;
    if (baja && (s.speaking || s.pending)) return;
    const u = new SpeechSynthesisUtterance(texto);
    const v = voz('es-es') || voz('es');
    if (v) u.voice = v;
    u.lang = v ? v.lang : 'es-ES';
    u.pitch = tono; u.rate = vel; u.volume = Math.min(1, E.volumen + 0.1);
    s.speak(u);
  } catch { /* sin voz */ }
}

export function callarAltavoz() {
  if (!hay) return;
  try { window.speechSynthesis.cancel(); } catch { /* nada */ }
}

/** La muñeca canta en coreano si hay voz coreana. Devuelve true si cantó (si no, el juego usa su canto sintético). */
export function cantoCoreano(dur) {
  if (!hay || !E.voz) return false;
  const v = voz('ko');
  if (!v) return false;
  try {
    const u = new SpeechSynthesisUtterance('무궁화 꽃이 피었습니다');
    u.voice = v; u.lang = v.lang;
    // la frase dura unos 2,2 segundos a velocidad normal
    u.rate = Math.max(0.5, Math.min(2.2, 2.2 / dur));
    u.pitch = 1.5; u.volume = Math.min(1, E.volumen + 0.1);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    return true;
  } catch { return false; }
}
