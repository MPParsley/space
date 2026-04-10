// Star — the Sun, fixed at world origin (0, 0)
export class Star {
  constructor(scene, data) {
    this.data = data;

    // Outer corona glow (largest, most transparent)
    const g = scene.add.graphics();
    g.fillStyle(data.glowColor, 0.04);
    g.fillCircle(0, 0, data.radius * 5);
    g.fillStyle(data.glowColor, 0.08);
    g.fillCircle(0, 0, data.radius * 3.2);
    g.fillStyle(data.glowColor, 0.16);
    g.fillCircle(0, 0, data.radius * 2);
    g.fillStyle(data.color, 0.28);
    g.fillCircle(0, 0, data.radius * 1.45);

    // Main body
    this.body = scene.add.arc(0, 0, data.radius, 0, 360, false, data.color);

    // Bright hot core
    const core = scene.add.graphics();
    core.fillStyle(0xFFFFFF, 0.35);
    core.fillCircle(0, 0, data.radius * 0.38);

    // Name label
    this.label = scene.add.text(0, -(data.radius + 16), data.name, {
      fontSize: '14px',
      fontFamily: "'Arial', sans-serif",
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 1);

    // Fixed world position
    this.worldX = 0;
    this.worldY = 0;
  }

  // Hit radius for tap detection (larger than visual)
  get hitRadius() {
    return this.data.radius * 2.5 + 20;
  }
}
