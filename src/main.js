import Phaser from 'phaser';
import { Boot, Carga } from './escenas/Carga.js';
import { Titulo } from './escenas/Titulo.js';
import { Intro, Ddakji, Llegada, Noche, GameOver, Final } from './escenas/Historia.js';
import { LuzRoja } from './juegos/LuzRoja.js';
import { Galleta } from './juegos/Galleta.js';
import { TiraAfloja } from './juegos/TiraAfloja.js';
import { Canicas } from './juegos/Canicas.js';
import { Pentatlon } from './juegos/Pentatlon.js';
import { Mingle } from './juegos/Mingle.js';
import { Puente } from './juegos/Puente.js';
import { Escondite } from './juegos/Escondite.js';
import { Cuerda } from './juegos/Cuerda.js';
import { Cielo } from './juegos/Cielo.js';
import { Calamar } from './juegos/Calamar.js';

const juegos = [LuzRoja, Galleta, TiraAfloja, Canicas, Pentatlon, Mingle, Puente, Escondite, Cuerda, Cielo, Calamar];

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'juego',
  width: 480,
  height: 270,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#0b0a10',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { gamepad: true, activePointers: 3 },
  scene: [Boot, Carga, Titulo, Intro, Ddakji, Llegada, Noche, GameOver, Final, ...juegos],
});

// para las pruebas automáticas
window.__juego = game;
