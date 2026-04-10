// MenuScene — title screen with animated star background and a start button

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const { width, height } = this.scale;

    // ---- Star background ----
    this._drawStars(width, height);

    // ---- Decorative orbit ring ----
    const decoG = this.add.graphics();
    decoG.lineStyle(1, 0x2244AA, 0.25);
    decoG.strokeCircle(width * 0.5, height * 0.5, Math.min(width, height) * 0.42);
    decoG.strokeCircle(width * 0.5, height * 0.5, Math.min(width, height) * 0.28);

    // ---- Sun glow ----
    const sunG = this.add.graphics();
    sunG.fillStyle(0xFFA500, 0.08);
    sunG.fillCircle(width * 0.5, height * 0.5, 72);
    sunG.fillStyle(0xFFD700, 0.18);
    sunG.fillCircle(width * 0.5, height * 0.5, 48);
    sunG.fillStyle(0xFFDD00, 1);
    sunG.fillCircle(width * 0.5, height * 0.5, 34);

    // ---- Orbiting planet decoration ----
    this._orbitAngle = 0;
    this._orbitG = this.add.graphics();
    this._orbitCx = width * 0.5;
    this._orbitCy = height * 0.5;
    this._orbitR = Math.min(width, height) * 0.42;

    // ---- Title ----
    this.add.text(width * 0.5, height * 0.14, '✦ SPACE EXPLORER ✦', {
      fontSize: Math.min(34, width * 0.08) + 'px',
      fontFamily: "'Arial', sans-serif",
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(width * 0.5, height * 0.23, 'Navigate Our Solar System', {
      fontSize: Math.min(17, width * 0.04) + 'px',
      fontFamily: "'Arial', sans-serif",
      color: '#88BBFF',
    }).setOrigin(0.5);

    // ---- Launch button ----
    const btnFontSize = Math.min(22, width * 0.055);
    const btn = this.add.text(width * 0.5, height * 0.78, '  LAUNCH MISSION  ', {
      fontSize: btnFontSize + 'px',
      fontFamily: "'Arial', sans-serif",
      fontStyle: 'bold',
      color: '#FFFFFF',
      backgroundColor: '#1144BB',
      padding: { x: 22, y: 13 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#2255CC' }));
    btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#1144BB' }));
    btn.on('pointerdown', () => this._launch());

    // Pulse animation on the button
    this.tweens.add({
      targets: btn,
      scaleX: 1.04, scaleY: 1.04,
      yoyo: true,
      repeat: -1,
      duration: 1100,
      ease: 'Sine.easeInOut',
    });

    // ---- Hint ----
    this.add.text(width * 0.5, height * 0.89, 'Tap planets to learn about our solar system', {
      fontSize: Math.min(13, width * 0.033) + 'px',
      fontFamily: "'Arial', sans-serif",
      color: '#445566',
      align: 'center',
    }).setOrigin(0.5);

    this.cameras.main.fadeIn(500, 0, 8, 24);
  }

  update(time) {
    // Slowly orbit a blue planet around the sun decoration
    this._orbitAngle = time * 0.0004;
    const px = this._orbitCx + Math.cos(this._orbitAngle) * this._orbitR;
    const py = this._orbitCy + Math.sin(this._orbitAngle) * this._orbitR;

    this._orbitG.clear();
    this._orbitG.fillStyle(0x4B9CD3, 0.9);
    this._orbitG.fillCircle(px, py, 9);
    this._orbitG.fillStyle(0x88CCFF, 0.2);
    this._orbitG.fillCircle(px, py, 16);
  }

  _launch() {
    this.cameras.main.fadeOut(450, 0, 8, 24);
    this.time.delayedCall(470, () => this.scene.start('SolarSystemScene'));
  }

  _drawStars(w, h) {
    const g = this.add.graphics();
    const rng = new Phaser.Math.RandomDataGenerator(['menu-stars']);
    for (let i = 0; i < 280; i++) {
      const x = rng.integerInRange(0, w);
      const y = rng.integerInRange(0, h);
      const bright = rng.frac() > 0.82;
      const alpha = 0.25 + rng.frac() * 0.75;
      g.fillStyle(0xffffff, alpha);
      g.fillRect(x, y, bright ? 2 : 1, bright ? 2 : 1);
    }
  }
}
