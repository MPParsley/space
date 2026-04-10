import { SUN, PLANETS } from '../data/solarSystem.js';
import { Star } from '../entities/Star.js';
import { Planet } from '../entities/Planet.js';
import { Spaceship } from '../entities/Spaceship.js';
import { OrbitalSystem } from '../systems/OrbitalSystem.js';
import { NavigationSystem } from '../systems/NavigationSystem.js';
import { CameraSystem } from '../systems/CameraSystem.js';
import { SoundSystem } from '../systems/SoundSystem.js';

// Main game scene — solar system navigation mode
export default class SolarSystemScene extends Phaser.Scene {
  constructor() {
    super('SolarSystemScene');
  }

  create() {
    // ---- Starfield background ----
    this._createStarfield();

    // ---- Orbit path rings (elliptical) ----
    this._drawOrbitRings();

    // ---- Celestial bodies ----
    this.star = new Star(this, SUN);
    this.planets = PLANETS.map(data => new Planet(this, data));

    // ---- Spaceship (starts near Earth) ----
    const earth = this.planets.find(p => p.data.id === 'earth');
    this.ship = new Spaceship(this, earth.worldX + 65, earth.worldY);

    // ---- Course indicator ----
    this.courseLine = this.add.graphics().setDepth(3);

    // ---- Hover ring ----
    this._hoverG = this.add.graphics().setDepth(10);
    this._hoveredBody = null;

    // ---- Systems ----
    this.orbitalSystem = new OrbitalSystem(this.planets);
    this.soundSystem   = new SoundSystem();

    this.navSystem = new NavigationSystem(this, this.ship);
    this.navSystem.onDocked = bodyObj => this._onDocked(bodyObj);

    this.cameraSystem = new CameraSystem(this);
    this.cameraSystem.onTap = (sx, sy) => this._handleTap(sx, sy);

    // ---- Keyboard: single addKeys call for arrow keys + WASD ----
    const K = Phaser.Input.Keyboard.KeyCodes;
    this._keys = this.input.keyboard.addKeys({
      up:    K.UP,
      down:  K.DOWN,
      left:  K.LEFT,
      right: K.RIGHT,
      w:     K.W,
      s:     K.S,
      a:     K.A,
      d:     K.D,
    });

    // ---- Hover detection (mouse / trackpad; skipped during drag) ----
    this.input.on('pointermove', ptr => {
      if (ptr.isDown) return;
      this._checkHover(ptr.x, ptr.y);
    });
    this.input.on('pointerout', () => this._clearHover());

    // Delay before soft-follow starts (lets focusOn tween finish first)
    this._followDelay = 0;
    this._isThrusting = false;

    // ---- Launch the UI overlay scene ----
    this.scene.launch('UIScene');

    // ---- Fade in ----
    this.cameras.main.fadeIn(700, 0, 8, 24);
  }

  update(time, delta) {
    this.orbitalSystem.update(delta);
    this._handleManualInput(delta);
    this.navSystem.update(delta);
    this._updateCourseLine();
    this._updateLabels();
    this._softFollowShip(delta);
    this._drawHoverRing(time);
  }

  // ------------------------------------------------------------------ private

  _createStarfield() {
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
      const b = a * Math.sqrt(1 - e * e);
      const c = a * e;

      const alpha = 0.22 - i * 0.012;
      g.lineStyle(1, 0x2244AA, Math.max(0.06, alpha));
      g.strokeEllipse(-c, 0, a * 2, b * 2);
    }
  }

  // ------------------------------------------------------------------ Hover

  _checkHover(screenX, screenY) {
    const wp = this.cameras.main.getWorldPoint(screenX, screenY);

    const candidates = [
      { obj: this.star, data: SUN },
      ...this.planets.map(p => ({ obj: p, data: p.data })),
      ...this.planets.flatMap(p => p.moons.map(m => ({ obj: m, data: m.data }))),
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

    // Compare object references so the hover ping fires only on body change
    const prevObj = this._hoveredBody ? this._hoveredBody.obj : null;
    const newObj  = best ? best.obj : null;
    this._hoveredBody = best;

    this.game.canvas.style.cursor = newObj ? 'pointer' : 'default';

    if (newObj !== prevObj && newObj) {
      this.soundSystem.playHover();
    }
  }

  _clearHover() {
    this._hoveredBody = null;
    this._hoverG.clear();
    this.game.canvas.style.cursor = 'default';
  }

  _drawHoverRing(time) {
    this._hoverG.clear();
    if (!this._hoveredBody) return;

    const { obj, data } = this._hoveredBody;
    const pulse = 0.6 + 0.4 * Math.sin(time * 0.004);
    const bodyR = data.hasRings ? data.ringOuterRadius : data.radius;
    const ringR = bodyR + 5;

    // Outer soft halo
    this._hoverG.lineStyle(6, 0xFFFFFF, pulse * 0.12);
    this._hoverG.strokeCircle(obj.worldX, obj.worldY, ringR + 4);

    // Main highlight ring
    this._hoverG.lineStyle(1.5, 0xFFFFFF, pulse * 0.8);
    this._hoverG.strokeCircle(obj.worldX, obj.worldY, ringR);

    // Faint fill for tiny moons
    if (data.radius <= 7) {
      this._hoverG.fillStyle(0xFFFFFF, pulse * 0.08);
      this._hoverG.fillCircle(obj.worldX, obj.worldY, ringR);
    }
  }

  // ------------------------------------------------------------------ Input

  _handleManualInput(delta) {
    const ui = this._ui();
    const joystick = ui && ui.joystick;

    let nx = 0;
    let ny = 0;

    // Arrow keys + WASD (all registered in a single addKeys call)
    if (this._keys.left.isDown  || this._keys.a.isDown) nx -= 1;
    if (this._keys.right.isDown || this._keys.d.isDown) nx += 1;
    if (this._keys.up.isDown    || this._keys.w.isDown) ny -= 1;
    if (this._keys.down.isDown  || this._keys.s.isDown) ny += 1;

    // Virtual joystick
    if (joystick && joystick.active) {
      nx += joystick.dx;
      ny += joystick.dy;
    }

    if (nx !== 0 || ny !== 0) {
      const len = Math.hypot(nx, ny);
      this.navSystem.applyThrust(nx / len, ny / len, delta);
      this._isThrusting = true;
      this.soundSystem.thrusterOn();
    } else {
      this._isThrusting = false;
      this.soundSystem.thrusterOff();
    }
  }

  _softFollowShip(delta) {
    const shouldFollow = this._isThrusting || !!this.navSystem.target;
    if (!shouldFollow) return;
    if (this.cameraSystem.isPanning()) return;

    if (this._followDelay > 0) {
      this._followDelay -= delta;
      return;
    }

    const cam = this.cameras.main;
    const targetScrollX = this.ship.x - cam.width  * 0.5 / cam.zoom;
    const targetScrollY = this.ship.y - cam.height * 0.5 / cam.zoom;
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
    const hov = this._hoveredBody && this._hoveredBody.obj;

    this.star.label.setVisible(zoom >= 0.14 || hov === this.star);

    for (const planet of this.planets) {
      planet.label.setVisible(zoom >= 0.28 || hov === planet);
      for (const moon of planet.moons) {
        moon.label.setVisible(zoom >= 0.85 || hov === moon);
      }
    }
  }

  _handleTap(screenX, screenY) {
    const wp = this.cameras.main.getWorldPoint(screenX, screenY);

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

  travelTo(bodyObj) {
    this.navSystem.setTarget(bodyObj);
    this._ui().setStatus('En route to ' + bodyObj.data.name + '…');
    this._ui().hideCard();
    this.cameraSystem.focusOn(this.ship.x, this.ship.y, 0.45, 600);
    this._followDelay = 700;
  }

  _onDocked(bodyObj) {
    this._ui().setLocation(bodyObj.data.name);
    this._ui().setStatus('');
    this.soundSystem.playDock();
    this.scene.launch('DialogueScene', { bodyData: bodyObj.data });
    this.scene.bringToTop('DialogueScene');
    this.cameraSystem.focusOn(bodyObj.worldX, bodyObj.worldY, 1.2, 900);
  }

  _ui() {
    return this.scene.get('UIScene');
  }
}
