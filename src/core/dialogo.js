// Diálogos con retrato grande, nombre, voz y texto que se escribe solo. A (o un toque) avanza.
// Línea: [quien, expresión, texto]. quien null = narrador. Expresiones: neutral feliz enojo triste susto cerrado dolor burla
// También: carteles grandes, esperar A y menús para elegir con el dedo o las flechas.

import Phaser from 'phaser';
import { M } from './kit.js';
import { nombre, NUMEROS, E } from './estado.js';
import { blip, tono } from './sonido.js';
import { texto, panel, COLOR, icono, cadaCuadro, botonVolver } from './ui.js';

const COLOR_NOMBRE = { rick: '#6aa8ff', steph: '#ff8fb5', sophie: '#9ed08a', alana: '#f7c948', front_man: '#c8c8d8', reclutador: '#e0d6c0', j_abuelo: '#f7c948' };
/** el color de cada personaje para la placa y el fondo del retrato */
const colorDe = (q) => Phaser.Display.Color.HexStringToColor(COLOR_NOMBRE[q] || (q && q.startsWith('guardia') ? '#ff4d8d' : '#f7c948')).color;

function nombreLinea(q) {
  if (!q) return '';
  if (q.startsWith('guardia')) return q === 'guardia_cuadrado' ? 'GUARDIA JEFE' : 'GUARDIA';
  if (q === 'locutor') return 'ALTAVOZ';
  if (q.startsWith('j_')) {
    const n = M.atletas[q]?.numero;
    return q === 'j_abuelo' ? 'JUGADOR 001' : n ? 'JUGADOR ' + n : 'JUGADOR';
  }
  const n = NUMEROS[q];
  return (nombre(q) + (n ? '  ·  ' + n : '')).toUpperCase();
}

/**
 * Muestra las líneas una tras otra. Devuelve una promesa que se cumple al cerrar.
 * La caja: fondo oscuro con borde rosado, el retrato completo adentro (sobre el color del personaje),
 * el nombre en una placa encima del borde y el texto que se escribe solo.
 */
export function hablar(scene, inp, lineas, { arriba = false } = {}) {
  return new Promise((ok) => {
    const W = scene.scale.width, H = scene.scale.height;
    const prof = 9500;
    const altoCaja = 106, x0 = 8, ancho = W - 16;
    const y0 = arriba ? 18 : H - altoCaja - 6;
    const fijo = (o, d = 0) => o.setScrollFactor(0).setDepth(prof + d);
    // la caja: sombra, fondo, borde rosado y una línea fina adentro
    const caja = fijo(scene.add.graphics());
    const pintarCaja = (color, conCara) => {
      caja.clear();
      caja.fillStyle(0x000000, 0.45); caja.fillRect(x0 + 3, y0 + 4, ancho, altoCaja);
      caja.fillStyle(0x0b0912, 0.96); caja.fillRect(x0, y0, ancho, altoCaja);
      caja.fillStyle(0x1a1626, 0.9); caja.fillRect(x0, y0, ancho, 3);
      if (conCara) {
        // el panel del retrato, teñido con el color del personaje
        caja.fillStyle(color, 0.16); caja.fillRect(x0 + 5, y0 + 5, 96, 96);
        caja.fillStyle(color, 0.1); caja.fillRect(x0 + 5, y0 + 53, 96, 48);
        caja.lineStyle(1, color, 0.7); caja.strokeRect(x0 + 4.5, y0 + 4.5, 97, 97);
        caja.fillStyle(0xff4d8d, 0.5); caja.fillRect(x0 + 107, y0 + 12, 1, altoCaja - 24);
      }
      caja.lineStyle(2, 0xff4d8d, 1); caja.strokeRect(x0 + 1, y0 + 1, ancho - 2, altoCaja - 2);
      caja.lineStyle(1, 0xff4d8d, 0.25); caja.strokeRect(x0 + 3.5, y0 + 3.5, ancho - 7, altoCaja - 7);
      // las esquinas: el círculo, el triángulo y el cuadrado, chiquitos
      caja.lineStyle(1, 0xff4d8d, 0.8);
      caja.strokeCircle(x0 + ancho - 40, y0 + altoCaja - 10, 3);
      caja.strokeTriangle(x0 + ancho - 28, y0 + altoCaja - 13, x0 + ancho - 31, y0 + altoCaja - 7, x0 + ancho - 25, y0 + altoCaja - 7);
      caja.strokeRect(x0 + ancho - 20, y0 + altoCaja - 13, 6, 6);
    };
    const ret = fijo(scene.add.image(x0 + 5, y0 + 5, 'pix').setOrigin(0), 1);
    // la placa del nombre, montada sobre el borde de arriba
    const placa = fijo(scene.add.graphics(), 2);
    const nom = fijo(texto(scene, 0, y0 - 1, '', { tam: 13, negrita: true, color: '#120e18', borde: 0, origen: [0, 0.5] }), 3);
    const txt = fijo(texto(scene, 0, y0 + 18, '', { tam: 16, ancho: 100 }), 2);
    const flecha = fijo(scene.add.sprite(x0 + ancho - 56, y0 + altoCaja - 11, 'dialogo_flecha').play('dialogo_flecha'), 2);
    const todo = [caja, ret, placa, nom, txt, flecha];
    // entra deslizándose
    todo.forEach((o) => { o.y += arriba ? -12 : 12; o.setAlpha(0); });
    scene.tweens.add({ targets: todo, y: `${arriba ? '+' : '-'}=12`, alpha: 1, duration: 160, ease: 'Quad.easeOut' });
    let i = -1, completo = '', pos = 0, acc = 0, quien = null;

    const siguiente = () => {
      i++;
      if (i >= lineas.length) { cerrar(); return; }
      const [q, ex, t] = lineas[i];
      quien = q;
      completo = t.replace(/\{numero\}/g, NUMEROS[E.perfil]).replace(/\{nombre\}/g, nombre(E.perfil));
      pos = 0; acc = 0;
      txt.setText('');
      const conCara = !!(q && scene.textures.exists('ret_' + q));
      const color = colorDe(q);
      pintarCaja(color, conCara);
      ret.setVisible(conCara);
      if (conCara) {
        ret.setTexture('ret_' + q, 'g_' + (ex || 'neutral'));
        // un saltito del retrato cuando empieza a hablar
        ret.y = y0 + 9; scene.tweens.add({ targets: ret, y: y0 + 5, duration: 140, ease: 'Back.easeOut' });
      }
      const tx = conCara ? x0 + 118 : x0 + 22;
      txt.setX(tx).setWordWrapWidth(x0 + ancho - tx - 22).setY(y0 + (conCara ? 18 : 16)).setColor(q ? COLOR.texto : '#d8d0e8');
      // la placa con el nombre
      placa.clear();
      const n = nombreLinea(q);
      nom.setText(n).setVisible(!!n);
      if (n) {
        const px = conCara ? x0 + 116 : x0 + 16, w = nom.width + 20;
        placa.fillStyle(0x000000, 0.5); placa.fillRect(px + 2, y0 - 9, w, 18);
        placa.fillStyle(color, 1); placa.fillRect(px, y0 - 11, w, 18);
        placa.fillStyle(0xffffff, 0.35); placa.fillRect(px, y0 - 11, w, 2);
        placa.fillStyle(0x120e18, 1); placa.fillRect(px + w - 6, y0 - 11, 6, 18);
        placa.fillStyle(color, 1); placa.fillTriangle(px + w - 6, y0 - 11, px + w, y0 - 11, px + w - 6, y0 + 7);
        nom.setX(px + 8);
        if (conCara) txt.setY(y0 + 20);
      }
      flecha.setVisible(false);
    };
    const cerrar = () => {
      scene.events.off('update', tick);
      scene.tweens.add({ targets: todo, alpha: 0, duration: 110, onComplete: () => todo.forEach((o) => o.destroy()) });
      ok();
    };
    const tick = (_, dt) => {
      if (pos < completo.length) {
        acc += dt;
        const vel = 22; // ms por letra
        while (acc > vel && pos < completo.length) {
          acc -= vel; pos++;
          const ch = completo[pos - 1];
          if (pos % 3 === 1 && /\S/.test(ch)) quien ? blip(scene, quien) : tono(660, 0.02, 'cuadrada', 0.03);
          // una pausita en los puntos y las comas, como cuando uno habla
          if (/[.!?…]/.test(ch)) acc -= 120; else if (ch === ',') acc -= 50;
        }
        txt.setText(completo.slice(0, pos));
        if (pos >= completo.length) flecha.setVisible(true);
        if (inp.tomarA()) { pos = completo.length; txt.setText(completo); flecha.setVisible(true); }
      } else if (inp.tomarA()) {
        siguiente();
      }
    };
    cadaCuadro(scene, tick);
    siguiente();
  });
}

/** Un cartel grande en el centro: título y subtítulo. Se va solo. */
export function cartel(scene, titulo, sub = '', { ms = 1600, color = 0xffffff, fondo = true } = {}) {
  return new Promise((ok) => {
    const W = scene.scale.width, H = scene.scale.height, prof = 9400;
    const objs = [];
    if (fondo) objs.push(scene.add.rectangle(W / 2, H / 2, W, 76, 0x000000, 0.62).setScrollFactor(0).setDepth(prof));
    const t = scene.add.bitmapText(W / 2, H / 2 - (sub ? 10 : 0), 'fuente_titulo', titulo).setOrigin(0.5).setScrollFactor(0).setDepth(prof + 1).setTint(color);
    const esc = Math.min(2, (W - 40) / t.width);
    objs.push(t);
    if (sub) objs.push(texto(scene, W / 2, H / 2 + 22, sub, { tam: 15, origen: [0.5, 0.5] }).setScrollFactor(0).setDepth(prof + 1));
    t.setScale(esc * 1.5); scene.tweens.add({ targets: t, scale: esc, duration: 220, ease: 'Back.easeOut' });
    scene.time.delayedCall(ms, () => {
      scene.tweens.add({ targets: objs, alpha: 0, duration: 250, onComplete: () => { objs.forEach((o) => o.destroy()); ok(); } });
    });
  });
}

/** Espera a que aprieten A. */
export function esperarA(scene, inp) {
  return new Promise((ok) => {
    const f = () => { if (inp.tomarA()) { scene.events.off('update', f); ok(); } };
    cadaCuadro(scene, f);
  });
}

export function esperar(scene, ms) {
  return new Promise((ok) => scene.time.delayedCall(ms, ok));
}

/**
 * Elegir entre opciones con las flechas y A, o tocando la opción. Devuelve el índice (o -1 si se cancela con B).
 * columnas: 1 o 2. detalles: un texto chico debajo de cada opción.
 */
export function elegir(scene, inp, opciones, { titulo = '', ancho = null, x = null, y = null, columnas = 1, cancelar = false, detalles = null, tam = 16 } = {}) {
  return new Promise((ok) => {
    const W = scene.scale.width, H = scene.scale.height, prof = 9600;
    const filaH = detalles ? 40 : 30;
    const porCol = Math.ceil(opciones.length / columnas);
    const medidas = opciones.map((o) => { const t = texto(scene, 0, 0, o, { tam }); const w = t.width; t.destroy(); return w; });
    const colW = Math.max(150, Math.max(...medidas) + 52, detalles ? 300 : 0);
    // la caja crece para que el título nunca se salga
    let anchoTitulo = 0;
    if (titulo) { const t = texto(scene, 0, 0, titulo, { tam: 17, negrita: true }); anchoTitulo = t.width + 48; t.destroy(); }
    const anchoT = Math.min(W - 24, Math.max(ancho || colW * columnas + 20, anchoTitulo));
    const alto = porCol * filaH + (titulo ? 44 : 18);
    // con volver, abajo queda lugar para el botón
    const abajo = cancelar ? 40 : 4;
    const x0 = (x ?? W / 2) - anchoT / 2, y0 = Math.max(4, Math.min(H - alto - abajo, (y ?? H / 2) - alto / 2));
    const objs = [panel(scene, x0, y0, anchoT, alto, prof)];
    let top = y0 + 12;
    if (titulo) { objs.push(texto(scene, x0 + anchoT / 2, top + 4, titulo, { tam: 17, negrita: true, color: COLOR.oro, origen: [0.5, 0] }).setScrollFactor(0).setDepth(prof + 1)); top += 32; }
    const cw = (anchoT - 20) / columnas;
    const items = opciones.map((o, i) => {
      const c = Math.floor(i / porCol), r = i % porCol;
      const ix = x0 + 10 + c * cw, iy = top + r * filaH;
      const fondo = scene.add.rectangle(ix, iy, cw - 6, filaH - 4, 0xff4d8d, 0).setOrigin(0).setScrollFactor(0).setDepth(prof + 1);
      const t = texto(scene, ix + 30, iy + (detalles ? 4 : (filaH - 4) / 2), o, { tam, origen: [0, detalles ? 0 : 0.5] }).setScrollFactor(0).setDepth(prof + 2);
      const d = detalles && detalles[i] ? texto(scene, ix + 30, iy + 22, detalles[i], { tam: 11, color: COLOR.apagado }).setScrollFactor(0).setDepth(prof + 2) : null;
      fondo.setInteractive({ useHandCursor: true });
      fondo.on('pointerover', () => { if (!inp.esTactil) { sel = i; pintar(); } });
      fondo.on('pointerdown', () => { sel = i; pintar(); fin(); });
      objs.push(fondo, t); if (d) objs.push(d);
      return { fondo, t, d };
    });
    if (cancelar) botonVolver(scene, x0 + anchoT / 2, y0 + alto + 20, () => fin(-1), { prof: prof + 1, teclado: !inp.esTactil }).forEach((o) => objs.push(o));
    const cursor = scene.add.image(0, 0, 'triangulo').setTint(0xff4d8d).setAngle(90).setScale(0.8).setScrollFactor(0).setDepth(prof + 3);
    objs.push(cursor);
    scene.tweens.add({ targets: cursor, scaleX: 0.6, duration: 300, yoyo: true, repeat: -1 });
    let sel = 0, frio = 0, listo = false, cuadros = 0;
    const pintar = () => {
      items.forEach((it, i) => {
        const on = i === sel;
        it.t.setColor(on ? COLOR.texto : '#a8a4b8');
        it.fondo.setFillStyle(0xff4d8d, on ? 0.18 : 0);
      });
      const f = items[sel].fondo;
      cursor.setPosition(f.x + 14, f.y + (filaH - 4) / 2);
    };
    const fin = (r = sel) => {
      if (listo) return; listo = true;
      tono(990, 0.06, 'cuadrada', 0.08);
      scene.events.off('update', f);
      objs.forEach((o) => o.destroy());
      ok(r);
    };
    const f = (_, dt) => {
      // el toque que abrió el menú no cuenta
      if (cuadros++ < 6) { inp.tomarA(); inp.tomarB(); return; }
      frio -= dt;
      const dy = inp.y, dx = inp.x;
      if (frio <= 0 && (Math.abs(dy) > 0.5 || (columnas > 1 && Math.abs(dx) > 0.5))) {
        if (Math.abs(dy) > 0.5) sel = (sel + (dy > 0 ? 1 : -1) + opciones.length) % opciones.length;
        else sel = Math.max(0, Math.min(opciones.length - 1, sel + (dx > 0 ? porCol : -porCol)));
        pintar(); tono(660, 0.03, 'cuadrada', 0.05); frio = 180;
      }
      if (Math.abs(dy) <= 0.5 && Math.abs(dx) <= 0.5) frio = 0;
      if (cancelar && (inp.tomarB() || inp.tomarPausa())) { fin(-1); return; }
      // con teclado o control, A elige; con el dedo se toca la opción (un toque suelto no elige)
      if (inp.aPulso) { const fisico = inp.aFisico; inp.tomarA(); if (fisico) fin(); }
    };
    cadaCuadro(scene, f);
    pintar();
    void icono; void Phaser;
  });
}
