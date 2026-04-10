// BootScene — shows a brief loading screen then launches the menu.
// All assets are procedurally generated so there is nothing to preload;
// this scene exists for a smooth first-paint experience.

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    const { width, height } = this.scale;

    // Dark background
    this.add.rectangle(0, 0, width, height, 0x000818).setOrigin(0, 0);

    // Simple animated starfield during load
    this._stars = this.add.graphics();
    this._drawStars(width, height);

    // Title text
    this.add.text(width * 0.5, height * 0.38, 'SPACE EXPLORER', {
      fontSize: '28px',
      fontFamily: "'Arial', sans-serif",
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(width * 0.5, height * 0.5, 'Loading…', {
      fontSize: '16px',
      fontFamily: "'Arial', sans-serif",
      color: '#4488BB',
    }).setOrigin(0.5);

    // Progress bar track
    const barW = Math.min(width * 0.55, 280);
    this.add.rectangle(width * 0.5, height * 0.6, barW, 6, 0x112244).setOrigin(0.5);
    const bar = this.add.rectangle(width * 0.5 - barW * 0.5, height * 0.6, 0, 6, 0x4488FF)
      .setOrigin(0, 0.5);

    this.load.on('progress', v => { bar.width = barW * v; });
  }

  create() {
    // Brief pause so the loading screen is visible, then start menu
    this.time.delayedCall(200, () => {
      this.cameras.main.fadeOut(400, 0, 8, 24);
      this.time.delayedCall(420, () => this.scene.start('MenuScene'));
    });
  }

  _drawStars(w, h) {
    const g = this._stars;
    g.clear();
    const rng = new Phaser.Math.RandomDataGenerator(['boot-stars']);
    for (let i = 0; i < 200; i++) {
      const x = rng.integerInRange(0, w);
      const y = rng.integerInRange(0, h);
      const alpha = 0.2 + rng.frac() * 0.7;
      g.fillStyle(0xffffff, alpha);
      g.fillRect(x, y, rng.frac() > 0.85 ? 2 : 1, rng.frac() > 0.85 ? 2 : 1);
    }
  }
}
