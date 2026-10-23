// HUD: las vidas, el reloj del juego, el pozo del chanchito y el número del jugador.

import { E, NUMEROS, wones } from './estado.js';

export class Hud {
  constructor(scene, { reloj = true, pozo = true } = {}) {
    this.scene = scene;
    const W = scene.scale.width, prof = 8800;
    this.objs = [];
    const fija = (o) => { o.setScrollFactor(0).setDepth(prof); this.objs.push(o); return o; };
    fija(scene.add.rectangle(0, 0, W, 17, 0x000000, 0.45).setOrigin(0));
    fija(scene.add.bitmapText(5, 4, 'fuente_ui', NUMEROS[E.perfil]).setTint(0x23b39c));
    this.vidas = [0, 1, 2].map((i) => fija(scene.add.image(32 + i * 13, 8, 'vida_on')));
    this.setVidas(E.vidas);
    if (reloj) {
      this.reloj = fija(scene.add.bitmapText(W / 2, 4, 'fuente_ui', '').setOrigin(0.5, 0));
    }
    if (pozo) {
      fija(scene.add.image(W - 104, 8, 'chanchito'));
      this.pozo = fija(scene.add.bitmapText(W - 94, 4, 'fuente_ui', wones()).setTint(0xf2c230));
    }
    this.extra = fija(scene.add.bitmapText(W / 2, 20, 'fuente_ui', '').setOrigin(0.5, 0));
  }

  setVidas(n) {
    this.vidas.forEach((v, i) => v.setTexture(i < n ? 'vida_on' : 'vida_off'));
  }

  setTiempo(seg) {
    if (!this.reloj) return;
    const s = Math.max(0, Math.ceil(seg));
    this.reloj.setText(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`);
    this.reloj.setTint(s <= 10 ? 0xff4d6d : 0xffffff);
  }

  setPozo() {
    if (this.pozo) this.pozo.setText(wones());
  }

  /** una línea de ayuda debajo del reloj */
  setExtra(t, color = 0xffffff) {
    this.extra.setText(t).setTint(color);
  }

  ocultar(v = false) {
    this.objs.forEach((o) => o.setVisible(v));
  }
}
