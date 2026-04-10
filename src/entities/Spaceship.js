// Spaceship — player vessel, drawn procedurally as a triangle
const TRAIL_MAX = 28;
const TRAIL_FADE = 0.06;

export class Spaceship {
  constructor(scene, x, y) {
    this.scene = scene;

    // Engine trail (rendered before the ship so it appears behind)
    this.trailGraphics = scene.add.graphics();
    this.trailPoints = []; // { x, y, alpha }

    // Ship container (holds the triangle graphic)
    this.container = scene.add.container(x, y);
    this._shipG = scene.add.graphics();
    this._draw();
    this.container.add(this._shipG);

    // Engine glow (separate graphics, inside container)
    this._engineG = scene.add.graphics();
    this.container.add(this._engineG);

    // Depth ordering
    this.trailGraphics.setDepth(2);
    this.container.setDepth(4);
  }

  _draw() {
    const g = this._shipG;
    g.clear();

    const s = 11; // half-size

    // Main hull triangle (nose pointing up = rotation 0)
    g.fillStyle(0xEEEEFF, 1);
    g.fillTriangle(0, -s * 1.1, -s * 0.7, s * 0.7, s * 0.7, s * 0.7);

    // Cockpit window
    g.fillStyle(0x66BBFF, 0.85);
    g.fillTriangle(0, -s * 0.35, -s * 0.3, s * 0.3, s * 0.3, s * 0.3);

    // Wing highlights
    g.fillStyle(0xCCCCFF, 0.5);
    g.fillTriangle(-s * 0.7, s * 0.7, -s * 0.35, 0, 0, s * 0.7);
    g.fillTriangle(s * 0.7, s * 0.7, s * 0.35, 0, 0, s * 0.7);
  }

  _drawEngineGlow(intensity) {
    const g = this._engineG;
    g.clear();
    if (intensity <= 0) return;

    const s = 11;
    // Engine exhaust glow at ship base
    g.fillStyle(0x4499FF, 0.7 * intensity);
    g.fillCircle(0, s * 0.85, s * 0.28 * intensity);
    g.fillStyle(0x88CCFF, 0.4 * intensity);
    g.fillCircle(0, s * 0.85, s * 0.48 * intensity);
  }

  get x() { return this.container.x; }
  get y() { return this.container.y; }

  setPosition(x, y) {
    this.container.setPosition(x, y);
  }

  setRotation(angle) {
    // angle from atan2 points right at 0, we need nose-forward (+90 deg)
    this.container.rotation = angle + Math.PI / 2;
  }

  // Call once per frame; pass isMoving = true when ship is travelling
  update(isMoving) {
    // Add current position to trail
    if (isMoving) {
      this.trailPoints.push({ x: this.container.x, y: this.container.y, alpha: 0.8 });
    }

    // Fade trail
    for (const pt of this.trailPoints) {
      pt.alpha -= TRAIL_FADE;
    }
    this.trailPoints = this.trailPoints.filter(p => p.alpha > 0);
    if (this.trailPoints.length > TRAIL_MAX) this.trailPoints.shift();

    // Render trail
    this.trailGraphics.clear();
    for (let i = 1; i < this.trailPoints.length; i++) {
      const p = this.trailPoints[i];
      this.trailGraphics.lineStyle(2, 0x4499FF, p.alpha * 0.55);
      this.trailGraphics.lineBetween(
        this.trailPoints[i - 1].x, this.trailPoints[i - 1].y,
        p.x, p.y
      );
    }

    // Engine glow
    this._drawEngineGlow(isMoving ? 1 : 0);
  }
}
