// Juego 1: Luz roja, luz verde. La muñeca canta de espaldas (verde: se corre) y se voltea (roja: quieto).
// Si te mueves en rojo, se llena el ojo de la muñeca: lleno, te eliminan. Hay que cruzar la raya roja a tiempo.

import Phaser from 'phaser';
import { Juego } from '../core/juego.js';
import { Actor } from '../core/actor.js';
import { E, dif } from '../core/estado.js';
import { cancionMuneca, sfx, tono, musica } from '../core/sonido.js';
import { eliminar, fxSobre, sacudir } from '../core/efectos.js';
import { texto, COLOR } from '../core/ui.js';
import { cantoCoreano } from '../core/voz.js';

const LARGO = 2320, META = 2060, SALIDA = 250, PISO_Y0 = 204, PISO_Y1 = 346;

export class LuzRoja extends Juego {
  constructor() { super('LuzRoja'); }

  ambiente() { return { vineta: 0.4, motas: 16, color: 0xfff0d0 }; }

  armar() {
    const W = this.scale.width;
    this.cameras.main.setBounds(0, 0, LARGO, 360);
    // la pared del cielo pintado (un poco más lenta: profundidad) y el piso de tierra
    this.add.tileSprite(0, 0, LARGO, 186, 'pared_cielo').setOrigin(0).setScrollFactor(0.8, 1).setDepth(-20);
    this.add.image(0, 180, this.texturaPiso()).setOrigin(0).setDepth(-15);
    // las rayas de salida y de meta
    this.add.rectangle(SALIDA, (PISO_Y0 + PISO_Y1) / 2, 4, PISO_Y1 - PISO_Y0 + 20, 0xf4f0e8, 0.7).setDepth(-10);
    this.add.rectangle(META, (PISO_Y0 + PISO_Y1) / 2, 6, PISO_Y1 - PISO_Y0 + 20, 0xe0457b).setDepth(-10);
    texto(this, META + 10, PISO_Y0 - 8, 'META', { tam: 13, negrita: true, color: COLOR.rosa }).setDepth(-9);
    // el árbol y la muñeca al final
    this.arbol(2250, 206);
    this.muneca = this.add.image(2170, 282, 'muneca_espalda').setOrigin(0.5, 1).setDepth(282);
    this.add.image(2170, 282, 'sombra').setScale(2.6, 2.2).setAlpha(0.35).setDepth(270);
    // los guardias con sus rifles
    this.guardias = [];
    [[2120, 220], [2120, 330], [800, 196], [1450, 196], [2260, 290]].forEach(([x, y], i) => {
      const g = new Actor(this, ['guardia_circulo', 'guardia_triangulo', 'guardia_cuadrado'][i % 3], x, y, { dir: x > 2000 ? 'left' : 'down' });
      this.guardias.push(g);
    });
    // los jugadores
    const n = dif(28, 36, 44);
    this.gente = this.crearGente(n, () => [26 + Math.random() * (SALIDA - 50), PISO_Y0 + 8 + Math.random() * (PISO_Y1 - PISO_Y0 - 12), 'right']);
    this.gente.forEach((g) => {
      g.vel = 52 + Math.random() * 58;
      g.torpe = Math.random() < dif(0.25, 0.32, 0.4);
      g.listo = false;
    });
    this.crearJugador(200, 276, 'right');
    this.crearFamilia([[176, 240], [164, 306], [212, 330]]);
    this.familia.forEach((f, i) => { f.vel = 70 + i * 5; f.listo = false; });
    this.cameras.main.startFollow(this.jugador.sprite, true, 0.12, 0.12, -120, 0);
    // la ventanita de la muñeca (se ve siempre aunque esté lejos) y el ojo que se llena si te mueves en rojo
    this.ventana = this.add.rectangle(W - 40, 92, 58, 98, 0x0b0a10, 0.8).setStrokeStyle(3, 0x2fd4b4).setScrollFactor(0).setDepth(8700);
    this.mini = this.add.image(W - 40, 136, 'muneca_espalda').setOrigin(0.5, 1).setScale(0.48).setScrollFactor(0).setDepth(8701);
    this.luzTxt = texto(this, W - 40, 150, 'VERDE', { tam: 14, negrita: true, color: COLOR.verde, origen: [0.5, 0.5] }).setScrollFactor(0).setDepth(8701);
    this.ojoFondo = this.add.rectangle(W - 40, 168, 50, 8, 0x2a2632).setScrollFactor(0).setDepth(8701);
    this.ojo = this.add.rectangle(W - 65, 168, 0, 8, 0xff3355).setOrigin(0, 0.5).setScrollFactor(0).setDepth(8702);
    // el barrido de los ojos (luz roja)
    this.barrido = this.add.rectangle(0, 270, 34, 180, 0xff1a3d, 0).setScrollFactor(0).setDepth(7000);
    this.velo = this.add.rectangle(W / 2, 180, W, 360, 0xff1a3d, 0).setScrollFactor(0).setDepth(6999);
    this.luz = 'espera';
    this.tLuz = 0;
    this.tiempo = dif(120, 95, 75);
    this.tiempoTotal = this.tiempo;
    this.gracia = 0;
    this.visto = 0;
    this.velJugador = 104;
  }

  texturaPiso() {
    const key = 'piso_luzroja2';
    if (this.textures.exists(key)) return key;
    const tex = this.textures.createCanvas(key, LARGO, 180);
    const c = tex.getContext();
    const cols = ['#dcbc8c', '#d4b282', '#cba878', '#e3c696', '#c09c6c'];
    for (let y = 0; y < 180; y += 2) for (let x = 0; x < LARGO; x += 2) {
      const n = Math.sin(x * 0.11 + y * 0.29) + Math.sin(x * 0.041 - y * 0.09) + Math.random() * 1.2;
      c.fillStyle = cols[Math.max(0, Math.min(4, Math.floor(n + 2)))];
      c.fillRect(x, y, 2, 2);
    }
    // huellas, piedritas y matas
    for (let i = 0; i < 320; i++) {
      const x = Math.random() * LARGO, y = 10 + Math.random() * 166;
      c.fillStyle = Math.random() < 0.7 ? '#9c7d52' : '#7d9a4a';
      c.fillRect(Math.round(x), Math.round(y), 2 + (Math.random() < 0.3 ? 1 : 0), 1);
    }
    // el borde con la pared y su sombra
    c.fillStyle = '#8f7350'; c.fillRect(0, 0, LARGO, 4);
    c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, 4, LARGO, 10);
    tex.refresh();
    return key;
  }

  arbol(x, y) {
    const g = this.add.graphics().setDepth(200);
    g.fillStyle(0x4a2e1a); g.fillRect(x - 6, y - 54, 12, 60);
    g.fillStyle(0x6a4428); g.fillRect(x - 6, y - 54, 4, 60);
    g.fillStyle(0x2f5a24); g.fillCircle(x, y - 72, 30); g.fillCircle(x - 22, y - 56, 19); g.fillCircle(x + 22, y - 56, 19);
    g.fillStyle(0x4a8a36); g.fillCircle(x - 8, y - 80, 17); g.fillCircle(x + 14, y - 68, 12);
    g.fillStyle(0x6fb04c); g.fillCircle(x - 12, y - 86, 7);
  }

  reglas() {
    return {
      objetivo: ['Corre mientras la muñeca canta de espaldas.', 'Cuando se voltea: ¡quieto! Si te mueves, se llena su ojo rojo.', 'Cruza la raya rosada antes de que se acabe el tiempo.'],
      controles: [['palanca', 'Moverse'], ['pausa', 'Pausa']],
      frase: ['guardia_cuadrado', 'neutral', 'Juego 1. Que nadie se mueva cuando la muñeca los mire.'],
    };
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
    this.ventana.setStrokeStyle(3, 0x2fd4b4);
    this.luzTxt.setText(rapido ? '¡RÁPIDA!' : 'VERDE').setColor(rapido ? COLOR.oro : COLOR.verde);
    this.velo.setFillStyle(0xff1a3d, 0);
    this.tweens.killTweensOf(this.barrido);
    this.barrido.setFillStyle(0xff1a3d, 0);
    if (!cantoCoreano(dur)) cancionMuneca(dur);
    this.hud.setExtra('¡LUZ VERDE!', COLOR.verde);
  }

  roja() {
    this.luz = 'roja';
    this.tLuz = dif(2.6, 3, 3.4) + Math.random() * 1.2;
    this.gracia = dif(0.45, 0.32, 0.2);
    // el giro de la cabeza: se achica de lado y aparece la cara
    this.tweens.add({ targets: this.muneca, scaleX: 0.1, duration: 90, yoyo: true, onYoyo: () => this.muneca.setTexture('muneca_frente') });
    this.tweens.add({ targets: this.mini, scaleX: 0.05, duration: 90, yoyo: true, onYoyo: () => this.mini.setTexture('muneca_frente') });
    this.ventana.setStrokeStyle(3, 0xff3355);
    this.luzTxt.setText('ROJA').setColor(COLOR.rojo);
    tono(140, 0.25, 'metal', 0.12);
    this.hud.setExtra('¡LUZ ROJA! QUIETO', COLOR.rojo);
    this.velo.setFillStyle(0xff1a3d, 0.1);
    this.barrido.setFillStyle(0xff1a3d, 0.22).setX(this.scale.width + 30);
    this.tweens.add({ targets: this.barrido, x: -30, duration: 900, ease: 'Sine.easeInOut', yoyo: true });
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
    const mov = Math.hypot(this.inp.x, this.inp.y);
    const moviendo = mov > 0.15;
    if (!j.listo) {
      j.mover(this.inp.x * this.velJugador, this.inp.y * this.velJugador * 0.7, dt, { limites: new Phaser.Geom.Rectangle(20, PISO_Y0, LARGO - 180, PISO_Y1 - PISO_Y0) });
      if (this.luz === 'roja' && this.gracia <= 0 && moviendo) {
        // el ojo se llena: más rápido mientras más te mueves
        this.visto += dt * (0.6 + mov) * dif(1.4, 2.2, 3.2);
        if (Math.random() < dt * 10) tono(1500, 0.03, 'cuadrada', 0.04);
        if (this.visto >= 1) { this.disparar(j, true); return; }
      } else this.visto = Math.max(0, this.visto - dt * 0.8);
      this.ojo.width = 50 * Math.min(1, this.visto);
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
        const tx = Math.min(META + 28 + i * 16, j.x + 40 - i * 34);
        const ty = Phaser.Math.Clamp(j.y + [-32, 30, 54][i], PISO_Y0 + 4, PISO_Y1);
        const dx = tx - f.x, dy = ty - f.y;
        const d = Math.hypot(dx, dy);
        if (d > 8) f.mover((dx / d) * f.vel, (dy / d) * f.vel * 0.6, dt);
        else f.mover(0, 0, dt);
        if (f.x >= META && j.listo) { f.listo = true; f.anim('celebrate', 'right'); }
      } else f.mover(0, 0, dt);
    });

    // la gente
    this.gente.forEach((g) => {
      if (!g.vivo || g.listo) return;
      let mueve = this.luz === 'verde';
      if (this.luz === 'roja' && g.tardanza > 0) { g.tardanza -= dt; mueve = true; if (this.gracia <= 0 && Math.random() < 0.08) { this.disparar(g); return; } }
      if (mueve) g.mover(g.vel, (Math.random() - 0.5) * 26, dt);
      else g.mover(0, 0, dt);
      if (g.x >= META) { g.listo = true; g.anim('idle', 'right'); }
    });

    if (j.listo && this.familia.every((f) => f.listo || f.x > META - 80)) {
      this.familia.forEach((f) => { f.listo = true; f.anim('celebrate', 'right'); });
      this.sobra = this.tiempo / this.tiempoTotal;
      this.ganar({ lineas: [['steph', 'feliz', '¡Pasamos! ¡Los cuatro! No miren para atrás.']] });
      return;
    }
    if (this.tiempo <= 0) {
      this.gente.filter((g) => g.vivo && !g.listo).forEach((g, i) => this.time.delayedCall(i * 120, () => this.disparar(g)));
      if (!j.listo) this.perder('SE ACABÓ EL TIEMPO');
      else { this.sobra = 0; this.ganar(); }
    }
  }

  estrellas() {
    const base = this.sobra > 0.35 ? 3 : this.sobra > 0.15 ? 2 : 1;
    return base - Math.max(0, this.vidasInicio - E.vidas);
  }

  disparar(a, esJugador = false) {
    if (!a.vivo) return;
    this.fogonazo(a);
    if (esJugador) {
      this.hud.setExtra('¡TE MOVISTE!', COLOR.rojo);
      fxSobre(this, a, 'exclamacion');
      sacudir(this, 150, 0.01);
      this.perder('ELIMINADO', { modo: 'disparo' });
      return;
    }
    this.contarEliminado();
    eliminar(this, a);
    // los de al lado se asustan
    this.gente.forEach((g) => { if (g.vivo && g !== a && Math.hypot(g.x - a.x, g.y - a.y) < 50) g.anim('stagger', null, true); });
  }

  /** el destello del rifle desde el guardia más cercano hacia el eliminado */
  fogonazo(a) {
    const g = this.guardias.reduce((m, x) => (Math.abs(x.x - a.x) < Math.abs(m.x - a.x) ? x : m), this.guardias[0]);
    const linea = this.add.line(0, 0, g.x, g.y - 32, a.x, a.y - 32, 0xfff2a0, 0.8).setOrigin(0).setDepth(7001);
    const flash = this.add.circle(g.x, g.y - 32, 5, 0xfff2a0).setDepth(7002);
    this.tweens.add({ targets: [linea, flash], alpha: 0, duration: 160, onComplete: () => { linea.destroy(); flash.destroy(); } });
  }
}
