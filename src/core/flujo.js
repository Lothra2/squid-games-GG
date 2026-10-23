// El orden de la historia. Cada paso es una escena. Ganar un juego avanza y recupera las 3 vidas.
// Perder las 3 vidas manda de vuelta al juego 1 (luz roja), sin repetir la intro.

import { E, guardar, sumarPozo } from './estado.js';

export const JUEGOS = [
  { k: 'LuzRoja', titulo: 'LUZ ROJA, LUZ VERDE', temporada: 1 },
  { k: 'Galleta', titulo: 'LA GALLETA', temporada: 1 },
  { k: 'TiraAfloja', titulo: 'TIRA Y AFLOJA', temporada: 1 },
  { k: 'Canicas', titulo: 'LAS CANICAS', temporada: 1 },
  { k: 'Pentatlon', titulo: 'PENTATLÓN DE SEIS PIERNAS', temporada: 2 },
  { k: 'Mingle', titulo: 'MINGLE', temporada: 2 },
  { k: 'Puente', titulo: 'EL PUENTE DE CRISTAL', temporada: 1 },
  { k: 'Escondite', titulo: 'EL ESCONDITE', temporada: 3 },
  { k: 'Cuerda', titulo: 'LA CUERDA', temporada: 3 },
  { k: 'Cielo', titulo: 'EL CALAMAR EN EL CIELO', temporada: 3 },
  { k: 'Calamar', titulo: 'EL JUEGO DEL CALAMAR', temporada: 1 },
];

export const SECUENCIA = [
  { k: 'Intro' },
  { k: 'Ddakji' },
  { k: 'Llegada' },
  ...JUEGOS.flatMap((j, i) => [{ k: j.k, n: i + 1 }, ...(i < JUEGOS.length - 1 ? [{ k: 'Noche', n: i + 1 }] : [])]),
  { k: 'Final' },
];

export const PRIMER_JUEGO = SECUENCIA.findIndex((s) => s.k === 'LuzRoja');

export function pasoActual() {
  return SECUENCIA[Math.min(E.paso, SECUENCIA.length - 1)];
}

function ir(scene, paso) {
  E.paso = paso;
  E.maxPaso = Math.max(E.maxPaso, paso);
  guardar();
  const s = SECUENCIA[paso];
  scene.cameras.main.fadeOut(400, 0, 0, 0);
  scene.time.delayedCall(420, () => scene.scene.start(s.k, { ...s, paso }));
}

/** Sigue al próximo paso. Si se ganó un juego, se recuperan las vidas. */
export function avanzar(scene, { gano = false, eliminados = 0, practica = false } = {}) {
  if (eliminados) sumarPozo(eliminados);
  if (gano) E.vidas = 3;
  if (practica) { guardar(); scene.cameras.main.fadeOut(400); scene.time.delayedCall(420, () => scene.scene.start('Titulo')); return; }
  ir(scene, E.paso + 1);
}

/** Se perdió una vida. Devuelve true si quedan y se repite el juego. */
export function perderVida(scene, practica = false) {
  if (practica) { scene.time.delayedCall(200, () => scene.scene.restart()); return true; }
  E.vidas -= 1;
  guardar();
  if (E.vidas > 0) {
    scene.cameras.main.fadeOut(500, 0, 0, 0);
    scene.time.delayedCall(520, () => scene.scene.restart());
    return true;
  }
  scene.cameras.main.fadeOut(600, 0, 0, 0);
  scene.time.delayedCall(620, () => scene.scene.start('GameOver'));
  return false;
}

/** Después del game over: vuelve al juego 1 con 3 vidas. El pozo vuelve a cero. */
export function reiniciarDesdeJuego1(scene) {
  E.vidas = 3;
  E.pozo = 0;
  ir(scene, PRIMER_JUEGO);
}

export function irAPaso(scene, paso) {
  ir(scene, paso);
}

export function nuevaPartida(scene) {
  E.vidas = 3;
  E.pozo = 0;
  ir(scene, 0);
}

/** el número de juego (1 a 11) de una escena */
export function numeroJuego(k) {
  return JUEGOS.findIndex((j) => j.k === k) + 1;
}
