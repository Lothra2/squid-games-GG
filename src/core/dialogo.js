import Phaser from 'phaser';
// Diálogos con retrato, nombre, voz y texto que se escribe solo. A avanza (o completa la línea).
// Línea: [quien, expresión, texto]. quien null = narrador. Expresiones: neutral feliz enojo triste susto cerrado dolor burla

import { M } from './kit.js';
import { nombre, NUMEROS, E } from './estado.js';
import { blip, tono } from './sonido.js';

const COLOR = { rick: 0x5aa0ff, steph: 0xff8fb5, sophie: 0x9ed08a, alana: 0xf2c230, front_man: 0xb8b8c8, reclutador: 0xd8d0c0 };

function nombreLinea(q) {
  if (!q) return '';
  if (q.startsWith('guardia')) return q === 'guardia_cuadrado' ? 'GUARDIA □' : 'GUARDIA';
  if (q === 'locutor') return 'ALTAVOZ';
  if (q.startsWith('j_')) {
    const n = M.atletas[q]?.numero;
    return q === 'j_abuelo' ? 'JUGADOR 001' : n ? 'JUGADOR ' + n : 'JUGADOR';
  }
  const n = NUMEROS[q];
  return (nombre(q) + (n ? ' · ' + n : '')).toUpperCase();
}

/** Muestra las líneas una tras otra. Devuelve una promesa que se cumple al cerrar. */
export function hablar(scene, inp, lineas, { arriba = false } = {}) {
  return new Promise((ok) => {
    const W = scene.scale.width, H = scene.scale.height;
    const prof = 9500;
    const y0 = arriba ? 6 : H - 72;
    const caja = scene.add.nineslice(W / 2, y0 + 33, 'dialogo', undefined, W - 12, 66, 8, 8, 8, 8).setScrollFactor(0).setDepth(prof);
    const marco = scene.add.image(14 + 24, y0 + 9 + 24, 'marco_retrato_40').setScrollFactor(0).setDepth(prof + 1);
    const ret = scene.add.image(14 + 4 + 20, y0 + 9 + 4 + 20, 'pix').setScrollFactor(0).setDepth(prof + 2);
    const nom = scene.add.bitmapText(70, y0 + 8, 'fuente_ui', '').setScrollFactor(0).setDepth(prof + 2);
    const txt = scene.add.bitmapText(70, y0 + 21, 'fuente_ui', '').setScrollFactor(0).setDepth(prof + 2).setMaxWidth(W - 90);
    const flecha = scene.add.sprite(W - 18, y0 + 56, 'dialogo_flecha').setScrollFactor(0).setDepth(prof + 2).play('dialogo_flecha');
    const todo = [caja, marco, ret, nom, txt, flecha];
    let i = -1, completo = '', pos = 0, acc = 0, quien = null;

    const siguiente = () => {
      i++;
      if (i >= lineas.length) { cerrar(); return; }
      let [q, ex, t] = lineas[i];
      quien = q;
      completo = t.replace(/\{numero\}/g, NUMEROS[E.perfil]).replace(/\{nombre\}/g, nombre(E.perfil));
      pos = 0; acc = 0;
      txt.setText('');
      const conCara = q && scene.textures.exists('ret_' + q);
      marco.setVisible(!!conCara); ret.setVisible(!!conCara);
      if (conCara) ret.setTexture('ret_' + q, 'c_' + (ex || 'neutral'));
      const x = conCara ? 70 : 16;
      nom.setX(x); txt.setX(x).setMaxWidth(W - x - 22);
      nom.setText(nombreLinea(q)).setTint(COLOR[q] || (q && q.startsWith('guardia') ? 0xe0457b : 0xf2c230));
      txt.setY(q ? y0 + 21 : y0 + 12);
      flecha.setVisible(false);
    };
    const cerrar = () => {
      scene.events.off('update', tick);
      todo.forEach((o) => o.destroy());
      ok();
    };
    const tick = (_, dt) => {
      if (pos < completo.length) {
        acc += dt;
        const vel = 28; // ms por letra
        while (acc > vel && pos < completo.length) {
          acc -= vel; pos++;
          const ch = completo[pos - 1];
          if (pos % 3 === 1 && /\S/.test(ch)) quien ? blip(scene, quien) : tono(660, 0.02, 'cuadrada', 0.03);
        }
        txt.setText(completo.slice(0, pos));
        if (pos >= completo.length) flecha.setVisible(true);
        if (inp.tomarA()) { pos = completo.length; txt.setText(completo); flecha.setVisible(true); }
      } else if (inp.tomarA()) {
        siguiente();
      }
    };
    scene.events.on('update', tick);
    siguiente();
  });
}

/** Un cartel grande en el centro: título y subtítulo. Se va solo. */
export function cartel(scene, titulo, sub = '', { ms = 1600, color = 0xffffff, fondo = true } = {}) {
  return new Promise((ok) => {
    const W = scene.scale.width, H = scene.scale.height, prof = 9400;
    const objs = [];
    if (fondo) objs.push(scene.add.rectangle(W / 2, H / 2, W, 54, 0x000000, 0.6).setScrollFactor(0).setDepth(prof));
    const t = scene.add.bitmapText(W / 2, H / 2 - (sub ? 8 : 0), 'fuente_titulo', titulo).setOrigin(0.5).setScrollFactor(0).setDepth(prof + 1).setTint(color);
    objs.push(t);
    if (sub) objs.push(scene.add.bitmapText(W / 2, H / 2 + 14, 'fuente_ui', sub).setOrigin(0.5).setScrollFactor(0).setDepth(prof + 1));
    t.setScale(1.6); scene.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.easeOut' });
    scene.time.delayedCall(ms, () => {
      scene.tweens.add({ targets: objs, alpha: 0, duration: 250, onComplete: () => { objs.forEach((o) => o.destroy()); ok(); } });
    });
  });
}

/** Espera a que aprieten A. */
export function esperarA(scene, inp) {
  return new Promise((ok) => {
    const f = () => { if (inp.tomarA()) { scene.events.off('update', f); ok(); } };
    scene.events.on('update', f);
  });
}

export function esperar(scene, ms) {
  return new Promise((ok) => scene.time.delayedCall(ms, ok));
}

/**
 * Elegir entre opciones con arriba/abajo (o izquierda/derecha) y A. Devuelve el índice.
 * Con el dedo: se toca la opción.
 */
export function elegir(scene, inp, opciones, { x = null, y = null, titulo = '', ancho = 220 } = {}) {
  return new Promise((ok) => {
    const W = scene.scale.width, H = scene.scale.height, prof = 9600;
    const alto = 16 * opciones.length + (titulo ? 22 : 10);
    const cx = x ?? W / 2, cy = y ?? H / 2;
    const caja = scene.add.nineslice(cx, cy, 'dialogo', undefined, ancho, alto, 8, 8, 8, 8).setScrollFactor(0).setDepth(prof);
    const objs = [caja];
    let top = cy - alto / 2 + 9;
    if (titulo) { objs.push(scene.add.bitmapText(cx, top + 2, 'fuente_ui', titulo).setOrigin(0.5, 0).setTint(0xf2c230).setScrollFactor(0).setDepth(prof + 1)); top += 14; }
    const items = opciones.map((o, i) => {
      const t = scene.add.bitmapText(cx - ancho / 2 + 22, top + i * 16, 'fuente_ui', o).setScrollFactor(0).setDepth(prof + 1);
      t.setInteractive(new Phaser.Geom.Rectangle(-14, -3, ancho - 20, 14), Phaser.Geom.Rectangle.Contains);
      t.on('pointerdown', () => { sel = i; pintar(); fin(); });
      objs.push(t);
      return t;
    });
    const cursor = scene.add.image(0, 0, 'circulo_lleno').setScale(0.5).setTint(0xe0457b).setScrollFactor(0).setDepth(prof + 1);
    objs.push(cursor);
    let sel = 0, frio = 0, listo = false, cuadros = 0;
    const pintar = () => {
      items.forEach((t, i) => t.setTint(i === sel ? 0xffffff : 0x8a8a9a));
      cursor.setPosition(items[sel].x - 9, items[sel].y + 4);
    };
    const fin = () => {
      if (listo) return; listo = true;
      tono(990, 0.06, 'cuadrada', 0.08);
      scene.events.off('update', f);
      objs.forEach((o) => o.destroy());
      ok(sel);
    };
    const f = (_, dt) => {
      // el toque que abrió el menú no cuenta
      if (cuadros++ < 6) { inp.tomarA(); return; }
      frio -= dt;
      const d = inp.y || inp.x;
      if (frio <= 0 && Math.abs(d) > 0.5) {
        sel = (sel + (d > 0 ? 1 : -1) + opciones.length) % opciones.length;
        pintar(); tono(660, 0.03, 'cuadrada', 0.05); frio = 180;
      }
      if (Math.abs(d) <= 0.5) frio = 0;
      if (inp.aPulso && !inp.esTactil) { inp.tomarA(); fin(); }
      else if (inp.aPulso && inp.esTactil && (inp.k.sp.isDown || inp.k.en.isDown || inp.k.z.isDown || inp._tA)) { inp.tomarA(); fin(); }
      else inp.tomarA();
    };
    scene.events.on('update', f);
    pintar();
  });
}
