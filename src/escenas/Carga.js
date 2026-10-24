import Phaser from 'phaser';
// Boot carga el manifiesto. Carga encola todo el kit y los fondos con una barra, y arma las animaciones.

import { precargarManifiesto, encolarKit, armarAnimaciones } from '../core/kit.js';
import { texturas } from '../core/efectos.js';
import { iniciarAudio } from '../core/sonido.js';
import { cargar } from '../core/estado.js';

export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() { precargarManifiesto(this); }
  async create() {
    cargar();
    // la fuente de los textos (Pixelify Sans); si no llega en 2,5 s se sigue con la de respaldo
    try { await Promise.race([document.fonts.load('16px "Pixelify Sans"'), new Promise((r) => setTimeout(r, 2500))]); } catch { /* sin fuente web */ }
    this.scene.start('Carga');
  }
}

export class Carga extends Phaser.Scene {
  constructor() { super('Carga'); }
  preload() {
    const W = this.scale.width, H = this.scale.height;
    const g = this.add.graphics();
    // los tres símbolos mientras carga
    g.lineStyle(4, 0xe0457b);
    g.strokeCircle(W / 2 - 54, H / 2 - 26, 16);
    g.strokeTriangle(W / 2, H / 2 - 44, W / 2 + 17, H / 2 - 10, W / 2 - 17, H / 2 - 10);
    g.strokeRect(W / 2 + 38, H / 2 - 42, 32, 32);
    const barra = this.add.rectangle(W / 2 - 130, H / 2 + 26, 0, 5, 0xe0457b).setOrigin(0, 0.5);
    this.add.rectangle(W / 2, H / 2 + 26, 262, 8).setStrokeStyle(1, 0x555566);
    const txt = this.add.text(W / 2, H / 2 + 48, 'Cargando la isla...', { fontFamily: '"Pixelify Sans", monospace', fontSize: '14px', color: '#b8b8c8' }).setOrigin(0.5).setResolution(3);
    this.load.on('progress', (v) => { barra.width = 260 * v; txt.setText(`Cargando la isla... ${Math.round(v * 100)}%`); });
    encolarKit(this);
  }
  create() {
    texturas(this);
    armarAnimaciones(this);
    iniciarAudio(this);
    this.scene.start('Titulo');
  }
}
