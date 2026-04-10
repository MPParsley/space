import { Moon } from './Moon.js';

// Planet — a Phaser Container holding body, rings, label, and moon sub-objects
export class Planet {
  constructor(scene, data) {
    this.data = data;
    this.orbitAngle = Math.random() * Math.PI * 2;

    // Root container — its x,y is the planet's world position
    this.container = scene.add.container(0, 0);

    // Moon orbit rings (drawn at local 0,0 = planet centre)
    if (data.moons && data.moons.length > 0) {
      const moonOrbitG = scene.add.graphics();
      for (const m of data.moons) {
        moonOrbitG.lineStyle(0.5, 0x334466, 0.35);
        moonOrbitG.strokeCircle(0, 0, m.orbitRadius);
      }
      this.container.add(moonOrbitG);
    }

    // Glow layer
    const glowG = scene.add.graphics();
    glowG.fillStyle(data.color, 0.12);
    glowG.fillCircle(0, 0, data.radius * 2.2);
    this.container.add(glowG);

    // Rings (Saturn / Uranus) — drawn BEHIND the planet body
    if (data.hasRings) {
      this._addRings(scene, data);
    }

    // Planet body (solid circle, drawn on top of rings so it hides the ring centre)
    this.body = scene.add.arc(0, 0, data.radius, 0, 360, false, data.color);
    this.container.add(this.body);

    // Highlight for gas giants
    if (data.radius >= 20) {
      const highlightG = scene.add.graphics();
      highlightG.fillStyle(0xFFFFFF, 0.07);
      highlightG.fillEllipse(-data.radius * 0.28, -data.radius * 0.3, data.radius * 0.8, data.radius * 0.55);
      this.container.add(highlightG);
    }

    // Name label
    this.label = scene.add.text(0, -(data.radius + 11), data.name, {
      fontSize: '13px',
      fontFamily: "'Arial', sans-serif",
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 1);
    this.container.add(this.label);

    // Moons
    this.moons = (data.moons || []).map(md => new Moon(scene, md, this.container));

    // Set initial world position
    this._applyOrbitalPosition();
  }

  _addRings(scene, data) {
    const ringsG = scene.add.graphics();
    const inner = data.ringInnerRadius;
    const outer = data.ringOuterRadius;
    const steps = 6;

    // Draw a series of concentric circles from inner to outer radius
    // (top-down view: rings appear as circles, not an ellipse)
    for (let i = 0; i <= steps; i++) {
      const r = inner + (outer - inner) * (i / steps);
      const alpha = 0.55 - (i / steps) * 0.25;
      const lineW = (i === 0 || i === steps) ? 1 : 1.5;
      ringsG.lineStyle(lineW, data.ringColor, alpha);
      ringsG.strokeCircle(0, 0, r);
    }
    this.container.add(ringsG);
  }

  _applyOrbitalPosition() {
    const { orbitRadius: a, eccentricity: e = 0 } = this.data;
    const b = a * Math.sqrt(1 - e * e);
    const c = a * e;
    this.container.setPosition(
      a * Math.cos(this.orbitAngle) - c,
      b * Math.sin(this.orbitAngle),
    );
  }

  // World position of planet centre
  get worldX() { return this.container.x; }
  get worldY() { return this.container.y; }

  // Hit radius for tap detection
  get hitRadius() {
    const base = Math.max(this.data.radius * 2.5, 22);
    return this.data.hasRings ? base + this.data.ringOuterRadius * 0.5 : base;
  }
}
