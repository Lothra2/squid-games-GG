// El juego siempre cabe en lo que de verdad se ve. En el iPhone y el iPad, Safari tapa parte de la página con sus
// barras (y en horizontal están el notch y la rayita de inicio). Un contenedor "fixed, inset 0" mide la pantalla
// entera, barras incluidas, y el juego se cortaba arriba y abajo. Aquí se mide el área visible (visualViewport),
// se le restan las zonas seguras y el contenedor del juego se ajusta a eso cada vez que algo cambia.

export function encajar(cont) {
  // las zonas seguras solo se leen por CSS: una sonda invisible con env(safe-area-inset-*) de relleno
  const sonda = document.createElement('div');
  sonda.setAttribute('aria-hidden', 'true');
  Object.assign(sonda.style, {
    position: 'fixed', left: '0', top: '0', width: '0', height: '0', visibility: 'hidden', pointerEvents: 'none',
    paddingTop: 'env(safe-area-inset-top)', paddingRight: 'env(safe-area-inset-right)',
    paddingBottom: 'env(safe-area-inset-bottom)', paddingLeft: 'env(safe-area-inset-left)',
  });
  document.body.appendChild(sonda);

  return () => {
    const vv = window.visualViewport;
    const w = vv ? vv.width : window.innerWidth, h = vv ? vv.height : window.innerHeight;
    const x = vv ? vv.offsetLeft : 0, y = vv ? vv.offsetTop : 0;
    const cs = getComputedStyle(sonda);
    const [t, r, b, l] = ['Top', 'Right', 'Bottom', 'Left'].map((k) => parseFloat(cs['padding' + k]) || 0);
    Object.assign(cont.style, {
      inset: 'auto', left: `${x + l}px`, top: `${y + t}px`,
      width: `${Math.max(1, w - l - r)}px`, height: `${Math.max(1, h - t - b)}px`,
    });
  };
}

/** ajusta ahora y cada vez que la pantalla cambia (barras de Safari, giro, zoom, pantalla completa) */
export function seguirPantalla(game, cont) {
  const medir = encajar(cont);
  const rehacer = () => { medir(); game.scale.refresh(); };
  const tarde = () => { rehacer(); setTimeout(rehacer, 150); setTimeout(rehacer, 500); };
  window.addEventListener('resize', rehacer);
  window.addEventListener('orientationchange', tarde);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', rehacer);
    window.visualViewport.addEventListener('scroll', rehacer);
  }
  ['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.addEventListener(ev, tarde));
  medir();
  return rehacer;
}
