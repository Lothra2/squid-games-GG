// Juego 10: El calamar en el cielo (temporada 3). Tres pilares altísimos unidos por puentecitos.
// Los rivales quieren tumbar a la familia. A: embestida. B: agarrar al que esté cerca: empieza un forcejeo y
// machacando A lo empujas hasta lanzarlo. Los rivales también te agarran a ti, y la familia pelea sus propios
// forcejeos. Bota a todos los rivales antes de que se acabe el tiempo. Si te tumban, te agarras del borde.

import Phaser from 'phaser';
import { Juego } from '../core/juego.js';
import { Actor } from '../core/actor.js';
import { E, dif } from '../core/estado.js';
import { sfx, tono, musica } from '../core/sonido.js';
import { eliminar, sacudir, chorro, fxSobre } from '../core/efectos.js';
import { cartel } from '../core/dialogo.js';
import { COLOR, texto, icono } from '../core/ui.js';
import { jugadoresNPC } from '../core/kit.js';
import { lienzo, texturasLuz } from '../escenas/pintura.js';
import { pajaros } from '../core/vivo.js';

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

/** las texturas de los pilares, las tapas y las nubes. Se hacen en la pantalla de carga (son pesadas). */
export function texturasCielo(scene) {
  const H = 360;
  PILARES.forEach((p, k) => {
    const w = Math.round(p.rx * 1.15), alto = H - p.y + 4;
    lienzo(scene, 'cl_col_' + k, w, alto, (P) => {
      const tonos = ['#2a3048', '#343c58', '#3e4766', '#4a5470', '#56607e', '#646e8e'];
      for (let y = 0; y < alto; y += 12) {
        const off = (y / 12) % 2 ? 0 : 9;
        for (let x = -off; x < w; x += 18) {
          // la luz de la luna viene de la derecha: los bloques se aclaran hacia ese lado
          const f = Math.min(1, Math.max(0, (x + 9) / w)), t = P.rnd() * 0.15, i = Math.min(5, Math.floor((f + t) * 5.2));
          P.r(x, y, 17, 11, tonos[i]);
          P.r(x, y, 17, 1, tonos[Math.min(5, i + 1)]);
          if (P.rnd() < 0.12) P.r(x + 3 + Math.floor(P.rnd() * 10), y + 4, 3, 2, '#2a3048');
        }
        P.r(0, y + 11, w, 1, '#2a3048');
      }
      P.r(0, 0, 2, alto, '#1a2034'); P.r(w - 2, 0, 2, alto, '#7a84a8');
      // la sombra de la tapa sobre la columna
      P.trama(0, 0, w, 8, '#141a2c', 0.6);
      // una enredadera
      let vx = Math.round(w * (0.3 + 0.4 * P.rnd()));
      for (let y = 0; y < 70; y++) { vx += Math.round(P.rnd() * 2 - 1); P.p(vx, y, '#3a6a4a'); if (y % 6 === 0) P.r(vx - 1, y, 3, 2, '#4a8a5a'); }
    }, 300 + k);
    const tw = p.rx * 2 + 2, th = p.ry * 2 + 10;
    lienzo(scene, 'cl_tapa_' + k, tw, th, (P) => {
      const cx = tw / 2, cy = p.ry + 1;
      P.elip(cx, cy + 6, p.rx, p.ry, '#3a4260');
      P.elip(cx, cy + 4, p.rx, p.ry, '#59627c');
      P.pixeles((set) => {
        // la cara de arriba: anillos de baldosas, más clara hacia la luna
        for (let y = -p.ry; y <= p.ry; y++) for (let x = -p.rx; x <= p.rx; x++) {
          const d = (x / p.rx) ** 2 + (y / p.ry) ** 2;
          if (d > 1) continue;
          const r = Math.sqrt(d), a = Math.atan2(y / p.ry, x / p.rx);
          const anillo = Math.floor(r * 4), seg = Math.floor(((a + Math.PI) / (Math.PI * 2)) * (8 + anillo * 6));
          let col = (anillo + seg) % 2 ? '#8b93ab' : '#959db5';
          if (Math.abs(r * 4 - Math.round(r * 4)) < 0.06 || r > 0.96) col = '#6e7690';
          if (x > p.rx * 0.2 && y < 0) col = col === '#6e7690' ? '#7a82a0' : (anillo + seg) % 2 ? '#9aa2bc' : '#a4acc6';
          set(cx + x, cy + y, col);
        }
        for (let a = Math.PI; a < Math.PI * 2; a += 0.01) set(cx + Math.cos(a) * (p.rx - 1), cy + Math.sin(a) * (p.ry - 1), '#c8cee0');
      });
      P.ruido(cx - p.rx * 0.7, cy - p.ry * 0.7, p.rx * 1.4, p.ry * 1.4, '#7a829c', 140);
      for (let k2 = 0; k2 < 3; k2++) { let x = cx + (P.rnd() - 0.5) * p.rx, y = cy + (P.rnd() - 0.5) * p.ry; for (let s = 0; s < 14; s++) { P.p(x, y, '#5a6280'); x += P.rnd() * 2 - 0.6; y += P.rnd() - 0.5; } }
    }, 310 + k);
  });
  lienzo(scene, 'cl_nube', 160, 40, (P, c) => {
    for (let i = 0; i < 18; i++) {
      const x = 20 + P.rnd() * 120, y = 14 + P.rnd() * 14, r = 10 + P.rnd() * 12;
      const gr = c.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(235,240,255,0.55)'); gr.addColorStop(1, 'rgba(235,240,255,0)');
      c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }, 320);
}

export class Cielo extends Juego {
  constructor() { super('Cielo'); }
  ambiente() { return { vineta: 0.5, motas: 0 }; }

  armar() {
    const W = this.scale.width, H = this.scale.height;
    texturasCielo(this);
    texturasLuz(this);
    this.add.image(W / 2, H / 2, 'cielo').setDepth(-100);
    // los pilares (columna hasta abajo y tapa), los puentes de tablas y el banco de nubes al pie
    PILARES.forEach((p, k) => {
      this.add.image(p.x, p.y, 'cl_col_' + k).setOrigin(0.5, 0).setDepth(k === 1 ? -52 : -50);
      this.add.image(p.x, p.y - 1, 'cl_tapa_' + k).setOrigin(0.5, (p.ry + 1) / (p.ry * 2 + 10)).setDepth(-48);
    });
    this.puentes();
    this.nubesPie = [];
    for (let i = 0; i < 9; i++) {
      const n = this.add.image(i * 80 - 20, 334 + (i % 3) * 8, 'cl_nube').setScale(1.4 + (i % 2) * 0.4, 1.6).setAlpha(0.85).setDepth(-46);
      this.nubesPie.push({ n, v: 5 + (i % 3) * 3 });
    }
    this.nubes = [0, 1, 2].map((i) => this.add.image(Math.random() * W, 240 + i * 26, 'cl_nube').setAlpha(0.25 + i * 0.08).setScale(1.2 + i * 0.3).setDepth(-55));
    const luna = this.add.image(578, 50, 'brillo').setScale(3.4).setTint(0xcfe0ff).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD).setDepth(-95);
    this.tweens.add({ targets: luna, alpha: 0.22, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // el viento: rayitas que cruzan
    this.viento = Array.from({ length: 10 }, () => this.add.rectangle(Math.random() * W, 60 + Math.random() * 280, 6 + Math.random() * 10, 1, 0xdfe8ff, 0.25).setDepth(4000));

    this.crearJugador(173, 253, 'right');
    this.crearFamilia([[123, 240, 'right'], [115, 264, 'right'], [149, 277, 'right']]);
    const ids = jugadoresNPC();
    const lugares = [[320, 181], [291, 171], [349, 192], [483, 251], [453, 237], [512, 264], [483, 277]];
    this.rivales = lugares.slice(0, dif(3, 5, 7)).map(([x, y], i) => {
      const r = new Actor(this, ids[(i * 3 + 1) % ids.length], x, y, { dir: 'left' });
      // los rivales llevan su número en rojo, para distinguirlos de la familia
      r.ponerNumero(String(100 + ((i * 137) % 800)).padStart(3, '0'), 0xff4d6d);
      return r;
    });
    this.todos = [this.jugador, ...this.familia, ...this.rivales];
    this.todos.forEach((a) => { a.vx = 0; a.vy = 0; a.dash = 0; a.cd = 1 + Math.random(); a.aturdido = 0; a.carga = 0; a.inmune = 0; a.lucha = null; });
    this.luchas = [];
    this.gLuchas = this.add.graphics().setDepth(8500);
    this.aviso = texto(this, 0, 0, '', { tam: 12, negrita: true, color: COLOR.oro, origen: [0.5, 1] }).setDepth(8501);
    this.avisoA = icono(this, 0, 0, 'a', 18).setDepth(8501).setVisible(false);
    this.agarres = dif(4, 3, 2);
    this.seguro = { x: this.jugador.x, y: this.jugador.y };
    this.pausaGolpe = 0;
    this.tiempo = dif(130, 100, 80);
    this.tiempoTotal = this.tiempo;
  }

  puentes() {
    const g = this.add.graphics().setDepth(-49);
    for (const [a, b] of PUENTES) {
      const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
      g.fillStyle(0x2a2018); g.fillPoints([{ x: a.x + nx * 15, y: a.y + ny * 15 + 5 }, { x: b.x + nx * 15, y: b.y + ny * 15 + 5 }, { x: b.x - nx * 15, y: b.y - ny * 15 + 5 }, { x: a.x - nx * 15, y: a.y - ny * 15 + 5 }], true);
      for (let t = 0; t < 1; t += 0.07) {
        const t1 = Math.min(1, t + 0.06);
        g.fillStyle([0x9a7650, 0x8a6844, 0xa8845a][Math.floor(t * 100) % 3]);
        g.fillPoints([
          { x: a.x + dx * t + nx * 13, y: a.y + dy * t + ny * 13 }, { x: a.x + dx * t1 + nx * 13, y: a.y + dy * t1 + ny * 13 },
          { x: a.x + dx * t1 - nx * 13, y: a.y + dy * t1 - ny * 13 }, { x: a.x + dx * t - nx * 13, y: a.y + dy * t - ny * 13 },
        ], true);
      }
      g.lineStyle(1, 0xd8c098); g.lineBetween(a.x + nx * 14, a.y + ny * 14 - 6, b.x + nx * 14, b.y + ny * 14 - 6); g.lineBetween(a.x - nx * 14, a.y - ny * 14 - 6, b.x - nx * 14, b.y - ny * 14 - 6);
      for (let t = 0.1; t < 1; t += 0.2) { g.fillStyle(0x6a5038); g.fillRect(a.x + dx * t + nx * 14 - 1, a.y + dy * t + ny * 14 - 6, 2, 6); g.fillRect(a.x + dx * t - nx * 14 - 1, a.y + dy * t - ny * 14 - 6, 2, 6); }
    }
  }

  decorar() {
    pajaros(this, { n: 4, y0: 60, y1: 120, color: 0x1a2238, prof: -90, par: 0 });
  }

  reglas() {
    return {
      objetivo: ['Tres pilares sobre las nubes. Bota a todos los rivales al vacío antes de que acabe el tiempo.', 'A: embestida. B: agarrar al que esté cerca, y en el forcejeo machaca A para lanzarlo.', `El que se pone rojo va a embestir: esquívalo o atrápalo con B justo a tiempo. Si te tumban, te agarras del borde (${dif(4, 3, 2)} veces).`],
      controles: [['palanca', 'Moverse'], ['a', 'Embestir / machacar'], ['b', 'Agarrar']],
      frase: ['rick', 'enojo', '¡Vienen por nosotros! ¡Familia, espalda con espalda!'],
    };
  }

  empezar() { musica('epica'); }

  paso(dt) {
    // el golpe congela la acción un instante: así pega
    if (this.pausaGolpe > 0) { this.pausaGolpe -= dt; return; }
    this.tiempo -= dt;
    this.hud.setTiempo(this.tiempo);
    this.vivo(dt);
    const j = this.jugador;
    const vivos = this.rivales.filter((r) => r.vivo);
    this.hud.setExtra(`RIVALES: ${vivos.length}   ·   AGARRES: ${this.agarres}`, 0xff8fb5);
    if (j.vivo && j.aturdido <= 0 && !j.lucha && pisa(j.x, j.y)) { this.seguro.x = j.x; this.seguro.y = j.y; }

    // el jugador
    if (j.vivo && !j.lucha && j.aturdido <= 0 && j.dash <= 0) {
      j.vx = this.inp.x * 96; j.vy = this.inp.y * 70;
      if (Math.abs(this.inp.x) + Math.abs(this.inp.y) > 0.1) j.mirar(this.inp.x, this.inp.y);
      if (this.inp.tomarB()) {
        this.bReciente = 0.3;
        const r = this.masCerca(j, this.rivales.filter((x) => !x.lucha));
        if (r && Math.hypot(r.x - j.x, r.y - j.y) < 32) this.agarrar(j, r);
        else tono(220, 0.05, 'cuadrada', 0.05);
      } else if (this.inp.tomarA() && j.cd <= 0) this.embestir(j, this.inp.x || (j.izq ? -1 : 1), this.inp.y);
    }
    // la familia: se defiende cerca de su lugar, embiste o agarra
    this.familia.forEach((f, i) => {
      if (f.lucha || f.aturdido > 0 || f.dash > 0) return;
      const r = this.masCerca(f, this.rivales.filter((x) => !x.lucha));
      if (r && Math.hypot(r.x - f.x, r.y - f.y) < 40 && f.cd <= 0) {
        if (Math.random() < 0.5 && Math.hypot(r.x - f.x, r.y - f.y) < 28) this.agarrar(f, r); else this.embestir(f, r.x - f.x, r.y - f.y);
      } else { const h = [[123, 240], [115, 264], [149, 277]][i]; f.vx = (h[0] - f.x) * 2; f.vy = (h[1] - f.y) * 2; }
    });
    // los rivales: van por el más cercano de la familia; cargan (rojos) y embisten, o agarran
    for (const r of vivos) {
      if (r.lucha || r.aturdido > 0 || r.dash > 0) continue;
      const blanco = this.masCerca(r, [j, ...this.familia].filter((a) => a.vivo));
      if (!blanco) continue;
      const dx = blanco.x - r.x, dy = blanco.y - r.y, d = Math.hypot(dx, dy) || 1;
      if (r.carga > 0) {
        r.carga -= dt; r.vx = 0; r.vy = 0; r.mirar(dx, dy);
        if (r.carga <= 0) { r.sprite.clearTint(); this.embestir(r, dx, dy); }
        continue;
      }
      const v = dif(36, 53, 64);
      r.vx = (dx / d) * v; r.vy = (dy / d) * v * 0.7;
      if (!pisa(r.x + r.vx * 0.3, r.y + r.vy * 0.3)) { if (pisa(r.x + r.vx * 0.3, r.y)) r.vy = 0; else if (pisa(r.x, r.y + r.vy * 0.3)) r.vx = 0; else { r.vx = 0; r.vy = 0; } }
      if (r.cd <= 0 && d < 46) {
        if (d < 26 && !blanco.lucha && blanco.inmune <= 0 && Math.random() < dif(0.25, 0.45, 0.55)) this.agarrar(r, blanco);
        else { r.carga = dif(0.7, 0.42, 0.3); r.sprite.setTint(0xff7a7a); fxSobre(this, r, 'exclamacion'); tono(520, 0.06, 'cuadrada', 0.05); }
        r.cd = 0.5;
      }
    }
    this.bReciente = Math.max(0, (this.bReciente || 0) - dt);
    this.pasoLuchas(dt);
    this.fisica(dt);
    this.choques();
    if (!this.terminado && vivos.length === 0) { this.ganar({ lineas: [['rick', 'feliz', '¡Familia espalda con espalda! ¡Nadie nos tumba!']] }); return; }
    if (!this.terminado && this.tiempo <= 0) this.perder('SE ACABÓ EL TIEMPO');
  }

  /** nubes, viento */
  vivo(dt) {
    const W = this.scale.width;
    this.nubes.forEach((n, i) => { n.x += (6 + i * 5) * dt; if (n.x > W + 120) n.x = -120; });
    this.nubesPie.forEach((o) => { o.n.x += o.v * dt; if (o.n.x > W + 110) o.n.x = -110; });
    this.viento.forEach((v) => { v.x -= 160 * dt; if (v.x < -20) { v.x = W + 20; v.y = 60 + Math.random() * 280; } });
  }

  // ---------------------------------------------------------------- el forcejeo

  agarrar(a, b) {
    const L = { a, b, v: 0, t: 0, ux: 0, uy: 0 };
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    L.ux = dx / d; L.uy = dy / d;
    L.cx = (a.x + b.x) / 2; L.cy = (a.y + b.y) / 2;
    [a, b].forEach((x) => { x.lucha = L; x.vx = 0; x.vy = 0; x.dash = 0; x.carga = 0; x.sprite.clearTint(); });
    a.mirar(dx, dy); b.mirar(-dx, -dy);
    a.anim('judo_grip', null, true); b.anim('judo_grip', null, true);
    sfx(this, 'golpe', 0.5);
    fxSobre(this, b, 'agarre', -30);
    this.luchas.push(L);
    if (a === this.jugador || b === this.jugador) { tono(880, 0.08, 'metal', 0.12); sacudir(this, 120, 0.006); }
  }

  pasoLuchas(dt) {
    const j = this.jugador;
    const g = this.gLuchas;
    g.clear();
    let mia = null;
    for (const L of [...this.luchas]) {
      const { a, b } = L;
      if (!a.vivo || !b.vivo) { this.soltar(L); continue; }
      L.t += dt;
      const delJugador = a === j ? 1 : b === j ? -1 : 0;
      if (delJugador) {
        mia = L;
        // machacar A empuja; el rival empuja parejo, con arranques
        if (this.inp.tomarA()) { L.v += delJugador * dif(0.24, 0.16, 0.13); sfx(this, 'golpe_1', 0.25); this.sacudirPar(L); }
        const fuerza = dif(0.22, 0.32, 0.42) * (Math.sin(L.t * 3.1) > 0.7 ? 1.8 : 1);
        L.v -= delJugador * fuerza * dt;
      } else {
        // familia contra rival: se empujan solos, la familia un poco más fuerte
        const fam = this.familia.includes(a) ? 1 : this.familia.includes(b) ? -1 : 0;
        L.v += ((Math.random() - 0.5) * 2.4 + fam * dif(0.5, 0.35, 0.2)) * dt;
      }
      // el par se corre hacia el lado del que va perdiendo
      L.cx += L.ux * L.v * 50 * dt; L.cy += L.uy * L.v * 36 * dt;
      a.x = L.cx - L.ux * 11; a.y = L.cy - L.uy * 7;
      b.x = L.cx + L.ux * 11; b.y = L.cy + L.uy * 7;
      // si a uno lo sacaron del piso en el forcejeo, se cae
      if (!pisa(b.x, b.y)) { this.soltar(L); b.aturdido = 0.5; b.vx = L.ux * 120; b.vy = L.uy * 90; continue; }
      if (!pisa(a.x, a.y)) { this.soltar(L); a.aturdido = 0.5; a.vx = -L.ux * 120; a.vy = -L.uy * 90; continue; }
      if (L.v >= 1) { this.lanzar(a, b, L.ux, L.uy, L); continue; }
      if (L.v <= -1) { this.lanzar(b, a, -L.ux, -L.uy, L); continue; }
      if (L.t > 5) { this.soltar(L); [a, b].forEach((x) => { x.aturdido = 0.3; x.cd = 0.6; }); a.vx = -L.ux * 90; b.vx = L.ux * 90; continue; }
      // la barra del forcejeo encima del par
      const bx = L.cx - 22, by = Math.min(a.y, b.y) - 70;
      g.fillStyle(0x120e18, 0.85); g.fillRect(bx - 2, by - 2, 48, 9);
      const izqEsA = a.x <= b.x, colA = this.rivales.includes(a) ? 0xff4d6d : 0x2fd4b4, colB = this.rivales.includes(b) ? 0xff4d6d : 0x2fd4b4;
      const p = (L.v + 1) / 2;
      const w1 = Math.round(44 * (izqEsA ? p : 1 - p));
      g.fillStyle(izqEsA ? colA : colB); g.fillRect(bx, by, w1, 5);
      g.fillStyle(izqEsA ? colB : colA); g.fillRect(bx + w1, by, 44 - w1, 5);
      g.fillStyle(0xffffff); g.fillRect(bx + w1 - 1, by - 2, 2, 9);
    }
    // el aviso de machacar cuando el forcejeo es tuyo
    if (mia) {
      const pulso = 1 + Math.sin(this.time.now / 70) * 0.12;
      const y = Math.min(mia.a.y, mia.b.y) - 84;
      this.avisoA.setVisible(true).setPosition(mia.cx - 34, y).setScale((18 / this.avisoA.width) * pulso);
      this.aviso.setPosition(mia.cx + 8, y + 7).setText('¡MACHACA!');
    } else { this.avisoA.setVisible(false); this.aviso.setText(''); }
  }

  sacudirPar(L) {
    const k = (Math.random() - 0.5) * 3;
    L.cx += k * L.uy; L.cy += k * 0.3;
  }

  soltar(L) {
    this.luchas = this.luchas.filter((x) => x !== L);
    [L.a, L.b].forEach((x) => { if (x.lucha === L) x.lucha = null; if (x.vivo) x.anim('idle'); });
  }

  /** el ganador del forcejeo lanza al otro con todo */
  lanzar(gana, pierde, ux, uy, L) {
    this.soltar(L);
    pierde.vx = ux * 420; pierde.vy = uy * 300; pierde.aturdido = 0.7; pierde.golpeadoPor = gana;
    if (this.familia.includes(pierde)) { pierde.vx *= 0.4; pierde.vy *= 0.4; }
    if (pierde === this.jugador) { pierde.vx *= dif(0.6, 0.72, 0.85); pierde.vy *= dif(0.6, 0.72, 0.85); }
    pierde.anim('hit', null, true);
    gana.anim('jab', null, true); gana.cd = 0.6;
    this.impacto((gana.x + pierde.x) / 2, (gana.y + pierde.y) / 2 - 24, true);
    if (gana === this.jugador) tono(1320, 0.12, 'campana', 0.12);
  }

  // ---------------------------------------------------------------- embestidas, golpes y caídas

  embestir(a, dx, dy) {
    const d = Math.hypot(dx, dy) || 1;
    const v = this.rivales.includes(a) ? dif(150, 187, 213) : 240;
    a.vx = (dx / d) * v; a.vy = (dy / d) * v * 0.75;
    a.dash = 0.32; a.cd = this.rivales.includes(a) ? dif(2.8, 1.8, 1.3) : 0.55;
    a.mirar(dx, dy);
    a.anim('dash', null, true);
    sfx(this, 'esquiva', 0.3);
  }

  /** chispas, onomatopeya, sacudón y la pausa de impacto */
  impacto(x, y, fuerte = false) {
    this.pausaGolpe = fuerte ? 0.09 : 0.05;
    sacudir(this, fuerte ? 220 : 120, fuerte ? 0.016 : 0.008);
    sfx(this, fuerte ? 'golpe_pesado' : 'golpe_1', fuerte ? 0.7 : 0.5);
    chorro(this, x, y, fuerte ? 14 : 8, [0xffffff, 0xf2c230, 0xffe08a], fuerte ? 110 : 70, { g: 130, vida: 320, prof: 8000 });
    const fx = (id, dy) => { if (!this.textures.exists('fx_' + id)) return; const s = this.add.sprite(x, y + dy, 'fx_' + id).setDepth(8100); s.play('fx_' + id); s.once('animationcomplete', () => s.destroy()); };
    fx(fuerte ? 'chispa_golpe_pesado' : 'chispa_golpe_medio', 0);
    if (fuerte || Math.random() < 0.5) fx(Math.random() < 0.5 ? 'onomatopeya_paf' : 'onomatopeya_pow', -26);
  }

  fisica(dt) {
    for (const a of this.todos) {
      if (!a.vivo) continue;
      a.cd -= dt; a.aturdido -= dt; a.inmune -= dt;
      if (a.lucha) continue;
      if (a.dash > 0) a.dash -= dt;
      const ox = a.x, oy = a.y;
      a.x += a.vx * dt; a.y += a.vy * dt;
      if (!pisa(a.x, a.y) && a.aturdido <= 0 && pisa(ox, oy)) {
        // por su propio pie nadie se cae: se desliza por el borde
        if (pisa(ox + a.vx * dt, oy)) { a.y = oy; a.vy = 0; }
        else if (pisa(ox, oy + a.vy * dt)) { a.x = ox; a.vx = 0; }
        else { a.x = ox; a.y = oy; a.vx = 0; a.vy = 0; a.dash = 0; }
        if (a === this.jugador && !a.tambalea && a.vx === 0 && a.vy === 0) { a.tambalea = true; a.anim('edge_teeter', null, true); this.time.delayedCall(400, () => (a.tambalea = false)); }
      }
      if (a.dash <= 0 && a.aturdido <= 0) { if (Math.hypot(a.vx, a.vy) > 5) { a.mirar(a.vx, a.vy); a.anim('walk'); } else a.anim('idle'); }
      if (a.aturdido > 0 || a.dash > 0) { a.vx *= 0.9; a.vy *= 0.9; }
      // la familia no se cae (se agarran entre ellos); el jugador y los rivales sí
      if (this.familia.includes(a)) { if (!pisa(a.x, a.y)) { a.x -= a.vx * dt * 2; a.y -= a.vy * dt * 2; a.vx = 0; a.vy = 0; } continue; }
      if (!pisa(a.x, a.y)) this.caida(a);
    }
  }

  choques() {
    for (const a of this.todos) {
      if (!a.vivo || a.dash <= 0 || a.lucha) continue;
      for (const b of this.todos) {
        if (b === a || !b.vivo || b.golpeadoPor === a || b.inmune > 0) continue;
        if ((this.rivales.includes(a)) === (this.rivales.includes(b))) continue;
        if (Math.hypot(b.x - a.x, b.y - a.y) < 20) {
          // las defensas del jugador: atraparlo con B justo a tiempo, o chocar de frente embistiendo también
          if (b === this.jugador && this.rivales.includes(a) && !b.lucha) {
            if (this.bReciente > 0) { this.bReciente = 0; this.agarrar(b, a); b.lucha.v = 0.35; cartel(this, '¡ATRAPADO!', '', { ms: 600, color: 0x2fd4b4, fondo: false }); continue; }
            if (b.dash > 0) { this.choqueFrente(b, a); continue; }
          }
          if (b.lucha) this.soltar(b.lucha);
          const d = Math.hypot(a.vx, a.vy) || 1;
          const k = this.familia.includes(b) ? 0.4 : a === this.jugador ? 1.45 : b === this.jugador ? dif(0.4, 0.56, 0.75) : 1;
          b.vx = (a.vx / d) * 210 * k; b.vy = (a.vy / d) * 155 * k;
          b.aturdido = 0.45; b.golpeadoPor = a;
          this.time.delayedCall(400, () => (b.golpeadoPor = null));
          b.anim('hit', null, true);
          a.dash = Math.min(a.dash, 0.08);
          this.impacto((a.x + b.x) / 2, (a.y + b.y) / 2 - 24, a === this.jugador);
        }
      }
    }
  }

  /** dos embestidas de frente: gana la del jugador y el rival sale volando */
  choqueFrente(j, r) {
    const dx = r.x - j.x, dy = r.y - j.y, d = Math.hypot(dx, dy) || 1;
    r.vx = (dx / d) * 280; r.vy = (dy / d) * 200; r.aturdido = 0.6; r.golpeadoPor = j; r.dash = 0;
    j.vx *= -0.2; j.vy *= -0.2; j.dash = 0;
    r.anim('hit', null, true);
    this.time.delayedCall(400, () => (r.golpeadoPor = null));
    this.impacto((j.x + r.x) / 2, (j.y + r.y) / 2 - 24, true);
  }

  estrellas() {
    const sobra = this.tiempo / this.tiempoTotal;
    return (sobra > 0.45 ? 3 : sobra > 0.2 ? 2 : 1) - Math.max(0, this.vidasInicio - E.vidas);
  }

  masCerca(a, lista) {
    let m = null, md = 1e9;
    for (const b of lista) { if (!b.vivo || b === a) continue; const d = Math.hypot(b.x - a.x, b.y - a.y); if (d < md) { md = d; m = b; } }
    return m;
  }

  caida(a) {
    if (a.lucha) this.soltar(a.lucha);
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
    const ultimo = this.rivales.filter((r) => r.vivo).length === 1;
    eliminar(this, a, { modo: 'caida', dy: 190 });
    sfx(this, 'publico_grito', 0.35);
    if (ultimo) {
      // el último: cámara lenta para saborearlo
      this.time.timeScale = 0.35; this.tweens.timeScale = 0.35;
      this.time.delayedCall(350, () => { this.time.timeScale = 1; this.tweens.timeScale = 1; });
    } else cartel(this, '¡FUERA!', '', { ms: 600, color: 0x2fd4b4, fondo: false });
  }
}
