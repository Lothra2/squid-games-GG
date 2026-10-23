import Phaser from 'phaser';
// Controles unificados: teclado, control (gamepad) y pantalla táctil.
// x, y: dirección de -1 a 1. a, b: botones apretados. aPulso, bPulso: recién apretados en este cuadro.
// Teclado: flechas o WASD. A = Espacio, Z o Enter. B = X o Shift. Pausa = Esc o P.

export class Entrada {
  constructor(scene, { tactil = true, palanca = true, botonB = true } = {}) {
    this.scene = scene;
    this.x = 0; this.y = 0;
    this.a = false; this.b = false;
    this.aPulso = false; this.bPulso = false; this.pausaPulso = false;
    this._aAntes = false; this._bAntes = false;
    this._tA = false; this._tB = false; this._tx = 0; this._ty = 0;
    this._toque = false;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.k = scene.input.keyboard.addKeys({
      up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT, w: K.W, s: K.S, a2: K.A, d: K.D,
      sp: K.SPACE, z: K.Z, en: K.ENTER, x: K.X, sh: K.SHIFT, esc: K.ESC, p: K.P,
    });
    // los pulsos se guardan por evento: una tecla apretada y soltada entre dos cuadros también cuenta
    this._kA = false; this._kB = false;
    const teclaA = ['Space', 'KeyZ', 'Enter', 'NumpadEnter'], teclaB = ['KeyX', 'ShiftLeft', 'ShiftRight'];
    this._onKey = (ev) => {
      if (ev.repeat) return;
      if (teclaA.includes(ev.code)) this._kA = true;
      if (teclaB.includes(ev.code)) this._kB = true;
    };
    scene.input.keyboard.on('keydown', this._onKey);
    this.esTactil = scene.sys.game.device.input.touch && (navigator.maxTouchPoints || 0) > 0;
    if (this.esTactil && tactil) this._armarTactil(palanca, botonB);
    // un toque en cualquier lado sirve de A cuando no hay controles en pantalla (diálogos, menús)
    scene.input.on('pointerdown', (p) => { if (!this._sobreControl(p)) this._toque = true; });
    scene.events.on('update', this._leer, this);
    scene.events.once('shutdown', () => scene.events.off('update', this._leer, this));
  }

  _sobreControl(p) {
    if (!this.controles) return false;
    const W = this.scene.scale.width, H = this.scene.scale.height;
    if (this.zonaPalanca && p.x < W * 0.4 && p.y > H * 0.35) return true;
    return this.controles.some((c) => c.visible && Phaser.Geom.Rectangle.Contains(c.getBounds(), p.x, p.y));
  }

  _armarTactil(palanca, botonB) {
    const s = this.scene, W = s.scale.width, H = s.scale.height;
    this.controles = [];
    const prof = 1000;
    if (palanca) {
      this.zonaPalanca = true;
      const base = s.add.image(46, H - 46, 'control_palanca', 0).setScale(0.75).setScrollFactor(0).setDepth(prof).setAlpha(0.55);
      const bola = s.add.image(46, H - 46, 'control_palanca_bola', 0).setScale(0.75).setScrollFactor(0).setDepth(prof + 1).setAlpha(0.8);
      this.controles.push(base);
      let id = null;
      const mover = (p) => {
        const dx = p.x - base.x, dy = p.y - base.y, r = 24, d = Math.hypot(dx, dy);
        const k = d > r ? r / d : 1;
        bola.setPosition(base.x + dx * k, base.y + dy * k);
        this._tx = Phaser.Math.Clamp(dx / r, -1, 1); this._ty = Phaser.Math.Clamp(dy / r, -1, 1);
        if (Math.abs(this._tx) < 0.25) this._tx = 0;
        if (Math.abs(this._ty) < 0.25) this._ty = 0;
      };
      s.input.on('pointerdown', (p) => { if (p.x < W * 0.4 && p.y > H * 0.35) { id = p.id; mover(p); base.setFrame(1); } });
      s.input.on('pointermove', (p) => { if (p.id === id) mover(p); });
      const soltar = (p) => { if (p.id === id) { id = null; this._tx = 0; this._ty = 0; bola.setPosition(base.x, base.y); base.setFrame(0); } };
      s.input.on('pointerup', soltar);
      s.input.on('pointerupoutside', soltar);
    }
    const boton = (x, y, tex, campo) => {
      const b = s.add.image(x, y, tex, 0).setScale(0.75).setScrollFactor(0).setDepth(prof).setAlpha(0.7).setInteractive();
      b.on('pointerdown', () => { this[campo] = true; b.setFrame(1); });
      const off = () => { this[campo] = false; b.setFrame(0); };
      b.on('pointerup', off); b.on('pointerout', off);
      this.controles.push(b);
      return b;
    };
    this.botonA = boton(W - 34, H - 40, 'control_a', '_tA');
    if (botonB) this.botonB = boton(W - 76, H - 22, 'control_b', '_tB');
  }

  ocultarTactil(v = false) {
    (this.controles || []).forEach((c) => c.setVisible(v));
  }

  _leer() {
    const k = this.k;
    let x = 0, y = 0;
    if (k.left.isDown || k.a2.isDown) x -= 1;
    if (k.right.isDown || k.d.isDown) x += 1;
    if (k.up.isDown || k.w.isDown) y -= 1;
    if (k.down.isDown || k.s.isDown) y += 1;
    let a = k.sp.isDown || k.z.isDown || k.en.isDown || this._tA;
    let b = k.x.isDown || k.sh.isDown || this._tB;
    const pads = this.scene.input.gamepad ? this.scene.input.gamepad.gamepads : [];
    for (const pad of pads) {
      if (!pad) continue;
      const ax = pad.axes.length ? pad.axes[0].getValue() : 0, ay = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
      if (Math.abs(ax) > 0.3) x += ax;
      if (Math.abs(ay) > 0.3) y += ay;
      if (pad.left) x -= 1; if (pad.right) x += 1; if (pad.up) y -= 1; if (pad.down) y += 1;
      if (pad.A || pad.Y) a = true;
      if (pad.B || pad.X) b = true;
      if (pad.buttons[9] && pad.buttons[9].pressed) this.pausaPulso = true;
    }
    x += this._tx; y += this._ty;
    this.x = Phaser.Math.Clamp(x, -1, 1); this.y = Phaser.Math.Clamp(y, -1, 1);
    this.aPulso = (a && !this._aAntes) || this._toque || this._kA;
    this.bPulso = (b && !this._bAntes) || this._kB;
    this._toque = false; this._kA = false; this._kB = false;
    this._aAntes = a; this._bAntes = b;
    this.a = a; this.b = b;
    if (Phaser.Input.Keyboard.JustDown(k.esc) || Phaser.Input.Keyboard.JustDown(k.p)) this.pausaPulso = true;
  }

  /** consume el pulso de A (para que dos cosas no lo usen en el mismo cuadro) */
  tomarA() { const v = this.aPulso; this.aPulso = false; return v; }
  tomarB() { const v = this.bPulso; this.bPulso = false; return v; }
  tomarPausa() { const v = this.pausaPulso; this.pausaPulso = false; return v; }
}
