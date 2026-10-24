// Juego 2: La galleta (dalgona). Se elige una fila sin saber la figura. Con la palanca mueves la aguja por la
// galleta, y con A le das un golpecito donde está. Si el golpe cae sobre la línea, raspa ese pedazo; si cae afuera,
// la galleta se raja. Cada golpe calienta el caramelo (se enfría solo si esperas un poco). Las esquinas son
// delicadas. B: lamer (pocas veces): ablanda el caramelo un rato.

import Phaser from 'phaser';
import { Juego } from '../core/juego.js';
import { Actor } from '../core/actor.js';
import { E, dif } from '../core/estado.js';
import { sfx, tono, musica } from '../core/sonido.js';
import { eliminar, sacudir, chorro } from '../core/efectos.js';
import { elegir, hablar, cartel } from '../core/dialogo.js';
import { texto, COLOR, icono } from '../core/ui.js';
import { luciernagas, rayos as rayosLuz } from '../core/vivo.js';

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
    this.crearFamilia([[452, 316, 'left'], [494, 326, 'left'], [536, 316, 'left']]);
    this.familia.forEach((f) => f.anim('eat'));
    // tú también estás ahí, con tu galleta (la lata grande es lo que ves de cerca)
    this.crearJugador(404, 322, 'left');
    this.jugador.anim('eat', 'left');
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
    this.tVecino = 6;
    this.frio = 0;           // el tiempo mínimo entre golpecitos
    this.fallos = 0;
    // qué tan cerca de la línea tiene que caer el golpe, y cuánto raspa cada golpe
    this.tol = dif(7.5, 6, 4.5);
    this.radio = dif(10, 8, 6.5);
    this.tolVista = this.add.graphics().setDepth(14);
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
      circulo: [['rick', 'feliz', '¡El círculo! Pero ojo: un golpe afuera de la línea y se raja igual.']],
      triangulo: [['steph', 'neutral', 'El triángulo. En las esquinas, golpecitos suaves y con calma.']],
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
    this.raspado = new Uint8Array(this.camino.length);
    this.nRaspado = 0;
    this.punta = { x: this.camino[0][0], y: this.camino[0][1] - 18 };
  }

  /** el punto de la línea más cercano a (x, y): índice y distancia */
  masCerca(x, y) {
    let mi = 0, md = 1e9;
    for (let k = 0; k < this.camino.length; k++) { const d = Math.hypot(this.camino[k][0] - x, this.camino[k][1] - y); if (d < md) { md = d; mi = k; } }
    return { i: mi, d: md };
  }

  /** el pedazo sin raspar más cercano a la aguja (para la flechita guía) */
  pendienteCerca(x, y) {
    let mi = -1, md = 1e9;
    for (let k = 0; k < this.camino.length; k++) { if (this.raspado[k]) continue; const d = Math.hypot(this.camino[k][0] - x, this.camino[k][1] - y); if (d < md) { md = d; mi = k; } }
    return mi;
  }

  /** un golpecito de la aguja donde está la punta */
  picar() {
    const { x, y } = this.punta;
    const { i, d } = this.masCerca(x, y);
    const esquina = this.esquinas.some((e) => Math.abs(e - i) < 6);
    const blando = this.lamida > 0 ? 0.55 : 1;
    // la aguja baja y sube
    this.golpeT = 0.12;
    if (d <= this.tol) {
      const r = this.radio * (esquina ? 0.6 : 1);
      let nuevos = 0;
      for (let k = 0; k < this.camino.length; k++) {
        if (this.raspado[k]) continue;
        if (Math.hypot(this.camino[k][0] - x, this.camino[k][1] - y) <= r) { this.raspado[k] = 1; nuevos++; }
      }
      this.nRaspado += nuevos;
      const preciso = d <= this.tol * 0.45;
      this.jugador.anim('eat', 'left', true);
      this.tension += dif(0.045, 0.06, 0.08) * (esquina ? 1.6 : 1) * (preciso ? 0.7 : 1) * blando;
      tono(preciso ? 2200 : 1800, 0.02, 'cuadrada', 0.04);
      chorro(this, x, y, nuevos ? 5 : 2, [0xf6d080, 0xc4842c], 30, { g: 120, vida: 300, prof: 16 });
      if (nuevos) this.pintarSurco();
      if (preciso && nuevos) this.mensaje('¡Justo!', COLOR.verde);
    } else {
      // afuera de la línea: la galleta se raja un poquito
      this.fallos++;
      this.jugador.anim('hit', 'left', true);
      this.time.delayedCall(400, () => this.jugador.vivo && this.jugador.anim('eat', 'left'));
      this.tension += dif(0.14, 0.2, 0.27) * blando;
      sfx(this, 'romper', 0.25);
      sacudir(this, 90, 0.004);
      this.grieta(x, y, 2 + Math.min(4, Math.floor(this.tension * 5)));
      this.mensaje('¡Afuera de la línea!', COLOR.rojo);
    }
  }

  mensaje(t, color) {
    if (this.lamiendo > 0) return;
    this.aviso.setText(t).setColor(color);
    if (this.tMsj) this.tMsj.remove();
    this.tMsj = this.time.delayedCall(700, () => this.lamiendo <= 0 && this.aviso.setText(''));
  }

  /** una rajadura que sale de donde cayó el golpe */
  grieta(x, y, largo) {
    const g = this.grietas;
    g.lineStyle(1, 0x6a3a10, 0.9);
    let a = Math.random() * Math.PI * 2;
    g.beginPath(); g.moveTo(x, y);
    for (let j = 0; j < largo; j++) { a += (Math.random() - 0.5) * 1.1; x += Math.cos(a) * 4; y += Math.sin(a) * 4; g.lineTo(x, y); }
    g.strokePath();
  }

  pintarSurco() {
    const g = this.surco;
    g.clear();
    g.lineStyle(3, 0x3a2208, 1);
    for (let k = 1; k < this.camino.length; k++) {
      if (this.raspado[k] && this.raspado[k - 1]) g.lineBetween(this.camino[k - 1][0], this.camino[k - 1][1], this.camino[k][0], this.camino[k][1]);
    }
  }

  /** la dirección de la línea en un punto del camino (unitaria) */
  tangente(i) {
    const a = this.camino[Math.max(0, i - 3)], b = this.camino[Math.min(this.largo, i + 3)];
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    return [dx / d, dy / d];
  }

  decorar() {
    // burbujas de jabón que flotan en el patio y la luz del sol
    luciernagas(this, { n: 10, area: [0, 40, 640, 300], color: 0xcfeaff, tam: 3, prof: -10 });
    rayosLuz(this, { x: 380, y: 0, angulo: -0.5, n: 4, largo: 300, ancho: 28, color: 0xfff6d0, alfa: 0.06 });
  }

  reglas() {
    return {
      objetivo: ['Saca la figura de la galleta sin romperla.', 'Con la palanca pon la aguja sobre la línea y dale golpecitos con A. La flechita te muestra lo que falta.', 'Golpe afuera de la línea: se raja. Muchos golpes seguidos: se calienta. Las esquinas, despacito. B: lamer.'],
      controles: [['palanca', 'Mover la aguja'], ['a', 'Picar'], ['b', 'Lamer']],
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
        this.lamiendo = 1.6;
        this.aviso.setText('Lamiendo... el caramelo se ablanda').setColor(COLOR.azul);
        tono(330, 0.3, 'flauta', 0.08);
        this.cara.setFrame('g_cerrado');
      } else tono(200, 0.06, 'cuadrada', 0.05);
    }
    if (this.lamida > 0) this.lamida -= dt;

    // la aguja: se mueve con la palanca y, cerca de la línea, se le pega un poquito (ayuda)
    const p = this.punta, vel = dif(85, 74, 64);
    if (this.lamiendo <= 0) { p.x += this.inp.x * vel * dt; p.y += this.inp.y * vel * dt; }
    const dc = Math.hypot(p.x - CX, p.y - CY);
    if (dc > 92) { p.x = CX + ((p.x - CX) / dc) * 92; p.y = CY + ((p.y - CY) / dc) * 92; }
    const cerca = this.masCerca(p.x, p.y);
    if (cerca.d < this.tol * 2.2 && cerca.d > 0.5) {
      const [lx, ly] = this.camino[cerca.i], iman = dif(26, 16, 7) * dt;
      p.x += ((lx - p.x) / cerca.d) * Math.min(iman, cerca.d); p.y += ((ly - p.y) / cerca.d) * Math.min(iman, cerca.d);
    }
    const sobreLinea = cerca.d <= this.tol;
    const esquina = this.esquinas.some((e) => Math.abs(e - cerca.i) < 6);

    // el golpecito
    this.frio -= dt;
    if (this.inp.tomarA() && this.lamiendo <= 0) {
      if (this.frio <= 0) { this.frio = 0.09; this.picar(); }
    }
    // el caramelo se enfría solo si uno espera
    this.tension = Math.max(0, this.tension - dt * dif(0.34, 0.27, 0.21));
    if (this.tension > 0.75) {
      this.galleta.setPosition((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
      if (Math.random() < dt * 3) sfx(this, 'romper', 0.12);
      if (!this.avisoCaliente && this.lamiendo <= 0) { this.avisoCaliente = true; this.mensaje('¡Espera! Se está calentando', COLOR.oro); this.time.delayedCall(1500, () => (this.avisoCaliente = false)); }
    } else this.galleta.setPosition(0, 0);
    if (this.tension >= 1) { this.romper('¡SE ROMPIÓ!'); return; }

    // la aguja, el círculo de tolerancia y la flechita hacia lo que falta
    if (this.golpeT > 0) this.golpeT -= dt;
    const baja = this.golpeT > 0 ? 0 : 6;
    const a = this.aguja;
    a.clear();
    a.lineStyle(2, 0x8a929c); a.lineBetween(p.x + 1 + baja * 0.6, p.y + 1 - baja, p.x + 25 + baja * 0.6, p.y - 35 - baja);
    a.lineStyle(2, 0xe8eef4); a.lineBetween(p.x + baja * 0.6, p.y - baja, p.x + 24 + baja * 0.6, p.y - 36 - baja);
    a.fillStyle(0xffffff); a.fillCircle(p.x + baja * 0.6, p.y - baja, 1.5);
    const tv = this.tolVista;
    tv.clear();
    tv.lineStyle(1, sobreLinea ? (esquina ? 0xf7c948 : 0x7fffe0) : 0xff8fb5, 0.9);
    tv.strokeCircle(p.x, p.y, this.tol);
    tv.fillStyle(sobreLinea ? 0x7fffe0 : 0xff8fb5, 1); tv.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 2, 2);
    const k = this.pendienteCerca(p.x, p.y);
    if (k >= 0) {
      const [gx, gy] = this.camino[k];
      const dg = Math.hypot(gx - p.x, gy - p.y);
      const verGuia = E.dificultad < 2 || dg < 40;
      const pulso = 0.5 + Math.sin(this.time.now / 160) * 0.12;
      this.guia.setVisible(verGuia).setPosition(gx, gy - 12).setRotation(Math.PI).setScale(pulso).setTint(0x7fffe0);
    } else this.guia.setVisible(false);

    const t = Phaser.Math.Clamp(this.tension, 0, 1);
    this.barra.width = 150 * t;
    this.barra.fillColor = t < 0.5 ? 0x2fd4b4 : t < 0.75 ? 0xf7c948 : 0xff3355;
    this.barraAv.width = 150 * (this.nRaspado / this.camino.length);
    if (this.lamiendo <= 0) this.cara.setFrame(t > 0.75 ? 'g_susto' : t > 0.45 ? 'g_dolor' : 'g_neutral');

    // con casi toda la figura raspada, los últimos pixelitos se sueltan solos (no hay que cazar uno perdido)
    if (this.nRaspado >= this.camino.length * 0.985) { this.raspado.fill(1); this.nRaspado = this.camino.length; this.pintarSurco(); this.terminarFigura(); }
  }

  estrellas() {
    const sobra = this.tiempo / this.tiempoTotal;
    // tres estrellas: con tiempo de sobra y casi sin golpes afuera de la línea
    return (sobra > 0.35 && this.fallos <= 2 ? 3 : sobra > 0.15 ? 2 : 1) - Math.max(0, this.vidasInicio - E.vidas);
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
    const ax = this.punta ? this.punta.x : CX, ay = this.punta ? this.punta.y : CY;
    this.grietas.lineStyle(2, 0x3a2208);
    for (let k = 0; k < 7; k++) {
      let x = ax, y = ay, a = Math.random() * Math.PI * 2;
      this.grietas.beginPath(); this.grietas.moveTo(x, y);
      for (let j = 0; j < 7; j++) { a += (Math.random() - 0.5) * 0.9; x += Math.cos(a) * 10; y += Math.sin(a) * 10; this.grietas.lineTo(x, y); }
      this.grietas.strokePath();
    }
    chorro(this, ax, ay, 20, [0xd99a3a, 0xe8b04e, 0x8a5a1c], 90, { g: 260 });
    this.perder(motivo);
    void icono;
  }
}
