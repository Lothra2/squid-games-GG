// Juego 8: El escondite (temporada 3). Tú eres del equipo azul: tienes una llave con una figura.
// Hay que encontrar la puerta de salida (una de las que abre tu llave) antes de que se acabe el tiempo.
// El equipo rojo te busca. A junto a una puerta: abrir. A junto a un armario: esconderse (y A para salir).

import Phaser from 'phaser';
import { Juego } from '../core/juego.js';
import { Actor } from '../core/actor.js';
import { E, dif, sangre } from '../core/estado.js';
import { sfx, tono, musica } from '../core/sonido.js';
import { eliminar, fxSobre, sacudir } from '../core/efectos.js';
import { cartel, esperar } from '../core/dialogo.js';
import { texto, COLOR } from '../core/ui.js';
import { jugadoresNPC } from '../core/kit.js';
import { lienzo, texturasLuz } from '../escenas/pintura.js';

const T = 24; // tamaño del cuadro
const FIGS = ['circulo', 'triangulo', 'cuadrado'];
const COLOR_FIG = { circulo: 0xf2a6c3, triangulo: 0x9fe3cf, cuadrado: 0xf6e08a };
// las zonas del laberinto: [arriba de la pared, frente, rayas del papel tapiz]
const ZONAS = [
  ['#f2b8d0', '#c87a9e', '#b86a8e'],
  ['#a8e6d4', '#5aa898', '#4a9888'],
  ['#f6e29a', '#c8a85a', '#b8984a'],
  ['#cfc0f4', '#8a78c0', '#7a68b0'],
];

export class Escondite extends Juego {
  constructor() { super('Escondite'); this.usaPistas = true; }
  ambiente() { return { vineta: 0.75, motas: 0 }; }

  armar() {
    const cw = 14, ch = 9;
    this.TW = cw * 2 + 1; this.TH = ch * 2 + 1;
    this.mapa = this.laberinto(cw, ch);
    const W = this.TW * T, H = this.TH * T + 30;
    this.cameras.main.setBounds(0, -30, W, H);
    this.add.rectangle(W / 2, H / 2 - 20, W + 40, H + 40, 0x18122a).setDepth(-200);
    this.pintar();
    // la llave del jugador y las puertas
    this.llave = Phaser.Utils.Array.GetRandom(FIGS);
    const sinSalida = this.callejones();
    Phaser.Utils.Array.Shuffle(sinSalida);
    const lejos = sinSalida.filter(([x, y]) => x + y > 10 && this.pared(x, y - 1));
    const elegidas = lejos.slice(0, 6);
    this.puertas = elegidas.map(([x, y], i) => ({ x, y, fig: i < 2 ? this.llave : FIGS[(FIGS.indexOf(this.llave) + 1 + (i % 2)) % 3], salida: i === 0, abierta: false }));
    this.puertas.forEach((p) => this.dibujarPuerta(p));
    // los armarios
    const libres = this.libres().filter(([x, y]) => x > 2 && this.pared(x, y - 1) && !elegidas.some(([a, b]) => a === x && b === y));
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
      a.camino = []; a.persigue = 0; a.vel = dif(56, 66, 77);
      return a;
    });
    this.tiempo = dif(150, 125, 100);
    this.tiempoTotal = this.tiempo;
    this.escondido = null;
    this.vision = dif(4, 5, 6);
    // la llave en el HUD
    this.add.image(this.scale.width - 18, 46, this.llave).setTint(COLOR_FIG[this.llave]).setScrollFactor(0).setDepth(8801);
    texto(this, this.scale.width - 34, 46, 'TU LLAVE', { tam: 13, negrita: true, origen: [1, 0.5] }).setScrollFactor(0).setDepth(8801);
    this.pistas = dif(2, 1, 0) + this.pistasExtra;
    this.txtPistas = texto(this, 12, 44, '', { tam: 13, color: COLOR.oro }).setScrollFactor(0).setDepth(8801);
    this.conos = this.add.graphics().setDepth(1);
    this.armarMinimapa();
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

  /** el laberinto en pixel art: piso con baldosas y sombras, y cada fila de paredes en su propia capa (tapan a
   * quien camina detrás). Las texturas se rehacen en cada partida porque el laberinto cambia. */
  pintar() {
    texturasLuz(this);
    const TW = this.TW, TH = this.TH;
    const zona = (x, y) => ZONAS[Math.floor(x / 7 + y / 5) % ZONAS.length];
    for (const k of this.textures.getTextureKeys()) if (k.startsWith('esc_lab_')) this.textures.remove(k);
    // el piso
    lienzo(this, 'esc_lab_piso', TW * T, TH * T, (P) => {
      P.r(0, 0, TW * T, TH * T, '#241c38');
      for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
        if (this.pared(x, y)) continue;
        const px = x * T, py = y * T;
        P.r(px, py, T, T, '#4c4068');
        for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) if ((a + b + x + y) % 2) P.r(px + a * 12, py + b * 12, 12, 12, '#54486f');
        P.r(px, py, T, 1, '#3e3458'); P.r(px, py, 1, T, '#3e3458');
        P.ruido(px, py, T, T, '#5e527a', 6);
        // la sombra de las paredes sobre el piso
        if (this.pared(x, y - 1)) { P.trama(px, py, T, 4, '#1e1630', 0.7); P.trama(px, py + 4, T, 4, '#1e1630', 0.3); }
        if (this.pared(x - 1, y)) P.trama(px, py, 3, T, '#1e1630', 0.45);
        if (this.pared(x + 1, y)) P.trama(px + T - 3, py, 3, T, '#1e1630', 0.3);
      }
    }, 5 + this.TW);
    this.add.image(0, 0, 'esc_lab_piso').setOrigin(0).setDepth(-150);
    // las paredes, fila por fila
    this.lamparas = [];
    for (let y = 0; y < TH; y++) {
      if (!this.mapa[y].some((v) => v === 1)) continue;
      const key = 'esc_lab_fila_' + y;
      lienzo(this, key, TW * T, 34, (P) => {
        for (let x = 0; x < TW; x++) {
          if (!this.pared(x, y)) continue;
          const [arriba, frente, raya] = zona(x, y), px = x * T;
          // la cara de arriba, con moldura donde da al pasillo
          P.r(px, 0, T, 24, arriba);
          P.trama(px, 0, T, 24, '#ffffff', 0.08);
          if (!this.pared(x, y - 1)) { P.r(px, 0, T, 1, '#ffffff'); P.r(px, 3, T, 1, frente); }
          if (!this.pared(x - 1, y)) { P.r(px, 0, 1, 24, frente); P.r(px + 3, 3, 1, 18, frente); }
          if (!this.pared(x + 1, y)) { P.r(px + T - 1, 0, 1, 24, frente); P.r(px + T - 4, 3, 1, 18, frente); }
          // el frente: papel tapiz con rayas, zócalo blanco
          if (!this.pared(x, y + 1)) {
            P.r(px, 24, T, 10, frente);
            for (let k = 2; k < T; k += 4) P.r(px + k, 25, 1, 7, raya);
            P.r(px, 24, T, 1, '#ffffff');
            P.r(px, 31, T, 3, '#efe6f6'); P.r(px, 33, T, 1, '#b8a8c8');
            // a veces un cuadrito o una lámpara de pared
            const r = (x * 7919 + y * 104729) % 23;
            if (r === 3) { P.r(px + 8, 25, 8, 5, '#3a2a18'); P.r(px + 9, 26, 6, 3, ['#6ab8e8', '#e88ab8', '#f2c860'][x % 3]); }
            if (r === 7 || r === 15) { P.r(px + 11, 26, 2, 3, '#b8862a'); P.r(px + 10, 25, 4, 2, '#fff2c8'); this.lamparas.push([px + 12, y * T + 15]); }
          }
        }
      }, 100 + y);
      this.add.image(0, y * T - 10, key).setOrigin(0).setDepth(y * T + 24);
    }
    // la luz de las lamparitas titila
    this.brillos = this.lamparas.map(([x, y]) => this.add.image(x, y, 'brillo').setScale(0.9).setTint(0xfff0c8).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD).setDepth(9000 - 2));
    this.time.addEvent({ delay: 120, loop: true, callback: () => this.brillos.forEach((b, i) => b.setAlpha(0.32 + Math.sin(this.time.now / 300 + i) * 0.06 + (Math.random() < 0.03 ? -0.25 : 0))) });
    this.texturasMuebles();
  }

  /** las puertas (cerrada con su figura, abierta oscura, la salida con luz) y el armario */
  texturasMuebles() {
    const puerta = (key, fig, estado) => lienzo(this, key, 22, 32, (P) => {
      const marco = '#' + COLOR_FIG[fig].toString(16).padStart(6, '0');
      P.r(0, 0, 22, 32, '#2a1a10'); P.r(1, 1, 20, 31, marco); P.r(1, 1, 20, 1, '#ffffff');
      if (estado === 'cerrada') {
        P.r(3, 3, 16, 29, '#8a5a36'); P.r(3, 3, 16, 1, '#b07a4a');
        P.r(5, 6, 5, 9, '#7a4a2a'); P.r(12, 6, 5, 9, '#7a4a2a'); P.r(5, 18, 5, 11, '#7a4a2a'); P.r(12, 18, 5, 11, '#7a4a2a');
        P.r(16, 17, 2, 2, '#f2c230');
        // la placa con la figura
        P.elip(11, 11, 5, 5, '#f4f0e8'); P.elip(11, 11, 4, 4, marco);
        const c = '#2a1a10';
        if (fig === 'circulo') { P.elip(11, 11, 2, 2, c); P.elip(11, 11, 1, 1, marco); }
        if (fig === 'triangulo') { P.lin(11, 8, 8, 13, c); P.lin(11, 8, 14, 13, c); P.lin(8, 13, 14, 13, c); }
        if (fig === 'cuadrado') { P.r(9, 9, 5, 1, c); P.r(9, 13, 5, 1, c); P.r(9, 9, 1, 5, c); P.r(13, 9, 1, 5, c); }
      } else if (estado === 'abierta') {
        P.r(3, 3, 16, 29, '#0e0a14'); P.r(3, 3, 3, 29, '#5a3a22');
      } else {
        P.deg(3, 3, 16, 29, ['#fff6d0', '#ffe08a', '#f2c860']); P.r(3, 3, 3, 29, '#8a5a36');
      }
    });
    for (const f of FIGS) { puerta('esc_puerta_' + f, f, 'cerrada'); puerta('esc_puerta_abierta_' + f, f, 'abierta'); puerta('esc_puerta_luz_' + f, f, 'luz'); }
    lienzo(this, 'esc_armario', 22, 34, (P) => {
      P.r(0, 0, 22, 34, '#3a2412'); P.r(1, 1, 20, 32, '#d8a868'); P.r(1, 1, 20, 3, '#e8c088'); P.r(1, 1, 20, 1, '#fff0d0');
      P.r(10, 5, 2, 27, '#9a6a3a');
      for (let k = 0; k < 5; k++) { P.r(4, 8 + k * 4, 4, 1, '#6a4422'); P.r(14, 8 + k * 4, 4, 1, '#6a4422'); }
      P.r(8, 18, 2, 3, '#f2c230'); P.r(12, 18, 2, 3, '#f2c230');
      P.r(2, 32, 3, 2, '#3a2412'); P.r(17, 32, 3, 2, '#3a2412');
      P.trama(15, 4, 5, 28, '#a87848', 0.5);
    });
  }

  dibujarPuerta(p) {
    const px = p.x * T, py = p.y * T;
    p.img = this.add.image(px + T / 2, py + 8, 'esc_puerta_' + p.fig).setOrigin(0.5, 1).setDepth(py + 8);
  }

  armario(x, y) {
    return this.add.image(x * T + T / 2, y * T + 12, 'esc_armario').setOrigin(0.5, 1).setDepth(y * T + 12);
  }

  reglas() {
    const fig = { circulo: 'un CÍRCULO', triangulo: 'un TRIÁNGULO', cuadrado: 'un CUADRADO' }[this.llave];
    return {
      objetivo: [`Tu llave tiene ${fig}: solo abre puertas con esa figura, y solo una es la salida.`, 'Los del equipo rojo te buscan. Su línea de visión se ve en rojo: ¡no la cruces!', 'Escóndete en los armarios (A). Arriba a la derecha tienes el mapa.'],
      controles: [['palanca', 'Moverse'], ['a', 'Abrir / esconderse'], ['b', `Pista (${this.pistas})`]],
      frase: ['steph', 'neutral', 'Nosotras tres nos escondemos en un armario de la entrada. ¡Busca la salida y vuelve por nosotras!'],
    };
  }

  /** el minimapa del laberinto: paredes, puertas de tu figura, el jugador y los rojos */
  armarMinimapa() {
    const k = 3, W = this.scale.width;
    const x0 = W - this.TW * k - 10, y0 = 62;
    this.mm = { k, x0, y0 };
    const g = this.add.graphics().setScrollFactor(0).setDepth(8790);
    g.fillStyle(0x07060c, 0.78); g.fillRect(x0 - 4, y0 - 4, this.TW * k + 8, this.TH * k + 8);
    for (let y = 0; y < this.TH; y++) for (let x = 0; x < this.TW; x++) if (this.mapa[y][x] === 1) { g.fillStyle(0x6a5a8a, 0.9); g.fillRect(x0 + x * k, y0 + y * k, k, k); }
    for (const p of this.puertas) { g.fillStyle(p.fig === this.llave ? 0xf7c948 : 0x5a5666); g.fillRect(x0 + p.x * k, y0 + p.y * k, k, k); }
    this.mmPuntos = this.add.graphics().setScrollFactor(0).setDepth(8791);
  }

  pintarMinimapa() {
    const { k, x0, y0 } = this.mm, g = this.mmPuntos;
    g.clear();
    const [jx, jy] = this.celda(this.jugador);
    g.fillStyle(0x7fffe0); g.fillRect(x0 + jx * k - 1, y0 + jy * k - 1, k + 2, k + 2);
    for (const r of this.rojos) { const [rx, ry] = this.celda(r); g.fillStyle(r.persigue > 0 ? 0xff3355 : 0xff8f8f); g.fillRect(x0 + rx * k, y0 + ry * k, k, k); }
  }

  /** la línea de visión de cada rojo: hasta donde ve en su dirección (sin atravesar paredes) */
  pintarConos() {
    const g = this.conos;
    g.clear();
    for (const r of this.rojos) {
      const [cx, cy] = this.celda(r);
      const dirs = { right: [r.izq ? -1 : 1, 0], down: [0, 1], up: [0, -1] };
      const [dx, dy] = dirs[r.dir] || [1, 0];
      let x = cx, y = cy;
      for (let i = 0; i < this.vision; i++) {
        x += dx; y += dy;
        if (this.pared(x, y)) break;
        g.fillStyle(r.persigue > 0 ? 0xff3355 : 0xff6a6a, (r.persigue > 0 ? 0.32 : 0.18) * (1 - i / (this.vision + 1)));
        g.fillRect(x * T, y * T, T, T);
      }
      g.fillStyle(0xff6a6a, 0.12); g.fillCircle(r.x, r.y - 6, 34);
    }
  }

  empezar() { musica('tension'); }

  libre(x, y) {
    const r = 6;
    for (const [dx, dy] of [[-r, -3], [r, -3], [-r, 3], [r, 3]]) if (this.pared(Math.floor((x + dx) / T), Math.floor((y - 6 + dy) / T))) return false;
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
    if (d < 34) return true;
    const [ax, ay] = this.celda(r), [bx, by] = this.celda(j);
    if (ax !== bx && ay !== by) return false;
    if (Math.abs(ax - bx) + Math.abs(ay - by) > this.vision) return false;
    const sx = Math.sign(bx - ax), sy = Math.sign(by - ay);
    // solo ven hacia donde miran (es lo que muestra su línea roja)
    const [fx, fy] = { right: [r.izq ? -1 : 1, 0], down: [0, 1], up: [0, -1] }[r.dir] || [1, 0];
    if (r.persigue <= 0 && (sx !== fx || sy !== fy)) return false;
    let x = ax, y = ay;
    while (x !== bx || y !== by) { x += sx; y += sy; if (this.pared(x, y)) return false; }
    return true;
  }

  paso(dt) {
    this.tiempo -= dt;
    this.hud.setTiempo(this.tiempo);
    if (this.tiempo <= 0) { this.perder('SE ACABÓ EL TIEMPO'); return; }
    const j = this.jugador;
    this.pintarConos();
    this.pintarMinimapa();
    this.txtPistas.setText(`Pistas: ${this.pistas}  (B)`);
    // la pista: una flecha hacia la salida durante unos segundos
    if (this.inp.tomarB() && !this.escondido) {
      if (this.pistas > 0) {
        this.pistas--; this.pistasUsadas = (this.pistasUsadas || 0) + 1;
        const p = this.puertas.find((q) => q.salida);
        const camino = this.ruta(this.celda(j), [p.x, p.y]);
        const g = this.add.graphics().setDepth(2);
        camino.slice(0, 14).forEach(([cx, cy], i) => { g.fillStyle(0xf7c948, 0.55 - i * 0.03); g.fillCircle((cx + 0.5) * T, (cy + 0.5) * T, 4); });
        tono(1568, 0.2, 'campana', 0.1);
        this.tweens.add({ targets: g, alpha: 0, delay: 3500, duration: 800, onComplete: () => g.destroy() });
      } else tono(200, 0.06, 'cuadrada', 0.05);
    }

    if (this.escondido) {
      this.hud.setExtra('ESCONDIDO · A: salir', 0x9fe3cf);
      if (this.inp.tomarA()) { this.escondido = null; j.setVisible(true); tono(440, 0.06); }
    } else {
      this.moverCon(j, this.inp.x * 96, this.inp.y * 96, dt);
      // puertas y armarios
      const cerca = (o) => Math.hypot((o.x + 0.5) * T - j.x, (o.y + 0.5) * T - (j.y - 6)) < 22;
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
          const visto = this.rojos.some((r) => r.persigue > 0 && Math.hypot(r.x - j.x, r.y - j.y) < 66);
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
      if (!this.escondido && Math.hypot(r.x - j.x, r.y - j.y) < 15) { this.atrapado(r); return; }
    }
  }

  async abrir(p) {
    p.abierta = true;
    sfx(this, 'golpe', 0.5);
    p.img.setTexture('esc_puerta_abierta_' + p.fig);
    if (p.salida) {
      p.img.setTexture('esc_puerta_luz_' + p.fig);
      const luz = this.add.image(p.img.x, p.img.y - 14, 'brillo').setScale(2).setTint(0xffe8a0).setBlendMode(Phaser.BlendModes.ADD).setDepth(9000);
      this.tweens.add({ targets: luz, scale: 3, alpha: 0.5, duration: 600, yoyo: true, repeat: -1 });
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

  estrellas() {
    const sobra = this.tiempo / this.tiempoTotal;
    return (sobra > 0.45 && !this.pistasUsadas ? 3 : sobra > 0.2 ? 2 : 1) - Math.max(0, this.vidasInicio - E.vidas);
  }

  atrapado(r) {
    if (this.terminado) return;
    sacudir(this, 200, 0.012);
    if (r) r.anim('jab', null, true);
    this.perder('TE ENCONTRARON');
  }
}
