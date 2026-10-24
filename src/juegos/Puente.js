// Juego 7: El puente de cristal. Cada paso tiene dos paneles: uno de vidrio templado (aguanta) y uno normal (se rompe).
// Primero se elige el chaleco: los de adelante cruzan antes y revelan paneles. Tu reloj arranca cuando te toca,
// con segundos por cada paso que te falta: ir de último da menos tiempo pero más camino conocido.
// Arriba/abajo elige el panel y A (o derecha) salta. B: mirar el reflejo de la luz (pocas veces).

import Phaser from 'phaser';
import { Juego } from '../core/juego.js';
import { Actor } from '../core/actor.js';
import { E, dif } from '../core/estado.js';
import { sfx, tono, musica } from '../core/sonido.js';
import { eliminar, sacudir, chorro } from '../core/efectos.js';
import { cartel, esperar, elegir } from '../core/dialogo.js';
import { jugadoresNPC } from '../core/kit.js';
import { texto, COLOR } from '../core/ui.js';

const X0 = 130, PASO = 46, Y_ARR = 158, Y_ABA = 216;

export class Puente extends Juego {
  constructor() { super('Puente'); this.usaPistas = true; }

  opcionesHud() { return { reloj: true }; }
  ambiente() { return { vineta: 0.7, motas: 20, color: 0xcfe8ff }; }

  armar() {
    const W = this.scale.width, H = this.scale.height;
    this.n = dif(12, 15, 18);
    this.largo = X0 + this.n * PASO + 170;
    this.cameras.main.setBounds(0, 0, this.largo, H);
    for (let x = 0; x < this.largo; x += W) this.add.image(x, 0, 'puente').setOrigin(0).setScrollFactor(0.5, 1).setDepth(-100).setFlipX((x / W) % 2 === 1);
    this.add.rectangle(this.largo / 2, H / 2, this.largo, H, 0x05040a, 0.25).setDepth(-99);
    this.plataforma(0, X0 - 30);
    this.plataforma(X0 + this.n * PASO - 8, this.largo);
    // los cables del puente
    const g = this.add.graphics().setDepth(1);
    for (const y of [Y_ARR + 14, Y_ABA + 14]) { g.fillStyle(0x2a2836); g.fillRect(X0 - 30, y, this.n * PASO + 24, 4); g.fillStyle(0x4a4858); g.fillRect(X0 - 30, y, this.n * PASO + 24, 1); }
    for (let i = 0; i <= this.n; i++) { g.fillStyle(0x3a3846); g.fillRect(X0 - PASO / 2 + i * PASO - 1, Y_ARR - 16, 2, Y_ABA - Y_ARR + 34); }
    this.templado = Array.from({ length: this.n }, () => (Math.random() < 0.5 ? 0 : 1));
    this.rotos = Array.from({ length: this.n }, () => [false, false]);
    this.sabidos = Array.from({ length: this.n }, () => [false, false]);
    this.vidrios = this.add.graphics().setDepth(5);
    this.brillos = [];
    this.pintarVidrios();
    this.pistas = dif(3, 1, 0) + this.pistasExtra;
    this.pistasUsadas = 0;
    this.col = -1; this.fila = 0;
    this.saltando = false;
    this.sel = this.add.rectangle(0, 0, PASO - 6, 32).setStrokeStyle(2, 0xf7c948).setDepth(6).setVisible(false);
    this.tiempo = 999;
    this.miTurno = false;
    this.txtPistas = texto(this, 12, 44, '', { tam: 13, color: COLOR.oro }).setScrollFactor(0).setDepth(8801);
  }

  plataforma(x0, x1) {
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0x24222e); g.fillRect(x0, Y_ARR - 20, x1 - x0, Y_ABA - Y_ARR + 42);
    g.fillStyle(0x3e3c4c); g.fillRect(x0, Y_ARR - 20, x1 - x0, 4);
    g.fillStyle(0x16141e); g.fillRect(x0, Y_ABA + 22, x1 - x0, 50);
    for (let x = x0 + 10; x < x1; x += 30) { g.fillStyle(0x2e2c3a); g.fillRect(x, Y_ARR - 12, 18, 2); }
  }

  pintarVidrios() {
    const g = this.vidrios;
    g.clear();
    for (let i = 0; i < this.n; i++) {
      for (const f of [0, 1]) {
        const x = X0 + i * PASO, y = f ? Y_ABA : Y_ARR;
        if (this.rotos[i][f]) {
          // el marco vacío con dos astillas colgando
          g.lineStyle(1, 0x5a6a7a, 0.8); g.strokeRect(x - 19, y - 14, 38, 28);
          g.fillStyle(0x9ad4ff, 0.5); g.fillTriangle(x - 19, y - 14, x - 12, y - 14, x - 19, y - 4); g.fillTriangle(x + 19, y + 14, x + 13, y + 14, x + 19, y + 6);
          continue;
        }
        const seguro = this.sabidos[i][f];
        g.fillStyle(seguro ? 0x7fe0c4 : 0x8ccaf0, seguro ? 0.5 : 0.3);
        g.fillRect(x - 19, y - 14, 38, 28);
        g.fillStyle(0xffffff, 0.16); g.fillRect(x - 19, y - 14, 38, 8);
        g.lineStyle(2, seguro ? 0x2fd4b4 : 0xcfeaff, 0.85);
        g.strokeRect(x - 19, y - 14, 38, 28);
        g.lineStyle(1, 0xffffff, 0.55); g.lineBetween(x - 14, y - 10, x - 5, y - 10); g.lineBetween(x - 14, y - 7, x - 9, y - 7);
        if (seguro) { g.fillStyle(0x2fd4b4, 0.7); g.fillCircle(x, y + 2, 3); }
      }
    }
  }

  reglas() {
    return {
      objetivo: ['En cada paso hay dos vidrios: uno aguanta y el otro se rompe.', 'Lo que ya pisaron otros se ve verde. Tu reloj arranca cuando te toca.', `B: mirar el reflejo de la luz (te quedan ${this.pistas}).`],
      controles: [['palanca', 'Arriba / abajo'], ['a', 'Saltar'], ['b', 'Pista']],
      frase: ['guardia_cuadrado', 'neutral', 'Juego 7. Elijan su chaleco. Ese es el orden en que cruzan.'],
    };
  }

  async antesDeEmpezar() {
    const ops = ['Chaleco 1  (el primero)', 'Chaleco 4', 'Chaleco 8', 'Chaleco 12', 'Chaleco 16  (el último)'];
    const det = ['Mucho tiempo, todo por descubrir', 'Bastante tiempo', 'Equilibrado', 'Menos tiempo, más camino conocido', 'Poco tiempo, casi todo conocido'];
    const r = await elegir(this, this.inp, ops, { titulo: 'ELIGE TU CHALECO', detalles: det });
    const delante = [0, 3, 7, 11, 15][r];
    this.crearJugador(60, (Y_ARR + Y_ABA) / 2, 'right');
    this.crearFamilia([[34, Y_ARR + 6], [40, Y_ABA - 6], [14, (Y_ARR + Y_ABA) / 2]]);
    this.cameras.main.startFollow(this.jugador.sprite, true, 0.1, 0.1, -90, 0);
    if (delante) {
      await cartel(this, `${delante} VAN ADELANTE`, 'mira bien dónde pisan', { ms: 1200, color: 0xf7c948 });
      await this.adelante(delante);
    }
    // tu reloj: segundos por cada paso que te falta por descubrir (más unos para los conocidos)
    const desconocidos = this.n - this.primeraDesconocida();
    this.tiempo = Math.max(dif(30, 24, 18), desconocidos * dif(7, 5.5, 4.2) + (this.n - desconocidos) * 1.2) + this.bonusReloj;
    this.tiempoTotal = this.tiempo;
    this.miTurno = true;
    await cartel(this, '¡TE TOCA!', `${Math.ceil(this.tiempo)} segundos para cruzar`, { ms: 1300, color: 0x2fd4b4 });
  }

  /** los jugadores de adelante cruzan hasta caer (revelan paneles) */
  async adelante(cuantos) {
    const ids = jugadoresNPC();
    for (let k = 0; k < cuantos; k++) {
      if (this.primeraDesconocida() >= this.n) break;
      const a = new Actor(this, ids[k % ids.length], X0 - 60, (Y_ARR + Y_ABA) / 2, { dir: 'right' });
      let col = -1;
      this.cameras.main.startFollow(a.sprite, true, 0.2, 0.2, -90, 0);
      for (;;) {
        if (col + 1 >= this.n) { await this.saltarA(a, X0 + this.n * PASO + 40, (Y_ARR + Y_ABA) / 2, 260); a.anim('celebrate', 'right'); break; }
        const c = col + 1;
        let f;
        if (this.sabidos[c][0] || this.rotos[c][1]) f = 0;
        else if (this.sabidos[c][1] || this.rotos[c][0]) f = 1;
        else f = Math.random() < 0.5 ? 0 : 1;
        const conocido = this.sabidos[c][f];
        await this.saltarA(a, X0 + c * PASO, f ? Y_ABA : Y_ARR, conocido ? 200 : 380);
        if (this.templado[c] === f) { this.sabidos[c][f] = true; this.pintarVidrios(); col = c; }
        else { await this.romper(a, c, f); this.contarEliminado(); break; }
      }
      await esperar(this, 200);
    }
    this.cameras.main.startFollow(this.jugador.sprite, true, 0.1, 0.1, -90, 0);
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
          a.x = x0 + (x - x0) * t; a.y = y0 + (y - y0) * t; a.alto = Math.sin(t * Math.PI) * 20;
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
    sacudir(this, 220, 0.014);
    const x = X0 + c * PASO, y = f ? Y_ABA : Y_ARR;
    chorro(this, x, y, 30, [0x9ad4ff, 0xcfeaff, 0xffffff], 110, { g: 380 });
    // los trozos grandes que caen girando
    for (let k = 0; k < 6; k++) {
      const t = this.add.rectangle(x - 15 + Math.random() * 30, y - 10 + Math.random() * 20, 6 + Math.random() * 8, 4 + Math.random() * 6, 0xbfe6ff, 0.7).setDepth(6000);
      this.tweens.add({ targets: t, y: t.y + 260, angle: Math.random() * 720 - 360, alpha: 0, duration: 900 + Math.random() * 400, ease: 'Quad.easeIn', onComplete: () => t.destroy() });
    }
    await eliminar(this, a, { modo: 'caida', dy: 230 });
  }

  paso(dt) {
    if (!this.miTurno) return;
    this.tiempo -= dt;
    this.hud.setTiempo(this.tiempo);
    this.txtPistas.setText(`Pistas: ${this.pistas}`);
    if (this.tiempo <= 0) { this.perder('SE ACABÓ EL TIEMPO'); return; }
    if (this.saltando) return;
    const c = this.col + 1;
    if (this.inp.y < -0.5) this.fila = 0;
    if (this.inp.y > 0.5) this.fila = 1;
    if (c < this.n) {
      this.sel.setVisible(true).setPosition(X0 + c * PASO, this.fila ? Y_ABA : Y_ARR);
      this.hud.setExtra(`PASO ${c + 1} DE ${this.n}  ·  ${this.fila ? 'ABAJO' : 'ARRIBA'}`, 0xffffff);
    } else this.sel.setVisible(false);
    if (this.inp.tomarB() && c < this.n) {
      if (this.pistas > 0) {
        this.pistas--; this.pistasUsadas++;
        const y = this.templado[c] ? Y_ABA : Y_ARR;
        const brillo = this.add.rectangle(X0 + c * PASO, y, 38, 28, 0xffffff, 0.8).setDepth(7);
        this.tweens.add({ targets: brillo, alpha: 0, duration: 1100, onComplete: () => brillo.destroy() });
        tono(1568, 0.2, 'campana', 0.1);
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
    await this.saltarA(this.jugador, X0 + c * PASO, f ? Y_ABA : Y_ARR, this.sabidos[c][f] ? 260 : 420);
    if (this.templado[c] !== f) {
      this.camaraLenta(this.jugador);
      await this.romper(this.jugador, c, f);
      this.camaraLenta(null, false);
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

  estrellas() {
    const sobra = this.tiempo / this.tiempoTotal;
    return (sobra > 0.35 && this.pistasUsadas === 0 ? 3 : sobra > 0.15 ? 2 : 1) - Math.max(0, this.vidasInicio - E.vidas);
  }

  async llegar() {
    this.saltando = true;
    this.jugando = false;
    this.sel.setVisible(false);
    await this.saltarA(this.jugador, X0 + this.n * PASO + 40, (Y_ARR + Y_ABA) / 2);
    this.jugador.anim('celebrate', 'right');
    // la familia cruza por tus pasos, uno detrás del otro
    await Promise.all(this.familia.map(async (f, k) => {
      await esperar(this, k * 450);
      for (let c = 0; c < this.n; c++) await this.saltarA(f, X0 + c * PASO, this.templado[c] ? Y_ABA : Y_ARR, 280);
      await this.saltarA(f, X0 + this.n * PASO + 62 + k * 18, (Y_ARR + Y_ABA) / 2 + (k - 1) * 18, 280);
      f.anim('celebrate', 'right');
    }));
    this.ganar({ lineas: [['alana', 'susto', 'No miré para abajo ni una vez. Bueno, una vez. ¡No quiero más vidrios!']] });
  }
}
