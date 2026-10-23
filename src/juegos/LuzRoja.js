import Phaser from 'phaser';
// Juego 1: Luz roja, luz verde. La muñeca canta de espaldas (verde: se corre) y se voltea (roja: quieto).
// Quien se mueve en rojo queda eliminado. Hay que cruzar la raya antes de que se acabe el tiempo.

import { Juego } from '../core/juego.js';
import { Actor } from '../core/actor.js';
import { E, dif, sangre } from '../core/estado.js';
import { cancionMuneca, sfx, tono, musica, pararMusica } from '../core/sonido.js';
import { eliminar, fxSobre, sacudir } from '../core/efectos.js';
import { hablar } from '../core/dialogo.js';

const LARGO = 1700, META = 1530, PISO_Y0 = 150, PISO_Y1 = 262;

export class LuzRoja extends Juego {
  constructor() { super('LuzRoja'); }

  armar() {
    const W = this.scale.width;
    this.cameras.main.setBounds(0, 0, LARGO, 270);
    // la pared del cielo pintado (se mueve un poco más lento: profundidad)
    this.add.tileSprite(0, 0, LARGO, 140, 'pared_cielo').setOrigin(0).setScrollFactor(0.75, 1).setDepth(-20);
    // el piso de tierra
    this.add.image(0, 0, this.texturaPiso()).setOrigin(0, 0).setPosition(0, 136).setDepth(-15);
    // la raya de salida y la de meta
    this.add.rectangle(190, (PISO_Y0 + PISO_Y1) / 2, 3, PISO_Y1 - PISO_Y0 + 14, 0xf4f0e8, 0.7).setDepth(-10);
    this.add.rectangle(META, (PISO_Y0 + PISO_Y1) / 2, 4, PISO_Y1 - PISO_Y0 + 14, 0xe0457b).setDepth(-10);
    // el árbol y la muñeca al final
    this.arbol(1640, 150);
    this.muneca = this.add.image(1600, 205, 'muneca_espalda').setOrigin(0.5, 1).setDepth(205);
    this.add.image(1600, 205, 'sombra').setScale(2.4, 2).setAlpha(0.35).setDepth(200);
    // los guardias con sus rifles
    this.guardias = [];
    [[1570, 170], [1570, 245], [600, 142], [1100, 142], [1660, 205]].forEach(([x, y], i) => {
      const g = new Actor(this, ['guardia_circulo', 'guardia_triangulo', 'guardia_cuadrado'][i % 3], x, y, { dir: x > 1500 ? 'right' : 'down', izquierda: x > 1500 });
      g.anim('idle', x > 1500 ? 'left' : 'down');
      this.guardias.push(g);
    });
    // los jugadores
    const n = dif(26, 34, 42);
    this.gente = this.crearGente(n, (i) => [24 + Math.random() * 150, PISO_Y0 + 6 + Math.random() * (PISO_Y1 - PISO_Y0 - 10), 'right']);
    this.gente.forEach((g) => {
      g.vel = 40 + Math.random() * 45;
      g.torpe = Math.random() < dif(0.25, 0.32, 0.4); // a veces se mueven en rojo
      g.listo = false;
    });
    this.crearJugador(150, 205, 'right');
    this.crearFamilia([[130, 180], [120, 232], [160, 252]]);
    this.familia.forEach((f, i) => { f.vel = 52 + i * 4; f.listo = false; });
    this.cameras.main.startFollow(this.jugador.sprite, true, 0.12, 0.12, -80, 0);
    // la ventanita de la muñeca: se ve siempre, aunque esté lejos
    this.ventana = this.add.rectangle(W - 26, 52, 40, 60, 0x0b0a10, 0.75).setStrokeStyle(2, 0x23b39c).setScrollFactor(0).setDepth(8700);
    this.mini = this.add.image(W - 26, 80, 'muneca_espalda').setOrigin(0.5, 1).setScale(0.42).setScrollFactor(0).setDepth(8701);
    // el estado de la muñeca
    this.luz = 'espera'; // verde, girando, roja
    this.tLuz = 0;
    this.tiempo = dif(110, 90, 70);
    this.gracia = 0;
    this.visto = 0;
    this.velJugador = 76;
  }

  texturaPiso() {
    const key = 'piso_luzroja';
    if (this.textures.exists(key)) return key;
    const tex = this.textures.createCanvas(key, LARGO, 134);
    const c = tex.getContext();
    const cols = ['#d9b98a', '#d2b080', '#c9a676', '#e0c294', '#bf9b6a'];
    for (let y = 0; y < 134; y += 2) for (let x = 0; x < LARGO; x += 2) {
      const n = (Math.sin(x * 0.13 + y * 0.31) + Math.sin(x * 0.047 - y * 0.11) + Math.random() * 1.2);
      c.fillStyle = cols[Math.max(0, Math.min(4, Math.floor(n + 2)))];
      c.fillRect(x, y, 2, 2);
    }
    // piedritas y matas
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * LARGO, y = 8 + Math.random() * 120;
      c.fillStyle = Math.random() < 0.7 ? '#9c7d52' : '#7d9a4a';
      c.fillRect(Math.round(x), Math.round(y), 2, 1);
    }
    // el borde con la pared
    c.fillStyle = '#8f7350'; c.fillRect(0, 0, LARGO, 3);
    tex.refresh();
    return key;
  }

  arbol(x, y) {
    const g = this.add.graphics().setDepth(150);
    g.fillStyle(0x5a3a22); g.fillRect(x - 4, y - 40, 8, 44);
    g.fillStyle(0x3d6b2e); g.fillCircle(x, y - 52, 22); g.fillCircle(x - 16, y - 42, 14); g.fillCircle(x + 16, y - 42, 14);
    g.fillStyle(0x56923f); g.fillCircle(x - 6, y - 58, 12); g.fillCircle(x + 10, y - 50, 9);
  }

  reglas() {
    return [
      ['guardia_cuadrado', 'neutral', 'Juego 1: luz roja, luz verde. Pueden moverse mientras la muñeca canta.'],
      ['guardia_cuadrado', 'neutral', 'Cuando la muñeca se voltea, quédense quietos. Quien se mueva, queda eliminado.'],
      ['guardia_cuadrado', 'neutral', `Tienen ${this.tiempo} segundos para cruzar la raya roja.`],
      ['rick', 'neutral', 'Muévete con las flechas o la palanca. Y cuando se voltee... ni respires.'],
    ];
  }

  empezar() {
    musica('tension');
    sfx(this, 'pitazo_largo', 0.5);
    this.verde();
  }

  verde() {
    this.luz = 'verde';
    // la canción: más rápida y más corta según la dificultad, y a veces engaña
    const rapido = Math.random() < dif(0.15, 0.3, 0.45);
    const dur = rapido ? dif(2.6, 1.9, 1.4) : dif(4.6, 3.8, 3) + Math.random() * dif(2, 1.6, 1.2);
    this.tLuz = dur;
    this.muneca.setTexture('muneca_espalda');
    this.mini.setTexture('muneca_espalda');
    this.ventana.setStrokeStyle(2, 0x23b39c);
    cancionMuneca(dur);
    this.hud.setExtra('LUZ VERDE', 0x23b39c);
  }

  roja() {
    this.luz = 'roja';
    this.tLuz = dif(2.6, 3, 3.4) + Math.random() * 1.2;
    this.gracia = dif(0.42, 0.3, 0.18);
    // el giro de la cabeza: se achica de lado y aparece la cara
    this.tweens.add({ targets: this.muneca, scaleX: 0.1, duration: 90, yoyo: true, onYoyo: () => this.muneca.setTexture('muneca_frente') });
    this.tweens.add({ targets: this.mini, scaleX: 0.04, duration: 90, yoyo: true, onYoyo: () => this.mini.setTexture('muneca_frente') });
    this.ventana.setStrokeStyle(2, 0xff3355);
    tono(140, 0.25, 'metal', 0.12);
    this.hud.setExtra('LUZ ROJA', 0xff3355);
    // los torpes del grupo se mueven tarde
    this.gente.forEach((g) => { if (g.vivo && !g.listo) g.tardanza = g.torpe && Math.random() < 0.5 ? 0.2 + Math.random() * 0.8 : 0; });
  }

  paso(dt) {
    this.tiempo -= dt;
    this.hud.setTiempo(this.tiempo);
    this.tLuz -= dt;
    if (this.luz === 'verde' && this.tLuz <= 0) this.roja();
    else if (this.luz === 'roja' && this.tLuz <= 0) this.verde();
    if (this.luz === 'roja') this.gracia -= dt;

    // el jugador
    const j = this.jugador;
    const vx = this.inp.x * this.velJugador, vy = this.inp.y * this.velJugador * 0.7;
    const moviendo = Math.hypot(this.inp.x, this.inp.y) > 0.15;
    if (!j.listo) {
      j.mover(vx, vy, dt, { limites: new Phaser.Geom.Rectangle(20, PISO_Y0, LARGO - 120, PISO_Y1 - PISO_Y0) });
      if (this.luz === 'roja' && this.gracia <= 0 && moviendo) {
        this.visto += dt;
        if (this.visto > dif(0.12, 0.06, 0.02)) { this.disparar(j, true); return; }
      } else this.visto = 0;
      if (j.x >= META) {
        j.listo = true;
        j.anim('celebrate', 'right');
        tono(1320, 0.15, 'campana', 0.12);
      }
    }

    // la familia: corre en verde, se congela en rojo, siempre llega
    this.familia.forEach((f, i) => {
      if (f.listo) return;
      if (this.luz === 'verde') {
        const tx = Math.min(META + 20 + i * 12, j.x + 30 - i * 26);
        const ty = Phaser.Math.Clamp(j.y + [-24, 22, 40][i], PISO_Y0 + 4, PISO_Y1);
        const dx = tx - f.x, dy = ty - f.y;
        const d = Math.hypot(dx, dy);
        if (d > 6) f.mover((dx / d) * f.vel, (dy / d) * f.vel * 0.6, dt);
        else f.mover(0, 0, dt);
        if (f.x >= META && j.listo) { f.listo = true; f.anim('celebrate', 'right'); }
      } else f.mover(0, 0, dt);
    });

    // la gente
    this.gente.forEach((g) => {
      if (!g.vivo || g.listo) return;
      let mueve = this.luz === 'verde';
      if (this.luz === 'roja' && g.tardanza > 0) { g.tardanza -= dt; mueve = true; if (this.gracia <= 0 && Math.random() < 0.08) { this.disparar(g); return; } }
      if (mueve) g.mover(g.vel, (Math.random() - 0.5) * 20, dt);
      else g.mover(0, 0, dt);
      if (g.x >= META) { g.listo = true; g.anim('idle', 'right'); }
    });

    // el final del juego
    if (j.listo && this.familia.every((f) => f.listo || f.x > META - 60)) {
      this.familia.forEach((f) => { f.listo = true; f.anim('celebrate', 'right'); });
      this.ganar({ lineas: [['steph', 'feliz', '¡Pasamos! ¡Los cuatro! No miren para atrás.']] });
      return;
    }
    if (this.tiempo <= 0) {
      // se acabó el tiempo: los que no cruzaron quedan eliminados
      this.gente.filter((g) => g.vivo && !g.listo).forEach((g, i) => this.time.delayedCall(i * 120, () => this.disparar(g)));
      if (!j.listo) this.perder('SE ACABÓ EL TIEMPO');
      else this.ganar();
    }
  }

  disparar(a, esJugador = false) {
    if (!a.vivo) return;
    if (esJugador) {
      this.hud.setExtra('¡TE MOVISTE!', 0xff3355);
      fxSobre(this, a, 'exclamacion');
      sacudir(this, 150, 0.01);
      this.perder('ELIMINADO', { modo: 'disparo' });
      return;
    }
    this.contarEliminado();
    eliminar(this, a);
  }
}
