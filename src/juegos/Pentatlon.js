// Juego 5: Pentatlón de seis piernas (temporada 2). El equipo va amarrado por los tobillos y pasa por cinco juegos
// coreanos: ddakji, piedra voladora, gonggi, trompo y jegi. Tú haces cada prueba (un foco de luz te sigue) y la
// familia, amarrada a ti, te acompaña, celebra o se lamenta. Si fallas, se repite. Hay un solo reloj para las cinco.
// Cada prueba se ve: el sobre que vuela y voltea al otro, la piedra que tumba a la de pie, las piedritas del gonggi,
// el trompo que gira y el jegi que sube con cada patada.

import Phaser from 'phaser';
import { Juego } from '../core/juego.js';
import { Actor } from '../core/actor.js';
import { E, dif, nombre, NUMEROS } from '../core/estado.js';
import { sfx, tono, musica } from '../core/sonido.js';
import { chorro, sacudir, fxSobre } from '../core/efectos.js';
import { cartel, esperar } from '../core/dialogo.js';
import { barra, atrapar, machacar } from '../core/mini.js';
import { luciernagas, rayos as rayosLuz } from '../core/vivo.js';
import { lienzo } from '../escenas/pintura.js';
import { polvo } from '../core/actor.js';

// cada estación: dónde se para quien juega, hacia dónde mira y dónde queda el minijuego en pantalla (lejos de la acción)
const ESTACIONES = [
  { id: 'ddakji', titulo: 'DDAKJI', x: 176, y: 272, dir: 'left', ui: 470, cx: 158, cy: 250 },
  { id: 'piedra', titulo: 'PIEDRA VOLADORA', x: 318, y: 200, dir: 'left', ui: 480, cx: 270, cy: 172 },
  { id: 'gonggi', titulo: 'GONGGI', x: 398, y: 206, dir: 'up', ui: 150, cx: 400, cy: 168 },
  { id: 'trompo', titulo: 'TROMPO', x: 226, y: 300, dir: 'right', ui: 480, cx: 270, cy: 272 },
  { id: 'jegi', titulo: 'JEGI', x: 530, y: 262, dir: 'down', ui: 160, cx: 530, cy: 222 },
];
const COLORES_GONGGI = ['#e0457b', '#2fd4b4', '#f7c948', '#6aa8ff', '#b58cff'];

export class Pentatlon extends Juego {
  constructor() { super('Pentatlon'); }
  opcionesEntrada() { return { palanca: false }; }
  ambiente() { return { vineta: 0.35, motas: 10 }; }

  armar() {
    const W = this.scale.width, H = this.scale.height;
    this.texturas();
    this.add.image(W / 2, H / 2, 'pentatlon').setDepth(-100);
    // el equipo: tú adelante, la familia y Camila amarradas detrás
    const resto = ['rick', 'steph', 'sophie', 'alana'].filter((id) => id !== E.perfil);
    this.crearJugador(40, 330, 'right');
    this.companeros = [...resto, 'j_camila'].map((id, i) => new Actor(this, id, 20 - i * 16, 330 + (i % 2) * 6, { dir: 'right' }));
    this.familia = this.companeros.filter((a) => a.id !== 'j_camila');
    this.equipo = [this.jugador, ...this.companeros];
    this.cinta = this.add.graphics();
    // el foco de luz que sigue a quien juega
    this.foco = this.add.image(0, 0, 'pt5_foco').setDepth(5000).setAlpha(0);
    // la interfaz va en su propia cámara: la del mundo se acerca a cada prueba
    this.camaraUI();
    this.tiempo = dif(160, 130, 105);
    this.tiempoTotal = this.tiempo;
    this.hechas = 0;
    this.fallos = 0;
  }

  /** las piezas de cada juego, en pixel art */
  texturas() {
    if (!this.textures.exists('pt5_foco')) {
      const t = this.textures.createCanvas('pt5_foco', 1280, 720), c = t.getContext();
      const g = c.createRadialGradient(640, 360, 50, 640, 360, 130);
      g.addColorStop(0, 'rgba(10,6,20,0)'); g.addColorStop(1, 'rgba(10,6,20,0.55)');
      c.fillStyle = g; c.fillRect(0, 0, 1280, 720); t.refresh();
    }
    const sobre = (key, a, b, c2) => lienzo(this, key, 18, 13, (P) => {
      P.r(0, 0, 18, 13, '#2a1418');
      P.r(1, 1, 16, 11, b);
      P.columnas(1, 17, (x) => 1, (x) => 1 + Math.min(x - 1, 17 - x) * 0.62, a);
      P.columnas(1, 17, (x) => 12 - Math.min(x - 1, 17 - x) * 0.62, () => 12, a);
      P.columnas(1, 9, (x) => 6.5 - (x - 1) * 0.65, (x) => 6.5 + (x - 1) * 0.65, c2);
      P.lin(1, 1, 16, 11, '#2a1418'); P.lin(16, 1, 1, 11, '#2a1418');
      P.r(2, 2, 5, 1, '#ffffff');
    });
    sobre('pt5_azul', '#3d6fd6', '#2a52a8', '#5a8cf0');
    sobre('pt5_rojo', '#d63d4a', '#a82a36', '#f05a68');
    sobre('pt5_rojo_atras', '#a82a36', '#d63d4a', '#8a1f2a');
    lienzo(this, 'pt5_piedra_pie', 14, 22, (P) => {
      P.columnas(0, 14, (x) => 5 - Math.sin((x / 13) * Math.PI) * 5, () => 22, '#3a3e48');
      P.columnas(1, 13, (x) => 6 - Math.sin((x / 13) * Math.PI) * 5, () => 21, '#8a92a0');
      P.columnas(2, 6, (x) => 7 - Math.sin((x / 13) * Math.PI) * 5, () => 20, '#a8b0bc');
      P.r(9, 4, 3, 16, '#6a7280'); P.r(4, 12, 2, 2, '#6a7280');
    });
    lienzo(this, 'pt5_piedra', 9, 6, (P) => { P.elip(4.5, 3, 4, 3, '#3a3e48'); P.elip(4.5, 2.5, 3, 2, '#9aa2ae'); P.r(3, 1, 2, 1, '#c8d0da'); });
    COLORES_GONGGI.forEach((col, i) => lienzo(this, 'pt5_gonggi_' + i, 5, 5, (P) => { P.r(0, 1, 5, 3, '#2a1a10'); P.r(1, 0, 3, 5, '#2a1a10'); P.r(1, 1, 3, 3, col); P.p(1, 1, '#ffffff'); }));
    // el trompo: cuatro cuadros con la franja que gira
    for (let f = 0; f < 4; f++) {
      lienzo(this, 'pt5_trompo_' + f, 16, 18, (P) => {
        P.columnas(1, 15, () => 2, (x) => 9 + (7 - Math.abs(x - 8)) * 0.9, '#2a1a10');
        P.columnas(2, 14, () => 3, (x) => 9 + (6 - Math.abs(x - 8)) * 0.9, '#e0457b');
        P.r(2, 3, 12, 2, '#f7c948');
        for (let k = 0; k < 3; k++) { const x = 2 + ((k * 4 + f) % 12); P.r(x, 5, 2, 6, '#2fd4b4'); }
        P.r(7, 0, 2, 3, '#8a5a2a'); P.r(7, 15, 2, 3, '#4a4a52');
        P.r(3, 3, 3, 1, '#ffffff');
      });
    }
    if (!this.anims.exists('pt5_gira')) this.anims.create({ key: 'pt5_gira', frames: [0, 1, 2, 3].map((f) => ({ key: 'pt5_trompo_' + f })), frameRate: 24, repeat: -1 });
    lienzo(this, 'pt5_jegi', 11, 15, (P) => {
      P.lin(5, 7, 1, 0, '#e0457b'); P.lin(5, 7, 3, 0, '#f7c948'); P.lin(5, 7, 5, 0, '#2fd4b4'); P.lin(5, 7, 7, 0, '#6aa8ff'); P.lin(5, 7, 9, 0, '#e0457b');
      P.elip(5, 11, 4, 3, '#3a2a18'); P.elip(5, 10.5, 3, 2, '#d8c8a0'); P.r(4, 10, 2, 1, '#8a6a3a');
    });
  }

  reglas() {
    return {
      objetivo: ['Cinco juegos coreanos amarrados por los tobillos, con un solo reloj.', 'Tú haces cada prueba: mira el foco. A en el momento justo, o machaca cuando lo pida.', 'Si fallas, se repite. ¡El reloj sigue corriendo!'],
      controles: [['a', 'Tirar / atrapar / patear']],
      frase: ['j_camila', 'feliz', 'Las cinco pruebas son tuyas, ' + nombre(E.perfil) + '. Nosotros vamos amarrados contigo... ¡y echando porras!'],
    };
  }

  decorar() {
    rayosLuz(this, { x: 20, y: 20, angulo: 0.75, n: 3, largo: 300, ancho: 24, color: 0xfff2c8, alfa: 0.07 });
    luciernagas(this, { n: 14, area: [40, 60, 300, 200], color: 0xfff0c0, tam: 1, prof: 3000 });
  }

  empezar() { musica('guardias'); this.correrEstaciones(); }

  paso(dt) {
    this.tiempo -= dt;
    this.hud.setTiempo(this.tiempo);
    this.pintarCinta();
    if (this.foco.alpha > 0) this.foco.setPosition(this.jugador.x, this.jugador.y - 24);
    if (this.tiempo <= 0 && !this.terminado) this.perder('SE ACABÓ EL TIEMPO');
  }

  /** la cinta que amarra los tobillos: del jugador al primero, y así */
  pintarCinta() {
    const g = this.cinta, e = this.equipo;
    g.clear();
    for (let i = 0; i < e.length - 1; i++) {
      const a = e[i], b = e[i + 1];
      g.lineStyle(2, 0x2a1a10, 0.6); g.lineBetween(a.x, a.y - 2, b.x, b.y - 2);
      g.lineStyle(1, 0xf4f0e8); g.lineBetween(a.x, a.y - 3, b.x, b.y - 3);
    }
    g.setDepth(Math.min(...e.map((a) => a.y)) - 1);
  }

  /** el equipo camina amarrado hasta la estación: tú adelante, ellos detrás en fila */
  caminar(est) {
    return new Promise((ok) => {
      const dur = 1100;
      // tú en la estación; los demás a un lado, nunca delante de ti (para que siempre se vea lo que haces)
      const lado = { left: [1, 0], right: [-1, 0], up: [1, 0], down: [-1, 0] }[est.dir];
      this.equipo.forEach((a, i) => {
        const tx = i === 0 ? est.x : est.x + lado[0] * (14 + i * 17), ty = i === 0 ? est.y : est.y - 6 + (i % 2) * 8 + (est.dir === 'up' ? 4 : 0);
        a.mirar(tx - a.x, ty - a.y); a.anim('walk');
        this.tweens.add({ targets: a, px: tx, py: ty, duration: dur, ease: 'Sine.easeInOut', onComplete: () => { if (i === 0) a.anim('idle', est.dir); else { a.mirar(est.x - a.x, 0); a.anim('idle'); } } });
      });
      // pasitos al ritmo (van amarrados)
      [0, 300, 600, 900].forEach((t) => this.time.delayedCall(t, () => sfx(this, 'paso_tierra_' + (t / 300) % 2, 0.25)));
      this.time.delayedCall(dur + 40, ok);
    });
  }

  foco1(on) { this.tweens.add({ targets: this.foco, alpha: on ? 1 : 0, duration: 300 }); }

  /** la familia reacciona a lo que hiciste */
  reaccion(bien) {
    this.companeros.forEach((a, i) => this.time.delayedCall(i * 90, () => a.anim(bien ? 'celebrate' : 'sad', null, true)));
    if (bien) { sfx(this, 'publico_ooh', 0.25); this.time.delayedCall(1300, () => this.companeros.forEach((a) => a.anim('idle'))); }
    else this.time.delayedCall(1100, () => this.companeros.forEach((a) => a.anim('idle')));
  }

  async correrEstaciones() {
    for (const est of ESTACIONES) {
      if (this.terminado) return;
      this.hud.setExtra(`${this.hechas + 1} / 5  ·  ${est.titulo}`, 0xf7c948);
      await this.caminar(est);
      if (this.terminado) return;
      this.foco1(true);
      // la cámara se acerca a la prueba
      this.acercar(est.cx, est.cy, 2, 600);
      await esperar(this, 450);
      let ok = false;
      while (!ok && !this.terminado) {
        ok = await this[est.id](est);
        if (this.terminado) return;
        this.reaccion(ok);
        if (!ok) {
          this.fallos++;
          tono(200, 0.15, 'cuadrada', 0.08);
          this.jugador.anim('sad', null, true);
          await cartel(this, '¡OTRA VEZ!', 'el reloj sigue corriendo', { ms: 900, color: 0xff8fb5 });
          this.jugador.anim('idle', est.dir);
        }
      }
      this.hechas++;
      this.foco1(false);
      this.acercar(0, 0, 1, 500);
      this.jugador.anim('celebrate', null, true);
      tono(1320, 0.15, 'campana', 0.12);
      await cartel(this, `${this.hechas} / 5`, est.titulo + ' ¡listo!', { ms: 900, color: 0x2fd4b4 });
    }
    if (!this.terminado) this.ganar({ lineas: [['j_camila', 'feliz', '¡Las cinco! ¡Y sin soltarnos los tobillos!']] });
  }

  estrellas() {
    return (this.fallos === 0 ? 3 : this.fallos <= 2 ? 2 : 1) - Math.max(0, this.vidasInicio - E.vidas);
  }

  /** algo que vuela en arco de (x0,y0) a (x1,y1), con su sombra y girando */
  arco(img, x1, y1, { alto = 40, dur = 500, giro = 0 } = {}) {
    return new Promise((ok) => {
      const x0 = img.x, y0 = img.y;
      const sombra = this.add.ellipse(x0, y0 + 20, 8, 3, 0x000000, 0.3).setDepth(img.depth - 1);
      this.tweens.addCounter({
        from: 0, to: 1, duration: dur, onUpdate: (tw) => {
          const t = tw.getValue();
          img.x = x0 + (x1 - x0) * t; img.y = y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * alto;
          img.angle = giro * t;
          sombra.setPosition(img.x, y0 + 20 + (y1 - y0) * t * 1.05);
        },
        onComplete: () => { sombra.destroy(); ok(); },
      });
    });
  }

  impacto(x, y, id = 'onomatopeya_paf') {
    sacudir(this, 120, 0.006);
    polvo(this, x, y, true); polvo(this, x, y, false);
    if (this.textures.exists('fx_' + id)) { const s = this.add.sprite(x, y - 18, 'fx_' + id).setDepth(6000); s.play('fx_' + id); s.once('animationcomplete', () => s.destroy()); }
  }

  // ---------------------------------------------------------------- los cinco juegos

  /** DDAKJI: tiras tu sobre azul sobre el rojo; si lo volteas, pasas */
  async ddakji(est) {
    const j = this.jugador;
    const rojo = this.add.image(est.x - 48, est.y - 2, 'pt5_rojo').setDepth(est.y - 3);
    const r = await barra(this, this.inp, { vel: dif(1.1, 1.5, 1.9), ideal: 0.85, ancho: dif(0.24, 0.18, 0.13), texto: 'FUERZA DEL TIRO', x: est.ui, y: 70 });
    j.anim('cap_pitch', 'left', true);
    await esperar(this, 160);
    const azul = this.add.image(j.x - 8, j.y - 34, 'pt5_azul').setDepth(est.y + 10);
    sfx(this, 'lanzar', 0.4);
    await this.arco(azul, rojo.x + 2, rojo.y - 2, { alto: 34, dur: 340, giro: -540 });
    sfx(this, 'chapa', 0.9);
    this.impacto(rojo.x, rojo.y, 'onomatopeya_paf');
    const ok = r.ok || Math.random() < 0.12;
    if (ok) {
      // el rojo da la vuelta en el aire y cae del otro lado
      this.tweens.add({ targets: azul, x: azul.x + 14, alpha: 0.7, duration: 200 });
      await new Promise((res) => this.tweens.add({ targets: rojo, y: rojo.y - 18, scaleY: 0, duration: 140, ease: 'Quad.easeOut', onComplete: res }));
      rojo.setTexture('pt5_rojo_atras');
      await new Promise((res) => this.tweens.add({ targets: rojo, y: rojo.y + 18, scaleY: 1, duration: 200, ease: 'Bounce.easeOut', onComplete: res }));
      sfx(this, 'chapa', 0.5);
      fxSobre(this, j, 'exclamacion');
    } else {
      this.tweens.add({ targets: rojo, y: rojo.y - 3, duration: 70, yoyo: true });
    }
    await esperar(this, 700);
    this.tweens.add({ targets: [rojo, azul], alpha: 0, duration: 250, onComplete: () => { rojo.destroy(); azul.destroy(); } });
    return ok;
  }

  /** PIEDRA VOLADORA: apuntas y mides la fuerza; la piedra en arco tumba a la de pie */
  async piedra(est) {
    const j = this.jugador;
    const blanco = this.add.image(est.x - 98, est.y - 40, 'pt5_piedra_pie').setOrigin(0.5, 1).setDepth(est.y - 40);
    const b1 = await barra(this, this.inp, { vel: dif(0.9, 1.2, 1.5), ideal: 0.5, ancho: dif(0.26, 0.2, 0.15), texto: 'APUNTA', x: est.ui, y: 70 });
    const b2 = await barra(this, this.inp, { vel: dif(1.1, 1.4, 1.7), ideal: 0.75, ancho: dif(0.26, 0.2, 0.15), texto: 'FUERZA', x: est.ui, y: 70 });
    j.anim('tejo_throw', 'left', true);
    await esperar(this, 220);
    const ok = b1.ok && b2.ok;
    const piedra = this.add.image(j.x - 10, j.y - 30, 'pt5_piedra').setDepth(est.y + 10);
    sfx(this, 'lanzar', 0.45);
    // si no le pega: se va hacia el lado del error, corta o larga según la fuerza
    const dx = ok ? 0 : (b1.v - 0.5) * 70, corto = ok ? 0 : (b2.v - 0.75) * 60;
    await this.arco(piedra, blanco.x + dx - corto, blanco.y - 6 + dx * 0.2, { alto: 46, dur: 520, giro: 720 });
    if (ok) {
      sfx(this, 'golpe', 0.8);
      this.impacto(blanco.x, blanco.y - 8, 'onomatopeya_pow');
      // la piedra de pie se va de espaldas
      this.tweens.add({ targets: blanco, angle: -84, duration: 380, ease: 'Bounce.easeOut' });
      this.tweens.add({ targets: piedra, x: piedra.x + 12, y: piedra.y + 6, angle: piedra.angle + 200, duration: 300 });
    } else {
      sfx(this, 'paso_tierra_0', 0.6);
      polvo(this, piedra.x, piedra.y, dx > 0);
      this.tweens.add({ targets: piedra, x: piedra.x - 10, angle: piedra.angle - 180, duration: 400, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: blanco, angle: 4, duration: 90, yoyo: true, repeat: 1 });
    }
    await esperar(this, 900);
    this.tweens.add({ targets: [blanco, piedra], alpha: 0, duration: 250, onComplete: () => { blanco.destroy(); piedra.destroy(); } });
    return ok;
  }

  /** GONGGI: con cada acierto, una piedrita salta de la mesa a tu mano */
  async gonggi(est) {
    const j = this.jugador;
    const piedras = COLORES_GONGGI.map((_, i) => this.add.image(382 + i * 7 + (i % 2) * 2, 142 + (i % 2) * 4, 'pt5_gonggi_' + i).setDepth(190));
    const mano = { x: j.x + 4, y: j.y - 34 };
    // la que se tira para arriba
    const arriba = this.add.image(mano.x, mano.y, 'pt5_gonggi_0').setDepth(6000).setVisible(false);
    let n = 0;
    const lanzar = () => {
      j.anim('throw', 'up', true);
      arriba.setVisible(true).setPosition(mano.x, mano.y);
      this.tweens.add({ targets: arriba, y: mano.y - 40, duration: 260, yoyo: true, ease: 'Sine.easeOut' });
    };
    lanzar();
    const ok = await atrapar(this, this.inp, {
      veces: dif(3, 4, 4), vel: dif(0.9, 1.15, 1.4), zona: dif(0.26, 0.2, 0.15), texto: 'ATRAPA', color: 0x5aa0ff, y: 70, x: est.ui,
      alAcertar: () => {
        const p = piedras[1 + (n++ % 4)];
        if (p) this.arco(p, mano.x, mano.y, { alto: 16, dur: 220 }).then(() => p.setVisible(false));
        tono(1200 + n * 100, 0.04, 'campana', 0.08);
        lanzar();
      },
      alFallar: () => {
        // se le cae: las piedritas ruedan por la mesa
        arriba.setVisible(true);
        this.tweens.add({ targets: arriba, y: mano.y + 30, alpha: 0, duration: 400, ease: 'Quad.easeIn' });
        piedras.forEach((p) => p.visible && this.tweens.add({ targets: p, x: p.x + (Math.random() - 0.5) * 20, y: p.y + Math.random() * 4, duration: 300 }));
        sfx(this, 'paso_tierra_1', 0.4);
      },
    });
    if (ok) { j.anim('celebrate', null, true); fxSobre(this, j, 'exclamacion'); }
    await esperar(this, 700);
    [...piedras, arriba].forEach((p) => p.destroy());
    j.anim('idle', est.dir);
    return ok;
  }

  /** TROMPO: enrollas la cuerda machacando, lo lanzas, y gira (o se cae) en el círculo */
  async trompo(est) {
    const j = this.jugador;
    const enMano = this.add.sprite(j.x + 12, j.y - 28, 'pt5_trompo_0').setDepth(6000).setAngle(-20);
    const cuerda = this.add.graphics().setDepth(6001);
    const enrollar = (k) => {
      cuerda.clear();
      cuerda.lineStyle(1, 0xf4f0e8);
      for (let v = 0; v < Math.floor(k * 6); v++) cuerda.lineBetween(enMano.x - 6, enMano.y - 2 + v, enMano.x + 6, enMano.y - 4 + v);
      j.anim(k > 0 ? 'grab_hold' : 'idle', 'right', false);
    };
    const enrollado = await machacar(this, this.inp, { golpes: dif(12, 16, 20), segundos: 3, texto: 'ENROLLA LA CUERDA', x: est.ui, y: 70, alGolpe: enrollar });
    if (!enrollado) { cuerda.destroy(); enMano.destroy(); return false; }
    const r = await barra(this, this.inp, { vel: dif(1, 1.4, 1.7), ideal: 0.7, ancho: dif(0.26, 0.2, 0.15), texto: '¡LANZA!', x: est.ui, y: 70 });
    cuerda.destroy();
    j.anim('throw', 'right', true);
    sfx(this, 'lanzar', 0.5);
    enMano.setDepth(262);
    await this.arco(enMano, 312, 262, { alto: 30, dur: 380, giro: 360 });
    enMano.setAngle(0);
    sfx(this, 'paso_tierra_0', 0.5);
    polvo(this, 312, 266, true); polvo(this, 312, 266, false);
    enMano.play('pt5_gira');
    // gira: si salió bien, gira largo y se queda de pie; si no, cabecea y se cae
    const tambaleo = this.tweens.add({ targets: enMano, x: { from: 311, to: 313 }, duration: 90, yoyo: true, repeat: -1 });
    const anillo = this.add.ellipse(312, 268, 18, 6).setStrokeStyle(1, 0xffffff, 0.6).setDepth(261);
    this.tweens.add({ targets: anillo, scaleX: 2.2, scaleY: 2.2, alpha: 0, duration: 500, repeat: r.ok ? 3 : 0 });
    if (r.ok) {
      await esperar(this, 1700);
      fxSobre(this, j, 'exclamacion');
      enMano.anims.timeScale = 0.5;
      await esperar(this, 500);
    } else {
      await esperar(this, 600);
      tambaleo.stop();
      enMano.anims.stop();
      this.tweens.add({ targets: enMano, angle: 75, x: 318, y: 266, duration: 300, ease: 'Bounce.easeOut' });
      sfx(this, 'caer_plano', 0.4);
      await esperar(this, 500);
    }
    tambaleo.stop();
    anillo.destroy();
    this.tweens.add({ targets: enMano, alpha: 0, duration: 250, onComplete: () => enMano.destroy() });
    return r.ok;
  }

  /** JEGI: cada acierto es una patada y el jegi sube; si fallas, cae al piso */
  async jegi(est) {
    const j = this.jugador;
    const jegi = this.add.image(j.x + 4, j.y - 6, 'pt5_jegi').setDepth(6000);
    const patear = () => {
      j.anim('kick', 'down', true);
      sfx(this, 'golpe_1', 0.35);
      this.tweens.killTweensOf(jegi);
      jegi.setPosition(j.x + 4, j.y - 8);
      this.tweens.add({ targets: jegi, y: j.y - 70, duration: 340, ease: 'Sine.easeOut', yoyo: true, hold: 60 });
      this.tweens.add({ targets: jegi, angle: { from: -15, to: 15 }, duration: 200, yoyo: true, repeat: 1 });
    };
    patear();
    const ok = await atrapar(this, this.inp, {
      veces: dif(4, 5, 6), vel: dif(0.85, 1.05, 1.25), zona: dif(0.26, 0.2, 0.15), texto: 'PATEA', color: 0xe0457b, y: 70, x: est.ui,
      alAcertar: patear,
      alFallar: () => {
        this.tweens.killTweensOf(jegi);
        this.tweens.add({ targets: jegi, x: j.x + 22, y: j.y + 2, angle: 90, duration: 380, ease: 'Bounce.easeOut' });
        sfx(this, 'paso_tierra_1', 0.4);
      },
    });
    await esperar(this, 700);
    this.tweens.add({ targets: jegi, alpha: 0, duration: 250, onComplete: () => jegi.destroy() });
    j.anim('idle', est.dir);
    void NUMEROS;
    return ok;
  }
}
