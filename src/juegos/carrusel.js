// El carrusel de Mingle, dibujado en vivo: la plataforma con franjas que giran, los caballitos que suben y bajan
// en sus tubos dorados, la columna de espejos y el techo de rayas con luces que corren.
// La plataforma va debajo de todos. La columna y el techo van a la altura del centro: los que están detrás quedan
// tapados y los de adelante pasan por delante, como en la vida real.

import Phaser from 'phaser';
import { caballito } from '../escenas/pintura.js';

const RAYAS = [0xe88ab8, 0x5ab4c4, 0xf4d8b0, 0x9a7ad8];
const RAYAS_OSC = [0xc06a98, 0x3e94a4, 0xd4b890, 0x7a5ab8];

export class Carrusel {
  /** c: centro de la plataforma. rx, ry: el óvalo de arriba. */
  constructor(scene, { x = 320, y = 226, rx = 162, ry = 70 } = {}) {
    this.scene = scene;
    Object.assign(this, { x, y, rx, ry });
    this.k = ry / rx;
    this.ang = 0;
    this.t = 0;
    caballito(scene);
    // la plataforma (debajo de todos)
    this.gBase = scene.add.graphics().setDepth(-70);
    // el techo y la columna (a la altura del centro)
    this.gTecho = scene.add.graphics().setDepth(y);
    // los caballitos con su tubo: cada uno se ordena por su propia altura
    this.anillo = { rx: 92, ry: 92 * this.k };
    this.caballos = [0, 1, 2, 3, 4, 5].map((i) => ({
      fase: (i / 6) * Math.PI * 2,
      tubo: scene.add.graphics(),
      img: scene.add.image(0, 0, 'caballito').setOrigin(0.5, 1),
    }));
    this.dibujar();
  }

  /** punto del óvalo de la plataforma (radio relativo k) en el ángulo a */
  punto(a, kr = 1, dy = 0) { return { x: this.x + Math.cos(a) * this.rx * kr, y: this.y + Math.sin(a) * this.ry * kr + dy }; }

  actualizar(dt, w) {
    this.t += dt;
    this.ang += w * dt;
    this.w = w;
    this.dibujar();
  }

  dibujar() {
    const { x, y, rx, ry } = this;
    const g = this.gBase;
    g.clear();
    // la sombra en el piso
    g.fillStyle(0x000000, 0.28); g.fillEllipse(x + 6, y + 26, rx * 2 + 30, ry * 2 + 26);
    // el costado (la banda de abajo) con su borde dorado
    const lado = 15;
    g.fillStyle(0x3a1e58); g.fillEllipse(x, y + lado, rx * 2, ry * 2);
    g.fillRect(x - rx, y, rx * 2, lado);
    g.fillStyle(0x5a3480); g.fillEllipse(x, y + lado - 3, rx * 2 - 2, ry * 2 - 4);
    g.fillRect(x - rx + 1, y, rx * 2 - 2, lado - 3);
    // las luces del costado: corren con el giro
    const n = 40;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      if (Math.sin(a) < 0.05) continue;
      const p = this.punto(a, 0.995, lado - 7);
      const prendida = ((i + Math.floor(this.ang * 12 + this.t * 3)) % 4) !== 0;
      g.fillStyle(prendida ? 0xfff2c8 : 0x8a5aa8); g.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3);
      if (prendida) { g.fillStyle(0xff8fd0, 0.35); g.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 2, 5, 5); }
    }
    // el borde dorado de arriba
    g.fillStyle(0xb8862a); g.fillEllipse(x, y + 1, rx * 2 + 4, ry * 2 + 4);
    g.fillStyle(0xf2c860); g.fillEllipse(x, y, rx * 2 + 2, ry * 2 + 2);
    // las franjas de colores que giran
    const N = 16, PASOS = 7;
    for (let i = 0; i < N; i++) {
      const a0 = this.ang + (i / N) * Math.PI * 2, a1 = this.ang + ((i + 1) / N) * Math.PI * 2;
      const pts = [{ x, y }];
      for (let s = 0; s <= PASOS; s++) pts.push(this.punto(a0 + ((a1 - a0) * s) / PASOS, 0.985));
      g.fillStyle(RAYAS[i % 4]); g.fillPoints(pts, true);
      // un brillo en cada franja para que se note el giro
      const m = this.punto((a0 + a1) / 2, 0.8);
      g.fillStyle(0xffffff, 0.18); g.fillCircle(Math.round(m.x), Math.round(m.y), 3);
    }
    // el aro de adentro y el piso del centro
    g.lineStyle(2, 0xf2c860, 0.9); g.strokeEllipse(x, y, rx * 1.3, ry * 1.3);
    g.fillStyle(0x3a2050); g.fillEllipse(x, y, 104, 104 * this.k);
    g.lineStyle(2, 0xf2c860); g.strokeEllipse(x, y, 104, 104 * this.k);

    this.dibujarTecho();
    this.dibujarCaballos();
  }

  dibujarTecho() {
    const g = this.gTecho;
    g.clear();
    const cx = this.x, base = 138, R = 114, H = 80, kt = 0.28, banda = 24;
    const cupula = (a, t) => {
      const r = R * Math.sin((t * Math.PI) / 2), h = H * Math.cos((t * Math.PI) / 2);
      return { x: cx + Math.cos(a) * r, y: base - h + Math.sin(a) * r * kt };
    };
    // la columna de espejos: paneles que pasan con el giro
    const c0 = this.y - 4, ya = base + banda - 4, alto = c0 - ya;
    g.fillStyle(0x6a4a90); g.fillRect(cx - 28, ya, 56, alto);
    const P = 7;
    for (let i = 0; i < P; i++) {
      const a = this.ang + (i / P) * Math.PI * 2;
      if (Math.sin(a) < 0) continue;
      const x0 = cx + Math.cos(a) * 28, x1 = cx + Math.cos(a + (Math.PI * 2) / P) * 28;
      const xa = Math.max(cx - 28, Math.min(x0, x1)), xb = Math.min(cx + 28, Math.max(x0, x1));
      if (xb - xa < 2) continue;
      g.fillStyle(i % 2 ? 0xb8e8f8 : 0xe8c8ff); g.fillRect(Math.round(xa) + 1, ya + 4, Math.round(xb - xa) - 2, alto - 10);
      g.fillStyle(0xffffff, 0.5); g.fillRect(Math.round(xa) + 2, ya + 6, 2, alto - 14);
    }
    g.fillStyle(0x000000, 0.25); g.fillRect(cx + 14, ya, 14, alto);
    g.fillStyle(0xf2c860); g.fillRect(cx - 30, ya, 60, 4); g.fillRect(cx - 30, c0 - 8, 60, 4);
    g.fillStyle(0xfff0a0); g.fillRect(cx - 30, ya, 60, 1);
    g.fillStyle(0xb8862a); g.fillEllipse(cx, c0, 76, 76 * 0.43);
    g.fillStyle(0xf2c860); g.fillEllipse(cx, c0 - 2, 72, 72 * 0.43);
    g.fillStyle(0x5a3480); g.fillEllipse(cx, c0 - 3, 60, 60 * 0.43);
    // la cúpula de rayas: primero las de atrás, después las de adelante
    const N = 16, PASOS = 6;
    const gajos = [];
    for (let i = 0; i < N; i++) {
      const a0 = this.ang * 0.5 + (i / N) * Math.PI * 2, a1 = a0 + (Math.PI * 2) / N;
      gajos.push({ i, a0, a1, s: Math.sin((a0 + a1) / 2) });
    }
    gajos.sort((p, q) => p.s - q.s);
    for (const { i, a0, a1 } of gajos) {
      const pts = [];
      for (let s = 0; s <= PASOS; s++) pts.push(cupula(a0, s / PASOS));
      for (let s = PASOS; s >= 0; s--) pts.push(cupula(a1, s / PASOS));
      // volumen: las franjas de los costados más oscuras, las del frente más claras
      const m = (a0 + a1) / 2, luz = Math.sin(m) * 0.6 + Math.cos(m + 0.6) * -0.4;
      g.fillStyle(luz > 0.15 ? RAYAS[i % 4] : RAYAS_OSC[i % 4]); g.fillPoints(pts, true);
      if (luz > 0.55) { g.fillStyle(0xffffff, 0.14); g.fillPoints(pts, true); }
    }
    // el brillo de la cúpula
    g.fillStyle(0xffffff, 0.16); g.fillEllipse(cx - 34, base - H * 0.55, 38, 16);
    g.fillStyle(0xffffff, 0.1); g.fillEllipse(cx - 30, base - H * 0.55, 60, 26);
    // la banda del techo: paneles con estrellas, por delante
    const M = 24;
    for (let i = 0; i < M; i++) {
      const a0 = this.ang * 0.5 + (i / M) * Math.PI * 2, a1 = a0 + (Math.PI * 2) / M;
      if (Math.sin((a0 + a1) / 2) < -0.05) continue;
      const p0 = cupula(a0, 1), p1 = cupula(a1, 1);
      g.fillStyle(i % 2 ? 0xc85a9a : 0x4a9aaa);
      g.fillPoints([p0, p1, { x: p1.x, y: p1.y + banda }, { x: p0.x, y: p0.y + banda }], true);
      const m = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 + banda / 2 };
      if (Math.abs(p1.x - p0.x) > 8) { g.fillStyle(0xf2c860); g.fillTriangle(m.x, m.y - 5, m.x - 4, m.y + 3, m.x + 4, m.y + 3); g.fillTriangle(m.x, m.y + 5, m.x - 4, m.y - 2, m.x + 4, m.y - 2); }
    }
    // los bordes dorados de la banda y los foquitos que corren
    for (let s = 0; s <= 40; s++) {
      const a = (s / 40) * Math.PI;
      const p = cupula(a, 1);
      g.fillStyle(0xf2c860); g.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 2); g.fillRect(Math.round(p.x) - 1, Math.round(p.y) + banda - 1, 3, 2);
      if (s % 2 === 0) {
        const prendida = ((s / 2 + Math.floor(this.t * 6 + this.ang * 10)) % 3) !== 0;
        g.fillStyle(prendida ? 0xfff6d8 : 0x9a6a3a); g.fillRect(Math.round(p.x) - 1, Math.round(p.y) + banda + 2, 2, 2);
      }
    }
    // los flecos de abajo
    for (let s = 0; s < 30; s++) {
      const a = ((s + 0.5) / 30) * Math.PI;
      const p = cupula(a, 1);
      g.fillStyle(s % 2 ? 0xe88ab8 : 0xf4d8b0); g.fillTriangle(p.x - 5, p.y + banda, p.x + 5, p.y + banda, p.x, p.y + banda + 7);
    }
    // la punta dorada con su banderita
    const top = base - H;
    g.fillStyle(0xb8862a); g.fillTriangle(cx - 6, top + 4, cx + 6, top + 4, cx, top - 16);
    g.fillStyle(0xf2c860); g.fillTriangle(cx - 4, top + 3, cx + 3, top + 3, cx, top - 14);
    g.fillStyle(0xf2c860); g.fillCircle(cx, top - 16, 3);
    g.fillStyle(0x8a6a3a); g.fillRect(cx, top - 34, 1, 18);
    const ola = Math.sin(this.t * 6) * 2;
    g.fillStyle(0xff4d8d); g.fillTriangle(cx + 1, top - 34, cx + 1, top - 24, cx + 15, top - 29 + ola);
  }

  dibujarCaballos() {
    const base = 138 + 24, kt = 0.28, R = 114 * (this.anillo.rx / 114);
    for (const c of this.caballos) {
      const a = this.ang + c.fase;
      const s = Math.sin(a);
      const piso = { x: this.x + Math.cos(a) * this.anillo.rx, y: this.y + s * this.anillo.ry };
      const techo = { x: piso.x, y: base + s * R * kt };
      const bote = Math.sin(this.t * 2.6 + c.fase * 2) * 5;
      const hy = piso.y - 14 - bote;
      c.tubo.clear();
      c.tubo.fillStyle(0x8a6a2a); c.tubo.fillRect(Math.round(piso.x) - 1, techo.y, 3, piso.y - techo.y);
      c.tubo.fillStyle(0xf2d880); c.tubo.fillRect(Math.round(piso.x) - 1, techo.y, 1, piso.y - techo.y);
      c.tubo.setDepth(piso.y - 0.5);
      // mira hacia donde va: adelante del centro va a la izquierda, atrás a la derecha
      const haciaIzq = s > 0 ? this.w >= 0 : this.w < 0;
      c.img.setPosition(Math.round(piso.x), Math.round(hy)).setFlipX(haciaIzq).setDepth(piso.y);
    }
  }
}

void Phaser;
