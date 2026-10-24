// Juego 9: La cuerda (temporada 3). Un puente sobre el abismo y la muñeca gigante dándole a una cuerda enorme.
// Hay que cruzar saltando (A) cada vez que la cuerda pasa por los pies: un círculo encima de tu cabeza se cierra
// y se pone verde justo cuando hay que saltar. En el medio el puente está roto: caminando te detienes en la orilla
// y con A das un salto largo que te lleva al otro lado (ojo con que la cuerda no te agarre esperando ahí).

import Phaser from 'phaser';
import { Juego } from '../core/juego.js';
import { Actor } from '../core/actor.js';
import { E, dif } from '../core/estado.js';
import { sfx, tono, musica, cancionMuneca } from '../core/sonido.js';
import { eliminar, sacudir } from '../core/efectos.js';
import { cartel, esperar } from '../core/dialogo.js';
import { COLOR, texto } from '../core/ui.js';
import { luciernagas, rayos as rayosLuz, vapor } from '../core/vivo.js';

const PISO = 213, X_INI = 53, X_FIN = 573, HUECO = [301, 336];
const MANO_I = [69, 149], MANO_D = [560, 139];

export class Cuerda extends Juego {
  constructor() { super('Cuerda'); }
  ambiente() { return { vineta: 0.65, motas: 20, color: 0xcfe0ff }; }

  armar() {
    const W = this.scale.width, H = this.scale.height;
    this.add.image(W / 2, H / 2, 'cuerda').setDepth(-100);
    // el hueco del puente
    // se ve el abismo a través del hueco: un pedazo del mismo fondo, de más abajo, tapa las tablas
    const ancho = HUECO[1] - HUECO[0];
    this.add.image(0, -37, 'cuerda').setOrigin(0).setCrop(HUECO[0], PISO + 25, ancho, 25).setDepth(-51);
    const g = this.add.graphics().setDepth(-50);
    // las puntas astilladas de las tablas
    const madera = 0xc890a8, oscura = 0x7a4a62;
    [[HUECO[0], 1], [HUECO[1], -1]].forEach(([x, d]) => {
      for (let k = 0; k < 6; k++) {
        const y = PISO - 10 + k * 3, largo = 2 + ((k * 7) % 5);
        g.fillStyle(k % 2 ? madera : oscura); g.fillRect(d > 0 ? x : x - largo, y, largo, 3);
      }
    });
    // una tabla suelta que cuelga de la soga y se mece
    this.tabla = this.add.rectangle(HUECO[0] + 4, PISO - 8, 4, 22, madera).setOrigin(0.5, 0).setStrokeStyle(1, oscura).setDepth(-49);
    this.tweens.add({ targets: this.tabla, angle: { from: -14, to: 14 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // la muñeca a la derecha y un guardia a la izquierda con la otra punta
    this.muneca = this.add.image(603, 200, 'muneca_frente').setOrigin(0.5, 1).setScale(0.62).setDepth(190);
    this.guardia = new Actor(this, 'guardia_triangulo', 56, 200, { dir: 'right' });
    this.cuerda = this.add.graphics();
    this.sombraCuerda = this.add.graphics().setDepth(PISO - 2);
    this.crearJugador(93, PISO, 'right');
    this.jugador.vz = 0; this.jugador.alto = 0;
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
    // el aviso del salto: un círculo que se cierra sobre la cabeza
    this.aviso = this.add.graphics().setDepth(6000);
    this.avisoTxt = texto(this, 0, 0, '', { tam: 12, negrita: true, color: COLOR.verde, origen: [0.5, 1] }).setDepth(6001);
    // la orilla del hueco: flecha que invita al salto largo
    this.flechaHueco = texto(this, (HUECO[0] + HUECO[1]) / 2, PISO - 40, 'SALTO LARGO EN VERDE', { tam: 11, negrita: true, color: COLOR.oro, origen: [0.5, 1] }).setDepth(6001).setVisible(false);
    this.tweens.add({ targets: this.flechaHueco, y: PISO - 46, duration: 400, yoyo: true, repeat: -1 });
  }

  decorar() {
    // los haces de luz de la caverna respiran, luciérnagas en los acantilados y neblina en el abismo
    [160, 320, 480].forEach((x, i) => rayosLuz(this, { x: x - 30, y: 0, angulo: 0.05 * (i - 1), n: 1, largo: 300, ancho: 40, color: 0xbfd0ff, alfa: 0.05, prof: -70 }));
    luciernagas(this, { n: 10, area: [0, 120, 130, 200], color: 0xc8ffb0, prof: -60 });
    luciernagas(this, { n: 10, area: [510, 120, 130, 200], color: 0xc8ffb0, prof: -60 });
    vapor(this, { x: 320, y: 360, color: 0x8a8ac8, cada: 400, prof: -65, alfa: 0.12 });
  }

  reglas() {
    return {
      objetivo: ['Cruza el puente mientras la muñeca le da a la cuerda gigante.', 'Salta con A cuando el círculo sobre tu cabeza se ponga verde: la cuerda va a pasar por tus pies.', 'En el medio el puente está roto: párate en la orilla y, cuando el círculo esté verde, A te da un salto largo al otro lado.'],
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

  /** el salto largo sobre el hueco: de la orilla al otro lado, pase lo que pase con la palanca */
  saltoLargo(a, corto = false) {
    if (a.alto > 0.5) return false;
    const v = 205, aire = (2 * v) / 747;
    const destino = corto ? a.x + 22 : HUECO[1] + 14;
    a.vz = v; a.largo = { vx: (destino - a.x) / aire };
    a.anim('jump', 'right', true);
    return true;
  }

  /** caminando no se entra al hueco: se queda en la orilla */
  orilla(a) {
    if (a.alto > 0 || a.largo) return;
    if (a.x > HUECO[0] - 3 && a.x < HUECO[0] + 6) a.x = HUECO[0] - 3;
    if (a.x < HUECO[1] + 3 && a.x > HUECO[1] - 6) a.x = HUECO[1] + 3;
  }

  gravedad(a, dt) {
    if (a.alto <= 0 && a.vz <= 0) { a.alto = 0; return; }
    a.vz -= 747 * dt;
    a.alto = Math.max(0, a.alto + a.vz * dt);
    if (a.largo) a.x += a.largo.vx * dt;
    if (a.alto === 0) { a.vz = 0; a.largo = null; if (a.vivo) a.anim('idle', 'right'); }
  }

  /** segundos que faltan para que la cuerda pase por los pies */
  faltaCuerda(w) {
    const f = this.fase;
    return (f < Math.PI ? Math.PI - f : 3 * Math.PI - f) / w;
  }

  pintarAviso(j, w) {
    const g = this.aviso;
    g.clear();
    this.avisoTxt.setText('');
    if (!j.vivo || j.x >= X_FIN - 5) return;
    const t = this.faltaCuerda(w), x = j.x, y = j.y - j.alto - 96;
    if (t > 0.9 || j.alto > 2) return;
    const ahora = t >= 0.05 && t <= 0.42;
    const r = 4 + t * 14;
    g.lineStyle(2, ahora ? 0x2fd4b4 : 0xf7c948, 0.95); g.strokeCircle(x, y, r);
    g.fillStyle(ahora ? 0x2fd4b4 : 0xf7c948, ahora ? 0.5 : 0.2); g.fillCircle(x, y, 3);
    if (ahora) this.avisoTxt.setText('¡SALTA!').setPosition(x, y - r - 2);
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
      const vx = j.largo ? 0 : this.inp.x * 69;
      if (j.alto <= 0) j.x = Phaser.Math.Clamp(j.x + vx * dt, X_INI, X_FIN + 27);
      else if (!j.largo) j.x = Phaser.Math.Clamp(j.x + vx * 0.6 * dt, X_INI, X_FIN + 27);
      this.orilla(j);
      if (j.alto <= 0) { if (Math.abs(vx) > 2) { j.mirar(vx, 0); j.anim('walk'); } else j.anim('idle', 'right'); }
      // en la orilla del hueco, A es el salto largo; en el resto, el salto de la cuerda
      const enOrilla = j.alto <= 0 && j.x >= HUECO[0] - 26 && j.x <= HUECO[0];
      this.flechaHueco.setVisible(enOrilla);
      if (this.inp.tomarA()) {
        if (enOrilla) { if (this.saltoLargo(j)) { sfx(this, 'esquiva', 0.5); tono(660, 0.1, 'campana', 0.08); } }
        else if (this.saltar(j, 187)) sfx(this, 'paso_tierra_1', 0.3);
      }
      this.gravedad(j, dt);
      this.pintarAviso(j, w);
      // el hueco
      if (j.alto <= 0 && j.x > HUECO[0] + 4 && j.x < HUECO[1] - 4) { this.caer(j, 'CAÍSTE EN EL HUECO'); return; }
      if (paso && j.alto < 5 && j.x < X_FIN - 5) { this.enganchar(j); return; }
      if (j.x >= X_FIN) { this.llegar(); return; }
    }

    // la familia: va detrás y salta perfecto (cuando le toca, salta)
    this.familia.forEach((f) => {
      const tx = Math.min(j.x - f.sep, X_FIN - 6);
      if (f.alto <= 0 && Math.abs(tx - f.x) > 2) { f.x += Math.sign(tx - f.x) * 59 * dt; f.anim('walk', 'right'); }
      this.orilla(f);
      // saltan un poquito antes de que baje la cuerda; en la orilla, salto largo si tú ya cruzaste
      const llega = this.faltaCuerda(w);
      if (f.alto <= 0 && f.x >= HUECO[0] - 4 && f.x <= HUECO[0] && tx > HUECO[1] && llega > 0.12 && llega < 0.2) this.saltoLargo(f);
      else if (llega > 0.12 && llega < 0.2) this.saltar(f, 187);
      this.gravedad(f, dt);
    });

    // la gente
    this.gente.forEach((g) => {
      if (!g.vivo) return;
      if (g.alto <= 0 && !g.esperando) { g.x += g.vel * dt; g.anim('walk', 'right'); }
      const llega = this.faltaCuerda(w);
      // en la orilla esperan el momento; los torpes a veces saltan corto
      g.esperando = g.alto <= 0 && g.x >= HUECO[0] - 6 && g.x <= HUECO[0];
      if (g.esperando && llega > 0.12 && llega < 0.2) this.saltoLargo(g, g.torpe && Math.random() < 0.35);
      else if (llega > 0.12 && llega < 0.2 && !(g.torpe && Math.random() < 0.02)) this.saltar(g, 187);
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
