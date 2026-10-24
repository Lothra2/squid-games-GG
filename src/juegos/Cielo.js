// Juego 10: El calamar en el cielo (temporada 3). Tres pilares altísimos unidos por puentecitos.
// Los rivales quieren tumbar a la familia. A: embestida (empuja a quien toques). Bota a todos los rivales
// antes de que se acabe el tiempo. Si te sacan del pilar, caes.

import Phaser from 'phaser';
import { Juego } from '../core/juego.js';
import { Actor } from '../core/actor.js';
import { E, dif } from '../core/estado.js';
import { sfx, tono, musica } from '../core/sonido.js';
import { eliminar, sacudir, chorro, fxSobre } from '../core/efectos.js';
import { cartel, esperar } from '../core/dialogo.js';
import { COLOR } from '../core/ui.js';
import { jugadoresNPC } from '../core/kit.js';

const PILARES = [{ x: 157, y: 251, rx: 109, ry: 45 }, { x: 320, y: 181, rx: 99, ry: 40 }, { x: 483, y: 251, rx: 109, ry: 45 }];
const PUENTES = [[PILARES[0], PILARES[1]], [PILARES[1], PILARES[2]]];

const enElipse = (e, x, y, k = 1) => ((x - e.x) / (e.rx * k)) ** 2 + ((y - e.y) / (e.ry * k)) ** 2 <= 1;
function enPuente(x, y) {
  for (const [a, b] of PUENTES) {
    const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy;
    const t = ((x - a.x) * dx + (y - a.y) * dy) / L2;
    if (t < 0 || t > 1) continue;
    const px = a.x + dx * t, py = a.y + dy * t;
    if (Math.hypot(x - px, y - py) < 13) return true;
  }
  return false;
}
const pisa = (x, y) => PILARES.some((p) => enElipse(p, x, y)) || enPuente(x, y);

export class Cielo extends Juego {
  constructor() { super('Cielo'); }
  ambiente() { return { vineta: 0.5, motas: 26, color: 0xe0ecff }; }

  armar() {
    const W = this.scale.width, H = this.scale.height;
    this.add.image(W / 2, H / 2, 'cielo').setDepth(-100);
    const g = this.add.graphics().setDepth(-50);
    // primero las columnas (la del medio va más atrás), después los puentes y encima las tapas de piedra
    const orden = [PILARES[1], PILARES[0], PILARES[2]];
    for (const p of orden) {
      g.fillStyle(0x3a4258); g.fillRect(p.x - p.rx * 0.8, p.y, p.rx * 1.6, H - p.y);
      g.fillStyle(0x2a3044); g.fillRect(p.x + p.rx * 0.3, p.y, p.rx * 0.5, H - p.y);
      g.fillStyle(0x4a5470); for (let y = p.y + 14; y < H; y += 14) g.fillRect(p.x - p.rx * 0.8, y, p.rx * 1.6, 1);
    }
    for (const [a, b] of PUENTES) {
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
      g.fillStyle(0x4a3828); g.fillPoints([{ x: a.x + nx * 15, y: a.y + ny * 15 + 4 }, { x: b.x + nx * 15, y: b.y + ny * 15 + 4 }, { x: b.x - nx * 15, y: b.y - ny * 15 + 4 }, { x: a.x - nx * 15, y: a.y - ny * 15 + 4 }], true);
      g.fillStyle(0x9a7650); g.fillPoints([{ x: a.x + nx * 13, y: a.y + ny * 13 }, { x: b.x + nx * 13, y: b.y + ny * 13 }, { x: b.x - nx * 13, y: b.y - ny * 13 }, { x: a.x - nx * 13, y: a.y - ny * 13 }], true);
      g.lineStyle(1, 0x6a5038); for (let t = 0.1; t < 1; t += 0.08) g.lineBetween(a.x + dx * t + nx * 13, a.y + dy * t + ny * 13, a.x + dx * t - nx * 13, a.y + dy * t - ny * 13);
    }
    for (const p of orden) {
      g.fillStyle(0x59627c); g.fillEllipse(p.x, p.y + 5, p.rx * 2, p.ry * 2);
      g.fillStyle(0x8b93ab); g.fillEllipse(p.x, p.y, p.rx * 2, p.ry * 2);
      g.lineStyle(1, 0xc8cee0, 0.7); g.strokeEllipse(p.x, p.y, p.rx * 2 - 6, p.ry * 2 - 4);
    }
    // nubes que pasan por delante
    this.nubes = [0, 1, 2].map((i) => this.add.ellipse(Math.random() * W, 328 + i * 13, 210, 20, 0xffffff, 0.16).setDepth(5000));
    this.crearJugador(173, 253, 'right');
    this.crearFamilia([[123, 240, 'right'], [115, 264, 'right'], [149, 277, 'right']]);
    const ids = jugadoresNPC();
    const lugares = [[320, 181], [291, 171], [349, 192], [483, 251], [453, 237], [512, 264], [483, 277]];
    this.rivales = lugares.slice(0, dif(4, 5, 7)).map(([x, y], i) => {
      const a = new Actor(this, ids[(i * 3 + 1) % ids.length], x, y, { dir: 'left' });
      return a;
    });
    this.todos = [this.jugador, ...this.familia, ...this.rivales];
    this.todos.forEach((a) => { a.vx = 0; a.vy = 0; a.dash = 0; a.cd = 0.8 + Math.random(); a.aturdido = 0; a.carga = 0; a.inmune = 0; });
    // te agarras del borde: cada agarre te salva de una caída
    this.agarres = dif(3, 2, 1);
    this.seguro = { x: this.jugador.x, y: this.jugador.y };
    this.tiempo = dif(100, 85, 70);
    this.tiempoTotal = this.tiempo;
  }

  reglas() {
    return {
      objetivo: ['Tres pilares sobre las nubes. Embiste con A a los rivales y bótalos a todos antes de que acabe el tiempo.', 'Antes de embestir se ponen rojos: esquiva o pégales primero.', `Si te empujan al vacío te agarras del borde: tienes ${dif(3, 2, 1)} agarres.`],
      controles: [['palanca', 'Moverse'], ['a', 'Embestida']],
      frase: ['rick', 'enojo', '¡Vienen por nosotros! ¡Familia, espalda con espalda!'],
    };
  }

  empezar() { musica('epica'); }

  paso(dt) {
    this.tiempo -= dt;
    this.hud.setTiempo(this.tiempo);
    this.nubes.forEach((n, i) => { n.x += (8 + i * 5) * dt; if (n.x > 560) n.x = -80; });
    const j = this.jugador;
    const vivos = this.rivales.filter((r) => r.vivo);
    this.hud.setExtra(`RIVALES: ${vivos.length}   ·   AGARRES: ${this.agarres}`, 0xff8fb5);
    if (j.vivo && j.aturdido <= 0 && pisa(j.x, j.y)) { this.seguro.x = j.x; this.seguro.y = j.y; }

    // el jugador
    if (j.vivo) {
      if (j.aturdido <= 0 && j.dash <= 0) {
        j.vx = this.inp.x * 93; j.vy = this.inp.y * 67;
        if (Math.abs(this.inp.x) + Math.abs(this.inp.y) > 0.1) j.mirar(this.inp.x, this.inp.y);
        if (this.inp.tomarA() && j.cd <= 0) this.embestir(j, this.inp.x || (j.izq ? -1 : 1), this.inp.y);
      }
    }
    // la familia: se defiende cerca de su lugar
    this.familia.forEach((f, i) => {
      if (f.aturdido > 0 || f.dash > 0) return;
      const r = this.masCerca(f, this.rivales);
      if (r && Math.hypot(r.x - f.x, r.y - f.y) < 43 && f.cd <= 0) this.embestir(f, r.x - f.x, r.y - f.y);
      else { const h = [[123, 240], [115, 264], [149, 277]][i]; f.vx = (h[0] - f.x) * 2; f.vy = (h[1] - f.y) * 2; }
    });
    // los rivales: van por el más cercano de la familia y embisten
    for (const r of vivos) {
      if (r.aturdido > 0 || r.dash > 0) continue;
      const blanco = this.masCerca(r, [j, ...this.familia].filter((a) => a.vivo));
      if (!blanco) continue;
      const dx = blanco.x - r.x, dy = blanco.y - r.y, d = Math.hypot(dx, dy);
      // la carga: se pone rojo, se queda quieto un instante y embiste hacia donde estés en ese momento
      if (r.carga > 0) {
        r.carga -= dt; r.vx = 0; r.vy = 0; r.mirar(dx, dy);
        if (r.carga <= 0) { r.sprite.clearTint(); this.embestir(r, dx, dy); }
        continue;
      }
      const v = dif(43, 53, 64);
      r.vx = (dx / d) * v; r.vy = (dy / d) * v * 0.7;
      // no se tiran solos: frenan en el borde
      if (!pisa(r.x + r.vx * 0.3, r.y + r.vy * 0.3)) { if (pisa(r.x + r.vx * 0.3, r.y)) r.vy = 0; else if (pisa(r.x, r.y + r.vy * 0.3)) r.vx = 0; else { r.vx = 0; r.vy = 0; } }
      if (d < 46 && r.cd <= 0) { r.carga = dif(0.55, 0.42, 0.3); r.sprite.setTint(0xff7a7a); fxSobre(this, r, 'exclamacion'); tono(520, 0.06, 'cuadrada', 0.05); }
    }
    // física: moverse, chocar, caer
    for (const a of this.todos) {
      if (!a.vivo) continue;
      a.cd -= dt; a.aturdido -= dt; a.inmune -= dt;
      if (a.dash > 0) a.dash -= dt;
      const ox = a.x, oy = a.y;
      a.x += a.vx * dt; a.y += a.vy * dt;
      if (!pisa(a.x, a.y) && a.aturdido <= 0 && pisa(ox, oy)) {
        // por su propio pie nadie se cae: se desliza por el borde (primero en x, si no en y)
        if (pisa(ox + a.vx * dt, oy)) { a.y = oy; a.vy = 0; }
        else if (pisa(ox, oy + a.vy * dt)) { a.x = ox; a.vx = 0; }
        else { a.x = ox; a.y = oy; a.vx = 0; a.vy = 0; a.dash = 0; }
        if (a === this.jugador && !a.tambalea && a.vx === 0 && a.vy === 0) { a.tambalea = true; a.anim('edge_teeter', null, true); this.time.delayedCall(400, () => (a.tambalea = false)); }
      }
      if (a.dash <= 0 && a.aturdido <= 0) { if (Math.hypot(a.vx, a.vy) > 5) { a.mirar(a.vx, a.vy); a.anim('walk'); } else a.anim('idle'); }
      if (a.aturdido > 0 || a.dash > 0) { a.vx *= 0.9; a.vy *= 0.9; }
      // la familia no se cae (se agarran entre ellos); el jugador y los rivales sí
      if (this.familia.includes(a)) { if (!pisa(a.x, a.y)) { a.x -= a.vx * dt * 2; a.y -= a.vy * dt * 2; a.vx = 0; a.vy = 0; } continue; }
      // solo un empujón (aturdido) tumba
      if (!pisa(a.x, a.y)) this.caida(a);
    }
    // los choques de las embestidas
    for (const a of this.todos) {
      if (!a.vivo || a.dash <= 0) continue;
      for (const b of this.todos) {
        if (b === a || !b.vivo || b.golpeadoPor === a || b.inmune > 0) continue;
        const amigos = (this.rivales.includes(a)) === (this.rivales.includes(b));
        if (amigos) continue;
        if (Math.hypot(b.x - a.x, b.y - a.y) < 19) {
          const d = Math.hypot(a.vx, a.vy) || 1;
          const k = this.familia.includes(b) ? 0.4 : a === this.jugador ? 1.4 : b === this.jugador ? dif(0.6, 0.75, 0.9) : 1;
          b.vx = (a.vx / d) * 200 * k; b.vy = (a.vy / d) * 147 * k;
          b.aturdido = 0.45; b.golpeadoPor = a;
          this.time.delayedCall(400, () => (b.golpeadoPor = null));
          b.anim('hit', null, true);
          sfx(this, 'golpe_1', 0.5);
          sacudir(this, 80, 0.005);
          chorro(this, (a.x + b.x) / 2, (a.y + b.y) / 2 - 22, 8, [0xffffff, 0xf2c230], 66, { g: 130, vida: 300 });
        }
      }
    }
    if (!this.terminado && vivos.length === 0) { this.ganar({ lineas: [['rick', 'feliz', '¡Familia espalda con espalda! ¡Nadie nos tumba!']] }); return; }
    if (!this.terminado && this.tiempo <= 0) this.perder('SE ACABÓ EL TIEMPO');
  }

  estrellas() {
    const sobra = this.tiempo / this.tiempoTotal;
    return (sobra > 0.45 ? 3 : sobra > 0.2 ? 2 : 1) - Math.max(0, this.vidasInicio - E.vidas);
  }

  masCerca(a, lista) {
    let m = null, md = 1e9;
    for (const b of lista) { if (!b.vivo) continue; const d = Math.hypot(b.x - a.x, b.y - a.y); if (d < md) { md = d; m = b; } }
    return m;
  }

  embestir(a, dx, dy) {
    const d = Math.hypot(dx, dy) || 1;
    const v = this.rivales.includes(a) ? dif(160, 187, 213) : 227;
    a.vx = (dx / d) * v; a.vy = (dy / d) * v * 0.75;
    a.dash = 0.32; a.cd = this.rivales.includes(a) ? dif(2.4, 1.8, 1.3) : 0.6;
    a.mirar(dx, dy);
    a.anim('dash', null, true);
    sfx(this, 'esquiva', 0.3);
  }

  caida(a) {
    if (a === this.jugador && this.agarres > 0) {
      this.agarres--;
      a.x = this.seguro.x; a.y = this.seguro.y; a.vx = 0; a.vy = 0; a.dash = 0;
      a.aturdido = 0.5; a.inmune = 1.2;
      a.anim('edge_teeter', null, true);
      sfx(this, 'publico_ooh', 0.4);
      cartel(this, '¡TE AGARRASTE!', this.agarres ? `te ${this.agarres === 1 ? 'queda 1 agarre' : `quedan ${this.agarres} agarres`}` : 'ya no quedan agarres', { ms: 900, color: 0xf7c948, fondo: false });
      this.tweens.add({ targets: a.sprite, alpha: 0.4, duration: 120, yoyo: true, repeat: 4 });
      return;
    }
    if (a === this.jugador) { this.perder('TE TUMBARON DEL PILAR', { modo: 'caida', dy: 190 }); return; }
    this.contarEliminado();
    eliminar(this, a, { modo: 'caida', dy: 190 });
  }
}
