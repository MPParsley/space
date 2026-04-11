// BrawlScene — turn-based bar brawl.
// Layout inspired by classic CRPG Gold Box combat:
//   • Character portrait strip (top-left) / enemy portrait strip (top-right)
//   • Credits displayed prominently centre-screen
//   • Weapon slot row always visible — click to equip, then hit ATTACK
//   • Segmented HP blocks
//   • Floating damage numbers
//   • 4-line scrolling combat log at the bottom

import { WEAPONS, BRAWL_ENEMIES, SPOILS } from '../data/items.js';
import {
  getInventory, getEquippedWeapon, useEquippedWeapon,
  healMilo, damageMilo,
} from '../systems/InventorySystem.js';

// ── palette ──────────────────────────────────────────────────────────────────
const P = {
  bg:      0x010810,
  panel:   0x040C18,
  strip:   0x020A14,
  border:  0x1E3E7E,
  dimBdr:  0x0A1E30,
  floorTx: 0x0A1828,
  barTx:   0x130806,
  // text
  gold:    '#FFD700',
  silver:  '#AACCFF',
  green:   '#44FF88',
  red:     '#FF4444',
  orange:  '#FF8844',
  dim:     '#334455',
  white:   '#FFFFFF',
};

// Enemy accent colours
const ENEMY_COL = {
  patron:  0xFF8844,
  worker:  0x44AAFF,
  thug:    0xCC3333,
  bouncer: 0x884400,
  pirate:  0x880000,
};

export default class BrawlScene extends Phaser.Scene {
  constructor() { super({ key: 'BrawlScene', active: false }); }

  // ------------------------------------------------------------------ init
  init(data) {
    this._moonId = data.moonId || 'moon';
  }

  // ------------------------------------------------------------------ create
  create() {
    const { width: W, height: H } = this.scale;
    this._W = W; this._H = H;

    // Pick enemy
    this._enemy   = this._pickEnemy();
    this._enemyHp = this._enemy.hp;
    this._stunned = false;
    this._defending = false;
    this._busy    = false;   // blocks player input during animations

    this._buildUI();

    this._log('A brawl breaks out!');
    this._log(`You face: ${this._enemy.name}  (${this._enemy.hp} HP)`);

    this.cameras.main.fadeIn(220, 0, 5, 20);
  }

  // ------------------------------------------------------------------ enemy pick
  _pickEnemy() {
    const tier = { moon: 0, callisto: 1, ganymede: 2, titan: 2, europa: 3, triton: 4 }[this._moonId] ?? 0;
    const min = Math.max(0, tier - 1);
    const max = Math.min(BRAWL_ENEMIES.length - 1, tier + 1);
    return { ...BRAWL_ENEMIES[min + Math.floor(Math.random() * (max - min + 1))] };
  }

  // ================================================================== UI BUILD

  _buildUI() {
    const W = this._W, H = this._H;

    // ── zone heights ─────────────────────────────────────────────────────────
    const TOP_H    = Math.round(H * 0.18);   // portrait + HP strip
    const SCENE_H  = Math.round(H * 0.30);   // combat silhouettes
    const CRED_H   = Math.round(H * 0.10);   // credits banner
    const LOG_H    = Math.round(H * 0.17);   // combat log
    const WPN_H    = Math.round(H * 0.10);   // weapon slots
    const BTN_H    = H - TOP_H - SCENE_H - CRED_H - LOG_H - WPN_H;

    this._zTop   = 0;
    this._zScene = TOP_H;
    this._zCred  = TOP_H + SCENE_H;
    this._zLog   = TOP_H + SCENE_H + CRED_H;
    this._zWpn   = TOP_H + SCENE_H + CRED_H + LOG_H;
    this._zBtn   = TOP_H + SCENE_H + CRED_H + LOG_H + WPN_H;

    // ── background fills ──────────────────────────────────────────────────────
    const bg = this.add.graphics();
    // Top strip
    bg.fillStyle(P.strip, 1);
    bg.fillRect(0, 0, W, TOP_H);
    // Scene area (bar interior)
    bg.fillStyle(P.barTx, 1);
    bg.fillRect(0, this._zScene, W, SCENE_H);
    // floor
    bg.fillStyle(P.floorTx, 1);
    bg.fillRect(0, this._zScene + SCENE_H * 0.65, W, SCENE_H * 0.35);
    // credits area
    bg.fillStyle(0x050E1A, 1);
    bg.fillRect(0, this._zCred, W, CRED_H);
    // log
    bg.fillStyle(P.panel, 1);
    bg.fillRect(0, this._zLog, W, LOG_H);
    // weapon strip
    bg.fillStyle(P.strip, 1);
    bg.fillRect(0, this._zWpn, W, WPN_H);
    // button strip
    bg.fillStyle(P.bg, 1);
    bg.fillRect(0, this._zBtn, W, BTN_H);

    // separator lines
    const sep = this.add.graphics();
    sep.lineStyle(1, P.border, 0.5);
    for (const y of [TOP_H, this._zCred, this._zLog, this._zWpn, this._zBtn]) {
      sep.lineBetween(0, y, W, y);
    }

    // ── TOP STRIP: portraits + HP blocks ──────────────────────────────────────
    this._buildPortrait(true,  0,       TOP_H, W * 0.45);
    this._buildPortrait(false, W * 0.55, TOP_H, W * 0.45);

    // centre: turn indicator
    this._turnTxt = this.add.text(W * 0.5, TOP_H * 0.5, '', {
      fontSize: '11px', fontFamily: 'Arial', fontStyle: 'bold',
      color: P.silver,
    }).setOrigin(0.5).setDepth(5);

    // ── SCENE: silhouettes ───────────────────────────────────────────────────
    const scY = this._zScene + SCENE_H * 0.5;
    this._drawPlayerSil(W * 0.22, scY);
    this._gEnemy = this.add.graphics();
    this._drawEnemySil(W * 0.78, scY);

    // ── CREDITS BANNER ───────────────────────────────────────────────────────
    const credY = this._zCred + CRED_H * 0.5;
    this.add.text(W * 0.5, credY, '◆', {
      fontSize: '12px', fontFamily: 'Arial', color: P.dim,
    }).setOrigin(0.5);
    this._credTxt = this.add.text(W * 0.5, credY, '', {
      fontSize: Math.round(CRED_H * 0.52) + 'px',
      fontFamily: 'Arial', fontStyle: 'bold',
      color: P.gold,
    }).setOrigin(0.5);
    this._updateCredits();

    // ── LOG ──────────────────────────────────────────────────────────────────
    this._logLines = [];
    this._logBuf   = [];
    for (let i = 0; i < 4; i++) {
      this._logLines.push(this.add.text(12, this._zLog + 6 + i * 19, '', {
        fontSize: '12px', fontFamily: 'Arial', color: P.silver,
      }));
    }

    // ── WEAPON SLOTS ─────────────────────────────────────────────────────────
    this._weaponSlots = [];
    this._buildWeaponSlots(WPN_H);

    // ── ACTION BUTTONS ────────────────────────────────────────────────────────
    this._buildActionBtns(BTN_H);
  }

  // ─── portrait panel ───────────────────────────────────────────────────────
  _buildPortrait(isPlayer, x, h, w) {
    const portW = Math.round(w * 0.28);
    const portH = h - 8;
    const portX = isPlayer ? x + 8 : x + w - portW - 8;
    const portY = 4;

    // Portrait box
    const pg = this.add.graphics();
    pg.fillStyle(0x0A1828, 1);
    pg.fillRect(portX, portY, portW, portH);
    pg.lineStyle(1, P.border, 0.7);
    pg.strokeRect(portX, portY, portW, portH);

    // Mini silhouette inside portrait
    this._drawMiniSil(pg, isPlayer,
      portX + portW * 0.5, portY + portH * 0.5, Math.min(portW, portH) * 0.38);

    // Name
    const nameX = isPlayer ? portX + portW + 8 : x + 8;
    const name  = isPlayer ? 'MILO' : this._enemy.name.toUpperCase();
    this.add.text(nameX, portY + 2, name, {
      fontSize: '12px', fontFamily: 'Arial', fontStyle: 'bold',
      color: isPlayer ? P.silver : P.orange,
    }).setOrigin(isPlayer ? 0 : 0, 0);

    // HP blocks
    const blocksX = isPlayer ? portX + portW + 8 : x + 8;
    const blocksY = portY + 18;
    const maxBlocks = 10;
    const hpBlocks = [];
    for (let i = 0; i < maxBlocks; i++) {
      const bx = blocksX + i * 11;
      const br = this.add.rectangle(bx + 4, blocksY + 6, 9, 10, 0x44FF44, 1);
      hpBlocks.push(br);
    }

    if (isPlayer) {
      this._playerHpBlocks = hpBlocks;
    } else {
      this._enemyHpBlocks = hpBlocks;
    }

    this._updateHpBlocks();
  }

  _updateHpBlocks() {
    const inv  = getInventory();
    const pPct = inv.miloHp / inv.miloMaxHp;
    const ePct = Math.max(0, this._enemyHp / this._enemy.hp);
    const N    = 10;

    if (this._playerHpBlocks) {
      const lit = Math.round(pPct * N);
      this._playerHpBlocks.forEach((b, i) => {
        const on  = i < lit;
        const col = pPct > 0.5 ? 0x44FF44 : pPct > 0.25 ? 0xFFCC00 : 0xFF4444;
        b.setFillStyle(on ? col : 0x112233).setAlpha(on ? 1 : 0.3);
      });
    }
    if (this._enemyHpBlocks) {
      const lit = Math.round(ePct * N);
      this._enemyHpBlocks.forEach((b, i) => {
        const on  = i < lit;
        const col = ePct > 0.5 ? 0xFF4444 : ePct > 0.25 ? 0xFF8800 : 0xFF2200;
        b.setFillStyle(on ? col : 0x112233).setAlpha(on ? 1 : 0.3);
      });
    }
  }

  // ─── silhouettes ──────────────────────────────────────────────────────────
  _drawMiniSil(g, isPlayer, cx, cy, sz) {
    const col = isPlayer ? 0x2266AA : (ENEMY_COL[this._enemy.id] || 0xAA2222);
    g.fillStyle(col, 0.8);
    g.fillCircle(cx, cy - sz * 0.55, sz * 0.28);
    g.fillRect(cx - sz * 0.22, cy - sz * 0.28, sz * 0.44, sz * 0.55);
  }

  _drawPlayerSil(cx, cy) {
    const g = this.add.graphics();
    const s = Math.round(this._H * 0.06);
    g.fillStyle(0x2266AA, 1);
    g.fillCircle(cx, cy - s * 2.2, s * 0.9);
    g.fillRect(cx - s * 0.8, cy - s * 1.3, s * 1.6, s * 2.0);
    g.fillRect(cx - s * 1.5, cy - s * 1.2, s * 0.7, s * 1.6);
    g.fillRect(cx + s * 0.8, cy - s * 1.2, s * 0.7, s * 1.6);
    g.fillRect(cx - s * 0.8, cy + s * 0.7, s * 0.7, s * 1.8);
    g.fillRect(cx + s * 0.1, cy + s * 0.7, s * 0.7, s * 1.8);
  }

  _drawEnemySil(cx, cy) {
    const g = this._gEnemy;
    g.clear();
    const col = ENEMY_COL[this._enemy.id] || 0xAA2222;
    const s   = Math.round(this._H * 0.065);
    g.fillStyle(col, 1);
    g.fillCircle(cx, cy - s * 2.3, s);
    g.fillRect(cx - s * 0.9, cy - s * 1.3, s * 1.8, s * 2.2);
    g.fillRect(cx - s * 1.7, cy - s * 1.2, s * 0.8, s * 1.7);
    g.fillRect(cx + s * 0.9, cy - s * 1.2, s * 0.8, s * 1.7);
    g.fillRect(cx - s * 0.9, cy + s * 0.9, s * 0.8, s * 1.9);
    g.fillRect(cx + s * 0.1, cy + s * 0.9, s * 0.8, s * 1.9);
    if (this._stunned) {
      g.fillStyle(0xFFFF00, 0.85);
      g.fillCircle(cx - s * 0.5, cy - s * 3.4, s * 0.35);
      g.fillCircle(cx + s * 0.5, cy - s * 3.4, s * 0.35);
    }
  }

  // ─── credits banner ───────────────────────────────────────────────────────
  _updateCredits() {
    const inv = getInventory();
    this._credTxt.setText(inv.credits.toLocaleString() + '  CREDITS');
  }

  // ─── weapon slots ─────────────────────────────────────────────────────────
  _buildWeaponSlots(zoneH) {
    const W   = this._W;
    const inv = getInventory();
    const slotSize = Math.round(zoneH * 0.82);
    const gap      = 6;
    const totalW   = inv.weapons.length * (slotSize + gap) - gap;
    let sx = (W - totalW) * 0.5;
    const sy = this._zWpn + (zoneH - slotSize) * 0.5;

    // clear previous
    for (const s of this._weaponSlots) { s.bg.destroy(); s.lbl.destroy(); s.dmg.destroy(); }
    this._weaponSlots = [];

    for (let i = 0; i < inv.weapons.length; i++) {
      const w      = inv.weapons[i];
      const isEq   = w.id === inv.equippedWeapon;
      const usesStr = w.uses !== null ? `${w.uses}` : '∞';
      const typeCol = w.type === 'ranged' ? 0x224488 : 0x1A2E0A;

      const bg = this.add.rectangle(
        sx + slotSize * 0.5, sy + slotSize * 0.5, slotSize, slotSize,
        isEq ? 0x1E3E7E : typeCol, 1,
      ).setInteractive({ useHandCursor: true }).setDepth(5);

      const lbl = this.add.text(sx + slotSize * 0.5, sy + slotSize * 0.28,
        w.name.split(' ')[0], {
          fontSize: Math.round(slotSize * 0.2) + 'px',
          fontFamily: 'Arial', color: isEq ? P.white : P.silver,
        }).setOrigin(0.5).setDepth(6);

      const dmg = this.add.text(sx + slotSize * 0.5, sy + slotSize * 0.62,
        `${w.damage}`, {
          fontSize: Math.round(slotSize * 0.3) + 'px',
          fontFamily: 'Arial', fontStyle: 'bold',
          color: isEq ? P.gold : '#446688',
        }).setOrigin(0.5).setDepth(6);

      // uses dot
      this.add.text(sx + slotSize * 0.5, sy + slotSize * 0.86,
        usesStr, {
          fontSize: Math.round(slotSize * 0.16) + 'px',
          fontFamily: 'Arial', color: '#335544',
        }).setOrigin(0.5).setDepth(6);

      bg.lineStyle = undefined;
      const bdr = this.add.graphics().setDepth(5);
      bdr.lineStyle(isEq ? 2 : 1, isEq ? 0x4488FF : P.dimBdr, 1);
      bdr.strokeRect(sx, sy, slotSize, slotSize);

      const idx = i;
      bg.on('pointerover', () => bg.setFillStyle(0x1E3E7E));
      bg.on('pointerout',  () => bg.setFillStyle(inv.weapons[idx].id === inv.equippedWeapon ? 0x1E3E7E : typeCol));
      bg.on('pointerdown', () => {
        if (this._busy) return;
        inv.equippedWeapon = inv.weapons[idx].id;
        this._buildWeaponSlots(zoneH);
      });

      this._weaponSlots.push({ bg, lbl, dmg, bdr });
      sx += slotSize + gap;
    }
  }

  // ─── action buttons ───────────────────────────────────────────────────────
  _buildActionBtns(zoneH) {
    const W    = this._W;
    const y0   = this._zBtn;
    const btnH = Math.round(zoneH * 0.78);
    const btnW = Math.round((W - 32) / 3) - 4;
    const by   = y0 + (zoneH - btnH) * 0.5;
    const defs = [
      { id: 'attack',  label: 'ATTACK',   col: P.red    },
      { id: 'defend',  label: 'DEFEND',   col: '#44AAFF' },
      { id: 'heal',    label: 'HEAL (+20)', col: P.green },
    ];
    this._btns = {};
    for (let i = 0; i < defs.length; i++) {
      const bx = 16 + i * (btnW + 6);
      const bg = this.add.rectangle(bx + btnW * 0.5, by + btnH * 0.5, btnW, btnH,
        0x091624, 1).setInteractive({ useHandCursor: true }).setDepth(10);
      const txt = this.add.text(bx + btnW * 0.5, by + btnH * 0.5, defs[i].label, {
        fontSize: '14px', fontFamily: 'Arial', fontStyle: 'bold',
        color: defs[i].col,
      }).setOrigin(0.5).setDepth(11);
      bg.on('pointerover', () => { if (!this._busy) bg.setFillStyle(0x112244); });
      bg.on('pointerout',  () => bg.setFillStyle(0x091624));
      bg.on('pointerdown', () => { if (!this._busy) this._onAction(defs[i].id); });
      this._btns[defs[i].id] = { bg, txt };
    }
  }

  _setInputEnabled(on) {
    this._busy = !on;
    for (const k of Object.keys(this._btns)) {
      const b = this._btns[k];
      b.bg.setAlpha(on ? 1 : 0.35);
      b.txt.setAlpha(on ? 1 : 0.35);
    }
  }

  // ================================================================== COMBAT

  _log(msg) {
    this._logBuf.push(msg);
    if (this._logBuf.length > 4) this._logBuf.shift();
    this._logLines.forEach((l, i) => l.setText(this._logBuf[i] || ''));
  }

  _onAction(id) {
    if (this._busy) return;
    if (id === 'attack') {
      this._doAttack();
    } else if (id === 'defend') {
      this._defending = true;
      this._log('You brace for impact. Defence doubled this turn.');
      this._endPlayerTurn();
    } else if (id === 'heal') {
      const inv = getInventory();
      if (inv.miloHp >= inv.miloMaxHp) { this._log('Already at full health!'); return; }
      healMilo(20);
      this._log(`You catch your breath. +20 HP  (${inv.miloHp}/${inv.miloMaxHp})`);
      this._updateHpBlocks();
      this._updateCredits();
      this._endPlayerTurn();
    }
  }

  _doAttack() {
    const weapon = getEquippedWeapon();
    let   dmg    = weapon.damage + Phaser.Math.Between(-4, 4);

    if (weapon.id === 'stunner') {
      this._stunned = true;
      dmg = Math.round(dmg * 0.5);
      this._log(`Stun Pistol fires! ${this._enemy.name} stunned! (${dmg} dmg)`);
    } else {
      this._log(`${weapon.name} hits for ${dmg} damage.`);
    }

    const broke = !useEquippedWeapon();
    if (broke) this._log(`Your ${weapon.name} broke!`);

    this._enemyHp = Math.max(0, this._enemyHp - dmg);
    this._floatDmg(this._W * 0.78, this._zScene + (this._H * 0.15), dmg, P.red);
    this._flashEnemy();
    this._updateHpBlocks();
    this._drawEnemySil(this._W * 0.78, this._zScene + this._H * 0.15);

    // Rebuild weapon slots (uses may have changed, weapon may have broken)
    const zoneH = this._zBtn - this._zWpn;
    this._buildWeaponSlots(zoneH);

    if (this._enemyHp <= 0) { this._endBrawl(true); return; }
    this._endPlayerTurn();
  }

  _endPlayerTurn() {
    this._setInputEnabled(false);
    this._turnTxt.setText('ENEMY TURN');
    this.time.delayedCall(820, () => this._enemyTurn());
  }

  _enemyTurn() {
    this._turnTxt.setText('');
    if (this._stunned) {
      this._log(`${this._enemy.name} staggers — loses turn!`);
      this._stunned = false;
      this._drawEnemySil(this._W * 0.78, this._zScene + this._H * 0.15);
      this._setInputEnabled(true);
      return;
    }

    let dmg = this._enemy.damage + Phaser.Math.Between(-3, 3);
    if (this._defending) {
      dmg = Math.max(1, Math.round(dmg * 0.4));
      this._log(`${this._enemy.name} hits! You block most of it. (${dmg} dmg)`);
    } else {
      this._log(`${this._enemy.name} strikes for ${dmg} damage!`);
    }
    this._defending = false;

    damageMilo(dmg);
    this._floatDmg(this._W * 0.22, this._zScene + this._H * 0.15, dmg, '#FF6666');
    this._updateHpBlocks();

    // Red vignette flash
    const flash = this.add.rectangle(0, 0, this._W, this._H, 0xFF0000, 0.15)
      .setOrigin(0).setDepth(20);
    this.time.delayedCall(160, () => flash.destroy());

    if (getInventory().miloHp <= 0) {
      this.time.delayedCall(500, () => this._endBrawl(false));
      return;
    }
    this._setInputEnabled(true);
  }

  // ─── floating damage number ───────────────────────────────────────────────
  _floatDmg(x, y, amount, color) {
    const t = this.add.text(x, y, `-${amount}`, {
      fontSize: '22px', fontFamily: 'Arial', fontStyle: 'bold',
      color, stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);
    this.tweens.add({
      targets: t, y: y - 48, alpha: 0, duration: 900, ease: 'Cubic.Out',
      onComplete: () => t.destroy(),
    });
  }

  // ─── enemy flash ──────────────────────────────────────────────────────────
  _flashEnemy() {
    this._gEnemy.setAlpha(0.15);
    this.time.delayedCall(80,  () => this._gEnemy.setAlpha(1));
    this.time.delayedCall(160, () => this._gEnemy.setAlpha(0.15));
    this.time.delayedCall(240, () => this._gEnemy.setAlpha(1));
  }

  // ================================================================== END

  _endBrawl(playerWon) {
    this._setInputEnabled(false);

    if (playerWon) {
      const roll          = Math.random() < this._enemy.spoilChance;
      const creditsEarned = this._enemy.credits + Phaser.Math.Between(-5, 10);
      const spoils        = [];
      if (roll) spoils.push(SPOILS[Math.floor(Math.random() * SPOILS.length)]);

      getInventory().credits += creditsEarned;
      this._updateCredits();
      this._log(`Victory!  +${creditsEarned} credits${roll ? '  +1 spoil' : ''}`);
      this.time.delayedCall(1800, () => this._returnToPort({ creditsEarned: 0, spoils }));
    } else {
      this._log('Knocked out... you wake up later.');
      const inv = getInventory();
      inv.miloHp = Math.max(1, Math.round(inv.miloMaxHp * 0.3));
      this._updateHpBlocks();
      this.time.delayedCall(1800, () => this._returnToPort({ creditsEarned: 0, spoils: [] }));
    }
  }

  _returnToPort(data) {
    this.cameras.main.fadeOut(280, 0, 5, 20);
    this.time.delayedCall(300, () => {
      this.scene.stop('BrawlScene');
      this.scene.wake('PortScene', data);
    });
  }
}
