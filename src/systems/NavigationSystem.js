// NavigationSystem — steers the ship toward a selected target body
// The ship chases the body's *current* position each frame,
// producing natural orbital-intercept behaviour.

const SHIP_SPEED = 95;     // world units per second
const DOCK_DISTANCE = 28;  // dock when within this distance (world units)

export class NavigationSystem {
  constructor(scene, ship) {
    this.scene = scene;
    this.ship = ship;
    this.target = null;       // body object with worldX / worldY
    this.onDocked = null;     // callback(bodyObj)
    this.isMoving = false;
  }

  setTarget(bodyObj) {
    this.target = bodyObj;
    this.isMoving = true;
  }

  clearTarget() {
    this.target = null;
    this.isMoving = false;
  }

  update(delta) {
    const moving = !!(this.target);
    this.ship.update(moving);

    if (!this.target) return;

    const tx = this.target.worldX;
    const ty = this.target.worldY;
    const dx = tx - this.ship.x;
    const dy = ty - this.ship.y;
    const dist = Math.hypot(dx, dy);

    if (dist < DOCK_DISTANCE) {
      const docked = this.target;
      this.clearTarget();
      if (this.onDocked) this.onDocked(docked);
      return;
    }

    // Advance ship toward target
    const step = SHIP_SPEED * (delta / 1000);
    const move = Math.min(step, dist);
    this.ship.setPosition(
      this.ship.x + (dx / dist) * move,
      this.ship.y + (dy / dist) * move,
    );

    // Rotate ship nose toward travel direction
    this.ship.setRotation(Math.atan2(dy, dx));
  }
}
