// Juego 7: El puente de cristal. Cada paso tiene dos paneles: uno de vidrio templado (aguanta) y uno normal (se rompe).
// Primero se elige el número de chaleco: los que van adelante gastan tiempo pero revelan paneles.
// Arriba/abajo elige el panel y A salta. B: mirar el reflejo (pista, pocas veces).

import Phaser from 'phaser';
import { Juego } from '../core/juego.js';
import { Actor } from '../core/actor.js';
import { E, dif, familiaNPC } from '../core/estado.js';
import { sfx, tono, musica } from '../core/sonido.js';
import { eliminar, sacudir, chorro } from '../core/efectos.js';
import { cartel, esperar, elegir, hablar } from '../core/dialogo.js';
import { jugadoresNPC } from '../core/kit.js';

const X0 = 90, PASO = 34, Y_ARR = 120, Y_ABA = 162;

export class Puente extends Juego {
  constructor() { super('Puente'); }
  opcionesEntrada() { return { palanca: true }; }

  armar() {
    const W = this.scale.width, H = this.scale.height;
    this.n = dif(12, 15, 18);
    this.largo = X0 + this.n * PASO + 120;
    this.cameras.main.setBounds(0, 0, this.largo, H);
    // el fondo oscuro del circo, repetido a lo largo
    for (let x = 0; x < this.largo; x += W) this.add.image(x, 0, 'puente').setOrigin(0).setScrollFactor(0.5, 1).setDepth(-100).setFlipX((x / W) % 2 === 1);
    // las plataformas de salida y llegada
    this.plataforma(10, X0 - 22);
    this.plataforma(X0 + this.n * PASO - 6, this.largo);
    // los soportes del puente
    const g = this.add.graphics().setDepth(1);
    g.fillStyle(0x3a3a48);
    g.fillRect(X0 - 20, Y_ARR + 8, this.n * PASO + 20, 3);
    g.fillRect(X0 - 20, Y_ABA + 8, this.n * PASO + 20, 3);
    // los paneles: templado arriba (0) o abajo (1)
    this.templado = Array.from({ length: this.n }, () => (Math.random() < 0.5 ? 0 : 1));
    this.rotos = Array.from({ length: this.n }, () => [false, false]);
    this.sabidos = Array.from({ length: this.n }, () => [false, false]);
    this.vidrios = this.add.graphics().setDepth(5);
    this.pintarVidrios();
    this.pistas = dif(3, 1, 0);
    this.tiempo = dif(170, 140, 110);
    this.col = -1; this.fila = 0;
    this.saltando = false;
    this.sel = this.add.rectangle(0, 0, PASO - 6, 22).setStrokeStyle(1, 0xf2c230).setDepth(6);
  }

  plataforma(x0, x1) {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0x2a2834); g.fillRect(x0, Y_ARR - 12, x1 - x0, Y_ABA - Y_ARR + 28);
    g.fillStyle(0x444252); g.fillRect(x0, Y_ARR - 12, x1 - x0, 3);
    g.fillStyle(0x1c1a24); g.fillRect(x0, Y_ABA + 14, x1 - x0, 30);
  }

  pintarVidrios() {
    const g = this.vidrios;
    g.clear();
    for (let i = 0; i < this.n; i++) {
      for (const f of [0, 1]) {
        const x = X0 + i * PASO, y = f ? Y_ABA : Y_ARR;
        if (this.rotos[i][f]) {
          g.lineStyle(1, 0x9ad4ff, 0.5);
          g.lineBetween(x - 13, y - 9, x - 9, y - 4); g.lineBetween(x + 13, y + 9, x + 8, y + 5);
          continue;
        }
        const seguro = this.sabidos[i][f];
        g.fillStyle(seguro ? 0x7fe0c4 : 0x9ad4ff, seguro ? 0.45 : 0.28);
        g.fillRect(x - 14, y - 10, 28, 20);
        g.lineStyle(1, seguro ? 0x23b39c : 0xcfeaff, 0.8);
        g.strokeRect(x - 14, y - 10, 28, 20);
        g.lineStyle(1, 0xffffff, 0.5); g.lineBetween(x - 10, y - 7, x - 4, y - 7);
      }
    }
  }

  reglas() {
    return [
      ['guardia_cuadrado', 'neutral', 'Juego 7: el puente de cristal. En cada paso hay dos paneles. Uno aguanta. El otro no.'],
      ['guardia_cuadrado', 'neutral', 'Primero elijan su número de chaleco. Ese es el orden en que cruzan.'],
      ['rick', 'neutral', 'Arriba o abajo con las flechas, y A para saltar. Lo que ya pisaron otros, se ve verde.'],
      this.pistas ? ['sophie', 'neutral', `Con B miras el reflejo de la luz: el vidrio bueno brilla distinto. Te quedan ${this.pistas}.`] : ['sophie', 'susto', 'Esta vez no hay pistas. Puro instinto.'],
    ];
  }

  async antesDeEmpezar() {
    const ops = ['Chaleco 1 (primero)', 'Chaleco 4', 'Chaleco 8', 'Chaleco 12', 'Chaleco 16 (último)'];
    const r = await elegir(this, this.inp, ops, { titulo: 'ELIGE TU CHALECO', ancho: 190 });
    const delante = [0, 3, 7, 11, 15][r];
    // la familia va detrás de ti; los de adelante, uno a uno
    this.crearJugador(40, (Y_ARR + Y_ABA) / 2, 'right');
    this.crearFamilia([[20, Y_ARR + 4], [26, Y_ABA - 4], [8, (Y_ARR + Y_ABA) / 2]]);
    this.cameras.main.startFollow(this.jugador.sprite, true, 0.1, 0.1, -60, 0);
    if (delante) {
      await cartel(this, `${delante} VAN ADELANTE`, 'mira bien dónde pisan', { ms: 1200, color: 0xf2c230 });
      await this.adelante(delante);
    }
    this.inp.ocultarTactil(true);
  }

  /** los jugadores de adelante cruzan hasta caer (revelan paneles y gastan tiempo) */
  async adelante(cuantos) {
    const ids = jugadoresNPC();
    for (let k = 0; k < cuantos; k++) {
      if (this.primeraDesconocida() >= this.n) break;
      const a = new Actor(this, ids[k % ids.length], X0 - 40, (Y_ARR + Y_ABA) / 2, { dir: 'right' });
      let col = -1;
      this.cameras.main.startFollow(a.sprite, true, 0.2, 0.2, -60, 0);
      for (;;) {
        if (col + 1 >= this.n) { // llegó al otro lado
          await this.saltarA(a, X0 + this.n * PASO + 30, (Y_ARR + Y_ABA) / 2);
          a.anim('celebrate', 'right');
          break;
        }
        const c = col + 1;
        let f;
        if (this.sabidos[c][0] || this.rotos[c][1]) f = 0;
        else if (this.sabidos[c][1] || this.rotos[c][0]) f = 1;
        else f = Math.random() < 0.5 ? 0 : 1;
        await this.saltarA(a, X0 + c * PASO, f ? Y_ABA : Y_ARR);
        this.tiempo -= dif(3, 4, 5);
        this.hud.setTiempo(this.tiempo);
        if (this.templado[c] === f) { this.sabidos[c][f] = true; this.pintarVidrios(); col = c; }
        else { await this.romper(a, c, f); this.contarEliminado(); break; }
      }
      await esperar(this, 250);
    }
    this.cameras.main.startFollow(this.jugador.sprite, true, 0.1, 0.1, -60, 0);
    await esperar(this, 300);
  }

  primeraDesconocida() {
    let i = 0;
    while (i < this.n && (this.sabidos[i][0] || this.sabidos[i][1] || this.rotos[i][0] || this.rotos[i][1])) i++;
    return i;
  }

  saltarA(a, x, y, dur = 420) {
    return new Promise((ok) => {
      a.anim('jump', 'right', true);
      sfx(this, 'esquiva', 0.3);
      const x0 = a.x, y0 = a.y;
      this.tweens.addCounter({
        from: 0, to: 1, duration: dur, onUpdate: (tw) => {
          const t = tw.getValue();
          a.x = x0 + (x - x0) * t; a.y = y0 + (y - y0) * t; a.alto = Math.sin(t * Math.PI) * 16;
        },
        onComplete: () => { a.alto = 0; a.anim('idle', 'right'); sfx(this, 'paso_tierra_0', 0.4); ok(); },
      });
    });
  }

  async romper(a, c, f) {
    this.rotos[c][f] = true;
    this.sabidos[c][1 - f] = true;
    this.pintarVidrios();
    sfx(this, 'romper', 0.9);
    sacudir(this, 200, 0.012);
    chorro(this, X0 + c * PASO, f ? Y_ABA : Y_ARR, 24, [0x9ad4ff, 0xcfeaff, 0xffffff], 90, { g: 300 });
    await eliminar(this, a, { modo: 'caida', dy: 200 });
  }

  paso(dt) {
    this.tiempo -= dt;
    this.hud.setTiempo(this.tiempo);
    if (this.tiempo <= 0) { this.perder('SE ACABÓ EL TIEMPO'); return; }
    if (this.saltando) return;
    const c = this.col + 1;
    if (this.inp.y < -0.5) this.fila = 0;
    if (this.inp.y > 0.5) this.fila = 1;
    if (c < this.n) {
      this.sel.setVisible(true).setPosition(X0 + c * PASO, this.fila ? Y_ABA : Y_ARR);
      this.hud.setExtra(`PASO ${c + 1} DE ${this.n} · ${this.fila ? 'ABAJO' : 'ARRIBA'}`, 0xffffff);
    } else this.sel.setVisible(false);
    if (this.inp.tomarB() && c < this.n) {
      if (this.pistas > 0) {
        this.pistas--;
        const y = this.templado[c] ? Y_ABA : Y_ARR;
        const brillo = this.add.rectangle(X0 + c * PASO, y, 28, 20, 0xffffff, 0.7).setDepth(7);
        this.tweens.add({ targets: brillo, alpha: 0, duration: 900, onComplete: () => brillo.destroy() });
        tono(1568, 0.2, 'campana', 0.1);
        this.hud.setExtra(`Pistas: ${this.pistas}`, 0xf2c230);
      } else tono(200, 0.06, 'cuadrada', 0.05);
    }
    if (this.inp.tomarA() || (this.inp.x > 0.6 && !this.soltoDer)) {
      this.soltoDer = true;
      this.saltar(c);
    }
    if (this.inp.x <= 0.3) this.soltoDer = false;
  }

  async saltar(c) {
    if (c >= this.n) return;
    if (this.rotos[c][this.fila]) { tono(200, 0.06, 'cuadrada', 0.05); return; }
    this.saltando = true;
    const f = this.fila;
    await this.saltarA(this.jugador, X0 + c * PASO, f ? Y_ABA : Y_ARR);
    if (this.templado[c] !== f) {
      await this.romper(this.jugador, c, f);
      this.perder('EL VIDRIO SE ROMPIÓ', { sinAnim: true });
      return;
    }
    this.sabidos[c][f] = true;
    this.pintarVidrios();
    tono(880 + c * 30, 0.06, 'campana', 0.08);
    this.col = c;
    this.saltando = false;
    if (c === this.n - 1) this.llegar();
  }

  async llegar() {
    this.saltando = true;
    this.jugando = false;
    this.sel.setVisible(false);
    await this.saltarA(this.jugador, X0 + this.n * PASO + 30, (Y_ARR + Y_ABA) / 2);
    this.jugador.anim('celebrate', 'right');
    // la familia cruza por tus pasos, uno detrás del otro
    await Promise.all(this.familia.map(async (f, k) => {
      await esperar(this, k * 450);
      for (let c = 0; c < this.n; c++) await this.saltarA(f, X0 + c * PASO, this.templado[c] ? Y_ABA : Y_ARR, 300);
      await this.saltarA(f, X0 + this.n * PASO + 46 + k * 14, (Y_ARR + Y_ABA) / 2 + (k - 1) * 14, 300);
      f.anim('celebrate', 'right');
    }));
    this.ganar({ lineas: [['alana', 'susto', 'No miré para abajo ni una vez. Bueno, una vez. ¡No quiero más vidrios!']] });
  }
}
