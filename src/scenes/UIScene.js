// UIScene — HUD, planet info card, and virtual joystick overlay
// Runs parallel to SolarSystemScene, always on top.
// Its camera has no zoom/scroll so elements stay fixed on screen.

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

    // Resize handler
    this.scale.on('resize', gameSize => {
      this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
      this._repositionJoystick(gameSize.width, gameSize.height);
    });
  }

  // ------------------------------------------------------------------ Card

  _buildCard(width, height) {
    const cardW = Math.min(width - 20, 370);
    const cardH = 230;
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

  /** CameraSystem calls this to skip its pan/tap logic for joystick touches. */
  _isJoystickTouch(x, y) {
    if (this._cardVisible) return false;
    return this._isNearJoystick(x, y);
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
