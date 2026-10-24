// Título, menú, elegir quién juega y la dificultad, la práctica (todos los juegos, con tus estrellas) y opciones.

import Phaser from 'phaser';
import { E, FAMILIA, NUMEROS, DIFICULTADES, NINAS, guardar, hayPartida, nombre, millones } from '../core/estado.js';
import { Entrada } from '../core/entrada.js';
import { elegir } from '../core/dialogo.js';
import { musica, despertar, tono, volumen, iniciarAudio, bloque } from '../core/sonido.js';
import { nuevaPartida, irAPaso, JUEGOS, SECUENCIA } from '../core/flujo.js';
import { texto, COLOR, atmosfera, cadaCuadro, botonVolver } from '../core/ui.js';
import { texturasLuz } from './pintura.js';
import { altavoz } from '../core/voz.js';

const CORTOS = ['Luz roja, luz verde', 'La galleta', 'Tira y afloja', 'Las canicas', 'Pentatlón', 'Mingle', 'Puente de cristal', 'El escondite', 'La cuerda', 'Calamar en el cielo', 'Juego del calamar'];

export function logo(scene, x, y, escala = 1, figuras = true) {
  const objs = [];
  const prof = 50;
  objs.push(texto(scene, x, y - 34 * escala, 'EL JUEGO DEL', { tam: Math.round(22 * escala), negrita: true, origen: [0.5, 0.5] }).setDepth(prof));
  const c = scene.add.bitmapText(x, y + 6 * escala, 'fuente_titulo', 'CALAMAR').setOrigin(0.5).setScale(escala * 3).setDepth(prof).setTint(0xff3d7f);
  objs.push(c);
  objs.push(scene.add.bitmapText(x, y + 46 * escala, 'fuente_titulo_plata', 'FAMILIA GG').setOrigin(0.5).setScale(escala * 1.5).setDepth(prof));
  if (figuras) ['circulo', 'triangulo', 'cuadrado'].forEach((s, i) => {
    const im = scene.add.image(x + (i - 1) * 34 * escala, y + 76 * escala, s).setTint(0xff3d7f).setDepth(prof).setScale(escala);
    objs.push(im);
    scene.tweens.add({ targets: im, alpha: 0.35, duration: 700, yoyo: true, repeat: -1, delay: i * 230 });
  });
  scene.tweens.add({ targets: c, alpha: 0.82, duration: 1100, yoyo: true, repeat: -1 });
  return objs;
}

export class Titulo extends Phaser.Scene {
  constructor() { super('Titulo'); }
  init(data) { this.datos = data || {}; }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.fadeIn(900);
    texturasLuz(this);
    // el fondo respira despacio (se acerca y se aleja)
    this.fondo = this.add.image(W / 2, H / 2, 'titulo').setScale(1.04);
    this.tweens.add({ targets: this.fondo, scale: 1.1, x: W / 2 + 8, y: H / 2 - 4, duration: 16000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.28);
    // el neón del triángulo y el cuadrado (titila como neón viejo) y los visores de los guardias
    this.neones = [[102, 140, 2.6], [540, 148, 2.6]].map(([x, y, e]) => this.add.image(x, y, 'brillo').setScale(e).setTint(0xff4d9d).setAlpha(0.3).setBlendMode(Phaser.BlendModes.ADD));
    this.visores = [[106, 227, 0.7], [533, 228, 0.7], [196, 262, 0.4], [442, 262, 0.4]].map(([x, y, e]) => this.add.image(x, y, 'brillo').setScale(e).setTint(0xff8fc0).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD));
    this.visores.forEach((v, i) => this.tweens.add({ targets: v, alpha: 0.15, duration: 900 + i * 130, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
    this.time.addEvent({ delay: 120, loop: true, callback: () => this.neones.forEach((n) => n.setAlpha(Math.random() < 0.06 ? 0.05 : 0.26 + Math.random() * 0.06)) });
    // el sol de atrás cambia de color con la luz, y dos focos barren la isla
    this.sol = this.add.image(320, 200, 'brillo').setScale(6).setTint(0x2fd4b4).setAlpha(0.14).setBlendMode(Phaser.BlendModes.ADD);
    this.focos = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    // la neblina rosada que corre abajo y las brasas que suben
    this.niebla = Array.from({ length: 7 }, (_, i) => this.add.image(i * 110, 330 + (i % 2) * 14, 'bocanada').setScale(3.2, 1.4).setAlpha(0.22));
    this.brasas = Array.from({ length: 26 }, () => this.add.rectangle(Math.random() * W, H + Math.random() * 200, 1 + Math.round(Math.random()), 1 + Math.round(Math.random()), Math.random() < 0.5 ? 0xff6fae : 0xffd0e4, 0.8).setBlendMode(Phaser.BlendModes.ADD));
    atmosfera(this, { vineta: 0.65, motas: 0 });
    // la viñeta late como un corazón
    this.latido = this.add.image(0, 0, 'vineta').setOrigin(0).setTint(0x400010).setAlpha(0).setDepth(40);
    this.logo = logo(this, W / 2, 96, 1, false);
    this.calamar = this.logo[1];
    this.inp = new Entrada(this, { tactil: false });
    this.pie = texto(this, W / 2, H - 40, 'TOCA LA PANTALLA O APRIETA ESPACIO', { tam: 16, negrita: true, origen: [0.5, 0.5] });
    this.tweens.add({ targets: this.pie, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
    // el estado de la luz y el pozo que cuenta, abajo
    this.estadoLuz = texto(this, 12, 12, '', { tam: 12, negrita: true, color: COLOR.verde }).setDepth(50);
    this.pozo = texto(this, 12, H - 12, '', { tam: 11, color: '#ffb8d4', origen: [0, 0.5] }).setDepth(50);
    const cuenta = { v: 0 };
    this.tweens.add({ targets: cuenta, v: 45_600_000_000, duration: 4200, delay: 600, ease: 'Cubic.easeOut', onUpdate: () => this.pozo.setText(`456 JUGADORES  ·  PREMIO ${Math.round(cuenta.v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} W`) });
    texto(this, W - 8, H - 10, 'v4 · Familia GG', { tam: 11, color: COLOR.apagado, origen: [1, 0.5] });
    this.tLuz = 0;
    this.cicloLuz('verde');
    this.time.addEvent({ delay: 4200 + Math.random() * 1500, loop: true, callback: () => this.glitch() });
    this.esperando = true;
    // si ya tocaron antes (volviendo de un juego), directo al menú
    if (this.datos.abrir || this.sys.game.__yaToco) { this.esperando = false; this.pie.destroy(); musica('muneca'); this.time.delayedCall(80, () => (this.datos.abrir === 'practica' ? this.practica() : this.menu())); }
  }

  /** luz verde (el sol verde) y luz roja (el sol rojo y la pantalla late) */
  cicloLuz(luz) {
    this.luz = luz;
    if (luz === 'verde') {
      this.estadoLuz.setText('●  LUZ VERDE').setColor(COLOR.verde);
      this.sol.setTint(0x2fd4b4);
      this.time.delayedCall(4200 + Math.random() * 1800, () => this.cicloLuz('roja'));
    } else {
      this.estadoLuz.setText('●  LUZ ROJA').setColor(COLOR.rojo);
      this.sol.setTint(0xff2a4a);
      this.cameras.main.flash(180, 120, 0, 20);
      this.tweens.add({ targets: this.latido, alpha: 0.8, duration: 180, yoyo: true, repeat: 2, hold: 120 });
      if (!this.esperando) bloque(this, ['E3', 0.18, 'metal', 0.12], ['r', 0.06], ['E3', 0.3, 'metal', 0.1]);
      this.time.delayedCall(2600, () => this.cicloLuz('verde'));
    }
  }

  /** CALAMAR se descompone un instante en rojo y celeste, como una señal que falla */
  glitch() {
    const c = this.calamar;
    if (!c || !c.active) return;
    const copias = [[-3, 0x00e5ff], [3, 0xff0040]].map(([dx, col]) => this.add.bitmapText(c.x + dx, c.y, 'fuente_titulo', 'CALAMAR').setOrigin(0.5).setScale(c.scale).setTint(col).setAlpha(0.6).setDepth(c.depth - 1).setBlendMode(Phaser.BlendModes.ADD));
    c.x += 2;
    this.time.delayedCall(70, () => { c.x -= 4; });
    this.time.delayedCall(140, () => { c.x += 2; copias.forEach((o) => o.destroy()); });
  }

  /** los focos, la neblina y las brasas */
  vivo(dt) {
    const W = this.scale.width, H = this.scale.height, t = (this.tLuz += dt);
    const g = this.focos;
    g.clear();
    [[150, 0xff6fae], [490, 0x9ad8ff]].forEach(([x0, c], i) => {
      const xb = x0 + Math.sin(t * 0.5 + i * 2.2) * 160;
      g.fillStyle(c, 0.05); g.fillTriangle(x0 - 4, -10, x0 + 4, -10, xb + 60, H); g.fillTriangle(x0 - 4, -10, xb - 60, H, xb + 60, H);
    });
    this.niebla.forEach((n, i) => { n.x += (8 + (i % 3) * 4) * dt; if (n.x > W + 120) n.x = -120; });
    this.brasas.forEach((b) => { b.y -= (14 + (b.width > 1 ? 10 : 0)) * dt; b.x += Math.sin(t * 2 + b.y * 0.05) * 6 * dt; b.setAlpha(Math.max(0, Math.min(0.9, (b.y - 120) / 160))); if (b.y < 120) { b.y = H + 10; b.x = Math.random() * W; } });
  }

  update(_, dtms) {
    this.vivo(Math.min(dtms, 50) / 1000);
    if (this.esperando && this.inp.tomarA()) {
      this.esperando = false;
      this.sys.game.__yaToco = true;
      iniciarAudio(this);
      despertar();
      tono(880, 0.1, 'campana', 0.15);
      musica('muneca');
      if (this.inp.esTactil && !this.scale.isFullscreen) { try { this.scale.startFullscreen(); } catch { /* el navegador no deja */ } }
      this.pie.destroy();
      this.menu();
    }
  }

  async menu() {
    const ops = [];
    if (hayPartida() && E.paso > 0 && E.paso < SECUENCIA.length) ops.push(['Continuar la historia', 'continuar']);
    ops.push(['Nueva historia', 'nuevo']);
    ops.push(['Práctica: los 11 juegos', 'practica']);
    ops.push(['Opciones', 'opciones']);
    const r = await elegir(this, this.inp, ops.map((o) => o[0]), { y: 252 });
    const k = ops[r][1];
    if (k === 'continuar') irAPaso(this, E.paso);
    if (k === 'nuevo') this.nuevo();
    if (k === 'practica') this.practica();
    if (k === 'opciones') this.opciones();
  }

  async nuevo() {
    const ok = await this.elegirQuien(true);
    if (!ok) { this.menu(); return; }
    const d = await elegir(this, this.inp, ['Fácil', 'Normal', 'Difícil'], { titulo: 'DIFICULTAD', y: 250, cancelar: true,
      detalles: ['Más tiempo y más ayuda. Ideal para las niñas', 'Como en la serie', 'Para los que no le temen a la muñeca'] });
    if (d < 0) { this.menu(); return; }
    E.dificultad = d;
    guardar();
    nuevaPartida(this);
  }

  /** la pantalla de ¿quién juega?: de eso depende la sangre. Devuelve false si se canceló con B */
  async elegirQuien(cancelable = false) {
    const W = this.scale.width, H = this.scale.height;
    const capa = this.add.container(0, 0).setDepth(100);
    capa.add(this.add.rectangle(W / 2, H / 2, W, H, 0x0b0a10, 1));
    capa.add(this.add.bitmapText(W / 2, 30, 'fuente_titulo', '¿QUIÉN JUEGA?').setOrigin(0.5).setTint(0x2fd4b4).setScale(1.5));
    const actores = [];
    FAMILIA.forEach((id, i) => {
      const x = 86 + i * 156;
      const marco = this.add.image(x, 136, 'marco_retrato_96');
      const ret = this.add.image(x, 136, 'ret_' + id, 'g_feliz');
      capa.add([marco, ret]);
      capa.add(texto(this, x, 204, nombre(id).toUpperCase(), { tam: 18, negrita: true, origen: [0.5, 0.5] }));
      capa.add(texto(this, x, 226, '#' + NUMEROS[id], { tam: 15, color: COLOR.verde, origen: [0.5, 0.5] }));
      if (NINAS.includes(id)) capa.add(texto(this, x, 248, 'sin sangre', { tam: 13, color: '#ff8fb5', origen: [0.5, 0.5] }));
      const zona = this.add.rectangle(x, 160, 140, 190, 0xffffff, 0).setInteractive({ useHandCursor: true });
      zona.on('pointerdown', () => { sel = i; pintar(); listo = true; });
      capa.add(zona);
      actores.push({ marco, ret });
    });
    capa.add(texto(this, W / 2, H - 62, this.inp.esTactil ? 'Toca a quien juega' : '← → elegir  ·  A: listo', { tam: 14, color: COLOR.apagado, origen: [0.5, 0.5] }));
    let sel = Math.max(0, FAMILIA.indexOf(E.perfil)), listo = false, frio = 0, cancelado = false, tocoVolver = false;
    if (cancelable) capa.add(botonVolver(this, W / 2, H - 28, () => { tocoVolver = true; }, { prof: 0, teclado: !this.inp.esTactil }));
    const cursor = this.add.image(0, 0, 'triangulo').setTint(0xff4d8d).setAngle(180);
    capa.add(cursor);
    const pintar = () => {
      actores.forEach((a, i) => { a.ret.setAlpha(i === sel ? 1 : 0.45); a.marco.setAlpha(i === sel ? 1 : 0.45); a.ret.setFrame(i === sel ? 'g_feliz' : 'g_neutral'); });
      cursor.setPosition(86 + sel * 156, 68);
    };
    pintar();
    await new Promise((ok) => {
      const f = (_, dt) => {
        frio -= dt;
        if (frio <= 0 && Math.abs(this.inp.x) > 0.5) { sel = (sel + (this.inp.x > 0 ? 1 : -1) + 4) % 4; pintar(); tono(660, 0.03, 'cuadrada', 0.05); frio = 180; }
        if (Math.abs(this.inp.x) <= 0.5) frio = 0;
        if (cancelable && (this.inp.tomarB() || this.inp.tomarPausa() || tocoVolver)) { cancelado = true; tono(660, 0.05, 'cuadrada', 0.06); this.events.off('update', f); ok(); return; }
        if (this.inp.aPulso) { const fisico = this.inp.aFisico; this.inp.tomarA(); if (fisico) listo = true; }
        if (listo) { this.events.off('update', f); ok(); }
      };
      this.time.delayedCall(150, () => cadaCuadro(this, f));
    });
    if (cancelado) { capa.destroy(); return false; }
    E.perfil = FAMILIA[sel];
    E.sangreManual = null;
    tono(990, 0.08, 'campana', 0.12);
    altavoz(`Jugador ${NUMEROS[E.perfil]}.`);
    guardar();
    this.time.delayedCall(400, () => capa.destroy());
    return true;
  }

  async practica() {
    const est = (k) => { const n = E.records[k] || 0; return n ? '  ' + '★'.repeat(n) + '☆'.repeat(3 - n) : ''; };
    const ops = JUEGOS.map((j, i) => `${i + 1}. ${CORTOS[i]}${est(j.k)}`);
    const r = await elegir(this, this.inp, ops, { titulo: 'PRÁCTICA', columnas: 2, cancelar: true, tam: 14, y: 196 });
    if (r < 0) { this.menu(); return; }
    const ok = await this.elegirQuien(true);
    if (!ok) { this.practica(); return; }
    this.cameras.main.fadeOut(300);
    this.time.delayedCall(320, () => this.scene.start(JUEGOS[r].k, { practica: true }));
  }

  async opciones() {
    for (;;) {
      const s = E.sangreManual === null ? 'Auto (según quién juega)' : E.sangreManual ? 'Sí' : 'No';
      const r = await elegir(this, this.inp, [
        `Dificultad: ${DIFICULTADES[E.dificultad]}`,
        `Sangre: ${s}`,
        `Volumen: ${Math.round(E.volumen * 10)}`,
        `Voz del altavoz: ${E.voz ? 'Sí' : 'No'}`,
        `Billetera de la familia: ${millones(E.billetera)} W`,
        'Volver',
      ], { titulo: 'OPCIONES', cancelar: true, y: 200 });
      if (r === 0) E.dificultad = (E.dificultad + 1) % 3;
      if (r === 1) E.sangreManual = E.sangreManual === null ? true : E.sangreManual ? false : null;
      if (r === 2) volumen(E.volumen >= 1 ? 0.2 : Math.round((E.volumen + 0.2) * 10) / 10);
      if (r === 3) { E.voz = !E.voz; if (E.voz) altavoz('Voz del altavoz activada.'); }
      guardar();
      if (r === 5 || r < 0) break;
    }
    this.menu();
  }
}
