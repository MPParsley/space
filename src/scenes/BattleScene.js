// BattleScene — ship-to-ship combat mode.
// Entered from SolarSystemScene when the player attacks or is attacked.
// SolarSystemScene + UIScene are sleeping during battle.

import { Spaceship } from '../entities/Spaceship.js';
import { NavigationSystem } from '../systems/NavigationSystem.js';
import { SoundSystem } from '../systems/SoundSystem.js';

const PLAYER_HP_MAX  = 100;
const BULLET_SPEED   = 490;
const FIRE_RATE_MS   = 340;   // player fire rate
const ARENA_MARGIN   = 40;    // keep ships this far from screen edges
const HUD_HEIGHT     = 58;    // height of the top HUD strip

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene', active: false });
  }

  init(data) {
    this._enemyData = data.enemyData;
  }

  create() {
    const { width, height } = this.scale;
    this._width  = width;
    this._height = height;

    this._sound = new SoundSystem();
    this._keys  = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      d: Phaser.Input.Keyboard.KeyCodes.D,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    // ---- Background ----
    this._createBg(width, height);

    // ---- Player ship ----
    this._playerHp   = PLAYER_HP_MAX;
    this._playerShip = new Spaceship(this, width * 0.22, height * 0.5);
    this._playerNav  = new NavigationSystem(this, this._playerShip);
    this._fireTimer  = 0;
    this._playerHit  = 0; // flash timer

    // ---- Enemy ship ----
    this._enemy = {
      x:         width * 0.78,
      y:         height * 0.5,
      vx:        0,
      vy:        0,
      hp:        this._enemyData.hpMax,
      fireTimer: 1200,
      state:     'approach',
      stateT:    0,
      hitFlash:  0,
    };
    this._enemyContainer = this.add.container(this._enemy.x, this._enemy.y).setDepth(4);
    this._enemyG         = this.add.graphics();
    this._enemyContainer.add(this._enemyG);

    // ---- Bullets ----
    this._bullets  = [];
    this._bulletG  = this.add.graphics().setDepth(5);

    // ---- HUD ----
    this._hudG    = this.add.graphics().setDepth(8);
    this._hudText = this._buildHudText(width);
    this._buildMobileButtons(width, height);

    // ---- Explosions (reuse bullet graphics layer) ----
    this._bangs = [];

    // ---- Battle state ----
    this._over      = false;
    this._overTimer = 0;
    this._resultContainer = null;

    // ---- Intro flash ----
    this.cameras.main.flash(400, 180, 20, 20);
    this._showBattleAnnouncement(width, height);
  }

  // ------------------------------------------------------------------ update

  update(time, delta) {
    if (this._over) {
      this._overTimer -= delta;
      if (this._overTimer <= 0 && this._resultContainer === null) {
        this._showResult(this._playerHp > 0);
      }
      return;
    }

    const dt = delta / 1000;

    this._handlePlayerInput(delta);
    this._playerNav.update(delta);
    this._clampShip(this._playerShip);

    this._updateEnemy(delta, dt);
    this._updateBullets(dt);
    this._checkCollisions();

    this._playerHit = Math.max(0, this._playerHit - dt * 3);
    this._enemy.hitFlash = Math.max(0, this._enemy.hitFlash - dt * 3);

    for (const b of this._bangs) b.t += dt;
    this._bangs = this._bangs.filter(b => b.t < 0.55);

    this._drawAll(time);
    this._drawHud();
  }

  // ------------------------------------------------------------------ player

  _handlePlayerInput(delta) {
    const k  = this._keys;
    let nx = 0, ny = 0;
    if (k.left.isDown  || k.a.isDown) nx -= 1;
    if (k.right.isDown || k.d.isDown) nx += 1;
    if (k.up.isDown    || k.w.isDown) ny -= 1;
    if (k.down.isDown  || k.s.isDown) ny += 1;

    const ui = this._mobileFireActive;
    const joyActive = this._joystick && this._joystick.active;
    if (joyActive) { nx += this._joystick.dx; ny += this._joystick.dy; }

    if (nx !== 0 || ny !== 0) {
      const len = Math.hypot(nx, ny);
      this._playerNav.applyThrust(nx / len, ny / len, delta);
    }

    // Fire
    this._fireTimer -= delta;
    if (this._fireTimer <= 0 && (k.space.isDown || ui)) {
      const angle = this._playerShip.container.rotation - Math.PI / 2;
      this._spawnBullet(
        this._playerShip.x, this._playerShip.y,
        Math.cos(angle) * BULLET_SPEED, Math.sin(angle) * BULLET_SPEED,
        true,
      );
      this._sound.playShoot();
      this._fireTimer = FIRE_RATE_MS;
    }
  }

  _clampShip(ship) {
    const m  = ARENA_MARGIN;
    const mt = HUD_HEIGHT + m;
    ship.setPosition(
      Phaser.Math.Clamp(ship.x, m, this._width  - m),
      Phaser.Math.Clamp(ship.y, mt, this._height - m),
    );
  }

  // ------------------------------------------------------------------ enemy AI

  _updateEnemy(delta, dt) {
    const e   = this._enemy;
    const px  = this._playerShip.x;
    const py  = this._playerShip.y;
    const dx  = px - e.x;
    const dy  = py - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx  = dx / dist;
    const ny  = dy / dist;
    const spd = this._enemyData.speed;

    e.stateT -= delta;

    // State transitions
    if (e.state === 'approach' && dist < 220) e.state = 'strafe';
    if (e.state === 'strafe'   && dist > 260) e.state = 'approach';
    if (e.hp < this._enemyData.hpMax * 0.3 && e.state !== 'evade' && e.stateT <= 0) {
      e.state  = 'evade';
      e.stateT = 1200;
    }
    if (e.state === 'evade' && e.stateT <= 0) {
      e.state = 'approach';
    }

    // Movement
    let tvx = 0, tvy = 0;
    if (e.state === 'approach') {
      tvx = nx * spd; tvy = ny * spd;
    } else if (e.state === 'strafe') {
      // Circle around player (perpendicular + slight closing)
      tvx = (-ny * spd * 0.85) + (nx * spd * 0.18);
      tvy = ( nx * spd * 0.85) + (ny * spd * 0.18);
    } else { // evade
      tvx = -nx * spd * 1.2; tvy = -ny * spd * 1.2;
    }

    const blend = Math.min(1, 4.5 * dt);
    e.vx += (tvx - e.vx) * blend;
    e.vy += (tvy - e.vy) * blend;

    e.x += e.vx * dt;
    e.y += e.vy * dt;

    // Clamp to arena
    const m = ARENA_MARGIN;
    e.x = Phaser.Math.Clamp(e.x, m, this._width  - m);
    e.y = Phaser.Math.Clamp(e.y, HUD_HEIGHT + m, this._height - m);

    // Update container position + face player
    this._enemyContainer.setPosition(e.x, e.y);
    this._enemyContainer.rotation = Math.atan2(dy, dx) + Math.PI / 2;

    // Fire
    e.fireTimer -= delta;
    if (e.fireTimer <= 0 && dist < 340) {
      this._spawnBullet(e.x, e.y, nx * BULLET_SPEED * 0.88, ny * BULLET_SPEED * 0.88, false);
      this._sound.playEnemyShoot();
      e.fireTimer = this._enemyData.bulletInterval * (0.8 + Math.random() * 0.4);
    }
  }

  // ------------------------------------------------------------------ bullets

  _spawnBullet(x, y, vx, vy, isPlayer) {
    this._bullets.push({ x, y, vx, vy, isPlayer, life: 2.2 });
  }

  _updateBullets(dt) {
    for (const b of this._bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
    }
    this._bullets = this._bullets.filter(b =>
      b.life > 0 &&
      b.x > -50 && b.x < this._width  + 50 &&
      b.y > -50 && b.y < this._height + 50,
    );
  }

  _checkCollisions() {
    const e = this._enemy;
    for (let i = this._bullets.length - 1; i >= 0; i--) {
      const b = this._bullets[i];

      if (!b.isPlayer) {
        // Enemy bullet → player
        if (Math.hypot(b.x - this._playerShip.x, b.y - this._playerShip.y) < 16) {
          this._bullets.splice(i, 1);
          this._playerHp  = Math.max(0, this._playerHp - this._enemyData.bulletDamage);
          this._playerHit = 1;
          this._sound.playHit();
          this.cameras.main.shake(160, 0.007);
          if (this._playerHp <= 0) this._endBattle(false);
        }
      } else {
        // Player bullet → enemy
        if (Math.hypot(b.x - e.x, b.y - e.y) < 20) {
          this._bullets.splice(i, 1);
          e.hp        = Math.max(0, e.hp - 25);
          e.hitFlash  = 1;
          this._sound.playHit();
          this._bangs.push({ x: b.x, y: b.y, t: 0, r: 8 });
          if (e.hp <= 0) this._endBattle(true);
        }
      }
    }
  }

  // ------------------------------------------------------------------ drawing

  _drawAll(time) {
    const g = this._bulletG;
    g.clear();

    // Player bullets (yellow)
    for (const b of this._bullets.filter(b => b.isPlayer)) {
      g.fillStyle(0xFFDD44, 0.4); g.fillCircle(b.x, b.y, 5);
      g.fillStyle(0xFFFF99, 1);   g.fillCircle(b.x, b.y, 2.5);
    }
    // Enemy bullets (red)
    for (const b of this._bullets.filter(b => !b.isPlayer)) {
      g.fillStyle(0xFF4400, 0.4); g.fillCircle(b.x, b.y, 5);
      g.fillStyle(0xFF9966, 1);   g.fillCircle(b.x, b.y, 2.5);
    }

    // Explosion sparks
    for (const bang of this._bangs) {
      const p = bang.t / 0.55;
      const a = 1 - p;
      g.lineStyle(2 * a, 0xFF8833, a * 0.9);
      g.strokeCircle(bang.x, bang.y, bang.r + p * 28);
      if (p < 0.2) {
        g.fillStyle(0xFFFFCC, (0.2 - p) / 0.2);
        g.fillCircle(bang.x, bang.y, bang.r);
      }
    }

    // Enemy ship (redrawn each frame for hit flash)
    this._enemyG.clear();
    const flashAlpha = 0.5 + 0.5 * this._enemy.hitFlash;
    const c = this._enemy.hitFlash > 0 ? 0xFF6644 : this._enemyData.bodyColor;
    const a = this._enemy.hitFlash > 0 ? 0xFFBB88 : this._enemyData.accentColor;
    this._drawEnemyShape(this._enemyG, c, a);

    // Player hit flash (screen edge red vignette)
    if (this._playerHit > 0) {
      const hg = this._hudG; // reuse
      hg.fillStyle(0xFF0000, this._playerHit * 0.22);
      hg.fillRect(0, 0, this._width, this._height);
    }
  }

  _drawEnemyShape(g, c, a) {
    switch (this._enemyData.id) {
      case 'trader':
        g.fillStyle(c, 1);  g.fillRect(-14, -6, 28, 20);
        g.fillStyle(a, 1);  g.fillTriangle(0, -16, -10, -6, 10, -6);
        g.fillStyle(a, 0.85); g.fillRect(-18, 10, 7, 5); g.fillRect(11, 10, 7, 5);
        g.fillStyle(0xAADDFF, 0.65); g.fillRect(-8, -5, 16, 7);
        break;
      case 'pirate':
        g.fillStyle(c, 1);  g.fillTriangle(0, -18, -9, 12, 9, 12);
        g.fillStyle(a, 0.9); g.fillTriangle(-9, 2, -22, 14, -3, 9);
        g.fillStyle(a, 0.9); g.fillTriangle(9,  2,  22, 14,  3, 9);
        g.fillStyle(0xFF2200, 0.95); g.fillCircle(0, -5, 4);
        break;
      case 'explorer':
        g.fillStyle(c, 1);  g.fillRect(-4, -16, 8, 34);
        g.fillStyle(a, 1);  g.fillCircle(0, -16, 9);
        g.fillStyle(a, 0.5); g.fillRect(-18, -12, 14, 7); g.fillRect(4, -12, 14, 7);
        break;
      case 'warship':
        g.fillStyle(c, 1);
        g.fillPoints([
          {x:0,y:-22},{x:17,y:-9},{x:19,y:13},{x:0,y:20},{x:-19,y:13},{x:-17,y:-9}
        ], true);
        g.lineStyle(2, a, 0.85); g.lineBetween(-13, -7, 13, -7);
        g.fillStyle(a, 1); g.fillCircle(-10, 2, 5); g.fillCircle(10, 2, 5);
        g.fillStyle(0x112244, 0.9); g.fillCircle(0, -12, 6);
        break;
    }
  }

  _drawHud() {
    const g  = this._hudG;
    const w  = this._width;
    g.clear();

    // HUD strip background
    g.fillStyle(0x04080F, 0.92);
    g.fillRect(0, 0, w, HUD_HEIGHT);
    g.lineStyle(1, 0x1A3A5A, 0.7);
    g.lineBetween(0, HUD_HEIGHT, w, HUD_HEIGHT);

    // Player health bar
    this._drawBar(g, 14, 10, 160, 20, this._playerHp / PLAYER_HP_MAX, 0x22CC55);
    // Enemy health bar
    this._drawBar(g, w - 174, 10, 160, 20,
      this._enemy.hp / this._enemyData.hpMax, 0xCC2222, true);
  }

  _drawBar(g, x, y, bw, bh, frac, color, rightAlign = false) {
    frac = Phaser.Math.Clamp(frac, 0, 1);
    const fillColor = frac > 0.5 ? color : frac > 0.25 ? 0xEECC00 : 0xFF3311;
    const fillW = bw * frac;

    // Background trough
    g.fillStyle(0x0A1020, 1);
    g.fillRect(x, y, bw, bh);
    // Fill
    g.fillStyle(fillColor, 0.9);
    if (rightAlign) {
      g.fillRect(x + bw - fillW, y, fillW, bh);
    } else {
      g.fillRect(x, y, fillW, bh);
    }
    // Border
    g.lineStyle(1, 0x336688, 0.7);
    g.strokeRect(x, y, bw, bh);
  }

  _buildHudText(width) {
    const style = {
      fontSize: '12px',
      fontFamily: "'Arial', sans-serif",
      fontStyle: 'bold',
      color: '#88AACC',
      stroke: '#000000',
      strokeThickness: 3,
    };

    this.add.text(14, 34, 'YOU', style).setDepth(9);

    const nameStyle = {
      ...style,
      fontSize: '14px',
      color: '#' + this._enemyData.accentColor.toString(16).padStart(6, '0'),
    };
    this.add.text(width * 0.5, 20, this._enemyData.name.toUpperCase(), nameStyle)
      .setOrigin(0.5, 0.5).setDepth(9);

    this.add.text(width - 14, 34, 'ENEMY', style).setOrigin(1, 0.5).setDepth(9);
  }

  // ------------------------------------------------------------------ mobile buttons

  _buildMobileButtons(width, height) {
    this._mobileFireActive = false;
    this._joystick = { active: false, dx: 0, dy: 0, pointerId: -1 };

    const FIRE_R = 38;
    const JOY_R  = 48;
    const fireCX = width  - FIRE_R - 20;
    const fireCY = height - FIRE_R - 20;
    const joyCX  = JOY_R  + 20;
    const joyCY  = height - JOY_R  - 20;

    // FIRE button
    const fireG = this.add.graphics().setPosition(fireCX, fireCY).setDepth(9);
    this._drawCircleBtn(fireG, FIRE_R, 0x1E0800, 0xFF5500, 'FIRE');
    fireG.setInteractive(new Phaser.Geom.Circle(0, 0, FIRE_R), Phaser.Geom.Circle.Contains);
    fireG.on('pointerdown', () => { this._mobileFireActive = true;  fireG.setAlpha(1.3); });
    fireG.on('pointerup',   () => { this._mobileFireActive = false; fireG.setAlpha(1);   });
    fireG.on('pointerout',  () => { this._mobileFireActive = false; fireG.setAlpha(1);   });

    // Virtual joystick (left)
    const joyBaseG = this.add.graphics().setPosition(joyCX, joyCY).setDepth(9).setAlpha(0.55);
    const joyThumbG = this.add.graphics().setPosition(joyCX, joyCY).setDepth(9).setAlpha(0.7);
    this._drawJoyBase(joyBaseG, JOY_R);
    joyThumbG.fillStyle(0x55AAEE, 1);
    joyThumbG.fillCircle(0, 0, 22);

    const j = this._joystick;
    const jCenter = { x: joyCX, y: joyCY };
    this.input.on('pointerdown', ptr => {
      if (j.active) return;
      if (Math.hypot(ptr.x - joyCX, ptr.y - joyCY) > JOY_R + 20) return;
      j.active = true; j.pointerId = ptr.id;
    });
    this.input.on('pointermove', ptr => {
      if (!j.active || ptr.id !== j.pointerId) return;
      const dx = ptr.x - joyCX, dy = ptr.y - joyCY;
      const d  = Math.hypot(dx, dy);
      const cl = Math.min(d, JOY_R);
      const nx = d > 0 ? dx / d : 0, ny = d > 0 ? dy / d : 0;
      joyThumbG.setPosition(joyCX + nx * cl, joyCY + ny * cl);
      j.dx = nx * (cl / JOY_R);
      j.dy = ny * (cl / JOY_R);
    });
    const joyRelease = ptr => {
      if (!j.active || ptr.id !== j.pointerId) return;
      j.active = false; j.dx = 0; j.dy = 0;
      joyThumbG.setPosition(joyCX, joyCY);
    };
    this.input.on('pointerup',  joyRelease);
    this.input.on('pointerout', joyRelease);

    // RETREAT button (top-left, below HUD)
    const retreatBtn = this.add.text(14, HUD_HEIGHT + 10, 'RETREAT', {
      fontSize: '13px',
      fontFamily: "'Arial', sans-serif",
      fontStyle: 'bold',
      color: '#AABBCC',
      backgroundColor: '#0A1520',
      padding: { x: 12, y: 7 },
    }).setDepth(9).setInteractive({ useHandCursor: true });
    retreatBtn.on('pointerover', () => retreatBtn.setStyle({ backgroundColor: '#1A2A40' }));
    retreatBtn.on('pointerout',  () => retreatBtn.setStyle({ backgroundColor: '#0A1520' }));
    retreatBtn.on('pointerdown', () => {
      if (!this._over) this._endBattle(null); // null = retreat
    });
  }

  _drawCircleBtn(g, r, bg, border, label) {
    g.fillStyle(bg, 0.9); g.fillCircle(0, 0, r);
    g.lineStyle(2, border, 1);   g.strokeCircle(0, 0, r);
    g.lineStyle(1, border, 0.45); g.strokeCircle(0, 0, r * 0.7);
    this.add.text(g.x, g.y, label, {
      fontSize: '14px', fontFamily: "'Arial', sans-serif", fontStyle: 'bold',
      color: '#FF8800', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setDepth(10);
  }

  _drawJoyBase(g, r) {
    g.fillStyle(0x112244, 1); g.fillCircle(0, 0, r);
    g.lineStyle(2, 0x2255BB, 1); g.strokeCircle(0, 0, r);
    g.lineStyle(1.5, 0x4477BB, 0.6);
    g.lineBetween(0, -r + 10, 0, r - 10);
    g.lineBetween(-r + 10, 0, r - 10, 0);
  }

  // ------------------------------------------------------------------ background

  _createBg(width, height) {
    const bg = this.add.graphics();
    bg.fillStyle(0x010508, 1);
    bg.fillRect(0, 0, width, height);

    // Subtle red combat atmosphere at edges
    bg.fillStyle(0x200000, 0.22);
    bg.fillRect(0, 0, width, height);

    // Stars
    const rng = new Phaser.Math.RandomDataGenerator(['battle']);
    const starG = this.add.graphics();
    for (let i = 0; i < 180; i++) {
      const x = rng.integerInRange(0, width);
      const y = rng.integerInRange(HUD_HEIGHT, height);
      const a = 0.2 + rng.frac() * 0.7;
      starG.fillStyle(0xFFFFFF, a);
      starG.fillRect(x, y, rng.frac() > 0.85 ? 2 : 1, rng.frac() > 0.85 ? 2 : 1);
    }

    // Arena border glow
    const borderG = this.add.graphics();
    borderG.lineStyle(2, 0x331111, 0.7);
    borderG.strokeRect(2, HUD_HEIGHT + 2, width - 4, height - HUD_HEIGHT - 4);
  }

  // ------------------------------------------------------------------ battle end

  _showBattleAnnouncement(width, height) {
    const txt = this.add.text(width * 0.5, height * 0.5, 'BATTLE!', {
      fontSize: '52px',
      fontFamily: "'Arial', sans-serif",
      fontStyle: 'bold',
      color: '#FF3311',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5, 0.5).setDepth(20).setAlpha(0);

    this.tweens.add({
      targets: txt,
      alpha:   { from: 1, to: 0 },
      scaleX:  { from: 1.2, to: 1.6 },
      scaleY:  { from: 1.2, to: 1.6 },
      duration: 900,
      ease: 'Cubic.Out',
      onComplete: () => txt.destroy(),
    });
  }

  _endBattle(playerWon) {
    if (this._over) return;
    this._over = true;

    if (playerWon === true) {
      // Enemy explodes
      for (let i = 0; i < 5; i++) {
        this.time.delayedCall(i * 90, () => {
          this._bangs.push({
            x: this._enemy.x + (Math.random() - 0.5) * 30,
            y: this._enemy.y + (Math.random() - 0.5) * 30,
            t: 0, r: 14 + Math.random() * 10,
          });
          this._sound.playExplode();
        });
      }
      this._enemyG.clear();
      this._overTimer = 700;
    } else if (playerWon === false) {
      // Player explodes
      for (let i = 0; i < 4; i++) {
        this.time.delayedCall(i * 80, () => {
          this._bangs.push({
            x: this._playerShip.x + (Math.random() - 0.5) * 24,
            y: this._playerShip.y + (Math.random() - 0.5) * 24,
            t: 0, r: 12 + Math.random() * 8,
          });
          this._sound.playExplode();
        });
      }
      this._overTimer = 600;
    } else {
      // Retreat — no explosion
      this._overTimer = 0;
    }
  }

  _showResult(playerWon) {
    const w = this._width, h = this._height;
    this._resultContainer = this.add.container(w * 0.5, h * 0.5).setDepth(20);

    const boxW = Math.min(w - 40, 340);
    const boxH = 160;
    const bg = this.add.graphics();
    bg.fillStyle(0x04080F, 0.97);
    bg.fillRoundedRect(-boxW * 0.5, -boxH * 0.5, boxW, boxH, 16);
    bg.lineStyle(2, playerWon === true ? 0x22CC55 : 0xCC2222, 0.9);
    bg.strokeRoundedRect(-boxW * 0.5, -boxH * 0.5, boxW, boxH, 16);
    this._resultContainer.add(bg);

    const title = playerWon === true  ? 'VICTORY!'
                : playerWon === false ? 'SHIP DESTROYED'
                :                      'RETREATED';
    const titleColor = playerWon === true ? '#44FF77' : playerWon === false ? '#FF4433' : '#AABBCC';

    this._resultContainer.add(this.add.text(0, -boxH * 0.5 + 24, title, {
      fontSize: '26px', fontFamily: "'Arial', sans-serif", fontStyle: 'bold', color: titleColor,
    }).setOrigin(0.5, 0));

    const sub = playerWon === true  ? 'Enemy ship destroyed!'
              : playerWon === false ? 'Warping back to Earth...'
              :                      'You escaped the battle.';
    this._resultContainer.add(this.add.text(0, -8, sub, {
      fontSize: '14px', fontFamily: "'Arial', sans-serif", color: '#AABBCC',
    }).setOrigin(0.5, 0.5));

    const returnBtn = this.add.text(0, boxH * 0.5 - 14, '  Return to Solar System  ', {
      fontSize: '15px', fontFamily: "'Arial', sans-serif", fontStyle: 'bold',
      color: '#FFFFFF', backgroundColor: '#112244', padding: { x: 16, y: 10 },
    }).setOrigin(0.5, 1).setInteractive({ useHandCursor: true });

    returnBtn.on('pointerover', () => returnBtn.setStyle({ backgroundColor: '#1A3366' }));
    returnBtn.on('pointerout',  () => returnBtn.setStyle({ backgroundColor: '#112244' }));
    returnBtn.on('pointerdown', () => this._returnToSolarSystem(playerWon));
    this._resultContainer.add(returnBtn);

    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  _returnToSolarSystem(playerWon) {
    this.cameras.main.fadeOut(300, 0, 5, 20);
    this.time.delayedCall(320, () => {
      this.scene.wake('SolarSystemScene');
      this.scene.wake('UIScene');
      const ss = this.scene.get('SolarSystemScene');
      ss.onBattleEnd(playerWon === true);
      this.scene.stop('BattleScene');
    });
  }
}
