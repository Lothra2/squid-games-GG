// La escena base de cada juego: la tarjeta con el objetivo y los controles (con el relevo: B cambia quién juega),
// la cuenta regresiva, el HUD, la pausa, la cámara lenta cuando te eliminan, los resultados con estrellas y premio,
// los récords y la salida de la práctica.
// Cada juego implementa armar() (pone todo), reglas() ({ objetivo, controles, frase }), paso(dt) (la lógica por cuadro)
// y opcionalmente antesDeEmpezar(), empezar(), estrellas() (0 a 3) y ambiente() (opciones de atmósfera).

import Phaser from 'phaser';
import { E, sangre, familiaNPC, guardar, NUMEROS, wones, millones, premio, FAMILIA, nombre, NINAS } from './estado.js';
import { Entrada } from './entrada.js';
import { Hud } from './hud.js';
import { Actor } from './actor.js';
import { hablar, cartel, esperar, elegir } from './dialogo.js';
import { avanzar, perderVida, numeroJuego, JUEGOS } from './flujo.js';
import { musica, pararMusica, fanfarria, despertar, tono, bloque } from './sonido.js';
import { eliminar } from './efectos.js';
import { jugadoresNPC } from './kit.js';
import { texto, panel, ayudas, atmosfera, estrella, COLOR, cadaCuadro } from './ui.js';
import { altavoz, callarAltavoz } from './voz.js';

export class Juego extends Phaser.Scene {
  init(data) {
    this.datos = data || {};
    this.practica = !!this.datos.practica;
    this.jugando = false;
    this.terminado = false;
    this.pausado = false;
    this.eliminadosRonda = 0;
    this.pistasExtra = 0;
    this.avisos = [];
  }

  create() {
    despertar();
    const cam = this.cameras.main;
    cam.setZoom(1);
    cam.fadeIn(400, 0, 0, 0);
    this.anims.globalTimeScale = 1;
    this.events.once('shutdown', () => { this.anims.globalTimeScale = 1; callarAltavoz(); });
    // lo comprado en la máquina de la noche (solo en la historia)
    if (!this.practica && !this.datos.reintento) {
      if (E.compras.vida > 0) { E.compras.vida--; E.vidas = Math.max(E.vidas, 4); }
      this.bonusReloj = E.compras.reloj > 0 ? 15 : 0;
      if (this.bonusReloj) E.compras.reloj--;
      // las pistas compradas se quedan guardadas hasta un juego que las use (puente, galleta, escondite)
      this.pistasExtra = this.usaPistas ? E.compras.pista : 0;
      if (this.usaPistas) E.compras.pista = 0;
      guardar();
    } else {
      this.bonusReloj = this.datos.bonusReloj || 0;
      this.pistasExtra = this.datos.pistasExtra || 0;
    }
    this.inp = new Entrada(this, this.opcionesEntrada ? this.opcionesEntrada() : {});
    this.armar();
    if (typeof this.tiempo === 'number' && this.bonusReloj) this.tiempo += this.bonusReloj;
    this.hud = new Hud(this, { ...(this.opcionesHud ? this.opcionesHud() : {}), alPausar: () => { if (this.jugando && !this.pausado) this.pausar(); } });
    atmosfera(this, this.ambiente ? this.ambiente() : {});
    this.vidasInicio = E.vidas;
    this.presentar();
  }

  async presentar() {
    this.inp.ocultarTactil(false);
    const r = this.reglas();
    await this.tarjeta(r);
    if (this.cambio) return;
    if (r.frase) await hablar(this, this.inp, Array.isArray(r.frase[0]) ? r.frase : [r.frase]);
    if (this.antesDeEmpezar) await this.antesDeEmpezar();
    if (this.terminado) return;
    if (this.cuentaRegresiva !== false) await this.contar();
    this.inp.ocultarTactil(true);
    this.jugando = true;
    if (this.empezar) this.empezar();
  }

  /** la tarjeta del juego: número, nombre, objetivo, controles y quién juega (B lo cambia) */
  tarjeta({ objetivo = [], controles = [] }) {
    return new Promise((ok) => {
      const W = this.scale.width, H = this.scale.height, prof = 9700;
      const n = numeroJuego(this.scene.key);
      const j = JUEGOS[n - 1];
      if (!this.datos.reintento) altavoz(`Juego ${n}. ${j.titulo.toLowerCase()}.`, { tono: 0.5 });
      const objs = [];
      const fijo = (o) => { o.setScrollFactor(0).setDepth(prof); objs.push(o); return o; };
      fijo(this.add.rectangle(0, 0, W, H, 0x07060c, 0.84).setOrigin(0));
      fijo(panel(this, 60, 34, W - 120, H - 68, prof));
      fijo(this.add.bitmapText(W / 2, 62, 'fuente_titulo', `JUEGO ${n}`).setOrigin(0.5).setTint(0xff4d8d).setScale(1.5));
      fijo(texto(this, W / 2, 92, j.titulo, { tam: 22, negrita: true, origen: [0.5, 0.5] }));
      ['circulo', 'triangulo', 'cuadrado'].forEach((s, i) => fijo(this.add.image(W / 2 - 30 + i * 30, 118, s).setTint(0xff4d8d).setScale(0.7).setAlpha(0.8)));
      let y = 142;
      for (const l of objetivo) { const t = fijo(texto(this, W / 2, y, l, { tam: 15, ancho: W - 180, alinear: 'center', origen: [0.5, 0] })); y += t.height + 6; }
      ayudas(this, W / 2, Math.max(y + 18, 228), controles, { prof: prof + 1 }).forEach((o) => objs.push(o));
      // quién juega (el relevo de la familia)
      const vidas = this.practica ? 'práctica' : `${E.vidas} ${E.vidas === 1 ? 'vida' : 'vidas'}`;
      fijo(this.add.image(W / 2 - 120, 276, 'ret_' + E.perfil, 'c_feliz'));
      fijo(texto(this, W / 2 - 94, 268, `Juega: ${nombre(E.perfil)}  ·  ${NUMEROS[E.perfil]}`, { tam: 14, negrita: true, color: COLOR.verde, origen: [0, 0.5] }));
      fijo(texto(this, W / 2 - 94, 286, `${vidas}${NINAS.includes(E.perfil) && E.sangreManual === null ? '  ·  sin sangre' : ''}${this.bonusReloj ? '  ·  +15 s' : ''}`, { tam: 12, color: COLOR.apagado, origen: [0, 0.5] }));
      const cambiar = fijo(texto(this, W / 2 + 150, 277, 'B: cambiar', { tam: 12, color: COLOR.apagado, origen: [0.5, 0.5] }));
      cambiar.setInteractive({ useHandCursor: true }).on('pointerdown', () => { this._cambiar = true; });
      const pie = fijo(texto(this, W / 2, 312, this.inp.esTactil ? 'Toca para empezar' : 'A (Espacio): ¡a jugar!', { tam: 15, negrita: true, color: COLOR.oro, origen: [0.5, 0.5] }));
      this.tweens.add({ targets: pie, alpha: 0.35, duration: 520, yoyo: true, repeat: -1 });
      let cuadros = 0;
      const f = () => {
        if (cuadros++ < 8) { this.inp.tomarA(); this.inp.tomarB(); return; }
        if (this.inp.tomarB() || this._cambiar) {
          // el relevo: le toca a otro de la familia (la escena se rearma con esa persona)
          this._cambiar = false;
          E.perfil = FAMILIA[(FAMILIA.indexOf(E.perfil) + 1) % FAMILIA.length];
          guardar();
          tono(880, 0.06, 'campana', 0.1);
          this.events.off('update', f);
          this.cambio = true;
          this.scene.restart({ ...this.datos, reintento: true, bonusReloj: this.bonusReloj, pistasExtra: this.pistasExtra });
          ok();
          return;
        }
        if (this.inp.tomarA()) {
          this.events.off('update', f);
          tono(990, 0.08, 'campana', 0.12);
          this.tweens.add({ targets: objs, alpha: 0, duration: 200, onComplete: () => { objs.forEach((o) => o.destroy()); ok(); } });
        }
      };
      cadaCuadro(this, f);
    });
  }

  /** 3, 2, 1, ¡YA! */
  async contar() {
    const W = this.scale.width, H = this.scale.height;
    for (const n of ['3', '2', '1', '¡YA!']) {
      const t = this.add.bitmapText(W / 2, H / 2, 'fuente_titulo', n).setOrigin(0.5).setScrollFactor(0).setDepth(9400).setScale(3).setTint(n === '¡YA!' ? 0x2fd4b4 : 0xffffff);
      tono(n === '¡YA!' ? 1046 : 523, n === '¡YA!' ? 0.25 : 0.1, 'campana', 0.14);
      this.tweens.add({ targets: t, scale: 1.6, alpha: 0, duration: 430, ease: 'Quad.easeIn', onComplete: () => t.destroy() });
      await esperar(this, n === '¡YA!' ? 250 : 420);
    }
  }

  update(t, dtms) {
    if (this.inp && this.inp.tomarPausa() && this.jugando && !this.pausado) this.pausar();
    if (!this.jugando || this.pausado || this.terminado) return;
    this.paso(Math.min(dtms, 50) / 1000);
  }

  async pausar() {
    this.pausado = true;
    this.time.paused = true;
    this.tweens.pauseAll();
    this.anims.pauseAll();
    const ops = ['Seguir jugando', 'Reiniciar este juego', 'Salir al menú'];
    const r = await elegir(this, this.inp, ops, { titulo: 'PAUSA', cancelar: true });
    this.time.paused = false;
    this.tweens.resumeAll();
    this.anims.resumeAll();
    this.pausado = false;
    if (r === 1) this.scene.restart({ ...this.datos, reintento: true, bonusReloj: this.bonusReloj, pistasExtra: this.pistasExtra });
    if (r === 2) this.salirAlMenu();
  }

  /** con qué datos se rearma la escena al perder una vida (lo comprado se mantiene) */
  datosReinicio() {
    return { ...this.datos, reintento: true, bonusReloj: this.bonusReloj, pistasExtra: this.pistasExtra };
  }

  salirAlMenu() {
    pararMusica(); guardar(); callarAltavoz();
    this.cameras.main.fadeOut(300);
    this.time.delayedCall(320, () => this.scene.start('Titulo'));
  }

  // ---------- ayudas para armar ----------

  /** el jugador (con su número y la flecha) */
  crearJugador(x, y, dir = 'right') {
    this.jugador = new Actor(this, E.perfil, x, y, { dir });
    this.jugador.ponerNumero(NUMEROS[E.perfil], 0x7fffe0);
    this.jugador.ponerFlecha();
    return this.jugador;
  }

  /** los otros tres de la familia, cerca del jugador */
  crearFamilia(pos) {
    this.familia = familiaNPC().map((id, i) => new Actor(this, id, pos[i][0], pos[i][1], { dir: pos[i][2] || 'right' }));
    return this.familia;
  }

  /** n jugadores NPC al azar (de los del kit, se repiten) */
  crearGente(n, colocar, opts = {}) {
    const ids = jugadoresNPC();
    const lista = [];
    for (let i = 0; i < n; i++) {
      const [x, y, dir] = colocar(i);
      const a = new Actor(this, ids[i % ids.length], x, y, { dir: dir || 'right', ...opts });
      a.sprite.anims.setProgress(Math.random());
      lista.push(a);
    }
    return lista;
  }

  // ---------- ganar y perder ----------

  /** las estrellas por defecto: 3 sin perder vidas, 2 perdiendo una, 1 con más */
  estrellas() {
    const perdidas = Math.max(0, this.vidasInicio - E.vidas);
    return Math.max(1, 3 - perdidas);
  }

  async ganar({ texto: titulo = '¡SUPERADO!', lineas = null } = {}) {
    if (this.terminado) return;
    this.terminado = true;
    this.jugando = false;
    this.inp.ocultarTactil(false);
    pararMusica();
    fanfarria();
    if (this.jugador && this.jugador.vivo) this.jugador.anim('celebrate');
    (this.familia || []).forEach((f) => f.vivo && f.anim('celebrate'));
    await cartel(this, titulo, '', { ms: 1200, color: 0x2fd4b4 });
    await this.resultados(Phaser.Math.Clamp(Math.round(this.estrellas()), 1, 3));
    if (lineas) await hablar(this, this.inp, lineas);
    if (this.practica) { await this.finPractica(); return; }
    avanzar(this, { gano: true, eliminados: this.eliminadosRonda });
  }

  /** la pantalla de resultados: estrellas, eliminados, premio para la billetera y récord */
  resultados(est) {
    return new Promise((ok) => {
      const W = this.scale.width, H = this.scale.height, prof = 9650;
      const k = this.scene.key;
      const antes = E.records[k] || 0;
      const nuevo = est > antes;
      if (nuevo) E.records[k] = est;
      const plata = this.practica ? 0 : premio(est);
      E.billetera += plata;
      guardar();
      const objs = [];
      const fijo = (o) => { o.setScrollFactor(0).setDepth(prof); objs.push(o); return o; };
      fijo(this.add.rectangle(0, 0, W, H, 0x07060c, 0.6).setOrigin(0));
      fijo(panel(this, W / 2 - 170, 70, 340, 220, prof));
      fijo(texto(this, W / 2, 96, 'RESULTADO', { tam: 18, negrita: true, color: COLOR.oro, origen: [0.5, 0.5] }));
      for (let i = 0; i < 3; i++) {
        this.time.delayedCall(250 + i * 280, () => {
          const s = fijo(estrella(this, W / 2 - 60 + i * 60, 140, 20, i < est));
          s.setScale(0.2);
          this.tweens.add({ targets: s, scale: 1, duration: 260, ease: 'Back.easeOut' });
          if (i < est) tono(880 + i * 220, 0.12, 'campana', 0.12);
        });
      }
      let y = 182;
      const linea = (t, c = COLOR.texto) => { fijo(texto(this, W / 2, y, t, { tam: 15, color: c, origen: [0.5, 0.5] })); y += 22; };
      if (this.eliminadosRonda) linea(`Eliminados en este juego: ${this.eliminadosRonda}`, COLOR.apagado);
      if (!this.practica) { linea(`Premio para la familia: + ${millones(plata)} W`, COLOR.verde); linea(`Billetera: ${millones(E.billetera)} W`, COLOR.oro); }
      linea(nuevo ? '¡Nuevo récord!' : `Récord: ${'★'.repeat(antes)}${'☆'.repeat(3 - antes)}`, nuevo ? COLOR.rosa : COLOR.apagado);
      const pie = fijo(texto(this, W / 2, 272, this.inp.esTactil ? 'Toca para seguir' : 'A: seguir', { tam: 13, color: COLOR.apagado, origen: [0.5, 0.5] }));
      this.tweens.add({ targets: pie, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });
      let cuadros = 0;
      const f = () => {
        if (cuadros++ < 50) { this.inp.tomarA(); return; }
        if (this.inp.tomarA()) { this.events.off('update', f); objs.forEach((o) => o.destroy()); ok(); }
      };
      cadaCuadro(this, f);
    });
  }

  /** en la práctica, al terminar: otra vez, otro juego o el menú */
  async finPractica() {
    this.inp.ocultarTactil(false);
    const r = await elegir(this, this.inp, ['Jugar otra vez', 'Elegir otro juego', 'Salir al menú'], { titulo: 'PRÁCTICA' });
    if (r === 0) { this.scene.restart({ practica: true, reintento: true }); return; }
    pararMusica();
    this.cameras.main.fadeOut(300);
    this.time.delayedCall(320, () => this.scene.start('Titulo', { abrir: r === 1 ? 'practica' : null }));
  }

  /** cámara lenta, acercamiento y gris cuando eliminan al jugador */
  camaraLenta(actor, activar = true) {
    const cam = this.cameras.main;
    if (activar) {
      this.time.timeScale = 0.4; this.tweens.timeScale = 0.4; this.anims.globalTimeScale = 0.4;
      cam.stopFollow();
      cam.pan(actor.x, actor.y - 30, 450, 'Sine.easeOut');
      cam.zoomTo(1.7, 450, 'Sine.easeOut');
      try { this._gris = cam.postFX?.addColorMatrix(); this._gris?.grayscale(0.75); } catch { this._gris = null; }
      tono(110, 0.9, 'cuerdas', 0.12);
    } else {
      this.time.timeScale = 1; this.tweens.timeScale = 1; this.anims.globalTimeScale = 1;
    }
  }

  /** el jugador queda eliminado: cámara lenta, la animación, el cartel y una vida menos */
  async perder(motivo = 'ELIMINADO', { modo = 'disparo', dy, sinAnim = false } = {}) {
    if (this.terminado) return;
    this.terminado = true;
    this.jugando = false;
    pararMusica();
    if (this.jugador && !sinAnim) {
      this.camaraLenta(this.jugador);
      altavoz(`Jugador ${NUMEROS[E.perfil]}, ${sangre() ? 'eliminado' : 'a dormir'}.`);
      await eliminar(this, this.jugador, { modo, dy });
      await esperar(this, 350);
      this.camaraLenta(null, false);
    }
    await esperar(this, 300);
    if (this.cache.audio.exists('musica_derrota')) try { this.sound.play('musica_derrota', { volume: 0.4 * E.volumen }); } catch { /* sin audio */ }
    const quedan = E.vidas - 1;
    const sub = this.practica ? 'práctica: sin gastar vidas' : quedan > 0 ? `te ${quedan === 1 ? 'queda 1 vida' : `quedan ${quedan} vidas`}` : 'sin vidas: de vuelta al juego 1';
    await cartel(this, motivo, sub, { ms: 1900, color: sangre() ? 0xff4d6d : 0xff8fb5 });
    if (this.practica) { await this.finPractica(); return; }
    perderVida(this);
  }

  /** suma un eliminado: el pozo sube en pantalla y el altavoz lo anuncia */
  contarEliminado(n = 1) {
    this.eliminadosRonda += n;
    if (this.hud) this.hud.setPozo(Math.min(45_600_000_000, E.pozo + this.eliminadosRonda * 100_000_000));
    this.anunciar();
  }

  /** "Jugador 123, eliminado." abajo a la izquierda, uno encima del otro, y por el altavoz */
  anunciar() {
    const num = String(2 + Math.floor(Math.random() * 454)).padStart(3, '0');
    const t = sangre() ? `Jugador ${num}, eliminado.` : `Jugador ${num}, ¡a dormir!`;
    this.avisos = this.avisos.filter((a) => a.active);
    this.avisos.forEach((a) => (a.y -= 16));
    const b = texto(this, 10, this.scale.height - 14, t, { tam: 12, color: sangre() ? '#ff9a9a' : '#ffc8e0', origen: [0, 0.5] }).setScrollFactor(0).setDepth(8900);
    this.avisos.push(b);
    this.tweens.add({ targets: b, alpha: 0, delay: 2000, duration: 600, onComplete: () => b.destroy() });
    altavoz(t.replace('¡', '').replace('!', ''), { baja: true, vel: 1.05 });
  }

  musica(n) { musica(n); }
}

export { bloque, wones };
