// Juego 11: El juego del calamar. La final, contra el Front Man, bajo la lluvia.
// Afuera del calamar solo se puede saltar en un pie (lento). Al cruzar la cintura (la marca dorada) ya se corre
// con los dos pies. Para ganar hay que pisar la cabeza del calamar (el círculo de arriba) y aguantar ahí.
// El Front Man empuja: cada empujón quita aguante. A: embestida (si le pegas, lo dejas mareado).

import Phaser from 'phaser';
import { Juego } from '../core/juego.js';
import { Actor } from '../core/actor.js';
import { E, dif, sangre } from '../core/estado.js';
import { sfx, tono, musica, pararMusica } from '../core/sonido.js';
import { eliminar, sacudir, lluvia, relampago, chorro, fxSobre } from '../core/efectos.js';
import { cartel, esperar, hablar } from '../core/dialogo.js';

const CABEZA = { x: 240, y: 75, r: 25 };
const TRI = { ax: 240, ay: 97, bx: 203, by: 145, cx: 277, cy: 145 };
const CUAD = { x0: 203, y0: 148, x1: 277, y1: 207 };
const CINTURA = { x: 286, y: 146 };
const CANCHA = { x0: 42, y0: 50, x1: 438, y1: 226 };

function enTri(x, y) {
  const { ax, ay, bx, by, cx, cy } = TRI;
  const d = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
  const s = ((x - ax) * (cy - ay) - (cx - ax) * (y - ay)) / d;
  const t = ((bx - ax) * (y - ay) - (x - ax) * (by - ay)) / d;
  return s >= 0 && t >= 0 && s + t <= 1;
}
const enCalamar = (x, y) => Math.hypot(x - CABEZA.x, y - CABEZA.y) <= CABEZA.r || enTri(x, y) || (x >= CUAD.x0 && x <= CUAD.x1 && y >= CUAD.y0 && y <= CUAD.y1);

export class Calamar extends Juego {
  constructor() { super('Calamar'); }

  armar() {
    const W = this.scale.width, H = this.scale.height;
    this.add.image(W / 2, H / 2, 'calamar').setDepth(-100);
    // la marca de la cintura
    this.marcaCintura = this.add.circle(CINTURA.x, CINTURA.y, 7).setStrokeStyle(2, 0xf2c230).setDepth(-40);
    this.tweens.add({ targets: this.marcaCintura, scale: 1.4, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });
    this.marcaCabeza = this.add.circle(CABEZA.x, CABEZA.y, 9, 0xf2c230, 0.25).setStrokeStyle(1, 0xf2c230).setDepth(-40);
    this.crearJugador(240, 222, 'up');
    this.fm = new Actor(this, 'front_man', 240, 175, { dir: 'down' });
    this.fm.vx = 0; this.fm.vy = 0; this.fm.dash = 0; this.fm.cd = 1.5; this.fm.aturdido = 0;
    this.jugador.vx = 0; this.jugador.vy = 0; this.jugador.dash = 0; this.jugador.cd = 0; this.jugador.aturdido = 0;
    // la familia mira desde la puerta
    this.crearFamilia([[150, 232, 'up'], [330, 232, 'up'], [360, 230, 'up']]);
    this.aguante = dif(5, 4, 3);
    this.cruzo = false;
    this.pisando = 0;
    this.tiempo = dif(150, 120, 100);
    // el medidor de aguante y el de la cabeza
    this.corazones = [];
    for (let i = 0; i < this.aguante; i++) this.corazones.push(this.add.image(12 + i * 13, 30, 'vida_on').setScrollFactor(0).setDepth(8801));
    this.add.bitmapText(12 + this.aguante * 13 + 2, 26, 'fuente_ui', 'AGUANTE').setScrollFactor(0).setDepth(8801);
    this.barraCabeza = this.add.rectangle(CABEZA.x - 20, CABEZA.y - 34, 0, 4, 0xf2c230).setOrigin(0, 0.5).setDepth(8000);
  }

  reglas() {
    return [
      ['front_man', 'neutral', 'El juego del calamar. Así jugaban los niños en mi barrio. Ahora juegas tú, contra mí.'],
      ['front_man', 'neutral', 'Afuera del calamar solo puedes saltar en un pie. Cruza la cintura y podrás correr.'],
      ['front_man', 'neutral', 'Si pisas la cabeza del calamar y aguantas ahí, ganas. Si te saco a empujones, pierdes.'],
      ['steph', 'enojo', '¡Tú puedes! A para embestirlo. Si le pegas primero, se marea.'],
      ['sophie', 'feliz', '¡Por el abuelo 001! ¡Por Thor!'],
    ];
  }

  empezar() {
    musica('epica');
    this.pararLluvia = lluvia(this, 120);
    this.rayos = this.time.addEvent({ delay: 7000, loop: true, callback: () => relampago(this) });
    this.events.once('shutdown', () => { this.pararLluvia && this.pararLluvia(); });
  }

  paso(dt) {
    this.tiempo -= dt;
    this.hud.setTiempo(this.tiempo);
    if (this.tiempo <= 0) { this.perder('SE ACABÓ EL TIEMPO'); return; }
    const j = this.jugador, fm = this.fm;
    j.cd -= dt; j.aturdido -= dt; fm.cd -= dt; fm.aturdido -= dt;

    // el jugador
    if (j.dash > 0) j.dash -= dt;
    if (j.aturdido <= 0 && j.dash <= 0) {
      const afuera = !this.cruzo;
      const vel = afuera ? 30 : 74;
      j.vx = this.inp.x * vel; j.vy = this.inp.y * vel;
      const moviendo = Math.hypot(this.inp.x, this.inp.y) > 0.1;
      if (moviendo) j.mirar(this.inp.x, this.inp.y);
      if (afuera) {
        // a saltitos en un pie
        j.salto = (j.salto || 0) + dt * (moviendo ? 9 : 0);
        j.alto = moviendo ? Math.abs(Math.sin(j.salto)) * 5 : 0;
        j.anim(moviendo ? 'jump' : 'idle');
        if (this.inp.tomarA()) tono(200, 0.05, 'cuadrada', 0.04);
      } else {
        j.alto = 0;
        j.anim(moviendo ? 'run' : 'idle');
        if (this.inp.tomarA() && j.cd <= 0) this.embestir(j, this.inp.x || (j.izq ? -1 : 1), this.inp.y || 0, 190, 0.7);
      }
    } else { j.vx *= 0.88; j.vy *= 0.88; }
    j.x = Phaser.Math.Clamp(j.x + j.vx * dt, CANCHA.x0, CANCHA.x1);
    j.y = Phaser.Math.Clamp(j.y + j.vy * dt, CANCHA.y0, CANCHA.y1);
    // afuera no se puede pisar adentro del calamar (salvo por la cintura)
    if (!this.cruzo && enCalamar(j.x, j.y)) { j.x -= j.vx * dt * 1.5; j.y -= j.vy * dt * 1.5; }
    if (!this.cruzo && Math.hypot(j.x - CINTURA.x, j.y - CINTURA.y) < 10) {
      this.cruzo = true;
      this.marcaCintura.destroy();
      tono(1320, 0.2, 'campana', 0.15);
      fxSobre(this, j, 'exclamacion');
      this.hud.setExtra('¡CRUZASTE LA CINTURA! ¡A LA CABEZA!', 0x23b39c);
    } else if (!this.cruzo) this.hud.setExtra('EN UN PIE · ve a la marca dorada', 0xf2c230);

    // el Front Man
    if (fm.dash > 0) fm.dash -= dt;
    if (fm.aturdido <= 0 && fm.dash <= 0) {
      const dx = j.x - fm.x, dy = j.y - fm.y, d = Math.hypot(dx, dy) || 1;
      const v = dif(38, 46, 54) * (this.cruzo ? 1.15 : 1);
      let nx = fm.x + (dx / d) * v * dt, ny = fm.y + (dy / d) * v * dt;
      // mientras estás afuera, él no sale del calamar (solo se estira para empujar y vuelve)
      if (!this.cruzo && !enCalamar(fm.x, fm.y)) {
        const vx = 240 - fm.x, vy = 170 - fm.y, dd = Math.hypot(vx, vy) || 1;
        nx = fm.x + (vx / dd) * v * dt; ny = fm.y + (vy / dd) * v * dt;
      } else if (!this.cruzo && !enCalamar(nx, ny)) { nx = fm.x; ny = fm.y; }
      fm.vx = (nx - fm.x) / dt; fm.vy = (ny - fm.y) / dt;
      fm.mirar(dx, dy);
      fm.anim(Math.hypot(fm.vx, fm.vy) > 5 ? 'run' : 'idle');
      if (d < dif(30, 36, 42) && fm.cd <= 0) this.embestir(fm, dx, dy, dif(150, 170, 190), dif(2, 1.6, 1.2));
    } else if (fm.aturdido > 0) { fm.vx *= 0.88; fm.vy *= 0.88; }
    fm.x = Phaser.Math.Clamp(fm.x + fm.vx * dt, CANCHA.x0, CANCHA.x1);
    fm.y = Phaser.Math.Clamp(fm.y + fm.vy * dt, CANCHA.y0, CANCHA.y1);

    // los choques
    const d = Math.hypot(j.x - fm.x, j.y - fm.y);
    if (d < 15) {
      if (j.dash > 0 && fm.aturdido <= 0) {
        fm.aturdido = dif(2, 1.6, 1.2); fm.dash = 0;
        const k = Math.hypot(j.vx, j.vy) || 1;
        fm.vx = (j.vx / k) * 160; fm.vy = (j.vy / k) * 160;
        fm.anim('dizzy', null, true);
        fxSobre(this, fm, 'estrellas_mareo', -50);
        sfx(this, 'golpe_pesado', 0.7); sacudir(this, 150, 0.01);
        j.dash = 0;
      } else if (fm.dash > 0 && j.aturdido <= 0) {
        this.golpe();
      }
    }

    // la cabeza
    if (this.cruzo && Math.hypot(j.x - CABEZA.x, j.y - CABEZA.y) < 12) {
      this.pisando += dt;
      if (Math.random() < dt * 8) tono(600 + this.pisando * 400, 0.04, 'campana', 0.06);
    } else this.pisando = Math.max(0, this.pisando - dt * 0.5);
    const meta = dif(1.2, 1.6, 2);
    this.barraCabeza.width = 40 * Math.min(1, this.pisando / meta);
    if (this.pisando >= meta) this.victoria();
  }

  embestir(a, dx, dy, v, cd) {
    const d = Math.hypot(dx, dy) || 1;
    a.vx = (dx / d) * v; a.vy = (dy / d) * v;
    a.dash = 0.3; a.cd = cd;
    a.mirar(dx, dy);
    a.anim('dash', null, true);
    sfx(this, 'esquiva', 0.4);
  }

  golpe() {
    const j = this.jugador, fm = this.fm;
    const k = Math.hypot(fm.vx, fm.vy) || 1;
    j.vx = (fm.vx / k) * 170; j.vy = (fm.vy / k) * 170;
    j.aturdido = 0.6; fm.dash = 0;
    j.anim('hit', null, true);
    sfx(this, 'golpe_pesado', 0.8);
    sacudir(this, 200, 0.015);
    if (sangre()) chorro(this, j.x, j.y - 22, 8, [0xb3151f, 0x8a0f17], 60, { g: 250 });
    this.aguante--;
    this.corazones.forEach((c, i) => c.setTexture(i < this.aguante ? 'vida_on' : 'vida_off'));
    // si te saca de la cancha por empujón al borde, también cuenta: el aguante es lo que manda
    if (this.aguante <= 0) this.perder('EL FRONT MAN GANÓ');
  }

  async victoria() {
    if (this.terminado) return;
    this.jugando = false;
    this.terminado = true;
    pararMusica();
    this.inp.ocultarTactil(false);
    const j = this.jugador, fm = this.fm;
    j.anim('celebrate', 'down');
    sfx(this, 'pitazo_largo', 0.7);
    relampago(this);
    await cartel(this, '¡GANASTE!', 'pisaste la cabeza del calamar', { ms: 1800, color: 0xf2c230 });
    fm.anim('bow', 'down', true);
    await hablar(this, this.inp, [
      ['front_man', 'neutral', '...Nunca nadie me había ganado en mi propio juego.'],
      ['front_man', 'neutral', 'Ustedes jugaron distinto. Juntos. Eso no estaba en las reglas.'],
      [E.perfil, 'feliz', '¡FAMILIA GG!'],
    ]);
    this.familia.forEach((f) => f.anim('celebrate'));
    this.terminado = false;
    this.ganar({ texto: 'CAMPEONES' });
  }
}
