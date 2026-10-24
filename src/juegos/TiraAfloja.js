// Juego 3: Tira y afloja. Dos equipos de 10 en dos torres, con una cuerda sobre el vacío.
// Las notas (botones A y B) viajan por un carril hacia el círculo: hay que apretar el botón cuando la nota llega.
// A = jalar al ritmo. B = aguantar cuando el otro equipo jala duro. Al pitazo, A para inclinarse.
// El abuelo 001 grita "¡tres pasos adelante!": derecha tres veces y el otro equipo se va de boca.

import Phaser from 'phaser';
import { Juego } from '../core/juego.js';
import { Actor } from '../core/actor.js';
import { E, dif, familiaNPC, NUMEROS } from '../core/estado.js';
import { sfx, tono, musica } from '../core/sonido.js';
import { eliminar, sacudir, fxSobre } from '../core/efectos.js';
import { cartel, esperar } from '../core/dialogo.js';
import { jugadoresNPC } from '../core/kit.js';
import { texto, COLOR, icono, cadaCuadro } from '../core/ui.js';
import { rayos as rayosLuz, chispas, vapor, lampara } from '../core/vivo.js';

const PISO = 171, CENTRO = 320;
const CARRIL = { x0: 130, x1: 560, y: 300 }; // el círculo está en x0

export class TiraAfloja extends Juego {
  constructor() { super('TiraAfloja'); }

  ambiente() { return { vineta: 0.6, motas: 12, color: 0xdfe6ff }; }

  armar() {
    const W = this.scale.width, H = this.scale.height;
    this.add.image(W / 2, H / 2, 'tira').setDepth(-100);
    this.cuerda = this.add.graphics().setDepth(400);
    const ids = jugadoresNPC();
    const nuestros = [E.perfil, ...familiaNPC(), 'j_abuelo', ids[0], ids[3], ids[6], ids[9], ids[12]];
    this.equipo = nuestros.map((id, i) => { const a = new Actor(this, id, 0, PISO, { dir: 'right' }); a.base = 236 - i * 23; return a; });
    this.jugador = this.equipo[0];
    this.jugador.ponerNumero(NUMEROS[E.perfil], 0x7fffe0);
    this.jugador.ponerFlecha();
    this.familia = this.equipo.slice(1, 4);
    this.rivales = ids.slice(4, 14).map((id, i) => { const a = new Actor(this, id, 0, PISO, { dir: 'left' }); a.base = 404 + i * 23; return a; });
    this.r = 0; // la cuerda: positivo hacia nosotros, 1 = ganamos
    this.tiempo = dif(70, 60, 50);
    this.compas = dif(0.78, 0.64, 0.52);
    this.viaje = dif(1.9, 1.6, 1.35); // segundos que tarda una nota en llegar al círculo
    this.notas = [];
    this.tNota = 0.6;
    this.fuerzas = [0.6, 0.6, 0.6, 0.6];
    this.aciertos = 0; this.total = 0;
    this.oleada = 0; this.tOleada = 7;
    this.trucoHecho = false; this.truco = null; this.tropiezo = 0; this.aguante = 0;
    // el carril de ritmo
    const c = CARRIL;
    this.add.rectangle((c.x0 + c.x1) / 2, c.y, c.x1 - c.x0 + 60, 54, 0x07060c, 0.72).setStrokeStyle(2, 0x3a3646).setDepth(800);
    this.add.rectangle((c.x0 + c.x1) / 2, c.y, c.x1 - c.x0, 2, 0x3a3646).setDepth(801);
    this.objetivo = this.add.circle(c.x0, c.y, 21).setStrokeStyle(4, 0xffffff).setDepth(802);
    this.brillo = this.add.circle(c.x0, c.y, 21, 0xffffff, 0).setDepth(801);
    this.calif = texto(this, c.x0, c.y - 40, '', { tam: 16, negrita: true, origen: [0.5, 0.5] }).setDepth(803);
    this.avisoT = texto(this, W / 2, 236, '', { tam: 20, negrita: true, origen: [0.5, 0.5] }).setDepth(803);
    // el medidor de la cuerda
    this.add.rectangle(W / 2, 54, 280, 10, 0x2a2632).setStrokeStyle(2, 0x4a4656).setDepth(800);
    this.add.rectangle(W / 2 - 140, 54, 6, 18, 0x2fd4b4).setDepth(801);
    this.add.rectangle(W / 2 + 140, 54, 6, 18, 0xff4d6d).setDepth(801);
    this.add.rectangle(W / 2, 54, 2, 16, 0xffffff).setDepth(801);
    this.marca = this.add.rectangle(W / 2, 54, 8, 14, 0xff4d8d).setDepth(802);
    texto(this, W / 2 - 148, 54, 'NOSOTROS', { tam: 11, color: COLOR.verde, origen: [1, 0.5] }).setDepth(801);
    texto(this, W / 2 + 148, 54, 'ELLOS', { tam: 11, color: COLOR.rojo, origen: [0, 0.5] }).setDepth(801);
    this.colocar();
  }

  colocar() {
    const d = this.r * 92;
    this.equipo.forEach((a) => { if (a.vivo) a.x = a.base - d; });
    this.rivales.forEach((a) => { if (a.vivo) a.x = a.base - d; });
    const g = this.cuerda;
    g.clear();
    const x0 = this.equipo[this.equipo.length - 1].x - 8, x1 = this.rivales[this.rivales.length - 1].x + 8;
    g.lineStyle(4, 0x6a4a24); g.lineBetween(x0, PISO - 29, x1, PISO - 29);
    g.lineStyle(1, 0xc8a46a); g.lineBetween(x0, PISO - 30, x1, PISO - 30);
    g.fillStyle(0xe0457b); g.fillRect(CENTRO - d - 3, PISO - 35, 6, 12);
    this.marca.x = this.scale.width / 2 - this.r * 138;
  }

  decorar() {
    // los focos del techo titilan con su cono de luz, la polea echa chispas y del vacío sube vapor
    lampara(this, { x: 130, y: 28, escala: 1.6, color: 0xdfe8ff, alfa: 0.5, prof: -80, falla: 0.03 });
    lampara(this, { x: 525, y: 28, escala: 1.6, color: 0xdfe8ff, alfa: 0.5, prof: -80, falla: 0.02 });
    rayosLuz(this, { x: 112, y: 30, angulo: 0, n: 1, largo: 160, ancho: 36, color: 0xdfe8ff, alfa: 0.06, prof: -70 });
    rayosLuz(this, { x: 507, y: 30, angulo: 0, n: 1, largo: 160, ancho: 36, color: 0xdfe8ff, alfa: 0.06, prof: -70 });
    chispas(this, { x: 320, y: 96, cada: 2200, prof: -60 });
    vapor(this, { x: 320, y: 300, color: 0x8a90a8, cada: 500, prof: -75, alfa: 0.14 });
  }

  reglas() {
    return {
      objetivo: ['Las notas viajan hacia el círculo blanco: aprieta el botón justo cuando llegan.', 'A = jalar. B = aguantar cuando ellos jalan duro.', 'Cuando el abuelo 001 grite, ¡derecha tres veces!'],
      controles: [['a', 'Jalar'], ['b', 'Aguantar'], ['palanca', '→ → → tres pasos']],
      frase: [['j_abuelo', 'feliz', 'Yo jugaba esto de niño. Al pitazo, échense para atrás. Y jalen todos al mismo ritmo.']],
    };
  }

  async antesDeEmpezar() {
    this.equipo.forEach((a) => a.anim('judo_grip', 'right'));
    this.rivales.forEach((a) => a.anim('judo_grip', 'left'));
    await cartel(this, 'LISTOS...', '', { ms: 900 + Math.random() * 900, fondo: false });
    // el pitazo: A rápido para inclinarse
    sfx(this, 'pitazo_largo', 0.7);
    const W = this.scale.width;
    const ic = icono(this, W / 2, 140, 'a', 64).setDepth(9000);
    this.avisoT.setText('¡INCLÍNATE!').setColor(COLOR.oro);
    const t0 = this.time.now;
    let ok = false;
    await new Promise((res) => {
      const f = () => {
        if (this.inp.tomarA()) { ok = this.time.now - t0 < 800; this.events.off('update', f); res(); }
        if (this.time.now - t0 > 1300) { this.events.off('update', f); res(); }
      };
      cadaCuadro(this, f);
    });
    ic.destroy();
    if (ok) { this.r = 0.2; tono(1320, 0.15, 'campana', 0.12); this.avisoT.setText('¡BUENA INCLINADA!').setColor(COLOR.verde); }
    else { this.r = -0.15; this.avisoT.setText('Tarde...').setColor('#ff8fb5'); }
    this.time.delayedCall(900, () => this.avisoT.setText(''));
    this.colocar();
  }

  empezar() { musica('guardias'); }

  /** una nota nueva en el carril: llega al círculo en `viaje` segundos */
  nota(tipo) {
    const c = CARRIL;
    const img = icono(this, c.x1, c.y, tipo, 36).setDepth(805);
    this.notas.push({ tipo, img, t: 0, hecha: false });
  }

  calificar(texto_, color, tonoF) {
    this.calif.setText(texto_).setColor(color).setAlpha(1).setScale(1.2);
    this.tweens.add({ targets: this.calif, alpha: 0, scale: 1, duration: 550 });
    if (tonoF) tono(tonoF, 0.06, 'campana', 0.1);
  }

  apretar(tipo) {
    // la nota más cercana al círculo de ese tipo
    const c = CARRIL;
    let mejor = null, md = 1e9;
    for (const n of this.notas) {
      if (n.hecha || n.tipo !== tipo) continue;
      const d = Math.abs(n.t - this.viaje);
      if (d < md) { md = d; mejor = n; }
    }
    if (!mejor || md > 0.3) { this.fuerzas.push(0.1); this.fuerzas.shift(); this.calificar('¡ANTES DE TIEMPO!', '#ff8fb5', 220); return; }
    mejor.hecha = true;
    this.total++;
    let f;
    if (md < dif(0.11, 0.085, 0.065)) { f = 1.08; this.aciertos++; this.calificar('¡PERFECTO!', COLOR.verde, 1046); this.brillo.setFillStyle(0x2fd4b4, 0.6); }
    else if (md < dif(0.22, 0.17, 0.13)) { f = 0.72; this.aciertos += 0.6; this.calificar('BIEN', COLOR.oro, 784); this.brillo.setFillStyle(0xf7c948, 0.5); }
    else { f = 0.2; this.calificar('FUERA DE RITMO', COLOR.rojo, 220); }
    this.tweens.add({ targets: this.brillo, fillAlpha: 0, duration: 250 });
    this.tweens.add({ targets: mejor.img, scale: mejor.img.scale * 1.6, alpha: 0, duration: 200, onComplete: () => mejor.img.destroy() });
    if (tipo === 'a') {
      this.fuerzas.push(f); this.fuerzas.shift();
      this.jugador.anim('grab_hold', 'right', true);
      this.time.delayedCall(200, () => this.jugador.vivo && this.jugador.anim('judo_grip', 'right'));
    } else if (f > 0.5) this.aguante = 1.2;
    void c;
  }

  paso(dt) {
    this.tiempo -= dt;
    this.hud.setTiempo(this.tiempo);
    const c = CARRIL;

    // las notas: una por compás (B durante la oleada)
    this.tNota -= dt;
    if (this.tNota <= 0 && !this.truco) {
      this.tNota += this.compas;
      this.nota(this.oleada > 0 && Math.random() < 0.6 ? 'b' : 'a');
    }
    for (const n of this.notas) {
      n.t += dt;
      const k = n.t / this.viaje;
      if (!n.hecha) n.img.setX(c.x1 + (c.x0 - c.x1) * k);
      if (!n.hecha && n.t > this.viaje + 0.3) {
        n.hecha = true; this.total++;
        if (n.tipo === 'a') { this.fuerzas.push(0.2); this.fuerzas.shift(); }
        this.calificar('SE PASÓ', COLOR.apagado, null);
        this.tweens.add({ targets: n.img, alpha: 0, duration: 150, onComplete: () => n.img.destroy() });
      }
    }
    this.notas = this.notas.filter((n) => !n.hecha || n.img.active);
    if (this.inp.tomarA() && !this.truco) this.apretar('a');
    if (this.inp.tomarB() && !this.truco) this.apretar('b');
    // el círculo late con el ritmo
    this.objetivo.setScale(1 + Math.max(0, 0.15 - (this.tNota / this.compas) * 0.15));
    const nuestra = this.fuerzas.reduce((a, b) => a + b, 0) / 4;

    // las oleadas del otro equipo (con aviso)
    this.tOleada -= dt;
    if (this.tOleada <= 0 && this.oleada <= 0) {
      this.oleada = 2.4; this.tOleada = 6 + Math.random() * 4;
      this.avisoT.setText('¡ELLOS JALAN DURO! ¡AGUANTA CON B!').setColor(COLOR.rojo);
      sacudir(this, 300, 0.004);
    }
    let rival = dif(0.6, 0.7, 0.8);
    if (this.oleada > 0) {
      this.oleada -= dt;
      rival += this.aguante > 0 ? 0.05 : dif(0.35, 0.45, 0.55);
      if (this.oleada <= 0) this.avisoT.setText('');
    }
    if (this.aguante > 0) this.aguante -= dt;

    // el truco de los tres pasos
    if (!this.trucoHecho && !this.truco && (this.r < -0.25 || this.tiempo < dif(45, 38, 30))) {
      this.truco = { t: dif(2.8, 2.2, 1.7), n: 0, soltado: true };
      this.avisoT.setText('001: ¡TRES PASOS ADELANTE!  →  →  →').setColor(COLOR.oro);
      fxSobre(this, this.equipo[4], 'exclamacion');
      tono(880, 0.1, 'metal', 0.15);
    }
    if (this.truco) {
      const tr = this.truco;
      tr.t -= dt;
      if (this.inp.x > 0.5 && tr.soltado) { tr.n++; tr.soltado = false; tono(600 + tr.n * 200, 0.05, 'cuadrada', 0.08); this.r -= 0.05; this.avisoT.setText('→ '.repeat(tr.n) + '· '.repeat(3 - tr.n)); }
      if (this.inp.x <= 0.3) tr.soltado = true;
      if (tr.n >= 3) {
        this.truco = null; this.trucoHecho = true; this.tropiezo = 2.4;
        this.avisoT.setText('¡SE FUERON DE BOCA!').setColor(COLOR.verde);
        this.rivales.forEach((a) => a.vivo && a.anim('stagger', 'left', true));
        sacudir(this, 300, 0.01);
        sfx(this, 'publico_ooh', 0.4);
        this.time.delayedCall(1200, () => this.avisoT.setText(''));
      } else if (tr.t <= 0) {
        this.truco = null; this.trucoHecho = true;
        this.avisoT.setText('No dio tiempo...').setColor('#ff8fb5');
        this.time.delayedCall(1000, () => this.avisoT.setText(''));
      }
    }
    if (this.tropiezo > 0) {
      this.tropiezo -= dt; rival = -0.4;
      if (this.tropiezo <= 0) this.rivales.forEach((a) => a.vivo && a.anim('judo_grip', 'left'));
    }

    this.r += (nuestra - rival) * dt * 0.2;
    this.colocar();

    if (this.r >= 1) this.ganarTira();
    else if (this.r <= -1) this.perderTira();
    else if (this.tiempo <= 0) (this.r > 0 ? this.ganarTira() : this.perderTira());
  }

  estrellas() {
    const p = this.total ? this.aciertos / this.total : 0;
    return (p > 0.75 ? 3 : p > 0.5 ? 2 : 1) - Math.max(0, this.vidasInicio - E.vidas);
  }

  async ganarTira() {
    this.jugando = false;
    this.notas.forEach((n) => n.img.active && n.img.destroy());
    sfx(this, 'publico_grito', 0.4);
    for (const [i, a] of this.rivales.entries()) {
      this.time.delayedCall(i * 90, () => { this.contarEliminado(); eliminar(this, a, { modo: 'caida', dy: 200, sonido: i === 0 }); });
    }
    await esperar(this, 1600);
    this.cuerda.clear();
    this.ganar({ lineas: [['j_abuelo', 'feliz', '¡Je, je! ¿Vieron? Los viejos todavía servimos para algo.']] });
  }

  async perderTira() {
    this.jugando = false;
    this.notas.forEach((n) => n.img.active && n.img.destroy());
    this.equipo.slice(4).forEach((a, i) => this.time.delayedCall(i * 90, () => eliminar(this, a, { modo: 'caida', dy: 200, sonido: false })));
    this.familia.forEach((f) => f.anim('edge_teeter', 'right'));
    this.perder('AL VACÍO', { modo: 'caida', dy: 200 });
  }
}
