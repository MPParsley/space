// Asteroid — irregular procedural rock that drifts through space

const ROCK_COLORS = [0x887766, 0x998877, 0x776655, 0x9A8870, 0xAA9988];

export class Asteroid {
  constructor(scene, x, y, vx, vy, radius) {
    this.x      = x;
    this.y      = y;
    this.vx     = vx;
    this.vy     = vy;
    this.radius = radius;

    this._angle = Math.random() * Math.PI * 2;
    this._spin  = (Math.random() - 0.5) * 1.8; // rad/s
    this._pts   = this._makeShape(radius);
    this._color = ROCK_COLORS[Math.floor(Math.random() * ROCK_COLORS.length)];
    this._g     = scene.add.graphics().setDepth(2.5);
    this._drawSelf();
  }

  // ------------------------------------------------------------------ private

  _makeShape(r) {
    const count = 7 + Math.floor(Math.random() * 4); // 7–10 vertices
    const pts = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const d = r * (0.58 + Math.random() * 0.56);
      pts.push({ x: Math.cos(a) * d, y: Math.sin(a) * d });
    }
    return pts;
  }

  _drawSelf() {
    const g   = this._g;
    const cos = Math.cos(this._angle);
    const sin = Math.sin(this._angle);

    // Rotate shape points around asteroid centre
    const world = this._pts.map(p => ({
      x: this.x + p.x * cos - p.y * sin,
      y: this.y + p.x * sin + p.y * cos,
    }));

    g.clear();

    // Body
    g.fillStyle(this._color, 1);
    g.fillPoints(world, true);
    g.lineStyle(1, 0xCCBBAA, 0.55);
    g.strokePoints(world, true);

    // Small highlight spot (gives a 3-D feel)
    const hx = this.x + Math.cos(this._angle + 0.8) * this.radius * 0.32;
    const hy = this.y + Math.sin(this._angle + 0.8) * this.radius * 0.32;
    g.fillStyle(0xDDCCBB, 0.28);
    g.fillCircle(hx, hy, this.radius * 0.22);
  }

  // ------------------------------------------------------------------ public

  update(dt) {
    this.x       += this.vx * dt;
    this.y       += this.vy * dt;
    this._angle  += this._spin * dt;
    this._drawSelf();
  }

  destroy() {
    this._g.destroy();
  }
}
