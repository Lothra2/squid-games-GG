import Phaser from 'phaser';
// Título, menú, elegir quién juega y la dificultad, y el modo práctica (los juegos ya desbloqueados).

import { E, FAMILIA, NUMEROS, DIFICULTADES, NINAS, guardar, hayPartida, nombre, sangre } from '../core/estado.js';
import { Entrada } from '../core/entrada.js';
import { elegir, esperar } from '../core/dialogo.js';
import { musica, despertar, tono, volumen, iniciarAudio } from '../core/sonido.js';
import { nuevaPartida, irAPaso, JUEGOS, SECUENCIA, PRIMER_JUEGO } from '../core/flujo.js';
import { Actor } from '../core/actor.js';

export function logo(scene, x, y, escala = 1) {
  const objs = [];
  const prof = 50;
  objs.push(scene.add.bitmapText(x, y - 22 * escala, 'fuente_ui', 'EL JUEGO DEL').setOrigin(0.5).setScale(escala * 2).setDepth(prof).setTint(0xffffff));
  const c = scene.add.bitmapText(x, y + 8 * escala, 'fuente_titulo', 'CALAMAR').setOrigin(0.5).setScale(escala * 2).setDepth(prof).setTint(0xff3d7f);
  objs.push(c);
  const gg = scene.add.bitmapText(x, y + 36 * escala, 'fuente_titulo_plata', 'FAMILIA GG').setOrigin(0.5).setScale(escala).setDepth(prof);
  objs.push(gg);
  ['circulo', 'triangulo', 'cuadrado'].forEach((s, i) => {
    const im = scene.add.image(x + (i - 1) * 22 * escala, y + 56 * escala, s).setTint(0xff3d7f).setDepth(prof).setScale(escala);
    objs.push(im);
    scene.tweens.add({ targets: im, alpha: 0.35, duration: 700, yoyo: true, repeat: -1, delay: i * 230 });
  });
  scene.tweens.add({ targets: c, alpha: 0.82, duration: 1100, yoyo: true, repeat: -1 });
  return objs;
}

export class Titulo extends Phaser.Scene {
  constructor() { super('Titulo'); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.fadeIn(600);
    this.add.image(W / 2, H / 2, 'titulo');
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.25);
    logo(this, W / 2, 70);
    this.inp = new Entrada(this, { tactil: false });
    this.pie = this.add.bitmapText(W / 2, H - 30, 'fuente_ui', 'TOCA O APRIETA ESPACIO').setOrigin(0.5);
    this.tweens.add({ targets: this.pie, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
    this.add.bitmapText(W - 4, H - 10, 'fuente_ui', 'v1 · Familia GG').setOrigin(1, 0).setTint(0x8a8a9a);
    this.esperando = true;
  }

  update() {
    if (this.esperando && this.inp.tomarA()) {
      this.esperando = false;
      iniciarAudio(this);
      despertar();
      tono(880, 0.1, 'campana', 0.15);
      musica('flauta');
      this.pie.destroy();
      this.menu();
    }
  }

  async menu() {
    const ops = [];
    if (hayPartida() && E.paso > 0 && E.paso < SECUENCIA.length) ops.push(['Continuar', 'continuar']);
    ops.push(['Nuevo juego', 'nuevo']);
    if (E.maxPaso >= PRIMER_JUEGO) ops.push(['Juegos (práctica)', 'practica']);
    ops.push(['Opciones', 'opciones']);
    const r = await elegir(this, this.inp, ops.map((o) => o[0]), { y: 192, ancho: 180 });
    const k = ops[r][1];
    if (k === 'continuar') irAPaso(this, E.paso);
    if (k === 'nuevo') this.nuevo();
    if (k === 'practica') this.practica();
    if (k === 'opciones') this.opciones();
  }

  async nuevo() {
    const W = this.scale.width, H = this.scale.height;
    const capa = this.add.container(0, 0).setDepth(100);
    capa.add(this.add.rectangle(W / 2, H / 2, W, H, 0x0b0a10, 0.92));
    capa.add(this.add.bitmapText(W / 2, 14, 'fuente_titulo', '¿QUIÉN JUEGA?').setOrigin(0.5, 0).setTint(0x23b39c));
    const actores = [];
    FAMILIA.forEach((id, i) => {
      const x = 60 + i * 120;
      const marco = this.add.image(x, 96, 'marco_retrato_96');
      const ret = this.add.image(x, 96, 'ret_' + id, 'g_feliz');
      capa.add([marco, ret]);
      capa.add(this.add.bitmapText(x, 158, 'fuente_ui', nombre(id).toUpperCase()).setOrigin(0.5));
      capa.add(this.add.bitmapText(x, 170, 'fuente_ui', 'Nº ' + NUMEROS[id]).setOrigin(0.5).setTint(0x23b39c));
      if (NINAS.includes(id)) capa.add(this.add.bitmapText(x, 182, 'fuente_ui', 'sin sangre').setOrigin(0.5).setTint(0xff8fb5));
      ret.setInteractive().on('pointerdown', () => { sel = i; pintar(); listo = true; });
      actores.push({ marco, ret });
    });
    let sel = Math.max(0, FAMILIA.indexOf(E.perfil)), listo = false, frio = 0;
    const cursor = this.add.image(0, 0, 'triangulo').setTint(0xe0457b).setAngle(180);
    capa.add(cursor);
    const pintar = () => {
      actores.forEach((a, i) => { a.ret.setAlpha(i === sel ? 1 : 0.5); a.marco.setAlpha(i === sel ? 1 : 0.5); a.ret.setFrame(i === sel ? 'g_feliz' : 'g_neutral'); });
      cursor.setPosition(60 + sel * 120, 36);
    };
    pintar();
    await new Promise((ok) => {
      const f = (_, dt) => {
        frio -= dt;
        if (frio <= 0 && Math.abs(this.inp.x) > 0.5) { sel = (sel + (this.inp.x > 0 ? 1 : -1) + 4) % 4; pintar(); tono(660, 0.03, 'cuadrada', 0.05); frio = 180; }
        if (Math.abs(this.inp.x) <= 0.5) frio = 0;
        if (this.inp.tomarA() || listo) { this.events.off('update', f); ok(); }
      };
      this.time.delayedCall(150, () => this.events.on('update', f));
    });
    E.perfil = FAMILIA[sel];
    E.sangreManual = null;
    tono(990, 0.08, 'campana', 0.12);
    const d = await elegir(this, this.inp, ['Fácil', 'Normal', 'Difícil'], { titulo: 'DIFICULTAD', y: 214, ancho: 150 });
    E.dificultad = d;
    E.maxPaso = Math.max(E.maxPaso, 0);
    guardar();
    nuevaPartida(this);
  }

  async practica() {
    const lista = JUEGOS.map((j, i) => ({ j, paso: SECUENCIA.findIndex((s) => s.k === j.k) })).filter((x) => x.paso <= E.maxPaso);
    const r = await elegir(this, this.inp, [...lista.map((x, i) => `${i + 1}. ${x.j.titulo}`), 'Volver'], { titulo: 'PRÁCTICA', ancho: 260 });
    if (r >= lista.length) { this.menu(); return; }
    this.cameras.main.fadeOut(300);
    this.time.delayedCall(320, () => this.scene.start(lista[r].j.k, { practica: true }));
  }

  async opciones() {
    for (;;) {
      const s = E.sangreManual === null ? 'Auto (según quién juega)' : E.sangreManual ? 'Sí' : 'No';
      const r = await elegir(this, this.inp, [
        `Quién juega: ${nombre(E.perfil)}`,
        `Dificultad: ${DIFICULTADES[E.dificultad]}`,
        `Sangre: ${s}`,
        `Volumen: ${Math.round(E.volumen * 10)}`,
        'Volver',
      ], { titulo: 'OPCIONES', ancho: 250 });
      if (r === 0) E.perfil = FAMILIA[(FAMILIA.indexOf(E.perfil) + 1) % 4];
      if (r === 1) E.dificultad = (E.dificultad + 1) % 3;
      if (r === 2) E.sangreManual = E.sangreManual === null ? true : E.sangreManual ? false : null;
      if (r === 3) volumen(E.volumen >= 1 ? 0.2 : Math.round((E.volumen + 0.2) * 10) / 10);
      guardar();
      if (r === 4) break;
    }
    this.menu();
  }
}
