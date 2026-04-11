// EncounterScene — modal overlay presenting the four encounter options:
// HAIL · FLEE · INTIMIDATE · ATTACK
// Launched on top of SolarSystemScene + UIScene when an NPC ship gets close.

export default class EncounterScene extends Phaser.Scene {
  constructor() {
    super({ key: 'EncounterScene', active: false });
  }

  init(data) {
    this.shipData = data.shipData;
  }

  create() {
    const { width, height } = this.scale;

    // Full-screen dim backdrop (blocks taps through to game world)
    this.add.rectangle(0, 0, width, height, 0x000000, 0.72)
      .setOrigin(0, 0)
      .setInteractive();

    // Dialog box
    const boxW = Math.min(width - 28, 460);
    const boxH = 310;
    const boxX = (width  - boxW) * 0.5;
    const boxY = (height - boxH) * 0.5;
    this._boxX = boxX; this._boxW = boxW;
    this._boxY = boxY; this._boxH = boxH;

    const accent = this.shipData.accentColor;
    const accentHex = '#' + accent.toString(16).padStart(6, '0');

    const bg = this.add.graphics();
    bg.fillStyle(0x040A14, 0.98);
    bg.fillRoundedRect(boxX, boxY, boxW, boxH, 16);
    bg.lineStyle(2, accent, 0.9);
    bg.strokeRoundedRect(boxX, boxY, boxW, boxH, 16);

    // Color dot
    this.add.arc(boxX + 22, boxY + 22, 9, 0, 360, false, this.shipData.bodyColor);

    // Ship name
    this.add.text(boxX + 40, boxY + 13, this.shipData.name.toUpperCase(), {
      fontSize: '17px',
      fontFamily: "'Arial', sans-serif",
      fontStyle: 'bold',
      color: accentHex,
    });

    // Separator
    const sep = this.add.graphics();
    sep.lineStyle(1, accent, 0.4);
    sep.lineBetween(boxX + 14, boxY + 46, boxX + boxW - 14, boxY + 46);

    // Incoming message text (NPC opening line)
    this._msgText = this.add.text(boxX + 18, boxY + 56, this.shipData.encounterOpen, {
      fontSize: '14px',
      fontFamily: "'Arial', sans-serif",
      color: '#CCDDF0',
      wordWrap: { width: boxW - 36 },
      lineSpacing: 5,
    });

    // ---- Choice buttons (2 × 2 grid) ----
    this._choicePanel = this.add.container(0, 0);
    this._buildChoiceButtons();

    // ---- Reaction panel (hidden until a choice is made) ----
    this._reactionPanel = this.add.container(0, 0).setVisible(false);
    this._buildReactionPanel(accentHex);

    this.cameras.main.fadeIn(220, 0, 5, 20);
  }

  // ------------------------------------------------------------------ panels

  _buildChoiceButtons() {
    const bx = this._boxX + 18;
    const by = this._boxY + 175;
    const bw = (this._boxW - 36 - 10) * 0.5;
    const bh = 48;

    const defs = [
      { label: 'HAIL',       bg: 0x0D2244, hi: 0x1A3A6E, action: () => this._onHail()       },
      { label: 'FLEE',       bg: 0x0A2214, hi: 0x143322, action: () => this._onFlee()       },
      { label: 'INTIMIDATE', bg: 0x2A1600, hi: 0x3E2200, action: () => this._onIntimidate() },
      { label: 'ATTACK',     bg: 0x2A0608, hi: 0x3E0A0C, action: () => this._onAttack()     },
    ];

    defs.forEach(({ label, bg, hi, action }, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x   = bx + col * (bw + 10);
      const y   = by + row * (bh + 10);

      const btn = this.add.text(x + bw * 0.5, y + bh * 0.5, label, {
        fontSize: '15px',
        fontFamily: "'Arial', sans-serif",
        fontStyle: 'bold',
        color: '#DDEEFF',
        backgroundColor: '#' + bg.toString(16).padStart(6, '0'),
        padding: { x: 0, y: 14 },
        fixedWidth: bw,
        align: 'center',
      }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });

      const hiStr = '#' + hi.toString(16).padStart(6, '0');
      const bgStr = '#' + bg.toString(16).padStart(6, '0');
      btn.on('pointerover',  () => btn.setStyle({ backgroundColor: hiStr }));
      btn.on('pointerout',   () => btn.setStyle({ backgroundColor: bgStr }));
      btn.on('pointerdown',  action);

      this._choicePanel.add(btn);
    });
  }

  _buildReactionPanel(accentHex) {
    const bx = this._boxX + 18;
    const by = this._boxY + 170;
    const bw = this._boxW - 36;

    // Reaction text (set dynamically)
    this._reactionText = this.add.text(bx, by, '', {
      fontSize: '14px',
      fontFamily: "'Arial', sans-serif",
      fontStyle: 'italic',
      color: '#CCDDF0',
      wordWrap: { width: bw },
      lineSpacing: 5,
    });
    this._reactionPanel.add(this._reactionText);

    // Confirm button (label set dynamically)
    this._confirmBtn = this.add.text(
      this._boxX + this._boxW * 0.5,
      this._boxY + this._boxH - 20,
      'OK',
      {
        fontSize: '16px',
        fontFamily: "'Arial', sans-serif",
        fontStyle: 'bold',
        color: '#FFFFFF',
        backgroundColor: '#112244',
        padding: { x: 28, y: 11 },
      },
    ).setOrigin(0.5, 1).setInteractive({ useHandCursor: true });

    this._confirmBtn.on('pointerover', () => this._confirmBtn.setStyle({ backgroundColor: '#1A3366' }));
    this._confirmBtn.on('pointerout',  () => this._confirmBtn.setStyle({ backgroundColor: '#112244' }));

    this._reactionPanel.add(this._confirmBtn);
  }

  // ------------------------------------------------------------------ choices

  _onHail() {
    this._showReaction(
      '"' + this.shipData.hailGreeting + '"',
      'OK',
      () => this._resolve('hail'),
    );
  }

  _onFlee() {
    this._showReaction(
      'You activate your emergency thrusters and pull away at full speed!',
      'OK',
      () => this._resolve('flee'),
    );
  }

  _onIntimidate() {
    const successChance = this.shipData.personality === 'peaceful' ? 0.78 : 0.25;
    const success = Math.random() < successChance;

    if (success) {
      this._showReaction(
        '"' + this.shipData.intimidateFlee + '"\n\nThe ship turns and retreats.',
        'OK',
        () => this._resolve('intimidate_success'),
      );
    } else {
      this._showReaction(
        '"' + this.shipData.intimidateStand + '"',
        'BATTLE!',
        () => this._resolve('intimidate_fail'),
        true,
      );
    }
  }

  _onAttack() {
    this._showReaction(
      '"' + this.shipData.attackQuip + '"',
      'BATTLE!',
      () => this._resolve('attack'),
      true,
    );
  }

  // ------------------------------------------------------------------ helpers

  _showReaction(text, btnLabel, onConfirm, isBattle = false) {
    this._choicePanel.setVisible(false);
    this._msgText.setVisible(false);

    this._reactionText.setText(text);
    this._confirmBtn.setText(isBattle ? '  BATTLE!  ' : '     OK     ');
    this._confirmBtn.setStyle({
      backgroundColor: isBattle ? '#5A0808' : '#112244',
    });

    this._confirmBtn.removeAllListeners('pointerdown');
    this._confirmBtn.on('pointerdown', onConfirm);
    this._confirmBtn.on('pointerover', () =>
      this._confirmBtn.setStyle({ backgroundColor: isBattle ? '#881010' : '#1A3366' }));
    this._confirmBtn.on('pointerout', () =>
      this._confirmBtn.setStyle({ backgroundColor: isBattle ? '#5A0808' : '#112244' }));

    this._reactionPanel.setVisible(true);
  }

  _resolve(choice) {
    const ss = this.scene.get('SolarSystemScene');
    const sd = this.shipData;
    this.cameras.main.fadeOut(200, 0, 5, 20);
    this.time.delayedCall(220, () => {
      this.scene.stop('EncounterScene');
      ss.handleEncounterChoice(choice, sd);
    });
  }
}
