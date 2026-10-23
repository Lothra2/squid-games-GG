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
    if (!s.jugando) { inp._kA = true; inp._tA = false; return; }
    if (k === 'LuzRoja') { inp._tx = s.luz === 'verde' && s.tLuz > 0.3 ? 1 : 0; }
    if (k === 'Galleta') { inp._tA = s.tension < 0.55; }
    if (k === 'TiraAfloja') {
      if (s.truco) { alterna = 1 - alterna; inp._tx = alterna; }
      const b = Math.round(s.time.now / (s.compas * 1000));
      if ((s.tBeat < 0.035 || s.tBeat > s.compas - 0.02) && b !== ultimoBeat) { ultimoBeat = b; inp._kA = true; }
    }
    if (k === 'Puente') {
      const c = s.col + 1;
      if (c < s.n && !s.saltando) { inp._ty = s.templado[c] ? 1 : -1; if (s.fila === s.templado[c]) inp._kA = true; }
    }
    if (k === 'Cuerda') {
      const j = s.jugador;
      inp._tx = 1;
      const llega = Math.PI - s.fase;
      if ((llega > 0 && llega < 0.55) || (j.x > HUECO0 - 6 && j.x < HUECO0 - 1)) inp._kA = true;
    }
    if (k === 'Cielo') {
      const j = s.jugador;
      const r = s.masCerca(j, s.rivales);
      if (r) { const d = ir(inp, j, r.x, r.y); if (d < 26) inp._kA = true; }
    }
    if (k === 'Calamar') {
      const j = s.jugador;
      if (!s.cruzo) {
        if (j.x < 300 && j.y > 150) ir(inp, j, 305, 222);
        else ir(inp, j, 286, 146);
      } else {
        ir(inp, j, 240, 75);
        if (cerca(j, s.fm) < 26) inp._kA = true;
      }
    }
    if (k === 'Mingle' && s.fase === 'busca' && !s.adentro) {
      const j = s.jugador;
      const quiero = s.n - 1;
      if (s.grupo.length < quiero) {
        const libres = [...s.familia, ...s.gente].filter((a) => a.vivo && !a.salvo && !s.grupo.includes(a) && !a.grupoNPC);
        const m = libres.sort((a, b) => cerca(a, j) - cerca(b, j))[0];
        if (m) { const d = ir(inp, j, m.x, m.y); if (d < 30) inp._kA = true; }
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
      if (camino.length > 1) { const [cx, cy] = camino[0]; ir(inp, j, (cx + 0.5) * 18, (cy + 0.5) * 18 + 6); }
      else { ir(inp, j, (p.x + 0.5) * 18, (p.y + 0.5) * 18 + 6); inp._kA = true; }
    }
    if (k === 'Pentatlon' && s.__mini) {
      const m = s.__mini;
      if (m.tipo === 'barra' && Math.abs(m.v() - m.ideal) < m.ancho / 4) inp._kA = true;
      if (m.tipo === 'atrapar' && m.p() > 1 - m.zona / 2 && m.p() < 1.02) inp._kA = true;
      if (m.tipo === 'machacar') inp._kA = alterna = !alterna;
    }
    if (k === 'Canicas') { if (Math.random() < 0.25) inp._kA = true; }
  }, 30);
  var HUECO0 = 226;
  return 1;
})()
