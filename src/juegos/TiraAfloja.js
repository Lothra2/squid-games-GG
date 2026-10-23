// Juego 3: Tira y afloja. Dos equipos de 10 en dos torres, con una cuerda sobre el vacío.
// Se jala con ritmo: A cuando el anillo cierra sobre el círculo. Al pitazo, A para inclinarse.
// El abuelo 001 grita "¡tres pasos adelante!": derecha tres veces rápido y el otro equipo se va de boca.

import Phaser from 'phaser';
import { Juego } from '../core/juego.js';
import { Actor } from '../core/actor.js';
import { E, dif, familiaNPC, NUMEROS } from '../core/estado.js';
import { sfx, tono, musica } from '../core/sonido.js';
import { eliminar, sacudir, fxSobre } from '../core/efectos.js';
import { cartel, esperar } from '../core/dialogo.js';
import { jugadoresNPC } from '../core/kit.js';

const PISO = 130, CENTRO = 240;

export class TiraAfloja extends Juego {
  constructor() { super('TiraAfloja'); }
  opcionesEntrada() { return { palanca: false }; }

  armar() {
    const W = this.scale.width, H = this.scale.height;
    this.add.image(W / 2, H / 2, 'tira').setDepth(-100);
    // la cuerda
    this.cuerda = this.add.graphics().setDepth(400);
    // nuestro equipo: la familia, el abuelo y otros (de la cuerda hacia atrás)
    const ids = jugadoresNPC();
    const nuestros = [E.perfil, ...familiaNPC(), 'j_abuelo', ids[0], ids[3], ids[6], ids[9], ids[12]];
    this.equipo = nuestros.map((id, i) => {
      const a = new Actor(this, id, 0, PISO, { dir: 'right' });
      a.base = 176 - i * 17;
      return a;
    });
    this.jugador = this.equipo[0];
    this.jugador.ponerNumero(NUMEROS[E.perfil], 0x7fffe0);
    this.jugador.ponerFlecha();
    this.familia = this.equipo.slice(1, 4);
    this.rivales = ids.slice(4, 14).map((id, i) => {
      const a = new Actor(this, id, 0, PISO, { dir: 'left' });
      a.base = 304 + i * 17;
      a.anim('idle', 'left');
      return a;
    });
    this.r = 0; // la cuerda: positivo hacia nosotros, 1 = ganamos
    this.tiempo = dif(70, 60, 50);
    this.compas = dif(0.8, 0.66, 0.55);
    this.tBeat = this.compas;
    this.fuerzas = [0.6, 0.6, 0.6, 0.6];
    this.oleada = 0;
    this.tOleada = 6;
    this.trucoHecho = false;
    this.truco = null;
    this.tropiezo = 0;
    // el anillo de ritmo
    const y = 222;
    this.add.rectangle(W / 2, y, 160, 44, 0x000000, 0.5).setDepth(800);
    this.objetivo = this.add.circle(W / 2, y, 11).setStrokeStyle(2, 0xffffff).setDepth(801);
    this.anillo = this.add.circle(W / 2, y, 30).setStrokeStyle(2, 0xf2c230).setDepth(801);
    this.calif = this.add.bitmapText(W / 2, y - 30, 'fuente_ui', '').setOrigin(0.5).setDepth(802);
    this.ayuda = this.add.bitmapText(W / 2, y + 16, 'fuente_ui', 'A: ¡JALA!').setOrigin(0.5).setDepth(802);
    // el medidor de la cuerda
    this.add.rectangle(W / 2, 30, 200, 6, 0x333344).setDepth(800);
    this.add.rectangle(W / 2, 30, 2, 12, 0xffffff).setDepth(801);
    this.marca = this.add.rectangle(W / 2, 30, 6, 10, 0xe0457b).setDepth(802);
    this.colocar();
  }

  colocar() {
    const d = this.r * 70;
    this.equipo.forEach((a) => { if (a.vivo) a.x = a.base - d; });
    this.rivales.forEach((a) => { if (a.vivo) a.x = a.base - d; });
    const g = this.cuerda;
    g.clear();
    g.lineStyle(3, 0x8a6a3a);
    const x0 = this.equipo[this.equipo.length - 1].x - 6, x1 = this.rivales[this.rivales.length - 1].x + 6;
    g.lineBetween(x0, PISO - 22, x1, PISO - 22);
    g.lineStyle(1, 0xc8a46a); g.lineBetween(x0, PISO - 23, x1, PISO - 23);
    // la cinta roja del medio
    g.fillStyle(0xe0457b); g.fillRect(CENTRO - d - 2, PISO - 26, 4, 9);
    this.marca.x = this.scale.width / 2 + this.r * 98;
  }

  reglas() {
    return [
      ['guardia_cuadrado', 'neutral', 'Juego 3: tira y afloja. El equipo que caiga al vacío queda eliminado.'],
      ['j_abuelo', 'feliz', 'Yo jugaba esto de niño. Escúchenme bien, que tengo tres trucos.'],
      ['j_abuelo', 'neutral', 'Uno: cuando suene el pitazo, échense para atrás. A apenas suene.'],
      ['j_abuelo', 'neutral', 'Dos: jalen todos al mismo ritmo. A cuando el anillo amarillo cierre en el círculo.'],
      ['j_abuelo', 'neutral', 'Tres: cuando yo grite, den tres pasos adelante. Derecha, derecha, derecha. Se van a ir de boca.'],
    ];
  }

  async antesDeEmpezar() {
    this.equipo.forEach((a) => a.anim('judo_grip', 'right'));
    this.rivales.forEach((a) => a.anim('judo_grip', 'left'));
    await cartel(this, 'LISTOS...', '', { ms: 900 + Math.random() * 900, fondo: false });
    // el pitazo: A rápido para inclinarse
    sfx(this, 'pitazo_largo', 0.7);
    this.hud.setExtra('¡AHORA! ¡A!', 0xf2c230);
    const t0 = this.time.now;
    let ok = false;
    await new Promise((res) => {
      const f = () => {
        if (this.inp.tomarA()) { ok = this.time.now - t0 < 700; this.events.off('update', f); res(); }
        if (this.time.now - t0 > 1200) { this.events.off('update', f); res(); }
      };
      this.events.on('update', f);
    });
    if (ok) { this.r = 0.2; tono(1320, 0.15, 'campana', 0.12); this.hud.setExtra('¡BUENA INCLINADA!', 0x23b39c); }
    else { this.r = -0.15; this.hud.setExtra('Tarde...', 0xff8fb5); }
    this.colocar();
  }

  empezar() { musica('guardias'); }

  paso(dt) {
    this.tiempo -= dt;
    this.hud.setTiempo(this.tiempo);

    // el ritmo
    this.tBeat -= dt;
    const fase = this.tBeat / this.compas; // 1 -> 0
    this.anillo.setRadius(11 + 22 * Math.max(0, fase));
    if (this.inp.tomarA() && !this.truco) {
      const err = Math.min(Math.abs(this.tBeat), Math.abs(this.compas - this.tBeat));
      let f, txt, col;
      if (err < dif(0.11, 0.08, 0.06)) { f = 1.05; txt = '¡PERFECTO!'; col = 0x23b39c; tono(1046, 0.06, 'campana', 0.1); }
      else if (err < dif(0.22, 0.16, 0.12)) { f = 0.7; txt = 'BIEN'; col = 0xf2c230; tono(784, 0.05, 'cuadrada', 0.06); }
      else { f = 0.15; txt = 'FUERA DE RITMO'; col = 0xff4d6d; tono(200, 0.08, 'cuadrada', 0.06); }
      this.fuerzas.push(f); this.fuerzas.shift();
      this.calif.setText(txt).setTint(col).setAlpha(1);
      this.tweens.add({ targets: this.calif, alpha: 0, duration: 500 });
      this.jugador.anim('grab_hold', 'right', true);
      this.time.delayedCall(200, () => this.jugador.vivo && this.jugador.anim('judo_grip', 'right'));
      this.yaJalo = true;
    }
    if (this.tBeat <= 0) {
      this.tBeat += this.compas;
      if (!this.yaJalo) { this.fuerzas.push(0.25); this.fuerzas.shift(); }
      this.yaJalo = false;
      sfx(this, 'paso_tierra_0', 0.25);
    }
    const nuestra = this.fuerzas.reduce((a, b) => a + b, 0) / 4;

    // las oleadas del otro equipo
    this.tOleada -= dt;
    if (this.tOleada <= 0 && this.oleada <= 0) {
      this.oleada = 1.6; this.tOleada = 5 + Math.random() * 4;
      this.hud.setExtra('¡ELLOS JALAN DURO!', 0xff4d6d);
      sacudir(this, 300, 0.004);
    }
    let rival = dif(0.6, 0.7, 0.8) + (this.oleada > 0 ? dif(0.35, 0.45, 0.55) : 0);
    if (this.oleada > 0) { this.oleada -= dt; if (this.oleada <= 0) this.hud.setExtra(''); }

    // el truco de los tres pasos
    if (!this.trucoHecho && !this.truco && (this.r < -0.25 || this.tiempo < dif(45, 38, 30))) {
      this.truco = { t: dif(2.6, 2, 1.6), n: 0, soltado: true };
      this.hud.setExtra('001: ¡TRES PASOS ADELANTE! → → →', 0xf2c230);
      fxSobre(this, this.equipo[4], 'exclamacion');
      tono(880, 0.1, 'metal', 0.15);
    }
    if (this.truco) {
      const tr = this.truco;
      tr.t -= dt;
      if (this.inp.x > 0.5 && tr.soltado) { tr.n++; tr.soltado = false; tono(600 + tr.n * 200, 0.05, 'cuadrada', 0.08); this.r -= 0.05; }
      if (this.inp.x <= 0.3) tr.soltado = true;
      if (tr.n >= 3) {
        this.truco = null; this.trucoHecho = true;
        this.tropiezo = 2.2;
        this.hud.setExtra('¡SE FUERON DE BOCA!', 0x23b39c);
        this.rivales.forEach((a) => a.vivo && a.anim('stagger', 'left', true));
        sacudir(this, 300, 0.01);
        sfx(this, 'publico_ooh', 0.4);
      } else if (tr.t <= 0) {
        this.truco = null; this.trucoHecho = true;
        this.hud.setExtra('No dio tiempo...', 0xff8fb5);
      }
    }
    if (this.tropiezo > 0) {
      this.tropiezo -= dt;
      rival = -0.4;
      if (this.tropiezo <= 0) this.rivales.forEach((a) => a.vivo && a.anim('judo_grip', 'left'));
    }

    this.r += (nuestra - rival) * dt * 0.2;
    this.colocar();

    if (this.r >= 1) this.ganarTira();
    else if (this.r <= -1) this.perderTira();
    else if (this.tiempo <= 0) (this.r > 0 ? this.ganarTira() : this.perderTira());
  }

  async ganarTira() {
    this.jugando = false;
    sfx(this, 'publico_grito', 0.4);
    // el otro equipo cae al vacío
    for (const [i, a] of this.rivales.entries()) {
      this.time.delayedCall(i * 90, () => { this.contarEliminado(); eliminar(this, a, { modo: 'caida', dy: 160, sonido: i === 0 }); });
    }
    await esperar(this, 1600);
    this.cuerda.clear();
    this.ganar({ lineas: [['j_abuelo', 'feliz', '¡Je, je! ¿Vieron? Los viejos todavía servimos para algo.']] });
  }

  async perderTira() {
    this.jugando = false;
    // nuestro equipo cae (la familia se agarra del borde: el jugador es el que se cae)
    this.equipo.slice(4).forEach((a, i) => this.time.delayedCall(i * 90, () => eliminar(this, a, { modo: 'caida', dy: 160, sonido: false })));
    this.familia.forEach((f) => f.anim('edge_teeter', 'right'));
    this.perder('AL VACÍO', { modo: 'caida', dy: 160 });
  }
}
