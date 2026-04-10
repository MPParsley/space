// AsteroidSystem — spawns asteroids from camera edges, manages bullets,
// detects collisions, and produces explosion effects.

import { Asteroid } from '../entities/Asteroid.js';

const SPAWN_INTERVAL = 2800; // ms between spawns (base)
const SPAWN_JITTER   = 1200; // ± ms random variation
const MAX_ASTEROIDS  = 10;   // hard cap on simultaneous rocks
const ASTEROID_SPEED = 52;   // world units / s
const BULLET_SPEED   = 510;  // world units / s
const BULLET_LIFE    = 1.9;  // seconds before bullet expires
const EXPLODE_LIFE   = 0.55; // seconds for explosion ring to expand

export class AsteroidSystem {
  constructor(scene) {
    this._scene   = scene;
    this._rocks   = [];
    this._bullets = [];
    this._bangs   = []; // explosion visual effects
    this._g       = scene.add.graphics().setDepth(5);
    this._spawnT  = 1800; // delay before first asteroid appears

    this.score     = 0;
    this.onScore   = null; // callback(score) fired on each destroy
    this.onDestroy = null; // callback(x, y) for sounds etc.
  }

  // ------------------------------------------------------------------ public

  /** Fire a bullet from world position (x, y) in direction `angle` radians. */
  shoot(x, y, angle) {
    this._bullets.push({
      x, y,
      vx: Math.cos(angle) * BULLET_SPEED,
      vy: Math.sin(angle) * BULLET_SPEED,
      life: BULLET_LIFE,
    });
  }

  update(delta, camera) {
    const dt = delta / 1000;

    // --- Spawn ---
    this._spawnT -= delta;
    if (this._spawnT <= 0) {
      if (this._rocks.length < MAX_ASTEROIDS) this._spawnRock(camera);
      this._spawnT = SPAWN_INTERVAL + (Math.random() * 2 - 1) * SPAWN_JITTER;
    }

    // --- Move asteroids ---
    for (const r of this._rocks) r.update(dt);

    // --- Move bullets ---
    for (const b of this._bullets) {
      b.x    += b.vx * dt;
      b.y    += b.vy * dt;
      b.life -= dt;
    }
    this._bullets = this._bullets.filter(b => b.life > 0);

    // --- Advance explosion timers ---
    for (const e of this._bangs) e.t += dt;
    this._bangs = this._bangs.filter(e => e.t < EXPLODE_LIFE);

    // --- Bullet × asteroid collisions ---
    outer:
    for (let bi = this._bullets.length - 1; bi >= 0; bi--) {
      const b = this._bullets[bi];
      for (let ri = this._rocks.length - 1; ri >= 0; ri--) {
        const r = this._rocks[ri];
        if (Math.hypot(b.x - r.x, b.y - r.y) < r.radius + 2) {
          this._bangs.push({ x: r.x, y: r.y, t: 0, r: r.radius });
          if (this.onDestroy) this.onDestroy(r.x, r.y);
          r.destroy();
          this._rocks.splice(ri, 1);
          this._bullets.splice(bi, 1);
          this.score++;
          if (this.onScore) this.onScore(this.score);
          continue outer;
        }
      }
    }

    // --- Cull off-screen asteroids ---
    const margin = 400;
    const camL = camera.scrollX - margin;
    const camT = camera.scrollY - margin;
    const camR = camera.scrollX + camera.width  / camera.zoom + margin;
    const camB = camera.scrollY + camera.height / camera.zoom + margin;

    this._rocks = this._rocks.filter(r => {
      if (r.x < camL || r.x > camR || r.y < camT || r.y > camB) {
        r.destroy();
        return false;
      }
      return true;
    });

    // --- Draw bullets + explosions ---
    this._draw();
  }

  // ------------------------------------------------------------------ private

  _spawnRock(camera) {
    const camW  = camera.width  / camera.zoom;
    const camH  = camera.height / camera.zoom;
    const camL  = camera.scrollX;
    const camT  = camera.scrollY;
    const camR  = camL + camW;
    const camB  = camT + camH;
    const camCX = camL + camW * 0.5;
    const camCY = camT + camH * 0.5;
    const margin = 80;

    // Pick a random edge of the visible area to spawn from
    const edge = Math.floor(Math.random() * 4);
    let sx, sy;
    if      (edge === 0) { sx = camL + Math.random() * camW; sy = camT - margin; }
    else if (edge === 1) { sx = camR + margin;               sy = camT + Math.random() * camH; }
    else if (edge === 2) { sx = camL + Math.random() * camW; sy = camB + margin; }
    else                 { sx = camL - margin;               sy = camT + Math.random() * camH; }

    // Aim toward a random point near screen centre
    const tx = camCX + (Math.random() - 0.5) * camW * 0.55;
    const ty = camCY + (Math.random() - 0.5) * camH * 0.55;
    const dx = tx - sx;
    const dy = ty - sy;
    const d  = Math.hypot(dx, dy) || 1;
    const spd = ASTEROID_SPEED * (0.5 + Math.random() * 0.9);

    const radius = 8 + Math.random() * 18;
    this._rocks.push(new Asteroid(
      this._scene, sx, sy,
      (dx / d) * spd, (dy / d) * spd,
      radius,
    ));
  }

  _draw() {
    const g = this._g;
    g.clear();

    // Bullets
    for (const b of this._bullets) {
      g.fillStyle(0xFFDD44, 0.35);
      g.fillCircle(b.x, b.y, 5);
      g.fillStyle(0xFFFF99, 1);
      g.fillCircle(b.x, b.y, 2.5);
    }

    // Explosions
    for (const e of this._bangs) {
      const p = e.t / EXPLODE_LIFE;
      const r = (e.r + 4) + p * 38;
      const a = 1 - p;

      g.lineStyle(3 * a,   0xFF8833, a * 0.9);
      g.strokeCircle(e.x, e.y, r);

      g.lineStyle(1.5, 0xFFCC66, a * 0.6);
      g.strokeCircle(e.x, e.y, r * 0.5);

      if (p < 0.2) {
        const fa = (0.2 - p) / 0.2;
        g.fillStyle(0xFFFFCC, fa * 0.85);
        g.fillCircle(e.x, e.y, e.r * 0.9);
      }
    }
  }
}
