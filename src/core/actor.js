import Phaser from 'phaser';
// Un personaje del kit en la escena: sprite, sombra, dirección, profundidad por y, y su número.

import { M, tieneAnim, datosAnim } from './kit.js';

export class Actor {
  constructor(scene, id, x, y, { dir = 'down', izquierda = false, numero = null, escala = 1 } = {}) {
    this.scene = scene;
    this.id = id;
    this.animal = !!M.animales[id];
    const a = M.atletas[id] || M.animales[id];
    const piv = a.pivote || [24, 46];
    const celda = a.celda || 48;
    this.sombra = scene.add.image(x, y, 'sombra').setAlpha(0.32).setScale(escala);
    const tex = this.animal ? `${id}_animal` : `${id}_base`;
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
    this.etiqueta = this.scene.add.bitmapText(this.x, this.y - 46, 'fuente_ui', n).setOrigin(0.5, 1).setTint(color);
    this.sync();
  }

  /** la flechita que salta encima del jugador */
  ponerFlecha() {
    this.flecha = this.scene.add.image(this.x, this.y - 54, 'flecha');
    this.scene.tweens.add({ targets: this, flechaDy: 3, duration: 350, yoyo: true, repeat: -1 });
    this.flechaDy = 0;
  }

  /** pone la animación si cambió. dir: right, left, down, up (o la que tenía) */
  anim(nombre, dir = null, forzar = false) {
    if (dir) {
      if (dir === 'left') { this.dir = 'right'; this.izq = true; }
      else { this.dir = dir; if (dir === 'right') this.izq = false; }
    }
    if (!tieneAnim(this.id, nombre)) nombre = this.animal ? 'idle' : (nombre === 'run' ? 'walk' : 'idle');
    const key = `${this.id}|${nombre}|${this.dir}`;
    this.sprite.setFlipX(this.dir === 'right' && this.izq);
    if (!forzar && this.actual === key && this.sprite.anims.isPlaying) return this;
    if (!forzar && this.actual === key && !datosAnim(this.id, nombre)?.loop) return this;
    this.actual = key;
    this.nombreAnim = nombre;
    this.sprite.play(key);
    return this;
  }

  /** cuánto dura una animación en segundos */
  duracion(nombre) {
    const d = datosAnim(this.id, nombre);
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
    this.anim(correr && v > 60 ? 'run' : 'walk');
    // la velocidad de la animación sigue a la velocidad del cuerpo
    this.sprite.anims.timeScale = Phaser.Math.Clamp(v / (correr ? 110 : 50), 0.5, 1.6);
  }

  sync() {
    if (!this.sprite.active) return this;
    this.sprite.setPosition(Math.round(this.px), Math.round(this.py - this.alto));
    this.sombra.setPosition(Math.round(this.px), Math.round(this.py));
    this.sombra.setScale(this.escala * Math.max(0.4, 1 - this.alto / 60));
    const d = this.py + this.capa;
    this.sprite.setDepth(d);
    this.sombra.setDepth(d - 0.5);
    const cima = this.y - this.alto - 44 * this.escala;
    if (this.etiqueta) this.etiqueta.setPosition(Math.round(this.x), Math.round(cima)).setDepth(d + 0.2);
    if (this.flecha) this.flecha.setPosition(Math.round(this.x), Math.round(cima - 12 + this.flechaDy)).setDepth(6000).setVisible(this.vivo && this.sprite.visible);
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
