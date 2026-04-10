import { SUN, PLANETS } from '../data/solarSystem.js';
import { Star } from '../entities/Star.js';
import { Planet } from '../entities/Planet.js';
import { Spaceship } from '../entities/Spaceship.js';
import { OrbitalSystem } from '../systems/OrbitalSystem.js';
import { NavigationSystem } from '../systems/NavigationSystem.js';
import { CameraSystem } from '../systems/CameraSystem.js';

// Main game scene — solar system navigation mode
export default class SolarSystemScene extends Phaser.Scene {
  constructor() {
    super('SolarSystemScene');
  }

  create() {
    // ---- Starfield background (world-space, scrolls very slowly) ----
    this._createStarfield();

    // ---- Orbit path rings ----
    this._drawOrbitRings();

    // ---- Celestial bodies ----
    this.star = new Star(this, SUN);
    this.planets = PLANETS.map(data => new Planet(this, data));

    // ---- Spaceship (starts near Earth) ----
    const earth = this.planets.find(p => p.data.id === 'earth');
    this.ship = new Spaceship(this, earth.worldX + 65, earth.worldY);

    // ---- Course indicator (drawn each frame when navigating) ----
    this.courseLine = this.add.graphics().setDepth(3);

    // ---- Systems ----
    this.orbitalSystem = new OrbitalSystem(this.planets);

    this.navSystem = new NavigationSystem(this, this.ship);
    this.navSystem.onDocked = bodyObj => this._onDocked(bodyObj);

    this.cameraSystem = new CameraSystem(this);
    this.cameraSystem.onTap = (sx, sy) => this._handleTap(sx, sy);

    // ---- Launch the UI overlay scene ----
    this.scene.launch('UIScene');

    // ---- Fade in ----
    this.cameras.main.fadeIn(700, 0, 8, 24);
  }

  update(_time, delta) {
    this.orbitalSystem.update(delta);
    this.navSystem.update(delta);
    this._updateCourseLine();
    this._updateLabels();
  }

  // ------------------------------------------------------------------ private

  _createStarfield() {
    // Stars scattered across a large area; they scroll at 8 % of camera speed
    // giving subtle depth without distracting from the planets.
    const SIZE = 3600;
    const g = this.add.graphics().setScrollFactor(0.08);
    const rng = new Phaser.Math.RandomDataGenerator(['ss-stars']);
    for (let i = 0; i < 450; i++) {
      const x = rng.integerInRange(-SIZE / 2, SIZE / 2);
      const y = rng.integerInRange(-SIZE / 2, SIZE / 2);
      const bright = rng.frac() > 0.88;
      const alpha = 0.2 + rng.frac() * 0.8;
      g.fillStyle(0xffffff, alpha);
      g.fillRect(x, y, bright ? 2 : 1, bright ? 2 : 1);
    }
  }

  _drawOrbitRings() {
    const g = this.add.graphics();
    for (let i = 0; i < PLANETS.length; i++) {
      const alpha = 0.22 - i * 0.012;
      g.lineStyle(1, 0x2244AA, Math.max(0.06, alpha));
      g.strokeCircle(0, 0, PLANETS[i].orbitRadius);
    }
  }

  _updateCourseLine() {
    this.courseLine.clear();
    if (!this.navSystem.target) return;

    const { x: sx, y: sy } = this.ship;
    const tx = this.navSystem.target.worldX;
    const ty = this.navSystem.target.worldY;
    const dist = Math.hypot(tx - sx, ty - sy);
    const steps = Math.max(1, Math.floor(dist / 14));

    this.courseLine.lineStyle(1, 0x4499FF, 0.35);
    for (let i = 0; i < steps; i++) {
      if (i % 2 === 0) {
        this.courseLine.lineBetween(
          sx + (tx - sx) * (i / steps),
          sy + (ty - sy) * (i / steps),
          sx + (tx - sx) * ((i + 1) / steps),
          sy + (ty - sy) * ((i + 1) / steps),
        );
      }
    }
  }

  _updateLabels() {
    const zoom = this.cameras.main.zoom;
    this.star.label.setVisible(zoom >= 0.14);

    for (const planet of this.planets) {
      planet.label.setVisible(zoom >= 0.28);
      for (const moon of planet.moons) {
        moon.label.setVisible(zoom >= 0.85);
      }
    }
  }

  _handleTap(screenX, screenY) {
    const wp = this.cameras.main.getWorldPoint(screenX, screenY);

    // Collect all tappable bodies
    const candidates = [
      { obj: this.star, data: SUN, navigable: false },
      ...this.planets.map(p => ({ obj: p, data: p.data, navigable: true })),
      ...this.planets.flatMap(p =>
        p.moons.map(m => ({ obj: m, data: m.data, navigable: true })),
      ),
    ];

    let best = null;
    let bestDist = Infinity;

    for (const c of candidates) {
      const dist = Phaser.Math.Distance.Between(wp.x, wp.y, c.obj.worldX, c.obj.worldY);
      if (dist < c.obj.hitRadius && dist < bestDist) {
        bestDist = dist;
        best = c;
      }
    }

    const ui = this._ui();
    if (best) {
      ui.showCard(best.data, best.obj, best.navigable);
    } else {
      ui.hideCard();
    }
  }

  // Called by UIScene when the "Travel Here" button is pressed
  travelTo(bodyObj) {
    this.navSystem.setTarget(bodyObj);
    this._ui().setStatus('En route to ' + bodyObj.data.name + '…');
    this._ui().hideCard();
    // Briefly follow the ship
    this.cameraSystem.focusOn(this.ship.x, this.ship.y, 0.45, 600);
  }

  _onDocked(bodyObj) {
    this._ui().setLocation(bodyObj.data.name);
    this._ui().setStatus('');
    // Launch dialogue overlay
    this.scene.launch('DialogueScene', { bodyData: bodyObj.data });
    this.scene.bringToTop('DialogueScene');
    // Zoom in to show the planet
    this.cameraSystem.focusOn(bodyObj.worldX, bodyObj.worldY, 1.2, 900);
  }

  _ui() {
    return this.scene.get('UIScene');
  }
}
