// Juego 2: La galleta (dalgona). Se elige una fila sin saber la figura. Con A se raspa la orilla con la aguja.
// Raspar sin parar calienta la galleta (la grieta); en las esquinas más. Soltar enfría. B: lamer (ablanda un rato).

import Phaser from 'phaser';
import { Juego } from '../core/juego.js';
import { Actor } from '../core/actor.js';
import { E, dif, sangre } from '../core/estado.js';
import { sfx, tono, musica } from '../core/sonido.js';
import { eliminar, sacudir, chorro } from '../core/efectos.js';
import { elegir, hablar, cartel } from '../core/dialogo.js';

const CX = 190, CY = 150;

function remuestrear(pts, paso = 1) {
  const out = [pts[0]];
  let resto = 0;
  for (let i = 1; i < pts.length; i++) {
    let [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    let d = Math.hypot(x1 - x0, y1 - y0);
    let t = paso - resto;
    while (t <= d) {
      out.push([x0 + ((x1 - x0) * t) / d, y0 + ((y1 - y0) * t) / d]);
      t += paso;
    }
    resto = d - (t - paso);
  }
  return out;
}

const FIGURAS = {
  circulo() { const p = []; for (let i = 0; i <= 64; i++) { const a = -Math.PI / 2 + (i / 64) * Math.PI * 2; p.push([Math.cos(a) * 34, Math.sin(a) * 34]); } return p; },
  triangulo() { const r = 42; const v = [0, 1, 2, 0].map((k) => { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 3; return [Math.cos(a) * r, Math.sin(a) * r + 6]; }); return v; },
  estrella() { const p = []; for (let k = 0; k <= 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5; const r = k % 2 ? 18 : 42; p.push([Math.cos(a) * r, Math.sin(a) * r + 3]); } return p; },
};
// el paraguas: la copa, las ondas de abajo y el mango con su gancho
FIGURAS.paraguas = function () {
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
};

const NOMBRE_FIG = { circulo: 'EL CÍRCULO', triangulo: 'EL TRIÁNGULO', estrella: 'LA ESTRELLA', paraguas: 'EL PARAGUAS' };

export class Galleta extends Juego {
  constructor() { super('Galleta'); }

  armar() {
    const W = this.scale.width, H = this.scale.height;
    this.add.image(W / 2, H / 2, 'galleta').setDepth(-100);
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.35).setDepth(-90);
    // la gente sentada alrededor (chiquita, de fondo)
    this.gente = this.crearGente(10, (i) => [20 + (i % 2) * 32, 92 + Math.floor(i / 2) * 36 + (i % 2) * 14, 'right']);
    this.gente.forEach((g) => { g.anim('idle'); g.sprite.setScale(0.8); });
    // la familia, a la derecha
    this.crearFamilia([[300, 222, 'left'], [330, 228, 'left'], [360, 222, 'left']]);
    this.familia.forEach((f) => f.anim('eat'));
    // la lata y la galleta
    this.lata = this.add.circle(CX, CY, 92, 0x9aa3ae).setStrokeStyle(3, 0x4a5058).setDepth(10);
    this.add.circle(CX, CY, 86, 0xb8c0ca).setDepth(10);
    this.galleta = this.add.graphics().setDepth(11);
    this.pintarGalleta();
    this.surco = this.add.graphics().setDepth(12);
    this.grietas = this.add.graphics().setDepth(13);
    this.aguja = this.add.graphics().setDepth(14);
    // el retrato del jugador y el medidor de grieta
    this.add.image(W - 66, 96, 'marco_retrato_96').setDepth(20);
    this.cara = this.add.image(W - 66, 96, 'ret_' + E.perfil, 'g_neutral').setDepth(21);
    this.add.bitmapText(W - 66, 156, 'fuente_ui', 'GRIETA').setOrigin(0.5).setDepth(20);
    this.add.nineslice(W - 66, 170, 'barra_marco', undefined, 104, 10, 4, 4, 0, 0).setDepth(20);
    this.barra = this.add.rectangle(W - 116, 167, 0, 6, 0x23b39c).setOrigin(0, 0).setDepth(21);
    this.add.bitmapText(W - 66, 182, 'fuente_ui', 'AVANCE').setOrigin(0.5).setDepth(20);
    this.add.nineslice(W - 66, 196, 'barra_marco', undefined, 104, 10, 4, 4, 0, 0).setDepth(20);
    this.barraAv = this.add.rectangle(W - 116, 193, 0, 6, 0xf2c230).setOrigin(0, 0).setDepth(21);
    this.ayuda = this.add.bitmapText(CX, 252, 'fuente_ui', 'A: RASPAR · B: LAMER').setOrigin(0.5).setDepth(20);
    this.tiempo = dif(100, 80, 62);
    this.tension = 0;
    this.lamida = 0;
    this.lamiendo = 0;
    this.s = 0;
    this.tVecino = 6;
  }

  opcionesEntrada() { return { palanca: false }; }

  pintarGalleta() {
    const g = this.galleta;
    g.clear();
    g.fillStyle(0x8a5a1c); g.fillCircle(CX, CY, 70);
    g.fillStyle(0xd99a3a); g.fillCircle(CX, CY, 68);
    g.fillStyle(0xe8b04e); g.fillCircle(CX - 6, CY - 6, 58);
    // las burbujitas del caramelo
    const rnd = new Phaser.Math.RandomDataGenerator(['dalgona']);
    for (let i = 0; i < 70; i++) {
      const a = rnd.frac() * Math.PI * 2, r = rnd.frac() * 62;
      g.fillStyle(rnd.frac() < 0.5 ? 0xc4842c : 0xf2c66a, 0.8);
      g.fillCircle(CX + Math.cos(a) * r, CY + Math.sin(a) * r, 1 + rnd.frac() * 2);
    }
  }

  async antesDeEmpezar() {
    // las cuatro filas: no se sabe qué figura tiene cada una
    const figs = Phaser.Utils.Array.Shuffle(['circulo', 'triangulo', 'estrella', 'paraguas']);
    const r = await elegir(this, this.inp, ['Fila 1', 'Fila 2', 'Fila 3', 'Fila 4'], { titulo: '¿EN QUÉ FILA TE PARAS?', ancho: 200 });
    this.figura = figs[r];
    this.armarFigura();
    await cartel(this, NOMBRE_FIG[this.figura], this.figura === 'paraguas' ? '¡la más difícil!' : this.figura === 'circulo' ? '¡la más fácil!' : '', { ms: 1400, color: 0xf2c230 });
    const lineas = {
      circulo: [['rick', 'feliz', '¡El círculo! Esa es pan comido.']],
      triangulo: [['steph', 'neutral', 'El triángulo. Cuidado con las tres esquinas.']],
      estrella: [['sophie', 'susto', 'La estrella tiene diez esquinas... ¡despacito!']],
      paraguas: [['alana', 'susto', '¡El paraguas! Ese es el más difícil de todos.'], ['steph', 'neutral', 'Truco: lame la galleta por detrás. El caramelo se ablanda.']],
    }[this.figura];
    await hablar(this, this.inp, lineas);
    this.inp.ocultarTactil(true);
  }

  armarFigura() {
    let pts = FIGURAS[this.figura]().map(([x, y]) => [CX + x, CY + y]);
    this.camino = remuestrear(pts, 1);
    this.largo = this.camino.length - 1;
    // las esquinas: donde la dirección cambia mucho
    this.esquinas = [];
    const k = 4;
    for (let i = k; i < this.camino.length - k; i++) {
      const [ax, ay] = this.camino[i - k], [bx, by] = this.camino[i], [cx, cy] = this.camino[i + k];
      const a1 = Math.atan2(by - ay, bx - ax), a2 = Math.atan2(cy - by, cx - bx);
      let d = Math.abs(Phaser.Math.Angle.Wrap(a2 - a1));
      if (d > 0.6) this.esquinas.push(i);
    }
    // el dibujo de la figura estampada
    const g = this.add.graphics().setDepth(11.5);
    g.lineStyle(3, 0xa0681e, 0.9);
    g.beginPath(); g.moveTo(this.camino[0][0], this.camino[0][1]);
    this.camino.forEach(([x, y]) => g.lineTo(x, y));
    g.strokePath();
    g.lineStyle(1, 0x5a3208, 1);
    g.beginPath(); g.moveTo(this.camino[0][0], this.camino[0][1]);
    this.camino.forEach(([x, y]) => g.lineTo(x, y));
    g.strokePath();
    // velocidad: las figuras largas van un poco más rápido para que alcance el tiempo
    this.velRaspe = dif(15, 12, 10) * Math.max(1, this.largo / 260);
  }

  reglas() {
    return [
      ['guardia_cuadrado', 'neutral', 'Juego 2: la galleta. Tienen que sacar la figura sin romperla.'],
      ['guardia_cuadrado', 'neutral', 'Si la figura se rompe, quedan eliminados.'],
      ['sophie', 'neutral', 'Mantén A para raspar. Si raspas mucho sin parar, sale una grieta. Suelta para que se enfríe.'],
      ['steph', 'neutral', 'En las esquinas, más despacio. Y con B puedes lamerla para ablandarla.'],
    ];
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
      this.tension = Math.max(0, this.tension - dt * 0.35);
      if (this.lamiendo <= 0) { this.lamida = 7; this.ayuda.setText('A: RASPAR · B: LAMER'); }
    } else if (this.inp.tomarB()) {
      this.lamiendo = 2.2;
      this.ayuda.setText('LAMIENDO... (el caramelo se ablanda)');
      tono(330, 0.3, 'flauta', 0.08);
      this.cara.setFrame('g_cerrado');
    }
    if (this.lamida > 0) this.lamida -= dt;

    const raspando = this.inp.a && this.lamiendo <= 0;
    const iEnt = Math.floor(this.s);
    const cerca = this.esquinas.some((e) => Math.abs(e - iEnt) < 5);
    if (raspando) {
      this.s = Math.min(this.largo, this.s + this.velRaspe * dt * (cerca ? 0.75 : 1));
      let sube = dif(0.17, 0.23, 0.3) * (cerca ? 2.6 : 1);
      if (this.lamida > 0) sube *= 0.45;
      this.tension += sube * dt;
      if (Math.random() < dt * 14) tono(1800 + Math.random() * 600, 0.015, 'cuadrada', 0.02);
    } else {
      this.tension = Math.max(0, this.tension - dt * 0.42);
    }
    // el temblor y los avisos
    if (this.tension > 0.72) {
      this.galleta.setPosition((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2);
      if (Math.random() < dt * 3) sfx(this, 'romper', 0.12);
    } else this.galleta.setPosition(0, 0);
    if (this.tension >= 1) { this.romper('¡SE ROMPIÓ!'); return; }

    // dibujar
    this.surco.clear();
    this.surco.lineStyle(2, 0x3a2208, 1);
    this.surco.beginPath();
    this.surco.moveTo(this.camino[0][0], this.camino[0][1]);
    for (let i = 1; i <= Math.floor(this.s); i++) this.surco.lineTo(this.camino[i][0], this.camino[i][1]);
    this.surco.strokePath();
    const [ax, ay] = this.camino[Math.floor(this.s)];
    this.aguja.clear();
    this.aguja.lineStyle(2, 0xdfe6ee); this.aguja.lineBetween(ax, ay, ax + 18, ay - 26);
    this.aguja.fillStyle(0xffffff); this.aguja.fillCircle(ax, ay, 1.5);
    const t = Phaser.Math.Clamp(this.tension, 0, 1);
    this.barra.width = 100 * t;
    this.barra.fillColor = t < 0.5 ? 0x23b39c : t < 0.75 ? 0xf2c230 : 0xff3355;
    this.barraAv.width = 100 * (this.s / this.largo);
    if (this.lamiendo <= 0) this.cara.setFrame(t > 0.75 ? 'g_susto' : t > 0.45 ? 'g_dolor' : 'g_neutral');

    if (this.s >= this.largo) this.terminarFigura();
  }

  terminarFigura() {
    this.jugando = false;
    this.cara.setFrame('g_feliz');
    this.surco.lineStyle(3, 0xf2c230, 1);
    tono(1320, 0.2, 'campana', 0.15);
    // la figura sale entera
    this.ganar({ texto: '¡FIGURA LISTA!', lineas: [['alana', 'feliz', '¡Yo también terminé la mía! ¿Ya nos la podemos comer?']] });
  }

  romper(motivo) {
    if (this.terminado) return;
    sfx(this, 'romper', 0.8);
    sacudir(this, 200, 0.012);
    this.cara.setFrame('g_susto');
    // las grietas desde la aguja
    const [ax, ay] = this.camino[Math.floor(this.s)];
    this.grietas.lineStyle(1.5, 0x3a2208);
    for (let k = 0; k < 6; k++) {
      let x = ax, y = ay, a = Math.random() * Math.PI * 2;
      this.grietas.beginPath(); this.grietas.moveTo(x, y);
      for (let j = 0; j < 6; j++) { a += (Math.random() - 0.5) * 0.9; x += Math.cos(a) * 8; y += Math.sin(a) * 8; this.grietas.lineTo(x, y); }
      this.grietas.strokePath();
    }
    chorro(this, ax, ay, 16, [0xd99a3a, 0xe8b04e, 0x8a5a1c], 70, { g: 200 });
    // el jugador aparece al lado de la lata para la eliminación
    if (!this.jugador) this.jugador = new Actor(this, E.perfil, 300, 238, { dir: 'left' });
    this.perder(motivo);
  }
}
