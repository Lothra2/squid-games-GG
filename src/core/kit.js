import Phaser from 'phaser';
// Carga el kit de PixelForja (public/assets/kit) y los fondos, y arma las animaciones de Phaser.
// Animación: `${id}|${anim}|${fila}` con fila right, down o up. La izquierda es right con flipX.

export const KIT = 'assets/kit/';
export const FONDOS = 'assets/fondos/';

export const FONDOS_IDS = ['lancha', 'isla', 'metro', 'dormitorio', 'frontman', 'escaleras', 'titulo', 'gas', 'galleta',
  'tira', 'canicas', 'puente', 'calamar', 'mingle', 'pentatlon', 'cuerda', 'cielo', 'amanecer', 'casa', 'votacion',
  'laberinto', 'pared_cielo', 'muneca_frente', 'muneca_espalda'];

/** El manifiesto, una vez cargado. */
export let M = null;

export function precargarManifiesto(scene) {
  scene.load.json('manifest', KIT + 'manifest.json');
}

/** Encola todo el kit. Se llama en el preload de la escena de carga, con el manifiesto ya en caché. */
export function encolarKit(scene) {
  M = scene.cache.json.get('manifest');
  const L = scene.load;
  for (const [id, a] of Object.entries(M.atletas)) {
    for (const [pack, p] of Object.entries(a.packs)) L.atlas(`${id}_${pack}`, KIT + p.imagen, KIT + p.atlas);
    if (a.retratos) L.image(`ret_${id}`, KIT + a.retratos.archivo);
    if (a.voz) a.voz.archivos.forEach((f, i) => L.audio(`voz_${id}_${i}`, KIT + f));
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

/** Arma las animaciones y los cuadros de los retratos. Una vez por juego. */
export function armarAnimaciones(scene) {
  const A = scene.anims;
  for (const [id, a] of Object.entries(M.atletas)) {
    for (const [pack, p] of Object.entries(a.packs)) {
      for (const [anim, d] of Object.entries(p.anims)) {
        for (const fila of M.filas) {
          const key = `${id}|${anim}|${fila}`;
          if (A.exists(key)) continue;
          const frames = [];
          for (let i = 0; i < d.cuadros; i++) frames.push({ key: `${id}_${pack}`, frame: `${anim}_${fila}_${i}` });
          A.create({ key, frames, frameRate: d.fps, repeat: d.loop ? -1 : 0 });
        }
      }
    }
    if (a.retratos) {
      const t = scene.textures.get(`ret_${id}`);
      a.retratos.expresiones.forEach((ex, i) => {
        t.add(`c_${ex}`, 0, i * 40, 0, 40, 40);
        t.add(`g_${ex}`, 0, i * 96, 40, 96, 96);
      });
    }
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
}

/** datos de una animación (cuadros, fps, eventos, cajas...) */
export function datosAnim(id, anim) {
  const a = M.atletas[id] || M.animales[id];
  if (!a) return null;
  if (a.anims) return a.anims[anim] || null;
  for (const p of Object.values(a.packs)) if (p.anims[anim]) return p.anims[anim];
  return null;
}

export function tieneAnim(id, anim) {
  return !!datosAnim(id, anim);
}

/** Los ids de jugadores NPC (los de chándal que no son de la familia). */
export function jugadoresNPC() {
  return Object.keys(M.atletas).filter((id) => id.startsWith('j_') && id !== 'j_abuelo');
}
