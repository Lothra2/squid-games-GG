import Phaser from 'phaser';
// Escenas de historia: la intro en el metro, la llegada a la isla (lancha en tormenta, gas, dormitorio y el
// Front Man), las noches entre juegos con la votación, el game over y el final.

import { E, sangre, NUMEROS, nombre, wones, NINAS, guardar } from '../core/estado.js';
import { Entrada } from '../core/entrada.js';
import { Actor } from '../core/actor.js';
import { hablar, cartel, esperar, elegir, esperarA } from '../core/dialogo.js';
import { musica, pararMusica, sfx, ambiente, tono, despertar, fanfarria, bloque } from '../core/sonido.js';
import { lluvia, relampago, destello, sacudir, zzz, chorro } from '../core/efectos.js';
import { avanzar, reiniciarDesdeJuego1, JUEGOS } from '../core/flujo.js';
import { jugadoresNPC, M } from '../core/kit.js';
import { logo } from './Titulo.js';

const P = () => E.perfil;
const ninas = () => !sangre();

/** escena de historia con ayudas para armar tomas */
class Historia extends Phaser.Scene {
  init(data) { this.datos = data || {}; }
  create() {
    despertar();
    this.inp = new Entrada(this, { palanca: false, botonB: false });
    this.inp.ocultarTactil(false);
    this.capa = [];
    this.saltar = false;
    // B salta la escena entera (para quien ya la vio)
    this.ayuda = this.add.bitmapText(this.scale.width - 4, 2, 'fuente_ui', 'B: saltar').setOrigin(1, 0).setDepth(9999).setTint(0x8a8a9a).setScrollFactor(0);
    this.cameras.main.fadeIn(500);
    this.correr();
  }
  update() {
    if (this.inp.tomarB() && !this.saltar && this.puedeSaltar !== false) { this.saltar = true; this.terminar(); }
  }
  limpiar() { this.capa.forEach((o) => o.destroy()); this.capa = []; }
  fondo(key) {
    const W = this.scale.width, H = this.scale.height;
    const f = this.add.image(W / 2, H / 2, key).setDepth(-100);
    this.capa.push(f);
    return f;
  }
  actor(id, x, y, dir = 'right', opts) {
    const a = new Actor(this, id, x, y, { dir, ...opts });
    this.capa.push(a);
    return a;
  }
  async decir(lineas, opts) { if (!this.saltar) await hablar(this, this.inp, lineas, opts); }
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
  texto(t, y = 135, color = 0xffffff, esc = 1) {
    const b = this.add.bitmapText(this.scale.width / 2, y, 'fuente_ui', t).setOrigin(0.5).setTint(color).setScale(esc).setDepth(500).setMaxWidth(420).setCenterAlign();
    this.capa.push(b);
    return b;
  }
  terminar() {
    if (this.yaTermino) return;
    this.yaTermino = true;
    pararMusica();
    avanzar(this);
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
    musica('flauta');
    const W = this.scale.width;
    await this.pausa(200);
    this.fondo('metro');
    const t = this.texto('Ho Chi Minh City. Una noche cualquiera.', 40, 0xd8d0c0);
    const yo = this.actor(P(), 150, 222, 'right');
    await this.pausa(1400);
    t.destroy();
    const rec = this.actor('reclutador', W + 20, 222, 'left');
    await this.caminar(rec, 250, 222, 1800);
    rec.anim('idle', 'left');
    yo.anim('idle', 'right');
    await this.decir([
      ['reclutador', 'feliz', 'Buenas noches. ¿Tiene un minutito? ¿Sabe jugar ddakji?'],
      SALUDO[P()],
      ['reclutador', 'feliz', 'Es muy sencillo. Tengo dos sobres de papel: uno azul y uno rojo.'],
      ['reclutador', 'neutral', 'Yo pongo el rojo en el piso. Usted tira el azul encima. Si lo voltea, gana 100.000 wones.'],
      ninas()
        ? ['reclutador', 'burla', 'Y si pierde... le hago cosquillas. Muchas cosquillas.']
        : ['reclutador', 'burla', 'Y si pierde... me paga con una cachetada.'],
      ACEPTA[P()],
    ]);
    this.terminar();
  }
}

// ---------------------------------------------------------------- el ddakji (minijuego de la intro)

export function texturasDdakji(scene) {
  const g = scene.make.graphics({ add: false });
  const sobre = (key, c1, c2, c3) => {
    if (scene.textures.exists(key)) return;
    g.clear();
    g.fillStyle(0x1e1418); g.fillRect(0, 0, 40, 40);
    g.fillStyle(c2); g.fillRect(1, 1, 38, 38);
    g.fillStyle(c1); g.fillTriangle(1, 1, 39, 1, 20, 20); g.fillTriangle(1, 39, 39, 39, 20, 20);
    g.fillStyle(c3); g.fillTriangle(1, 1, 1, 39, 20, 20);
    g.lineStyle(1, 0x1e1418, 0.8); g.lineBetween(1, 1, 39, 39); g.lineBetween(39, 1, 1, 39);
    g.fillStyle(0xffffff, 0.25); g.fillRect(3, 3, 12, 2);
    g.generateTexture(key, 40, 40);
  };
  sobre('ddakji_azul', 0x3d6fd6, 0x2a52a8, 0x5a8cf0);
  sobre('ddakji_rojo', 0xd63d4a, 0xa82a36, 0xf05a68);
  // el reverso del rojo (cuando se voltea): las cuatro solapas al revés
  sobre('ddakji_rojo_atras', 0xa82a36, 0xd63d4a, 0x8a1f2a);
  g.destroy();
}

export class Ddakji extends Historia {
  constructor() { super('Ddakji'); }
  async correr() {
    this.puedeSaltar = false;
    this.ayuda.setVisible(false);
    texturasDdakji(this);
    musica('tension');
    const W = this.scale.width, H = this.scale.height;
    this.fondo('metro');
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.35).setDepth(-50);
    const yo = this.actor(P(), 120, 230, 'right');
    const rec = this.actor('reclutador', 360, 230, 'left');
    this.yo = yo; this.rec = rec;
    // el piso de cerca: el sobre rojo
    this.add.ellipse(W / 2, 150, 150, 50, 0x30343c).setDepth(10);
    this.rojo = this.add.image(W / 2, 148, 'ddakji_rojo').setScale(1.4, 0.7).setDepth(11);
    this.dif = [0.22, 0.15, 0.1][E.dificultad];
    this.intentos = 0;
    await this.decir([[null, null, 'Primero apunta a la orilla del sobre rojo. Después mide la fuerza. Las dos con A en el momento justo.']]);
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
    await this.decir([
      ['reclutador', 'feliz', '¡Excelente! Aquí tiene sus 100.000 wones.'],
      ['reclutador', 'neutral', 'Usted tiene talento. Y su familia también, me imagino.'],
    ]);
    this.terminar();
  }

  /** un tiro: primero el punto (mira que gira por la orilla), después la fuerza (barra que sube y baja) */
  async tiro() {
    const W = this.scale.width;
    const mira = this.add.image(W / 2, 148, 'circulo').setTint(0xffe066).setDepth(20);
    const ayuda = this.add.bitmapText(W / 2, 96, 'fuente_ui', 'A: APUNTAR A LA ORILLA').setOrigin(0.5).setDepth(30);
    let ang = 0, r = 0;
    const vel = [2.2, 3.1, 4][E.dificultad];
    // la mira va y viene del centro a la orilla: lo mejor es la orilla (r cerca de 1)
    let t = 0;
    await new Promise((ok) => {
      const f = (_, dt) => {
        t += dt / 1000;
        r = 0.5 + 0.5 * Math.sin(t * vel);
        ang += dt / 1000 * 1.3;
        mira.setPosition(W / 2 + Math.cos(ang) * 30 * r, 148 + Math.sin(ang) * 15 * r);
        if (this.inp.tomarA()) { this.events.off('update', f); ok(); }
      };
      this.events.on('update', f);
    });
    tono(990, 0.05);
    ayuda.setText('A: LA FUERZA');
    // la barra de fuerza
    const bx = W / 2 - 60, by = 70;
    const marco = this.add.nineslice(W / 2, by, 'barra_marco', undefined, 124, 10, 4, 4, 0, 0).setDepth(30);
    const zona = this.add.rectangle(bx + 120 * (0.85 - this.dif / 2), by - 3, 120 * this.dif, 6, 0x23b39c).setOrigin(0, 0).setDepth(31);
    const aguja = this.add.rectangle(bx, by, 2, 12, 0xffffff).setDepth(32);
    let v = 0, sube = 1;
    const velF = [1.1, 1.5, 2][E.dificultad];
    await new Promise((ok) => {
      const f = (_, dt) => {
        v += sube * dt / 1000 * velF;
        if (v > 1) { v = 1; sube = -1; } if (v < 0) { v = 0; sube = 1; }
        aguja.setX(bx + 120 * v);
        if (this.inp.tomarA()) { this.events.off('update', f); ok(); }
      };
      this.events.on('update', f);
    });
    const enZona = Math.abs(v - 0.85) <= this.dif / 2;
    const orilla = r > 0.72;
    [marco, zona, aguja, ayuda].forEach((o) => o.destroy());
    // el tiro
    await this.yo.hacer('cap_pitch');
    const azul = this.add.image(W / 2, 40, 'ddakji_azul').setDepth(25).setScale(1.2);
    await new Promise((ok) => this.tweens.add({ targets: azul, x: mira.x, y: mira.y - 4, scaleX: 1.4, scaleY: 0.75, duration: 180, ease: 'Quad.easeIn', onComplete: ok }));
    mira.destroy();
    sfx(this, 'chapa', 0.8);
    sacudir(this, 120, 0.01);
    // la suerte: orilla y fuerza dan casi seguro; una sola, a veces
    const prob = (enZona ? 0.55 : 0.08) + (orilla ? 0.42 : 0.05) + Math.min(0.2, this.intentos * 0.04);
    const volteo = Math.random() < prob;
    if (volteo) {
      this.tweens.add({ targets: this.rojo, scaleY: 0, y: 130, duration: 140, yoyo: false, onComplete: () => {
        this.rojo.setTexture('ddakji_rojo_atras');
        this.tweens.add({ targets: this.rojo, scaleY: 0.7, y: 148, duration: 160 });
      } });
      this.tweens.add({ targets: azul, alpha: 0, duration: 400, delay: 200 });
      await esperar(this, 500);
      await cartel(this, '¡VOLTEADO!', '', { ms: 1000, color: 0x23b39c });
      azul.destroy();
      return true;
    }
    this.tweens.add({ targets: this.rojo, y: 144, duration: 80, yoyo: true });
    await esperar(this, 300);
    await cartel(this, 'NO SE VOLTEÓ', enZona ? 'apunta más a la orilla' : orilla ? 'la fuerza no era la justa' : 'apunta a la orilla y mide la fuerza', { ms: 1200, color: 0xff8fb5 });
    azul.destroy();
    return false;
  }

  async castigo() {
    const { yo, rec } = this;
    await this.caminar(rec, yo.x + 34, yo.y, 300);
    rec.anim('idle', 'left');
    if (ninas()) {
      rec.anim('point', 'left');
      bloque(this, ['E6', 0.05], ['G6', 0.05], ['E6', 0.05], ['G6', 0.05], ['E6', 0.05], ['G6', 0.08]);
      yo.anim('laugh', 'right');
      await esperar(this, 900);
      await this.decir([[yo.id, 'feliz', ['¡Jajaja! ¡Basta, basta!', '¡Nooo, cosquillas no! ¡Jajaja!', '¡Ya! ¡Otra vez!'][this.intentos % 3]]]);
    } else {
      await rec.hacer('jab', 'left');
      sfx(this, 'golpe_pesado', 0.8);
      destello(this, 0xff3355, 90, 0.4);
      sacudir(this, 180, 0.015);
      yo.anim('hit', 'right');
      await esperar(this, 600);
      await this.decir([[yo.id, 'dolor', ['¡Ay! ¡Qué mano tan pesada!', '¡Coño! Otra vez. Esta sí va.', '¡Ya va! Una más y te volteo el sobre.'][this.intentos % 3]]]);
    }
    await this.caminar(rec, 360, 230, 300);
    rec.anim('idle', 'left');
    yo.anim('idle', 'right');
  }
}

// ---------------------------------------------------------------- la llegada: tarjeta, casa, lancha, isla, gas, dormitorio

export class Llegada extends Historia {
  constructor() { super('Llegada'); }
  async correr() {
    const W = this.scale.width, H = this.scale.height;
    // la tarjeta
    this.fondo('metro').setAlpha(0.3);
    const tarjeta = this.add.container(W / 2, H / 2 - 20).setDepth(100);
    const papel = this.add.rectangle(0, 0, 150, 86, 0xd8c39a).setStrokeStyle(2, 0x6a5a3a);
    const s1 = this.add.image(-34, 0, 'circulo').setTint(0x3a2a18).setScale(1.4);
    const s2 = this.add.image(0, 0, 'triangulo').setTint(0x3a2a18).setScale(1.4);
    const s3 = this.add.image(34, 0, 'cuadrado').setTint(0x3a2a18).setScale(1.4);
    tarjeta.add([papel, s1, s2, s3]);
    this.capa.push(tarjeta);
    tarjeta.setScale(0.2); this.tweens.add({ targets: tarjeta, scale: 1, duration: 500, ease: 'Back.easeOut' });
    await this.pausa(600);
    await this.decir([
      ['reclutador', 'neutral', 'Hay un juego más grande. 45.600 millones de wones para el ganador.'],
      ['reclutador', 'feliz', 'Llame a este número. Y lleve a su familia. Los juegos son más divertidos en familia.'],
    ]);
    // la vuelta de la tarjeta: el número
    await new Promise((ok) => this.tweens.add({ targets: tarjeta, scaleX: 0, duration: 200, onComplete: ok }));
    [s1, s2, s3].forEach((s) => s.setVisible(false));
    const num = this.add.bitmapText(0, 0, 'fuente_ui', '010-4562-0222').setOrigin(0.5).setTint(0x3a2a18).setScale(1.5);
    tarjeta.add(num);
    await new Promise((ok) => this.tweens.add({ targets: tarjeta, scaleX: 1, duration: 200, onComplete: ok }));
    await this.pausa(1200);
    await this.fundido();

    // la casa: la familia y Thor
    musica('noche');
    this.fondo('casa');
    const r = this.actor('rick', 170, 232, 'right'), s = this.actor('steph', 205, 236, 'left');
    const so = this.actor('sophie', 250, 238, 'left'), a = this.actor('alana', 280, 240, 'left');
    const thor = this.actor('thor', 340, 236, 'left');
    thor.anim('wag', 'left');
    await this.decir([
      ['steph', 'susto', '¿Y esa tarjeta tan rara? ¿Un círculo, un triángulo y un cuadrado?'],
      ['rick', 'feliz', 'Un señor en el metro. Dice que si ganamos unos jueguitos nos vamos con una millonada.'],
      ['steph', 'enojo', 'Eso suena a estafa, mi amor. Pero bueno... nadie ha ganado tanto jugando en familia como nosotros.'],
      ['sophie', 'feliz', '¡Yo quiero ir! ¡Soy la mejor en juegos!'],
      ['alana', 'feliz', '¡Y yo! ¿Thor puede venir?'],
      ['rick', 'neutral', 'Thor se queda cuidando la casa. Le dejamos comida para una semana.'],
    ]);
    if (!this.saltar) { thor.anim('bark', 'left'); sfx(this, 'ladrido', 0.6); await this.pausa(700); thor.anim('sit', 'left'); }
    await this.decir([['alana', 'triste', 'Chao, Thor. Ya volvemos con muchos millones para comprarte huesos.']]);
    await this.fundido();

    // la lancha en la tormenta
    musica('tormenta');
    const mar = ambiente(this, 'mar', 0.6);
    const viento = ambiente(this, 'viento', 0.35);
    const f = this.fondo('lancha');
    const parar = lluvia(this, 110);
    this.tweens.add({ targets: f, y: f.y + 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: f, angle: 0.8, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const t = this.texto('Esa noche, una lancha negra los recogió en el muelle...', 30, 0xd8d0c0);
    const rayos = this.time.addEvent({ delay: 2600, loop: true, callback: () => { relampago(this); sacudir(this, 250, 0.006); } });
    await this.pausa(1500);
    relampago(this);
    await this.pausa(900);
    t.destroy();
    await this.decir([
      ['alana', 'susto', '¡Papá! ¡Las olas están gigantes!'],
      ['steph', 'susto', '¡Agárrense duro del barco! ¡Sophie, agarra a tu hermana!'],
      ['rick', 'feliz', '¡Tranquilas, que esto es igualito al ferry a Margarita!'],
      ['sophie', 'enojo', '¡Papá, el ferry a Margarita no tiene rayos!'],
    ], { arriba: true });
    await this.pausa(400);
    await this.fundido(700);
    rayos.remove();
    parar();

    // la isla
    const fi = this.fondo('isla');
    fi.setScale(1.15);
    this.tweens.add({ targets: fi, scale: 1, duration: 4000, ease: 'Sine.easeOut' });
    const p2 = lluvia(this, 70);
    relampago(this);
    await this.pausa(800);
    await this.decir([
      ['sophie', 'susto', '¡Miren! ¡Una isla! Y hay gente vestida de rosado esperando en el muelle...'],
      ['guardia_triangulo', 'neutral', 'Bienvenidos, jugadores. Por favor, no se resistan.'],
      ['rick', 'susto', '¿Por qué tienen máscaras? ¿Eso es un triángulo?'],
    ], { arriba: true });
    p2();
    await this.fundido(400);

    // el gas
    this.fondo('gas');
    await this.decir([['guardia_cuadrado', 'neutral', 'Ahora duerman. Mañana empieza el juego.']], { arriba: true });
    if (!this.saltar) {
      const niebla = this.add.rectangle(W / 2, H / 2, W, H, 0xe0457b, 0).setDepth(400);
      this.capa.push(niebla);
      tono(220, 1.5, 'cuerdas', 0.08);
      this.tweens.add({ targets: niebla, fillAlpha: 0.75, duration: 1800 });
      await this.pausa(1900);
      const zz = this.texto('Z  z  z . . .', H / 2, 0xffffff, 2);
      await this.pausa(1200);
    }
    if (mar) mar.stop(); if (viento) viento.stop();
    await this.fundido(900);

    // el despertar: el dormitorio con el Danubio Azul
    musica('danubio');
    this.fondo('dormitorio');
    const ids = jugadoresNPC();
    for (let i = 0; i < 16; i++) {
      const x = 40 + (i % 8) * 56 + (Math.random() * 10 - 5), y = 185 + Math.floor(i / 8) * 40 + Math.random() * 6;
      const n = this.actor(ids[i % ids.length], x, y, i % 3 ? 'up' : 'down');
      n.anim(i % 4 ? 'idle' : 'sad');
    }
    const fam = ['rick', 'steph', 'sophie', 'alana'].map((id, i) => this.actor(id, 200 + i * 26, 250, 'up'));
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
    // el guardia del cuadrado y las reglas
    const g = this.actor('guardia_cuadrado', 240, 168, 'down');
    const g1 = this.actor('guardia_circulo', 150, 172, 'down'), g2 = this.actor('guardia_triangulo', 330, 172, 'down');
    sfx(this, 'pitazo_largo', 0.5);
    await this.decir([
      ['guardia_cuadrado', 'neutral', 'Bienvenidos, jugadores. Tienen 6... perdón, 11 juegos por delante.'],
      ['guardia_cuadrado', 'neutral', 'Regla 1: un jugador no puede dejar de jugar.'],
      ['guardia_cuadrado', 'neutral', 'Regla 2: el jugador que se niegue a jugar será eliminado.'],
      ['guardia_cuadrado', 'neutral', 'Regla 3: los juegos se pueden terminar si la mayoría vota.'],
      ['guardia_cuadrado', 'neutral', 'Por cada jugador eliminado, el chanchito suma 100 millones de wones.'],
      ninas()
        ? ['alana', 'susto', '¿Eliminado? ¿Eso es que lo mandan a dormir temprano?']
        : ['steph', 'susto', 'Rick... ¿qué significa "eliminado"?'],
      ['rick', 'neutral', 'No sé, pero mejor no averiguarlo. Pase lo que pase, estamos juntos.'],
    ]);
    await this.fundido(600);

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
    this.fondo('escaleras');
    await this.pausa(1800);
    this.terminar();
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
    ['sophie', 'neutral', 'Hay que mirar con cuidado. El vidrio bueno brilla distinto.'],
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
    this.add.rectangle(W / 2, 135, W, 270, 0x081028, 0.45).setDepth(-60);
    const fam = ['rick', 'steph', 'sophie', 'alana'].map((id, i) => this.actor(id, 170 + i * 32, 240 - (i % 2) * 4, i < 2 ? 'right' : 'left'));
    const vivos = Math.max(2, 456 - Math.round(E.pozo / 100_000_000));
    const t = this.texto(`NOCHE ${n} · Quedan ${vivos} jugadores · ${wones()}`, 26, 0xf2c230);
    if (n === 3 || n === 10) { const ab = this.actor(n === 3 ? 'j_abuelo' : 'front_man', 330, 236, 'left'); }
    await this.pausa(600);
    await this.decir(NOCHES[n] || []);
    t.destroy();
    if (VOTOS.includes(n)) await this.votar(n);
    // la mañana
    if (!this.saltar) {
      await this.fundido(500);
      musica('danubio');
      this.fondo('escaleras');
      const prox = JUEGOS[n];
      this.texto('A la mañana siguiente...', 120, 0xffffff);
      if (prox) this.texto(`JUEGO ${n + 1}: ${prox.titulo}`, 140, 0xe0457b);
      await this.pausa(2200);
    }
    this.terminar();
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
    const r = await elegir(this, this.inp, ['O  · Seguir jugando', 'X  · Terminar el juego'], { titulo: 'TU VOTO', ancho: 210, y: 210 });
    // el conteo: siempre termina en O por un voto, como en la serie
    const mitad = Math.floor(total / 2);
    const o = mitad + 1, x = total - o;
    const to = this.texto('O: 0', 120, 0x5aa0ff, 2), tx = this.texto('X: 0', 150, 0xff4d6d, 2);
    to.setX(W / 2 - 60); tx.setX(W / 2 + 60); tx.setY(120);
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
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.5).setDepth(-50);
    const titulo = ninas() ? '¡A DORMIR!' : 'ELIMINADO';
    const tt = this.add.bitmapText(W / 2, 70, 'fuente_titulo', titulo).setOrigin(0.5).setScale(2).setTint(ninas() ? 0xff8fb5 : 0xff3355);
    this.capa.push(tt);
    if (!ninas()) sfx(this, 'pistola', 0.6);
    else bloque(this, ['C5', 0.15, 'campana'], ['G4', 0.15, 'campana'], ['E4', 0.3, 'campana']);
    await this.pausa(900);
    await this.decir([
      ['front_man', 'neutral', 'Se acabaron tus tres vidas, jugador ' + NUMEROS[E.perfil] + '.'],
      ['front_man', 'neutral', 'Pero esta isla es generosa. Vuelves al primer juego. Con el chanchito vacío.'],
      [E.perfil, 'enojo', '¡Esta vez sí vamos a ganar!'],
    ]);
    this.terminado = true;
    reiniciarDesdeJuego1(this);
  }
}

// ---------------------------------------------------------------- el final

export class Final extends Historia {
  constructor() { super('Final'); }
  async correr() {
    this.puedeSaltar = false;
    const W = this.scale.width, H = this.scale.height;
    E.pozo = 45_600_000_000;
    guardar();
    musica('danubio');
    this.fondo('votacion');
    const fam = ['rick', 'steph', 'sophie', 'alana'].map((id, i) => this.actor(id, 190 + i * 30, 236, 'up'));
    fam.forEach((f) => f.anim('celebrate'));
    const t = this.texto(wones(), 40, 0xf2c230, 2);
    // la lluvia de billetes
    for (let i = 0; i < 6; i++) this.time.delayedCall(i * 300, () => chorro(this, W / 2, 60, 20, [0x9ed08a, 0x5aa66a, 0xf2c230], 120, { g: 120, vida: 2200 }));
    fanfarria();
    await this.pausa(1500);
    await this.decir([
      ['front_man', 'neutral', 'Lo lograron. 45.600 millones de wones para la Familia GG.'],
      ['front_man', 'neutral', 'En todos estos años, nadie ganó jugando en equipo. Ustedes nunca se soltaron la mano.'],
      ['rick', 'feliz', 'Así somos los GG. Ni la isla, ni la muñeca, ni usted nos separan.'],
      ['steph', 'feliz', 'Ahora llévenos a la casa. Y apúrese, que Thor nos está esperando.'],
    ]);
    await this.fundido(800);
    musica('flauta');
    const am = this.fondo('amanecer');
    await this.pausa(400);
    await this.decir([
      ['alana', 'feliz', '¡Ya no hay tormenta! ¡Sale el sol!'],
      ['sophie', 'feliz', 'Papá... ¿qué vamos a hacer con tanta plata?'],
      ['rick', 'feliz', 'Primero, un montón de huesos para Thor. Después vemos.'],
    ], { arriba: true });
    await this.fundido(800);
    this.fondo('casa');
    const thor = this.actor('thor', 470, 238, 'left');
    const fam2 = ['rick', 'steph', 'sophie', 'alana'].map((id, i) => this.actor(id, 120 + i * 28, 238, 'right'));
    await this.caminar(thor, 260, 238, 1200, 'run');
    thor.anim('jump', 'left');
    sfx(this, 'ladrido', 0.7);
    await this.pausa(500);
    thor.anim('wag', 'left');
    fam2.forEach((f) => f.anim('celebrate'));
    await this.decir([
      ['alana', 'feliz', '¡THOOOR! ¡Te extrañé!'],
      ['sophie', 'feliz', '¡Thor, somos millonarios!'],
      ['steph', 'feliz', 'Y lo mejor: volvimos los cuatro. Juntos.'],
      ['rick', 'feliz', 'Familia GG. Siempre juntos. Fin.'],
    ]);
    await this.fundido(900);
    // créditos
    logo(this, W / 2, 60).forEach((o) => this.capa.push(o));
    const lineas = [
      'UN JUEGO PARA LA FAMILIA GG',
      'Rick · Steph · Sophie · Alana · y Thor',
      '',
      'Personajes: PixelForja (motor propio, arte LPC)',
      'Escenarios de la intro: Higgsfield',
      'Música: sintetizada en el navegador',
      'El Danubio Azul: Johann Strauss II',
      '',
      'Inspirado en El Juego del Calamar (Netflix)',
      'Hecho con cariño en Ho Chi Minh City',
    ];
    lineas.forEach((l, i) => this.texto(l, 140 + i * 11, i === 0 ? 0xe0457b : 0xffffff));
    await this.pausa(1000);
    this.texto('A: volver al menú', H - 10, 0x8a8a9a);
    await esperarA(this, this.inp);
    E.paso = 0;
    guardar();
    pararMusica();
    this.cameras.main.fadeOut(500);
    this.time.delayedCall(520, () => this.scene.start('Titulo'));
  }
}
