// Juego 6: Mingle (temporada 2). Todos giran en el carrusel con la música. Cuando para, anuncian un número:
// hay que entrar a un cuarto con exactamente ese número de personas. A: agarrar a alguien de la mano. B: soltar.

import Phaser from 'phaser';
import { Juego } from '../core/juego.js';
import { Actor } from '../core/actor.js';
import { E, dif, familiaNPC } from '../core/estado.js';
import { sfx, tono, musica, pararMusica } from '../core/sonido.js';
import { eliminar, fxSobre } from '../core/efectos.js';
import { cartel, esperar, hablar } from '../core/dialogo.js';

const CARR = { x: 240, y: 168, rx: 112, ry: 48 };
const PILAR = { x: 240, y: 150, rx: 36, ry: 22 };
const PISO = { x: 240, y: 172, rx: 228, ry: 98 };
const PUERTAS = [[38, 98], [95, 82], [148, 70], [218, 60], [262, 60], [332, 70], [385, 82], [445, 98]];

const dentro = (e, x, y, k = 1) => ((x - e.x) / (e.rx * k)) ** 2 + ((y - e.y) / (e.ry * k)) ** 2 <= 1;

export class Mingle extends Juego {
  constructor() { super('Mingle'); }

  armar() {
    const W = this.scale.width, H = this.scale.height;
    this.add.image(W / 2, H / 2, 'mingle').setDepth(-100);
    this.crearJugador(CARR.x, CARR.y + 40, 'down');
    this.crearFamilia([[CARR.x - 30, CARR.y + 36], [CARR.x + 30, CARR.y + 36], [CARR.x + 10, CARR.y + 44]]);
    this.gente = this.crearGente(dif(16, 20, 24), (i) => {
      const a = (i / 20) * Math.PI * 2;
      return [CARR.x + Math.cos(a) * CARR.rx * 0.75, CARR.y + Math.sin(a) * CARR.ry * 0.75, 'down'];
    });
    this.todos = [this.jugador, ...this.familia, ...this.gente];
    this.rondas = dif([4, 3, 4], [4, 2, 5], [3, 5, 2, 4]);
    this.ronda = 0;
    this.fase = 'gira';
    this.tFase = 0;
    this.lazos = this.add.graphics().setDepth(5000);
    this.puertas = PUERTAS.map(([x, y], i) => ({ x, y, ocupada: false, i, marca: this.add.circle(x, y - 14, 4, 0x23b39c).setDepth(10).setVisible(false) }));
    this.numero = this.add.bitmapText(W / 2, 120, 'fuente_titulo', '').setOrigin(0.5).setScale(3).setDepth(8000).setTint(0xf2c230);
    this.angulo = 0;
    this.avisoP = false; this.avisoN = false;
  }

  reglas() {
    return [
      ['guardia_cuadrado', 'neutral', 'Juego 6: Mingle. Mientras suene la música, giren con el carrusel.'],
      ['guardia_cuadrado', 'neutral', 'Cuando pare, diremos un número. Entren a un cuarto con exactamente ese número de personas.'],
      ['guardia_cuadrado', 'neutral', 'Quien quede afuera cuando se acabe el tiempo, queda eliminado.'],
      ['steph', 'neutral', 'A para agarrar a alguien de la mano y B para soltar. ¡Cuenten bien antes de entrar!'],
    ];
  }

  empezar() { this.girar(); }

  girar() {
    this.fase = 'gira';
    this.tFase = 5 + Math.random() * 4;
    this.numero.setText('');
    this.grupo = [];
    this.adentro = false;
    this.puertas.forEach((p) => { p.ocupada = false; p.marca.setVisible(false); });
    // todos vuelven al carrusel
    this.todos.forEach((a) => { if (a.vivo) { a.setVisible(true); a.salvo = false; a.grupoNPC = null; } });
    musica('mingle');
    this.hud.setExtra('¡A GIRAR!', 0xb58cff);
  }

  parar() {
    this.fase = 'busca';
    pararMusica(0.1);
    const n = this.rondas[this.ronda];
    this.n = n;
    this.tFase = dif(22, 18, 14);
    sfx(this, 'pitazo_largo', 0.6);
    this.numero.setText(String(n)).setAlpha(1);
    this.tweens.add({ targets: this.numero, alpha: 0.3, duration: 400, yoyo: true, repeat: 3 });
    tono(523, 0.2, 'metal', 0.15);
    this.hud.setExtra(`¡GRUPOS DE ${n}!`, 0xf2c230);
    this.puertas.forEach((p) => p.marca.setVisible(true).setFillStyle(0x23b39c));
    // la gente arma grupos sola y busca puerta
    const libres = Phaser.Utils.Array.Shuffle(this.gente.filter((g) => g.vivo));
    const grupos = [];
    const sobrantes = Math.floor(Math.random() * Math.min(4, libres.length));
    const usables = libres.slice(sobrantes);
    for (let i = 0; i + n <= usables.length; i += n) grupos.push(usables.slice(i, i + n));
    this.gruposNPC = grupos.map((gr, k) => ({ miembros: gr, puerta: null, demora: 1 + Math.random() * this.tFase * 0.8 }));
    this.gruposNPC.forEach((G) => G.miembros.forEach((m) => (m.grupoNPC = G)));
    // la familia que no va contigo se las arregla sola (entra con otros)
    this.familia.forEach((f) => { f.solo = true; });
  }

  paso(dt) {
    this.tFase -= dt;
    if (this.fase === 'busca') this.hud.setTiempo(this.tFase); else this.hud.reloj.setText('');
    if (this.fase === 'gira') this.pasoGira(dt);
    else if (this.fase === 'busca') this.pasoBusca(dt);
    this.pintarLazos();
  }

  pasoGira(dt) {
    // el piso gira: todos se mueven en círculo; el jugador puede caminar encima
    const w = 0.35;
    this.angulo += w * dt;
    this.todos.forEach((a) => {
      if (!a.vivo) return;
      const dx = a.x - CARR.x, dy = (a.y - CARR.y) * (CARR.rx / CARR.ry);
      const tx = -dy * w, ty = dx * w * (CARR.ry / CARR.rx);
      if (a === this.jugador) {
        const vx = this.inp.x * 60 + tx, vy = this.inp.y * 40 + ty;
        a.mover(vx, vy, dt, { correr: false });
        this.contenerCarrusel(a);
      } else {
        a.mover(tx, ty, dt, { correr: false });
        this.contenerCarrusel(a);
      }
    });
    if (this.tFase <= 0) this.parar();
  }

  contenerCarrusel(a) {
    if (!dentro(CARR, a.x, a.y, 0.95)) {
      const ang = Math.atan2((a.y - CARR.y) / CARR.ry, (a.x - CARR.x) / CARR.rx);
      a.x = CARR.x + Math.cos(ang) * CARR.rx * 0.94; a.y = CARR.y + Math.sin(ang) * CARR.ry * 0.94;
    }
    if (dentro(PILAR, a.x, a.y)) {
      const ang = Math.atan2((a.y - PILAR.y) / PILAR.ry, (a.x - PILAR.x) / PILAR.rx);
      a.x = PILAR.x + Math.cos(ang) * PILAR.rx * 1.02; a.y = PILAR.y + Math.sin(ang) * PILAR.ry * 1.02;
    }
  }

  contenerPiso(a) {
    if (a.y < 64) a.y = 64;
    if (!dentro(PISO, a.x, a.y) && a.y > 100) {
      const ang = Math.atan2((a.y - PISO.y) / PISO.ry, (a.x - PISO.x) / PISO.rx);
      a.x = PISO.x + Math.cos(ang) * PISO.rx * 0.99; a.y = PISO.y + Math.sin(ang) * PISO.ry * 0.99;
    }
    if (dentro(PILAR, a.x, a.y)) {
      const ang = Math.atan2((a.y - PILAR.y) / PILAR.ry, (a.x - PILAR.x) / PILAR.rx);
      a.x = PILAR.x + Math.cos(ang) * PILAR.rx * 1.02; a.y = PILAR.y + Math.sin(ang) * PILAR.ry * 1.02;
    }
  }

  ir(a, x, y, vel, dt) {
    const dx = x - a.x, dy = y - a.y, d = Math.hypot(dx, dy);
    if (d < 3) { a.mover(0, 0, dt); return true; }
    a.mover((dx / d) * vel, (dy / d) * vel, dt);
    this.contenerPiso(a);
    return false;
  }

  pasoBusca(dt) {
    const j = this.jugador;
    if (!this.adentro) {
      j.mover(this.inp.x * 82, this.inp.y * 62, dt);
      this.contenerPiso(j);
      // agarrar de la mano: al más cercano libre (familia o gente sin grupo)
      if (this.inp.tomarA()) {
        const libres = this.todos.filter((a) => a !== j && a.vivo && !a.salvo && !this.grupo.includes(a) && !a.grupoNPC);
        let mejor = null, md = 34;
        for (const a of libres) { const d = Math.hypot(a.x - j.x, a.y - j.y); if (d < md) { md = d; mejor = a; } }
        if (mejor) { this.grupo.push(mejor); mejor.solo = false; tono(880, 0.06, 'campana', 0.1); fxSobre(this, mejor, 'exclamacion'); }
        else tono(220, 0.05, 'cuadrada', 0.05);
      }
      if (this.inp.tomarB() && this.grupo.length) { const a = this.grupo.pop(); if (this.familia.includes(a)) a.solo = true; tono(440, 0.05, 'cuadrada', 0.05); }
      // el grupo sigue al jugador en fila
      let prev = j;
      this.grupo.forEach((a) => { const d = Math.hypot(prev.x - a.x, prev.y - a.y); if (d > 16) this.ir(a, prev.x, prev.y, 90, dt); else a.mover(0, 0, dt); prev = a; });
      // entrar por una puerta
      const total = 1 + this.grupo.length;
      this.hud.setExtra(`¡GRUPOS DE ${this.n}! · ustedes: ${total}`, total === this.n ? 0x23b39c : 0xf2c230);
      for (const p of this.puertas) {
        if (Math.hypot(j.x - p.x, j.y - p.y) < 16) {
          if (p.ocupada) { if (!this.avisoP) { this.avisoP = true; this.hud.setExtra('Ese cuarto ya está cerrado', 0xff4d6d); this.time.delayedCall(800, () => (this.avisoP = false)); } }
          else if (total !== this.n) { if (!this.avisoN) { this.avisoN = true; tono(200, 0.1, 'cuadrada', 0.08); this.hud.setExtra(`¡Son ${total}! Tienen que ser ${this.n}`, 0xff4d6d); this.time.delayedCall(900, () => (this.avisoN = false)); } }
          else { this.entrar(p, [j, ...this.grupo]); this.adentro = true; tono(1320, 0.2, 'campana', 0.12); this.hud.setExtra('¡ADENTRO!', 0x23b39c); }
        }
      }
    }
    // los grupos NPC buscan puerta
    for (const G of this.gruposNPC) {
      if (G.dentro) continue;
      G.demora -= dt;
      const vivos = G.miembros.filter((m) => m.vivo);
      if (G.demora > 0) { vivos.forEach((m, k) => this.ir(m, vivos[0].x + k * 8, vivos[0].y, 70, dt)); continue; }
      if (!G.puerta || G.puerta.ocupada) {
        const libres = this.puertas.filter((p) => !p.ocupada);
        if (!libres.length) continue;
        G.puerta = libres.reduce((a, b) => (Math.hypot(b.x - vivos[0].x, b.y - vivos[0].y) < Math.hypot(a.x - vivos[0].x, a.y - vivos[0].y) ? b : a));
      }
      let llego = true;
      vivos.forEach((m, k) => { if (!this.ir(m, G.puerta.x + (k - vivos.length / 2) * 4, G.puerta.y + 4, 75, dt)) llego = false; });
      if (llego && !G.puerta.ocupada) { this.entrar(G.puerta, vivos); G.dentro = true; }
    }
    // la familia suelta se salva sola (narrativa: se juntan con otros)
    this.familia.forEach((f) => {
      if (f.solo && !f.salvo && this.tFase < dif(10, 8, 6)) { f.salvo = true; this.tweens.add({ targets: f.sprite, alpha: 0, duration: 400, onComplete: () => f.setVisible(false) }); }
      else if (f.solo && !f.salvo) this.ir(f, f.x + (Math.random() - 0.5), f.y - 0.3, 30, dt);
    });
    if (this.tFase <= 0) this.finRonda();
  }

  entrar(p, quienes) {
    p.ocupada = true;
    p.marca.setFillStyle(0xff3355);
    quienes.forEach((a) => {
      a.salvo = true;
      this.tweens.add({ targets: a, px: p.x, py: p.y, duration: 250, onComplete: () => a.setVisible(false) });
    });
    sfx(this, 'golpe', 0.3);
  }

  pintarLazos() {
    const g = this.lazos;
    g.clear();
    if (this.fase !== 'busca' || this.adentro) return;
    g.lineStyle(1, 0xf2c230);
    let prev = this.jugador;
    this.grupo.forEach((a) => { g.lineBetween(prev.x, prev.y - 18, a.x, a.y - 18); prev = a; });
  }

  async finRonda() {
    this.fase = 'fin';
    const j = this.jugador;
    // los de afuera quedan eliminados
    const afuera = this.gente.filter((g) => g.vivo && !g.salvo);
    if (!this.adentro) {
      this.grupo.forEach((a) => { if (!this.familia.includes(a)) afuera.push(a); });
      this.perder('TE QUEDASTE AFUERA');
      return;
    }
    afuera.forEach((a, i) => this.time.delayedCall(i * 150, () => { this.contarEliminado(); eliminar(this, a); }));
    await esperar(this, 600 + afuera.length * 150);
    // los que estaban en cuartos con un número equivocado... (no hay: la puerta no deja entrar)
    // se quitan los cuerpos de la ronda
    afuera.forEach((a) => { if (a.charco) a.charco.destroy(); if (a.regalo) a.regalo.destroy(); a.setVisible(false); });
    this.ronda++;
    if (this.ronda >= this.rondas.length) {
      this.todos.forEach((a) => a.vivo && a.setVisible(true));
      this.familia.forEach((f) => { f.sprite.setAlpha(1); f.setVisible(true); });
      this.ganar({ lineas: [['sophie', 'feliz', '¡Nos encontramos otra vez! Pensé que te perdíamos en ese cuarto.']] });
      return;
    }
    await cartel(this, `RONDA ${this.ronda + 1}`, '', { ms: 900, color: 0xb58cff });
    // todos salen y vuelven al carrusel
    this.todos.forEach((a) => { if (a.vivo) { a.setVisible(true); a.sprite.setAlpha(1); a.x = CARR.x + (Math.random() - 0.5) * 160; a.y = CARR.y + (Math.random() - 0.5) * 50; this.contenerCarrusel(a); } });
    this.girar();
  }
}
