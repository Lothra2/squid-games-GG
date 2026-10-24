// Piezas de interfaz: texto legible (fuente pixel web, nítida en el teléfono), íconos de botones, paneles,
// la viñeta y las motas de polvo del ambiente.

import Phaser from 'phaser';

export const FUENTE = '"Pixelify Sans", "Trebuchet MS", sans-serif';

export const COLOR = {
  texto: '#f4f0e8', apagado: '#9a96a8', rosa: '#ff4d8d', verde: '#2fd4b4', oro: '#f7c948', rojo: '#ff4d6d', azul: '#6aa8ff',
};

/** resolución del texto: la del aumento real en pantalla, para que se vea nítido */
export function resolucion(scene) {
  const z = scene.scale.displaySize.width / scene.scale.width || 1;
  return Math.min(4, Math.max(1, Math.ceil(z * (window.devicePixelRatio || 1))));
}

/** Texto con la fuente del juego. tam en pixeles del juego (640 x 360). */
export function texto(scene, x, y, str, { tam = 14, color = COLOR.texto, negrita = false, borde = 3, ancho = 0, alinear = 'left', origen = null } = {}) {
  const t = scene.add.text(x, y, str, {
    fontFamily: FUENTE,
    fontSize: tam + 'px',
    fontStyle: negrita ? 'bold' : 'normal',
    color,
    stroke: '#120e18',
    strokeThickness: borde,
    align: alinear,
    lineSpacing: 1,
    wordWrap: ancho ? { width: ancho, useAdvancedWrap: true } : undefined,
  });
  t.setResolution(resolucion(scene));
  if (origen) t.setOrigin(origen[0], origen[1]);
  return t;
}

/** Un ícono de botón (a, b, palanca) chiquito para las ayudas */
export function icono(scene, x, y, cual, tam = 22) {
  const tex = { a: 'control_a', b: 'control_b', palanca: 'control_palanca', pausa: 'control_pausa' }[cual];
  const im = scene.add.image(x, y, tex, 0);
  im.setScale(tam / im.width);
  return im;
}

/**
 * Una fila de ayudas de control: [['palanca', 'Moverse'], ['a', 'Saltar']]. Centrada en x.
 * Devuelve los objetos (para destruirlos o fijarlos a la pantalla).
 */
export function ayudas(scene, cx, y, items, { tam = 13, prof = 9000 } = {}) {
  const objs = [];
  const piezas = items.map(([ic, txt]) => {
    const t = texto(scene, 0, 0, txt, { tam, origen: [0, 0.5] });
    return { ic, t, w: 26 + t.width + 18 };
  });
  let x = cx - piezas.reduce((a, p) => a + p.w, 0) / 2;
  for (const p of piezas) {
    const i = icono(scene, x + 11, y, p.ic, 22);
    p.t.setPosition(x + 26, y);
    objs.push(i, p.t);
    x += p.w;
  }
  objs.forEach((o) => o.setScrollFactor(0).setDepth(prof));
  return objs;
}

/** panel oscuro con borde (el 9-slice de diálogo del kit) */
export function panel(scene, x, y, w, h, prof = 9000) {
  return scene.add.nineslice(x, y, 'dialogo', undefined, w, h, 8, 8, 8, 8).setOrigin(0).setScrollFactor(0).setDepth(prof);
}

/** la viñeta (bordes oscuros) y motas de polvo que flotan: da profundidad y ambiente */
export function atmosfera(scene, { vineta = 0.55, motas = 18, color = 0xfff4d6, tinte = null } = {}) {
  const W = scene.scale.width, H = scene.scale.height;
  if (!scene.textures.exists('vineta')) {
    const t = scene.textures.createCanvas('vineta', W, H);
    const c = t.getContext();
    const g = c.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,1)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    t.refresh();
  }
  const objs = [scene.add.image(0, 0, 'vineta').setOrigin(0).setScrollFactor(0).setDepth(8600).setAlpha(vineta)];
  if (tinte !== null) objs.push(scene.add.rectangle(0, 0, W, H, tinte, 0.08).setOrigin(0).setScrollFactor(0).setDepth(8599).setBlendMode(Phaser.BlendModes.MULTIPLY));
  for (let i = 0; i < motas; i++) {
    const m = scene.add.rectangle(Math.random() * W, Math.random() * H, 1, 1, color, 0.25 + Math.random() * 0.35).setScrollFactor(0).setDepth(8590);
    scene.tweens.add({ targets: m, x: m.x + 20 + Math.random() * 40, y: m.y - 10 - Math.random() * 30, alpha: 0, duration: 4000 + Math.random() * 4000, repeat: -1, delay: Math.random() * 3000,
      onRepeat: () => { m.setPosition(Math.random() * W, Math.random() * H); m.setAlpha(0.3); } });
    objs.push(m);
  }
  return objs;
}

/** una estrella de 5 puntas (para los resultados) */
export function estrella(scene, x, y, r, llena) {
  const g = scene.add.graphics().setPosition(x, y);
  const pts = [];
  for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5; const rr = k % 2 ? r * 0.45 : r; pts.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr }); }
  x = 0; y = 0;
  g.fillStyle(0x120e18); g.fillPoints(pts.map((p) => ({ x: p.x + 1, y: p.y + 2 })), true);
  g.fillStyle(llena ? 0xf7c948 : 0x3a3646); g.fillPoints(pts, true);
  if (llena) { g.fillStyle(0xfff0a8); g.fillCircle(x - r * 0.25, y - r * 0.3, r * 0.18); }
  g.lineStyle(1, llena ? 0x8a5a10 : 0x5a5666); g.strokePoints(pts, true);
  return g;
}

/**
 * Llama f en cada cuadro de la escena. Se suelta sola si la escena se cierra o se reinicia (si no, un diálogo
 * abierto al reiniciar seguiría escribiendo en textos que ya no existen).
 */
export function cadaCuadro(scene, f) {
  scene.events.on('update', f);
  const off = () => scene.events.off('update', f);
  scene.events.once('shutdown', off);
  return off;
}
