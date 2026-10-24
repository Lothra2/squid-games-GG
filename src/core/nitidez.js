// Pixel art puro en cualquier pantalla (iPad, teléfono, computador). El juego se dibuja en su lienzo de 640 x 360 y,
// después de cada cuadro, se copia a un lienzo visible del tamaño real de la pantalla (en pixeles del dispositivo)
// con el suavizado apagado. Así cada pixel del juego queda como un cuadrito nítido aunque el navegador (Safari en
// el iPad, por ejemplo) quiera suavizar el lienzo de WebGL al agrandarlo. El lienzo de Phaser queda debajo,
// invisible, recibiendo los toques.

/** Safari (y todo navegador del iPad o iPhone, que por dentro es Safari) es quien suaviza el lienzo de WebGL.
 *  Los demás respetan el CSS image-rendering: pixelated y no necesitan la copia. ?nitidez=1 la fuerza. */
export function haceFalta() {
  const ua = navigator.userAgent, q = new URLSearchParams(location.search).get('nitidez');
  if (q === '1') return true;
  if (q === '0') return false;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const safari = /^((?!chrome|chromium|crios|fxios|edg|android).)*safari/i.test(ua);
  return ios || safari;
}

export function nitidez(game) {
  if (!haceFalta()) return;
  const fuente = game.canvas;
  const vista = document.createElement('canvas');
  vista.setAttribute('aria-hidden', 'true');
  Object.assign(vista.style, { position: 'fixed', pointerEvents: 'none', zIndex: 2, imageRendering: 'pixelated' });
  // dentro del mismo contenedor que el lienzo de Phaser: al pedir pantalla completa, solo ese contenedor se ve
  (fuente.parentElement || document.body).appendChild(vista);
  const ctx = vista.getContext('2d', { alpha: false });
  let ok = true;

  const ajustar = () => {
    // Phaser mete su lienzo en otro contenedor al pedir pantalla completa: la vista lo sigue
    if (fuente.parentElement && vista.parentElement !== fuente.parentElement) fuente.parentElement.appendChild(vista);
    const r = fuente.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    Object.assign(vista.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (vista.width !== w || vista.height !== h) { vista.width = w; vista.height = h; }
    ctx.imageSmoothingEnabled = false;
  };
  game.scale.on('resize', ajustar);
  window.addEventListener('resize', ajustar);
  window.addEventListener('orientationchange', () => setTimeout(ajustar, 300));
  ['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.addEventListener(ev, () => setTimeout(ajustar, 100)));
  game.scale.on('enterfullscreen', () => setTimeout(ajustar, 100));
  game.scale.on('leavefullscreen', () => setTimeout(ajustar, 100));
  ajustar();
  // el lienzo de Phaser sigue ahí (para los toques), pero no se ve
  fuente.style.opacity = '0';

  game.events.on('postrender', () => {
    if (!ok) return;
    try {
      const r = fuente.getBoundingClientRect();
      if (vista.parentElement !== fuente.parentElement || Math.abs(r.width - parseFloat(vista.style.width)) > 0.5 || Math.abs(r.height - parseFloat(vista.style.height)) > 0.5 || Math.abs(r.left - parseFloat(vista.style.left)) > 0.5 || Math.abs(r.top - parseFloat(vista.style.top)) > 0.5) ajustar();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(fuente, 0, 0, vista.width, vista.height);
    } catch {
      // si el navegador no deja copiar el lienzo, se muestra el de Phaser directo
      ok = false; fuente.style.opacity = '1'; vista.remove();
    }
  });
}
