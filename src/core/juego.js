import Phaser from 'phaser';
// La escena base de cada juego: presentación, reglas, HUD, pausa, ganar y perder.
// Cada juego implementa armar() (pone todo), reglas() (líneas de diálogo), paso(dt) (la lógica por cuadro)
// y opcionalmente empezar() (lo que pasa al arrancar).

import { E, sangre, familiaNPC, guardar, NUMEROS, wones } from './estado.js';
import { Entrada } from './entrada.js';
import { Hud } from './hud.js';
import { Actor } from './actor.js';
import { hablar, cartel, esperar, elegir } from './dialogo.js';
import { avanzar, perderVida, numeroJuego, JUEGOS } from './flujo.js';
import { musica, pararMusica, fanfarria, sfx, despertar } from './sonido.js';
import { eliminar } from './efectos.js';
import { jugadoresNPC } from './kit.js';

export class Juego extends Phaser.Scene {
  init(data) {
    this.datos = data || {};
    this.practica = !!this.datos.practica;
    this.jugando = false;
    this.terminado = false;
    this.pausado = false;
    this.eliminadosRonda = 0;
  }

  create() {
    despertar();
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.inp = new Entrada(this, this.opcionesEntrada ? this.opcionesEntrada() : {});
    this.armar();
    this.hud = new Hud(this, this.opcionesHud ? this.opcionesHud() : {});
    this.presentar();
  }

  async presentar() {
    const n = numeroJuego(this.scene.key);
    const j = JUEGOS[n - 1];
    this.inp.ocultarTactil(false);
    await cartel(this, `JUEGO ${n}`, j ? j.titulo : '', { ms: 1700, color: 0xe0457b });
    const lineas = this.reglas();
    if (E.vidas < 3 && !this.practica) lineas.unshift([null, null, `Te quedan ${E.vidas} ${E.vidas === 1 ? 'vida' : 'vidas'}. ¡Esta vez sí!`]);
    if (lineas.length) await hablar(this, this.inp, lineas);
    this.inp.ocultarTactil(true);
    if (this.antesDeEmpezar) await this.antesDeEmpezar();
    this.jugando = true;
    if (this.empezar) this.empezar();
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
    const r = await elegir(this, this.inp, ['Seguir jugando', 'Reiniciar este juego', 'Salir al menú'], { titulo: 'PAUSA' });
    this.time.paused = false;
    this.tweens.resumeAll();
    this.anims.resumeAll();
    this.pausado = false;
    if (r === 1) this.scene.restart();
    if (r === 2) { pararMusica(); guardar(); this.scene.start('Titulo'); }
  }

  // ---------- ayudas para armar ----------

  /** el jugador (con su número arriba) */
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

  async ganar({ texto = '¡SUPERADO!', lineas = null } = {}) {
    if (this.terminado) return;
    this.terminado = true;
    this.jugando = false;
    this.inp.ocultarTactil(false);
    pararMusica();
    fanfarria();
    if (this.jugador && this.jugador.vivo) this.jugador.anim('celebrate');
    (this.familia || []).forEach((f) => f.vivo && f.anim('celebrate'));
    await cartel(this, texto, '', { ms: 1500, color: 0x23b39c });
    if (lineas) await hablar(this, this.inp, lineas);
    avanzar(this, { gano: true, eliminados: this.eliminadosRonda, practica: this.practica });
  }

  /** el jugador queda eliminado: animación, cartel y vida menos */
  async perder(motivo = 'ELIMINADO', { modo = 'disparo', dy, sinAnim = false } = {}) {
    if (this.terminado) return;
    this.terminado = true;
    this.jugando = false;
    pararMusica();
    if (this.jugador && !sinAnim) await eliminar(this, this.jugador, { modo, dy });
    await esperar(this, 500);
    if (this.cache.audio.exists('musica_derrota')) try { this.sound.play('musica_derrota', { volume: 0.4 * E.volumen }); } catch { /* sin audio */ }
    const sub = this.practica ? 'práctica' : E.vidas - 1 > 0 ? `te quedan ${E.vidas - 1} ${E.vidas - 1 === 1 ? 'vida' : 'vidas'}` : 'sin vidas: de vuelta al juego 1';
    await cartel(this, motivo, sub, { ms: 2000, color: sangre() ? 0xff4d6d : 0xff8fb5 });
    perderVida(this, this.practica);
  }

  /** suma un eliminado al pozo de esta ronda */
  contarEliminado(n = 1) {
    this.eliminadosRonda += n;
    this.anunciar();
    // en pantalla se ve subir ya; al pozo de verdad entra al ganar
    if (this.hud && this.hud.pozo) this.hud.pozo.setText(wones(Math.min(45_600_000_000, E.pozo + this.eliminadosRonda * 100_000_000)));
  }

  /** "Jugador 123, eliminado." abajo a la izquierda, uno debajo del otro */
  anunciar() {
    const num = String(2 + Math.floor(Math.random() * 454)).padStart(3, '0');
    const t = sangre() ? `Jugador ${num}, eliminado.` : `Jugador ${num}, ¡a dormir!`;
    this.avisos = (this.avisos || []).filter((a) => a.active);
    this.avisos.forEach((a) => (a.y -= 10));
    const b = this.add.bitmapText(6, this.scale.height - 14, 'fuente_ui', t).setScrollFactor(0).setDepth(8900).setTint(sangre() ? 0xff8f8f : 0xffc8e0);
    this.avisos.push(b);
    this.tweens.add({ targets: b, alpha: 0, delay: 1800, duration: 600, onComplete: () => b.destroy() });
  }

  musica(n) { musica(n); }
}
