// EncounterShip — NPC vessel that drifts through the solar system.
// Each ship type has a distinct silhouette. Nose points toward negative-Y
// at rotation 0 (same convention as Spaceship), then the container is
// rotated to match the heading direction.

export class EncounterShip {
  constructor(scene, x, y, vx, vy, shipData) {
    this.data     = shipData;
    this.vx       = vx;
    this.vy       = vy;
    this._showingWarning = false;

    // Container positioned at world coordinates
    this.container = scene.add.container(x, y).setDepth(3);

    // Ship graphic (redrawn once; rotated via container)
    this._shipG = scene.add.graphics();
    this._drawShip();
    this.container.add(this._shipG);

    // "!" warning label above ship (hidden by default)
    this._warnText = scene.add.text(0, -36, '!', {
      fontSize: '20px',
      fontFamily: "'Arial', sans-serif",
      fontStyle: 'bold',
      color: '#FFFF44',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5).setVisible(false);
    this.container.add(this._warnText);

    // Name label (visible when close)
    this.label = scene.add.text(0, 28, shipData.name, {
      fontSize: '10px',
      fontFamily: "'Arial', sans-serif",
      color: '#AABBCC',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setVisible(false);
    this.container.add(this.label);

    // Point nose toward initial heading
    if (Math.hypot(vx, vy) > 0.1) {
      this.container.rotation = Math.atan2(vy, vx) + Math.PI / 2;
    }

    this.hitRadius = 28;
  }

  // ------------------------------------------------------------------ getters

  get worldX() { return this.container.x; }
  get worldY() { return this.container.y; }

  // ------------------------------------------------------------------ public

  showWarning(visible) {
    this._showingWarning = visible;
    this._warnText.setVisible(visible);
    this.label.setVisible(visible);
  }

  update(dt, time) {
    this.container.x += this.vx * dt;
    this.container.y += this.vy * dt;

    if (this._showingWarning) {
      this._warnText.setAlpha(0.55 + 0.45 * Math.sin(time * 0.009));
    }
  }

  destroy() {
    this.container.destroy();
  }

  // ------------------------------------------------------------------ drawing

  _drawShip() {
    const g = this._shipG;
    const c = this.data.bodyColor;
    const a = this.data.accentColor;

    switch (this.data.id) {
      case 'trader':   this._drawTrader(g, c, a);   break;
      case 'pirate':   this._drawPirate(g, c, a);   break;
      case 'explorer': this._drawExplorer(g, c, a); break;
      case 'warship':  this._drawWarship(g, c, a);  break;
    }
  }

  /** Wide cargo freighter — blocky, utilitarian */
  _drawTrader(g, c, a) {
    // Cargo hold (wide rectangle)
    g.fillStyle(c, 1);
    g.fillRect(-14, -6, 28, 20);
    // Nose cone
    g.fillStyle(a, 1);
    g.fillTriangle(0, -16, -10, -6, 10, -6);
    // Engine pods
    g.fillStyle(a, 0.85);
    g.fillRect(-18, 10, 7, 5);
    g.fillRect(11,  10, 7, 5);
    // Window stripe
    g.fillStyle(0xAADDFF, 0.65);
    g.fillRect(-8, -5, 16, 7);
  }

  /** Aggressive fighter — sharp delta wings */
  _drawPirate(g, c, a) {
    // Narrow hull
    g.fillStyle(c, 1);
    g.fillTriangle(0, -18, -9, 12, 9, 12);
    // Wing spikes
    g.fillStyle(a, 0.9);
    g.fillTriangle(-9, 2, -22, 14, -3, 9);
    g.fillTriangle(9,  2,  22, 14,  3, 9);
    // Red cockpit
    g.fillStyle(0xFF2200, 0.95);
    g.fillCircle(0, -5, 4);
  }

  /** Long science probe — thin tube with sensor dish */
  _drawExplorer(g, c, a) {
    // Long body tube
    g.fillStyle(c, 1);
    g.fillRect(-4, -16, 8, 34);
    // Sensor dish at top
    g.fillStyle(a, 1);
    g.fillCircle(0, -16, 9);
    // Solar panels
    g.fillStyle(a, 0.5);
    g.fillRect(-18, -12, 14, 7);
    g.fillRect(4,   -12, 14, 7);
    g.lineStyle(1, a, 0.7);
    g.lineBetween(-4, -8, -18, -8);
    g.lineBetween(4,  -8,  18, -8);
  }

  /** Heavy battle cruiser — hexagonal hull with gun turrets */
  _drawWarship(g, c, a) {
    g.fillStyle(c, 1);
    g.fillPoints([
      { x:  0, y: -22 },
      { x: 17, y:  -9 },
      { x: 19, y:  13 },
      { x:  0, y:  20 },
      { x:-19, y:  13 },
      { x:-17, y:  -9 },
    ], true);
    g.lineStyle(2, a, 0.85);
    g.lineBetween(-13, -7, 13, -7);      // bridge stripe
    g.fillStyle(a, 1);
    g.fillCircle(-10, 2, 5);             // left turret
    g.fillCircle( 10, 2, 5);             // right turret
    g.fillStyle(0x112244, 0.9);
    g.fillCircle(0, -12, 6);             // dark cockpit
  }
}
