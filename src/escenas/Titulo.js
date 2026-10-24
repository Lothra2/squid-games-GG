// Título, menú, elegir quién juega y la dificultad, la práctica (todos los juegos, con tus estrellas) y opciones.

import Phaser from 'phaser';
import { E, FAMILIA, NUMEROS, DIFICULTADES, NINAS, guardar, hayPartida, nombre, millones } from '../core/estado.js';
import { Entrada } from '../core/entrada.js';
import { elegir } from '../core/dialogo.js';
import { musica, despertar, tono, volumen, iniciarAudio } from '../core/sonido.js';
import { nuevaPartida, irAPaso, JUEGOS, SECUENCIA } from '../core/flujo.js';
import { texto, COLOR, atmosfera, cadaCuadro } from '../core/ui.js';
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
    this.cameras.main.fadeIn(600);
    this.add.image(W / 2, H / 2, 'titulo');
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.3);
    atmosfera(this, { vineta: 0.6, motas: 24, color: 0xff9ac0 });
    this.logo = logo(this, W / 2, 96, 1, false);
    this.inp = new Entrada(this, { tactil: false });
    this.pie = texto(this, W / 2, H - 40, 'TOCA LA PANTALLA O APRIETA ESPACIO', { tam: 16, negrita: true, origen: [0.5, 0.5] });
    this.tweens.add({ targets: this.pie, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
    texto(this, W - 8, H - 10, 'v2 · Familia GG', { tam: 11, color: COLOR.apagado, origen: [1, 0.5] });
    this.esperando = true;
    // si ya tocaron antes (volviendo de un juego), directo al menú
    if (this.datos.abrir || this.sys.game.__yaToco) { this.esperando = false; this.pie.destroy(); musica('flauta'); this.time.delayedCall(80, () => (this.datos.abrir === 'practica' ? this.practica() : this.menu())); }
  }

  update() {
    if (this.esperando && this.inp.tomarA()) {
      this.esperando = false;
      this.sys.game.__yaToco = true;
      iniciarAudio(this);
      despertar();
      tono(880, 0.1, 'campana', 0.15);
      musica('flauta');
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
    capa.add(texto(this, W / 2, H - 30, this.inp.esTactil ? 'Toca a quien juega' : '← → elegir  ·  A: listo' + (cancelable ? '  ·  B: volver' : ''), { tam: 14, color: COLOR.apagado, origen: [0.5, 0.5] }));
    let sel = Math.max(0, FAMILIA.indexOf(E.perfil)), listo = false, frio = 0, cancelado = false;
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
        if (cancelable && this.inp.tomarB()) { cancelado = true; this.events.off('update', f); ok(); return; }
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
