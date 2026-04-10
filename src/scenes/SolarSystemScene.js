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

    // ---- Orbit path rings (elliptical) ----
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

    // ---- Keyboard input (arrow keys + WASD) ----
    this._cursors = this.input.keyboard.createCursorKeys();
    this._wasd = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Delay before soft-follow starts (lets focusOn tween finish first)
    this._followDelay = 0;
    this._isThrusting = false;

    // ---- Launch the UI overlay scene ----
    this.scene.launch('UIScene');

    // ---- Fade in ----
    this.cameras.main.fadeIn(700, 0, 8, 24);
  }

  update(_time, delta) {
    this.orbitalSystem.update(delta);
    this._handleManualInput(delta);
    this.navSystem.update(delta);
    this._updateCourseLine();
    this._updateLabels();
    this._softFollowShip(delta);
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
      const data = PLANETS[i];
      const a = data.orbitRadius;
      const e = data.eccentricity || 0;
      const b = a * Math.sqrt(1 - e * e); // semi-minor axis
      const c = a * e;                    // focal offset

      const alpha = 0.22 - i * 0.012;
      g.lineStyle(1, 0x2244AA, Math.max(0.06, alpha));
      // strokeEllipse(cx, cy, width, height) — centre is at the ellipse centre,
      // not the focus; shift left by c so the Sun (at origin) is at one focus.
      g.strokeEllipse(-c, 0, a * 2, b * 2);
    }
  }

  _handleManualInput(delta) {
    const ui = this._ui();
    const joystick = ui && ui.joystick;

    let nx = 0;
    let ny = 0;

    // Keyboard
    if (this._cursors.left.isDown  || this._wasd.left.isDown)  nx -= 1;
    if (this._cursors.right.isDown || this._wasd.right.isDown) nx += 1;
    if (this._cursors.up.isDown    || this._wasd.up.isDown)    ny -= 1;
    if (this._cursors.down.isDown  || this._wasd.down.isDown)  ny += 1;

    // Joystick
    if (joystick && joystick.active) {
      nx += joystick.dx;
      ny += joystick.dy;
    }

    if (nx !== 0 || ny !== 0) {
      const len = Math.hypot(nx, ny);
      this.navSystem.applyThrust(nx / len, ny / len, delta);
      this._isThrusting = true;
    } else {
      this._isThrusting = false;
    }
  }

  _softFollowShip(delta) {
    // Only follow when the ship is actually moving (manual or auto-nav)
    const shouldFollow = this._isThrusting || !!this.navSystem.target;
    if (!shouldFollow) return;
    if (this.cameraSystem.isPanning()) return;

    // Skip during focusOn tween (avoids fighting the tween animation)
    if (this._followDelay > 0) {
      this._followDelay -= delta;
      return;
    }

    const cam = this.cameras.main;
    const targetScrollX = this.ship.x - cam.width  * 0.5 / cam.zoom;
    const targetScrollY = this.ship.y - cam.height * 0.5 / cam.zoom;
    // Soft lerp — 6 % per frame-equivalent for smooth tracking
    const factor = Math.min(0.06, 0.06 * (delta / 16.67));
    cam.scrollX += (targetScrollX - cam.scrollX) * factor;
    cam.scrollY += (targetScrollY - cam.scrollY) * factor;
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
    // Brief zoom toward the ship, then soft-follow takes over
    this.cameraSystem.focusOn(this.ship.x, this.ship.y, 0.45, 600);
    this._followDelay = 700; // wait for the tween to finish
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
