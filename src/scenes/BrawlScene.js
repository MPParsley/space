// BrawlScene — turn-based bar brawl combat.
// Launched (sleep PortScene) then resumes PortScene on exit.

import { WEAPONS, BRAWL_ENEMIES, SPOILS } from '../data/items.js';
import {
  getInventory, getEquippedWeapon, useEquippedWeapon, healMilo, damageMilo,
} from '../systems/InventorySystem.js';

const C = {
  bg:       0x020810,
  panel:    0x050D1A,
  border:   0x1E3E7E,
  text:     '#CCDDF0',
  gold:     '#FFD700',
  green:    '#44FF88',
  red:      '#FF4444',
  orange:   '#FF8844',
};

export default class BrawlScene extends Phaser.Scene {
  constructor() { super({ key: 'BrawlScene', active: false }); }

  // ------------------------------------------------------------------ init
  init(data) {
    this._moonId = data.moonId || 'moon';
  }

  // ------------------------------------------------------------------ create
  create() {
    const { width, height } = this.scale;
    this._w = width;
    this._h = height;

    this.cameras.main.setBackgroundColor(C.bg);

    // Pick a random enemy based on moon difficulty
    this._enemy  = this._pickEnemy();
    this._enemyHp = this._enemy.hp;
    this._stunned = false;     // enemy stunned this turn?
    this._defending = false;   // player defending?
    this._turnOver = false;

    // Layout
    this._buildUI();
    this._log('A brawl breaks out!');
    this._log(`You face: ${this._enemy.name}  (HP ${this._enemyHp})`);
    this._setPhase('player');

    this.cameras.main.fadeIn(250, 0, 5, 20);
  }

  // ------------------------------------------------------------------ enemy pick

  _pickEnemy() {
    // harder moons → higher index enemies
    const difficulty = { moon: 0, callisto: 1, ganymede: 2, titan: 2, europa: 3, triton: 4 };
    const tier = difficulty[this._moonId] ?? 0;
    // pick randomly from tier ± 1
    const min = Math.max(0, tier - 1);
    const max = Math.min(BRAWL_ENEMIES.length - 1, tier + 1);
    const idx = min + Math.floor(Math.random() * (max - min + 1));
    return { ...BRAWL_ENEMIES[idx] };
  }

  // ------------------------------------------------------------------ UI build

  _buildUI() {
    const { width: W, height: H } = this.scale;

    // ── background bar scene ────────────────────────────────────────────────
    const bg = this.add.graphics();
    bg.fillStyle(0x08101C, 1);
    bg.fillRect(0, 0, W, H);
    // floor strip
    bg.fillStyle(0x0A1828, 1);
    bg.fillRect(0, H * 0.55, W, H * 0.45);
    // bar counter
    bg.fillStyle(0x1A0A05, 1);
    bg.fillRect(W * 0.1, H * 0.3, W * 0.8, H * 0.08);

    // ── character silhouettes ────────────────────────────────────────────────
    this._drawPlayer(W * 0.22, H * 0.5);
    this._gEnemy = this.add.graphics();
    this._drawEnemy(W * 0.78, H * 0.5);

    // ── HP bars ─────────────────────────────────────────────────────────────
    const barW = Math.min(160, W * 0.32);
    const barH = 14;
    // Player HP
    this._phpBg  = this.add.rectangle(20, 46, barW, barH, 0x222222).setOrigin(0, 0.5);
    this._phpBar = this.add.rectangle(20, 46, barW, barH, 0x44FF44).setOrigin(0, 0.5);
    this._phpTxt = this.add.text(20, 58, '', { fontSize: '11px', fontFamily: 'Arial', color: C.text });
    // Enemy HP
    this._ehpBg  = this.add.rectangle(W - 20, 46, barW, barH, 0x222222).setOrigin(1, 0.5);
    this._ehpBar = this.add.rectangle(W - 20, 46, barW, barH, 0xFF4444).setOrigin(1, 0.5);
    this._ehpTxt = this.add.text(W - 20, 58, '', { fontSize: '11px', fontFamily: 'Arial', color: C.text }).setOrigin(1, 0);

    // Name labels
    this.add.text(20, 26, 'Milo', {
      fontSize: '13px', fontFamily: 'Arial', fontStyle: 'bold', color: '#88BBFF' });
    this._enemyNameTxt = this.add.text(W - 20, 26, this._enemy.name, {
      fontSize: '13px', fontFamily: 'Arial', fontStyle: 'bold', color: '#FF8888' }).setOrigin(1, 0);

    this._updateHpBars();

    // ── combat log ─────────────────────────────────────────────────────────
    const logH = Math.round(H * 0.22);
    const logY = Math.round(H * 0.63);
    this.add.rectangle(W * 0.5, logY + logH * 0.5, W - 20, logH, 0x050D1A, 0.88)
      .setOrigin(0.5);
    this._logLines = [];
    this._logStart = logY + 8;
    for (let i = 0; i < 4; i++) {
      this._logLines.push(this.add.text(16, this._logStart + i * 18, '', {
        fontSize: '12px', fontFamily: 'Arial', color: C.text,
      }));
    }
    this._logBuf = [];

    // ── action buttons ──────────────────────────────────────────────────────
    const btnY  = logY + logH + 12;
    const btnW  = Math.round((W - 40) / 3) - 4;
    const btnH  = Math.round(H * 0.09);
    this._btns  = {};

    const btnDefs = [
      { id: 'attack',  label: 'ATTACK',  col: '#FF6644', x: 16                  },
      { id: 'defend',  label: 'DEFEND',  col: '#44AAFF', x: 16 + btnW + 4       },
      { id: 'item',    label: 'USE ITEM',col: '#FFCC44', x: 16 + (btnW + 4) * 2 },
    ];

    for (const bd of btnDefs) {
      const bg = this.add.rectangle(bd.x + btnW * 0.5, btnY + btnH * 0.5, btnW, btnH,
        0x091624, 1).setInteractive({ useHandCursor: true }).setDepth(10);
      const lbl = this.add.text(bd.x + btnW * 0.5, btnY + btnH * 0.5, bd.label, {
        fontSize: '14px', fontFamily: 'Arial', fontStyle: 'bold', color: bd.col,
      }).setOrigin(0.5).setDepth(11);
      bg.on('pointerover', () => bg.setFillColor(0x112244));
      bg.on('pointerout',  () => bg.setFillColor(0x091624));
      bg.on('pointerdown', () => this._onAction(bd.id));
      this._btns[bd.id] = { bg, lbl };
    }

    // weapon sub-menu (hidden by default)
    this._weaponMenu = null;
  }

  // ─── silhouettes ─────────────────────────────────────────────────────────

  _drawPlayer(cx, cy) {
    const g = this.add.graphics();
    g.fillStyle(0x00AAFF, 1);
    g.fillCircle(cx, cy - 32, 12);      // head
    g.fillRect(cx - 10, cy - 18, 20, 30); // torso
    g.fillRect(cx - 18, cy - 16, 8, 22); // left arm
    g.fillRect(cx + 10, cy - 16, 8, 22); // right arm
    g.fillRect(cx - 10, cy + 12, 8, 22); // left leg
    g.fillRect(cx + 2,  cy + 12, 8, 22); // right leg
  }

  _drawEnemy(cx, cy) {
    const g = this._gEnemy;
    g.clear();
    // Different tint based on enemy type
    const tints = {
      patron:  0xFF8844,
      worker:  0x44AAFF,
      thug:    0xFF4444,
      bouncer: 0x884400,
      pirate:  0x880000,
    };
    const col = tints[this._enemy.id] || 0xCC3333;
    g.fillStyle(col, 1);
    g.fillCircle(cx, cy - 32, 13);
    g.fillRect(cx - 12, cy - 18, 24, 32);
    g.fillRect(cx - 20, cy - 16, 8, 24);
    g.fillRect(cx + 12, cy - 16, 8, 24);
    g.fillRect(cx - 12, cy + 14, 9, 22);
    g.fillRect(cx + 3,  cy + 14, 9, 22);
    if (this._stunned) {
      g.fillStyle(0xFFFF00, 0.7);
      g.fillCircle(cx, cy - 50, 6);
    }
  }

  _flashEnemy() {
    this._gEnemy.setAlpha(0.2);
    this.time.delayedCall(80,  () => this._gEnemy.setAlpha(1));
    this.time.delayedCall(160, () => this._gEnemy.setAlpha(0.2));
    this.time.delayedCall(240, () => this._gEnemy.setAlpha(1));
  }

  // ------------------------------------------------------------------ HP bars

  _updateHpBars() {
    const inv  = getInventory();
    const pPct = Phaser.Math.Clamp(inv.miloHp / inv.miloMaxHp, 0, 1);
    const ePct = Phaser.Math.Clamp(this._enemyHp / this._enemy.hp, 0, 1);
    const barW = this._phpBg.width;

    this._phpBar.setSize(barW * pPct, this._phpBar.height);
    this._phpBar.setFillColor(pPct > 0.5 ? 0x44FF44 : pPct > 0.25 ? 0xFFCC00 : 0xFF4444);
    this._phpTxt.setText(`HP ${inv.miloHp}/${inv.miloMaxHp}`);

    const eBarW = this._ehpBg.width;
    this._ehpBar.setSize(eBarW * ePct, this._ehpBar.height);
    this._ehpBar.setFillColor(ePct > 0.5 ? 0xFF4444 : ePct > 0.25 ? 0xFFAA00 : 0xFF8800);
    this._ehpTxt.setText(`HP ${this._enemyHp}/${this._enemy.hp}`);
  }

  // ------------------------------------------------------------------ log

  _log(msg) {
    this._logBuf.push(msg);
    if (this._logBuf.length > 4) this._logBuf.shift();
    for (let i = 0; i < 4; i++) {
      this._logLines[i].setText(this._logBuf[i] || '');
    }
  }

  // ------------------------------------------------------------------ phase

  _setPhase(phase) {
    const active = (phase === 'player');
    for (const key of Object.keys(this._btns)) {
      this._btns[key].bg.setInteractive(active ? { useHandCursor: true } : false);
      this._btns[key].bg.setAlpha(active ? 1 : 0.4);
      this._btns[key].lbl.setAlpha(active ? 1 : 0.4);
    }
  }

  // ------------------------------------------------------------------ actions

  _onAction(id) {
    if (this._turnOver) return;

    if (id === 'attack') {
      this._showWeaponMenu();
    } else if (id === 'defend') {
      this._defending = true;
      this._log('You take a defensive stance.');
      this._endPlayerTurn();
    } else if (id === 'item') {
      const inv = getInventory();
      if (inv.miloHp < inv.miloMaxHp) {
        healMilo(20);
        this._log(`You catch your breath. HP +20.`);
        this._updateHpBars();
        this._endPlayerTurn();
      } else {
        this._log('Already at full health!');
      }
    }
  }

  // ─── weapon selection sub-menu ────────────────────────────────────────────

  _showWeaponMenu() {
    if (this._weaponMenu) { this._weaponMenu.destroy(); this._weaponMenu = null; }
    const inv = getInventory();
    const { width: W, height: H } = this.scale;

    const con = this.add.container(0, 0).setDepth(30);
    this._weaponMenu = con;

    const menuW = Math.min(260, W - 40);
    const menuX = (W - menuW) * 0.5;
    let menuH = 40 + inv.weapons.length * 34 + 10;
    const menuY = H * 0.3;

    const mbg = this.add.graphics();
    mbg.fillStyle(0x050D1A, 0.98);
    mbg.fillRoundedRect(menuX, menuY, menuW, menuH, 10);
    mbg.lineStyle(1.5, C.border, 1);
    mbg.strokeRoundedRect(menuX, menuY, menuW, menuH, 10);
    con.add(mbg);

    con.add(this.add.text(menuX + 10, menuY + 10, 'Choose weapon:', {
      fontSize: '13px', fontFamily: 'Arial', fontStyle: 'bold', color: C.gold,
    }));

    for (let i = 0; i < inv.weapons.length; i++) {
      const w = inv.weapons[i];
      const isEq = (w.id === inv.equippedWeapon);
      const usesStr = w.uses !== null ? ` [${w.uses} uses]` : '';
      const wy = menuY + 36 + i * 34;
      const wbg = this.add.rectangle(menuX + 8, wy, menuW - 16, 28, isEq ? 0x1E3E7E : 0x091624, 1)
        .setOrigin(0).setInteractive({ useHandCursor: true });
      const wtxt = this.add.text(menuX + 16, wy + 4, `${w.name}${usesStr}  (${w.damage} dmg)`, {
        fontSize: '12px', fontFamily: 'Arial', color: isEq ? '#FFFFFF' : '#88BBFF',
      });
      const widx = i;
      wbg.on('pointerover', () => wbg.setFillColor(0x112244));
      wbg.on('pointerout',  () => wbg.setFillColor(isEq ? 0x1E3E7E : 0x091624));
      wbg.on('pointerdown', () => {
        inv.equippedWeapon = inv.weapons[widx].id;
        con.destroy();
        this._weaponMenu = null;
        this._doAttack();
      });
      con.add(wbg); con.add(wtxt);
    }

    // cancel
    const cy = menuY + menuH - 30;
    const cbg = this.add.rectangle(menuX + 8, menuY + menuH - 32, menuW - 16, 24, 0x091624, 1)
      .setOrigin(0).setInteractive({ useHandCursor: true });
    con.add(cbg);
    con.add(this.add.text(menuX + 16, menuY + menuH - 28, 'Cancel', {
      fontSize: '12px', fontFamily: 'Arial', color: '#446688',
    }));
    cbg.on('pointerdown', () => { con.destroy(); this._weaponMenu = null; });
  }

  // ─── player attacks ───────────────────────────────────────────────────────

  _doAttack() {
    const weapon = getEquippedWeapon();
    let dmg = weapon.damage + Phaser.Math.Between(-4, 4);

    // Check stunner: stuns enemy next turn
    if (weapon.id === 'stunner') {
      this._stunned = true;
      this._log(`You fire the Stun Pistol! ${this._enemy.name} is stunned!`);
    } else {
      this._log(`You hit with ${weapon.name} for ${dmg} dmg.`);
    }

    const broke = !useEquippedWeapon();
    if (broke) this._log(`Your ${weapon.name} broke!`);

    this._enemyHp = Math.max(0, this._enemyHp - dmg);
    this._flashEnemy();
    this._updateHpBars();
    this._drawEnemy(this._w * 0.78, this._h * 0.5);

    if (this._enemyHp <= 0) { this._endBrawl(true); return; }
    this._endPlayerTurn();
  }

  // ─── player turn ends, schedule enemy turn ────────────────────────────────

  _endPlayerTurn() {
    this._setPhase('enemy');
    this.time.delayedCall(900, () => this._enemyTurn());
  }

  // ─── enemy turn ───────────────────────────────────────────────────────────

  _enemyTurn() {
    if (this._stunned) {
      this._log(`${this._enemy.name} is stunned — loses their turn!`);
      this._stunned = false;
      this._drawEnemy(this._w * 0.78, this._h * 0.5);
      this._setPhase('player');
      return;
    }

    let dmg = this._enemy.damage + Phaser.Math.Between(-3, 3);
    if (this._defending) {
      dmg = Math.round(dmg * 0.4);
      this._log(`${this._enemy.name} attacks! You block most of it. ${dmg} dmg.`);
    } else {
      this._log(`${this._enemy.name} attacks for ${dmg} dmg!`);
    }
    this._defending = false;

    damageMilo(dmg);
    this._updateHpBars();

    // Screen flash
    const flash = this.add.rectangle(0, 0, this._w, this._h, 0xFF0000, 0.18).setOrigin(0);
    this.time.delayedCall(180, () => flash.destroy());

    if (getInventory().miloHp <= 0) {
      this.time.delayedCall(400, () => this._endBrawl(false));
      return;
    }
    this._setPhase('player');
  }

  // ------------------------------------------------------------------ end

  _endBrawl(playerWon) {
    this._turnOver = true;
    this._setPhase('enemy');   // disable buttons

    if (playerWon) {
      const spoilRoll = Math.random() < this._enemy.spoilChance;
      const earnedCredits = this._enemy.credits + Phaser.Math.Between(-5, 5);
      let spoils = [];

      let msg = `You win! +${earnedCredits} credits.`;
      if (spoilRoll) {
        const sp = SPOILS[Math.floor(Math.random() * SPOILS.length)];
        spoils.push(sp);
        msg += `  Found: ${sp.name}!`;
      }
      this._log(msg);
      this.time.delayedCall(1800, () => this._returnToPort({ creditsEarned: earnedCredits, spoils }));
    } else {
      this._log('You were knocked out...');
      // Respawn with 30% HP, no credits taken
      const inv = getInventory();
      inv.miloHp = Math.max(1, Math.round(inv.miloMaxHp * 0.3));
      this.time.delayedCall(1800, () => this._returnToPort({ creditsEarned: 0, spoils: [] }));
    }
  }

  _returnToPort(data) {
    this.cameras.main.fadeOut(300, 0, 5, 20);
    this.time.delayedCall(320, () => {
      this.scene.stop('BrawlScene');
      this.scene.wake('PortScene', data);
    });
  }
}
