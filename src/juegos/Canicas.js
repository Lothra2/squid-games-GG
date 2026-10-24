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
import { pajaros, luciernagas, rayos as rayosLuz } from '../core/vivo.js';
import { lienzo } from '../escenas/pintura.js';
import { polvo } from '../core/actor.js';

const HOYO = [387, 280];
const COLORES = [0xe0457b, 0x23b39c, 0xf2c230, 0x5aa0ff, 0xffffff, 0xb58cff];

export class Canicas extends Juego {
  constructor() { super('Canicas'); }
  ambiente() { return { vineta: 0.45, motas: 14, color: 0xffd8a0 }; }
  opcionesEntrada() { return { palanca: false }; }

  armar() {
    const W = this.scale.width, H = this.scale.height;
    this.add.image(W / 2, H / 2, 'canicas').setDepth(-100);
    this.texturas();
    // la interfaz en su cámara: la del mundo se acerca a las manos y al hoyo
    this.camaraUI();
    this.enPiso = [];
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
    texto(this, 24, 46, 'TÚ', { tam: 13, negrita: true, color: COLOR.verde }).setDepth(801).setScrollFactor(0);
    texto(this, W - 24, 46, 'ABUELO 001', { tam: 13, negrita: true, color: COLOR.oro, origen: [1, 0] }).setDepth(801).setScrollFactor(0);
    this.tMias = texto(this, 170, 46, '10', { tam: 18, negrita: true, origen: [1, 0] }).setDepth(801).setScrollFactor(0);
    this.tSuyas = texto(this, W - 170, 46, '10', { tam: 18, negrita: true }).setDepth(801).setScrollFactor(0);
    this.bolsaMia = this.add.graphics().setDepth(802).setScrollFactor(0);
    this.bolsaSuya = this.add.graphics().setDepth(802).setScrollFactor(0);
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

  decorar() {
    // el sol de la tarde entre las casas, pájaros volviendo a casa y polvo dorado en el aire
    rayosLuz(this, { x: 470, y: 0, angulo: -0.55, n: 5, largo: 360, ancho: 26, color: 0xffc070, alfa: 0.07 });
    pajaros(this, { n: 6, y0: 8, y1: 40, color: 0x3a1a10, prof: -95, par: 0 });
    luciernagas(this, { n: 16, area: [60, 120, 520, 220], color: 0xffd890, tam: 1, prof: 3000 });
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

  /** las canicas y las manos, en pixel art */
  texturas() {
    COLORES.forEach((c, i) => lienzo(this, 'cn_canica_' + i, 7, 7, (P) => {
      const col = '#' + c.toString(16).padStart(6, '0');
      P.elip(3.5, 3.5, 3.5, 3.5, '#1a1218'); P.elip(3.5, 3.5, 2.6, 2.6, col);
      P.lin(1, 4, 5, 2, '#ffffff'); P.r(2, 1, 2, 1, '#ffffff');
    }));
    lienzo(this, 'cn_puno', 24, 20, (P) => {
      // el puño cerrado: cuatro nudillos y el pulgar
      P.r(2, 3, 20, 15, '#5a2a23'); P.r(3, 4, 18, 13, '#c98e70');
      for (let k = 0; k < 4; k++) { P.r(4 + k * 4, 4, 3, 5, '#ddab88'); P.r(7 + k * 4, 5, 1, 9, '#8a5a48'); }
      P.r(1, 9, 6, 7, '#5a2a23'); P.r(2, 10, 5, 5, '#ddab88');
      P.r(4, 16, 16, 3, '#2fa88a'); P.r(4, 16, 16, 1, '#5adcb8');
    });
    lienzo(this, 'cn_palma', 30, 22, (P) => {
      // la mano abierta, la palma hacia arriba
      P.elip(15, 13, 13, 8, '#5a2a23'); P.elip(15, 13, 12, 7, '#c98e70'); P.elip(14, 12, 9, 5, '#ddab88');
      for (let k = 0; k < 4; k++) { P.r(5 + k * 5, 1, 4, 7, '#5a2a23'); P.r(6 + k * 5, 2, 2, 6, '#ddab88'); }
      P.r(0, 9, 5, 4, '#5a2a23'); P.r(1, 10, 3, 2, '#ddab88');
      P.r(9, 19, 14, 3, '#2fa88a');
    });
  }

  /** el puño cerrado frente a quien esconde: se sacude (suenan las canicas) y se abre */
  async revelar(quien, n) {
    const izq = quien === this.abuelo;
    const x = quien.x + (izq ? -22 : 22), y = quien.y - 20;
    this.acercar((this.jugador.x + this.abuelo.x) / 2, y + 6, 2.2, 450);
    await esperar(this, 350);
    const puno = this.add.image(x, y, 'cn_puno').setDepth(900).setFlipX(izq);
    this.manoActual = [puno];
    for (let k = 0; k < 3; k++) {
      await new Promise((ok) => this.tweens.add({ targets: puno, y: y - 3, duration: 70, yoyo: true, onComplete: ok }));
      tono(1500 + Math.random() * 600, 0.02, 'cuadrada', 0.04);
    }
    await esperar(this, 220);
    puno.setTexture('cn_palma');
    sfx(this, 'chapa', 0.3);
    for (let k = 0; k < n; k++) {
      const c = this.add.image(x - 7 + (k % 3) * 6, y - 1 + Math.floor(k / 3) * 4, 'cn_canica_' + (k % COLORES.length)).setDepth(901).setScale(0.1);
      this.tweens.add({ targets: c, scale: 1, duration: 160, delay: k * 70, ease: 'Back.easeOut' });
      this.manoActual.push(c);
    }
    await esperar(this, 300 + n * 70);
  }

  cerrarMano() {
    (this.manoActual || []).forEach((o) => o.destroy());
    this.manoActual = null;
    this.acercar(0, 0, 1, 400);
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
      const acierto = (n % 2 === 0) === (r === 0);
      await this.revelar(this.abuelo, n);
      await cartel(this, `${n}: ${n % 2 ? 'IMPAR' : 'PAR'}`, acierto ? `¡ganaste ${b}!` : `perdiste ${b}`, { ms: 1300, color: acierto ? 0x2fd4b4 : 0xff8fb5 });
      this.cerrarMano();
      await this.mover(acierto ? Math.min(b, this.suyas) : -b);
      if (!acierto && Math.random() < dif(0.4, 0.15, 0) && this.mias > 0) {
        await hablar(this, this.inp, [['j_abuelo', 'cerrado', 'Ay... ¿era par? Se me olvidó. Toma, quédate con una. Los viejos se confunden.']]);
        await this.mover(1);
      }
    } else {
      const r = await elegir(this, this.inp, ['1', '2', '3', '4', '5'].slice(0, Math.min(5, this.mias)), { titulo: '¿CUÁNTAS ESCONDES?', y: 190 });
      const n = r + 1;
      const b = Math.max(1, Math.min(this.suyas, this.mias, 1 + Math.floor(Math.random() * 3)));
      const dice = Math.random() < 0.5 ? 'PAR' : 'IMPAR';
      await hablar(this, this.inp, [['j_abuelo', 'neutral', `Apuesto ${b}. Digo... ${dice.toLowerCase()}.`]]);
      if (this.terminado) return;
      const acierta = (n % 2 === 0) === (dice === 'PAR');
      await this.revelar(this.jugador, n);
      await cartel(this, `${n}: ${n % 2 ? 'IMPAR' : 'PAR'}`, acierta ? `el abuelo gana ${b}` : `¡ganaste ${b}!`, { ms: 1300, color: acierta ? 0xff8fb5 : 0x2fd4b4 });
      this.cerrarMano();
      await this.mover(acierta ? -Math.min(b, this.mias) : b);
    }
  }

  async alHoyo() {
    await cartel(this, 'AL HOYO', 'el más cerca gana 2', { ms: 1100, color: 0xf7c948 });
    if (this.terminado) return;
    this.acercar(HOYO[0], HOYO[1] - 14, 1.7, 500);
    const ideal = 0.62;
    const r = await barra(this, this.inp, { vel: dif(0.9, 1.25, 1.6), ideal, ancho: 0.12, texto: 'A: TIRA LA CANICA', y: 120 });
    this.jugador.anim('throw', 'right', true);
    await esperar(this, 250);
    const mio = await this.rodar(this.jugador, (r.v - ideal) * 210);
    this.jugador.anim('idle', 'right');
    await esperar(this, 300);
    this.abuelo.anim('throw', 'left', true);
    await esperar(this, 250);
    const err = (Math.random() - 0.5) * dif(120, 80, 48);
    const suyo = await this.rodar(this.abuelo, err, true);
    this.abuelo.anim('idle', 'left');
    const gano = mio < suyo;
    await cartel(this, gano ? '¡MÁS CERCA!' : 'EL ABUELO GANA', '', { ms: 1100, color: gano ? 0x2fd4b4 : 0xff8fb5 });
    this.enPiso.forEach((c) => c.destroy());
    this.enPiso = [];
    this.acercar(0, 0, 1, 400);
    await this.mover(gano ? Math.min(2, this.suyas) : -Math.min(2, this.mias));
  }

  /** la canica sale de la mano en arco, pica, rebota y rueda frenando. err: cuánto se pasa o se queda (px) */
  rodar(quien, err, delAbuelo = false) {
    return new Promise((ok) => {
      const lado = delAbuelo ? -1 : 1;
      const x0 = quien.x + 16 * lado, y0 = quien.y - 32;
      const c = this.add.image(x0, y0, 'cn_canica_' + (delAbuelo ? 2 : 3)).setDepth(300);
      const sombra = this.add.ellipse(x0, quien.y, 6, 2, 0x000000, 0.35).setDepth(299);
      const fx = HOYO[0] + err, fy = HOYO[1] + (Math.random() - 0.5) * 8;
      // pica a mitad de camino y desde ahí rueda
      const px = x0 + (fx - x0) * 0.55, py = quien.y + (fy - quien.y) * 0.55;
      sfx(this, 'lanzar', 0.4);
      this.tweens.addCounter({
        from: 0, to: 1, duration: 360, ease: 'Linear', onUpdate: (tw) => {
          const t = tw.getValue();
          c.x = x0 + (px - x0) * t; c.y = y0 + (py - y0) * t - Math.sin(t * Math.PI) * 26;
          sombra.setPosition(c.x, quien.y + (py - quien.y) * t);
        },
        onComplete: () => {
          sfx(this, 'chapa', 0.3);
          polvo(this, px, py, !delAbuelo);
          // un saltito y a rodar frenando
          this.tweens.addCounter({
            from: 0, to: 1, duration: 760, ease: 'Quad.easeOut', onUpdate: (tw) => {
              const t = tw.getValue();
              c.x = px + (fx - px) * t; c.y = py + (fy - py) * t - Math.abs(Math.sin(t * Math.PI * 2)) * 6 * (1 - t);
              c.angle += 14 * (1 - t) * lado;
              sombra.setPosition(c.x, py + (fy - py) * t);
            },
            onComplete: () => {
              const d = Math.hypot(fx - HOYO[0], fy - HOYO[1]);
              sombra.destroy();
              this.enPiso.push(c);
              if (d < 6) {
                tono(1568, 0.2, 'campana', 0.12);
                this.tweens.add({ targets: c, x: HOYO[0], y: HOYO[1], scale: 0.6, duration: 160 });
                const t = texto(this, HOYO[0], HOYO[1] - 16, '¡ADENTRO!', { tam: 11, negrita: true, color: COLOR.oro, origen: [0.5, 0.5] }).setDepth(900);
                this.tweens.add({ targets: t, y: t.y - 10, alpha: 0, duration: 1200, delay: 400, onComplete: () => t.destroy() });
              }
              ok(d);
            },
          });
        },
      });
    });
  }

  /** las canicas vuelan de una mano a la otra: n > 0 te las da el abuelo, n < 0 se las das tú */
  async mover(n) {
    const de = n > 0 ? this.abuelo : this.jugador, a = n > 0 ? this.jugador : this.abuelo;
    for (let k = 0; k < Math.abs(n); k++) {
      const c = this.add.image(de.x, de.y - 26, 'cn_canica_' + (k % COLORES.length)).setDepth(900);
      this.time.delayedCall(k * 110, () => {
        this.tweens.addCounter({ from: 0, to: 1, duration: 420, onUpdate: (tw) => { const t = tw.getValue(); c.x = de.x + (a.x - de.x) * t; c.y = de.y - 26 + (a.y - de.y) * t - Math.sin(t * Math.PI) * 36; }, onComplete: () => { c.destroy(); tono(1200 + k * 60, 0.03, 'campana', 0.06); } });
      });
    }
    if (n > 0) { tono(1046, 0.08, 'campana', 0.1); this.jugador.anim('celebrate', 'right', true); this.abuelo.anim('sad', 'left', true); }
    if (n < 0) { tono(220, 0.12, 'cuadrada', 0.08); this.jugador.anim('sad', 'right', true); this.abuelo.anim('laugh', 'left', true); }
    await esperar(this, 420 + Math.abs(n) * 110);
    this.mias = Phaser.Math.Clamp(this.mias + n, 0, 20); this.suyas = 20 - this.mias;
    this.marcar();
    this.time.delayedCall(700, () => { if (this.jugador.vivo) this.jugador.anim('idle', 'right'); this.abuelo.anim('idle', 'left'); });
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
