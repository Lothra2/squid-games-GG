// Lo que hace que un escenario se sienta vivo: pájaros que cruzan, luciérnagas, rayos de luz que respiran,
// ondas de lluvia en el piso, chispas, vapor y focos que titilan. Todo liviano y con su propio ritmo.

import Phaser from 'phaser';
import { texturasLuz } from '../escenas/pintura.js';
import { cadaCuadro } from './ui.js';

/** una bandada que cruza el cielo aleteando. par: el paralaje (0 = pegada a la pantalla) */
export function pajaros(scene, { n = 4, y0 = 40, y1 = 110, color = 0x1a1a24, prof = -90, par = 0.3, vel = 26, cada = 9000 } = {}) {
  const g = scene.add.graphics().setDepth(prof).setScrollFactor(par, 0);
  const W = scene.scale.width;
  let bandada = [];
  const nueva = () => {
    const y = y0 + Math.random() * (y1 - y0), dir = Math.random() < 0.5 ? 1 : -1;
    bandada = Array.from({ length: n }, (_, i) => ({ x: dir > 0 ? -20 - i * 14 - Math.random() * 10 : W + 20 + i * 14, y: y + (i % 2) * 6 + Math.random() * 6, f: Math.random() * 6, dir }));
  };
  nueva();
  scene.time.addEvent({ delay: cada, loop: true, callback: nueva });
  cadaCuadro(scene, (_, dt) => {
    g.clear();
    g.lineStyle(1, color, 0.85);
    for (const p of bandada) {
      p.x += p.dir * vel * (dt / 1000);
      const ala = Math.sin(scene.time.now / 120 + p.f) * 2.5;
      g.lineBetween(p.x - 4, p.y + ala, p.x, p.y); g.lineBetween(p.x, p.y, p.x + 4, p.y + ala);
    }
  });
  return g;
}

/** puntitos de luz que flotan y titilan (luciérnagas, polvo dorado, chispitas de colores) */
export function luciernagas(scene, { n = 14, area = [0, 0, 640, 360], color = 0xfff2a0, prof = 4000, tam = 2, par = 1 } = {}) {
  const [ax, ay, aw, ah] = area;
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = scene.add.rectangle(ax + Math.random() * aw, ay + Math.random() * ah, tam, tam, color).setDepth(prof).setBlendMode(Phaser.BlendModes.ADD).setScrollFactor(par);
    p.setAlpha(0);
    const vuelta = () => {
      if (!p.active) return;
      scene.tweens.add({ targets: p, x: Phaser.Math.Clamp(p.x + (Math.random() - 0.5) * 60, ax, ax + aw), y: Phaser.Math.Clamp(p.y + (Math.random() - 0.5) * 40, ay, ay + ah), duration: 2500 + Math.random() * 2500, ease: 'Sine.easeInOut', onComplete: vuelta });
    };
    vuelta();
    scene.tweens.add({ targets: p, alpha: 0.9, duration: 700 + Math.random() * 900, yoyo: true, repeat: -1, delay: Math.random() * 2000, hold: 300 });
    out.push(p);
  }
  return out;
}

/** rayos de luz inclinados que respiran (sol por una ventana, foco del techo) */
export function rayos(scene, { x = 0, y = 0, angulo = 0.6, n = 4, largo = 320, ancho = 26, color = 0xfff0c8, alfa = 0.07, prof = 3000, par = 1 } = {}) {
  const g = scene.add.graphics().setDepth(prof).setBlendMode(Phaser.BlendModes.ADD).setScrollFactor(par);
  const haces = Array.from({ length: n }, (_, i) => ({ dx: i * ancho * 1.4, w: ancho * (0.6 + Math.random() * 0.8), f: Math.random() * 6 }));
  cadaCuadro(scene, () => {
    g.clear();
    const t = scene.time.now / 1000;
    for (const h of haces) {
      const a = alfa * (0.6 + 0.4 * Math.sin(t * 0.7 + h.f));
      const x0 = x + h.dx, cx = Math.cos(Math.PI / 2 - angulo) * largo, cy = Math.sin(Math.PI / 2 - angulo) * largo;
      g.fillStyle(color, a);
      g.fillPoints([{ x: x0, y }, { x: x0 + h.w, y }, { x: x0 + h.w * 2.2 + cx, y: y + cy }, { x: x0 + cx, y: y + cy }], true);
    }
  });
  return g;
}

/** ondas de lluvia que se abren en el piso */
export function ondas(scene, { area = [40, 80, 560, 260], cada = 90, prof = -40, color = 0xbfd8ff } = {}) {
  const [ax, ay, aw, ah] = area;
  scene.time.addEvent({
    delay: cada, loop: true, callback: () => {
      const o = scene.add.ellipse(ax + Math.random() * aw, ay + Math.random() * ah, 2, 1).setStrokeStyle(1, color, 0.6).setDepth(prof);
      scene.tweens.add({ targets: o, scaleX: 7, scaleY: 7, alpha: 0, duration: 650, ease: 'Quad.easeOut', onComplete: () => o.destroy() });
    },
  });
}

/** chispas que saltan de un punto cada tanto (máquinas, cables) */
export function chispas(scene, { x, y, cada = 2600, prof = 4000, par = 1 } = {}) {
  scene.time.addEvent({
    delay: cada, loop: true, callback: () => {
      if (Math.random() < 0.4) return;
      for (let i = 0; i < 8; i++) {
        const c = scene.add.rectangle(x, y, 1, 1, Math.random() < 0.5 ? 0xfff2a0 : 0xffb040).setDepth(prof).setBlendMode(Phaser.BlendModes.ADD).setScrollFactor(par);
        const a = Math.random() * Math.PI, v = 20 + Math.random() * 40;
        scene.tweens.add({ targets: c, x: x + Math.cos(a) * v, y: y + Math.sin(a) * v * 0.6 + 20, alpha: 0, duration: 400 + Math.random() * 300, ease: 'Quad.easeOut', onComplete: () => c.destroy() });
      }
    },
  });
}

/** bocanadas de vapor o neblina que suben despacio */
export function vapor(scene, { x, y, color = 0xd8e0f0, cada = 700, prof = 3000, par = 1, alfa = 0.18 } = {}) {
  texturasLuz(scene);
  scene.time.addEvent({
    delay: cada, loop: true, callback: () => {
      const b = scene.add.image(x + (Math.random() - 0.5) * 10, y, 'brillo').setTint(color).setAlpha(alfa).setScale(0.3).setDepth(prof).setScrollFactor(par);
      scene.tweens.add({ targets: b, y: y - 40 - Math.random() * 30, x: b.x + (Math.random() - 0.5) * 20, scale: 1 + Math.random() * 0.6, alpha: 0, duration: 2600, onComplete: () => b.destroy() });
    },
  });
}

/** un foco o lámpara que titila con su luz */
export function lampara(scene, { x, y, escala = 2, color = 0xfff0c8, alfa = 0.35, prof = 3000, par = 1, falla = 0.02 } = {}) {
  texturasLuz(scene);
  const l = scene.add.image(x, y, 'brillo').setScale(escala).setTint(color).setAlpha(alfa).setBlendMode(Phaser.BlendModes.ADD).setDepth(prof).setScrollFactor(par);
  scene.time.addEvent({ delay: 90, loop: true, callback: () => l.setAlpha(alfa * (0.88 + Math.random() * 0.12) * (Math.random() < falla ? 0.2 : 1)) });
  return l;
}
