// Un personaje del kit en la escena: sprite, sombra, dirección, profundidad por y, su número, la flecha del
// jugador y el polvito al correr.

import Phaser from 'phaser';
import { M, tieneAnim, datosAnim } from './kit.js';

export class Actor {
  constructor(scene, id, x, y, { dir = 'down', izquierda = false, numero = null, escala = 1, ropa = null } = {}) {
    this.scene = scene;
    // la izquierda es la fila de la derecha espejada
    if (dir === 'left') { dir = 'right'; izquierda = true; }
    this.id = id;
    this.animal = !!M.animales[id];
    const a = M.atletas[id] || M.animales[id];
    const piv = a.pivote || [32, 62];
    const celda = a.celda || 64;
    this.sombra = scene.add.image(x, y, 'sombra').setAlpha(0.3).setScale(escala);
    // ropa 'calle': la de siempre (fuera de la isla), si el personaje la tiene
    this.ropa = ropa && a.packs && a.packs[ropa] ? ropa : null;
    const tex = this.animal ? `${id}_animal` : this.ropa ? `${id}_${this.ropa}` : `${id}_base`;
    this.sprite = scene.add.sprite(x, y, tex, `idle_${dir}_0`).setOrigin(piv[0] / celda, piv[1] / celda).setScale(escala);
    this.dir = dir;
    this.izq = izquierda;
    this.actual = null;
    this.vivo = true;
    this.quieto = true;
    this.px = x; this.py = y;
    this.alto = 0; // altura sobre el piso (saltos): el sprite sube, la sombra se queda
    this.escala = escala;
    this.capa = 0;
    this.polvo = true;
    this._paso = 0;
    // se acomoda solo después de cada update de la escena
    this._sync = () => this.sync();
    scene.events.on('postupdate', this._sync);
    scene.events.once('shutdown', () => scene.events.off('postupdate', this._sync));
    this.anim('idle', dir);
    if (numero) this.ponerNumero(numero);
  }

  get x() { return this.px; }
  set x(v) { this.px = v; }
  get y() { return this.py; }
  set y(v) { this.py = v; }

  ponerNumero(n, color = 0xffffff) {
    if (this.etiqueta) this.etiqueta.destroy();
    this.etiqueta = this.scene.add.bitmapText(this.x, this.y - 60, 'fuente_ui', n).setOrigin(0.5, 1).setTint(color);
    this.sync();
  }

  /** la flechita que salta encima del jugador */
  ponerFlecha() {
    this.flecha = this.scene.add.image(this.x, this.y - 72, 'flecha');
    this.flechaDy = 0;
    this.scene.tweens.add({ targets: this, flechaDy: 3, duration: 350, yoyo: true, repeat: -1 });
  }

  /** pone la animación si cambió. dir: right, left, down, up (o la que tenía) */
  anim(nombre, dir = null, forzar = false) {
    if (dir) {
      if (dir === 'left') { this.dir = 'right'; this.izq = true; }
      else { this.dir = dir; if (dir === 'right') this.izq = false; }
    }
    if (this.ropa) nombre = tieneAnim(this.id, 'calle_' + nombre) ? 'calle_' + nombre : 'calle_idle';
    else if (!tieneAnim(this.id, nombre)) nombre = this.animal ? 'idle' : (nombre === 'run' ? 'walk' : 'idle');
    const key = `${this.id}|${nombre}|${this.dir}`;
    this.sprite.setFlipX(this.dir === 'right' && this.izq);
    if (!forzar && this.actual === key && this.sprite.anims.isPlaying) return this;
    if (!forzar && this.actual === key && !datosAnim(this.id, nombre)?.loop) return this;
    this.actual = key;
    this.nombreAnim = nombre.replace(/^calle_/, '');
    this.sprite.anims.timeScale = 1;
    this.sprite.play(key);
    return this;
  }

  /** cuánto dura una animación en segundos */
  duracion(nombre) {
    const d = datosAnim(this.id, this.ropa && tieneAnim(this.id, 'calle_' + nombre) ? 'calle_' + nombre : nombre);
    return d ? d.cuadros / d.fps : 0.5;
  }

  /** espera a que termine una animación sin bucle */
  hacer(nombre, dir = null) {
    this.anim(nombre, dir, true);
    return new Promise((ok) => {
      this.scene.time.delayedCall(this.duracion(nombre) * 1000, ok);
    });
  }

  /** mira hacia un vector (sin moverse) */
  mirar(dx, dy) {
    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return this.dir;
    if (Math.abs(dx) >= Math.abs(dy) * 0.8) { this.dir = 'right'; this.izq = dx < 0; }
    else this.dir = dy > 0 ? 'down' : 'up';
    return this.dir;
  }

  /** se mueve con velocidad (px/s) y pone caminar o correr */
  mover(vx, vy, dt, { correr = true, limites = null } = {}) {
    if (!this.vivo) return;
    const v = Math.hypot(vx, vy);
    if (v < 1) {
      this.quieto = true;
      if (this.nombreAnim === 'run' || this.nombreAnim === 'walk') this.anim('idle');
      return;
    }
    this.quieto = false;
    this.mirar(vx, vy);
    this.x += vx * dt;
    this.y += vy * dt;
    if (limites) {
      this.x = Phaser.Math.Clamp(this.x, limites.x, limites.x + limites.width);
      this.y = Phaser.Math.Clamp(this.y, limites.y, limites.y + limites.height);
    }
    const corre = correr && v > 80;
    this.anim(corre ? 'run' : 'walk');
    // la velocidad de la animación sigue a la del cuerpo (así los pies no patinan)
    this.sprite.anims.timeScale = Phaser.Math.Clamp(v / (corre ? 130 : 60), 0.6, 1.5);
    // polvito cada tantos pasos al correr
    this._paso += v * dt;
    if (corre && this.polvo && this._paso > 34 && this.alto <= 0) {
      this._paso = 0;
      polvo(this.scene, this.x - (this.izq ? -6 : 6) * (this.dir === 'right' ? 1 : 0), this.y, this.dir === 'right' && !this.izq);
    }
  }

  sync() {
    if (!this.sprite.active) return this;
    this.sprite.setPosition(Math.round(this.px), Math.round(this.py - this.alto));
    this.sombra.setPosition(Math.round(this.px), Math.round(this.py));
    this.sombra.setScale(this.escala * Math.max(0.4, 1 - this.alto / 80));
    const d = this.py + this.capa;
    this.sprite.setDepth(d);
    this.sombra.setDepth(d - 0.5);
    const cima = this.py - this.alto - 58 * this.escala;
    if (this.etiqueta) this.etiqueta.setPosition(Math.round(this.px), Math.round(cima)).setDepth(d + 0.2);
    if (this.flecha) this.flecha.setPosition(Math.round(this.px), Math.round(cima - (this.etiqueta ? 12 : 4) + this.flechaDy)).setDepth(6000).setVisible(this.vivo && this.sprite.visible);
    return this;
  }

  setVisible(v) {
    this.sprite.setVisible(v); this.sombra.setVisible(v);
    if (this.etiqueta) this.etiqueta.setVisible(v);
    if (this.flecha) this.flecha.setVisible(v);
    return this;
  }

  destroy() {
    this.scene.events.off('postupdate', this._sync);
    this.sprite.destroy(); this.sombra.destroy();
    if (this.etiqueta) this.etiqueta.destroy();
    if (this.flecha) this.flecha.destroy();
  }
}

/** la nubecita de polvo de un paso (efecto del kit) */
export function polvo(scene, x, y, haciaDerecha = true) {
  if (!scene.textures.exists('fx_polvo_correr_chico')) return;
  const s = scene.add.sprite(x, y, 'fx_polvo_correr_chico').setOrigin(10 / 16, 15 / 16).setDepth(y - 1).setAlpha(0.8).setFlipX(!haciaDerecha);
  s.play('fx_polvo_correr_chico');
  s.once('animationcomplete', () => s.destroy());
}
