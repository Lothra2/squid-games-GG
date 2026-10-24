// Carga los kits de PixelForja (public/assets/kit: la familia, guardias, Front Man, abuelo y reclutador, con audio,
// efectos e interfaz; public/assets/kit_gente: los otros jugadores) y los fondos, y arma las animaciones de Phaser.
// Animación: `${id}|${anim}|${fila}` con fila right, down o up. La izquierda es right con flipX.

import Phaser from 'phaser';

export const KIT = 'assets/kit/';
export const KIT_GENTE = 'assets/kit_gente/';
export const FONDOS = 'assets/fondos/';

export const FONDOS_IDS = ['dormitorio', 'frontman', 'escaleras', 'titulo', 'galleta',
  'tira', 'canicas', 'puente', 'calamar', 'mingle', 'pentatlon', 'cuerda', 'cielo', 'votacion',
  'pared_cielo', 'muneca_frente', 'muneca_espalda'];

/** El manifiesto de los dos kits juntos, una vez cargado. Cada atleta sabe de qué kit viene (base). */
export let M = null;

export function precargarManifiesto(scene) {
  scene.load.json('manifest', KIT + 'manifest.json');
  scene.load.json('manifest_gente', KIT_GENTE + 'manifest.json');
}

function juntar(principal, gente) {
  for (const a of Object.values(principal.atletas)) a.base = KIT;
  for (const a of Object.values(gente.atletas)) a.base = KIT_GENTE;
  return { ...principal, atletas: { ...principal.atletas, ...gente.atletas } };
}

/** Encola todo. Se llama en el preload de la escena de carga, con los manifiestos ya en caché. */
export function encolarKit(scene) {
  M = juntar(scene.cache.json.get('manifest'), scene.cache.json.get('manifest_gente'));
  const L = scene.load;
  for (const [id, a] of Object.entries(M.atletas)) {
    for (const [pack, p] of Object.entries(a.packs)) L.atlas(`${id}_${pack}`, a.base + p.imagen, a.base + p.atlas);
    if (a.retratos) L.image(`ret_${id}`, a.base + a.retratos.archivo);
    if (a.voz) a.voz.archivos.forEach((f, i) => L.audio(`voz_${id}_${i}`, a.base + f));
  }
  for (const [id, a] of Object.entries(M.animales)) L.atlas(`${id}_animal`, KIT + a.imagen, KIT + a.atlas);
  for (const [id, f] of Object.entries(M.fx)) L.spritesheet(`fx_${id}`, KIT + f.archivo, { frameWidth: f.w, frameHeight: f.h });
  for (const [sec, lista] of Object.entries(M.audio)) {
    if (sec === 'voces' || typeof lista !== 'object') continue;
    for (const [n, s] of Object.entries(lista)) if (s && s.archivo) L.audio(`${sec}_${n}`, s.archivo.map((f) => KIT + f));
  }
  const ui = M.ui.interfaz;
  for (const [id, p] of Object.entries(ui)) {
    if (p.cuadros) L.spritesheet(id, KIT + p.archivo, { frameWidth: p.w, frameHeight: p.h });
    else if (id === 'numeros') L.spritesheet(id, KIT + p.archivo, { frameWidth: 14, frameHeight: 18 });
    else L.image(id, KIT + p.archivo);
  }
  for (const [id, f] of Object.entries(M.ui.fuentes)) if (f.png) L.bitmapFont(id, KIT + f.png, KIT + f.fnt);
  for (const id of FONDOS_IDS) L.image(id, FONDOS + id + '.png');
}

/**
 * Los retratos grandes (96 x 96) en pixel puro, como el sprite de PixelForja. El retrato grande que trae el kit está
 * agrandado con Scale3x y un contorno fino: se ve "suavecito", con pixeles de tamaños distintos. Aquí se arma de
 * nuevo desde el retrato chico (40 x 40, el personaje a celda 64 pixel a pixel): cabeza y hombros, 32 x 32, cada
 * pixel convertido en un bloque de 3 x 3 exacto. Los chicos (c_) quedan igual.
 */
const LADO_PURO = 32, ESCALA_PURA = 3;
function retratosPuros(scene, id, expresiones) {
  const key = `ret_${id}`;
  const fuente = scene.textures.get(key).getSourceImage();
  const W = fuente.width, H = fuente.height;
  const lienzo = document.createElement('canvas');
  lienzo.width = W; lienzo.height = Math.max(H, 40 + LADO_PURO * ESCALA_PURA);
  const ctx = lienzo.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(fuente, 0, 0);
  // la primera fila con pixeles en el retrato neutral: desde ahí (el borde del pelo) se recorta, igual para todas
  const datos = ctx.getImageData(0, 0, 40, 40).data;
  let arriba = 0;
  while (arriba < 39 && ![...Array(40).keys()].some((x) => datos[(arriba * 40 + x) * 4 + 3] > 0)) arriba++;
  const y0 = Math.min(arriba, 40 - LADO_PURO), x0 = (40 - LADO_PURO) / 2, lado = LADO_PURO * ESCALA_PURA;
  ctx.clearRect(0, 40, W, lienzo.height - 40);
  expresiones.forEach((_, i) => ctx.drawImage(fuente, i * 40 + x0, y0, LADO_PURO, LADO_PURO, i * lado, 40, lado, lado));
  scene.textures.remove(key);
  const t = scene.textures.addCanvas(key, lienzo);
  t.setFilter(Phaser.Textures.FilterMode.NEAREST);
  expresiones.forEach((ex, i) => {
    t.add(`c_${ex}`, 0, i * 40, 0, 40, 40);
    t.add(`g_${ex}`, 0, i * lado, 40, lado, lado);
  });
}

/** Arma las animaciones y los cuadros de los retratos. Una vez por juego. */
export function armarAnimaciones(scene) {
  const A = scene.anims;
  for (const [id, a] of Object.entries(M.atletas)) {
    for (const [pack, p] of Object.entries(a.packs)) {
      // el pack de ropa de calle va con su propio nombre: calle_idle, calle_walk...
      const pref = pack === 'calle' ? 'calle_' : '';
      for (const [anim, d] of Object.entries(p.anims)) {
        for (const fila of M.filas) {
          const key = `${id}|${pref}${anim}|${fila}`;
          if (A.exists(key)) continue;
          const frames = [];
          for (let i = 0; i < d.cuadros; i++) frames.push({ key: `${id}_${pack}`, frame: `${anim}_${fila}_${i}` });
          A.create({ key, frames, frameRate: d.fps, repeat: d.loop ? -1 : 0 });
        }
      }
    }
    if (a.retratos) retratosPuros(scene, id, a.retratos.expresiones);
  }
  for (const [id, a] of Object.entries(M.animales)) {
    for (const [anim, d] of Object.entries(a.anims)) {
      for (const fila of M.filas) {
        const key = `${id}|${anim}|${fila}`;
        if (A.exists(key)) continue;
        const frames = [];
        for (let i = 0; i < d.cuadros; i++) frames.push({ key: `${id}_animal`, frame: `${anim}_${fila}_${i}` });
        A.create({ key, frames, frameRate: d.fps, repeat: d.loop ? -1 : 0 });
      }
    }
  }
  for (const [id, f] of Object.entries(M.fx)) {
    if (!A.exists('fx_' + id)) A.create({ key: 'fx_' + id, frames: A.generateFrameNumbers('fx_' + id), frameRate: f.fps, repeat: f.loop ? -1 : 0 });
  }
  if (!A.exists('dialogo_flecha')) A.create({ key: 'dialogo_flecha', frames: A.generateFrameNumbers('dialogo_flecha'), frameRate: 4, repeat: -1 });
  void Phaser;
}

/** datos de una animación (cuadros, fps, loop) */
export function datosAnim(id, anim) {
  const a = M.atletas[id] || M.animales[id];
  if (!a) return null;
  if (a.anims) return a.anims[anim] || null;
  if (anim.startsWith('calle_')) return a.packs.calle?.anims[anim.slice(6)] || null;
  for (const [n, p] of Object.entries(a.packs)) if (n !== 'calle' && p.anims[anim]) return p.anims[anim];
  return null;
}

export function tieneAnim(id, anim) {
  return !!datosAnim(id, anim);
}

/** Los ids de jugadores NPC (los de chándal que no son de la familia). */
export function jugadoresNPC() {
  return Object.keys(M.atletas).filter((id) => id.startsWith('j_') && id !== 'j_abuelo');
}
