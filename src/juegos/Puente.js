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
import { lienzo, texturasLuz } from '../escenas/pintura.js';

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
    this.texturas();
    // el vacío debajo del puente: oscuro hacia abajo, con neblina que pasa
    this.add.image(0, Y_ABA + 26, 'pt_abismo').setOrigin(0).setDisplaySize(this.largo, H - Y_ABA - 26).setDepth(-60);
    this.nieblas = [[Y_ABA + 60, 0.35, 14], [Y_ABA + 100, 0.5, 22]].map(([y, a, v]) => ({ ts: this.add.tileSprite(0, y, this.largo, 48, 'pt_niebla').setOrigin(0).setAlpha(a).setDepth(-55), v }));
    // focos que barren el puente desde arriba
    texturasLuz(this);
    this.focos = this.add.graphics().setDepth(4000).setBlendMode(Phaser.BlendModes.ADD);
    this.tLuz = 0;
    this.plataforma(0, X0 - 30, false);
    this.plataforma(X0 + this.n * PASO - 8, this.largo, true);
    this.estructura();
    this.templado = Array.from({ length: this.n }, () => (Math.random() < 0.5 ? 0 : 1));
    this.rotos = Array.from({ length: this.n }, () => [false, false]);
    this.sabidos = Array.from({ length: this.n }, () => [false, false]);
    // cada vidrio es una imagen, con un destello que recorre el puente
    this.paneles = Array.from({ length: this.n }, (_, i) => [0, 1].map((f) => {
      const x = X0 + i * PASO, y = f ? Y_ABA : Y_ARR;
      return { img: this.add.image(x, y, 'pt_vidrio').setDepth(5), luz: this.add.image(x, y, 'pt_destello').setDepth(6).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0) };
    }));
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

  /** las texturas del puente: vidrio, vidrio seguro, roto, el destello, la neblina, el abismo y el piso de acero */
  texturas() {
    lienzo(this, 'pt_vidrio', 40, 30, (P, c) => {
      c.fillStyle = 'rgba(150,205,245,0.28)'; c.fillRect(1, 1, 38, 28);
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(1, 1, 38, 9);
      P.r(0, 0, 40, 1, '#e8f6ff'); P.r(0, 29, 40, 1, '#5a7a96'); P.r(0, 0, 1, 30, '#cfeaff'); P.r(39, 0, 1, 30, '#6a8aa6');
      c.fillStyle = 'rgba(255,255,255,0.55)';
      for (let k = 0; k < 7; k++) { c.fillRect(6 + k, 22 - k * 2, 1, 2); c.fillRect(11 + k, 25 - k * 2, 1, 2); }
      c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(3, 3, 6, 1); c.fillRect(3, 5, 3, 1);
    });
    lienzo(this, 'pt_seguro', 40, 30, (P, c) => {
      c.fillStyle = 'rgba(80,230,190,0.38)'; c.fillRect(1, 1, 38, 28);
      c.fillStyle = 'rgba(255,255,255,0.14)'; c.fillRect(1, 1, 38, 9);
      P.r(0, 0, 40, 1, '#c8fff0'); P.r(0, 29, 40, 1, '#1a8a72'); P.r(0, 0, 1, 30, '#9affe0'); P.r(39, 0, 1, 30, '#2a9a82');
      c.fillStyle = 'rgba(255,255,255,0.5)';
      for (let k = 0; k < 7; k++) c.fillRect(6 + k, 22 - k * 2, 1, 2);
      P.elip(20, 16, 3, 3, '#2fd4b4'); P.elip(20, 16, 1, 1, '#d8fff4');
    });
    lienzo(this, 'pt_roto', 40, 30, (P, c) => {
      P.r(0, 0, 40, 1, '#5a6a7a'); P.r(0, 29, 40, 1, '#3a4a5a'); P.r(0, 0, 1, 30, '#5a6a7a'); P.r(39, 0, 1, 30, '#3a4a5a');
      c.fillStyle = 'rgba(160,215,255,0.55)';
      c.beginPath(); c.moveTo(1, 1); c.lineTo(10, 1); c.lineTo(4, 8); c.lineTo(1, 12); c.fill();
      c.beginPath(); c.moveTo(39, 29); c.lineTo(30, 29); c.lineTo(36, 22); c.lineTo(39, 18); c.fill();
      c.beginPath(); c.moveTo(39, 1); c.lineTo(33, 1); c.lineTo(38, 6); c.fill();
    });
    lienzo(this, 'pt_destello', 40, 30, (P, c) => {
      for (let k = 0; k < 30; k++) { c.fillStyle = `rgba(255,255,255,${0.5 - Math.abs(k - 15) / 32})`; c.fillRect(Math.max(1, 28 - k), k, 6, 1); }
    });
    lienzo(this, 'pt_niebla', 256, 48, (P, c) => {
      const nube = (x, y, r) => {
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(180,190,220,0.22)'); g.addColorStop(1, 'rgba(180,190,220,0)');
        c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
      };
      for (let i = 0; i < 40; i++) {
        const x = P.rnd() * 256, y = 10 + P.rnd() * 28, r = 10 + P.rnd() * 18;
        nube(x, y, r);
        // repetida del otro lado para que la tira empalme sin corte
        if (x < r) nube(x + 256, y, r);
        if (x > 256 - r) nube(x - 256, y, r);
      }
    }, 31);
    lienzo(this, 'pt_abismo', 4, 64, (P, c) => {
      const g = c.createLinearGradient(0, 0, 0, 64);
      g.addColorStop(0, 'rgba(4,3,10,0.15)'); g.addColorStop(1, 'rgba(4,3,10,0.92)');
      c.fillStyle = g; c.fillRect(0, 0, 4, 64);
    });
    lienzo(this, 'pt_acero', 32, 32, (P) => {
      P.r(0, 0, 32, 32, '#3a3a48');
      for (let y = 2; y < 32; y += 8) for (let x = (y / 8) % 2 ? 6 : 2; x < 32; x += 8) { P.r(x, y, 3, 1, '#565668'); P.r(x + 1, y + 1, 1, 1, '#24242e'); }
      P.ruido(0, 0, 32, 32, '#44445a', 30);
    }, 7);
  }

  /** los rieles de acero con remaches, los travesaños y el reticulado de abajo (para que se sienta la altura) */
  estructura() {
    const g = this.add.graphics().setDepth(1);
    const xa = X0 - 30, xb = X0 + this.n * PASO - 8;
    // el reticulado debajo del puente
    g.lineStyle(3, 0x1e1e28);
    for (let x = xa; x < xb; x += PASO) { g.lineBetween(x, Y_ABA + 20, x + PASO / 2, Y_ABA + 46); g.lineBetween(x + PASO / 2, Y_ABA + 46, x + PASO, Y_ABA + 20); }
    g.fillStyle(0x1e1e28); g.fillRect(xa, Y_ABA + 44, xb - xa, 4);
    g.lineStyle(1, 0x3a3a4a);
    for (let x = xa; x < xb; x += PASO) g.lineBetween(x, Y_ABA + 20, x + PASO / 2, Y_ABA + 46);
    // los rieles de arriba, del medio y de abajo
    const riel = (y, h) => {
      g.fillStyle(0x24242e); g.fillRect(xa, y, xb - xa, h);
      g.fillStyle(0x5a5a6c); g.fillRect(xa, y, xb - xa, 1);
      g.fillStyle(0x14141a); g.fillRect(xa, y + h - 1, xb - xa, 1);
      for (let x = xa + 4; x < xb; x += 8) { g.fillStyle(0x7a7a8c); g.fillRect(x, y + Math.floor(h / 2), 1, 1); }
    };
    riel(Y_ARR - 19, 5);
    riel((Y_ARR + Y_ABA) / 2 - 3, 6);
    riel(Y_ABA + 15, 6);
    // los travesaños entre vidrios
    for (let i = 0; i <= this.n; i++) {
      const x = X0 - PASO / 2 + i * PASO;
      g.fillStyle(0x24242e); g.fillRect(x - 2, Y_ARR - 16, 4, Y_ABA - Y_ARR + 34);
      g.fillStyle(0x5a5a6c); g.fillRect(x - 2, Y_ARR - 16, 1, Y_ABA - Y_ARR + 34);
    }
  }

  plataforma(x0, x1, final) {
    const top = Y_ARR - 22, base = Y_ABA + 24;
    this.add.tileSprite(x0, top, x1 - x0, base - top, 'pt_acero').setOrigin(0).setDepth(0);
    const g = this.add.graphics().setDepth(0.5);
    // el borde con rayas de peligro del lado del puente
    const bx = final ? x0 : x1 - 8;
    for (let y = top; y < base; y += 8) { g.fillStyle(0xf2c230); g.fillRect(bx, y, 8, 4); g.fillStyle(0x1a1a20); g.fillRect(bx, y + 4, 8, 4); }
    g.fillStyle(0x5a5a6c); g.fillRect(x0, top, x1 - x0, 2);
    // el frente de la plataforma (la caída)
    g.fillStyle(0x16141e); g.fillRect(x0, base, x1 - x0, 40);
    g.fillStyle(0x2a2836); g.fillRect(x0, base, x1 - x0, 3);
    for (let x = x0 + 6; x < x1; x += 22) { g.fillStyle(0x0c0b12); g.fillRect(x, base + 8, 12, 30); }
    // las barandas
    for (let x = x0 + 8; x < x1 - 8; x += 26) { g.fillStyle(0x6a6a7c); g.fillRect(x, top - 14, 2, 14); }
    g.fillStyle(0x8a8a9c); g.fillRect(x0, top - 15, x1 - x0, 2);
    if (final) {
      // la salida iluminada al final
      const sx = x0 + 120;
      g.fillStyle(0x0c0b12); g.fillRect(sx - 18, top - 46, 36, 50);
      g.fillStyle(0xfff0c0); g.fillRect(sx - 14, top - 42, 28, 46);
      g.fillStyle(0xffd870); g.fillRect(sx - 14, top - 10, 28, 14);
      const luz = this.add.image(sx, top - 20, 'brillo').setScale(3).setTint(0xffe8a0).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(0.6);
      this.tweens.add({ targets: luz, alpha: 0.3, duration: 1200, yoyo: true, repeat: -1 });
      texto(this, sx, top - 58, 'SALIDA', { tam: 14, negrita: true, color: '#7fffe0', origen: [0.5, 0.5] }).setDepth(0.7);
    }
  }

  pintarVidrios() {
    for (let i = 0; i < this.n; i++) for (const f of [0, 1]) {
      const p = this.paneles[i][f];
      p.img.setTexture(this.rotos[i][f] ? 'pt_roto' : this.sabidos[i][f] ? 'pt_seguro' : 'pt_vidrio');
      p.roto = this.rotos[i][f];
    }
  }

  /** lo que se mueve solo: el destello que recorre los vidrios, la neblina y los focos */
  vivo(dt) {
    this.tLuz += dt;
    for (let i = 0; i < this.n; i++) for (const f of [0, 1]) {
      const p = this.paneles[i][f];
      const v = Math.sin(this.tLuz * 1.6 - i * 0.45 - f * 0.3);
      p.luz.setAlpha(p.roto ? 0 : Math.max(0, v) ** 10 * 0.9);
    }
    this.nieblas.forEach((n) => (n.ts.tilePositionX += n.v * dt));
    const g = this.focos, cam = this.cameras.main;
    g.clear();
    [0, 1, 2].forEach((k) => {
      const x = cam.scrollX + 120 + k * 200 + Math.sin(this.tLuz * 0.5 + k * 2) * 90;
      const xb = x + Math.sin(this.tLuz * 0.7 + k) * 60;
      g.fillStyle(0xcfe4ff, 0.06); g.fillTriangle(x - 6, 0, x + 6, 0, xb + 50, 330); g.fillTriangle(x - 6, 0, xb - 50, 330, xb + 50, 330);
    });
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

  update(t, dtms) {
    super.update(t, dtms);
    if (this.paneles) this.vivo(Math.min(dtms, 50) / 1000);
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
        const brillo = this.add.rectangle(X0 + c * PASO, y, 38, 28, 0xffffff, 0.8).setDepth(7).setBlendMode(Phaser.BlendModes.ADD);
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
