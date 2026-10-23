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

const PISO = 160, X_INI = 40, X_FIN = 430, HUECO = [226, 252];
const MANO_I = [52, 112], MANO_D = [420, 104];

export class Cuerda extends Juego {
  constructor() { super('Cuerda'); }

  armar() {
    const W = this.scale.width, H = this.scale.height;
    this.add.image(W / 2, H / 2, 'cuerda').setDepth(-100);
    // el hueco del puente
    const g = this.add.graphics().setDepth(-50);
    g.fillStyle(0x0d0c1c); g.fillRect(HUECO[0], PISO - 8, HUECO[1] - HUECO[0], 14);
    g.fillStyle(0x6a4a5a); g.fillRect(HUECO[0] - 2, PISO - 8, 2, 16); g.fillRect(HUECO[1], PISO - 8, 2, 12);
    // la muñeca a la derecha y un guardia a la izquierda con la otra punta
    this.muneca = this.add.image(452, 150, 'muneca_frente').setOrigin(0.5, 1).setScale(0.62).setDepth(140);
    this.guardia = new Actor(this, 'guardia_triangulo', 42, 150, { dir: 'right' });
    this.cuerda = this.add.graphics();
    this.sombraCuerda = this.add.graphics().setDepth(PISO - 2);
    this.crearJugador(70, PISO, 'right');
    this.crearFamilia([[58, PISO - 3], [48, PISO + 2], [64, PISO + 4]]);
    this.familia.forEach((f, i) => { f.sep = 14 + i * 12; f.alto = 0; f.vz = 0; });
    // otros jugadores adelante y atrás
    this.gente = this.crearGente(dif(3, 4, 5), (i) => [100 + i * 22, PISO + ((i % 2) * 4 - 2), 'right']);
    this.gente.forEach((g) => { g.vz = 0; g.torpe = Math.random() < 0.45; g.vel = 26 + Math.random() * 10; });
    this.fase = 0;
    this.periodo = dif(1.8, 1.5, 1.2);
    this.tiempo = dif(70, 55, 45);
    this.j = { vz: 0 };
    this.vueltas = 0;
  }

  reglas() {
    return [
      ['guardia_cuadrado', 'neutral', 'Juego 9: saltar la cuerda. Crucen el puente mientras la cuerda gira.'],
      ['guardia_cuadrado', 'neutral', 'Si la cuerda los toca, o si caen, quedan eliminados.'],
      ['alana', 'feliz', '¡Esto lo practico en el recreo! Salta con A justo cuando la cuerda baja a los pies.'],
      ['rick', 'susto', 'Y ojo: en el medio el puente está roto. Ese hueco hay que saltarlo también.'],
    ];
  }

  empezar() { musica('tension'); }

  /** y de la cuerda en x según la fase: 0 arriba (sobre las cabezas), PI abajo (en los pies) */
  yCuerda(x, fase) {
    const t = (x - MANO_I[0]) / (MANO_D[0] - MANO_I[0]);
    const base = MANO_I[1] + (MANO_D[1] - MANO_I[1]) * t;
    const panza = Math.sin(Math.PI * Phaser.Math.Clamp(t, 0, 1));
    const abajo = (1 - Math.cos(fase)) / 2; // 0 arriba, 1 abajo
    const yMid = Phaser.Math.Linear(40, PISO + 2, abajo);
    return base + (yMid - (MANO_I[1] + MANO_D[1]) / 2) * panza;
  }

  pintarCuerda() {
    const g = this.cuerda;
    g.clear();
    const delante = Math.sin(this.fase) < 0; // la mitad de la vuelta pasa por delante
    g.setDepth(delante ? 1000 : -10);
    g.lineStyle(3, delante ? 0xe0457b : 0x8a2a4a);
    g.beginPath();
    for (let x = MANO_I[0]; x <= MANO_D[0]; x += 6) {
      const y = this.yCuerda(x, this.fase);
      if (x === MANO_I[0]) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.strokePath();
    // la sombra en el puente cuando viene bajando
    const abajo = (1 - Math.cos(this.fase)) / 2;
    this.sombraCuerda.clear();
    if (abajo > 0.5) {
      this.sombraCuerda.fillStyle(0x000000, (abajo - 0.5) * 0.8);
      this.sombraCuerda.fillRect(X_INI, PISO - 1, X_FIN - X_INI, 3);
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
    a.vz -= 560 * dt;
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
      const vx = this.inp.x * 52;
      j.x = Phaser.Math.Clamp(j.x + vx * dt, X_INI, X_FIN + 20);
      if (j.alto <= 0) { if (Math.abs(vx) > 2) { j.mirar(vx, 0); j.anim('walk'); } else j.anim('idle', 'right'); }
      if (this.inp.tomarA()) { if (this.saltar(j, 140)) sfx(this, 'paso_tierra_1', 0.3); }
      this.gravedad(j, dt);
      // el hueco
      if (j.alto <= 0 && j.x > HUECO[0] + 3 && j.x < HUECO[1] - 3) { this.caer(j, 'CAÍSTE EN EL HUECO'); return; }
      if (paso && j.alto < 4 && j.x < X_FIN - 4) { this.enganchar(j); return; }
      if (j.x >= X_FIN) { this.llegar(); return; }
    }

    // la familia: va detrás y salta perfecto (cuando le toca, salta)
    this.familia.forEach((f) => {
      const tx = Math.min(j.x - f.sep, X_FIN - 6);
      if (f.alto <= 0 && Math.abs(tx - f.x) > 2) { f.x += Math.sign(tx - f.x) * 44 * dt; f.anim('walk', 'right'); }
      // saltan un poquito antes de que baje la cuerda (y siempre sobre el hueco)
      const llega = Math.PI - this.fase;
      if (llega > 0 && llega < w * 0.16) this.saltar(f, 140);
      if (f.x > HUECO[0] - 6 && f.x < HUECO[1] + 2) this.saltar(f, 145);
      this.gravedad(f, dt);
    });

    // la gente
    this.gente.forEach((g) => {
      if (!g.vivo) return;
      if (g.alto <= 0) { g.x += g.vel * dt; g.anim('walk', 'right'); }
      const llega = Math.PI - this.fase;
      if (llega > 0 && llega < w * 0.16 && !(g.torpe && Math.random() < 0.02)) this.saltar(g, 140);
      if (g.x > HUECO[0] - 8 && g.x < HUECO[0]) this.saltar(g, g.torpe && Math.random() < 0.3 ? 70 : 145);
      this.gravedad(g, dt);
      if (g.alto <= 0 && g.x > HUECO[0] + 3 && g.x < HUECO[1] - 3) { this.contarEliminado(); eliminar(this, g, { modo: 'caida', dy: 150 }); return; }
      if (paso && g.alto < 4 && g.x < X_FIN) { this.contarEliminado(); sacudir(this, 100, 0.006); eliminar(this, g, { modo: 'caida', dy: 150 }); return; }
      if (g.x > X_FIN + 30) g.setVisible(false);
    });
  }

  enganchar(j) {
    sfx(this, 'golpe_pesado', 0.7);
    sacudir(this, 200, 0.015);
    this.caer(j, 'TE ENGANCHÓ LA CUERDA');
  }

  caer(j, motivo) {
    this.jugando = false;
    this.perder(motivo, { modo: 'caida', dy: 150 });
  }

  async llegar() {
    this.jugando = false;
    this.jugador.alto = 0;
    this.jugador.anim('celebrate', 'right');
    this.familia.forEach((f, i) => this.tweens.add({ targets: f, px: X_FIN + 4 + i * 10, duration: 600, onComplete: () => { f.alto = 0; f.anim('celebrate', 'right'); } }));
    await esperar(this, 700);
    this.ganar({ lineas: [['alana', 'feliz', '¡Les dije! Campeona de la cuerda del recreo.']] });
  }
}
