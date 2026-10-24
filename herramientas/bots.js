// Bots de prueba: juegan cada juego solos para comprobar que se puede ganar.
// Se inyectan en la página con probar.mjs (paso "js"). Escriben el resultado en window.__res.
(() => {
  const g = window.__juego;
  window.__res = '';
  let ultimoBeat = -1, alterna = 0;
  const cerca = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const ir = (inp, a, x, y) => { const dx = x - a.x, dy = y - a.y, d = Math.hypot(dx, dy) || 1; inp._tx = d > 3 ? dx / d : 0; inp._ty = d > 3 ? dy / d : 0; return d; };
  window.__bot = setInterval(() => {
    const s = g.scene.getScenes(true)[0];
    if (!s || !s.inp) return;
    if (s.ganar && !s.__w) {
      s.__w = 1;
      const ga = s.ganar.bind(s), pe = s.perder.bind(s);
      s.ganar = (...a) => { window.__res = 'GANO'; return ga(...a); };
      s.perder = (...a) => { if (!window.__res) window.__res = 'PERDIO: ' + a[0]; return pe(...a); };
    }
    const inp = s.inp, k = s.scene.key;
    inp._tx = 0; inp._ty = 0;
    if (s.__mini) {
      const m = s.__mini;
      if (m.tipo === 'barra' && Math.abs(m.v() - m.ideal) < m.ancho / 4) inp._kA = true;
      if (m.tipo === 'atrapar' && m.p() > 1 - m.zona * 0.7 && m.p() < 1.0) inp._kA = true;
      if (m.tipo === 'machacar') inp._kA = alterna = !alterna;
      return;
    }
    if (!s.jugando) { inp._kA = true; inp._tA = false; return; }
    if (k === 'LuzRoja') { inp._tx = s.luz === 'verde' && s.tLuz > 0.3 ? 1 : 0; }
    if (k === 'Galleta') {
      // lleva la aguja al pedazo que falta y pica cuando está encima, sin calentar de más
      const p = s.punta;
      if (p) {
        if (s.tension > 0.7 && s.lamidas > 0 && s.lamiendo <= 0) inp._kB = true;
        else {
          const kk = s.pendienteCerca(p.x, p.y);
          if (kk >= 0) {
            const [gx, gy] = s.camino[kk], dx = gx - p.x, dy = gy - p.y, d = Math.hypot(dx, dy) || 1;
            if (d > 1.5) { inp._tx = (dx / d) * Math.min(1, d / 10); inp._ty = (dy / d) * Math.min(1, d / 10); }
            if (d < s.tol * 0.6 && s.tension < 0.55 && Math.random() < 0.3) inp._kA = true;
          }
        }
      }
    }
    if (k === 'TiraAfloja') {
      if (s.truco) { alterna = 1 - alterna; inp._tx = alterna; }
      for (const n of s.notas) if (!n.hecha && Math.abs(n.t - s.viaje) < 0.04) { if (n.tipo === 'a') inp._kA = true; else inp._kB = true; }
    }
    if (k === 'Puente') {
      const c = s.col + 1;
      if (c < s.n && !s.saltando) { inp._ty = s.templado[c] ? 1 : -1; if (s.fila === s.templado[c]) inp._kA = true; }
    }
    if (k === 'Cuerda') {
      const j = s.jugador, w = (Math.PI * 2) / Math.max(0.7, s.periodo - s.vueltas * 0.02), t = s.faltaCuerda(w);
      const enOrilla = j.alto <= 0 && j.x >= 301 - 26 && j.x <= 301;
      inp._tx = enOrilla ? 0 : 1;
      if (t > 0.12 && t < 0.3 && j.alto <= 0) inp._kA = true;
    }
    if (k === 'Cielo') {
      const j = s.jugador;
      // en el forcejeo, machacar A (unas 8 veces por segundo, como una persona)
      if (j.lucha) { if (Math.random() < 0.3) inp._kA = true; return; }
      // si uno se puso rojo apuntándome, me hago a un lado (hacia el centro del pilar)
      const rojo = s.rivales.find((r) => r.vivo && r.carga > 0 && cerca(r, j) < 60);
      if (rojo) { inp._kB = Math.random() < 0.15; return; }
      const viene = s.rivales.find((r) => r.vivo && r.dash > 0 && cerca(r, j) < 34);
      if (viene) { inp._kB = true; return; }
      const r = s.masCerca(j, s.rivales);
      if (r) { const d = ir(inp, j, r.x, r.y); if (d < 28 && !r.lucha) { if (Math.random() < 0.5) inp._kB = true; else inp._kA = true; } }
    }
    if (k === 'Calamar') {
      const j = s.jugador;
      if (!s.cruzo) {
        if (j.y > 205 && j.x < 392) ir(inp, j, 398, 292);
        else ir(inp, j, 381, 195);
      } else {
        ir(inp, j, 320, 100);
        if (cerca(j, s.fm) < 36) inp._kA = true;
      }
    }
    if (k === 'Mingle' && s.fase === 'busca' && !s.adentro) {
      const j = s.jugador;
      const quiero = s.n - 1;
      if (s.grupo.length < quiero) {
        const libres = [...s.familia, ...s.gente].filter((a) => a.vivo && !a.salvo && !s.grupo.includes(a) && !a.grupoNPC);
        const m = libres.sort((a, b) => cerca(a, j) - cerca(b, j))[0];
        if (m) { const d = ir(inp, j, m.x, m.y); if (d < 40) inp._kA = true; }
      } else if (s.grupo.length > quiero) inp._kB = true;
      else {
        const p = s.puertas.filter((q) => !q.ocupada).sort((a, b) => cerca(a, j) - cerca(b, j))[0];
        if (p) ir(inp, j, p.x, p.y);
      }
    }
    if (k === 'Mingle' && s.fase === 'gira') inp._tx = 0;
    if (k === 'Escondite') {
      const j = s.jugador;
      const p = s.puertas.find((q) => q.salida);
      const camino = s.ruta(s.celda(j), [p.x, p.y]);
      if (camino.length > 1) { const [cx, cy] = camino[0]; ir(inp, j, (cx + 0.5) * 24, (cy + 0.5) * 24 + 6); }
      else { ir(inp, j, (p.x + 0.5) * 24, (p.y + 0.5) * 24 + 6); inp._kA = true; }
    }
    if (k === 'Canicas') { if (Math.random() < 0.25) inp._kA = true; }
  }, 30);
  var HUECO0 = 301;
  return 1;
})()
