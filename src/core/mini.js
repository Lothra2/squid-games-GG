// Minijuegos de precisión que usan varios juegos: la barra que va y viene, la caída al punto justo y machacar A.
// Todos grandes y con el ícono del botón, para que se lean bien en el teléfono.

import { tono } from './sonido.js';
import { texto, icono, panel, cadaCuadro } from './ui.js';

/** Barra que va y viene: A la detiene. Devuelve { v, ok } (ok: cayó en la zona verde). */
export function barra(scene, inp, { vel = 1.2, ideal = 0.8, ancho = 0.16, texto: txt = '¡AHORA!', y = 90, x = null } = {}) {
  return new Promise((res) => {
    const W = scene.scale.width, cx = x ?? W / 2, L = 220, bx = cx - L / 2, prof = 9000;
    const objs = [
      panel(scene, cx - L / 2 - 20, y - 44, L + 40, 72, prof - 1),
      scene.add.rectangle(cx, y, L + 4, 16, 0x1a1622).setStrokeStyle(2, 0x5a5666).setDepth(prof).setScrollFactor(0),
      scene.add.rectangle(bx + L * (ideal - ancho / 2), y, L * ancho, 12, 0x2fd4b4).setOrigin(0, 0.5).setDepth(prof + 1).setScrollFactor(0),
      icono(scene, cx - 70, y - 24, 'a', 24).setDepth(prof + 2).setScrollFactor(0),
      texto(scene, cx - 52, y - 24, txt, { tam: 14, negrita: true, origen: [0, 0.5] }).setDepth(prof + 2).setScrollFactor(0),
    ];
    const aguja = scene.add.rectangle(bx, y, 4, 22, 0xffffff).setDepth(prof + 2).setScrollFactor(0);
    objs.push(aguja);
    let v = 0, sube = 1;
    // lo que se está jugando, para las pruebas automáticas (herramientas/bots.js)
    scene.__mini = { tipo: 'barra', ideal, ancho, v: () => v };
    const f = (_, dt) => {
      v += (sube * vel * dt) / 1000;
      if (v > 1) { v = 1; sube = -1; } if (v < 0) { v = 0; sube = 1; }
      aguja.setX(bx + L * v);
      if (inp.tomarA()) {
        scene.events.off('update', f);
        const ok = Math.abs(v - ideal) <= ancho / 2;
        tono(ok ? 1046 : 330, 0.06, ok ? 'campana' : 'cuadrada', 0.1);
        aguja.setFillStyle(ok ? 0x2fd4b4 : 0xff4d6d);
        scene.time.delayedCall(280, () => objs.forEach((o) => o.destroy()));
        scene.__mini = null;
        res({ v, ok });
      }
    };
    cadaCuadro(scene, f);
  });
}

/**
 * Algo cae y hay que apretar A cuando pasa por la zona verde. veces: cuántos aciertos seguidos hacen falta.
 * Devuelve true si se lograron todos, false al primer fallo.
 */
export function atrapar(scene, inp, { veces = 3, vel = 1, zona = 0.14, texto: txt = '¡ATRAPA!', color = 0xf2c230, y = 60, x = null, alAcertar = null, alFallar = null } = {}) {
  return new Promise((res) => {
    const W = scene.scale.width, cx = x ?? W / 2, prof = 9000, alto = 130;
    const objs = [
      panel(scene, cx - 44, y - 34, 88, alto + 70, prof - 1),
      scene.add.rectangle(cx, y + alto * (1 - zona / 2) - 2, 54, alto * zona, 0x2fd4b4, 0.6).setDepth(prof).setScrollFactor(0),
      scene.add.rectangle(cx, y + alto / 2, 2, alto, 0x3a3646).setDepth(prof).setScrollFactor(0),
      icono(scene, cx - 26, y - 18, 'a', 22).setDepth(prof + 2).setScrollFactor(0),
      texto(scene, cx - 12, y - 18, txt, { tam: 12, negrita: true, origen: [0, 0.5] }).setDepth(prof + 2).setScrollFactor(0),
    ];
    const cuenta = texto(scene, cx, y + alto + 18, `0 / ${veces}`, { tam: 15, negrita: true, origen: [0.5, 0.5] }).setDepth(prof + 2).setScrollFactor(0);
    const bola = scene.add.circle(cx, y, 7, color).setStrokeStyle(2, 0x120e18).setDepth(prof + 1).setScrollFactor(0);
    objs.push(cuenta, bola);
    let t = 0, n = 0, espera = 0.3;
    scene.__mini = { tipo: 'atrapar', zona, p: () => (espera > 0 ? 0 : t * t) };
    const fin = (ok) => { scene.__mini = null; scene.events.off('update', f); scene.time.delayedCall(220, () => objs.forEach((o) => o.destroy())); res(ok); };
    const f = (_, dt) => {
      if (espera > 0) { espera -= dt / 1000; inp.tomarA(); return; }
      t += (dt / 1000) * vel * (1 + n * 0.12);
      const p = t * t; // cae acelerando
      bola.setY(y + alto * Math.min(1, p));
      if (inp.tomarA()) {
        if (p >= 1 - zona && p <= 1.06) {
          n++; tono(880 + n * 120, 0.06, 'campana', 0.1);
          cuenta.setText(`${n} / ${veces}`);
          if (alAcertar) alAcertar(n);
          if (n >= veces) { fin(true); return; }
          t = 0; espera = 0.25;
        } else { tono(200, 0.1, 'cuadrada', 0.08); if (alFallar) alFallar(); fin(false); }
      } else if (p > 1.1) { tono(200, 0.1, 'cuadrada', 0.08); if (alFallar) alFallar(); fin(false); }
    };
    cadaCuadro(scene, f);
  });
}

/** Machacar A para llenar un medidor antes de que se acabe el tiempo. Devuelve true si se llenó. */
export function machacar(scene, inp, { golpes = 14, segundos = 3, texto: txt = '¡MACHACA A!', y = 90, x = null, alGolpe = null } = {}) {
  return new Promise((res) => {
    const W = scene.scale.width, cx = x ?? W / 2, L = 220, prof = 9000;
    const objs = [
      panel(scene, cx - L / 2 - 20, y - 44, L + 40, 72, prof - 1),
      scene.add.rectangle(cx, y, L + 4, 16, 0x1a1622).setStrokeStyle(2, 0x5a5666).setDepth(prof).setScrollFactor(0),
      icono(scene, cx - 90, y - 24, 'a', 24).setDepth(prof + 2).setScrollFactor(0),
      texto(scene, cx - 72, y - 24, txt, { tam: 14, negrita: true, origen: [0, 0.5] }).setDepth(prof + 2).setScrollFactor(0),
    ];
    const lleno = scene.add.rectangle(cx - L / 2, y, 0, 12, 0xf7c948).setOrigin(0, 0.5).setDepth(prof + 1).setScrollFactor(0);
    objs.push(lleno);
    let n = 0, t = segundos;
    scene.__mini = { tipo: 'machacar' };
    const f = (_, dt) => {
      t -= dt / 1000;
      if (inp.tomarA()) { n++; tono(400 + n * 30, 0.03, 'cuadrada', 0.05); if (alGolpe) alGolpe(n / golpes); }
      lleno.width = L * Math.min(1, n / golpes);
      if (n >= golpes || t <= 0) {
        scene.events.off('update', f);
        scene.time.delayedCall(220, () => objs.forEach((o) => o.destroy()));
        scene.__mini = null;
        res(n >= golpes);
      }
    };
    cadaCuadro(scene, f);
  });
}
