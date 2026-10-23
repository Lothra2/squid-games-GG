// Estado de la partida: quién juega, la dificultad, las vidas, en qué juego va y el pozo.
// Se guarda en el navegador para poder continuar. Si el navegador no deja guardar, el juego sigue igual.

export const FAMILIA = ['rick', 'steph', 'sophie', 'alana'];
export const NINAS = ['sophie', 'alana'];

export const NOMBRES = {
  rick: 'Rick', steph: 'Steph', sophie: 'Sophie', alana: 'Alana',
  front_man: 'Front Man', reclutador: 'Reclutador', guardia_circulo: 'Guardia', guardia_triangulo: 'Guardia',
  guardia_cuadrado: 'Guardia Jefe', j_abuelo: 'Jugador 001',
};

export const NUMEROS = { rick: '456', steph: '067', sophie: '018', alana: '222' };

export const DIFICULTADES = ['Fácil', 'Normal', 'Difícil'];

const CLAVE = 'calamar_gg_v1';

export const E = {
  perfil: 'rick',
  dificultad: 1,
  vidas: 3,
  paso: 0,
  pozo: 0,
  /** lo que el chanchito ya mostró subir (en eliminados), para la animación de la noche */
  pozoVisto: 0,
  maxPaso: 0,
  /** null: decide el perfil. true o false: lo eligieron a mano en el menú */
  sangreManual: null,
  volumen: 0.8,
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
    if (s && typeof s === 'object') Object.assign(E, s);
  } catch { /* sin guardado */ }
  return E;
}

export function hayPartida() {
  try { return !!localStorage.getItem(CLAVE) && E.paso > 0; } catch { return false; }
}

/** el pozo en wones, con puntos */
export function wones(n = E.pozo) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' W';
}

/** cada eliminado suma 100 millones al chanchito */
export function sumarPozo(eliminados) {
  E.pozo = Math.min(45_600_000_000, E.pozo + eliminados * 100_000_000);
}
