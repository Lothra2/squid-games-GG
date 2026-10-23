// Minijuegos de precisión que usan varios juegos: la barra que va y viene, la caída al punto justo y machacar A.

import { tono } from './sonido.js';

/** Barra que va y viene: A la detiene. Devuelve { v, ok } (ok: cayó en la zona verde). */
export function barra(scene, inp, { vel = 1.2, ideal = 0.8, ancho = 0.16, texto = 'A: ¡AHORA!', y = 70, x = null } = {}) {
  return new Promise((res) => {
    const W = scene.scale.width, cx = x ?? W / 2, bx = cx - 60, prof = 9000;
    const objs = [
      scene.add.rectangle(cx, y - 4, 140, 34, 0x000000, 0.55).setDepth(prof - 1).setScrollFactor(0),
      scene.add.nineslice(cx, y, 'barra_marco', undefined, 124, 10, 4, 4, 0, 0).setDepth(prof).setScrollFactor(0),
      scene.add.rectangle(bx + 120 * (ideal - ancho / 2), y - 3, 120 * ancho, 6, 0x23b39c).setOrigin(0).setDepth(prof + 1).setScrollFactor(0),
      scene.add.bitmapText(cx, y - 16, 'fuente_ui', texto).setOrigin(0.5).setDepth(prof + 2).setScrollFactor(0),
    ];
    const aguja = scene.add.rectangle(bx, y, 2, 12, 0xffffff).setDepth(prof + 2).setScrollFactor(0);
    objs.push(aguja);
    let v = 0, sube = 1;
    const f = (_, dt) => {
      v += (sube * vel * dt) / 1000;
      if (v > 1) { v = 1; sube = -1; } if (v < 0) { v = 0; sube = 1; }
      aguja.setX(bx + 120 * v);
      if (inp.tomarA()) {
        scene.events.off('update', f);
        const ok = Math.abs(v - ideal) <= ancho / 2;
        tono(ok ? 1046 : 330, 0.06, ok ? 'campana' : 'cuadrada', 0.1);
        aguja.setFillStyle(ok ? 0x23b39c : 0xff4d6d);
        scene.time.delayedCall(250, () => objs.forEach((o) => o.destroy()));
        res({ v, ok });
      }
    };
    scene.events.on('update', f);
  });
}

/**
 * Algo cae (o sube y baja) y hay que apretar A cuando pasa por la zona. veces: cuántos aciertos seguidos hacen falta.
 * Devuelve true si se lograron todos, false al primer fallo.
 */
export function atrapar(scene, inp, { veces = 3, vel = 1, zona = 0.14, texto = 'A: ¡ATRAPA!', color = 0xf2c230, y = 60, x = null } = {}) {
  return new Promise((res) => {
    const W = scene.scale.width, cx = x ?? W / 2, prof = 9000, alto = 90;
    const objs = [
      scene.add.rectangle(cx, y + alto / 2, 44, alto + 10, 0x000000, 0.55).setDepth(prof - 1).setScrollFactor(0),
      scene.add.rectangle(cx, y + alto * (1 - zona / 2) - 2, 40, alto * zona, 0x23b39c, 0.6).setDepth(prof).setScrollFactor(0),
      scene.add.bitmapText(cx, y - 10, 'fuente_ui', texto).setOrigin(0.5).setDepth(prof + 2).setScrollFactor(0),
    ];
    const cuenta = scene.add.bitmapText(cx, y + alto + 10, 'fuente_ui', `0/${veces}`).setOrigin(0.5).setDepth(prof + 2).setScrollFactor(0);
    const bola = scene.add.circle(cx, y, 4, color).setDepth(prof + 1).setScrollFactor(0);
    objs.push(cuenta, bola);
    let t = 0, n = 0, espera = 0.3;
    const fin = (ok) => { scene.events.off('update', f); scene.time.delayedCall(200, () => objs.forEach((o) => o.destroy())); res(ok); };
    const f = (_, dt) => {
      if (espera > 0) { espera -= dt / 1000; inp.tomarA(); return; }
      t += (dt / 1000) * vel * (1 + n * 0.12);
      const p = t * t; // cae acelerando
      bola.setY(y + alto * Math.min(1, p));
      if (inp.tomarA()) {
        if (p >= 1 - zona && p <= 1.04) {
          n++; tono(880 + n * 120, 0.06, 'campana', 0.1);
          cuenta.setText(`${n}/${veces}`);
          if (n >= veces) { fin(true); return; }
          t = 0; espera = 0.25;
        } else { tono(200, 0.1, 'cuadrada', 0.08); fin(false); }
      } else if (p > 1.1) { tono(200, 0.1, 'cuadrada', 0.08); fin(false); }
    };
    scene.events.on('update', f);
  });
}

/** Machacar A para llenar un medidor antes de que se acabe el tiempo. Devuelve true si se llenó. */
export function machacar(scene, inp, { golpes = 14, segundos = 3, texto = '¡MACHACA A!', y = 70 } = {}) {
  return new Promise((res) => {
    const W = scene.scale.width, cx = W / 2, prof = 9000;
    const objs = [
      scene.add.rectangle(cx, y - 4, 140, 34, 0x000000, 0.55).setDepth(prof - 1).setScrollFactor(0),
      scene.add.nineslice(cx, y, 'barra_marco', undefined, 124, 10, 4, 4, 0, 0).setDepth(prof).setScrollFactor(0),
      scene.add.bitmapText(cx, y - 16, 'fuente_ui', texto).setOrigin(0.5).setDepth(prof + 2).setScrollFactor(0),
    ];
    const lleno = scene.add.rectangle(cx - 60, y - 3, 0, 6, 0xf2c230).setOrigin(0).setDepth(prof + 1).setScrollFactor(0);
    objs.push(lleno);
    let n = 0, t = segundos;
    const f = (_, dt) => {
      t -= dt / 1000;
      if (inp.tomarA()) { n++; tono(400 + n * 30, 0.03, 'cuadrada', 0.05); }
      lleno.width = 120 * Math.min(1, n / golpes);
      if (n >= golpes || t <= 0) {
        scene.events.off('update', f);
        scene.time.delayedCall(200, () => objs.forEach((o) => o.destroy()));
        res(n >= golpes);
      }
    };
    scene.events.on('update', f);
  });
}
