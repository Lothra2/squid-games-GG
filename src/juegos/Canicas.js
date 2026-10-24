// Juego 4: Las canicas. Con el abuelo 001 de compañero (gganbu). Cada uno tiene 10 canicas; gana quien se queda
// con las 20. Rondas de "par o impar" (se apuesta y se adivina) y de "al hoyo" (fuerza con A, el más cerca gana).

import Phaser from 'phaser';
import { Juego } from '../core/juego.js';
import { Actor } from '../core/actor.js';
import { E, dif, sangre } from '../core/estado.js';
import { sfx, tono, musica, pararMusica } from '../core/sonido.js';
import { zzz } from '../core/efectos.js';
import { hablar, cartel, esperar, elegir } from '../core/dialogo.js';
import { barra } from '../core/mini.js';
import { texto, COLOR, panel } from '../core/ui.js';

const HOYO = [387, 280];
const COLORES = [0xe0457b, 0x23b39c, 0xf2c230, 0x5aa0ff, 0xffffff, 0xb58cff];

export class Canicas extends Juego {
  constructor() { super('Canicas'); }
  ambiente() { return { vineta: 0.45, motas: 14, color: 0xffd8a0 }; }
  opcionesEntrada() { return { palanca: false }; }

  armar() {
    const W = this.scale.width, H = this.scale.height;
    this.add.image(W / 2, H / 2, 'canicas').setDepth(-100);
    this.crearJugador(292, 300, 'right');
    this.abuelo = new Actor(this, 'j_abuelo', 480, 300, { dir: 'left' });
    this.crearFamilia([[400, 200, 'down'], [436, 205, 'down'], [472, 200, 'down']]);
    this.mias = 10; this.suyas = 10;
    this.cerrando = false;
    this.tiempo = dif(300, 240, 180);
    this.tiempoTotal = this.tiempo;
    this.ronda = 0;
    // los marcadores con las canicas dibujadas
    panel(this, 12, 36, 176, 64, 800);
    panel(this, W - 188, 36, 176, 64, 800);
    texto(this, 24, 46, 'TÚ', { tam: 13, negrita: true, color: COLOR.verde }).setDepth(801);
    texto(this, W - 24, 46, 'ABUELO 001', { tam: 13, negrita: true, color: COLOR.oro, origen: [1, 0] }).setDepth(801);
    this.tMias = texto(this, 170, 46, '10', { tam: 18, negrita: true, origen: [1, 0] }).setDepth(801);
    this.tSuyas = texto(this, W - 170, 46, '10', { tam: 18, negrita: true }).setDepth(801);
    this.bolsaMia = this.add.graphics().setDepth(802);
    this.bolsaSuya = this.add.graphics().setDepth(802);
    this.bolitas = this.add.graphics().setDepth(5);
    this.add.ellipse(HOYO[0], HOYO[1], 16, 8, 0x2a1a0a).setDepth(4);
    this.marcar();
  }

  marcar() {
    this.tMias.setText(String(this.mias));
    this.tSuyas.setText(String(this.suyas));
    const W = this.scale.width;
    const dib = (g, x0, n) => {
      g.clear();
      for (let i = 0; i < n; i++) {
        const x = x0 + (i % 10) * 15, y = 76 + Math.floor(i / 10) * 13;
        g.fillStyle(0x120e18); g.fillCircle(x + 1, y + 1, 5);
        g.fillStyle(COLORES[i % COLORES.length]); g.fillCircle(x, y, 5);
        g.fillStyle(0xffffff, 0.7); g.fillRect(x - 2, y - 3, 2, 2);
      }
    };
    dib(this.bolsaMia, 30, this.mias);
    dib(this.bolsaSuya, W - 170, this.suyas);
  }

  reglas() {
    return {
      objetivo: ['Juega con el abuelo 001: gana quien se quede con las 20 canicas.', 'Par o impar: apuesta y adivina cuántas tiene en la mano.', 'Al hoyo: mide la fuerza con A. El que quede más cerca gana 2.'],
      controles: [['palanca', 'Elegir'], ['a', 'Aceptar / tirar']],
      frase: [['j_abuelo', 'feliz', 'Je, je. Tú y yo somos gganbu. Compañeros. Los gganbu comparten todo...'], [E.perfil, 'neutral', 'Dale, abuelo. Pero no me la ponga fácil.']],
    };
  }

  empezar() { musica('flauta'); this.siguiente(); }

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
    return 1 + (await elegir(this, this.inp, ops, { titulo: '¿CUÁNTAS APUESTAS?', y: 190 }));
  }

  mano(x, y, n, abierta) {
    const g = this.add.graphics().setDepth(900);
    g.fillStyle(0x5a2a23); g.fillRoundedRect(x - 33, y - 21, 66, 42, 12);
    g.fillStyle(0xc98e70); g.fillRoundedRect(x - 31, y - 19, 62, 38, 11);
    g.fillStyle(0xddab88); g.fillRoundedRect(x - 27, y - 16, 40, 10, 5);
    if (!abierta) { g.lineStyle(2, 0x8a5a48); for (let k = 0; k < 3; k++) g.lineBetween(x - 20 + k * 14, y - 8, x - 20 + k * 14, y + 12); }
    if (abierta) for (let i = 0; i < n; i++) { const cx = x - 20 + (i % 4) * 13, cy = y - 4 + Math.floor(i / 4) * 13; g.fillStyle(COLORES[i % COLORES.length]); g.fillCircle(cx, cy, 5); g.fillStyle(0xffffff, 0.7); g.fillRect(cx - 2, cy - 3, 2, 2); }
    return g;
  }

  async parImpar(abueloEsconde) {
    if (abueloEsconde) {
      const n = 1 + Math.floor(Math.random() * Math.min(this.suyas, 5));
      this.abuelo.anim('point', 'left');
      const pista = Math.random() < dif(0.75, 0.4, 0) ? (n % 2 ? 'Mmm... hoy me siento raro. Muy raro.' : 'Mmm... hoy estoy parejito, como el clima.') : 'Je, je. A ver si adivinas, gganbu.';
      await hablar(this, this.inp, [['j_abuelo', 'feliz', pista]]);
      if (this.terminado) return;
      const b = await this.apuesta(this.mias);
      const r = await elegir(this, this.inp, ['PAR', 'IMPAR'], { titulo: '¿PAR O IMPAR?', y: 190 });
      const g = this.mano(430, 200, n, false);
      await esperar(this, 600);
      g.destroy();
      const g2 = this.mano(430, 200, n, true);
      tono(660, 0.08, 'campana', 0.1);
      const acierto = (n % 2 === 0) === (r === 0);
      await cartel(this, `${n}: ${n % 2 ? 'IMPAR' : 'PAR'}`, acierto ? `¡ganaste ${b}!` : `perdiste ${b}`, { ms: 1300, color: acierto ? 0x2fd4b4 : 0xff8fb5 });
      g2.destroy();
      this.mover(acierto ? Math.min(b, this.suyas) : -b);
      if (!acierto && Math.random() < dif(0.4, 0.15, 0) && this.mias > 0) {
        await hablar(this, this.inp, [['j_abuelo', 'cerrado', 'Ay... ¿era par? Se me olvidó. Toma, quédate con una. Los viejos se confunden.']]);
        this.mover(1);
      }
    } else {
      const r = await elegir(this, this.inp, ['1', '2', '3', '4', '5'].slice(0, Math.min(5, this.mias)), { titulo: '¿CUÁNTAS ESCONDES?', y: 190 });
      const n = r + 1;
      const b = Math.max(1, Math.min(this.suyas, this.mias, 1 + Math.floor(Math.random() * 3)));
      const dice = Math.random() < 0.5 ? 'PAR' : 'IMPAR';
      await hablar(this, this.inp, [['j_abuelo', 'neutral', `Apuesto ${b}. Digo... ${dice.toLowerCase()}.`]]);
      if (this.terminado) return;
      const g = this.mano(340, 200, n, true);
      const acierta = (n % 2 === 0) === (dice === 'PAR');
      await cartel(this, `${n}: ${n % 2 ? 'IMPAR' : 'PAR'}`, acierta ? `el abuelo gana ${b}` : `¡ganaste ${b}!`, { ms: 1300, color: acierta ? 0xff8fb5 : 0x2fd4b4 });
      g.destroy();
      this.mover(acierta ? -Math.min(b, this.mias) : b);
    }
  }

  async alHoyo() {
    await cartel(this, 'AL HOYO', 'el más cerca gana 2', { ms: 1100, color: 0xf7c948 });
    if (this.terminado) return;
    const ideal = 0.62;
    const r = await barra(this, this.inp, { vel: dif(0.9, 1.25, 1.6), ideal, ancho: 0.12, texto: 'A: TIRA LA CANICA', y: 120 });
    await this.jugador.hacer('throw', 'right');
    const mio = await this.rodar(this.jugador.x + 14, this.jugador.y - 8, (r.v - ideal) * 210);
    this.jugador.anim('idle', 'right');
    await this.abuelo.hacer('throw', 'left');
    const err = (Math.random() - 0.5) * dif(120, 80, 48);
    const suyo = await this.rodar(this.abuelo.x - 14, this.abuelo.y - 8, err, true);
    this.abuelo.anim('idle', 'left');
    const gano = mio < suyo;
    await cartel(this, gano ? '¡MÁS CERCA!' : 'EL ABUELO GANA', '', { ms: 1100, color: gano ? 0x2fd4b4 : 0xff8fb5 });
    this.mover(gano ? Math.min(2, this.suyas) : -Math.min(2, this.mias));
    this.bolitas.clear();
  }

  /** rueda una canica hacia el hoyo; err es cuánto se pasa o se queda (px). Devuelve la distancia final */
  rodar(x, y, err, delAbuelo = false) {
    return new Promise((ok) => {
      const c = this.add.circle(x, y, 4, delAbuelo ? 0xf2c230 : 0x5aa0ff).setDepth(300);
      const dx = HOYO[0] + err, dy = HOYO[1] + (Math.random() - 0.5) * 10;
      sfx(this, 'lanzar', 0.4);
      this.tweens.add({
        targets: c, x: dx, y: dy, duration: 750, ease: 'Quad.easeOut',
        onComplete: () => {
          sfx(this, 'chapa', 0.3);
          const d = Math.hypot(dx - HOYO[0], dy - HOYO[1]);
          this.bolitas.fillStyle(delAbuelo ? 0xf2c230 : 0x5aa0ff); this.bolitas.fillCircle(dx, dy, 4);
          if (d < 6) { tono(1568, 0.2, 'campana', 0.12); texto(this, HOYO[0], HOYO[1] - 18, '¡ADENTRO!', { tam: 13, negrita: true, color: COLOR.oro, origen: [0.5, 0.5] }).setDepth(900); }
          c.destroy();
          ok(d);
        },
      });
    });
  }

  mover(n) {
    if (n > 0) { tono(1046, 0.08, 'campana', 0.1); this.jugador.anim('celebrate', 'right'); }
    if (n < 0) { tono(220, 0.12, 'cuadrada', 0.08); this.jugador.anim('sad', 'right'); }
    this.mias = Phaser.Math.Clamp(this.mias + n, 0, 20); this.suyas = 20 - this.mias;
    this.marcar();
    this.time.delayedCall(900, () => this.jugador.vivo && this.jugador.anim('idle', 'right'));
  }

  estrellas() {
    const sobra = this.tiempo / this.tiempoTotal;
    return (sobra > 0.5 ? 3 : sobra > 0.25 ? 2 : 1) - Math.max(0, this.vidasInicio - E.vidas);
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
    this.abuelo.anim('walk', 'up');
    await new Promise((ok) => this.tweens.add({ targets: this.abuelo, px: 360, py: 160, duration: 2600, onComplete: ok }));
    if (sangre()) { await esperar(this, 400); sfx(this, 'pistola', 0.6); this.abuelo.setVisible(false); }
    else { this.abuelo.anim('knockout', 'down'); zzz(this, this.abuelo, 4); }
    this.contarEliminado();
    await esperar(this, 1200);
    this.ganar({ texto: 'GANASTE', lineas: [['steph', 'triste', 'Era tan buena gente... Vamos a ganar por él.']] });
  }
}
