// Juego 9: La cuerda (temporada 3). Un puente sobre el abismo y la muñeca gigante dándole a una cuerda enorme.
// Hay que cruzar saltando (A) cada vez que la cuerda pasa por los pies. En el medio el puente está roto: hay que
// saltarlo también. Si la cuerda te engancha o caes en el hueco, al vacío.

import Phaser from 'phaser';
import { Juego } from '../core/juego.js';
import { Actor } from '../core/actor.js';
import { E, dif } from '../core/estado.js';
import { sfx, tono, musica, cancionMuneca } from '../core/sonido.js';
import { eliminar, sacudir } from '../core/efectos.js';
import { cartel, esperar } from '../core/dialogo.js';
import { COLOR } from '../core/ui.js';

const PISO = 213, X_INI = 53, X_FIN = 573, HUECO = [301, 336];
const MANO_I = [69, 149], MANO_D = [560, 139];

export class Cuerda extends Juego {
  constructor() { super('Cuerda'); }
  ambiente() { return { vineta: 0.65, motas: 20, color: 0xcfe0ff }; }

  armar() {
    const W = this.scale.width, H = this.scale.height;
    this.add.image(W / 2, H / 2, 'cuerda').setDepth(-100);
    // el hueco del puente
    const g = this.add.graphics().setDepth(-50);
    g.fillStyle(0x0d0c1c); g.fillRect(HUECO[0], PISO - 11, HUECO[1] - HUECO[0], 19);
    g.fillStyle(0x6a4a5a); g.fillRect(HUECO[0] - 3, PISO - 11, 3, 24); g.fillRect(HUECO[1], PISO - 11, 3, 18);
    g.fillStyle(0x8a6a5a); g.fillRect(HUECO[0] - 10, PISO + 6, 8, 3); g.fillRect(HUECO[1] + 2, PISO + 4, 9, 3);
    // la muñeca a la derecha y un guardia a la izquierda con la otra punta
    this.muneca = this.add.image(603, 200, 'muneca_frente').setOrigin(0.5, 1).setScale(0.62).setDepth(190);
    this.guardia = new Actor(this, 'guardia_triangulo', 56, 200, { dir: 'right' });
    this.cuerda = this.add.graphics();
    this.sombraCuerda = this.add.graphics().setDepth(PISO - 2);
    this.crearJugador(93, PISO, 'right');
    this.crearFamilia([[77, PISO - 4], [64, PISO + 3], [85, PISO + 5]]);
    this.familia.forEach((f, i) => { f.sep = 19 + i * 16; f.alto = 0; f.vz = 0; });
    // otros jugadores adelante y atrás
    this.gente = this.crearGente(dif(3, 4, 5), (i) => [133 + i * 29, PISO + ((i % 2) * 5 - 2), 'right']);
    this.gente.forEach((g) => { g.vz = 0; g.torpe = Math.random() < 0.45; g.vel = 35 + Math.random() * 13; g.polvo = false; });
    this.fase = 0;
    this.periodo = dif(1.8, 1.5, 1.2);
    this.tiempo = dif(70, 55, 45);
    this.tiempoTotal = this.tiempo;
    this.j = { vz: 0 };
    this.vueltas = 0;
  }

  reglas() {
    return {
      objetivo: ['Cruza el puente mientras la muñeca le da a la cuerda gigante.', 'Salta con A justo cuando la cuerda baje a tus pies (mira su sombra).', 'En el medio el puente está roto: ¡salta el hueco también!'],
      controles: [['palanca', 'Caminar'], ['a', 'Saltar']],
      frase: ['alana', 'feliz', '¡Esto lo practico en el recreo! Mira la sombra de la cuerda y salta.'],
    };
  }

  empezar() { musica('tension'); }

  /** y de la cuerda en x según la fase: 0 arriba (sobre las cabezas), PI abajo (en los pies) */
  yCuerda(x, fase) {
    const t = (x - MANO_I[0]) / (MANO_D[0] - MANO_I[0]);
    const base = MANO_I[1] + (MANO_D[1] - MANO_I[1]) * t;
    const panza = Math.sin(Math.PI * Phaser.Math.Clamp(t, 0, 1));
    const abajo = (1 - Math.cos(fase)) / 2; // 0 arriba, 1 abajo
    const yMid = Phaser.Math.Linear(53, PISO + 3, abajo);
    return base + (yMid - (MANO_I[1] + MANO_D[1]) / 2) * panza;
  }

  pintarCuerda() {
    const g = this.cuerda;
    g.clear();
    const delante = Math.sin(this.fase) < 0; // la mitad de la vuelta pasa por delante
    g.setDepth(delante ? 1000 : -10);
    g.lineStyle(4, delante ? 0xe0457b : 0x8a2a4a);
    g.beginPath();
    for (let x = MANO_I[0]; x <= MANO_D[0]; x += 8) {
      const y = this.yCuerda(x, this.fase);
      if (x === MANO_I[0]) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.strokePath();
    // la sombra en el puente cuando viene bajando
    const abajo = (1 - Math.cos(this.fase)) / 2;
    this.sombraCuerda.clear();
    if (abajo > 0.5) {
      this.sombraCuerda.fillStyle(0x000000, (abajo - 0.5) * 0.8);
      this.sombraCuerda.fillRect(X_INI, PISO - 1, X_FIN - X_INI, 4);
    }
  }

  saltar(a, v = 150) {
    if (a.alto > 0.5) return false;
    a.vz = v;
    a.anim('jump', 'right', true);
    return true;
  }

  gravedad(a, dt) {
    if (a.alto <= 0 && a.vz <= 0) { a.alto = 0; return; }
    a.vz -= 747 * dt;
    a.alto = Math.max(0, a.alto + a.vz * dt);
    if (a.alto === 0) { a.vz = 0; if (a.vivo) a.anim('idle', 'right'); }
  }

  paso(dt) {
    this.tiempo -= dt;
    this.hud.setTiempo(this.tiempo);
    if (this.tiempo <= 0) { this.perder('SE ACABÓ EL TIEMPO'); return; }
    // la cuerda: cada vuelta un poquito más rápida
    const antes = this.fase;
    const w = (Math.PI * 2) / Math.max(dif(1.1, 0.85, 0.7), this.periodo - this.vueltas * 0.02);
    this.fase += w * dt;
    if (this.fase > Math.PI * 2) { this.fase -= Math.PI * 2; this.vueltas++; }
    const paso = antes < Math.PI && this.fase >= Math.PI;
    if (paso) sfx(this, 'esquiva', 0.35);
    if (Math.floor(antes / (Math.PI * 2) * 2) !== Math.floor(this.fase / (Math.PI * 2) * 2) && this.vueltas % 4 === 0) cancionMuneca(1.2);
    this.pintarCuerda();
    this.tweens.isTweening(this.muneca) || this.muneca.setAngle(Math.sin(this.fase) * 3);

    // el jugador
    const j = this.jugador;
    if (j.vivo) {
      const vx = this.inp.x * 69;
      j.x = Phaser.Math.Clamp(j.x + vx * dt, X_INI, X_FIN + 27);
      if (j.alto <= 0) { if (Math.abs(vx) > 2) { j.mirar(vx, 0); j.anim('walk'); } else j.anim('idle', 'right'); }
      if (this.inp.tomarA()) { if (this.saltar(j, 187)) sfx(this, 'paso_tierra_1', 0.3); }
      this.gravedad(j, dt);
      // el hueco
      if (j.alto <= 0 && j.x > HUECO[0] + 4 && j.x < HUECO[1] - 4) { this.caer(j, 'CAÍSTE EN EL HUECO'); return; }
      if (paso && j.alto < 5 && j.x < X_FIN - 5) { this.enganchar(j); return; }
      if (j.x >= X_FIN) { this.llegar(); return; }
    }

    // la familia: va detrás y salta perfecto (cuando le toca, salta)
    this.familia.forEach((f) => {
      const tx = Math.min(j.x - f.sep, X_FIN - 6);
      if (f.alto <= 0 && Math.abs(tx - f.x) > 2) { f.x += Math.sign(tx - f.x) * 59 * dt; f.anim('walk', 'right'); }
      // saltan un poquito antes de que baje la cuerda (y siempre sobre el hueco)
      const llega = Math.PI - this.fase;
      if (llega > 0 && llega < w * 0.16) this.saltar(f, 187);
      if (f.x > HUECO[0] - 8 && f.x < HUECO[1] + 3) this.saltar(f, 193);
      this.gravedad(f, dt);
    });

    // la gente
    this.gente.forEach((g) => {
      if (!g.vivo) return;
      if (g.alto <= 0) { g.x += g.vel * dt; g.anim('walk', 'right'); }
      const llega = Math.PI - this.fase;
      if (llega > 0 && llega < w * 0.16 && !(g.torpe && Math.random() < 0.02)) this.saltar(g, 187);
      if (g.x > HUECO[0] - 11 && g.x < HUECO[0]) this.saltar(g, g.torpe && Math.random() < 0.3 ? 93 : 193);
      this.gravedad(g, dt);
      if (g.alto <= 0 && g.x > HUECO[0] + 4 && g.x < HUECO[1] - 4) { this.contarEliminado(); eliminar(this, g, { modo: 'caida', dy: 200 }); return; }
      if (paso && g.alto < 5 && g.x < X_FIN) { this.contarEliminado(); sacudir(this, 100, 0.006); eliminar(this, g, { modo: 'caida', dy: 200 }); return; }
      if (g.x > X_FIN + 40) g.setVisible(false);
    });
  }

  estrellas() {
    const sobra = this.tiempo / this.tiempoTotal;
    return (sobra > 0.5 ? 3 : sobra > 0.25 ? 2 : 1) - Math.max(0, this.vidasInicio - E.vidas);
  }

  enganchar(j) {
    sfx(this, 'golpe_pesado', 0.7);
    sacudir(this, 200, 0.015);
    this.caer(j, 'TE ENGANCHÓ LA CUERDA');
  }

  caer(j, motivo) {
    this.jugando = false;
    this.perder(motivo, { modo: 'caida', dy: 200 });
  }

  async llegar() {
    this.jugando = false;
    this.jugador.alto = 0;
    this.jugador.anim('celebrate', 'right');
    this.familia.forEach((f, i) => this.tweens.add({ targets: f, px: X_FIN + 5 + i * 13, duration: 600, onComplete: () => { f.alto = 0; f.anim('celebrate', 'right'); } }));
    await esperar(this, 700);
    this.ganar({ lineas: [['alana', 'feliz', '¡Les dije! Campeona de la cuerda del recreo.']] });
  }
}
