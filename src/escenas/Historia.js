// Escenas de historia, todas en pixel art con los mismos personajes: el metro y el ddakji con el reclutador, la
// tarjeta, la casa con Thor, la lancha en la tormenta, el muelle de la isla y el gas rosado, el dormitorio y el
// Front Man. También las noches entre juegos (con la votación y la máquina donde se gasta la plata), el game over
// y el final.

import Phaser from 'phaser';
import { E, sangre, NUMEROS, nombre, wones, millones, guardar, TIENDA } from '../core/estado.js';
import { Entrada } from '../core/entrada.js';
import { Actor } from '../core/actor.js';
import { hablar, cartel, esperar, elegir, esperarA } from '../core/dialogo.js';
import { musica, pararMusica, sfx, ambiente, tono, despertar, fanfarria, bloque } from '../core/sonido.js';
import { lluvia, relampago, destello, sacudir, zzz, chorro, texturasDdakji } from '../core/efectos.js';
import { avanzar, reiniciarDesdeJuego1, JUEGOS } from '../core/flujo.js';
import { jugadoresNPC } from '../core/kit.js';
import { texto, icono, atmosfera, COLOR, cadaCuadro } from '../core/ui.js';
import { altavoz } from '../core/voz.js';
import { barra } from '../core/mini.js';
import { logo } from './Titulo.js';
import {
  metro, pilarMetro, tren, pisoCerca, tarjetas, casa, cielo, islaLejos, ola, OLAS, lancha, LANCHA, muelle,
  texturasLuz, LAMPARAS_METRO, FAROLES_MUELLE, chanchitoGrande,
} from './pintura.js';

const P = () => E.perfil;
const ninas = () => !sangre();
const FAM = ['rick', 'steph', 'sophie', 'alana'];

/** escena de historia con ayudas para armar tomas */
class Historia extends Phaser.Scene {
  init(data) { this.datos = data || {}; }
  create() {
    despertar();
    const W = this.scale.width;
    this.inp = new Entrada(this, { palanca: false, botonB: false });
    this.inp.ocultarTactil(false);
    this.capa = [];
    this.limpiezas = [];
    // la misma escena se usa varias veces (las noches): todo vuelve a cero
    this.saltar = false;
    this.yaTermino = false;
    this.puedeSaltar = true;
    texturasLuz(this);
    atmosfera(this, { vineta: 0.5, motas: 0 });
    // B (o tocar el botón) salta la escena entera, para quien ya la vio
    this.ayuda = texto(this, W - 12, 10, this.inp.esTactil ? 'SALTAR  >>' : 'B  ·  SALTAR  >>', { tam: 12, color: COLOR.apagado, origen: [1, 0] }).setDepth(9999).setScrollFactor(0);
    this.ayuda.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.pedirSalto());
    this.cameras.main.fadeIn(500);
    this.correr();
  }
  update() {
    if (this.inp.tomarB()) this.pedirSalto();
  }
  pedirSalto() {
    if (this.saltar || this.puedeSaltar === false) return;
    this.saltar = true;
    this.terminar();
  }
  alLimpiar(fn) { this.limpiezas.push(fn); }
  limpiar() {
    this.limpiezas.forEach((f) => f()); this.limpiezas = [];
    this.capa.forEach((o) => o.destroy()); this.capa = [];
  }
  fondo(key) {
    const W = this.scale.width, H = this.scale.height;
    return this.img(key, W / 2, H / 2).setDepth(-100);
  }
  img(key, x, y) {
    const i = this.add.image(x, y, key);
    this.capa.push(i);
    return i;
  }
  /** una luz suave sobre una lámpara */
  luz(x, y, esc, color = 0xfff0d0, alfa = 0.4, prof = 800) {
    const l = this.img('brillo', x, y).setScale(esc).setTint(color).setAlpha(alfa).setDepth(prof).setBlendMode(Phaser.BlendModes.ADD);
    return l;
  }
  actor(id, x, y, dir = 'right', opts) {
    const a = new Actor(this, id, x, y, { dir, ...opts });
    this.capa.push(a);
    return a;
  }
  async decir(lineas, opts = { arriba: true }) { if (!this.saltar) await hablar(this, this.inp, lineas, opts); }
  async pausa(ms) { if (!this.saltar) await esperar(this, ms); }
  async fundido(ms = 500) {
    if (this.saltar) return;
    this.cameras.main.fadeOut(ms);
    await esperar(this, ms + 20);
    this.limpiar();
    this.cameras.main.fadeIn(ms);
  }
  caminar(a, x, y, ms, anim = 'walk') {
    return new Promise((ok) => {
      a.mirar(x - a.x, y - a.y);
      a.anim(anim);
      this.tweens.add({ targets: a, px: x, py: y, duration: ms, onComplete: () => { a.anim('idle'); ok(); } });
    });
  }
  /** un texto centrado (narración, carteles) */
  rotulo(t, y, { color = COLOR.texto, tam = 15, negrita = false } = {}) {
    const W = this.scale.width;
    const b = texto(this, W / 2, y, t, { tam, color, negrita, ancho: W - 80, alinear: 'center', origen: [0.5, 0.5] }).setDepth(9000);
    this.capa.push(b);
    return b;
  }
  terminar() {
    if (this.yaTermino) return;
    this.yaTermino = true;
    pararMusica();
    avanzar(this);
  }

  // ---------------------------------------------------------------- piezas de escenario

  /** el andén del metro con sus lámparas, los pilares y el cartel de la estación */
  armarMetro() {
    const W = this.scale.width;
    metro(this); pilarMetro(this);
    this.fondo('esc_metro');
    this.capa.push(texto(this, W / 2, 74, 'BEN THANH', { tam: 22, negrita: true, origen: [0.5, 0.5], borde: 0 }).setDepth(-99));
    this.capa.push(texto(this, W / 2, 95, 'METRO  ·  LINEA 1', { tam: 11, color: '#46c2b4', origen: [0.5, 0.5], borde: 0 }).setDepth(-99));
    LAMPARAS_METRO.forEach((x, i) => {
      const l = this.luz(x, 62, 2.6, 0xd8f0ff, 0.32, -90).setScale(3, 1.6);
      // una lámpara titila
      if (i === 2) this.time.addEvent({ delay: 140, loop: true, callback: () => l.setAlpha(Math.random() < 0.15 ? 0.05 : 0.32) });
    });
    for (const x of [124, 516]) this.img('esc_pilar', x, 292).setOrigin(0.5, 1).setDepth(-40);
  }

  /**
   * El mar con la lancha. gente: [[id, x en la lancha, dir, opciones]]. La lancha se mece, las olas corren en
   * capas y la gente se mece con ella. Devuelve el estado y golpe() para cuando revienta una ola.
   */
  armarMar({ dia = false, gente = [] } = {}) {
    const W = this.scale.width;
    const pal = dia ? OLAS.dia : OLAS.tormenta, suf = dia ? 'd' : 't';
    cielo(this, dia); islaLejos(this); lancha(this);
    pal.forEach((o, i) => ola(this, `esc_ola_${suf}${i}`, o));
    const cieloImg = this.add.tileSprite(0, 0, W, 230, dia ? 'esc_cielo_dia' : 'esc_cielo_tormenta').setOrigin(0).setDepth(-100);
    const isla = this.add.image(560, 208, 'esc_isla_lejos').setOrigin(0.5, 1).setScale(0.45).setDepth(-93).setVisible(!dia);
    const fondoMar = this.add.rectangle(0, 204, W, 156, pal[0].cuerpo).setOrigin(0).setDepth(-92);
    // las dos capas de adelante van al doble, como la lancha: el mar se ve cerca y grande
    const capas = [[0, 188, 14, -90, 1.5, 1], [1, 208, 26, -85, 2.5, 1], [1, 232, 42, -80, 3.5, 1], [2, 258, 70, 950, 5, 2], [2, 300, 100, 960, 6, 2]]
      .map(([i, y, vel, prof, amp, esc], k) => ({ ts: this.add.tileSprite(0, y, W, 60 * esc, `esc_ola_${suf}${i}`).setOrigin(0).setTileScale(esc).setDepth(prof), y, vel: vel * (dia ? 0.5 : 1), amp: amp * (dia ? 0.5 : 1), k, esc }));
    const L = LANCHA, PX = 312, PY = 248, ESC = 2;
    const atras = this.add.image(PX, PY, 'esc_lancha_atras').setOrigin(L.px / L.w, L.py / L.h).setScale(ESC).setDepth(400);
    const frente = this.add.image(PX, PY, 'esc_lancha').setOrigin(L.px / L.w, L.py / L.h).setScale(ESC).setDepth(900);
    this.capa.push(cieloImg, isla, fondoMar, atras, frente, ...capas.map((c) => c.ts));
    const ocupantes = gente.map(([id, lx, dir, opts]) => {
      const a = this.actor(id, PX, PY, dir || 'right', { ...opts, escala: ESC });
      a.capa = 400; a.sombra.setVisible(false); a.lx = lx;
      return a;
    });
    const estado = { t: 0, sac: 0, vel: 1, isla, PX, PY, ang: 0, off: 0 };
    const enMundo = (lx, ly) => {
      const r = (estado.ang * Math.PI) / 180, dx = (lx - L.px) * ESC, dy = (ly - L.py) * ESC;
      return { x: PX + dx * Math.cos(r) - dy * Math.sin(r), y: PY + estado.off + dx * Math.sin(r) + dy * Math.cos(r) };
    };
    const f = (_, dt) => {
      const s = dt / 1000; estado.t += s;
      const t = estado.t;
      if (!dia) cieloImg.tilePositionX += s * 6;
      for (const c of capas) { c.ts.tilePositionX += (s * c.vel * estado.vel) / c.esc; c.ts.y = c.y + Math.sin(t * 1.3 + c.k * 0.9) * c.amp; }
      estado.off = Math.sin(t * 1.7) * (dia ? 3 : 7) + estado.sac;
      estado.ang = Math.sin(t * 1.15) * (dia ? 1.2 : 2.8) + estado.sac * 0.3;
      atras.setPosition(PX, PY + estado.off).setAngle(estado.ang);
      frente.setPosition(PX, PY + estado.off).setAngle(estado.ang);
      for (const a of ocupantes) {
        const p = enMundo(a.lx, 74);
        a.px = p.x; a.py = p.y; a.sprite.setAngle(estado.ang);
      }
    };
    cadaCuadro(this, f);
    this.alLimpiar(() => this.events.off('update', f));
    const golpe = () => {
      this.tweens.add({ targets: estado, sac: -14, duration: 160, yoyo: true, ease: 'Quad.easeOut' });
      const p = enMundo(286, 48);
      chorro(this, p.x, p.y, 50, [0xd0e0ee, 0x9ab4cc, 0xffffff], 190, { g: 320, vida: 1000, prof: 980, tam: 2 });
      sacudir(this, 260, 0.01);
      sfx(this, 'chapuzon', 0.6);
      ocupantes.forEach((a) => { if (!a.id.startsWith('guardia')) { a.anim('hit', null, true); this.time.delayedCall(500, () => a.sprite.active && a.anim('idle')); } });
    };
    return { estado, ocupantes, golpe };
  }

  /** un rayo de verdad en el cielo, además del destello */
  rayo() {
    relampago(this);
    const g = this.add.graphics().setDepth(-89);
    let x = 80 + Math.random() * 480, y = 0;
    const pts = [[x, y]];
    while (y < 170) { y += 12 + Math.random() * 18; x += Math.random() * 30 - 15; pts.push([x, y]); }
    g.lineStyle(3, 0xb8a8ff, 0.6);
    for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    g.lineStyle(1, 0xffffff, 1);
    for (let i = 1; i < pts.length; i++) g.lineBetween(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
    this.time.delayedCall(90, () => g.setAlpha(0));
    this.time.delayedCall(150, () => g.setAlpha(1));
    this.time.delayedCall(260, () => g.destroy());
  }
}

// ---------------------------------------------------------------- la intro: el metro

const SALUDO = {
  rick: ['rick', 'neutral', '¿Ddakji? ¿Eso con qué se come, pana?'],
  steph: ['steph', 'neutral', 'Perdón, señor... yo estoy esperando el metro.'],
  sophie: ['sophie', 'feliz', '¡Yo sé jugar todo! Bueno... casi todo. ¿Qué es eso?'],
  alana: ['alana', 'feliz', '¿Un juego? ¡Yo quiero jugar! ¡Yo, yo, yo!'],
};
const ACEPTA = {
  rick: ['rick', 'burla', '¿Una cachetada? Dale pues. Venezolano no se achanta.'],
  steph: ['steph', 'enojo', 'Ni se le ocurra tocarme. Pero acepto. Voy a voltear ese sobre.'],
  sophie: ['sophie', 'feliz', '¡Cosquillas no! Bueno, dale. ¡Te voy a ganar!'],
  alana: ['alana', 'burla', 'Yo no tengo cosquillas. Jajaja. ¡Sí tengo! ¡Juguemos!'],
};

export class Intro extends Historia {
  constructor() { super('Intro'); }
  async correr() {
    tren(this);
    ambiente(this, 'viento', 0.15);
    this.armarMetro();
    const t = this.rotulo('Ho Chi Minh City. Las 11:40 de la noche.', 180, { color: '#d8d0c0', tam: 16 });
    t.setDepth(-30);
    const yo = this.actor(P(), 250, 304, 'right', { ropa: 'calle' });
    // el último tren se va sin esperar a nadie
    const tr = this.img('esc_tren', -40, 241).setOrigin(0, 1).setDepth(-60);
    await this.pausa(900);
    tono(330, 0.25, 'cuerdas', 0.06);
    this.tweens.add({ targets: tr, x: -900, duration: 2600, ease: 'Quad.easeIn' });
    this.tweens.add({ targets: t, alpha: 0, delay: 1800, duration: 600 });
    await this.pausa(1600);
    yo.anim('sad', 'right');
    await this.pausa(900);
    musica('flauta');
    const rec = this.actor('reclutador', 690, 304, 'left');
    await this.caminar(rec, 392, 304, 2200);
    rec.anim('idle', 'left');
    yo.anim('idle', 'right');
    // los dos sobres del reclutador
    texturasDdakji(this);
    const a = this.img('ddakji_azul', 378, 284).setScale(0.2).setDepth(400).setAngle(-10);
    const r = this.img('ddakji_rojo', 382, 286).setScale(0.2).setDepth(401).setAngle(8);
    await this.decir([
      ['reclutador', 'feliz', 'Buenas noches. Se le fue el último tren, ¿verdad? ¿Tiene un minutito? ¿Sabe jugar ddakji?'],
      SALUDO[P()],
      ['reclutador', 'feliz', 'Es muy sencillo. Tengo dos sobres de papel: uno azul y uno rojo.'],
      ['reclutador', 'neutral', 'Yo pongo el rojo en el piso. Usted tira el azul encima. Si lo voltea, gana 100.000 wones.'],
      ninas()
        ? ['reclutador', 'burla', 'Y si pierde... le hago cosquillas. Muchas cosquillas.']
        : ['reclutador', 'burla', 'Y si pierde... me paga con una cachetada.'],
      ACEPTA[P()],
    ]);
    if (!this.saltar) {
      this.tweens.add({ targets: [a, r], alpha: 0, duration: 300 });
      await this.pausa(300);
    }
    this.terminar();
  }
}

// ---------------------------------------------------------------- el ddakji (minijuego de la intro)

export class Ddakji extends Historia {
  constructor() { super('Ddakji'); }
  async correr() {
    this.puedeSaltar = false;
    this.ayuda.setVisible(false);
    texturasDdakji(this);
    pisoCerca(this);
    this.miraTextura();
    musica('tension');
    this.armarMetro();
    const yo = this.actor(P(), 250, 304, 'right', { ropa: 'calle' });
    const rec = this.actor('reclutador', 392, 304, 'left');
    this.yo = yo; this.rec = rec;
    this.rojoChico = this.img('ddakji_rojo', 322, 306).setScale(0.36, 0.22).setDepth(300);
    this.ancho = [0.22, 0.15, 0.1][E.dificultad];
    this.intentos = 0;
    await this.decir([[null, null, 'Primero apunta: la mira gira sobre el sobre rojo y lo mejor es pegarle en la orilla. Después mide la fuerza. Las dos con A en el momento justo.']]);
    this.inp.ocultarTactil(true);
    for (;;) {
      this.intentos++;
      const ok = await this.tiro();
      if (ok) break;
      await this.castigo();
    }
    this.inp.ocultarTactil(false);
    pararMusica();
    fanfarria();
    yo.anim('celebrate');
    const plata = texto(this, yo.x, yo.y - 70, '+100.000 W', { tam: 16, negrita: true, color: COLOR.verde, origen: [0.5, 0.5] }).setDepth(7000);
    this.capa.push(plata);
    this.tweens.add({ targets: plata, y: plata.y - 24, alpha: 0, duration: 1600, delay: 400 });
    sfx(this, 'moneda', 0.7);
    await this.decir([
      ['reclutador', 'feliz', '¡Excelente! Aquí tiene sus 100.000 wones.'],
      ['reclutador', 'neutral', 'Usted tiene talento. Y su familia también, me imagino.'],
      ['reclutador', 'feliz', 'Tome. Una tarjeta. Por si quiere jugar algo más grande.'],
    ]);
    this.terminar();
  }

  miraTextura() {
    if (this.textures.exists('mira')) return;
    const g = this.make.graphics({ add: false });
    g.lineStyle(2, 0x120e18); g.strokeCircle(14, 14, 11);
    g.lineStyle(2, 0xffe066); g.strokeCircle(14, 14, 10);
    g.fillStyle(0xffe066); g.fillRect(13, 0, 2, 8); g.fillRect(13, 20, 2, 8); g.fillRect(0, 13, 8, 2); g.fillRect(20, 13, 8, 2);
    g.fillStyle(0xff4d6d); g.fillRect(12, 12, 4, 4);
    g.generateTexture('mira', 28, 28);
    g.destroy();
  }

  /** un tiro de cerca: la mira gira por el sobre (A la fija), la barra de fuerza (A) y el sobre azul cae */
  async tiro() {
    const W = this.scale.width, CX = W / 2, CY = 210, MEDIO = 65;
    const cerca = [
      this.add.image(W / 2, 180, 'esc_piso_cerca').setDepth(5000),
      this.add.ellipse(CX + 6, CY + 8, MEDIO * 2 + 8, MEDIO * 2 + 8, 0x000000, 0.35).setDepth(5001),
    ];
    const rojo = this.add.image(CX, CY, 'ddakji_rojo').setScale(2.4).setDepth(5002).setAngle(-8);
    cerca.push(rojo);
    this.cameras.main.flash(120, 255, 255, 255);
    const mira = this.add.image(CX, CY, 'mira').setDepth(5010);
    const ins = [
      icono(this, CX - 120, 36, 'a', 26).setDepth(5011),
      texto(this, CX - 100, 36, 'APUNTA A LA ORILLA', { tam: 17, negrita: true, origen: [0, 0.5] }).setDepth(5011),
    ];
    let ang = Math.random() * 6, r = 0, t = 0;
    const vel = [2.2, 3, 3.8][E.dificultad];
    // la mira va y viene del centro a la orilla mientras gira: lo mejor es la orilla
    this.__mini = { tipo: 'barra', ideal: 0.86, ancho: 0.26, v: () => r };
    await new Promise((ok) => {
      const f = (_, dt) => {
        t += dt / 1000;
        r = 0.5 - 0.5 * Math.cos(t * vel);
        ang += (dt / 1000) * 1.4;
        mira.setPosition(CX + Math.cos(ang) * MEDIO * r, CY + Math.sin(ang) * MEDIO * r);
        mira.setTint(r > 0.73 ? 0x9effc8 : 0xffffff);
        if (this.inp.tomarA()) { this.events.off('update', f); ok(); }
      };
      cadaCuadro(this, f);
    });
    tono(990, 0.05);
    const orilla = r > 0.73;
    ins.forEach((o) => o.destroy());
    const fuerza = await barra(this, this.inp, { vel: [1.1, 1.5, 1.9][E.dificultad], ideal: 0.85, ancho: this.ancho, texto: 'LA FUERZA', y: 64 });
    this.__mini = null;
    const enZona = fuerza.ok;
    // el sobre azul cae de arriba con todo
    const azul = this.add.image(mira.x - 20, -80, 'ddakji_azul').setScale(4).setDepth(5005).setAngle(30);
    tono(300, 0.2, 'cuerdas', 0.05);
    await new Promise((ok) => this.tweens.add({ targets: azul, x: mira.x, y: mira.y - 6, scale: 2.3, angle: 12, duration: 220, ease: 'Quad.easeIn', onComplete: ok }));
    mira.destroy();
    sfx(this, 'chapa', 0.9);
    sacudir(this, 160, 0.014);
    chorro(this, azul.x, azul.y + 30, 18, [0x8a8e9a, 0x6a6e7a], 90, { g: 200, vida: 600, prof: 5008 });
    // la suerte: orilla y fuerza dan casi seguro; una sola, a veces
    const prob = (enZona ? 0.55 : 0.08) + (orilla ? 0.42 : 0.05) + Math.min(0.2, this.intentos * 0.04);
    const volteo = Math.random() < prob;
    let ok = false;
    if (volteo) {
      this.tweens.add({ targets: azul, x: azul.x + 40, y: azul.y + 30, angle: 40, alpha: 0.6, duration: 260 });
      await new Promise((res) => this.tweens.add({ targets: rojo, scaleY: 0, y: CY - 50, angle: 20, duration: 160, ease: 'Quad.easeOut', onComplete: res }));
      rojo.setTexture('ddakji_rojo_atras');
      await new Promise((res) => this.tweens.add({ targets: rojo, scaleY: 2.4, y: CY, angle: -4, duration: 220, ease: 'Bounce.easeOut', onComplete: res }));
      sfx(this, 'chapa', 0.5);
      await cartel(this, '¡VOLTEADO!', '', { ms: 1000, color: 0x2fd4b4 });
      ok = true;
    } else {
      this.tweens.add({ targets: rojo, y: CY - 6, duration: 80, yoyo: true });
      await esperar(this, 350);
      await cartel(this, 'NO SE VOLTEÓ', enZona ? 'apunta más a la orilla' : orilla ? 'la fuerza no era la justa' : 'apunta a la orilla y mide la fuerza', { ms: 1200, color: 0xff8fb5 });
    }
    cerca.push(azul);
    this.cameras.main.flash(100, 0, 0, 0);
    cerca.forEach((o) => o.destroy());
    if (ok) this.rojoChico.setTexture('ddakji_rojo_atras');
    return ok;
  }

  async castigo() {
    const { yo, rec } = this;
    await this.caminar(rec, yo.x + 40, yo.y, 320);
    rec.anim('idle', 'left');
    if (ninas()) {
      rec.anim('point', 'left');
      bloque(this, ['E6', 0.05], ['G6', 0.05], ['E6', 0.05], ['G6', 0.05], ['E6', 0.05], ['G6', 0.08]);
      yo.anim('laugh', 'right');
      const ji = texto(this, yo.x, yo.y - 70, '¡JIJIJI!', { tam: 18, negrita: true, color: COLOR.rosa, origen: [0.5, 0.5] }).setDepth(7000);
      this.capa.push(ji);
      this.tweens.add({ targets: ji, y: ji.y - 16, alpha: 0, duration: 900 });
      await esperar(this, 900);
      await this.decir([[yo.id, 'feliz', ['¡Jajaja! ¡Basta, basta!', '¡Nooo, cosquillas no! ¡Jajaja!', '¡Ya! ¡Otra vez!'][this.intentos % 3]]]);
    } else {
      await rec.hacer('jab', 'left');
      sfx(this, 'golpe_pesado', 0.9);
      destello(this, 0xff3355, 110, 0.45);
      sacudir(this, 220, 0.02);
      yo.anim('hit', 'right');
      const plaf = texto(this, yo.x + 6, yo.y - 66, '¡PLAF!', { tam: 24, negrita: true, color: COLOR.rojo, origen: [0.5, 0.5] }).setDepth(7000).setAngle(-8);
      this.capa.push(plaf);
      plaf.setScale(1.8); this.tweens.add({ targets: plaf, scale: 1, duration: 160, ease: 'Back.easeOut' });
      this.tweens.add({ targets: plaf, alpha: 0, delay: 600, duration: 300 });
      await esperar(this, 700);
      await this.decir([[yo.id, 'dolor', ['¡Ay! ¡Qué mano tan pesada!', '¡Coño! Otra vez. Esta sí va.', '¡Ya va! Una más y te volteo el sobre.'][this.intentos % 3]]]);
    }
    await this.caminar(rec, 392, 304, 320);
    rec.anim('idle', 'left');
    yo.anim('idle', 'right');
  }
}

// ---------------------------------------------------------------- la llegada: tarjeta, casa, lancha, isla, gas, dormitorio

export class Llegada extends Historia {
  constructor() { super('Llegada'); }
  async correr() {
    const W = this.scale.width, H = this.scale.height;
    await this.tarjeta();
    await this.casa();
    await this.tormenta();
    await this.muelle();
    await this.dormitorio();
    if (this.saltar) return;
    // el Front Man
    musica('guardias');
    this.fondo('frontman');
    await this.pausa(700);
    await this.decir([
      ['front_man', 'neutral', 'Así que la Familia GG llegó a mi isla.'],
      ['front_man', 'neutral', 'Cuatro jugadores. Un mismo apellido. Veamos cuánto les dura la unión.'],
      ['front_man', 'neutral', 'Que comiencen los juegos.'],
    ]);
    await this.fundido(500);
    if (!this.saltar) {
      this.fondo('titulo');
      this.capa.push(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.3));
      logo(this, W / 2, 130).forEach((o) => this.capa.push(o));
      destello(this, 0xff3d7f, 400, 0.6);
      sfx(this, 'pitazo_largo', 0.5);
      altavoz('Que comiencen los juegos.', { baja: true });
      await this.pausa(2800);
      await this.fundido(500);
    }
    this.fondo('escaleras');
    await this.pausa(1800);
    this.terminar();
  }

  async tarjeta() {
    const W = this.scale.width;
    tarjetas(this);
    this.armarMetro();
    this.capa.push(this.add.rectangle(W / 2, 180, W, 360, 0x000000, 0.55).setDepth(100));
    const tj = this.add.container(W / 2, 200).setDepth(200);
    const frente = this.add.image(0, 0, 'esc_tarjeta').setScale(2.5);
    tj.add(frente);
    this.capa.push(tj);
    tj.setScale(0.2).setAngle(-20);
    this.tweens.add({ targets: tj, scale: 1, angle: -3, duration: 600, ease: 'Back.easeOut' });
    await this.pausa(700);
    await this.decir([
      ['reclutador', 'neutral', 'Hay un juego más grande. 45.600 millones de wones para el ganador.'],
      ['reclutador', 'feliz', 'Llame a este número. Y lleve a su familia. Los juegos son más divertidos en familia.'],
    ]);
    if (this.saltar) return;
    // la vuelta de la tarjeta: el número
    await new Promise((ok) => this.tweens.add({ targets: tj, scaleX: 0, duration: 180, onComplete: ok }));
    frente.setTexture('esc_tarjeta_atras');
    tj.add(texto(this, 0, 0, '010-4562-0222', { tam: 24, negrita: true, color: '#3a2a18', borde: 0, origen: [0.5, 0.5] }));
    await new Promise((ok) => this.tweens.add({ targets: tj, scaleX: 1, duration: 180, onComplete: ok }));
    tono(1568, 0.1, 'campana', 0.08);
    await this.pausa(1400);
    await this.fundido();
  }

  async casa() {
    if (this.saltar) return;
    musica('noche');
    casa(this, false);
    this.fondo('esc_casa_noche');
    this.luz(562, 112, 3, 0xffd890, 0.45);
    this.luz(160, 130, 4, 0x8a9aff, 0.12);
    const r = this.actor('rick', 190, 318, 'right', { ropa: 'calle' }), s = this.actor('steph', 240, 322, 'left', { ropa: 'calle' });
    const so = this.actor('sophie', 300, 326, 'left', { ropa: 'calle' }), a = this.actor('alana', 344, 330, 'left', { ropa: 'calle' });
    const thor = this.actor('thor', 430, 332, 'left');
    thor.anim('wag', 'left');
    void r; void s; void so; void a;
    await this.decir([
      ['steph', 'susto', '¿Y esa tarjeta tan rara? ¿Un círculo, un triángulo y un cuadrado?'],
      ['rick', 'feliz', 'Un señor en el metro. Dice que si ganamos unos jueguitos nos vamos con una millonada.'],
      ['steph', 'enojo', 'Eso suena a estafa, mi amor. Pero bueno... nadie juega en familia como nosotros.'],
      ['sophie', 'feliz', '¡Yo quiero ir! ¡Soy la mejor en juegos!'],
      ['alana', 'feliz', '¡Y yo! ¿Thor puede venir?'],
      ['rick', 'neutral', 'Thor se queda cuidando la casa. Le dejamos comida para una semana.'],
    ]);
    if (!this.saltar) { thor.anim('bark', 'left'); sfx(this, 'ladrido', 0.6); await this.pausa(700); thor.anim('sit', 'left'); }
    await this.decir([['alana', 'triste', 'Chao, Thor. Ya volvemos con muchos millones para comprarte huesos.']]);
    await this.fundido();
  }

  async tormenta() {
    if (this.saltar) return;
    musica('tormenta');
    const mar = ambiente(this, 'mar', 0.6);
    const viento = ambiente(this, 'viento', 0.35);
    this.alLimpiar(() => { if (mar) mar.stop(); if (viento) viento.stop(); });
    const calle = { ropa: 'calle' };
    const m = this.armarMar({ gente: [['rick', 40, 'right', calle], ['steph', 70, 'right', calle], ['sophie', 102, 'right', calle], ['alana', 130, 'right', calle], ['guardia_triangulo', 184, 'right']] });
    const parar = lluvia(this, 150);
    this.alLimpiar(parar);
    const rayos = this.time.addEvent({ delay: 2400, loop: true, callback: () => { this.rayo(); sacudir(this, 250, 0.006); } });
    const olas = this.time.addEvent({ delay: 3700, loop: true, callback: () => m.golpe() });
    this.alLimpiar(() => { rayos.remove(); olas.remove(); });
    const t = this.rotulo('Esa noche, una lancha negra los recogió en el muelle...', 40, { color: '#d8d0c0', tam: 16 });
    await this.pausa(1500);
    this.rayo();
    await this.pausa(1000);
    t.destroy();
    m.golpe();
    await this.decir([
      ['alana', 'susto', '¡Papá! ¡Las olas están gigantes!'],
      ['steph', 'susto', '¡Agárrense duro del barco! ¡Sophie, agarra a tu hermana!'],
      ['rick', 'feliz', '¡Tranquilas, que esto es igualito al ferry a Margarita!'],
      ['sophie', 'enojo', '¡Papá, el ferry a Margarita no tiene rayos!'],
    ]);
    if (this.saltar) return;
    // la isla sale de la tormenta
    const isla = m.estado.isla;
    this.tweens.add({ targets: isla, scale: 1.6, x: 520, y: 214, duration: 4200, ease: 'Sine.easeInOut' });
    this.rayo();
    await this.pausa(1800);
    m.ocupantes[2].anim('point', 'right');
    await this.decir([
      ['sophie', 'susto', '¡Miren! ¡Una isla! Y hay gente vestida de rosado esperando en el muelle...'],
      ['guardia_triangulo', 'neutral', 'Llegamos. No hagan preguntas.'],
    ]);
    await this.pausa(600);
    await this.fundido(700);
  }

  async muelle() {
    if (this.saltar) return;
    const W = this.scale.width, H = this.scale.height;
    muelle(this); lancha(this); ola(this, 'esc_ola_t0', OLAS.tormenta[0]);
    this.fondo('esc_muelle');
    const mar = this.add.tileSprite(0, 188, W, 52, 'esc_ola_t0').setOrigin(0).setDepth(-96).setAlpha(0.8);
    this.capa.push(mar);
    const ev = this.time.addEvent({ delay: 16, loop: true, callback: () => { mar.tilePositionX += 0.3; } });
    this.alLimpiar(() => ev.remove());
    FAROLES_MUELLE.forEach((x) => this.luz(x, 144, 2.2, 0xffa8cc, 0.5));
    this.luz(515, 166, 2.4, 0xff4d8d, 0.25, -95);
    const parar = lluvia(this, 60);
    this.alLimpiar(parar);
    // la lancha se va
    const la = this.img('esc_lancha_atras', 200, 214).setScale(0.35).setDepth(-95);
    const lf = this.img('esc_lancha', 200, 214).setScale(0.35).setDepth(-94);
    this.tweens.add({ targets: [la, lf], x: -80, duration: 7000, delay: 2500, ease: 'Sine.easeIn' });
    const guardias = [['guardia_circulo', 440, 292], ['guardia_triangulo', 486, 300], ['guardia_cuadrado', 532, 296], ['guardia_triangulo', 580, 304]]
      .map(([id, x, y]) => this.actor(id, x, y, 'left'));
    const fam = FAM.map((id, i) => this.actor(id, -30 - i * 34, 296 + (i % 2) * 8, 'right', { ropa: 'calle' }));
    await Promise.all(fam.map((f, i) => this.caminar(f, 230 - i * 40, f.y, 2200 + i * 120)));
    fam.forEach((f) => f.anim('idle', 'right'));
    await this.decir([
      ['guardia_cuadrado', 'neutral', 'Bienvenidos, jugadores. Por favor, no se resistan.'],
      ['rick', 'susto', '¿Por qué tienen máscaras? ¿Eso es un triángulo?'],
      ['steph', 'enojo', '¡Rick! ¡Agarra a las niñas!'],
      ['guardia_cuadrado', 'neutral', 'Ahora duerman. Mañana empieza el juego.'],
    ]);
    if (this.saltar) return;
    // el gas rosado
    guardias[2].anim('point', 'left');
    tono(180, 2, 'cuerdas', 0.06);
    for (let i = 0; i < 46; i++) {
      this.time.delayedCall(i * 45, () => {
        const b = this.img('bocanada', 420 + Math.random() * 40, 270 + Math.random() * 40).setScale(0.6).setAlpha(0.55).setDepth(7000);
        this.tweens.add({ targets: b, x: 40 + Math.random() * 280, y: 220 + Math.random() * 110, scale: 2.4 + Math.random() * 1.5, alpha: 0.4, duration: 1800 + Math.random() * 600, ease: 'Sine.easeOut' });
      });
    }
    await this.pausa(1300);
    for (const [i, f] of fam.entries()) {
      this.time.delayedCall(i * 260, () => { f.anim('knockout', 'right', true); zzz(this, f, 3); });
    }
    await this.pausa(1700);
    const niebla = this.add.rectangle(W / 2, H / 2, W, H, 0xe0457b, 0).setDepth(8000);
    this.capa.push(niebla);
    this.tweens.add({ targets: niebla, fillAlpha: 0.85, duration: 1400 });
    await this.pausa(1500);
    this.rotulo('Z  z  z . . .', H / 2, { tam: 30, negrita: true });
    await this.pausa(1200);
    await this.fundido(900);
  }

  async dormitorio() {
    if (this.saltar) return;
    musica('danubio');
    this.fondo('dormitorio');
    const ids = jugadoresNPC();
    for (let i = 0; i < 16; i++) {
      const x = 53 + (i % 8) * 75 + (Math.random() * 12 - 6), y = 250 + Math.floor(i / 8) * 52 + Math.random() * 8;
      const n = this.actor(ids[i % ids.length], x, y, i % 3 ? 'up' : 'down');
      n.anim(i % 4 ? 'idle' : 'sad');
    }
    const fam = FAM.map((id, i) => this.actor(id, 266 + i * 36, 334, 'up'));
    fam.forEach((x) => x.anim('knockout'));
    await this.pausa(1200);
    fam.forEach((x, i) => this.time.delayedCall(i * 250, () => x.hacer('fall_getup').then(() => x.anim('idle', 'down'))));
    await this.pausa(1700);
    await this.decir([
      ['steph', 'susto', '¿Dónde estamos? ¿Y por qué tenemos todos este mono verde?'],
      ['alana', 'feliz', 'Yo tengo el 222. ¡Es mi número favorito!'],
      ['sophie', 'neutral', 'Yo el 018. Papá tiene el 456 y mamá el 067. Hay un montón de gente...'],
      ['rick', 'neutral', '456 jugadores. Y miren arriba: un chanchito de oro gigante.'],
    ]);
    if (this.saltar) return;
    // los guardias y las reglas
    this.actor('guardia_cuadrado', 320, 226, 'down');
    this.actor('guardia_circulo', 200, 230, 'down');
    this.actor('guardia_triangulo', 440, 230, 'down');
    sfx(this, 'pitazo_largo', 0.5);
    await this.decir([
      ['guardia_cuadrado', 'neutral', 'Bienvenidos, jugadores. Tienen 11 juegos por delante.'],
      ['guardia_cuadrado', 'neutral', 'Regla 1: un jugador no puede dejar de jugar.'],
      ['guardia_cuadrado', 'neutral', 'Regla 2: el jugador que se niegue a jugar será eliminado.'],
      ['guardia_cuadrado', 'neutral', 'Regla 3: los juegos se pueden terminar si la mayoría vota.'],
      ['guardia_cuadrado', 'neutral', 'Por cada eliminado, el chanchito suma 100 millones. Y por cada juego bien jugado, su familia cobra un premio para la máquina de la noche.'],
      ninas()
        ? ['alana', 'susto', '¿Eliminado? ¿Eso es que lo mandan a dormir temprano?']
        : ['steph', 'susto', 'Rick... ¿qué significa "eliminado"?'],
      ['rick', 'neutral', 'No sé, pero mejor no averiguarlo. Pase lo que pase, estamos juntos.'],
    ]);
    await this.fundido(600);
  }
}

// ---------------------------------------------------------------- las noches entre juegos

const NOCHES = {
  1: [
    ['steph', 'triste', 'Eso fue horrible... la muñeca, los disparos. Quiero irme a la casa.'],
    ['rick', 'neutral', 'Lo sé, mi amor. Pero ya pasamos el primero. Juntos.'],
    ['sophie', 'feliz', '¡Yo corrí rapidísimo! ¿Me vieron?'],
    ['alana', 'feliz', 'Yo me quedé quietica como una estatua. Soy la mejor estatua.'],
  ],
  2: [
    ['sophie', 'feliz', 'La galleta sabía rica. Un poquito.'],
    ['rick', 'burla', 'Yo me comí la mitad de la mía antes de terminar. Estrategia.'],
    [null, null, 'Esa noche se apagaron las luces del dormitorio. Hubo gritos y empujones...'],
    ['steph', 'enojo', '¡Todos juntos en la litera de arriba! ¡Que nadie nos separe!'],
    ['alana', 'cerrado', 'Yo tengo sueño...'],
  ],
  3: [
    ['rick', 'feliz', '¡Esos tres pasos adelante fueron magistrales! El abuelo 001 sabe.'],
    ['j_abuelo', 'feliz', 'Je, je. Cuando uno es viejo, ya sabe cómo se juega todo.'],
    ['steph', 'neutral', 'Gracias, señor. ¿Usted juega con nosotros mañana?'],
    ['j_abuelo', 'neutral', 'Mañana necesito un compañero. Un gganbu. ¿Quién quiere ser mi gganbu?'],
  ],
  4: [
    ['sophie', 'triste', 'Extraño al abuelo 001. Era buena gente.'],
    ['rick', 'triste', 'Nos regaló el juego. Hay que ganar por él también.'],
    ['alana', 'neutral', 'Mañana dicen que vamos a estar amarrados de los pies. ¡Como en una carrera de sacos!'],
  ],
  5: [
    ['steph', 'feliz', '¡Lo logramos los cinco! Amarrados y todo.'],
    ['rick', 'feliz', 'Familia que juega unida, gana unida.'],
    ['sophie', 'neutral', 'Escuché que mañana hay música. Un carrusel.'],
    ['alana', 'feliz', '¡Me encantan los carruseles!'],
    ['steph', 'susto', 'Aquí nada es lo que parece, Alana.'],
  ],
  6: [
    ['rick', 'neutral', 'Quedamos muy pocos. Mañana es el puente. Dicen que es de vidrio.'],
    ['steph', 'susto', '¿De vidrio? ¿Y si se rompe?'],
    ['sophie', 'neutral', 'Hay que mirar con cuidado. El vidrio bueno brilla distinto. Y en la máquina venden pistas...'],
  ],
  7: [
    ['alana', 'triste', 'No me gustan las alturas. Ni el vidrio. Ni esta isla.'],
    ['rick', 'feliz', 'Ya casi, mi reina. Unos jueguitos más y nos vamos a la casa con Thor.'],
    ['steph', 'neutral', 'Mañana es un escondite. Con llaves y con puertas.'],
  ],
  8: [
    ['sophie', 'feliz', '¡Encontramos la salida! Soy experta en laberintos.'],
    ['rick', 'neutral', 'Mañana es saltar la cuerda. Sobre un puente. Con la muñeca gigante otra vez.'],
    ['alana', 'feliz', '¡Yo salto la cuerda en el recreo todos los días!'],
  ],
  9: [
    ['steph', 'neutral', 'Ya solo quedan dos juegos.'],
    ['rick', 'neutral', 'El penúltimo es en el cielo. Unos pilares altísimos.'],
    ['sophie', 'susto', '¿Más alturas? ¿Quién inventó estos juegos?'],
    ['front_man', 'neutral', 'Yo.'],
    ['alana', 'susto', '¡Aaah! ¿De dónde salió ese señor?'],
  ],
  10: [
    ['front_man', 'neutral', 'Felicidades, Familia GG. Llegaron a la final.'],
    ['front_man', 'neutral', 'El último juego es el que le da nombre a todo esto. El juego del calamar.'],
    ['front_man', 'neutral', 'Y su rival... seré yo.'],
    ['rick', 'enojo', 'Entonces mañana se quita esa máscara de una vez.'],
  ],
};

// después de estos juegos se vota si se sigue o no
const VOTOS = [1, 5, 8];

export class Noche extends Historia {
  constructor() { super('Noche'); }
  async correr() {
    const n = this.datos.n || 1;
    const W = this.scale.width;
    musica('noche');
    this.fondo('dormitorio');
    this.capa.push(this.add.rectangle(W / 2, 180, W, 360, 0x081028, 0.5).setDepth(-60));
    FAM.map((id, i) => this.actor(id, 254 + i * 44, 326 - (i % 2) * 6, i < 2 ? 'right' : 'left'));
    if (n === 3 || n === 10) this.actor(n === 3 ? 'j_abuelo' : 'front_man', 460, 320, 'left');
    const vivos = Math.max(2, 456 - Math.round(E.pozo / 100_000_000));
    this.rotulo(`NOCHE ${n}  ·  Quedan ${vivos} jugadores`, 112, { color: COLOR.oro, tam: 18, negrita: true });
    this.chanchito();
    this.rotulo(`Billetera de la familia: ${millones(E.billetera)}`, 238, { color: COLOR.verde, tam: 14 });
    await this.pausa(900);
    await this.decir(NOCHES[n] || []);
    if (VOTOS.includes(n)) await this.votar(n);
    await this.maquina();
    // la mañana
    if (!this.saltar) {
      await this.fundido(500);
      musica('danubio');
      this.fondo('escaleras');
      const prox = JUEGOS[n];
      this.rotulo('A la mañana siguiente...', 150, { tam: 16 });
      if (prox) this.rotulo(`JUEGO ${n + 1}: ${prox.titulo}`, 180, { color: COLOR.rosa, tam: 22, negrita: true });
      await this.pausa(2200);
    }
    this.terminar();
  }

  /** el pozo sube desde lo que había antes de este juego: billetes cayendo en el chanchito de oro */
  chanchito() {
    const W = this.scale.width;
    const ganado = Math.round(E.pozo / 100_000_000) - (E.pozoVisto || 0);
    const desde = Math.max(0, E.pozo - Math.max(0, ganado) * 100_000_000);
    E.pozoVisto = Math.round(E.pozo / 100_000_000);
    guardar();
    chanchitoGrande(this);
    this.luz(W / 2, 158, 2.6, 0xffd060, 0.35, 290);
    const cerdo = this.img('chanchito_grande', W / 2, 160).setScale(2).setDepth(300);
    this.tweens.add({ targets: cerdo, y: 154, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const t = this.rotulo(wones(desde), 210, { color: COLOR.oro, tam: 20, negrita: true });
    if (ganado <= 0) return;
    const o = { v: desde };
    this.tweens.add({ targets: o, v: E.pozo, duration: 2000, ease: 'Sine.easeOut', onUpdate: () => t.setText(wones(o.v)) });
    for (let i = 0; i < Math.min(36, ganado); i++) {
      this.time.delayedCall(i * 55, () => {
        const b = this.add.rectangle(W / 2 - 60 + Math.random() * 120, -8, 10, 5, Math.random() < 0.5 ? 0x9ed08a : 0x5aa66a).setDepth(299).setStrokeStyle(1, 0x2a5a2a);
        this.capa.push(b);
        this.tweens.add({ targets: b, x: W / 2 + (Math.random() * 20 - 10), y: 142, angle: Math.random() * 360, duration: 800, ease: 'Quad.easeIn', onComplete: () => { b.destroy(); if (i % 4 === 0) tono(1568 + (i % 3) * 200, 0.05, 'campana', 0.05); } });
      });
    }
  }

  async votar(n) {
    if (this.saltar) return;
    await this.fundido(400);
    sfx(this, 'pitazo_largo', 0.4);
    this.fondo('votacion');
    const W = this.scale.width;
    const total = Math.max(3, 456 - Math.round(E.pozo / 100_000_000));
    await this.decir([
      ['guardia_cuadrado', 'neutral', 'Según la regla 3, se votará. O: seguir jugando. X: terminar el juego y repartir el dinero.'],
      ['steph', 'neutral', 'Rick... ¿votamos para irnos?'],
      ['rick', 'neutral', '¿Y la plata? Con eso arreglamos todo.'],
      [P() === 'steph' ? 'rick' : 'steph', 'neutral', 'Tú decides, ' + nombre(P()) + '. Nosotros votamos contigo.'],
    ]);
    if (this.saltar) return;
    const r = await elegir(this, this.inp, ['O  ·  Seguir jugando', 'X  ·  Terminar el juego'], { titulo: 'TU VOTO', y: 250 });
    // el conteo: siempre termina en O por un voto, como en la serie
    const mitad = Math.floor(total / 2);
    const o = mitad + 1, x = total - o;
    const to = this.rotulo('O: 0', 132, { color: COLOR.azul, tam: 30, negrita: true }).setX(W / 2 - 62);
    const tx = this.rotulo('X: 0', 132, { color: COLOR.rojo, tam: 30, negrita: true }).setX(W / 2 + 62);
    for (let i = 0; i <= 20; i++) {
      to.setText('O: ' + Math.round((o * i) / 20)); tx.setText('X: ' + Math.round((x * i) / 20));
      tono(500 + i * 20, 0.03, 'cuadrada', 0.04);
      await this.pausa(70);
    }
    await this.pausa(400);
    sfx(this, 'pitazo_largo', 0.4);
    await this.decir([
      ['guardia_cuadrado', 'neutral', `Resultado: ${o} votos por O, ${x} votos por X. Por un voto, el juego continúa.`],
      r === 1
        ? (n < 4 ? ['j_abuelo', 'feliz', 'Je, je... el último voto fue mío. Yo quiero seguir jugando.'] : ['guardia_cuadrado', 'neutral', 'Un jugador cambió su voto en el último segundo.'])
        : ['alana', 'feliz', '¡Seguimos! ¡Yo voté O porque la O es redondita!'],
      ['steph', 'triste', 'Bueno... ya no hay vuelta atrás.'],
    ]);
  }

  /** la máquina del dormitorio: lo que se gana con estrellas se gasta aquí, para el próximo juego */
  async maquina() {
    if (this.saltar) return;
    await this.decir([[null, null, 'En la esquina del dormitorio hay una máquina rosada que brilla. Acepta los premios de la familia.']]);
    for (;;) {
      if (this.saltar) return;
      const ops = TIENDA.map((t) => `${t.nombre}  ·  ${millones(t.precio)}${E.compras[t.id] ? '  (ya lo tienes)' : ''}`);
      ops.push('Listo, a dormir');
      const det = TIENDA.map((t) => t.detalle).concat(['Lo que no gastes queda guardado']);
      const r = await elegir(this, this.inp, ops, { titulo: 'LA MÁQUINA  ·  tienes ' + millones(E.billetera), detalles: det, y: 196, cancelar: true });
      if (r < 0 || r === TIENDA.length) return;
      const t = TIENDA[r];
      if (E.compras[t.id]) { await cartel(this, 'YA LO TIENES', 'se usa en el próximo juego', { ms: 900, color: 0x9a96a8 }); continue; }
      if (E.billetera < t.precio) {
        tono(200, 0.15, 'cuadrada', 0.08);
        await cartel(this, 'NO ALCANZA', 'más estrellas en los juegos = más plata', { ms: 1200, color: 0xff4d6d });
        continue;
      }
      E.billetera -= t.precio;
      E.compras[t.id] = 1;
      guardar();
      sfx(this, 'moneda', 0.8);
      await cartel(this, '¡COMPRADO!', t.nombre, { ms: 900, color: 0x2fd4b4 });
    }
  }
}

// ---------------------------------------------------------------- el game over

export class GameOver extends Historia {
  constructor() { super('GameOver'); }
  async correr() {
    this.puedeSaltar = false;
    this.ayuda.setVisible(false);
    pararMusica();
    const W = this.scale.width, H = this.scale.height;
    this.fondo('frontman').setTint(0x886677);
    this.capa.push(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.5).setDepth(-50));
    const titulo = ninas() ? '¡A DORMIR!' : 'ELIMINADO';
    const tt = this.add.bitmapText(W / 2, 150, 'fuente_titulo', titulo).setOrigin(0.5).setScale(3).setTint(ninas() ? 0xff8fb5 : 0xff3355);
    this.capa.push(tt);
    if (!ninas()) sfx(this, 'pistola', 0.6);
    else bloque(this, ['C5', 0.15, 'campana'], ['G4', 0.15, 'campana'], ['E4', 0.3, 'campana']);
    altavoz(ninas() ? 'Jugador ' + NUMEROS[E.perfil] + ', a dormir.' : 'Jugador ' + NUMEROS[E.perfil] + ', eliminado.');
    await this.pausa(1100);
    await this.decir([
      ['front_man', 'neutral', 'Se acabaron tus vidas, jugador ' + NUMEROS[E.perfil] + '.'],
      ['front_man', 'neutral', 'Pero esta isla es generosa. Vuelves al primer juego. Con el chanchito y la billetera vacíos.'],
      [E.perfil, 'enojo', '¡Esta vez sí vamos a ganar!'],
    ], { arriba: false });
    this.terminado = true;
    reiniciarDesdeJuego1(this);
  }
}

// ---------------------------------------------------------------- el final

export class Final extends Historia {
  constructor() { super('Final'); }
  async correr() {
    this.puedeSaltar = false;
    this.ayuda.setVisible(false);
    const W = this.scale.width, H = this.scale.height;
    E.pozo = 45_600_000_000;
    guardar();
    musica('danubio');
    this.fondo('votacion');
    const fam = FAM.map((id, i) => this.actor(id, 254 + i * 44, 318, 'down'));
    fam.forEach((f) => f.anim('celebrate'));
    this.rotulo(wones(), 150, { color: COLOR.oro, tam: 30, negrita: true });
    // la lluvia de billetes
    for (let i = 0; i < 6; i++) this.time.delayedCall(i * 300, () => chorro(this, W / 2, 80, 26, [0x9ed08a, 0x5aa66a, 0xf2c230], 160, { g: 120, vida: 2200 }));
    fanfarria();
    await this.pausa(1500);
    await this.decir([
      ['front_man', 'neutral', 'Lo lograron. 45.600 millones de wones para la Familia GG.'],
      ['front_man', 'neutral', 'En todos estos años, nadie ganó jugando en equipo. Ustedes nunca se soltaron la mano.'],
      ['rick', 'feliz', 'Así somos los GG. Ni la isla, ni la muñeca, ni usted nos separan.'],
      ['steph', 'feliz', 'Ahora llévenos a la casa. Y apúrese, que Thor nos está esperando.'],
    ]);
    await this.fundido(800);
    // de vuelta en la lancha, al amanecer
    musica('flauta');
    const m = this.armarMar({ dia: true, gente: [['rick', 40, 'right'], ['steph', 70, 'right'], ['sophie', 102, 'right'], ['alana', 130, 'right'], ['guardia_circulo', 184, 'right']] });
    m.ocupantes.slice(0, 4).forEach((a) => a.anim('celebrate'));
    ambiente(this, 'mar', 0.3);
    await this.pausa(800);
    await this.decir([
      ['alana', 'feliz', '¡Ya no hay tormenta! ¡Sale el sol!'],
      ['sophie', 'feliz', 'Papá... ¿qué vamos a hacer con tanta plata?'],
      ['rick', 'feliz', 'Primero, un montón de huesos para Thor. Después vemos.'],
    ]);
    await this.fundido(800);
    // la casa de día y Thor
    casa(this, true);
    this.fondo('esc_casa_dia');
    const thor = this.actor('thor', 680, 330, 'left');
    const fam2 = FAM.map((id, i) => this.actor(id, 150 + i * 40, 322 + (i % 2) * 6, 'right', { ropa: 'calle' }));
    await this.caminar(thor, 330, 330, 1400, 'run');
    thor.anim('jump', 'left');
    sfx(this, 'ladrido', 0.7);
    await this.pausa(500);
    thor.anim('wag', 'left');
    fam2.forEach((f) => f.anim('celebrate'));
    chorro(this, 330, 290, 30, [0xe0457b, 0x23b39c, 0xf2c230, 0x5aa0ff, 0xffffff], 150, { g: 160, vida: 1600 });
    await this.decir([
      ['alana', 'feliz', '¡THOOOR! ¡Te extrañé!'],
      ['sophie', 'feliz', '¡Thor, somos millonarios!'],
      ['steph', 'feliz', 'Y lo mejor: volvimos los cuatro. Juntos.'],
      ['rick', 'feliz', 'Familia GG. Siempre juntos. Fin.'],
    ]);
    await this.fundido(900);
    // los créditos
    logo(this, W / 2, 80, 0.8).forEach((o) => this.capa.push(o));
    const lineas = [
      'UN JUEGO PARA LA FAMILIA GG',
      'Rick · Steph · Sophie · Alana · y Thor',
      '',
      'Personajes y animaciones: PixelForja',
      'Escenarios: pintados en pixel art',
      'Música: sintetizada en el navegador',
      'El Danubio Azul: Johann Strauss II',
      '',
      'Inspirado en El Juego del Calamar',
      'Hecho con cariño en Ho Chi Minh City',
    ];
    lineas.forEach((l, i) => this.rotulo(l, 176 + i * 15, { color: i === 0 ? COLOR.rosa : COLOR.texto, tam: i === 0 ? 15 : 13, negrita: i === 0 }));
    await this.pausa(1000);
    this.rotulo('A: volver al menú', H - 14, { color: COLOR.apagado, tam: 12 });
    await esperarA(this, this.inp);
    E.paso = 0;
    guardar();
    pararMusica();
    this.cameras.main.fadeOut(500);
    this.time.delayedCall(520, () => this.scene.start('Titulo'));
  }
}
