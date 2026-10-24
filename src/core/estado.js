// Estado de la partida: quién juega, la dificultad, las vidas, en qué juego va, el pozo, la billetera de la
// familia, lo comprado en la máquina de la noche y los récords. Se guarda en el navegador para poder continuar.
// Si el navegador no deja guardar, el juego sigue igual.

export const FAMILIA = ['rick', 'steph', 'sophie', 'alana'];
export const NINAS = ['sophie', 'alana'];

export const NOMBRES = {
  rick: 'Rick', steph: 'Steph', sophie: 'Sophie', alana: 'Alana',
  front_man: 'Front Man', reclutador: 'Reclutador', guardia_circulo: 'Guardia', guardia_triangulo: 'Guardia',
  guardia_cuadrado: 'Guardia Jefe', j_abuelo: 'Jugador 001',
};

export const NUMEROS = { rick: '456', steph: '067', sophie: '018', alana: '222' };

export const DIFICULTADES = ['Fácil', 'Normal', 'Difícil'];

const CLAVE = 'calamar_gg_v2';

export const E = {
  perfil: 'rick',
  dificultad: 1,
  vidas: 3,
  paso: 0,
  pozo: 0,
  /** lo que el chanchito ya mostró subir (en eliminados), para la animación de la noche */
  pozoVisto: 0,
  /** la plata de la familia: premios por cómo se jugó cada juego. Se gasta en la máquina de la noche */
  billetera: 0,
  /** lo comprado para el próximo juego */
  compras: { vida: 0, reloj: 0, pista: 0 },
  /** las mejores estrellas (0 a 3) de cada juego */
  records: {},
  maxPaso: 0,
  /** null: decide el perfil. true o false: lo eligieron a mano en el menú */
  sangreManual: null,
  volumen: 0.8,
  /** la voz del altavoz (síntesis de voz del navegador) */
  voz: true,
};

export function sangre() {
  if (E.sangreManual !== null) return E.sangreManual;
  return !NINAS.includes(E.perfil);
}

/** el valor según la dificultad: dif(fácil, normal, difícil) */
export function dif(facil, normal, dificil) {
  return [facil, normal, dificil][E.dificultad];
}

export function familiaNPC() {
  return FAMILIA.filter((f) => f !== E.perfil);
}

export function nombre(id) {
  if (NOMBRES[id]) return NOMBRES[id];
  return id;
}

export function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(E)); } catch { /* sin guardado */ }
}

export function cargar() {
  try {
    const s = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (s && typeof s === 'object') Object.assign(E, s, { compras: { vida: 0, reloj: 0, pista: 0, ...(s.compras || {}) }, records: s.records || {} });
  } catch { /* sin guardado */ }
  return E;
}

export function hayPartida() {
  try { return !!localStorage.getItem(CLAVE) && E.paso > 0; } catch { return false; }
}

/** wones con puntos: 4.500.000.000 W */
export function wones(n = E.pozo) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' W';
}

/** en corto: 4.500 M */
export function millones(n) {
  const m = Math.round(n / 1_000_000);
  return m.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' M';
}

/** cada eliminado suma 100 millones al chanchito */
export function sumarPozo(eliminados) {
  E.pozo = Math.min(45_600_000_000, E.pozo + eliminados * 100_000_000);
}

/** el premio de la familia por un juego según las estrellas (0 a 3) y la dificultad */
export function premio(estrellas) {
  return Math.round((60 + estrellas * 60) * dif(0.8, 1, 1.4)) * 1_000_000;
}

/** lo que vende la máquina del dormitorio */
export const TIENDA = [
  { id: 'vida', nombre: 'Vida extra', detalle: 'Empiezas el próximo juego con 4 vidas', precio: 200_000_000 },
  { id: 'reloj', nombre: 'Reloj de arena', detalle: '15 segundos más en el próximo juego', precio: 120_000_000 },
  { id: 'pista', nombre: 'Pista del vidriero', detalle: 'Una pista más en el puente, la galleta o el escondite', precio: 90_000_000 },
];
