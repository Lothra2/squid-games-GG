// Juego 8: El escondite (temporada 3). Tú eres del equipo azul: tienes una llave con una figura.
// Hay que encontrar la puerta de salida (una de las que abre tu llave) antes de que se acabe el tiempo.
// El equipo rojo te busca. A junto a una puerta: abrir. A junto a un armario: esconderse (y A para salir).

import Phaser from 'phaser';
import { Juego } from '../core/juego.js';
import { Actor } from '../core/actor.js';
import { E, dif, sangre } from '../core/estado.js';
import { sfx, tono, musica } from '../core/sonido.js';
import { eliminar, fxSobre, sacudir } from '../core/efectos.js';
import { cartel, esperar, hablar } from '../core/dialogo.js';
import { jugadoresNPC } from '../core/kit.js';

const T = 18; // tamaño del cuadro
const FIGS = ['circulo', 'triangulo', 'cuadrado'];
const COLOR_FIG = { circulo: 0xf2a6c3, triangulo: 0x9fe3cf, cuadrado: 0xf6e08a };

export class Escondite extends Juego {
  constructor() { super('Escondite'); }

  armar() {
    const cw = 14, ch = 9;
    this.TW = cw * 2 + 1; this.TH = ch * 2 + 1;
    this.mapa = this.laberinto(cw, ch);
    const W = this.TW * T, H = this.TH * T + 20;
    this.cameras.main.setBounds(0, -20, W, H);
    this.add.rectangle(W / 2, H / 2 - 20, W + 40, H + 40, 0x241c38).setDepth(-200);
    this.pintar();
    // la llave del jugador y las puertas
    this.llave = Phaser.Utils.Array.GetRandom(FIGS);
    const sinSalida = this.callejones();
    Phaser.Utils.Array.Shuffle(sinSalida);
    const lejos = sinSalida.filter(([x, y]) => x + y > 10);
    const elegidas = lejos.slice(0, 6);
    this.puertas = elegidas.map(([x, y], i) => ({ x, y, fig: i < 2 ? this.llave : FIGS[(FIGS.indexOf(this.llave) + 1 + (i % 2)) % 3], salida: i === 0, abierta: false }));
    this.puertas.forEach((p) => this.dibujarPuerta(p));
    // los armarios
    const libres = this.libres().filter(([x, y]) => x > 2 && !elegidas.some(([a, b]) => a === x && b === y));
    Phaser.Utils.Array.Shuffle(libres);
    this.armarios = libres.slice(0, 7).map(([x, y]) => ({ x, y, img: this.armario(x, y) }));
    // el jugador arriba a la izquierda
    this.crearJugador(T * 1.5, T * 1.5 + 6, 'down');
    this.familia = [];
    this.cameras.main.startFollow(this.jugador.sprite, true, 0.15, 0.15);
    // el equipo rojo, en las esquinas lejanas
    const ids = jugadoresNPC();
    const esquinas = [[this.TW - 2, this.TH - 2], [this.TW - 2, 1], [1, this.TH - 2], [Math.floor(this.TW / 2), Math.floor(this.TH / 2)]];
    this.rojos = esquinas.slice(0, dif(2, 3, 4)).map(([x, y], i) => {
      const [fx, fy] = this.pisoCerca(x, y);
      const a = new Actor(this, ids[(i * 5 + 2) % ids.length], (fx + 0.5) * T, (fy + 0.5) * T + 6, { dir: 'down' });
      a.sprite.setTint(0xff9a9a);
      a.camino = []; a.persigue = 0; a.vel = dif(42, 50, 58);
      return a;
    });
    this.tiempo = dif(150, 125, 100);
    this.escondido = null;
    this.vision = dif(4, 5, 6);
    // la llave en el HUD
    this.add.image(this.scale.width - 14, 30, this.llave).setTint(COLOR_FIG[this.llave]).setScrollFactor(0).setDepth(8801);
    this.add.bitmapText(this.scale.width - 26, 26, 'fuente_ui', 'TU LLAVE').setOrigin(1, 0).setScrollFactor(0).setDepth(8801);
  }

  laberinto(cw, ch) {
    const m = Array.from({ length: ch * 2 + 1 }, () => Array(cw * 2 + 1).fill(1));
    const visto = Array.from({ length: ch }, () => Array(cw).fill(false));
    const pila = [[0, 0]];
    visto[0][0] = true; m[1][1] = 0;
    while (pila.length) {
      const [x, y] = pila[pila.length - 1];
      const vec = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy, dx, dy]).filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < cw && ny < ch && !visto[ny][nx]);
      if (!vec.length) { pila.pop(); continue; }
      const [nx, ny, dx, dy] = Phaser.Utils.Array.GetRandom(vec);
      visto[ny][nx] = true;
      m[y * 2 + 1 + dy][x * 2 + 1 + dx] = 0;
      m[ny * 2 + 1][nx * 2 + 1] = 0;
      pila.push([nx, ny]);
    }
    // unos huecos extra para que haya vueltas (y por dónde escapar)
    for (let k = 0; k < cw * ch * 0.12; k++) {
      const x = 1 + Math.floor(Math.random() * (cw * 2 - 1)), y = 1 + Math.floor(Math.random() * (ch * 2 - 1));
      if (m[y][x] === 1 && ((m[y][x - 1] === 0 && m[y][x + 1] === 0) || (m[y - 1][x] === 0 && m[y + 1][x] === 0))) m[y][x] = 0;
    }
    return m;
  }

  pared(x, y) { return y < 0 || x < 0 || y >= this.TH || x >= this.TW || this.mapa[y][x] === 1; }

  libres() {
    const out = [];
    for (let y = 1; y < this.TH; y += 2) for (let x = 1; x < this.TW; x += 2) if (!this.pared(x, y)) out.push([x, y]);
    return out;
  }

  callejones() {
    return this.libres().filter(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !this.pared(x + dx, y + dy)).length === 1 && (x > 1 || y > 1));
  }

  pisoCerca(x, y) {
    let best = [1, 1], bd = 1e9;
    for (const [a, b] of this.libres()) { const d = Math.abs(a - x) + Math.abs(b - y); if (d < bd) { bd = d; best = [a, b]; } }
    return best;
  }

  pintar() {
    const g = this.add.graphics().setDepth(-150);
    const tonos = [0xf2a6c3, 0x9fe3cf, 0xf6e08a, 0xc9b6f2];
    for (let y = 0; y < this.TH; y++) for (let x = 0; x < this.TW; x++) {
      const px = x * T, py = y * T;
      if (this.mapa[y][x] === 0) {
        g.fillStyle((x + y) % 2 ? 0x3a3052 : 0x443a5e); g.fillRect(px, py, T, T);
      } else {
        const c = tonos[Math.floor(x / 6 + y / 5) % tonos.length];
        g.fillStyle(Phaser.Display.Color.IntegerToColor(c).darken(30).color); g.fillRect(px, py, T, T);
        g.fillStyle(c); g.fillRect(px, py - 8, T, T - 2);
        g.fillStyle(0xffffff, 0.35); g.fillRect(px, py - 8, T, 1);
        g.fillStyle(0x000000, 0.25); g.fillRect(px, py + T - 2, T, 2);
      }
    }
    // las paredes tapan un poco a quien camina detrás (vista desde arriba con altura)
    this.techos = this.add.graphics().setDepth(9000 - 1);
  }

  dibujarPuerta(p) {
    const px = p.x * T, py = p.y * T;
    p.img = this.add.rectangle(px + T / 2, py + T / 2 - 4, T - 2, T + 2, 0x1c1430).setStrokeStyle(2, COLOR_FIG[p.fig]).setDepth(py);
    p.sim = this.add.image(px + T / 2, py + T / 2 - 4, p.fig).setTint(COLOR_FIG[p.fig]).setScale(0.7).setDepth(py + 1);
  }

  armario(x, y) {
    // el armario: un mueble de madera clara con dos puertas y rendijas, más alto que una puerta
    const g = this.add.graphics().setDepth(y * T + 2);
    const px = x * T + 3, py = y * T - 12;
    g.fillStyle(0x3a2412); g.fillRect(px - 1, py - 1, T - 4, T + 10);
    g.fillStyle(0xd8a868); g.fillRect(px, py, T - 6, T + 8);
    g.fillStyle(0xb8884a); g.fillRect(px + (T - 6) / 2, py, 1, T + 8);
    for (let k = 0; k < 4; k++) { g.fillStyle(0x6a4422); g.fillRect(px + 2, py + 3 + k * 3, 4, 1); g.fillRect(px + T - 12, py + 3 + k * 3, 4, 1); }
    g.fillStyle(0x3a2412); g.fillRect(px + (T - 6) / 2 - 3, py + 15, 2, 2); g.fillRect(px + (T - 6) / 2 + 2, py + 15, 2, 2);
    return g;
  }

  reglas() {
    return [
      ['guardia_cuadrado', 'neutral', 'Juego 8: el escondite. El equipo azul tiene llaves. El equipo rojo los busca.'],
      ['guardia_cuadrado', 'neutral', 'Si encuentran la puerta de salida antes de que se acabe el tiempo, ganan.'],
      ['steph', 'neutral', 'Nosotras tres nos escondemos en un armario de la entrada. ¡Tú busca la salida y vuelve por nosotras!'],
      ['rick', 'neutral', `Tu llave es un ${{ circulo: 'círculo', triangulo: 'triángulo', cuadrado: 'cuadrado' }[this.llave]}. Solo abre puertas con esa figura. Y no todas son la salida.`],
      ['sophie', 'susto', 'Si un rojo te ve, corre. Con A te metes en un armario y con A sales.'],
    ];
  }

  empezar() { musica('tension'); }

  libre(x, y) {
    const r = 4;
    for (const [dx, dy] of [[-r, -2], [r, -2], [-r, 2], [r, 2]]) if (this.pared(Math.floor((x + dx) / T), Math.floor((y - 6 + dy) / T))) return false;
    return true;
  }

  moverCon(a, vx, vy, dt) {
    const nx = a.x + vx * dt, ny = a.y + vy * dt;
    const ox = a.x, oy = a.y;
    if (this.libre(nx, a.y)) a.x = nx;
    if (this.libre(a.x, ny)) a.y = ny;
    const mx = a.x - ox, my = a.y - oy;
    a.x = ox; a.y = oy;
    a.mover(mx / dt, my / dt, dt);
  }

  celda(a) { return [Math.floor(a.x / T), Math.floor((a.y - 6) / T)]; }

  ruta(desde, hasta) {
    const [sx, sy] = desde, [tx, ty] = hasta;
    const key = (x, y) => y * this.TW + x;
    const prev = new Map([[key(sx, sy), null]]);
    const cola = [[sx, sy]];
    while (cola.length) {
      const [x, y] = cola.shift();
      if (x === tx && y === ty) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (this.pared(nx, ny) || prev.has(key(nx, ny))) continue;
        prev.set(key(nx, ny), [x, y]);
        cola.push([nx, ny]);
      }
    }
    const out = [];
    let c = [tx, ty];
    if (!prev.has(key(tx, ty))) return out;
    while (c && !(c[0] === sx && c[1] === sy)) { out.unshift(c); c = prev.get(key(c[0], c[1])); }
    return out;
  }

  ve(r) {
    if (this.escondido) return false;
    const j = this.jugador;
    const d = Math.hypot(j.x - r.x, j.y - r.y);
    if (d < 26) return true;
    const [ax, ay] = this.celda(r), [bx, by] = this.celda(j);
    if (ax !== bx && ay !== by) return false;
    if (Math.abs(ax - bx) + Math.abs(ay - by) > this.vision) return false;
    const sx = Math.sign(bx - ax), sy = Math.sign(by - ay);
    let x = ax, y = ay;
    while (x !== bx || y !== by) { x += sx; y += sy; if (this.pared(x, y)) return false; }
    return true;
  }

  paso(dt) {
    this.tiempo -= dt;
    this.hud.setTiempo(this.tiempo);
    if (this.tiempo <= 0) { this.perder('SE ACABÓ EL TIEMPO'); return; }
    const j = this.jugador;

    if (this.escondido) {
      this.hud.setExtra('ESCONDIDO · A: salir', 0x9fe3cf);
      if (this.inp.tomarA()) { this.escondido = null; j.setVisible(true); tono(440, 0.06); }
    } else {
      this.moverCon(j, this.inp.x * 72, this.inp.y * 72, dt);
      // puertas y armarios
      const cerca = (o) => Math.hypot((o.x + 0.5) * T - j.x, (o.y + 0.5) * T - (j.y - 6)) < 16;
      const puerta = this.puertas.find((p) => cerca(p) && !p.abierta);
      const armario = this.armarios.find(cerca);
      if (puerta) this.hud.setExtra(puerta.fig === this.llave ? 'A: abrir la puerta' : 'Tu llave no abre esta', puerta.fig === this.llave ? 0xf2c230 : 0xff8fb5);
      else if (armario) this.hud.setExtra('A: esconderte en el armario', 0x9fe3cf);
      else this.hud.setExtra('');
      if (this.inp.tomarA()) {
        if (puerta && puerta.fig === this.llave) this.abrir(puerta);
        else if (puerta) tono(200, 0.08, 'cuadrada', 0.06);
        else if (armario) {
          // si un rojo te está viendo, te encuentra igual
          const visto = this.rojos.some((r) => r.persigue > 0 && Math.hypot(r.x - j.x, r.y - j.y) < 50);
          this.escondido = armario; j.setVisible(false);
          sfx(this, 'golpe', 0.3);
          if (visto) this.time.delayedCall(700, () => { if (this.escondido && !this.terminado) { this.escondido = null; j.setVisible(true); this.atrapado(); } });
        }
      }
    }

    // el equipo rojo
    for (const r of this.rojos) {
      const veo = this.ve(r);
      if (veo) { if (r.persigue <= 0) { fxSobre(this, r, 'exclamacion'); tono(1200, 0.08, 'metal', 0.12); } r.persigue = 3.5; }
      else r.persigue -= dt;
      const desde = this.celda(r);
      if (r.persigue > 0 && !this.escondido) {
        r.tRuta = (r.tRuta || 0) - dt;
        if (r.tRuta <= 0) { r.camino = this.ruta(desde, this.celda(j)); r.tRuta = 0.4; }
      } else if (!r.camino.length) {
        const libres = this.libres();
        r.camino = this.ruta(desde, Phaser.Utils.Array.GetRandom(libres));
      }
      const sig = r.camino[0];
      if (sig) {
        const tx = (sig[0] + 0.5) * T, ty = (sig[1] + 0.5) * T + 6;
        const dx = tx - r.x, dy = ty - r.y, d = Math.hypot(dx, dy);
        const v = r.persigue > 0 ? r.vel * 1.25 : r.vel;
        if (d < 2) r.camino.shift();
        else r.mover((dx / d) * v, (dy / d) * v, dt);
      } else r.mover(0, 0, dt);
      if (!this.escondido && Math.hypot(r.x - j.x, r.y - j.y) < 11) { this.atrapado(r); return; }
    }
  }

  async abrir(p) {
    p.abierta = true;
    sfx(this, 'golpe', 0.5);
    p.img.setFillStyle(0x1a1028);
    if (p.salida) {
      p.img.setFillStyle(0xfff4c2);
      tono(1568, 0.3, 'campana', 0.15);
      this.jugando = false;
      await cartel(this, '¡LA SALIDA!', 'vuelve por la familia...', { ms: 1300, color: 0x23b39c });
      this.ganar({ lineas: [
        ['sophie', 'feliz', '¡Escuchamos la puerta! Salimos corriendo detrás de ti.'],
        ['steph', 'feliz', 'Ese armario olía a naftalina. Pero valió la pena.'],
      ] });
    } else {
      tono(300, 0.2, 'cuadrada', 0.08);
      await cartel(this, 'VACÍO', 'esta no es la salida', { ms: 900, color: 0xff8fb5 });
    }
  }

  atrapado(r) {
    if (this.terminado) return;
    sacudir(this, 200, 0.012);
    if (r) r.anim(sangre() ? 'attack' : 'point', null, true);
    this.perder('TE ENCONTRARON');
  }
}
