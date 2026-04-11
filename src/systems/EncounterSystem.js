// EncounterSystem — spawns NPC ships from the camera edges, moves them,
// detects proximity to the player, and fires the encounter callback.

import { EncounterShip } from '../entities/EncounterShip.js';
import { ENCOUNTER_SHIPS } from '../data/encounters.js';

const SPAWN_INTERVAL_MIN = 14000; // ms
const SPAWN_INTERVAL_MAX = 26000; // ms
const MAX_SHIPS          = 3;
const WARN_RADIUS        = 210;   // "!" appears at this world-unit distance
const TRIGGER_RADIUS     = 160;   // encounter window opens at this distance
const WARN_HOLD_MS       = 1800;  // ms player must stay in range before trigger
const CULL_MARGIN        = 500;   // world units outside camera before culling

export class EncounterSystem {
  constructor(scene, playerShip) {
    this._scene      = scene;
    this._player     = playerShip;
    this._ships      = [];
    this._spawnT     = 9000;       // first ship appears after 9 s
    this._inEncounter = false;     // block simultaneous encounters
    this._warnShip   = null;       // ship currently warning
    this._warnTimer  = 0;

    this.onEncounter = null;       // callback(shipData, shipObj)
  }

  // ------------------------------------------------------------------ public

  /** Call once per frame from SolarSystemScene.update(). */
  update(delta, time) {
    const dt = delta / 1000;

    // Spawn
    this._spawnT -= delta;
    if (this._spawnT <= 0) {
      if (this._ships.length < MAX_SHIPS) this._spawnShip();
      this._spawnT = SPAWN_INTERVAL_MIN +
        Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
    }

    // Move + animate
    for (const s of this._ships) s.update(dt, time);

    // Cull off-screen ships (skip if currently warning/encountering)
    const cam    = this._scene.cameras.main;
    const camL   = cam.scrollX - CULL_MARGIN;
    const camT   = cam.scrollY - CULL_MARGIN;
    const camR   = cam.scrollX + cam.width  / cam.zoom + CULL_MARGIN;
    const camB   = cam.scrollY + cam.height / cam.zoom + CULL_MARGIN;

    this._ships = this._ships.filter(s => {
      if (s === this._warnShip) return true; // never cull the warning ship
      const inBounds = s.worldX > camL && s.worldX < camR &&
                       s.worldY > camT && s.worldY < camB;
      if (!inBounds) { s.destroy(); return false; }
      return true;
    });

    // Proximity detection (skip if already in encounter)
    if (this._inEncounter) return;

    let closestShip = null;
    let closestDist = Infinity;

    for (const s of this._ships) {
      const dist = Math.hypot(this._player.x - s.worldX, this._player.y - s.worldY);
      if (dist < closestDist) { closestDist = dist; closestShip = s; }
    }

    if (closestDist < WARN_RADIUS) {
      if (this._warnShip !== closestShip) {
        // New warning target — reset timer, show "!"
        if (this._warnShip) this._warnShip.showWarning(false);
        this._warnShip  = closestShip;
        this._warnTimer = WARN_HOLD_MS;
        closestShip.showWarning(true);
      } else {
        this._warnTimer -= delta;
        if (this._warnTimer <= 0 && closestDist < TRIGGER_RADIUS) {
          this._trigger(closestShip);
        }
      }
    } else if (this._warnShip) {
      // Player moved away — cancel warning
      this._warnShip.showWarning(false);
      this._warnShip = null;
    }
  }

  /** Remove and destroy a specific NPC ship (called after encounter resolves). */
  dismissShip(ship) {
    const idx = this._ships.indexOf(ship);
    if (idx >= 0) {
      this._ships.splice(idx, 1);
      ship.destroy();
    }
    if (this._warnShip === ship) this._warnShip = null;
    this._inEncounter = false;
  }

  /** Re-enable encounter triggering without removing the ship (e.g. after battle). */
  clearEncounterFlag() {
    this._inEncounter = false;
    if (this._warnShip) {
      this._warnShip.showWarning(false);
      this._warnShip = null;
    }
  }

  // ------------------------------------------------------------------ private

  _trigger(ship) {
    this._inEncounter = true;
    ship.showWarning(false);
    this._warnShip = null;
    if (this.onEncounter) this.onEncounter(ship.data, ship);
  }

  _spawnShip() {
    const cam  = this._scene.cameras.main;
    const camW = cam.width  / cam.zoom;
    const camH = cam.height / cam.zoom;
    const camL = cam.scrollX;
    const camT = cam.scrollY;
    const camR = camL + camW;
    const camB = camT + camH;
    const margin = 80;

    // Pick a random edge
    const edge = Math.floor(Math.random() * 4);
    let sx, sy;
    if      (edge === 0) { sx = camL + Math.random() * camW; sy = camT - margin; }
    else if (edge === 1) { sx = camR + margin;               sy = camT + Math.random() * camH; }
    else if (edge === 2) { sx = camL + Math.random() * camW; sy = camB + margin; }
    else                 { sx = camL - margin;               sy = camT + Math.random() * camH; }

    // Aim toward a random point near the centre of the visible area
    const tx = camL + camW * (0.25 + Math.random() * 0.5);
    const ty = camT + camH * (0.25 + Math.random() * 0.5);
    const dx = tx - sx;
    const dy = ty - sy;
    const d  = Math.hypot(dx, dy) || 1;

    // Pick a random ship type
    const data = ENCOUNTER_SHIPS[Math.floor(Math.random() * ENCOUNTER_SHIPS.length)];
    const spd  = data.speed * (0.55 + Math.random() * 0.45);

    this._ships.push(
      new EncounterShip(this._scene, sx, sy, (dx / d) * spd, (dy / d) * spd, data),
    );
  }
}
