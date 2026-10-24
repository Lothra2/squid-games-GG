// Juego 2: La galleta (dalgona). Se elige una fila sin saber la figura. Hay que raspar la orilla con la aguja:
// mantener A (presión) y empujar la palanca en la dirección de la línea. Raspar sin parar calienta la galleta, y
// empujar para otro lado la calienta mucho más. A veces suena un "¡crac!": hay que soltar A ya, o se rompe.
// B: lamer (pocas veces): ablanda el caramelo un rato.

import Phaser from 'phaser';
import { Juego } from '../core/juego.js';
import { Actor } from '../core/actor.js';
import { E, dif } from '../core/estado.js';
import { sfx, tono, musica } from '../core/sonido.js';
import { eliminar, sacudir, chorro } from '../core/efectos.js';
import { elegir, hablar, cartel } from '../core/dialogo.js';
import { texto, COLOR, icono } from '../core/ui.js';

const CX = 240, CY = 196, K = 1.4;

function remuestrear(pts, paso = 1) {
  const out = [pts[0]];
  let resto = 0;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const d = Math.hypot(x1 - x0, y1 - y0);
    let t = paso - resto;
    while (t <= d) { out.push([x0 + ((x1 - x0) * t) / d, y0 + ((y1 - y0) * t) / d]); t += paso; }
    resto = d - (t - paso);
  }
  return out;
}

const FIGURAS = {
  circulo() { const p = []; for (let i = 0; i <= 64; i++) { const a = -Math.PI / 2 + (i / 64) * Math.PI * 2; p.push([Math.cos(a) * 34, Math.sin(a) * 34]); } return p; },
  triangulo() { const r = 42; return [0, 1, 2, 0].map((k) => { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 3; return [Math.cos(a) * r, Math.sin(a) * r + 6]; }); },
  estrella() { const p = []; for (let k = 0; k <= 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5; const r = k % 2 ? 18 : 42; p.push([Math.cos(a) * r, Math.sin(a) * r + 3]); } return p; },
  // el paraguas: la copa, las ondas de abajo y el mango con su gancho
  paraguas() {
    const p = [];
    for (let i = 0; i <= 24; i++) { const a = Math.PI + (i / 24) * Math.PI; p.push([Math.cos(a) * 40, Math.sin(a) * 34 - 4]); }
    const onda = (x0, x1) => { for (let i = 1; i <= 8; i++) { const t = i / 8; p.push([x0 + (x1 - x0) * t, -4 + Math.sin(t * Math.PI) * 6]); } };
    onda(40, 20); onda(20, 3);
    p.push([3, 30]);
    for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI; p.push([-5 + Math.cos(a) * 8, 30 + Math.sin(a) * 8]); }
    p.push([-13, 26]); p.push([-10, 26]);
    for (let i = 10; i >= 0; i--) { const a = (i / 10) * Math.PI; p.push([-5 + Math.cos(a) * 5, 30 + Math.sin(a) * 5]); }
    p.push([-3, -2]);
    onda(-3, -20); onda(-20, -40);
    return p;
  },
};

const NOMBRE_FIG = { circulo: 'EL CÍRCULO', triangulo: 'EL TRIÁNGULO', estrella: 'LA ESTRELLA', paraguas: 'EL PARAGUAS' };

export class Galleta extends Juego {
  constructor() { super('Galleta'); this.usaPistas = true; }

  ambiente() { return { vineta: 0.5, motas: 10, color: 0xffe0a0 }; }

  armar() {
    const W = this.scale.width, H = this.scale.height;
    this.add.image(W / 2, H / 2, 'galleta').setDepth(-100);
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.42).setDepth(-90);
    // la gente sentada alrededor, de fondo
    this.gente = this.crearGente(10, (i) => [26 + (i % 2) * 42, 110 + Math.floor(i / 2) * 50 + (i % 2) * 18, 'right']);
    this.gente.forEach((g) => g.anim('eat'));
    this.crearFamilia([[420, 312, 'left'], [462, 322, 'left'], [504, 312, 'left']]);
    this.familia.forEach((f) => f.anim('eat'));
    // la lata y la galleta
    this.add.circle(CX, CY, 132, 0x6f7884).setDepth(9);
    this.add.circle(CX, CY, 128, 0x9aa3ae).setStrokeStyle(4, 0x4a5058).setDepth(10);
    this.add.circle(CX, CY, 120, 0xb8c0ca).setDepth(10);
    this.add.circle(CX - 50, CY - 60, 18, 0xffffff, 0.12).setDepth(10);
    this.galleta = this.add.graphics().setDepth(11);
    this.pintarGalleta();
    this.surco = this.add.graphics().setDepth(12);
    this.grietas = this.add.graphics().setDepth(13);
    this.aguja = this.add.graphics().setDepth(14);
    this.guia = this.add.image(0, 0, 'triangulo').setTint(0x7fffe0).setScale(0.6).setDepth(15).setAlpha(0.9);
    // el retrato del jugador y los medidores
    const px = W - 112;
    this.add.image(px, 108, 'marco_retrato_96').setDepth(20);
    this.cara = this.add.image(px, 108, 'ret_' + E.perfil, 'g_neutral').setDepth(21);
    texto(this, px, 178, 'CALOR', { tam: 13, negrita: true, origen: [0.5, 0.5] }).setDepth(20);
    this.add.rectangle(px, 194, 154, 12, 0x1a1622).setStrokeStyle(2, 0x5a5666).setDepth(20);
    this.barra = this.add.rectangle(px - 75, 194, 0, 8, 0x2fd4b4).setOrigin(0, 0.5).setDepth(21);
    texto(this, px, 216, 'AVANCE', { tam: 13, negrita: true, origen: [0.5, 0.5] }).setDepth(20);
    this.add.rectangle(px, 232, 154, 12, 0x1a1622).setStrokeStyle(2, 0x5a5666).setDepth(20);
    this.barraAv = this.add.rectangle(px - 75, 232, 0, 8, 0xf7c948).setOrigin(0, 0.5).setDepth(21);
    this.lamidas = dif(4, 3, 2) + this.pistasExtra;
    this.txtLamidas = texto(this, px, 256, '', { tam: 13, color: COLOR.apagado, origen: [0.5, 0.5] }).setDepth(20);
    this.aviso = texto(this, CX, 36, '', { tam: 18, negrita: true, origen: [0.5, 0.5] }).setDepth(30);
    this.tiempo = dif(110, 85, 65);
    this.tiempoTotal = this.tiempo;
    this.tension = 0;
    this.lamida = 0;
    this.lamiendo = 0;
    this.s = 0;
    this.tVecino = 6;
    this.crac = 0;           // segundos para soltar A cuando suena el crac
    this.tCrac = 6 + Math.random() * 5;
    this.fallosCrac = 0;
    this.actualizarLamidas();
  }

  actualizarLamidas() { this.txtLamidas.setText(`Lamidas: ${this.lamidas}  (B)`); }

  pintarGalleta() {
    const g = this.galleta;
    g.clear();
    g.fillStyle(0x7a4a14); g.fillCircle(CX, CY + 3, 98);
    g.fillStyle(0xd99a3a); g.fillCircle(CX, CY, 96);
    g.fillStyle(0xe8b04e); g.fillCircle(CX - 8, CY - 8, 84);
    g.fillStyle(0xf4c86a); g.fillCircle(CX - 26, CY - 30, 30);
    // las burbujitas del caramelo
    const rnd = new Phaser.Math.RandomDataGenerator(['dalgona']);
    for (let i = 0; i < 110; i++) {
      const a = rnd.frac() * Math.PI * 2, r = rnd.frac() * 88;
      g.fillStyle(rnd.frac() < 0.5 ? 0xc4842c : 0xf6d080, 0.85);
      g.fillCircle(CX + Math.cos(a) * r, CY + Math.sin(a) * r, 1 + rnd.frac() * 2.5);
    }
  }

  async antesDeEmpezar() {
    // las cuatro filas: no se sabe qué figura tiene cada una
    const figs = Phaser.Utils.Array.Shuffle(['circulo', 'triangulo', 'estrella', 'paraguas']);
    const r = await elegir(this, this.inp, ['Fila 1', 'Fila 2', 'Fila 3', 'Fila 4'], { titulo: '¿EN QUÉ FILA TE PARAS?' });
    this.figura = figs[r];
    this.armarFigura();
    await cartel(this, NOMBRE_FIG[this.figura], this.figura === 'paraguas' ? '¡la más difícil!' : this.figura === 'circulo' ? '¡la más fácil!' : '', { ms: 1400, color: 0xf7c948 });
    const lineas = {
      circulo: [['rick', 'feliz', '¡El círculo! Pero ojo: si aprietas sin seguir la línea, se raja igual.']],
      triangulo: [['steph', 'neutral', 'El triángulo. En cada esquina, suelta y cambia de dirección.']],
      estrella: [['sophie', 'susto', 'La estrella tiene diez puntas... ¡despacito en cada una!']],
      paraguas: [['alana', 'susto', '¡El paraguas! Ese es el más difícil de todos.'], ['steph', 'neutral', 'Lame la galleta cuando esté muy caliente. El caramelo se ablanda.']],
    }[this.figura];
    await hablar(this, this.inp, lineas);
  }

  armarFigura() {
    const pts = FIGURAS[this.figura]().map(([x, y]) => [CX + x * K, CY + y * K]);
    this.camino = remuestrear(pts, 1);
    this.largo = this.camino.length - 1;
    // las esquinas: donde la dirección cambia mucho
    this.esquinas = [];
    const k = 5;
    for (let i = k; i < this.camino.length - k; i++) {
      const [ax, ay] = this.camino[i - k], [bx, by] = this.camino[i], [cx, cy] = this.camino[i + k];
      const d = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(cy - by, cx - bx) - Math.atan2(by - ay, bx - ax)));
      if (d > 0.6) this.esquinas.push(i);
    }
    const g = this.add.graphics().setDepth(11.5);
    g.lineStyle(4, 0xa0681e, 0.9);
    g.beginPath(); g.moveTo(this.camino[0][0], this.camino[0][1]);
    this.camino.forEach(([x, y]) => g.lineTo(x, y));
    g.strokePath();
    g.lineStyle(1, 0x5a3208, 1);
    g.beginPath(); g.moveTo(this.camino[0][0], this.camino[0][1]);
    this.camino.forEach(([x, y]) => g.lineTo(x, y));
    g.strokePath();
    this.velRaspe = dif(24, 19, 15) * Math.max(1, this.largo / 340);
  }

  /** la dirección de la línea en un punto del camino (unitaria) */
  tangente(i) {
    const a = this.camino[Math.max(0, i - 3)], b = this.camino[Math.min(this.largo, i + 3)];
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    return [dx / d, dy / d];
  }

  reglas() {
    return {
      objetivo: ['Saca la figura de la galleta sin romperla.', 'Mantén A y empuja en la dirección de la línea (te guía la flechita).', 'Si suena ¡CRAC!, suelta A al instante. B: lamer para ablandar.'],
      controles: [['palanca', 'Dirección'], ['a', 'Raspar (mantener)'], ['b', 'Lamer']],
      frase: ['guardia_cuadrado', 'neutral', 'Juego 2. Diez minutos... bueno, menos. Si la figura se rompe, quedan eliminados.'],
    };
  }

  empezar() { musica('tension'); }

  paso(dt) {
    this.tiempo -= dt;
    this.hud.setTiempo(this.tiempo);
    if (this.tiempo <= 0) { this.romper('SE ACABÓ EL TIEMPO'); return; }

    // la gente de alrededor también juega: a veces se le rompe a alguien
    this.tVecino -= dt;
    if (this.tVecino <= 0) {
      this.tVecino = 5 + Math.random() * 8;
      const vivos = this.gente.filter((g) => g.vivo);
      if (vivos.length > 2 && Math.random() < 0.7) { sfx(this, 'romper', 0.3); this.contarEliminado(); eliminar(this, Phaser.Utils.Array.GetRandom(vivos)); }
    }

    // lamer
    if (this.lamiendo > 0) {
      this.lamiendo -= dt;
      this.tension = Math.max(0, this.tension - dt * 0.4);
      if (this.lamiendo <= 0) { this.lamida = 6; this.aviso.setText(''); }
    } else if (this.inp.tomarB()) {
      if (this.lamidas > 0) {
        this.lamidas--; this.actualizarLamidas();
        this.lamiendo = 1.6; this.crac = 0;
        this.aviso.setText('Lamiendo... el caramelo se ablanda').setColor(COLOR.azul);
        tono(330, 0.3, 'flauta', 0.08);
        this.cara.setFrame('g_cerrado');
      } else tono(200, 0.06, 'cuadrada', 0.05);
    }
    if (this.lamida > 0) this.lamida -= dt;

    const i = Math.floor(this.s);
    const [tx, ty] = this.tangente(i);
    const mag = Math.hypot(this.inp.x, this.inp.y);
    const ix = mag > 0.3 ? this.inp.x / mag : 0, iy = mag > 0.3 ? this.inp.y / mag : 0;
    const acuerdo = ix * tx + iy * ty; // 1 = justo en la línea
    const raspando = this.inp.a && this.lamiendo <= 0;
    const cerca = this.esquinas.some((e) => Math.abs(e - i) < 6);

    // el crac sorpresa: hay que soltar A rápido
    this.tCrac -= dt * (raspando ? 1 : 0.4);
    if (this.tCrac <= 0 && this.crac <= 0 && this.lamiendo <= 0 && this.s > 10) {
      this.crac = dif(0.95, 0.7, 0.5);
      this.tCrac = dif(9, 7, 5) + Math.random() * 5;
      this.aviso.setText('¡CRAC! ¡SUELTA!').setColor(COLOR.rojo);
      sfx(this, 'romper', 0.4);
      sacudir(this, 120, 0.004);
    }
    if (this.crac > 0) {
      if (!this.inp.a) { this.crac = 0; this.aviso.setText('¡Uf! A tiempo').setColor(COLOR.verde); this.time.delayedCall(700, () => this.crac <= 0 && this.lamiendo <= 0 && this.aviso.setText('')); }
      else { this.crac -= dt; if (this.crac <= 0) { this.fallosCrac++; this.romper('¡SE RAJÓ!'); return; } }
    }

    if (raspando) {
      let sube = dif(0.14, 0.2, 0.27) * (cerca ? 2.4 : 1);
      if (acuerdo > 0.6) {
        this.s = Math.min(this.largo, this.s + this.velRaspe * dt * (cerca ? 0.7 : 1) * Math.min(1, acuerdo + 0.2));
        if (Math.random() < dt * 14) tono(1800 + Math.random() * 600, 0.015, 'cuadrada', 0.02);
      } else {
        // apretar sin seguir la línea: la aguja se clava y calienta mucho
        sube *= acuerdo < -0.2 ? 4.5 : 3;
        if (Math.random() < dt * 6) tono(260, 0.03, 'cuadrada', 0.04);
      }
      if (this.lamida > 0) sube *= 0.5;
      this.tension += sube * dt;
    } else {
      this.tension = Math.max(0, this.tension - dt * 0.42);
    }
    if (this.tension > 0.72) {
      this.galleta.setPosition((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
      if (Math.random() < dt * 3) sfx(this, 'romper', 0.12);
    } else this.galleta.setPosition(0, 0);
    if (this.tension >= 1) { this.romper('¡SE ROMPIÓ!'); return; }

    // dibujar el surco, la aguja y la flechita guía
    this.surco.clear();
    this.surco.lineStyle(3, 0x3a2208, 1);
    this.surco.beginPath();
    this.surco.moveTo(this.camino[0][0], this.camino[0][1]);
    for (let k = 1; k <= Math.floor(this.s); k++) this.surco.lineTo(this.camino[k][0], this.camino[k][1]);
    this.surco.strokePath();
    const [ax, ay] = this.camino[i];
    this.aguja.clear();
    this.aguja.lineStyle(2, 0x8a929c); this.aguja.lineBetween(ax + 1, ay + 1, ax + 25, ay - 35);
    this.aguja.lineStyle(2, 0xe8eef4); this.aguja.lineBetween(ax, ay, ax + 24, ay - 36);
    this.aguja.fillStyle(0xffffff); this.aguja.fillCircle(ax, ay, 2);
    const verGuia = E.dificultad < 2 || cerca;
    this.guia.setVisible(verGuia).setPosition(ax + tx * 16, ay + ty * 16).setRotation(Math.atan2(ty, tx) + Math.PI / 2);
    this.guia.setTint(acuerdo > 0.6 ? 0x7fffe0 : 0xff8fb5);
    const t = Phaser.Math.Clamp(this.tension, 0, 1);
    this.barra.width = 150 * t;
    this.barra.fillColor = t < 0.5 ? 0x2fd4b4 : t < 0.75 ? 0xf7c948 : 0xff3355;
    this.barraAv.width = 150 * (this.s / this.largo);
    if (this.lamiendo <= 0) this.cara.setFrame(this.crac > 0 ? 'g_susto' : t > 0.75 ? 'g_susto' : t > 0.45 ? 'g_dolor' : 'g_neutral');

    if (this.s >= this.largo) this.terminarFigura();
  }

  estrellas() {
    const sobra = this.tiempo / this.tiempoTotal;
    return (sobra > 0.4 ? 3 : sobra > 0.2 ? 2 : 1) - Math.max(0, this.vidasInicio - E.vidas);
  }

  terminarFigura() {
    this.jugando = false;
    this.cara.setFrame('g_feliz');
    this.guia.setVisible(false);
    tono(1320, 0.2, 'campana', 0.15);
    // la figura sale entera: el borde se ilumina
    const g = this.add.graphics().setDepth(16);
    g.lineStyle(3, 0xfff0a8, 1);
    g.beginPath(); g.moveTo(this.camino[0][0], this.camino[0][1]);
    this.camino.forEach(([x, y]) => g.lineTo(x, y));
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0.2, duration: 300, yoyo: true, repeat: 2 });
    this.ganar({ texto: '¡FIGURA LISTA!', lineas: [['alana', 'feliz', '¡Yo también terminé la mía! ¿Ya nos la podemos comer?']] });
  }

  romper(motivo) {
    if (this.terminado) return;
    sfx(this, 'romper', 0.8);
    sacudir(this, 200, 0.012);
    this.cara.setFrame('g_susto');
    this.guia.setVisible(false);
    const [ax, ay] = this.camino[Math.floor(this.s)];
    this.grietas.lineStyle(2, 0x3a2208);
    for (let k = 0; k < 7; k++) {
      let x = ax, y = ay, a = Math.random() * Math.PI * 2;
      this.grietas.beginPath(); this.grietas.moveTo(x, y);
      for (let j = 0; j < 7; j++) { a += (Math.random() - 0.5) * 0.9; x += Math.cos(a) * 10; y += Math.sin(a) * 10; this.grietas.lineTo(x, y); }
      this.grietas.strokePath();
    }
    chorro(this, ax, ay, 20, [0xd99a3a, 0xe8b04e, 0x8a5a1c], 90, { g: 260 });
    if (!this.jugador) this.jugador = new Actor(this, E.perfil, 400, 318, { dir: 'left' });
    this.perder(motivo);
    void icono;
  }
}
