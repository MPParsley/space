// Moon — orbits inside its parent planet's Container
export class Moon {
  constructor(scene, data, parentContainer) {
    this.data = data;
    this.parentContainer = parentContainer;
    this.orbitAngle = Math.random() * Math.PI * 2;

    // Faint orbit ring drawn once at parent-local origin
    const orbitG = scene.add.graphics();
    orbitG.lineStyle(0.5, 0x334466, 0.4);
    orbitG.strokeCircle(0, 0, data.orbitRadius);
    parentContainer.add(orbitG);

    // Glow
    this.glow = scene.add.arc(0, 0, data.radius * 1.8, 0, 360, false, data.color, 0.15);
    parentContainer.add(this.glow);

    // Moon body
    this.body = scene.add.arc(0, 0, data.radius, 0, 360, false, data.color);
    parentContainer.add(this.body);

    // Label (hidden until zoomed in)
    this.label = scene.add.text(0, -(data.radius + 7), data.name, {
      fontSize: '10px',
      fontFamily: "'Arial', sans-serif",
      color: '#AAAAAA',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5, 1).setVisible(false);
    parentContainer.add(this.label);

    this._updateLocalPosition();
  }

  _updateLocalPosition() {
    const lx = Math.cos(this.orbitAngle) * this.data.orbitRadius;
    const ly = Math.sin(this.orbitAngle) * this.data.orbitRadius;
    this.body.setPosition(lx, ly);
    this.glow.setPosition(lx, ly);
    this.label.setPosition(lx, ly - this.data.radius - 7);
  }

  // World position = planet container position + moon local position
  get worldX() { return this.parentContainer.x + this.body.x; }
  get worldY() { return this.parentContainer.y + this.body.y; }

  get hitRadius() { return Math.max(this.data.radius * 3, 18); }
}
