// Efectos: eliminaciones (con sangre para los grandes, con confeti y sueño para las niñas), partículas,
// sacudón, destellos, lluvia y relámpagos. Las texturas chiquitas se dibujan en texturas().

import { sangre } from './estado.js';
import { sfx, tono, bloque } from './sonido.js';

/** Texturas hechas con código. Una vez, en la carga. */
export function texturas(scene) {
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  const hacer = (key, w, h, fn) => { if (scene.textures.exists(key)) return; g.clear(); fn(g); g.generateTexture(key, w, h); };
  hacer('pix', 1, 1, (g) => { g.fillStyle(0xffffff); g.fillRect(0, 0, 1, 1); });
  hacer('sombra', 20, 6, (g) => { g.fillStyle(0x000000, 1); g.fillEllipse(10, 3, 20, 6); });
  hacer('charco', 28, 10, (g) => { g.fillStyle(0x7a0c12); g.fillEllipse(14, 5, 28, 10); g.fillStyle(0xa3161d); g.fillEllipse(12, 4, 18, 6); g.fillStyle(0xd23a3a); g.fillRect(8, 3, 3, 1); });
  // la caja de regalo con lazo rosado, donde se llevan a los dormidos en el modo de las niñas
  hacer('regalo', 18, 20, (g) => {
    g.fillStyle(0x1e1418); g.fillRect(0, 5, 18, 15);
    g.fillStyle(0x1b1a22); g.fillRect(1, 6, 16, 13);
    g.fillStyle(0x2b2a36); g.fillRect(1, 6, 16, 3);
    g.fillStyle(0xe0457b); g.fillRect(8, 6, 2, 13); g.fillRect(1, 11, 16, 2);
    g.fillStyle(0xff8fb5); g.fillRect(3, 1, 4, 4); g.fillRect(11, 1, 4, 4);
    g.fillStyle(0xe0457b); g.fillRect(4, 2, 2, 3); g.fillRect(12, 2, 2, 3); g.fillRect(7, 3, 4, 3);
  });
  hacer('gota_lluvia', 1, 6, (g) => { g.fillStyle(0xaac8ff, 0.7); g.fillRect(0, 0, 1, 6); });
  // los símbolos del juego: círculo, triángulo y cuadrado (blancos, se tiñen)
  hacer('circulo', 16, 16, (g) => { g.lineStyle(2, 0xffffff); g.strokeCircle(8, 8, 6.5); });
  hacer('triangulo', 16, 16, (g) => { g.lineStyle(2, 0xffffff); g.strokeTriangle(8, 2, 14.5, 14, 1.5, 14); });
  hacer('cuadrado', 16, 16, (g) => { g.lineStyle(2, 0xffffff); g.strokeRect(2, 2, 12, 12); });
  hacer('flecha', 7, 5, (g) => { g.fillStyle(0x1e1418); g.fillTriangle(0, 0, 7, 0, 3.5, 5); g.fillStyle(0x7fffe0); g.fillTriangle(1.5, 1, 5.5, 1, 3.5, 3.6); });
  hacer('circulo_lleno', 10, 10, (g) => { g.fillStyle(0xffffff); g.fillCircle(5, 5, 5); });
  hacer('vida_on', 11, 11, (g) => { g.fillStyle(0x0d4d44); g.fillCircle(5.5, 5.5, 5.5); g.fillStyle(0x23b39c); g.fillCircle(5.5, 5.5, 4); g.fillStyle(0xa6f0e2); g.fillRect(3, 3, 2, 2); });
  hacer('vida_off', 11, 11, (g) => { g.lineStyle(1, 0x5a5a66); g.strokeCircle(5.5, 5.5, 4.5); });
  hacer('chanchito', 16, 13, (g) => {
    g.fillStyle(0x7a5a10); g.fillEllipse(8, 7, 16, 12); g.fillStyle(0xf2c230); g.fillEllipse(8, 7, 14, 10);
    g.fillStyle(0xffe58a); g.fillRect(4, 3, 4, 2); g.fillStyle(0x7a5a10); g.fillRect(6, 1, 4, 2); g.fillRect(2, 11, 3, 2); g.fillRect(11, 11, 3, 2);
  });
  g.destroy();
}

function particula(scene, x, y, color, { vx = 0, vy = 0, g = 260, vida = 900, tam = 2, prof = 5000 } = {}) {
  const p = scene.add.image(x, y, 'pix').setTint(color).setScale(tam).setDepth(prof);
  const t0 = scene.time.now;
  let px = x, py = y, pvx = vx, pvy = vy;
  const ev = scene.time.addEvent({
    delay: 16, loop: true, callback: () => {
      const dt = 0.016;
      pvy += g * dt; px += pvx * dt; py += pvy * dt;
      p.setPosition(px, py);
      const k = (scene.time.now - t0) / vida;
      p.setAlpha(1 - k * k);
      if (k >= 1) { ev.remove(); p.destroy(); }
    },
  });
  return p;
}

export function chorro(scene, x, y, n, colores, fuerza = 120, opts = {}) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = fuerza * (0.4 + Math.random());
    particula(scene, x, y, colores[i % colores.length], { vx: Math.cos(a) * v, vy: Math.sin(a) * v - fuerza * 0.6, ...opts, tam: opts.tam || (Math.random() < 0.3 ? 2 : 1) });
  }
}

const CONFETI = [0xe0457b, 0x23b39c, 0xf2c230, 0x5aa0ff, 0xffffff, 0xff8fb5];
const SANGRE = [0x8a0f17, 0xb3151f, 0xd02a2a, 0x6a0a10];

/** zzz que suben de un dormido */
export function zzz(scene, actor, veces = 4) {
  for (let i = 0; i < veces; i++) {
    scene.time.delayedCall(i * 450, () => {
      if (!actor.sprite.active) return;
      const z = scene.add.bitmapText(actor.x + 6, actor.y - 18, 'fuente_ui', i % 2 ? 'z' : 'Z').setTint(0xbfe3ff).setDepth(6000);
      scene.tweens.add({ targets: z, x: z.x + 10, y: z.y - 22, alpha: 0, duration: 1300, onComplete: () => z.destroy() });
    });
  }
}

/**
 * Elimina a un actor. Con sangre: disparo, chorro rojo, cae y queda el charco.
 * Sin sangre: confeti, se duerme con zzz y queda una caja de regalo con lazo rosado.
 * modo: 'disparo' (de pie), 'caida' (al vacío, con dy hacia dónde cae), 'empujon'
 */
export function eliminar(scene, actor, { modo = 'disparo', sonido = true, dy = 160, dejar = true } = {}) {
  if (!actor.vivo) return Promise.resolve();
  actor.vivo = false;
  const conSangre = sangre();
  const x = actor.x, y = actor.y;
  return new Promise((ok) => {
    if (modo === 'caida') {
      if (sonido) conSangre ? sfx(scene, 'publico_grito', 0.25) : bloque(scene, ['C6', 0.06], ['A5', 0.06], ['F5', 0.06], ['D5', 0.1]);
      actor.anim(actor.animal ? 'hurt' : 'fall_off');
      actor.sombra.setVisible(false);
      scene.tweens.add({
        targets: actor, py: actor.py + dy, duration: 700, ease: 'Quad.easeIn',
        onUpdate: () => actor.sprite.setScale(actor.escala * Math.max(0.3, 1 - (actor.py - y) / (dy * 1.4))),
        onComplete: () => {
          if (conSangre) { sfx(scene, 'golpe_pesado', 0.6); }
          else { tono(220, 0.15, 'campana', 0.15); chorro(scene, actor.x, actor.y - 6, 18, CONFETI, 90); }
          actor.setVisible(false);
          ok();
        },
      });
      return;
    }
    if (conSangre) {
      if (sonido) sfx(scene, 'pistola', 0.55);
      chorro(scene, x, y - 24, 26, SANGRE, 110, { g: 320 });
      scene.time.delayedCall(60, () => chorro(scene, x + (actor.izq ? 4 : -4), y - 20, 12, SANGRE, 70, { g: 300 }));
      actor.anim(actor.animal ? 'die' : 'die', null, true);
      scene.time.delayedCall(actor.duracion('die') * 700, () => {
        if (!dejar) return;
        const c = scene.add.image(x + (actor.izq ? 8 : -8), y + 1, 'charco').setDepth(y - 1).setScale(0.3).setAlpha(0.95);
        scene.tweens.add({ targets: c, scale: 1, duration: 1500 });
        actor.charco = c;
      });
      scene.time.delayedCall(actor.duracion('die') * 1000, ok);
    } else {
      if (sonido) { bloque(scene, ['G5', 0.05, 'cuadrada', 0.12], ['C6', 0.05, 'cuadrada', 0.12], ['E6', 0.1, 'cuadrada', 0.12]); sfx(scene, 'chapa', 0.4); }
      chorro(scene, x, y - 26, 30, CONFETI, 100, { g: 160, vida: 1300 });
      actor.anim('knockout', null, true);
      scene.time.delayedCall(400, () => zzz(scene, actor, 3));
      scene.time.delayedCall(1500, () => {
        if (!dejar || !actor.sprite.active) { ok(); return; }
        const r = scene.add.image(x, y, 'regalo').setOrigin(0.5, 1).setDepth(y).setScale(0, 0);
        scene.tweens.add({ targets: r, scaleX: 1, scaleY: 1, duration: 300, ease: 'Back.easeOut' });
        scene.tweens.add({ targets: actor.sprite, alpha: 0, duration: 250 });
        actor.sombra.setVisible(false);
        actor.regalo = r;
        tono(1320, 0.12, 'campana', 0.1);
        ok();
      });
    }
  });
}

export function sacudir(scene, ms = 200, f = 0.008) { scene.cameras.main.shake(ms, f); }

export function destello(scene, color = 0xffffff, ms = 120, alfa = 0.8) {
  const r = scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, color, alfa).setOrigin(0).setScrollFactor(0).setDepth(9000);
  scene.tweens.add({ targets: r, alpha: 0, duration: ms, onComplete: () => r.destroy() });
}

/** lluvia en pantalla. Devuelve una función para pararla */
export function lluvia(scene, n = 90, prof = 8000) {
  const gotas = [];
  const W = scene.scale.width, H = scene.scale.height;
  for (let i = 0; i < n; i++) gotas.push(scene.add.image(Math.random() * W, Math.random() * H, 'gota_lluvia').setScrollFactor(0).setDepth(prof).setAngle(15));
  const ev = scene.time.addEvent({
    delay: 16, loop: true, callback: () => {
      for (const g of gotas) { g.y += 7; g.x -= 1.8; if (g.y > H) { g.y = -6; g.x = Math.random() * (W + 40); } }
    },
  });
  return () => { ev.remove(); gotas.forEach((g) => g.destroy()); };
}

export function relampago(scene) {
  destello(scene, 0xe8e4ff, 180, 0.85);
  scene.time.delayedCall(90, () => destello(scene, 0xffffff, 120, 0.5));
  scene.time.delayedCall(250 + Math.random() * 400, () => sfx(scene, 'trueno', 0.7));
}

/** una exclamación o efecto del kit encima de un actor */
export function fxSobre(scene, actor, id, dy = -46) {
  if (!scene.textures.exists('fx_' + id)) return;
  const s = scene.add.sprite(actor.x, actor.y + dy, 'fx_' + id).setDepth(7000);
  s.play('fx_' + id);
  s.once('animationcomplete', () => s.destroy());
  scene.time.delayedCall(1500, () => s.active && s.destroy());
}
