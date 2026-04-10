// NavigationSystem — two movement modes
//
// AUTO mode  : ship steers toward a selected body using velocity blending.
//              Natural orbital-intercept behaviour as the target keeps moving.
//
// MANUAL mode: thrust is applied each frame from keyboard / joystick.
//              Velocity decays via drag so the ship coasts to a stop when
//              controls are released.

const AUTO_SPEED   = 95;   // world units per second (auto-nav cruise speed)
const THRUST       = 240;  // acceleration in units/s² (manual thrust)
const MAX_MANUAL   = 160;  // manual speed cap (units/s)
const DRAG_PER_SEC = 0.12; // fraction of velocity remaining after 1 s (no thrust)
const DOCK_DISTANCE = 28;  // dock when ship is within this radius (world units)

export class NavigationSystem {
  constructor(scene, ship) {
    this.scene = scene;
    this.ship = ship;
    this.target = null;    // body with worldX / worldY; set via setTarget()
    this.onDocked = null;  // callback(bodyObj) fired on dock

    this.vx = 0;
    this.vy = 0;
  }

  // ------------------------------------------------------------------ public

  setTarget(bodyObj) {
    this.target = bodyObj;
  }

  clearTarget() {
    this.target = null;
  }

  /** Called by SolarSystemScene each frame when directional input is detected.
   *  nx, ny: normalised direction vector (already unit-length).
   *  Switches off auto-nav so the player is fully in control. */
  applyThrust(nx, ny, delta) {
    const dt = delta / 1000;
    this.vx += nx * THRUST * dt;
    this.vy += ny * THRUST * dt;

    // Clamp to max manual speed
    const spd = Math.hypot(this.vx, this.vy);
    if (spd > MAX_MANUAL) {
      this.vx = (this.vx / spd) * MAX_MANUAL;
      this.vy = (this.vy / spd) * MAX_MANUAL;
    }

    // Manual input cancels auto-nav
    this.clearTarget();
  }

  update(delta) {
    const dt = delta / 1000;

    if (this.target) {
      this._autoNav(dt);
    } else {
      // Apply drag so the ship glides to a stop
      const decay = Math.pow(DRAG_PER_SEC, dt);
      this.vx *= decay;
      this.vy *= decay;
    }

    // Move ship
    const speed = Math.hypot(this.vx, this.vy);
    const moving = speed > 1.5;

    this.ship.update(moving);

    if (speed > 0.5) {
      this.ship.setPosition(
        this.ship.x + this.vx * dt,
        this.ship.y + this.vy * dt,
      );
      this.ship.setRotation(Math.atan2(this.vy, this.vx));
    }
  }

  // ------------------------------------------------------------------ private

  _autoNav(dt) {
    const tx = this.target.worldX;
    const ty = this.target.worldY;
    const dx = tx - this.ship.x;
    const dy = ty - this.ship.y;
    const dist = Math.hypot(dx, dy);

    if (dist < DOCK_DISTANCE) {
      const docked = this.target;
      this.clearTarget();
      this.vx = 0;
      this.vy = 0;
      if (this.onDocked) this.onDocked(docked);
      return;
    }

    // Directly set velocity toward target each frame — ship moves at full speed
    // immediately and always tracks the orbiting target's current position.
    const nx = dx / dist;
    const ny = dy / dist;
    this.vx = nx * AUTO_SPEED;
    this.vy = ny * AUTO_SPEED;
  }
}
