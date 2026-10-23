// Juego 4: Las canicas. Con el abuelo 001 de compañero (gganbu). Cada uno tiene 10 canicas; gana quien se queda
// con las 20. Rondas de "par o impar" (se apuesta y se adivina) y de "al hoyo" (fuerza con A, el más cerca gana).

import Phaser from 'phaser';
import { Juego } from '../core/juego.js';
import { Actor } from '../core/actor.js';
import { E, dif, sangre } from '../core/estado.js';
import { sfx, tono, musica, pararMusica } from '../core/sonido.js';
import { eliminar, zzz } from '../core/efectos.js';
import { hablar, cartel, esperar, elegir } from '../core/dialogo.js';

const HOYO = [290, 210];
const COLORES = [0xe0457b, 0x23b39c, 0xf2c230, 0x5aa0ff, 0xffffff, 0xb58cff];

export class Canicas extends Juego {
  constructor() { super('Canicas'); }
  opcionesEntrada() { return { palanca: false }; }
  opcionesHud() { return { reloj: true }; }

  armar() {
    const W = this.scale.width, H = this.scale.height;
    this.add.image(W / 2, H / 2, 'canicas').setDepth(-100);
    this.crearJugador(220, 222, 'right');
    this.abuelo = new Actor(this, 'j_abuelo', 360, 222, { dir: 'left' });
    this.abuelo.anim('idle', 'left');
    // la familia mira desde la tienda
    this.crearFamilia([[300, 150, 'down'], [326, 154, 'down'], [352, 150, 'down']]);
    this.mias = 10; this.suyas = 10;
    this.cerrando = false;
    this.tiempo = dif(300, 240, 180);
    this.ronda = 0;
    // los marcadores
    this.add.rectangle(70, 40, 120, 34, 0x000000, 0.55).setDepth(800);
    this.add.rectangle(W - 70, 40, 120, 34, 0x000000, 0.55).setDepth(800);
    this.add.bitmapText(70, 28, 'fuente_ui', 'TÚ').setOrigin(0.5).setDepth(801).setTint(0x7fffe0);
    this.add.bitmapText(W - 70, 28, 'fuente_ui', 'ABUELO 001').setOrigin(0.5).setDepth(801).setTint(0xf2c230);
    this.tMias = this.add.bitmapText(70, 42, 'fuente_titulo', '10').setOrigin(0.5).setDepth(801);
    this.tSuyas = this.add.bitmapText(W - 70, 42, 'fuente_titulo', '10').setOrigin(0.5).setDepth(801);
    this.bolitas = this.add.graphics().setDepth(5);
  }

  marcar() {
    this.tMias.setText(String(this.mias));
    this.tSuyas.setText(String(this.suyas));
  }

  reglas() {
    return [
      ['guardia_cuadrado', 'neutral', 'Juego 4: las canicas. Cada uno tiene 10. Gana quien se quede con las 20 de su compañero.'],
      ['j_abuelo', 'feliz', 'Je, je. Tú y yo somos gganbu. Compañeros. Los gganbu comparten todo...'],
      ['j_abuelo', 'neutral', 'Juguemos a par o impar. Y de vez en cuando, al hoyo. ¿Te parece?'],
      [E.perfil, 'neutral', 'Dale, abuelo. Pero no me la ponga fácil.'],
    ];
  }

  empezar() {
    musica('flauta');
    this.siguiente();
  }

  paso(dt) {
    this.tiempo -= dt;
    this.hud.setTiempo(this.tiempo);
    if (this.tiempo <= 0 && !this.terminado && !this.cerrando) {
      this.cerrando = true;
      if (this.mias > this.suyas) this.finalGganbu();
      else this.perder('SE ACABÓ EL TIEMPO');
    }
  }

  async siguiente() {
    while (!this.terminado && !this.cerrando) {
      this.ronda++;
      if (this.ronda % 3 === 0) await this.alHoyo();
      else await this.parImpar(this.ronda % 2 === 1);
      if (this.terminado) return;
      this.marcar();
      if (this.cerrando || this.terminado) return;
      if (this.suyas <= 0) { this.cerrando = true; this.finalGganbu(); return; }
      if (this.mias <= 0) { this.cerrando = true; this.perder('TE QUEDASTE SIN CANICAS'); return; }
      await esperar(this, 400);
    }
  }

  async apuesta(maximo) {
    const ops = [];
    for (let i = 1; i <= Math.min(maximo, 5); i++) ops.push(`${i} ${i === 1 ? 'canica' : 'canicas'}`);
    return 1 + (await elegir(this, this.inp, ops, { titulo: '¿CUÁNTAS APUESTAS?', ancho: 170, y: 140 }));
  }

  mano(x, y, n, abierta) {
    const g = this.add.graphics().setDepth(900);
    g.fillStyle(0xc98e70); g.fillRoundedRect(x - 22, y - 14, 44, 28, 8);
    g.lineStyle(1, 0x5a2a23); g.strokeRoundedRect(x - 22, y - 14, 44, 28, 8);
    if (abierta) for (let i = 0; i < n; i++) { g.fillStyle(COLORES[i % COLORES.length]); g.fillCircle(x - 14 + (i % 4) * 9, y - 4 + Math.floor(i / 4) * 9, 3.5); g.fillStyle(0xffffff, 0.6); g.fillRect(x - 15 + (i % 4) * 9, y - 6 + Math.floor(i / 4) * 9, 1, 1); }
    return g;
  }

  async parImpar(abueloEsconde) {
    if (abueloEsconde) {
      // el abuelo esconde; yo apuesto y adivino
      const n = 1 + Math.floor(Math.random() * Math.min(this.suyas, 5));
      this.abuelo.anim('point', 'left');
      const pista = Math.random() < dif(0.75, 0.4, 0) ? (n % 2 ? 'Mmm... hoy me siento raro. Muy raro.' : 'Mmm... hoy estoy parejito, como el clima.') : 'Je, je. A ver si adivinas, gganbu.';
      await hablar(this, this.inp, [['j_abuelo', 'feliz', pista]]);
      const b = await this.apuesta(this.mias);
      const r = await elegir(this, this.inp, ['PAR', 'IMPAR'], { titulo: '¿PAR O IMPAR?', ancho: 150, y: 140 });
      const g = this.mano(320, 150, n, false);
      await esperar(this, 500);
      g.destroy();
      const g2 = this.mano(320, 150, n, true);
      tono(660, 0.08, 'campana', 0.1);
      const acierto = (n % 2 === 0) === (r === 0);
      await cartel(this, `${n}: ${n % 2 ? 'IMPAR' : 'PAR'}`, acierto ? `¡ganaste ${b}!` : `perdiste ${b}`, { ms: 1300, color: acierto ? 0x23b39c : 0xff8fb5 });
      g2.destroy();
      this.mover(acierto ? Math.min(b, this.suyas) : -b);
      if (!acierto && Math.random() < dif(0.4, 0.15, 0) && this.mias > 0) {
        await hablar(this, this.inp, [['j_abuelo', 'cerrado', 'Ay... ¿era par? Se me olvidó. Toma, quédate con una. Los viejos se confunden.']]);
        this.mover(1);
      }
    } else {
      // yo escondo; el abuelo apuesta y adivina
      const r = await elegir(this, this.inp, ['1', '2', '3', '4', '5'].slice(0, Math.min(5, this.mias)), { titulo: '¿CUÁNTAS ESCONDES?', ancho: 150, y: 140 });
      const n = r + 1;
      const b = Math.max(1, Math.min(this.suyas, this.mias, 1 + Math.floor(Math.random() * 3)));
      const dice = Math.random() < 0.5 ? 'PAR' : 'IMPAR';
      await hablar(this, this.inp, [['j_abuelo', 'neutral', `Apuesto ${b}. Digo... ${dice.toLowerCase()}.`]]);
      const g = this.mano(250, 150, n, true);
      const acierta = (n % 2 === 0) === (dice === 'PAR');
      await cartel(this, `${n}: ${n % 2 ? 'IMPAR' : 'PAR'}`, acierta ? `el abuelo gana ${b}` : `¡ganaste ${b}!`, { ms: 1300, color: acierta ? 0xff8fb5 : 0x23b39c });
      g.destroy();
      this.mover(acierta ? -Math.min(b, this.mias) : b);
    }
  }

  async alHoyo() {
    await cartel(this, 'AL HOYO', 'el más cerca gana 2', { ms: 1100, color: 0xf2c230, fondo: true });
    const W = this.scale.width;
    // la barra de fuerza
    const bx = W / 2 - 60, by = 92;
    const marco = this.add.nineslice(W / 2, by, 'barra_marco', undefined, 124, 10, 4, 4, 0, 0).setDepth(900);
    const ideal = 0.62;
    const zona = this.add.rectangle(bx + 120 * (ideal - 0.06), by - 3, 120 * 0.12, 6, 0x23b39c).setOrigin(0).setDepth(901);
    const aguja = this.add.rectangle(bx, by, 2, 12, 0xffffff).setDepth(902);
    const txt = this.add.bitmapText(W / 2, by - 16, 'fuente_ui', 'A: TIRA').setOrigin(0.5).setDepth(902);
    let v = 0, sube = 1;
    const vel = dif(0.9, 1.25, 1.6);
    await new Promise((ok) => {
      const f = (_, dt) => {
        v += sube * vel * dt / 1000;
        if (v > 1) { v = 1; sube = -1; } if (v < 0) { v = 0; sube = 1; }
        aguja.setX(bx + 120 * v);
        if (this.inp.tomarA()) { this.events.off('update', f); ok(); }
      };
      this.events.on('update', f);
    });
    [marco, zona, aguja, txt].forEach((o) => o.destroy());
    await this.jugador.hacer('throw', 'right');
    const mio = await this.rodar(this.jugador.x + 10, this.jugador.y - 6, (v - ideal) * 160);
    this.jugador.anim('idle', 'right');
    await this.abuelo.hacer('throw', 'left');
    const err = (Math.random() - 0.5) * dif(90, 60, 36);
    const suyo = await this.rodar(this.abuelo.x - 10, this.abuelo.y - 6, err, true);
    this.abuelo.anim('idle', 'left');
    const gano = mio < suyo;
    await cartel(this, gano ? '¡MÁS CERCA!' : 'EL ABUELO GANA', '', { ms: 1100, color: gano ? 0x23b39c : 0xff8fb5, fondo: true });
    this.mover(gano ? Math.min(2, this.suyas) : -Math.min(2, this.mias));
    this.bolitas.clear();
  }

  /** rueda una canica hacia el hoyo; err es cuánto se pasa o se queda (px). Devuelve la distancia final */
  rodar(x, y, err, delAbuelo = false) {
    return new Promise((ok) => {
      const c = this.add.circle(x, y, 2.5, delAbuelo ? 0xf2c230 : 0x5aa0ff).setDepth(300);
      const dx = HOYO[0] + err, dy = HOYO[1] + (Math.random() - 0.5) * 8;
      sfx(this, 'lanzar', 0.4);
      this.tweens.add({
        targets: c, x: dx, y: dy, duration: 700, ease: 'Quad.easeOut',
        onComplete: () => {
          sfx(this, 'chapa', 0.3);
          const d = Math.hypot(dx - HOYO[0], dy - HOYO[1]);
          this.bolitas.fillStyle(delAbuelo ? 0xf2c230 : 0x5aa0ff); this.bolitas.fillCircle(dx, dy, 2.5);
          c.destroy();
          ok(d);
        },
      });
    });
  }

  mover(n) {
    if (n > 0) { this.mias += n; this.suyas -= n; tono(1046, 0.08, 'campana', 0.1); this.jugador.anim('celebrate', 'right'); }
    if (n < 0) { this.mias += n; this.suyas -= n; tono(220, 0.12, 'cuadrada', 0.08); this.jugador.anim('sad', 'right'); }
    this.mias = Phaser.Math.Clamp(this.mias, 0, 20); this.suyas = 20 - this.mias;
    this.marcar();
    this.time.delayedCall(900, () => this.jugador.vivo && this.jugador.anim('idle', 'right'));
  }

  async finalGganbu() {
    this.jugando = false;
    pararMusica();
    await hablar(this, this.inp, [
      ['j_abuelo', 'triste', 'Se me acabaron las canicas. Me ganaste limpio, gganbu.'],
      ['j_abuelo', 'feliz', 'Toma. Esta última es tuya también. Gracias por jugar conmigo. Hace años no me divertía tanto.'],
      [E.perfil, 'triste', 'Abuelo... ¿y ahora qué le va a pasar?'],
      ['j_abuelo', 'feliz', 'Está bien. Todo está bien. Gana por mí, ¿sí?'],
    ]);
    // el abuelo se va caminando por el callejón
    this.abuelo.anim('walk', 'up');
    await new Promise((ok) => this.tweens.add({ targets: this.abuelo, px: 270, py: 120, duration: 2600, onComplete: ok }));
    if (sangre()) {
      await esperar(this, 400);
      sfx(this, 'pistola', 0.6);
      this.abuelo.setVisible(false);
    } else {
      this.abuelo.anim('knockout', 'down');
      zzz(this, this.abuelo, 4);
    }
    this.contarEliminado();
    await esperar(this, 1200);
    this.ganar({ texto: 'GANASTE', lineas: [['steph', 'triste', 'Era tan buena gente... Vamos a ganar por él.']] });
  }
}
