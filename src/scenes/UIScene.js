// UIScene — HUD, planet info card, virtual joystick, and inventory overlay.
// Runs parallel to SolarSystemScene, always on top.

import { getInventory } from '../systems/InventorySystem.js';
import { WEAPONS } from '../data/items.js';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene', active: false });
  }

  create() {
    const { width, height } = this.scale;

    // ---- HUD — top-left ----
    this.locationText = this.add.text(14, 14, 'Solar System', {
      fontSize: '15px',
      fontFamily: "'Arial', sans-serif",
      fontStyle: 'bold',
      color: '#88BBFF',
      stroke: '#000820',
      strokeThickness: 4,
    });

    this.statusText = this.add.text(14, 35, '', {
      fontSize: '13px',
      fontFamily: "'Arial', sans-serif",
      color: '#AACCFF',
      stroke: '#000820',
      strokeThickness: 3,
    });

    // ---- Credits display (top-right) ----
    this._creditsText = this.add.text(width - 14, 14, '', {
      fontSize: '14px',
      fontFamily: "'Arial', sans-serif",
      fontStyle: 'bold',
      color: '#FFD700',
      stroke: '#000820',
      strokeThickness: 4,
    }).setOrigin(1, 0);

    // ---- Inventory button [I] ----
    this._invBtn = this.add.text(width - 14, 34, '[I]', {
      fontSize: '12px',
      fontFamily: "'Arial', sans-serif",
      color: '#446688',
      stroke: '#000820',
      strokeThickness: 3,
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this._invBtn.on('pointerover', () => this._invBtn.setStyle({ color: '#88BBFF' }));
    this._invBtn.on('pointerout',  () => this._invBtn.setStyle({ color: '#446688' }));
    this._invBtn.on('pointerdown', () => this._toggleInventory());

    // ---- Inventory panel (hidden by default) ----
    this._invPanel = null;
    this._invOpen  = false;

    // ---- Zoom hint (fades out) ----
    this.hintText = this.add.text(width * 0.5, height - 18,
      'Pinch to zoom  •  Tap a planet to explore',
      {
        fontSize: '12px',
        fontFamily: "'Arial', sans-serif",
        color: '#445566',
        align: 'center',
        stroke: '#000820',
        strokeThickness: 3,
      },
    ).setOrigin(0.5, 1);

    this.time.delayedCall(7000, () => {
      this.tweens.add({ targets: this.hintText, alpha: 0, duration: 1800 });
    });

    // ---- Planet info card (starts off-screen below) ----
    this._buildCard(width, height);

    // ---- Virtual joystick (bottom-right) ----
    this._createJoystick(width, height);

    // ---- Fire button (bottom-left) ----
    this._createFireButton(width, height);

    // Resize handler
    this.scale.on('resize', gameSize => {
      this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
      this._repositionJoystick(gameSize.width, gameSize.height);
      this._repositionFireButton(gameSize.width, gameSize.height);
      this._creditsText.setPosition(gameSize.width - 14, 14);
      this._invBtn.setPosition(gameSize.width - 14, 34);
    });
  }

  // ------------------------------------------------------------------ Card

  _buildCard(width, height) {
    const cardW = Math.min(width - 20, 370);
    const cardH = 260;
    this._cardW = cardW;
    this._cardH = cardH;
    this._cardVisible = false;

    this.card = this.add.container(width * 0.5, height + cardH);

    // Background panel
    const bg = this.add.graphics();
    bg.fillStyle(0x060E1D, 0.96);
    bg.fillRoundedRect(-cardW * 0.5, -cardH * 0.5, cardW, cardH, 18);
    bg.lineStyle(1.5, 0x1E3A6E, 1);
    bg.strokeRoundedRect(-cardW * 0.5, -cardH * 0.5, cardW, cardH, 18);
    this.card.add(bg);

    // Colour dot (planet swatch)
    this._colorDot = this.add.arc(
      -cardW * 0.5 + 24, -cardH * 0.5 + 24, 10, 0, 360, false, 0xFFFFFF,
    );
    this.card.add(this._colorDot);

    // Planet name
    this._cardName = this.add.text(
      -cardW * 0.5 + 44, -cardH * 0.5 + 13, '', {
        fontSize: '24px',
        fontFamily: "'Arial', sans-serif",
        fontStyle: 'bold',
        color: '#FFD700',
      },
    ).setOrigin(0, 0);
    this.card.add(this._cardName);

    // Fact text (with word-wrap)
    this._cardFact = this.add.text(0, -cardH * 0.5 + 58, '', {
      fontSize: '14px',
      fontFamily: "'Arial', sans-serif",
      color: '#CCDDF0',
      wordWrap: { width: cardW - 28 },
      align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5, 0);
    this.card.add(this._cardFact);

    // "Travel Here" button
    this._travelBtn = this.add.text(cardW * 0.5 - 10, cardH * 0.5 - 14,
      '  TRAVEL HERE  ', {
        fontSize: '16px',
        fontFamily: "'Arial', sans-serif",
        fontStyle: 'bold',
        color: '#FFFFFF',
        backgroundColor: '#103A9E',
        padding: { x: 16, y: 9 },
      },
    ).setOrigin(1, 1).setInteractive({ useHandCursor: true });

    this._travelBtn.on('pointerover', () => this._travelBtn.setStyle({ backgroundColor: '#1A4EC8' }));
    this._travelBtn.on('pointerout', () => this._travelBtn.setStyle({ backgroundColor: '#103A9E' }));
    this._travelBtn.on('pointerdown', () => {
      if (this._selectedBodyObj) {
        const ss = this.scene.get('SolarSystemScene');
        ss.travelTo(this._selectedBodyObj);
      }
    });
    this.card.add(this._travelBtn);

    // "Talk" button
    this._talkBtn = this.add.text(-cardW * 0.5 + 10, cardH * 0.5 - 14,
      '  TALK  ', {
        fontSize: '15px',
        fontFamily: "'Arial', sans-serif",
        fontStyle: 'bold',
        color: '#AACCFF',
        backgroundColor: '#0A1A30',
        padding: { x: 14, y: 9 },
      },
    ).setOrigin(0, 1).setInteractive({ useHandCursor: true });

    this._talkBtn.on('pointerover', () => this._talkBtn.setStyle({ backgroundColor: '#112244' }));
    this._talkBtn.on('pointerout', () => this._talkBtn.setStyle({ backgroundColor: '#0A1A30' }));
    this._talkBtn.on('pointerdown', () => {
      if (this._selectedBodyData) {
        const ss = this.scene.get('SolarSystemScene');
        ss.scene.launch('DialogueScene', { bodyData: this._selectedBodyData });
        ss.scene.bringToTop('DialogueScene');
        this.hideCard();
      }
    });
    this.card.add(this._talkBtn);

    // "Enter Port" button (only shown for moons with hasPort)
    this._portBtn = this.add.text(0, cardH * 0.5 - 54,
      '  ENTER PORT  ', {
        fontSize: '15px',
        fontFamily: "'Arial', sans-serif",
        fontStyle: 'bold',
        color: '#FFFFFF',
        backgroundColor: '#1A4400',
        padding: { x: 14, y: 9 },
      },
    ).setOrigin(0.5, 1).setInteractive({ useHandCursor: true }).setVisible(false);

    this._portBtn.on('pointerover', () => this._portBtn.setStyle({ backgroundColor: '#2A6600' }));
    this._portBtn.on('pointerout', () => this._portBtn.setStyle({ backgroundColor: '#1A4400' }));
    this._portBtn.on('pointerdown', () => {
      if (this._selectedBodyData && this._selectedBodyData.hasPort) {
        const ss = this.scene.get('SolarSystemScene');
        if (ss && ss.enterPort) ss.enterPort(this._selectedBodyData);
        this.hideCard();
      }
    });
    this.card.add(this._portBtn);

    // Close button
    const closeBtn = this.add.text(
      cardW * 0.5 - 10, -cardH * 0.5 + 12, '✕', {
        fontSize: '19px',
        fontFamily: "'Arial', sans-serif",
        color: '#445577',
      },
    ).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.hideCard());
    this.card.add(closeBtn);

    this._factIndex = 0;
    this._factTimer = null;
  }

  // ------------------------------------------------------------------ Joystick

  _createJoystick(width, height) {
    const BASE_R  = 52;
    const THUMB_R = 24;
    this._joyBaseR  = BASE_R;
    this._joyThumbR = THUMB_R;

    // Expose to SolarSystemScene — dx/dy are normalised [-1, 1]
    this.joystick = { dx: 0, dy: 0, active: false, pointerId: -1 };

    const joyX = width  - BASE_R - 20;
    const joyY = height - BASE_R - 20;
    this._joyCenter = { x: joyX, y: joyY };

    // Base ring (fixed position)
    this._joyBaseG = this.add.graphics();
    this._drawJoyBase(this._joyBaseG, BASE_R);
    this._joyBaseG.setPosition(joyX, joyY).setScrollFactor(0).setAlpha(0.55);

    // Moveable thumb
    this._joyThumbG = this.add.graphics();
    this._joyThumbG.fillStyle(0x55AAEE, 1);
    this._joyThumbG.fillCircle(0, 0, THUMB_R);
    this._joyThumbG.setPosition(joyX, joyY).setScrollFactor(0).setAlpha(0.75);

    // Touch tracking
    this.input.on('pointerdown', this._joyDown, this);
    this.input.on('pointermove', this._joyMove, this);
    this.input.on('pointerup',   this._joyUp,   this);
    this.input.on('pointerout',  this._joyUp,   this);
  }

  _drawJoyBase(g, r) {
    g.clear();
    g.fillStyle(0x112244, 1);
    g.fillCircle(0, 0, r);
    g.lineStyle(2, 0x2255BB, 1);
    g.strokeCircle(0, 0, r);
    // Direction arrows (subtle)
    g.lineStyle(1.5, 0x4477BB, 0.6);
    g.lineBetween(0, -r + 10, 0, r - 10);
    g.lineBetween(-r + 10, 0, r - 10, 0);
  }

  _repositionJoystick(width, height) {
    const r = this._joyBaseR;
    const joyX = width  - r - 20;
    const joyY = height - r - 20;
    this._joyCenter = { x: joyX, y: joyY };
    this._joyBaseG.setPosition(joyX, joyY);
    if (!this.joystick.active) {
      this._joyThumbG.setPosition(joyX, joyY);
    }
  }

  _joyDown(ptr) {
    if (this.joystick.active) return;
    if (this._cardVisible) return;
    if (!this._isNearJoystick(ptr.x, ptr.y)) return;

    this.joystick.active = true;
    this.joystick.pointerId = ptr.id;
    this._updateJoyThumb(ptr.x, ptr.y);
  }

  _joyMove(ptr) {
    if (!this.joystick.active || ptr.id !== this.joystick.pointerId) return;
    this._updateJoyThumb(ptr.x, ptr.y);
  }

  _joyUp(ptr) {
    if (!this.joystick.active || ptr.id !== this.joystick.pointerId) return;
    this.joystick.active = false;
    this.joystick.pointerId = -1;
    this.joystick.dx = 0;
    this.joystick.dy = 0;
    // Snap thumb back to centre
    this._joyThumbG.setPosition(this._joyCenter.x, this._joyCenter.y);
  }

  _updateJoyThumb(px, py) {
    const cx   = this._joyCenter.x;
    const cy   = this._joyCenter.y;
    const dx   = px - cx;
    const dy   = py - cy;
    const dist = Math.hypot(dx, dy);
    const maxR = this._joyBaseR;
    const clamped = Math.min(dist, maxR);
    const nx = dist > 0 ? dx / dist : 0;
    const ny = dist > 0 ? dy / dist : 0;

    this._joyThumbG.setPosition(cx + nx * clamped, cy + ny * clamped);

    // Normalised output (0 at centre, ±1 at edge)
    this.joystick.dx = nx * (clamped / maxR);
    this.joystick.dy = ny * (clamped / maxR);
  }

  _isNearJoystick(x, y) {
    // Slightly larger hit area than the visual base
    const r = this._joyBaseR + 24;
    return Math.hypot(x - this._joyCenter.x, y - this._joyCenter.y) < r;
  }

  // ------------------------------------------------------------------ Fire button

  _createFireButton(width, height) {
    const r  = 40;
    this._fireBtnR      = r;
    this._fireBtnCenter = { x: r + 20, y: height - r - 20 };
    this.fireBtn        = { active: false };

    this._fireBtnG = this.add.graphics()
      .setPosition(this._fireBtnCenter.x, this._fireBtnCenter.y)
      .setScrollFactor(0).setAlpha(0.8);
    this._redrawFireBtn(false);

    this._fireBtnG.setInteractive(
      new Phaser.Geom.Circle(0, 0, r),
      Phaser.Geom.Circle.Contains,
    );

    this._fireBtnLabel = this.add.text(
      this._fireBtnCenter.x, this._fireBtnCenter.y, 'FIRE', {
        fontSize: '15px',
        fontFamily: "'Arial', sans-serif",
        fontStyle: 'bold',
        color: '#FF8800',
        stroke: '#000000',
        strokeThickness: 3,
      },
    ).setOrigin(0.5, 0.5).setScrollFactor(0);

    this._fireBtnG.on('pointerdown', () => {
      this.fireBtn.active = true;
      this._redrawFireBtn(true);
    });
    this._fireBtnG.on('pointerup', () => {
      this.fireBtn.active = false;
      this._redrawFireBtn(false);
    });
    this._fireBtnG.on('pointerout', () => {
      this.fireBtn.active = false;
      this._redrawFireBtn(false);
    });
  }

  _redrawFireBtn(pressed) {
    const g = this._fireBtnG;
    const r = this._fireBtnR;
    g.clear();
    g.fillStyle(pressed ? 0x5A2000 : 0x1E0800, 0.92);
    g.fillCircle(0, 0, r);
    g.lineStyle(2, pressed ? 0xFF9922 : 0xFF5500, 1);
    g.strokeCircle(0, 0, r);
    // Inner ring for visual depth
    g.lineStyle(1, pressed ? 0xFFCC66 : 0xAA4400, 0.5);
    g.strokeCircle(0, 0, r * 0.72);
  }

  _repositionFireButton(width, height) {
    const r  = this._fireBtnR;
    const bx = r + 20;
    const by = height - r - 20;
    this._fireBtnCenter = { x: bx, y: by };
    this._fireBtnG.setPosition(bx, by);
    this._fireBtnLabel.setPosition(bx, by);
  }

  _isNearFireBtn(x, y) {
    if (!this._fireBtnCenter) return false;
    return Math.hypot(x - this._fireBtnCenter.x, y - this._fireBtnCenter.y) < this._fireBtnR + 20;
  }

  /** CameraSystem calls this to skip its pan/tap logic for joystick touches. */
  _isJoystickTouch(x, y) {
    if (this._cardVisible) return false;
    return this._isNearJoystick(x, y) || this._isNearFireBtn(x, y);
  }

  // ------------------------------------------------------------------ Update

  update() {
    const inv = getInventory();
    this._creditsText.setText('◆ ' + inv.credits.toLocaleString() + ' cr');
  }

  // ------------------------------------------------------------------ Inventory panel

  _toggleInventory() {
    if (this._invOpen) {
      this._invOpen = false;
      if (this._invPanel) { this._invPanel.destroy(); this._invPanel = null; }
    } else {
      this._invOpen = true;
      this._buildInventoryPanel();
    }
  }

  _buildInventoryPanel() {
    const { width, height } = this.scale;
    const inv   = getInventory();
    const pw    = Math.min(width - 20, 400);
    const ph    = Math.min(height - 60, 420);
    const px    = (width - pw) * 0.5;
    const py    = (height - ph) * 0.5;

    const con = this.add.container(0, 0).setDepth(80);
    this._invPanel = con;

    // Backdrop
    const mask = this.add.rectangle(0, 0, width, height, 0x000000, 0.65)
      .setOrigin(0).setInteractive();
    mask.on('pointerdown', () => this._toggleInventory());
    con.add(mask);

    // Box
    const bg = this.add.graphics();
    bg.fillStyle(0x050D1A, 0.98);
    bg.fillRoundedRect(px, py, pw, ph, 14);
    bg.lineStyle(2, 0x1E3E7E, 1);
    bg.strokeRoundedRect(px, py, pw, ph, 14);
    bg.fillStyle(0x0A1E36, 1);
    bg.fillRoundedRect(px, py, pw, 46, { tl: 14, tr: 14, bl: 0, br: 0 });
    con.add(bg);

    con.add(this.add.text(px + 16, py + 14, 'INVENTORY', {
      fontSize: '16px', fontFamily: 'Arial', fontStyle: 'bold', color: '#FFD700',
    }));

    const closeBtn = this.add.text(px + pw - 12, py + 12, '✕', {
      fontSize: '18px', fontFamily: 'Arial', color: '#446688',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this._toggleInventory());
    con.add(closeBtn);

    const sep = this.add.graphics();
    sep.lineStyle(1, 0x1E3E7E, 0.5);
    sep.lineBetween(px + 12, py + 46, px + pw - 12, py + 46);
    con.add(sep);

    let y = py + 54;
    const col1 = px + 16;
    const col2 = px + pw * 0.52;
    const lh   = 20;

    // ── Credits & HP ──────────────────────────────────────────────────────
    con.add(this.add.text(col1, y, '◆  CREDITS', {
      fontSize: '11px', fontFamily: 'Arial', color: '#556677',
    }));
    con.add(this.add.text(col2, y, `${inv.credits.toLocaleString()}`, {
      fontSize: '15px', fontFamily: 'Arial', fontStyle: 'bold', color: '#FFD700',
    }));
    y += lh + 4;

    con.add(this.add.text(col1, y, '♥  HP', {
      fontSize: '11px', fontFamily: 'Arial', color: '#556677',
    }));
    const hpCol = inv.miloHp > inv.miloMaxHp * 0.5 ? '#44FF88'
                : inv.miloHp > inv.miloMaxHp * 0.25 ? '#FFCC00' : '#FF4444';
    con.add(this.add.text(col2, y, `${inv.miloHp} / ${inv.miloMaxHp}`, {
      fontSize: '13px', fontFamily: 'Arial', fontStyle: 'bold', color: hpCol,
    }));
    y += lh + 8;

    // Divider
    const dv = this.add.graphics();
    dv.lineStyle(1, 0x0E2040, 0.8);
    dv.lineBetween(col1, y, px + pw - 16, y);
    con.add(dv);
    y += 8;

    // ── Weapons ──────────────────────────────────────────────────────────
    con.add(this.add.text(col1, y, 'WEAPONS', {
      fontSize: '10px', fontFamily: 'Arial', fontStyle: 'bold', color: '#334455',
    }));
    y += 16;
    for (const w of inv.weapons) {
      const isEq = w.id === inv.equippedWeapon;
      const usesStr = w.uses !== null ? ` [${w.uses} uses]` : ' [∞]';
      con.add(this.add.text(col1, y,
        `${isEq ? '▶ ' : '  '}${w.name}${usesStr}`, {
          fontSize: '12px', fontFamily: 'Arial',
          color: isEq ? '#AADDFF' : '#667788',
        }));
      con.add(this.add.text(col2, y, `${w.damage} dmg  ${w.type}`, {
        fontSize: '11px', fontFamily: 'Arial', color: '#445566',
      }));
      y += lh;
    }
    y += 4;

    // ── Ship upgrades ────────────────────────────────────────────────────
    const dv2 = this.add.graphics();
    dv2.lineStyle(1, 0x0E2040, 0.8);
    dv2.lineBetween(col1, y, px + pw - 16, y);
    con.add(dv2);
    y += 8;
    con.add(this.add.text(col1, y, 'SHIP', {
      fontSize: '10px', fontFamily: 'Arial', fontStyle: 'bold', color: '#334455',
    }));
    y += 16;
    const upg = inv.shipUpgrades;
    const upgLines = [
      `Engine   Mk ${upg.engine  || 0}`,
      `Weapons  Mk ${upg.weapons || 0}`,
      `Shields  Mk ${upg.shields || 0}`,
    ];
    for (const line of upgLines) {
      const installed = !line.endsWith('0');
      con.add(this.add.text(col1, y, line, {
        fontSize: '12px', fontFamily: 'Arial',
        color: installed ? '#44AA66' : '#334455',
      }));
      y += lh;
    }
    y += 4;

    // ── Spoils ───────────────────────────────────────────────────────────
    if (inv.spoils.length > 0) {
      const dv3 = this.add.graphics();
      dv3.lineStyle(1, 0x0E2040, 0.8);
      dv3.lineBetween(col1, y, px + pw - 16, y);
      con.add(dv3);
      y += 8;
      con.add(this.add.text(col1, y, 'SPOILS', {
        fontSize: '10px', fontFamily: 'Arial', fontStyle: 'bold', color: '#334455',
      }));
      y += 16;
      for (const sp of inv.spoils) {
        con.add(this.add.text(col1, y, `${sp.name}  ×${sp.qty}`, {
          fontSize: '12px', fontFamily: 'Arial', color: '#AABB88',
        }));
        con.add(this.add.text(col2, y, `${sp.sellPrice}c ea`, {
          fontSize: '11px', fontFamily: 'Arial', color: '#556644',
        }));
        y += lh;
      }
    }
  }

  // ------------------------------------------------------------------ Public API

  showCard(bodyData, bodyObj, navigable = true) {
    this._selectedBodyData = bodyData;
    this._selectedBodyObj = bodyObj;
    this._factIndex = 0;

    this._cardName.setText(bodyData.name);
    this._colorDot.setFillStyle(bodyData.color || 0xFFFFFF);

    const facts = bodyData.facts || [];
    this._cardFact.setText(facts[0] || '');

    this._travelBtn.setVisible(!!navigable);
    this._portBtn.setVisible(!!(bodyData.hasPort));

    // Cycle through facts every 3.2 s
    if (this._factTimer) this._factTimer.remove();
    if (facts.length > 1) {
      this._factTimer = this.time.addEvent({
        delay: 3200,
        repeat: -1,
        callback: () => {
          this._factIndex = (this._factIndex + 1) % facts.length;
          this.tweens.add({
            targets: this._cardFact,
            alpha: 0,
            duration: 180,
            onComplete: () => {
              this._cardFact.setText(facts[this._factIndex]);
              this.tweens.add({ targets: this._cardFact, alpha: 1, duration: 180 });
            },
          });
        },
      });
    }

    if (!this._cardVisible) {
      this._cardVisible = true;
      const { width, height } = this.scale;
      this.card.setPosition(width * 0.5, height + this._cardH);
      this.tweens.add({
        targets: this.card,
        y: height - this._cardH * 0.5 - 14,
        duration: 330,
        ease: 'Back.Out',
      });
    }
  }

  hideCard() {
    if (!this._cardVisible) return;
    this._cardVisible = false;
    if (this._factTimer) { this._factTimer.remove(); this._factTimer = null; }
    this.tweens.add({
      targets: this.card,
      y: this.scale.height + this._cardH,
      duration: 240,
      ease: 'Cubic.In',
    });
  }

  setLocation(name) {
    this.locationText.setText(name);
  }

  setStatus(text) {
    this.statusText.setText(text);
  }

}
