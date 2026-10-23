import Phaser from 'phaser';
// Boot carga el manifiesto. Carga encola todo el kit y los fondos con una barra, y arma las animaciones.

import { precargarManifiesto, encolarKit, armarAnimaciones } from '../core/kit.js';
import { texturas } from '../core/efectos.js';
import { iniciarAudio } from '../core/sonido.js';
import { cargar } from '../core/estado.js';

export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() { precargarManifiesto(this); }
  create() { cargar(); this.scene.start('Carga'); }
}

export class Carga extends Phaser.Scene {
  constructor() { super('Carga'); }
  preload() {
    const W = this.scale.width, H = this.scale.height;
    const g = this.add.graphics();
    // los tres símbolos mientras carga
    g.lineStyle(3, 0xe0457b);
    g.strokeCircle(W / 2 - 40, H / 2 - 20, 12);
    g.strokeTriangle(W / 2, H / 2 - 33, W / 2 + 13, H / 2 - 8, W / 2 - 13, H / 2 - 8);
    g.strokeRect(W / 2 + 28, H / 2 - 32, 24, 24);
    const barra = this.add.rectangle(W / 2 - 100, H / 2 + 20, 0, 4, 0xe0457b).setOrigin(0, 0.5);
    this.add.rectangle(W / 2, H / 2 + 20, 202, 6).setStrokeStyle(1, 0x555566);
    const txt = this.add.text(W / 2, H / 2 + 36, 'Cargando la isla...', { fontFamily: 'monospace', fontSize: '10px', color: '#b8b8c8' }).setOrigin(0.5);
    this.load.on('progress', (v) => { barra.width = 200 * v; txt.setText(`Cargando la isla... ${Math.round(v * 100)}%`); });
    encolarKit(this);
  }
  create() {
    texturas(this);
    armarAnimaciones(this);
    iniciarAudio(this);
    this.scene.start('Titulo');
  }
}
