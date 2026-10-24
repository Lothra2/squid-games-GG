// Escenarios de la historia pintados con código, pixel por pixel: el metro, la casa, el cielo y el mar (en
// tormenta y al amanecer), la lancha, el muelle de la isla y la tarjeta. Nada de fotos: es el mismo pixel art
// de los personajes, con tramado ordenado para los degradados.

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

function azar(semilla) {
  let s = semilla >>> 0;
  return () => {
    s += 0x6d2b79f5; let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pincel(c, semilla) {
  const rnd = azar(semilla);
  const umbral = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
  return {
    rnd,
    r(x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); },
    p(x, y, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); },
    /** degradado tramado entre varios colores (vertical, u horizontal) */
    deg(x, y, w, h, cols, horizontal = false) {
      const img = c.getImageData(x, y, w, h), d = img.data, rs = cols.map(rgb), n = rs.length - 1;
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
        const t = (horizontal ? xx / Math.max(1, w - 1) : yy / Math.max(1, h - 1)) * n;
        const i = Math.min(n - 1, Math.floor(t));
        const col = rs[t - i > umbral(x + xx, y + yy) ? i + 1 : i];
        const k = (yy * w + xx) * 4;
        d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
      }
      c.putImageData(img, x, y);
    },
    /** un color tramado encima de lo que hay, densidad de 0 a 1 */
    trama(x, y, w, h, col, dens) {
      c.fillStyle = col;
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (umbral(x + xx, y + yy) < dens) c.fillRect(x + xx, y + yy, 1, 1);
    },
    ruido(x, y, w, h, col, n) { c.fillStyle = col; for (let i = 0; i < n; i++) c.fillRect(Math.floor(x + rnd() * w), Math.floor(y + rnd() * h), 1, 1); },
    lin(x0, y0, x1, y1, col) {
      c.fillStyle = col;
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let e = dx + dy;
      for (;;) {
        c.fillRect(x0, y0, 1, 1);
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * e;
        if (e2 >= dy) { e += dy; x0 += sx; }
        if (e2 <= dx) { e += dx; y0 += sy; }
      }
    },
    elip(cx, cy, rx, ry, col) {
      c.fillStyle = col;
      for (let yy = -ry; yy <= ry; yy++) {
        const k = Math.sqrt(Math.max(0, 1 - (yy * yy) / (ry * ry))) * rx;
        c.fillRect(Math.round(cx - k), Math.round(cy + yy), Math.max(1, Math.round(k * 2)), 1);
      }
    },
    /** pinta pixel por pixel directo en la memoria del lienzo (mucho más rápido en el teléfono) */
    pixeles(fn) {
      const w = c.canvas.width, h = c.canvas.height, img = c.getImageData(0, 0, w, h), d = img.data, cache = {};
      const set = (x, y, col) => {
        x = Math.round(x); y = Math.round(y);
        if (x < 0 || y < 0 || x >= w || y >= h) return;
        const r = cache[col] || (cache[col] = rgb(col)), k = (y * w + x) * 4;
        d[k] = r[0]; d[k + 1] = r[1]; d[k + 2] = r[2]; d[k + 3] = 255;
      };
      fn(set);
      c.putImageData(img, 0, 0);
    },
    /** una forma por columnas: de arriba(x) a abajo(x) */
    columnas(x0, x1, arriba, abajo, col) {
      c.fillStyle = col;
      for (let x = x0; x < x1; x++) { const a = Math.round(arriba(x)), b = Math.round(abajo(x)); if (b > a) c.fillRect(x, a, 1, b - a); }
    },
  };
}

/** una textura de lienzo pintada una sola vez */
export function lienzo(scene, key, w, h, pintar, semilla = 7) {
  if (scene.textures.exists(key)) return key;
  const t = scene.textures.createCanvas(key, w, h);
  const c = t.getContext();
  c.imageSmoothingEnabled = false;
  pintar(pincel(c, semilla), c);
  t.refresh();
  return key;
}

/** la luz suave de una lámpara (se usa con mezcla aditiva) y una bocanada de gas */
export function texturasLuz(scene) {
  for (const [key, col] of [['brillo', '255,240,210'], ['bocanada', '255,120,180']]) {
    if (scene.textures.exists(key)) continue;
    const t = scene.textures.createCanvas(key, 64, 64), c = t.getContext();
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, `rgba(${col},1)`); g.addColorStop(0.45, `rgba(${col},0.45)`); g.addColorStop(1, `rgba(${col},0)`);
    c.fillStyle = g; c.fillRect(0, 0, 64, 64); t.refresh();
  }
}

// ------------------------------------------------------------------ el metro

export const LAMPARAS_METRO = [80, 240, 400, 560];

function afiche(P, x, y, w, h, fondo, tinta, tipo) {
  P.r(x - 2, y - 2, w + 4, h + 4, '#3a3630');
  P.r(x, y, w, h, fondo);
  P.trama(x, y + h - 22, w, 22, '#000000', 0.18);
  if (tipo === 'pho') {
    // un plato de sopa humeante
    P.elip(x + w / 2, y + 52, 20, 8, '#f4f0e8'); P.elip(x + w / 2, y + 50, 17, 5, '#c87a3a');
    P.r(x + w / 2 - 8, y + 48, 16, 2, '#f7e8a8'); P.r(x + w / 2 + 6, y + 28, 2, 24, '#8a5a2a'); P.r(x + w / 2 + 10, y + 26, 2, 26, '#8a5a2a');
    for (let i = 0; i < 3; i++) P.lin(x + 18 + i * 9, y + 36, x + 22 + i * 9, y + 18, '#ffffff');
    P.r(x + 6, y + 6, w - 12, 8, tinta);
  } else {
    // una ciudad de noche con una torre altísima
    P.deg(x, y, w, h - 22, ['#20184a', '#6a3a7a', '#e0705a']);
    for (let i = 0; i < 6; i++) { const bx = x + 4 + i * 10, bh = 14 + ((i * 37) % 22); P.r(bx, y + h - 22 - bh, 8, bh, '#140f24'); }
    P.r(x + w / 2 - 3, y + 14, 6, h - 36, '#140f24'); P.r(x + w / 2 - 1, y + 6, 2, 8, '#140f24');
    P.r(x + 6, y + h - 16, w - 12, 4, tinta); P.r(x + 6, y + h - 9, w - 24, 3, tinta);
  }
}

export function metro(scene) {
  return lienzo(scene, 'esc_metro', 640, 360, (P) => {
    // el techo con sus vigas y las lámparas
    P.deg(0, 0, 640, 46, ['#07080d', '#141622', '#1f2230']);
    for (let x = 0; x < 640; x += 96) { P.r(x, 0, 6, 46, '#0b0c13'); P.r(x + 6, 0, 1, 46, '#2a2d3c'); }
    P.r(0, 44, 640, 2, '#0b0c13');
    for (const x of LAMPARAS_METRO) { P.r(x - 36, 34, 72, 8, '#2c303e'); P.r(x - 34, 40, 68, 3, '#f2fbff'); P.r(x - 34, 39, 68, 1, '#b8d8ec'); }
    // la pared de azulejos
    P.r(0, 46, 640, 158, '#cfc8b4');
    for (let y = 46, f = 0; y < 204; y += 10, f++) {
      const off = f % 2 ? 10 : 0;
      for (let x = -off; x < 640; x += 20) {
        const v = P.rnd();
        if (v < 0.1) P.r(x + 1, y + 1, 19, 9, '#d9d3c1'); else if (v < 0.18) P.r(x + 1, y + 1, 19, 9, '#c1baa5');
        P.r(x + 1, y + 1, 18, 1, '#dcd6c6');
        P.r(x, y, 1, 10, '#a39c8a');
      }
      P.r(0, y, 640, 1, '#a39c8a');
    }
    // la franja de la línea 1
    P.r(0, 118, 640, 14, '#178f86'); P.r(0, 118, 640, 1, '#46c2b4'); P.r(0, 131, 640, 1, '#0c5a54'); P.r(0, 134, 640, 3, '#c8303a');
    // la suciedad de abajo
    P.trama(0, 180, 640, 24, '#9a9382', 0.3); P.trama(0, 194, 640, 10, '#76705f', 0.45);
    // el cartel de la estación (el texto se escribe encima)
    P.r(212, 56, 216, 50, '#e8e4d8'); P.r(214, 58, 212, 46, '#13213d'); P.r(214, 58, 212, 2, '#2a3c66'); P.r(214, 102, 212, 2, '#0a1428');
    P.r(232, 106, 4, 12, '#4a4a52'); P.r(404, 106, 4, 12, '#4a4a52');
    afiche(P, 46, 58, 64, 96, '#e0457b', '#f7c948', 'pho');
    afiche(P, 530, 58, 64, 96, '#2a3a6a', '#f4f0e8', 'ciudad');
    // la vía
    P.r(0, 204, 640, 36, '#111117');
    for (let x = 0; x < 640; x += 16) { P.r(x, 227, 10, 9, '#2b2420'); P.r(x, 227, 10, 1, '#3a302a'); }
    P.ruido(0, 214, 640, 26, '#2a2a30', 500);
    for (const y of [223, 232]) { P.r(0, y, 640, 2, '#6e727e'); P.r(0, y, 640, 1, '#b8bcc8'); }
    // el borde del andén: la raya amarilla con puntos para los ciegos
    P.r(0, 240, 640, 3, '#9a9ea8'); P.r(0, 240, 640, 1, '#c8ccd4');
    P.r(0, 243, 640, 8, '#e2bc32');
    for (let x = 2; x < 640; x += 6) { P.r(x, 245, 2, 2, '#b8941e'); P.r(x + 3, 248, 2, 2, '#b8941e'); }
    P.r(0, 251, 640, 2, '#2a2c34');
    // el piso del andén con baldosas en perspectiva
    P.deg(0, 253, 640, 107, ['#6c7080', '#595e6c', '#43475a']);
    for (let y = 253, s = 9; y < 360; s *= 1.28, y += s) P.r(0, Math.round(y), 640, 1, '#363948');
    for (let i = -14; i <= 14; i++) for (let yy = 253; yy < 360; yy++) P.p(320 + i * 50 * (1 + (yy - 253) / 150), yy, '#363948');
    // el reflejo de las lámparas en el piso: óvalos tramados
    for (const x of LAMPARAS_METRO) for (let k = 0; k < 3; k++) { const rx = 40 - k * 12, ry = 9 - k * 3; for (let yy = -ry; yy <= ry; yy++) { const w = Math.sqrt(1 - (yy * yy) / (ry * ry)) * rx; P.trama(Math.round(x - w), 268 + yy, Math.round(w * 2), 1, '#7c8292', 0.25 + k * 0.2); } }
    P.ruido(0, 253, 640, 107, '#4a4e5c', 900);
  }, 11);
}

export function pilarMetro(scene) {
  return lienzo(scene, 'esc_pilar', 36, 300, (P) => {
    P.r(0, 0, 36, 300, '#5e594f');
    P.r(2, 0, 30, 300, '#8a8478');
    P.r(2, 0, 6, 300, '#a8a294'); P.r(28, 0, 4, 300, '#6e685c');
    for (let y = 8; y < 280; y += 14) P.r(2, y, 30, 1, '#6e685c');
    P.r(4, 120, 26, 14, '#178f86'); P.r(4, 120, 26, 1, '#46c2b4');
    P.r(0, 282, 36, 18, '#4a463e'); P.r(0, 282, 36, 2, '#7a7468');
  }, 3);
}

/** el tren: plateado, con las ventanas prendidas y gente adentro */
export function tren(scene) {
  return lienzo(scene, 'esc_tren', 760, 126, (P) => {
    P.columnas(0, 760, (x) => (x < 34 ? 30 - x * 0.7 : 6), () => 112, '#9ea3ae');
    P.columnas(0, 760, (x) => (x < 34 ? 30 - x * 0.7 : 6), (x) => (x < 34 ? 34 - x * 0.7 : 10), '#d6dae2');
    P.r(40, 0, 720, 6, '#7a7f8a'); P.r(40, 0, 720, 1, '#b8bcc6');
    P.r(0, 84, 760, 8, '#178f86'); P.r(0, 84, 760, 1, '#46c2b4'); P.r(0, 92, 760, 3, '#c8303a');
    P.r(2, 40, 26, 30, '#1c2a3a'); P.r(4, 42, 10, 3, '#4a6a8a');
    P.r(4, 98, 8, 5, '#fff6c0');
    for (let x = 60; x < 760; x += 64) {
      const puerta = (x - 60) % 192 === 128;
      if (puerta) {
        P.r(x - 2, 18, 44, 92, '#7e838e'); P.r(x + 19, 18, 2, 92, '#4a4e58');
        P.r(x + 4, 26, 12, 40, '#f3e3a8'); P.r(x + 24, 26, 12, 40, '#f3e3a8');
        continue;
      }
      P.r(x - 2, 24, 44, 40, '#3a3e48');
      P.r(x, 26, 40, 36, '#f3e3a8');
      P.trama(x, 26, 40, 36, '#e8c878', 0.3);
      for (let k = 0; k < 2; k++) if (P.rnd() < 0.7) {
        const hx = x + 6 + k * 18 + Math.floor(P.rnd() * 6);
        P.elip(hx + 4, 46, 4, 5, '#4a3a30'); P.r(hx - 1, 52, 11, 10, P.rnd() < 0.5 ? '#3a4a6a' : '#6a3a4a');
      }
      P.r(x, 26, 40, 2, '#fff8dc');
    }
    P.r(0, 106, 760, 12, '#3a3d46'); P.r(0, 106, 760, 1, '#5a5e68');
    for (let x = 40; x < 760; x += 180) { P.elip(x, 120, 9, 5, '#14141a'); P.elip(x + 26, 120, 9, 5, '#14141a'); }
  }, 5);
}

/** el piso de cerca, para el ddakji */
export function pisoCerca(scene) {
  return lienzo(scene, 'esc_piso_cerca', 640, 360, (P) => {
    P.deg(0, 0, 640, 360, ['#4a4e5c', '#5e6272', '#4a4e5c']);
    for (let y = 0; y < 360; y += 90) P.r(0, y, 640, 3, '#30333e');
    for (let x = 0; x < 640; x += 120) P.r(x, 0, 3, 360, '#30333e');
    P.ruido(0, 0, 640, 360, '#3e4250', 3000);
    P.ruido(0, 0, 640, 360, '#727686', 1500);
    P.r(0, 0, 640, 18, '#e2bc32');
    for (let x = 4; x < 640; x += 14) { P.r(x, 4, 6, 4, '#b8941e'); P.r(x + 7, 10, 6, 4, '#b8941e'); }
    P.r(0, 18, 640, 3, '#2a2c34');
  }, 9);
}

/** la tarjeta: papel de color arena con el círculo, el triángulo y el cuadrado */
export function tarjetas(scene) {
  const papel = (P) => {
    P.r(0, 0, 120, 72, '#6a5a3a');
    P.deg(1, 1, 118, 70, ['#e2cfa4', '#d4bd8c']);
    P.ruido(1, 1, 118, 70, '#c4ab78', 160);
    P.ruido(1, 1, 118, 70, '#ece0c0', 80);
  };
  lienzo(scene, 'esc_tarjeta', 120, 72, (P) => {
    papel(P);
    const t = '#3a2a18';
    for (let a = 0; a < 360; a += 2) { const r = a * Math.PI / 180; P.r(30 + Math.cos(r) * 11 - 1, 36 + Math.sin(r) * 11 - 1, 2, 2, t); }
    for (const [a, b] of [[[60, 24], [49, 46]], [[60, 24], [71, 46]], [[49, 46], [71, 46]]]) { P.lin(a[0], a[1], b[0], b[1], t); P.lin(a[0] + 1, a[1], b[0] + 1, b[1], t); }
    P.r(80, 25, 22, 2, t); P.r(80, 45, 22, 2, t); P.r(80, 25, 2, 22, t); P.r(100, 25, 2, 22, t);
  }, 4);
  lienzo(scene, 'esc_tarjeta_atras', 120, 72, papel, 4);
}

// ------------------------------------------------------------------ la casa (de noche o de día)

export function casa(scene, dia = false) {
  return lienzo(scene, dia ? 'esc_casa_dia' : 'esc_casa_noche', 640, 360, (P) => {
    const pared = dia ? ['#e4d8bc', '#d4c6a6'] : ['#2e3858', '#252d48'];
    P.deg(0, 0, 640, 264, pared);
    // papel tapiz de rombos
    for (let y = 8; y < 250; y += 24) for (let x = (y / 24) % 2 ? 12 : 0; x < 640; x += 24) {
      const c = dia ? '#d0c2a0' : '#36416a';
      P.p(x, y, c); P.p(x - 1, y + 1, c); P.p(x + 1, y + 1, c); P.p(x, y + 2, c);
    }
    // la ventana con la ciudad (Ho Chi Minh City, la torre Landmark 81 al fondo)
    const vx = 56, vy = 54, vw = 210, vh = 150;
    P.r(vx - 6, vy - 6, vw + 12, vh + 12, dia ? '#f4f0e8' : '#c8c0b0');
    if (dia) P.deg(vx, vy, vw, vh, ['#6ab4e8', '#a8d8f4', '#e8f4fa']);
    else P.deg(vx, vy, vw, vh, ['#0a1030', '#1c1a48', '#3a2456']);
    if (!dia) P.ruido(vx, vy, vw, 50, '#c8c8f0', 18);
    const edif = dia ? '#7a9ab8' : '#0e1228', luz = '#f7d070';
    for (let i = 0; i < 12; i++) {
      const bx = vx + i * 18 - 4, bh = 30 + ((i * 53) % 46), by = vy + vh - bh;
      P.r(bx, by, 16, bh, edif);
      if (!dia) for (let wy = by + 4; wy < vy + vh - 4; wy += 6) for (let wx = bx + 2; wx < bx + 14; wx += 4) if (P.rnd() < 0.35) P.r(wx, wy, 2, 2, luz);
    }
    const tx = vx + 150;
    P.columnas(tx - 9, tx + 9, (x) => vy + 18 + Math.abs(x - tx) * 1.6, () => vy + vh, dia ? '#5a7a98' : '#0a0d20');
    P.r(tx - 1, vy + 6, 2, 14, dia ? '#5a7a98' : '#0a0d20');
    if (!dia) { P.p(tx, vy + 6, '#ff4d6d'); for (let wy = vy + 36; wy < vy + vh; wy += 7) P.r(tx - 4, wy, 8, 1, '#5a6ab8'); }
    // el marco y la cruz de la ventana
    P.r(vx + vw / 2 - 2, vy, 4, vh, dia ? '#f4f0e8' : '#c8c0b0'); P.r(vx, vy + vh / 2 - 2, vw, 4, dia ? '#f4f0e8' : '#c8c0b0');
    // las cortinas
    for (const cx of [vx - 22, vx + vw - 2]) {
      P.r(cx, vy - 14, 26, vh + 40, dia ? '#c85a5a' : '#6a2234');
      for (let k = 0; k < 26; k += 6) P.r(cx + k, vy - 14, 2, vh + 40, dia ? '#a84444' : '#521a28');
      P.r(cx + 2, vy - 14, 2, vh + 40, dia ? '#e88080' : '#8a3448');
    }
    P.r(vx - 30, vy - 18, vw + 60, 5, '#3a2a1c');
    // el cuadro de la familia
    P.r(300, 78, 70, 54, '#8a6a3a'); P.r(304, 82, 62, 46, dia ? '#a8d0e8' : '#4a5a7a');
    const caras = ['#f0c8a0', '#f0c8a0', '#f0c8a0', '#f0c8a0'];
    [[314, 104, 9], [328, 102, 10], [344, 108, 7], [356, 110, 6]].forEach(([x, y, h], i) => { P.r(x - 3, y - h, 6, 5, caras[i]); P.r(x - 4, y - h + 5, 8, h + 10, ['#3a5a9a', '#e0457b', '#5aa66a', '#f7c948'][i]); });
    P.r(318, 122, 8, 4, '#c8a070');
    // la lámpara de pie
    P.r(560, 120, 3, 140, '#2a2420'); P.r(548, 256, 28, 5, '#2a2420');
    P.columnas(538, 586, (x) => 92 + Math.abs(x - 562) * 0.25, () => 124, dia ? '#e8d4a0' : '#f4d890');
    P.r(538, 122, 48, 2, '#b89a60');
    // el sofá verde
    P.r(380, 176, 150, 30, '#3e5e50'); P.r(380, 176, 150, 3, '#5a8070');
    P.r(370, 200, 170, 50, '#4a6a5a'); P.r(370, 200, 170, 3, '#6a8a7a');
    P.r(366, 190, 18, 62, '#3e5e50'); P.r(526, 190, 18, 62, '#3e5e50');
    P.r(396, 206, 60, 4, '#5a7a6a'); P.r(462, 206, 60, 4, '#5a7a6a');
    P.r(374, 250, 6, 12, '#2a2018'); P.r(530, 250, 6, 12, '#2a2018');
    P.r(410, 186, 22, 18, '#e0457b'); P.r(492, 186, 22, 18, '#f7c948');
    // el zócalo y el piso de madera
    P.r(0, 258, 640, 6, dia ? '#a88a62' : '#3a2a1e');
    P.deg(0, 264, 640, 96, dia ? ['#a8784a', '#8a5e38'] : ['#5e4230', '#432e20']);
    for (let y = 264, f = 0; y < 360; y += 12, f++) {
      P.r(0, y, 640, 1, dia ? '#6a4a2a' : '#2e1e14');
      for (let x = (f % 3) * 46; x < 640; x += 138) P.r(x, y, 1, 12, dia ? '#6a4a2a' : '#2e1e14');
    }
    P.ruido(0, 264, 640, 96, dia ? '#b88a5a' : '#6a4a36', 700);
    // la alfombra y el plato de Thor
    P.elip(320, 316, 150, 26, dia ? '#a83a48' : '#6a2234');
    P.elip(320, 316, 136, 20, dia ? '#c84a5a' : '#7e2a3e');
    for (let x = 200; x < 440; x += 16) P.r(x, 314, 6, 4, dia ? '#f7c948' : '#a88a3a');
    P.elip(600, 300, 14, 5, '#c8303a'); P.elip(600, 298, 10, 3, '#8a5a2a');
    if (!dia) P.trama(0, 0, 640, 360, '#000010', 0.12);
  }, dia ? 21 : 22);
}

// ------------------------------------------------------------------ el cielo, la isla a lo lejos, las olas y la lancha

export function cielo(scene, dia = false) {
  return lienzo(scene, dia ? 'esc_cielo_dia' : 'esc_cielo_tormenta', 640, 230, (P) => {
    if (dia) {
      P.deg(0, 0, 640, 230, ['#1d1a40', '#4a2a68', '#b04a6a', '#ec8a5a', '#f8c878']);
      P.elip(470, 200, 40, 40, '#ffd890'); P.elip(470, 200, 32, 32, '#ffe8b0'); P.elip(466, 196, 20, 20, '#fff6dc');
      for (let i = 0; i < 9; i++) { const x = P.rnd() * 640, y = 70 + P.rnd() * 110, w = 40 + P.rnd() * 90; P.r(x, y, w, 3, '#e8869a'); P.r(x + 6, y + 3, w - 12, 2, '#c8607a'); }
      return;
    }
    P.deg(0, 0, 640, 230, ['#05070d', '#0e1422', '#1a2334', '#273244']);
    for (let i = 0; i < 26; i++) {
      const x = P.rnd() * 680 - 20, y = 6 + P.rnd() * 130, rx = 40 + P.rnd() * 70, ry = 10 + P.rnd() * 18;
      P.elip(x, y - 2, rx, ry, i % 3 ? '#1e2738' : '#2a3448');
      P.elip(x, y + 2, rx, ry, i % 2 ? '#121a28' : '#161e2e');
    }
    P.trama(0, 150, 640, 80, '#2e3a4e', 0.25);
  }, dia ? 31 : 32);
}

export function islaLejos(scene) {
  return lienzo(scene, 'esc_isla_lejos', 280, 80, (P) => {
    P.columnas(0, 280, (x) => 40 - Math.sin(x / 40) * 14 - Math.sin(x / 13) * 4 - (x > 150 && x < 200 ? 18 : 0) + P.rnd() * 2, () => 80, '#06070c');
    P.r(160, 22, 30, 20, '#0c0e16');
    for (let i = 0; i < 9; i++) P.r(150 + P.rnd() * 60, 30 + P.rnd() * 40, 2, 1, i % 3 ? '#ff4d8d' : '#f7e0a0');
    P.r(174, 12, 2, 10, '#0c0e16'); P.p(174, 11, '#ff4d8d');
  }, 41);
}

/** una tira de olas que se repite cada 128 px */
export function ola(scene, key, { cuerpo, cresta, espuma, oscuro, amp = 6, fase = 0, picos = 1 }) {
  return lienzo(scene, key, 128, 60, (P) => {
    const y = (x) => 16 + Math.sin((x / 128) * Math.PI * 2 * picos + fase) * amp + Math.sin((x / 32) * Math.PI * 2 + fase * 3) * amp * 0.22;
    for (let x = 0; x < 128; x++) {
      const yy = Math.round(y(x));
      P.r(x, yy, 1, 60 - yy, cuerpo);
      P.r(x, yy, 1, 2, cresta);
      const subiendo = y(x + 1) - y(x);
      if (yy < 16 - amp * 0.6 && Math.abs(subiendo) < 0.5) { P.p(x, yy - 1, espuma); if (x % 2) P.p(x, yy + 2, espuma); }
    }
    P.trama(0, 34, 128, 26, oscuro, 0.35);
    for (let i = 0; i < 10; i++) { const x = Math.floor(P.rnd() * 120), yy = 30 + Math.floor(P.rnd() * 26); P.r(x, yy, 4 + Math.floor(P.rnd() * 6), 1, cresta); }
  }, 50 + Math.round(fase * 10));
}

export const OLAS = {
  tormenta: [
    { cuerpo: '#18263a', cresta: '#2c4460', espuma: '#6a8aa8', oscuro: '#101c2c', amp: 5, fase: 0 },
    { cuerpo: '#132034', cresta: '#36547a', espuma: '#9ab4cc', oscuro: '#0c1626', amp: 7, fase: 1.3 },
    { cuerpo: '#0c1626', cresta: '#47698c', espuma: '#d0e0ee', oscuro: '#070e1a', amp: 9, fase: 2.1 },
  ],
  dia: [
    { cuerpo: '#3a5a8e', cresta: '#5a86b8', espuma: '#c8dcf0', oscuro: '#30507e', amp: 4, fase: 0 },
    { cuerpo: '#2a4c7e', cresta: '#5a94c4', espuma: '#e0eefa', oscuro: '#22426e', amp: 5, fase: 1.3 },
    { cuerpo: '#1e3e6a', cresta: '#74aed8', espuma: '#f4f8ff', oscuro: '#18345a', amp: 6, fase: 2.1 },
  ],
};

/** la lancha en dos partes: lo de atrás (borda lejana, parabrisas y motor) y el casco de adelante */
export const LANCHA = { w: 300, h: 120, px: 150, py: 70 };
const arribaCasco = (x) => 58 - (x > 200 ? (x - 200) * 0.12 : 0);
const abajoCasco = (x) => (x < 200 ? 104 : 104 - Math.pow((x - 200) / 96, 1.6) * 57);

export function lancha(scene) {
  lienzo(scene, 'esc_lancha_atras', 300, 120, (P) => {
    P.columnas(12, 292, (x) => arribaCasco(x) - 9, (x) => arribaCasco(x) + 2, '#2a2d36');
    P.columnas(12, 292, (x) => arribaCasco(x) - 9, (x) => arribaCasco(x) - 7, '#4a4e5a');
    // el parabrisas y el timón
    P.r(196, 20, 3, 40, '#16181e'); P.r(234, 26, 3, 34, '#16181e');
    P.columnas(199, 234, (x) => 22 + (x - 199) * 0.15, () => 52, '#3e6488');
    P.trama(199, 22, 35, 30, '#5a86ac', 0.3);
    P.lin(204, 26, 214, 46, '#9ac0dc'); P.lin(205, 26, 215, 46, '#9ac0dc');
    P.r(194, 18, 46, 3, '#16181e');
    P.r(214, 0, 1, 18, '#7a7e88'); P.r(212, 0, 5, 2, '#ff4d8d');
    // el motor de afuera en la popa
    P.r(0, 34, 22, 44, '#24262e'); P.r(0, 34, 22, 8, '#e0457b'); P.r(0, 34, 22, 2, '#ff8fb5'); P.r(6, 78, 8, 26, '#1a1c22');
  }, 61);
  lienzo(scene, 'esc_lancha', 300, 120, (P) => {
    P.columnas(8, 296, arribaCasco, abajoCasco, '#1c1e26');
    P.columnas(8, 296, arribaCasco, (x) => arribaCasco(x) + 5, '#3c404c');
    P.columnas(8, 296, arribaCasco, (x) => arribaCasco(x) + 1, '#62666e');
    P.trama(200, 50, 90, 40, '#2c2e38', 0.3);
    P.columnas(8, 290, (x) => arribaCasco(x) + 13, (x) => Math.min(abajoCasco(x), arribaCasco(x) + 18), '#e0457b');
    P.columnas(8, 290, (x) => arribaCasco(x) + 13, (x) => Math.min(abajoCasco(x), arribaCasco(x) + 14), '#ff8fb5');
    P.columnas(8, 296, (x) => Math.max(arribaCasco(x) + 18, abajoCasco(x) - 16), abajoCasco, '#121318');
    for (let x = 32; x < 280; x += 26) P.columnas(x, x + 1, (xx) => arribaCasco(xx) + 19, (xx) => abajoCasco(xx) - 17, '#262832');
    P.columnas(8, 12, arribaCasco, abajoCasco, '#2a2c34');
    // el círculo, el triángulo y el cuadrado pintados en el casco
    for (let a = 0; a < 360; a += 15) { const r = a * Math.PI / 180; P.p(60 + Math.cos(r) * 4, 86 + Math.sin(r) * 4, '#c8c8d0'); }
    P.lin(76, 82, 72, 90, '#c8c8d0'); P.lin(76, 82, 80, 90, '#c8c8d0'); P.lin(72, 90, 80, 90, '#c8c8d0');
    P.r(86, 82, 8, 1, '#c8c8d0'); P.r(86, 89, 8, 1, '#c8c8d0'); P.r(86, 82, 1, 8, '#c8c8d0'); P.r(93, 82, 1, 8, '#c8c8d0');
  }, 62);
}

// ------------------------------------------------------------------ el muelle de la isla

export const FAROLES_MUELLE = [110, 330, 550];

export function muelle(scene) {
  return lienzo(scene, 'esc_muelle', 640, 360, (P) => {
    P.deg(0, 0, 640, 190, ['#06080e', '#111724', '#1e2636']);
    for (let i = 0; i < 14; i++) { const x = P.rnd() * 640, y = 10 + P.rnd() * 70; P.elip(x, y, 50 + P.rnd() * 50, 10 + P.rnd() * 10, i % 2 ? '#141a28' : '#1a2232'); }
    // el acantilado con el búnker y la puerta redonda
    P.columnas(250, 640, (x) => 70 + Math.sin(x / 30) * 10 + Math.sin(x / 9) * 3 + (x < 300 ? (300 - x) * 1.6 : 0), () => 200, '#0c0f16');
    P.columnas(250, 640, (x) => 70 + Math.sin(x / 30) * 10 + Math.sin(x / 9) * 3 + (x < 300 ? (300 - x) * 1.6 : 0), (x) => 74 + Math.sin(x / 30) * 10 + Math.sin(x / 9) * 3 + (x < 300 ? (300 - x) * 1.6 : 0), '#1c222e');
    P.ruido(260, 90, 380, 110, '#151a24', 400);
    P.r(420, 104, 190, 92, '#1a1e28'); P.r(420, 104, 190, 3, '#2c3240');
    for (let x = 430; x < 600; x += 14) if (P.rnd() < 0.5) P.r(x, 112, 6, 4, '#f7c948');
    P.elip(515, 166, 31, 31, '#ff4d8d'); P.elip(515, 166, 29, 29, '#c8306a'); P.elip(515, 166, 26, 26, '#06070a');
    P.r(484, 168, 62, 30, '#06070a');
    // los símbolos de neón encima de la puerta
    const n = '#ff6fa8';
    for (let a = 0; a < 360; a += 10) { const r = a * Math.PI / 180; P.p(478 + Math.cos(r) * 6, 124 + Math.sin(r) * 6, n); }
    P.lin(515, 117, 508, 130, n); P.lin(515, 117, 522, 130, n); P.lin(508, 130, 522, 130, n);
    P.r(546, 118, 13, 1, n); P.r(546, 130, 13, 1, n); P.r(546, 118, 1, 13, n); P.r(558, 118, 1, 13, n);
    // el mar entre el muelle y la isla
    P.deg(0, 190, 640, 50, ['#1a2a40', '#0e1828']);
    for (let i = 0; i < 70; i++) P.r(P.rnd() * 640, 192 + P.rnd() * 46, 4 + P.rnd() * 10, 1, '#2e4a66');
    // las tablas del muelle, a lo largo, con sus uniones y clavos
    P.r(0, 236, 640, 6, '#7a5c40'); P.r(0, 236, 640, 1, '#a07a56');
    const tonos = ['#4a3626', '#3e2d20', '#55402c', '#46331f'];
    for (let y = 242, f = 0; y < 342; f++) {
      const alto = 9 + Math.floor(f * 0.6);
      for (let x = -Math.floor(P.rnd() * 120); x < 640;) {
        const largo = 90 + Math.floor(P.rnd() * 110);
        P.r(x, y, largo, alto, tonos[Math.floor(P.rnd() * 4)]);
        P.r(x, y, largo, 1, '#6a5038');
        P.r(x + largo - 1, y, 1, alto, '#1a120c');
        P.p(x + 3, y + 3, '#8a8a90'); P.p(x + largo - 5, y + 3, '#8a8a90');
        x += largo;
      }
      P.r(0, y + alto - 1, 640, 1, '#1a120c');
      y += alto;
    }
    P.ruido(0, 242, 640, 100, '#5e4632', 700);
    P.ruido(0, 242, 640, 100, '#2e2016', 500);
    P.r(0, 342, 640, 18, '#24180f'); P.r(0, 342, 640, 2, '#5a4430');
    for (let x = 40; x < 640; x += 120) { P.r(x, 336, 14, 24, '#3a2a1c'); P.r(x, 336, 14, 2, '#6a5038'); }
    // los faroles
    for (const x of FAROLES_MUELLE) {
      P.r(x - 2, 150, 4, 90, '#2a2a30'); P.r(x - 1, 150, 1, 90, '#4a4a52');
      P.r(x - 7, 136, 14, 16, '#34343c'); P.r(x - 5, 139, 10, 10, '#ffd7e6'); P.r(x - 8, 134, 16, 3, '#1e1e24');
    }
    for (let i = 0; i < FAROLES_MUELLE.length - 1; i++) {
      const a = FAROLES_MUELLE[i] + 2, b = FAROLES_MUELLE[i + 1] - 2;
      for (let x = a; x < b; x++) { const t = (x - a) / (b - a); P.p(x, 172 + Math.sin(t * Math.PI) * 14, '#8a7a5a'); }
    }
  }, 71);
}

/** el chanchito de oro de las noches: alcancía de vidrio con aro dorado y billetes adentro */
export function chanchitoGrande(scene) {
  return lienzo(scene, 'chanchito_grande', 56, 46, (P) => {
    const borde = '#5a3a08', oro = '#e8b020', claro = '#ffe27a', osc = '#a8740c';
    // las patas y la cola
    for (const x of [12, 20, 34, 42]) { P.r(x - 1, 36, 7, 9, borde); P.r(x, 36, 5, 8, osc); P.r(x, 36, 2, 7, oro); }
    P.r(2, 18, 4, 2, borde); P.r(1, 15, 2, 4, borde);
    // el cuerpo: aro de oro con vidrio y plata adentro
    P.elip(28, 24, 24, 16, borde);
    P.elip(28, 24, 23, 15, oro);
    P.elip(28, 24, 18, 11, '#2a3a4a');
    P.elip(28, 29, 17, 6, '#8a6a20'); P.elip(28, 30, 15, 5, '#c89a2a'); P.elip(28, 31, 11, 3, '#f2cc5a');
    for (let i = 0; i < 22; i++) {
      const x = 14 + P.rnd() * 28, y = 22 + P.rnd() * 11;
      if (((x - 28) / 17) ** 2 + ((y - 24) / 10) ** 2 < 0.8) P.r(x, y, 3, 2, P.rnd() < 0.5 ? '#9ed08a' : '#f7e08a');
    }
    P.r(16, 14, 10, 2, '#cfe6f4'); P.r(14, 16, 3, 3, '#cfe6f4');
    // la cabeza y el hocico
    P.elip(48, 20, 7, 8, borde); P.elip(48, 20, 6, 7, oro); P.elip(46, 17, 3, 3, claro);
    P.elip(54, 23, 3, 4, borde); P.elip(54, 23, 2, 3, osc); P.p(53, 22, borde); P.p(55, 22, borde);
    P.r(47, 15, 2, 2, '#120e18');
    P.r(42, 6, 5, 7, borde); P.r(43, 7, 3, 5, oro);
    // la ranura de arriba
    P.r(22, 8, 12, 3, borde); P.r(23, 9, 10, 1, '#120e18');
    P.r(10, 12, 4, 1, claro); P.r(8, 14, 2, 4, claro);
  }, 81);
}

/** un caballito de carrusel: blanco, crin rosada, montura dorada (mira a la derecha), del alto de una persona */
export function caballito(scene) {
  return lienzo(scene, 'caballito', 44, 40, (P) => {
    const borde = '#2e1a38', blanco = '#f6f0f8', medio = '#ddd0e8', sombra = '#b8a4c8', rosa = '#ff6fa8', rosaO = '#c8407a', oro = '#f2c230';
    const pata = (x0, y0, x1, y1) => { P.lin(x0 - 1, y0, x1 - 1, y1, borde); P.lin(x0 + 2, y0, x1 + 2, y1, borde); P.lin(x0, y0, x1, y1, medio); P.lin(x0 + 1, y0, x1 + 1, y1, medio); P.r(x1 - 1, y1, 4, 2, borde); };
    // las patas al galope (las de atrás más oscuras)
    pata(12, 24, 6, 33); pata(17, 25, 15, 36); pata(28, 25, 33, 34); pata(32, 23, 39, 29);
    // el cuerpo con su sombra
    P.elip(22, 19, 13, 8, borde); P.elip(22, 19, 12, 7, blanco); P.elip(22, 22, 11, 4, medio); P.r(12, 24, 20, 1, sombra);
    // el cuello y la cabeza
    P.columnas(29, 37, (x) => 16 - (x - 29) * 1.4, (x) => 22 - (x - 29) * 0.6, borde);
    P.columnas(30, 36, (x) => 16 - (x - 29) * 1.4, (x) => 21 - (x - 29) * 0.6, blanco);
    P.elip(37, 7, 5, 4, borde); P.elip(37, 7, 4, 3, blanco); P.r(39, 7, 4, 4, borde); P.r(39, 8, 3, 2, medio);
    P.r(35, 2, 2, 3, borde); P.p(38, 6, borde); P.p(42, 9, borde);
    // la crin y la cola
    for (let k = 0; k < 6; k++) P.r(28 + k, 3 + k * 2, 3, 3, k % 2 ? rosa : rosaO);
    P.lin(9, 16, 4, 20, rosaO); P.lin(9, 17, 3, 23, rosa); P.lin(10, 17, 5, 26, rosa); P.lin(8, 18, 4, 25, rosaO);
    // la montura y las riendas
    P.elip(21, 12, 6, 3, '#8a5a10'); P.elip(21, 12, 5, 2, oro); P.r(17, 11, 8, 1, '#fff0a0');
    P.r(20, 14, 3, 8, '#c8306a'); P.r(20, 21, 3, 2, oro);
    P.lin(32, 12, 40, 10, oro);
  }, 91);
}

/** la máquina rosada del dormitorio: vitrina con los premios, ranura de billetes y luces. 32 x 56, del alto de una
 *  máquina de verdad al lado de los personajes (que miden unos 48), para usarla a escala 1, pixel a pixel */
export function maquinaRosada(scene) {
  return lienzo(scene, 'maquina_rosada', 32, 56, (P) => {
    P.r(0, 0, 32, 56, '#2a0e1c');
    P.r(1, 1, 30, 54, '#e0457b'); P.r(1, 1, 30, 1, '#ff8fb5'); P.r(1, 1, 1, 54, '#ff8fb5'); P.r(30, 1, 1, 54, '#a82a5a');
    // el letrero de arriba con ○△□
    P.r(3, 3, 26, 7, '#120e18');
    P.r(6, 5, 3, 3, '#ff8fb5'); P.p(7, 6, '#120e18');
    P.p(15, 4, '#ff8fb5'); P.r(14, 5, 3, 1, '#ff8fb5'); P.r(13, 7, 5, 1, '#ff8fb5'); P.p(14, 6, '#ff8fb5'); P.p(16, 6, '#ff8fb5');
    P.r(22, 5, 3, 3, '#ff8fb5'); P.p(23, 6, '#120e18');
    // la vitrina con tres premios: corazón (vida), reloj de arena, lupa (pista)
    P.r(3, 12, 19, 27, '#3a1a3a'); P.r(4, 13, 17, 25, '#5a2a5a');
    P.r(4, 21, 17, 1, '#c86a9a'); P.r(4, 29, 17, 1, '#c86a9a');
    P.p(7, 15, '#ff4d6d'); P.p(9, 15, '#ff4d6d'); P.r(6, 16, 5, 1, '#ff4d6d'); P.r(7, 17, 3, 1, '#ff4d6d'); P.p(8, 18, '#ff4d6d');
    P.r(6, 23, 5, 1, '#f7c948'); P.r(7, 24, 3, 1, '#e8d8a0'); P.p(8, 25, '#f7c948'); P.r(7, 26, 3, 1, '#f7c948'); P.r(6, 27, 5, 1, '#f7c948');
    P.r(6, 31, 3, 3, '#9ad8f0'); P.p(7, 32, '#3a1a3a'); P.p(9, 34, '#c8c8d0'); P.p(10, 35, '#c8c8d0');
    P.r(14, 15, 5, 3, '#2fd4b4'); P.r(14, 23, 5, 3, '#2fd4b4'); P.r(14, 31, 5, 3, '#2fd4b4');
    P.r(4, 13, 17, 1, '#ffffff'); P.p(5, 14, '#ffffff'); P.p(5, 15, '#ffffff');
    // el panel de la derecha: ranura de billetes y botones
    P.r(24, 12, 5, 27, '#a82a5a'); P.r(25, 14, 3, 1, '#120e18'); P.r(25, 18, 3, 2, '#f7c948'); P.r(25, 22, 3, 2, '#2fd4b4'); P.r(25, 26, 3, 2, '#6aa8ff');
    // la bandeja de abajo y las patas
    P.r(3, 42, 26, 7, '#120e18'); P.r(5, 44, 22, 3, '#2a1a2a'); P.r(5, 44, 22, 1, '#5a3a5a');
    P.r(3, 52, 4, 4, '#120e18'); P.r(25, 52, 4, 4, '#120e18');
  }, 501);
}
