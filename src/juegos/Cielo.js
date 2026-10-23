// Juego 10: El calamar en el cielo (temporada 3). Tres pilares altísimos unidos por puentecitos.
// Los rivales quieren tumbar a la familia. A: embestida (empuja a quien toques). Bota a todos los rivales
// antes de que se acabe el tiempo. Si te sacan del pilar, caes.

import Phaser from 'phaser';
import { Juego } from '../core/juego.js';
import { Actor } from '../core/actor.js';
import { E, dif } from '../core/estado.js';
import { sfx, tono, musica } from '../core/sonido.js';
import { eliminar, sacudir, chorro } from '../core/efectos.js';
import { cartel, esperar } from '../core/dialogo.js';
import { jugadoresNPC } from '../core/kit.js';

const PILARES = [{ x: 118, y: 188, rx: 82, ry: 34 }, { x: 240, y: 136, rx: 74, ry: 30 }, { x: 362, y: 188, rx: 82, ry: 34 }];
const PUENTES = [[PILARES[0], PILARES[1]], [PILARES[1], PILARES[2]]];

const enElipse = (e, x, y, k = 1) => ((x - e.x) / (e.rx * k)) ** 2 + ((y - e.y) / (e.ry * k)) ** 2 <= 1;
function enPuente(x, y) {
  for (const [a, b] of PUENTES) {
    const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy;
    const t = ((x - a.x) * dx + (y - a.y) * dy) / L2;
    if (t < 0 || t > 1) continue;
    const px = a.x + dx * t, py = a.y + dy * t;
    if (Math.hypot(x - px, y - py) < 10) return true;
  }
  return false;
}
const pisa = (x, y) => PILARES.some((p) => enElipse(p, x, y)) || enPuente(x, y);

export class Cielo extends Juego {
  constructor() { super('Cielo'); }

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
      g.fillStyle(0x4a3828); g.fillPoints([{ x: a.x + nx * 11, y: a.y + ny * 11 + 3 }, { x: b.x + nx * 11, y: b.y + ny * 11 + 3 }, { x: b.x - nx * 11, y: b.y - ny * 11 + 3 }, { x: a.x - nx * 11, y: a.y - ny * 11 + 3 }], true);
      g.fillStyle(0x9a7650); g.fillPoints([{ x: a.x + nx * 10, y: a.y + ny * 10 }, { x: b.x + nx * 10, y: b.y + ny * 10 }, { x: b.x - nx * 10, y: b.y - ny * 10 }, { x: a.x - nx * 10, y: a.y - ny * 10 }], true);
      g.lineStyle(1, 0x6a5038); for (let t = 0.1; t < 1; t += 0.08) g.lineBetween(a.x + dx * t + nx * 10, a.y + dy * t + ny * 10, a.x + dx * t - nx * 10, a.y + dy * t - ny * 10);
    }
    for (const p of orden) {
      g.fillStyle(0x59627c); g.fillEllipse(p.x, p.y + 5, p.rx * 2, p.ry * 2);
      g.fillStyle(0x8b93ab); g.fillEllipse(p.x, p.y, p.rx * 2, p.ry * 2);
      g.lineStyle(1, 0xc8cee0, 0.7); g.strokeEllipse(p.x, p.y, p.rx * 2 - 6, p.ry * 2 - 4);
    }
    // nubes que pasan por delante
    this.nubes = [0, 1, 2].map((i) => this.add.ellipse(Math.random() * W, 246 + i * 10, 160, 16, 0xffffff, 0.16).setDepth(5000));
    this.crearJugador(130, 190, 'right');
    this.crearFamilia([[92, 180, 'right'], [86, 198, 'right'], [112, 208, 'right']]);
    const ids = jugadoresNPC();
    const lugares = [[240, 136], [218, 128], [262, 144], [362, 188], [340, 178], [384, 198], [362, 208]];
    this.rivales = lugares.slice(0, dif(4, 5, 7)).map(([x, y], i) => {
      const a = new Actor(this, ids[(i * 3 + 1) % ids.length], x, y, { dir: 'left' });
      return a;
    });
    this.todos = [this.jugador, ...this.familia, ...this.rivales];
    this.todos.forEach((a) => { a.vx = 0; a.vy = 0; a.dash = 0; a.cd = Math.random(); a.aturdido = 0; });
    this.tiempo = dif(100, 85, 70);
  }

  reglas() {
    return [
      ['front_man', 'neutral', 'Juego 10: el calamar en el cielo. Tres pilares. Solo los más fuertes se quedan arriba.'],
      ['front_man', 'neutral', 'Los que caigan de los pilares quedan eliminados.'],
      ['rick', 'enojo', 'Vienen por nosotros. ¡Familia, espalda con espalda!'],
      ['steph', 'neutral', 'Con A te lanzas de embestida. Bótalos a todos. ¡Y no te acerques al borde!'],
    ];
  }

  empezar() { musica('epica'); }

  paso(dt) {
    this.tiempo -= dt;
    this.hud.setTiempo(this.tiempo);
    this.nubes.forEach((n, i) => { n.x += (8 + i * 5) * dt; if (n.x > 560) n.x = -80; });
    const j = this.jugador;
    const vivos = this.rivales.filter((r) => r.vivo);
    this.hud.setExtra(`RIVALES: ${vivos.length}`, 0xff8fb5);

    // el jugador
    if (j.vivo) {
      if (j.aturdido <= 0 && j.dash <= 0) {
        j.vx = this.inp.x * 70; j.vy = this.inp.y * 50;
        if (Math.abs(this.inp.x) + Math.abs(this.inp.y) > 0.1) j.mirar(this.inp.x, this.inp.y);
        if (this.inp.tomarA() && j.cd <= 0) this.embestir(j, this.inp.x || (j.izq ? -1 : 1), this.inp.y);
      }
    }
    // la familia: se defiende cerca de su lugar
    this.familia.forEach((f, i) => {
      if (f.aturdido > 0 || f.dash > 0) return;
      const r = this.masCerca(f, this.rivales);
      if (r && Math.hypot(r.x - f.x, r.y - f.y) < 32 && f.cd <= 0) this.embestir(f, r.x - f.x, r.y - f.y);
      else { const h = [[92, 180], [86, 198], [112, 208]][i]; f.vx = (h[0] - f.x) * 2; f.vy = (h[1] - f.y) * 2; }
    });
    // los rivales: van por el más cercano de la familia y embisten
    for (const r of vivos) {
      if (r.aturdido > 0 || r.dash > 0) continue;
      const blanco = this.masCerca(r, [j, ...this.familia].filter((a) => a.vivo));
      if (!blanco) continue;
      const dx = blanco.x - r.x, dy = blanco.y - r.y, d = Math.hypot(dx, dy);
      const v = dif(32, 40, 48);
      r.vx = (dx / d) * v; r.vy = (dy / d) * v * 0.7;
      // no se tiran solos: frenan en el borde
      if (!pisa(r.x + r.vx * 0.3, r.y + r.vy * 0.3)) { if (pisa(r.x + r.vx * 0.3, r.y)) r.vy = 0; else if (pisa(r.x, r.y + r.vy * 0.3)) r.vx = 0; else { r.vx = 0; r.vy = 0; } }
      if (d < 30 && r.cd <= 0) this.embestir(r, dx, dy);
    }
    // física: moverse, chocar, caer
    for (const a of this.todos) {
      if (!a.vivo) continue;
      a.cd -= dt; a.aturdido -= dt;
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
        if (b === a || !b.vivo || b.golpeadoPor === a) continue;
        const amigos = (this.rivales.includes(a)) === (this.rivales.includes(b));
        if (amigos) continue;
        if (Math.hypot(b.x - a.x, b.y - a.y) < 14) {
          const d = Math.hypot(a.vx, a.vy) || 1;
          const k = this.familia.includes(b) ? 0.4 : a === this.jugador ? 1.4 : 1;
          b.vx = (a.vx / d) * 150 * k; b.vy = (a.vy / d) * 110 * k;
          b.aturdido = 0.45; b.golpeadoPor = a;
          this.time.delayedCall(400, () => (b.golpeadoPor = null));
          b.anim('hit', null, true);
          sfx(this, 'golpe_1', 0.5);
          sacudir(this, 80, 0.005);
          chorro(this, (a.x + b.x) / 2, (a.y + b.y) / 2 - 16, 6, [0xffffff, 0xf2c230], 50, { g: 100, vida: 300 });
        }
      }
    }
    if (!this.terminado && vivos.length === 0) { this.ganar({ lineas: [['rick', 'feliz', '¡Familia espalda con espalda! ¡Nadie nos tumba!']] }); return; }
    if (!this.terminado && this.tiempo <= 0) this.perder('SE ACABÓ EL TIEMPO');
  }

  masCerca(a, lista) {
    let m = null, md = 1e9;
    for (const b of lista) { if (!b.vivo) continue; const d = Math.hypot(b.x - a.x, b.y - a.y); if (d < md) { md = d; m = b; } }
    return m;
  }

  embestir(a, dx, dy) {
    const d = Math.hypot(dx, dy) || 1;
    const v = this.rivales.includes(a) ? dif(120, 140, 160) : 170;
    a.vx = (dx / d) * v; a.vy = (dy / d) * v * 0.75;
    a.dash = 0.32; a.cd = this.rivales.includes(a) ? dif(2.4, 1.8, 1.3) : 0.6;
    a.mirar(dx, dy);
    a.anim('dash', null, true);
    sfx(this, 'esquiva', 0.3);
  }

  caida(a) {
    if (a === this.jugador) { this.perder('TE TUMBARON DEL PILAR', { modo: 'caida', dy: 140 }); return; }
    this.contarEliminado();
    eliminar(this, a, { modo: 'caida', dy: 140 });
  }
}
