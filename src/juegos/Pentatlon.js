// Juego 5: Pentatlón de seis piernas (temporada 2). Cinco amarrados por los tobillos pasan por cinco juegos
// coreanos: ddakji, piedra voladora, gonggi, trompo y jegi. Cada uno lo hace uno del equipo; tú controlas todos.
// Si uno falla, se repite. Hay un solo reloj para los cinco.

import Phaser from 'phaser';
import { Juego } from '../core/juego.js';
import { Actor } from '../core/actor.js';
import { E, dif, nombre, NUMEROS } from '../core/estado.js';
import { sfx, tono, musica } from '../core/sonido.js';
import { eliminar, sacudir, chorro } from '../core/efectos.js';
import { cartel, esperar, hablar } from '../core/dialogo.js';
import { barra, atrapar, machacar } from '../core/mini.js';
import { texturasDdakji } from '../escenas/Historia.js';

// estación: dónde se para el equipo, quién juega y el nombre
const ESTACIONES = [
  { id: 'ddakji', x: 120, y: 200, titulo: 'DDAKJI', quien: 'rick' },
  { id: 'piedra', x: 175, y: 140, titulo: 'PIEDRA VOLADORA', quien: 'steph' },
  { id: 'gonggi', x: 290, y: 150, titulo: 'GONGGI', quien: 'sophie' },
  { id: 'trompo', x: 230, y: 235, titulo: 'TROMPO', quien: 'alana' },
  { id: 'jegi', x: 395, y: 232, titulo: 'JEGI', quien: 'yo' },
];

export class Pentatlon extends Juego {
  constructor() { super('Pentatlon'); }
  opcionesEntrada() { return { palanca: false }; }

  armar() {
    const W = this.scale.width, H = this.scale.height;
    texturasDdakji(this);
    this.add.image(W / 2, H / 2, 'pentatlon').setDepth(-100);
    // el quinto del equipo: un jugador del 120
    this.equipo = ['rick', 'steph', 'sophie', 'alana', 'j_camila'].map((id, i) => new Actor(this, id, 40 + i * 13, 245, { dir: 'right' }));
    this.jugador = this.equipo.find((a) => a.id === E.perfil);
    this.jugador.ponerNumero(NUMEROS[E.perfil], 0x7fffe0); this.jugador.ponerFlecha();
    this.familia = this.equipo.filter((a) => a !== this.jugador && a.id !== 'j_camila');
    this.cinta = this.add.graphics().setDepth(2000);
    this.tiempo = dif(150, 120, 95);
    this.hechas = 0;
  }

  /** la cuerda de los tobillos */
  pintarCinta() {
    const g = this.cinta;
    g.clear();
    g.lineStyle(1, 0xf2f0e8);
    for (let i = 0; i < this.equipo.length - 1; i++) {
      const a = this.equipo[i], b = this.equipo[i + 1];
      g.lineBetween(a.x, a.y - 3, b.x, b.y - 3);
    }
  }

  reglas() {
    return [
      ['guardia_cuadrado', 'neutral', 'Juego 5: pentatlón de seis piernas. Equipos de cinco, amarrados por los tobillos.'],
      ['guardia_cuadrado', 'neutral', 'Cinco juegos: ddakji, piedra voladora, gonggi, trompo y jegi. Un solo reloj para todos.'],
      ['steph', 'neutral', 'Cada uno hace uno. Rick el ddakji, yo la piedra, Sophie el gonggi y Alana el trompo.'],
      ['j_camila', 'feliz', 'Y el jegi lo hace ' + nombre(E.perfil) + '. Yo solo camino al ritmo, ¡prometo no tumbarlos!'],
    ];
  }

  empezar() {
    musica('guardias');
    this.correrEstaciones();
  }

  paso(dt) {
    this.tiempo -= dt;
    this.hud.setTiempo(this.tiempo);
    this.pintarCinta();
    if (this.tiempo <= 0 && !this.terminado) {
      this.perder('SE ACABÓ EL TIEMPO');
    }
  }

  /** el equipo camina amarrado hasta la estación */
  caminar(x, y) {
    return new Promise((ok) => {
      const dur = 900;
      this.equipo.forEach((a, i) => {
        const tx = x - 26 + i * 13, ty = y + (i % 2) * 3;
        a.mirar(tx - a.x, ty - a.y); a.anim('walk');
        this.tweens.add({ targets: a, px: tx, py: ty, duration: dur, onComplete: () => a.anim('idle', 'right') });
      });
      sfx(this, 'paso_tierra_1', 0.3);
      this.time.delayedCall(dur + 30, ok);
    });
  }

  async correrEstaciones() {
    for (const est of ESTACIONES) {
      if (this.terminado) return;
      await this.caminar(est.x, est.y);
      const quien = est.quien === 'yo' ? E.perfil : est.quien;
      const actor = this.equipo.find((a) => a.id === quien) || this.jugador;
      this.hud.setExtra(`${est.titulo} · le toca a ${nombre(quien)}`, 0xf2c230);
      let ok = false;
      while (!ok && !this.terminado) {
        ok = await this[est.id](actor);
        if (this.terminado) return;
        if (!ok) { tono(200, 0.15, 'cuadrada', 0.08); actor.anim('sad'); await cartel(this, '¡OTRA VEZ!', 'el reloj sigue corriendo', { ms: 900, color: 0xff8fb5 }); }
      }
      this.hechas++;
      actor.anim('celebrate');
      tono(1320, 0.15, 'campana', 0.12);
      await cartel(this, `${this.hechas} / 5`, est.titulo + ' ¡listo!', { ms: 900, color: 0x23b39c });
    }
    if (!this.terminado) this.ganar({ lineas: [['alana', 'feliz', '¡Mi trompo fue el que más giró! ¿Vieron? ¿Vieron?']] });
  }

  // --- los cinco juegos ---

  async ddakji(a) {
    const W = this.scale.width;
    const rojo = this.add.image(a.x + 30, a.y - 4, 'ddakji_rojo').setScale(0.5).setDepth(a.y + 1);
    const r = await barra(this, this.inp, { vel: dif(1.1, 1.5, 1.9), ideal: 0.85, ancho: dif(0.22, 0.16, 0.11), texto: 'A: TIRA EL SOBRE' });
    await a.hacer('cap_pitch', 'right');
    sfx(this, 'chapa', 0.7);
    const ok = r.ok || Math.random() < 0.15;
    if (ok) { this.tweens.add({ targets: rojo, scaleY: 0, duration: 120, yoyo: true, onYoyo: () => rojo.setTexture('ddakji_rojo_atras') }); }
    await esperar(this, 500);
    rojo.destroy();
    return ok;
  }

  async piedra(a) {
    const b1 = await barra(this, this.inp, { vel: dif(0.9, 1.2, 1.5), ideal: 0.5, ancho: dif(0.24, 0.18, 0.13), texto: 'A: APUNTA' });
    const b2 = await barra(this, this.inp, { vel: dif(1.1, 1.4, 1.8), ideal: 0.75, ancho: dif(0.24, 0.18, 0.13), texto: 'A: FUERZA' });
    await a.hacer('tejo_throw', 'up');
    const piedra = this.add.circle(a.x, a.y - 20, 3, 0x9aa3ae).setDepth(3000);
    const ok = b1.ok && b2.ok;
    const destino = [ok ? 115 : 115 + (b1.v - 0.5) * 80, ok ? 92 : 70];
    await new Promise((res) => this.tweens.add({ targets: piedra, x: destino[0], y: destino[1], duration: 500, ease: 'Sine.easeOut', onComplete: res }));
    sfx(this, ok ? 'golpe' : 'paso_tierra_0', 0.6);
    if (ok) chorro(this, destino[0], destino[1], 10, [0x9aa3ae, 0x6a7078], 60, { g: 200 });
    piedra.destroy();
    return ok;
  }

  async gonggi(a) {
    a.anim('throw', 'up');
    return atrapar(this, this.inp, { veces: 3, vel: dif(0.9, 1.15, 1.4), zona: dif(0.2, 0.15, 0.11), texto: 'A: ATRAPA LAS PIEDRITAS', color: 0x5aa0ff });
  }

  async trompo(a) {
    const enrollado = await machacar(this, this.inp, { golpes: dif(12, 16, 20), segundos: 3, texto: '¡MACHACA A! ENROLLA LA CUERDA' });
    if (!enrollado) return false;
    const r = await barra(this, this.inp, { vel: dif(1, 1.4, 1.8), ideal: 0.7, ancho: dif(0.24, 0.17, 0.12), texto: 'A: ¡LANZA!' });
    await a.hacer('throw', 'right');
    // el trompo gira
    const t = this.add.graphics().setDepth(3000);
    const x = a.x + 26, y = a.y - 2;
    let ang = 0;
    const dur = r.ok ? 1800 : 600;
    const ev = this.time.addEvent({ delay: 30, loop: true, callback: () => {
      ang += 0.6; t.clear();
      t.fillStyle(0xe0457b); t.fillTriangle(x - 6, y - 6, x + 6, y - 6, x, y + 3);
      t.fillStyle(0xf2c230); t.fillRect(x - 6 + Math.round(Math.sin(ang) * 4) + 4, y - 7, 2, 2);
    } });
    await esperar(this, dur);
    ev.remove(); t.destroy();
    return r.ok;
  }

  async jegi(a) {
    a.anim('shuttle_juggle', 'right');
    const ok = await atrapar(this, this.inp, { veces: dif(3, 4, 5), vel: dif(0.85, 1.05, 1.25), zona: dif(0.2, 0.15, 0.11), texto: 'A: ¡PATEA EL JEGI!', color: 0xe0457b });
    a.anim('idle');
    return ok;
  }
}
