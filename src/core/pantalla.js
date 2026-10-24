// El juego siempre cabe en lo que de verdad se ve. En el iPhone y el iPad, Safari tapa parte de la página con sus
// barras (y en horizontal están el notch y la rayita de inicio). Un contenedor "fixed, inset 0" mide la pantalla
// entera, barras incluidas, y el juego se cortaba arriba y abajo. Aquí se mide el área visible (visualViewport),
// se le restan las zonas seguras y el contenedor del juego se ajusta a eso cada vez que algo cambia.
//
// Pixel exacto (lo normal): el juego de 640 x 360 se agranda un número entero de veces en pixeles reales de la
// pantalla (x3 en el iPad y el iPhone), así cada pixel del juego es un cuadrito idéntico a los demás. Con "llenar"
// ocupa todo lo que se pueda, pero con un tamaño no entero algunos pixeles salen un poquito más anchos que otros.

import { E } from './estado.js';

const ANCHO = 640, ALTO = 360;

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
    const aw = Math.max(1, w - l - r), ah = Math.max(1, h - t - b), dpr = window.devicePixelRatio || 1;
    let cw = aw, ch = ah;
    const k = Math.floor(Math.min((aw * dpr) / ANCHO, (ah * dpr) / ALTO));
    if (E.pantalla !== 'llena' && k >= 1) { cw = (ANCHO * k) / dpr; ch = (ALTO * k) / dpr; }
    // centrado y alineado a pixeles reales, para que ningún pixel del juego caiga entre dos de la pantalla
    const px = (v) => Math.round(v * dpr) / dpr;
    Object.assign(cont.style, {
      inset: 'auto', left: `${px(x + l + (aw - cw) / 2)}px`, top: `${px(y + t + (ah - ch) / 2)}px`,
      width: `${cw}px`, height: `${ch}px`,
    });
  };
}

/** ajusta ahora y cada vez que la pantalla cambia (barras de Safari, giro, zoom, pantalla completa) */
export function seguirPantalla(game, cont) {
  const medir = encajar(cont);
  // Phaser solo vuelve a medir el contenedor cada medio segundo: se le pide que lo mida ya, y después refresca
  const rehacer = () => { medir(); game.scale.getParentBounds(); game.scale.refresh(); };
  const tarde = () => { rehacer(); setTimeout(rehacer, 150); setTimeout(rehacer, 500); };
  window.addEventListener('resize', rehacer);
  window.addEventListener('orientationchange', tarde);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', rehacer);
    window.visualViewport.addEventListener('scroll', rehacer);
  }
  ['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.addEventListener(ev, tarde));
  medir();
  rehacerPantalla = rehacer;
  return rehacer;
}

/** para cuando se cambia el modo de pantalla en Opciones */
export let rehacerPantalla = () => {};
