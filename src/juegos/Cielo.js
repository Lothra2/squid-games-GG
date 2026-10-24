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
import { lienzo, texturasLuz } from '../escenas/pintura.js';

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
    // los pilares de piedra, pintados pixel por pixel: columna de bloques con luz de luna, tapa de baldosas
    PILARES.forEach((p, k) => {
      const w = Math.round(p.rx * 1.15), alto = H - p.y + 4;
      lienzo(this, 'cl_col_' + k, w, alto, (P) => {
        for (let y = 0; y < alto; y += 12) {
          const off = (y / 12) % 2 ? 0 : 9;
          for (let x = -off; x < w; x += 18) {
            // la luz de la luna viene de la derecha: los bloques se aclaran hacia ese lado
            const f = Math.min(1, Math.max(0, (x + 9) / w)), t = P.rnd() * 0.15;
            const tonos = ['#2a3048', '#343c58', '#3e4766', '#4a5470', '#56607e', '#646e8e'];
            P.r(x, y, 17, 11, tonos[Math.min(5, Math.floor((f + t) * 5.2))]);
            P.r(x, y, 17, 1, tonos[Math.min(5, Math.floor((f + t) * 5.2) + 1)]);
          }
          P.r(0, y + 11, w, 1, '#2a3048');
        }
        // la luz de la luna desde la derecha y la sombra a la izquierda
        P.r(0, 0, 2, alto, '#1a2034'); P.r(w - 2, 0, 2, alto, '#7a84a8');
        // una enredadera
        let vx = Math.round(w * (0.3 + 0.4 * P.rnd()));
        for (let y = 0; y < 60; y++) { vx += Math.round(P.rnd() * 2 - 1); P.p(vx, y, '#3a6a4a'); if (y % 6 === 0) P.r(vx - 1, y, 3, 2, '#4a8a5a'); }
        P.deg(0, alto - 40, w, 40, ['#3a4460', '#1a2034']);
      }, 300 + k);
      this.add.image(p.x, p.y, 'cl_col_' + k).setOrigin(0.5, 0).setDepth(k === 1 ? -52 : -50);
      const tw = p.rx * 2 + 2, th = p.ry * 2 + 10;
      lienzo(this, 'cl_tapa_' + k, tw, th, (P) => {
        const cx = tw / 2, cy = p.ry + 1;
        // el canto de la tapa (grosor)
        P.elip(cx, cy + 6, p.rx, p.ry, '#3a4260');
        P.elip(cx, cy + 4, p.rx, p.ry, '#59627c');
        // la cara de arriba: anillos de baldosas
        for (let y = -p.ry; y <= p.ry; y++) for (let x = -p.rx; x <= p.rx; x++) {
          const d = (x / p.rx) ** 2 + (y / p.ry) ** 2;
          if (d > 1) continue;
          const r = Math.sqrt(d), a = Math.atan2(y / p.ry, x / p.rx);
          const anillo = Math.floor(r * 4), seg = Math.floor(((a + Math.PI) / (Math.PI * 2)) * (8 + anillo * 6));
          let col = (anillo + seg) % 2 ? '#8b93ab' : '#959db5';
          if (Math.abs(r * 4 - Math.round(r * 4)) < 0.06 || r > 0.96) col = '#6e7690';
          if (x > p.rx * 0.2 && y < 0) col = col === '#6e7690' ? '#7a82a0' : (anillo + seg) % 2 ? '#9aa2bc' : '#a4acc6';
          P.p(cx + x, cy + y, col);
        }
        P.ruido(cx - p.rx * 0.7, cy - p.ry * 0.7, p.rx * 1.4, p.ry * 1.4, '#7a829c', 140);
        // el borde iluminado de atrás
        for (let a = Math.PI; a < Math.PI * 2; a += 0.01) P.p(cx + Math.cos(a) * (p.rx - 1), cy + Math.sin(a) * (p.ry - 1), '#c8cee0');
        // las grietas
        for (let k2 = 0; k2 < 3; k2++) { let x = cx + (P.rnd() - 0.5) * p.rx, y = cy + (P.rnd() - 0.5) * p.ry; for (let s = 0; s < 14; s++) { P.p(x, y, '#5a6280'); x += P.rnd() * 2 - 0.6; y += P.rnd() - 0.5; } }
      }, 310 + k);
      this.add.image(p.x, p.y - 1, 'cl_tapa_' + k).setOrigin(0.5, (p.ry + 1) / th).setDepth(-48);
    });
    // los puentes de tablas con soga
    const g = this.add.graphics().setDepth(-49);
    for (const [a, b] of PUENTES) {
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
      g.fillStyle(0x2a2018); g.fillPoints([{ x: a.x + nx * 15, y: a.y + ny * 15 + 5 }, { x: b.x + nx * 15, y: b.y + ny * 15 + 5 }, { x: b.x - nx * 15, y: b.y - ny * 15 + 5 }, { x: a.x - nx * 15, y: a.y - ny * 15 + 5 }], true);
      for (let t = 0; t < 1; t += 0.07) {
        const t1 = Math.min(1, t + 0.06);
        const c = [0x9a7650, 0x8a6844, 0xa8845a][Math.floor(t * 100) % 3];
        g.fillStyle(c);
        g.fillPoints([
          { x: a.x + dx * t + nx * 13, y: a.y + dy * t + ny * 13 }, { x: a.x + dx * t1 + nx * 13, y: a.y + dy * t1 + ny * 13 },
          { x: a.x + dx * t1 - nx * 13, y: a.y + dy * t1 - ny * 13 }, { x: a.x + dx * t - nx * 13, y: a.y + dy * t - ny * 13 },
        ], true);
      }
      g.lineStyle(1, 0xd8c098); g.lineBetween(a.x + nx * 14, a.y + ny * 14 - 6, b.x + nx * 14, b.y + ny * 14 - 6); g.lineBetween(a.x - nx * 14, a.y - ny * 14 - 6, b.x - nx * 14, b.y - ny * 14 - 6);
      for (let t = 0.1; t < 1; t += 0.2) { g.fillStyle(0x6a5038); g.fillRect(a.x + dx * t + nx * 14 - 1, a.y + dy * t + ny * 14 - 6, 2, 6); g.fillRect(a.x + dx * t - nx * 14 - 1, a.y + dy * t - ny * 14 - 6, 2, 6); }
    }
    lienzo(this, 'cl_nube', 160, 40, (P, c) => {
      for (let i = 0; i < 18; i++) {
        const x = 20 + P.rnd() * 120, y = 14 + P.rnd() * 14, r = 10 + P.rnd() * 12;
        const gr = c.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(235,240,255,0.5)'); gr.addColorStop(1, 'rgba(235,240,255,0)');
        c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }, 320);
    // nubes que pasan por delante
    this.nubes = [0, 1, 2, 3].map((i) => this.add.image(Math.random() * W, 300 + i * 18, 'cl_nube').setAlpha(0.35 + i * 0.1).setScale(1 + i * 0.25).setDepth(i < 2 ? -45 : 5000));
    // pájaros a lo lejos y la luna que brilla
    this.pajaros = [0, 1, 2].map((i) => ({ x: -40 - i * 18, y: 70 + i * 7, f: i }));
    this.gPajaros = this.add.graphics().setDepth(-90);
    texturasLuz(this);
    const luna = this.add.image(578, 50, 'brillo').setScale(3.4).setTint(0xcfe0ff).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD).setDepth(-95);
    this.tweens.add({ targets: luna, alpha: 0.22, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
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
    this.nubes.forEach((n, i) => { n.x += (8 + i * 6) * dt; if (n.x > 760) n.x = -120; });
    this.gPajaros.clear();
    this.pajaros.forEach((p, i) => {
      p.x += 22 * dt; if (p.x > 700) p.x = -60 - i * 20;
      const ala = Math.sin(this.time.now / 140 + p.f * 2) * 3;
      this.gPajaros.lineStyle(1, 0x1a2238); this.gPajaros.lineBetween(p.x - 4, p.y + ala, p.x, p.y); this.gPajaros.lineBetween(p.x, p.y, p.x + 4, p.y + ala);
    });
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
