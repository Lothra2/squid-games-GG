// HUD: el número y las vidas (izquierda), el reloj (centro), el pozo del chanchito (derecha), una línea de aviso
// debajo y el botón de pausa siempre a la vista (también con el mouse).

import { E, NUMEROS, wones } from './estado.js';
import { texto, COLOR } from './ui.js';

export class Hud {
  constructor(scene, { reloj = true, pozo = true, alPausar = null } = {}) {
    this.scene = scene;
    const W = scene.scale.width, prof = 8800;
    this.objs = [];
    const fija = (o) => { o.setScrollFactor(0).setDepth(prof); this.objs.push(o); return o; };
    fija(scene.add.rectangle(0, 0, W, 28, 0x0b0a10, 0.62).setOrigin(0));
    fija(scene.add.rectangle(0, 28, W, 1, 0xff4d8d, 0.35).setOrigin(0));
    fija(scene.add.image(18, 14, 'ret_' + E.perfil, 'c_neutral').setScale(0.6));
    fija(texto(scene, 34, 14, NUMEROS[E.perfil], { tam: 15, negrita: true, color: COLOR.verde, origen: [0, 0.5] }));
    this.vidas = [0, 1, 2, 3].map((i) => fija(scene.add.image(78 + i * 17, 14, 'vida_on')));
    this.setVidas(E.vidas);
    if (reloj) this.reloj = fija(texto(scene, W / 2, 14, '', { tam: 20, negrita: true, origen: [0.5, 0.5] }));
    if (pozo) {
      fija(scene.add.image(W - 172, 14, 'chanchito'));
      this.pozo = fija(texto(scene, W - 158, 14, wones(), { tam: 14, color: COLOR.oro, origen: [0, 0.5] }));
    }
    // pausa: siempre visible, se toca o se cliquea (o Esc / P)
    this.pausa = fija(scene.add.image(W - 16, 14, 'control_pausa', 0).setScale(0.48).setInteractive({ useHandCursor: true }));
    this.pausa.on('pointerdown', () => { if (alPausar) alPausar(); });
    this.extra = fija(texto(scene, W / 2, 40, '', { tam: 15, negrita: true, origen: [0.5, 0.5] }));
  }

  setVidas(n) {
    this.vidas.forEach((v, i) => { v.setTexture(i < n ? 'vida_on' : 'vida_off'); v.setVisible(i < Math.max(3, n)); });
  }

  setTiempo(seg) {
    if (!this.reloj) return;
    const s = Math.max(0, Math.ceil(seg));
    this.reloj.setText(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
    this.reloj.setColor(s <= 10 ? COLOR.rojo : COLOR.texto);
    if (s <= 10 && s !== this._ultimo) { this._ultimo = s; this.scene.tweens.add({ targets: this.reloj, scale: 1.25, duration: 90, yoyo: true }); }
  }

  sinReloj() { if (this.reloj) this.reloj.setText(''); }

  setPozo(n = E.pozo) {
    if (this.pozo) this.pozo.setText(wones(n));
  }

  /** una línea de aviso debajo del reloj */
  setExtra(t, color = 0xffffff) {
    const c = typeof color === 'number' ? '#' + color.toString(16).padStart(6, '0') : color;
    if (this.extra.text !== t) this.extra.setText(t);
    this.extra.setColor(c);
  }

  ocultar(v = false) {
    this.objs.forEach((o) => o.setVisible(v));
  }
}
