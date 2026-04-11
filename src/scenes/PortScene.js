// PortScene — top-down port navigation.
// Launched (not overlaid) when player docks at a moon port.
// Milo walks through corridors and enters rooms.

import { getPortForMoon }           from '../data/ports.js';
import { WEAPONS, SHIP_UPGRADES, SPOILS, LIBRARY_BOOKS } from '../data/items.js';
import {
  getInventory, addWeapon, hasWeapon,
  addSpoil, sellSpoil, healMilo, trainMilo,
} from '../systems/InventorySystem.js';

const WORLD_W    = 750;
const WORLD_H    = 460;
const MILO_R     = 10;
const MILO_SPEED = 140;   // px per second
const INTERACT_R = 58;    // distance to trigger room prompt
const BAR_BRAWL_CHANCE = 0.45;

// Colour palette
const C = {
  wall:     0x0A1828,
  floor:    0x0D1F33,
  corridor: 0x0F2540,
  roomEdge: 0x1E3E7E,
  milo:     0x00AAFF,
  text:     '#CCDDF0',
  gold:     '#FFD700',
  green:    '#44FF88',
  red:      '#FF4444',
};

export default class PortScene extends Phaser.Scene {
  constructor() { super({ key: 'PortScene', active: false }); }

  // ------------------------------------------------------------------ init
  init(data) {
    this._moonId   = data.moonId   || 'moon';
    this._moonName = data.moonName || 'Moon';
    this._portData = getPortForMoon(this._moonId);
  }

  // ------------------------------------------------------------------ create
  create() {
    const { width, height } = this.scale;

    // ── world setup ──────────────────────────────────────────────────────────
    this._cam = this.cameras.main;
    this._cam.setBackgroundColor(0x020810);
    this._cam.setBounds(0, 0, WORLD_W, WORLD_H);

    // scale world to fit screen
    const scale = Math.min(width / WORLD_W, height / WORLD_H);
    this._worldOffX = (width  - WORLD_W * scale) * 0.5;
    this._worldOffY = (height - WORLD_H * scale) * 0.5;
    this._scale = scale;

    // ── draw map ─────────────────────────────────────────────────────────────
    this._gMap = this.add.graphics();
    this._drawMap();

    // ── Milo ─────────────────────────────────────────────────────────────────
    // Find dock room as spawn point
    const dock = this._portData.rooms.find(r => r.type === 'dock');
    this._mx = dock ? dock.cx + 60 : WORLD_W * 0.5;
    this._my = dock ? dock.cy      : WORLD_H * 0.5;

    this._gMilo = this.add.graphics();
    this._drawMilo();

    // ── room label prompts ────────────────────────────────────────────────────
    this._roomLabels = [];
    for (const room of this._portData.rooms) {
      const lbl = this.add.text(
        this._wx(room.cx), this._wy(room.cy - room.h * 0.5 * scale - 14),
        room.label, {
          fontSize: Math.round(11 * scale) + 'px',
          fontFamily: "'Arial', sans-serif",
          fontStyle: 'bold',
          color: C.gold,
          alpha: 0,
        },
      ).setOrigin(0.5, 1);
      this._roomLabels.push({ room, lbl });
    }

    // ── HUD strip ─────────────────────────────────────────────────────────────
    this._hudBg = this.add.rectangle(0, 0, width, 36, 0x000000, 0.75)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(20);
    this._hudText = this.add.text(10, 8, '', {
      fontSize: '13px', fontFamily: "'Arial', sans-serif",
      color: C.text,
    }).setScrollFactor(0).setDepth(21);
    this._updateHud();

    // ── keyboard ─────────────────────────────────────────────────────────────
    const kb = this.input.keyboard;
    this._keys = kb.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.UP,
      down:  Phaser.Input.Keyboard.KeyCodes.DOWN,
      left:  Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      w:     Phaser.Input.Keyboard.KeyCodes.W,
      s:     Phaser.Input.Keyboard.KeyCodes.S,
      a:     Phaser.Input.Keyboard.KeyCodes.A,
      d:     Phaser.Input.Keyboard.KeyCodes.D,
      enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      e:     Phaser.Input.Keyboard.KeyCodes.E,
    });

    // ── touch virtual d-pad (mobile) ─────────────────────────────────────────
    this._dpad = { dx: 0, dy: 0 };
    this._buildDpad(width, height, scale);

    // ── panel state ───────────────────────────────────────────────────────────
    this._panel      = null;   // active panel container
    this._nearRoom   = null;   // room Milo is near
    this._panelOpen  = false;

    // ── enter/interact tap ────────────────────────────────────────────────────
    this._enterJustPressed = false;
    this._keys.enter.on('down', () => { if (this._nearRoom) this._openRoom(this._nearRoom); });
    this._keys.e.on(    'down', () => { if (this._nearRoom) this._openRoom(this._nearRoom); });

    // BrawlScene resume event
    this.events.on('resume', this._onBrawlReturn, this);

    this.cameras.main.fadeIn(300, 0, 5, 20);
  }

  // ------------------------------------------------------------------ update
  update(_, delta) {
    if (this._panelOpen) return;

    const dt = delta / 1000;
    const k  = this._keys;

    let dx = this._dpad.dx;
    let dy = this._dpad.dy;
    if (k.left.isDown  || k.a.isDown) dx -= 1;
    if (k.right.isDown || k.d.isDown) dx += 1;
    if (k.up.isDown    || k.w.isDown) dy -= 1;
    if (k.down.isDown  || k.s.isDown) dy += 1;

    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

    const vx = dx * MILO_SPEED * dt;
    const vy = dy * MILO_SPEED * dt;

    this._moveWithCollision(vx, vy);
    this._drawMilo();
    this._updateRoomProximity();
    this._updateHud();
  }

  // ------------------------------------------------------------------ private: movement

  _moveWithCollision(vx, vy) {
    const w = this._portData.walkable;

    // Try X
    const nx = this._mx + vx;
    if (this._inWalkable(nx, this._my, w)) {
      this._mx = Phaser.Math.Clamp(nx, MILO_R, WORLD_W - MILO_R);
    }
    // Try Y
    const ny = this._my + vy;
    if (this._inWalkable(this._mx, ny, w)) {
      this._my = Phaser.Math.Clamp(ny, MILO_R, WORLD_H - MILO_R);
    }
  }

  _inWalkable(x, y, walkable) {
    const r = MILO_R;
    for (const rect of walkable) {
      if (x - r >= rect.x && x + r <= rect.x + rect.w &&
          y - r >= rect.y && y + r <= rect.y + rect.h) return true;
    }
    return false;
  }

  // ------------------------------------------------------------------ private: map drawing

  _drawMap() {
    const g   = this._gMap;
    const s   = this._scale;
    const ox  = this._worldOffX;
    const oy  = this._worldOffY;

    g.clear();

    // Background fill
    g.fillStyle(C.wall, 1);
    g.fillRect(ox, oy, WORLD_W * s, WORLD_H * s);

    // Walkable corridors
    g.fillStyle(C.corridor, 1);
    for (const rect of this._portData.walkable) {
      g.fillRect(ox + rect.x * s, oy + rect.y * s, rect.w * s, rect.h * s);
    }

    // Rooms
    for (const room of this._portData.rooms) {
      g.fillStyle(room.color, 1);
      g.fillRect(ox + room.x * s, oy + room.y * s, room.w * s, room.h * s);
      g.lineStyle(1.5, C.roomEdge, 0.9);
      g.strokeRect(ox + room.x * s, oy + room.y * s, room.w * s, room.h * s);
    }

    // World border
    g.lineStyle(2, C.roomEdge, 0.6);
    g.strokeRect(ox, oy, WORLD_W * s, WORLD_H * s);

    // Room name labels inside rooms
    for (const room of this._portData.rooms) {
      this.add.text(
        ox + (room.x + 4) * s,
        oy + (room.y + 4) * s,
        room.name, {
          fontSize: Math.round(9 * s) + 'px',
          fontFamily: "'Arial', sans-serif",
          color: '#446688',
        },
      );
    }
  }

  // ------------------------------------------------------------------ private: Milo

  _drawMilo() {
    const g  = this._gMilo;
    const ox = this._worldOffX;
    const oy = this._worldOffY;
    const s  = this._scale;
    const cx = ox + this._mx * s;
    const cy = oy + this._my * s;
    const r  = MILO_R * s;

    g.clear();
    // Body (torso rect)
    g.fillStyle(C.milo, 1);
    g.fillCircle(cx, cy, r);
    // Direction dot (just for visual polish)
    g.fillStyle(0xFFFFFF, 0.6);
    g.fillCircle(cx, cy - r * 0.35, r * 0.28);
  }

  // world coords → screen coords helpers
  _wx(x) { return this._worldOffX + x * this._scale; }
  _wy(y) { return this._worldOffY + y * this._scale; }

  // ------------------------------------------------------------------ private: room proximity

  _updateRoomProximity() {
    let nearest = null;
    let bestDist = INTERACT_R;

    for (const room of this._portData.rooms) {
      const d = Phaser.Math.Distance.Between(this._mx, this._my, room.cx, room.cy);
      if (d < bestDist) { bestDist = d; nearest = room; }
    }

    if (nearest !== this._nearRoom) {
      // Hide old prompt
      for (const { room, lbl } of this._roomLabels) lbl.setAlpha(0);
      this._nearRoom = nearest;
      if (nearest) {
        const entry = this._roomLabels.find(e => e.room === nearest);
        if (entry) entry.lbl.setAlpha(1);
      }
    }
  }

  // ------------------------------------------------------------------ private: HUD

  _updateHud() {
    const inv = getInventory();
    const room = this._nearRoom;
    const hint = room ? `  |  [E] Enter ${room.name}` : '';
    this._hudText.setText(
      `HP ${inv.miloHp}/${inv.miloMaxHp}   Credits ${inv.credits}   Port: ${this._moonName}${hint}`,
    );
  }

  // ------------------------------------------------------------------ private: d-pad

  _buildDpad(width, height, scale) {
    const size  = Math.round(40 * scale);
    const gap   = 6;
    const bx    = 60 * scale;
    const by    = height - 60 * scale;
    const alpha = 0.55;

    const dirs = [
      { label: '▲', ax:  0, ay: -1, ox: 0,        oy: -(size + gap) },
      { label: '▼', ax:  0, ay:  1, ox: 0,        oy:  (size + gap) },
      { label: '◀', ax: -1, ay:  0, ox: -(size + gap), oy: 0 },
      { label: '▶', ax:  1, ay:  0, ox:  (size + gap), oy: 0 },
    ];

    for (const d of dirs) {
      const bg = this.add.rectangle(bx + d.ox, by + d.oy, size, size, 0x112244, alpha)
        .setScrollFactor(0).setDepth(25).setInteractive();
      this.add.text(bx + d.ox, by + d.oy, d.label, {
        fontSize: Math.round(18 * scale) + 'px',
        fontFamily: 'Arial',
        color: '#88BBFF',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(26);

      bg.on('pointerdown', () => { this._dpad.dx = d.ax; this._dpad.dy = d.ay; });
      bg.on('pointerup',   () => { this._dpad.dx = 0;    this._dpad.dy = 0; });
      bg.on('pointerout',  () => { this._dpad.dx = 0;    this._dpad.dy = 0; });
    }

    // Room enter button (centre of d-pad)
    const enterBtn = this.add.rectangle(bx, by, size, size, 0x224411, alpha)
      .setScrollFactor(0).setDepth(25).setInteractive();
    this.add.text(bx, by, '↵', {
      fontSize: Math.round(16 * scale) + 'px',
      fontFamily: 'Arial', color: '#AAFFAA',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(26);
    enterBtn.on('pointerdown', () => { if (this._nearRoom) this._openRoom(this._nearRoom); });
  }

  // ------------------------------------------------------------------ room panels

  _openRoom(room) {
    if (this._panelOpen) return;
    this._panelOpen = true;

    switch (room.type) {
      case 'dock':    this._openDock();         break;
      case 'bar':     this._openBar();          break;
      case 'shop':    this._openShop();         break;
      case 'gym':     this._openGym();          break;
      case 'library': this._openLibrary();      break;
    }
  }

  _closePanel() {
    if (this._panel) { this._panel.destroy(); this._panel = null; }
    this._panelOpen = false;
    this._updateHud();
  }

  // ─── panel builder helper ─────────────────────────────────────────────────

  _makePanel(titleText, titleColor) {
    const { width, height } = this.scale;
    const s   = this._scale;
    const pw  = Math.min(width  - 24, 420);
    const ph  = Math.min(height - 80, 340);
    const px  = (width  - pw) * 0.5;
    const py  = (height - ph) * 0.5;

    const con = this.add.container(0, 0).setDepth(50);
    this._panel = con;

    // Backdrop
    const mask = this.add.rectangle(0, 0, width, height, 0x000000, 0.55)
      .setOrigin(0).setInteractive();
    con.add(mask);

    // Box
    const bg = this.add.graphics();
    bg.fillStyle(0x050D1A, 0.97);
    bg.fillRoundedRect(px, py, pw, ph, 16);
    bg.lineStyle(2, 0x1E3E7E, 1);
    bg.strokeRoundedRect(px, py, pw, ph, 16);
    con.add(bg);

    // Title
    const title = this.add.text(px + 16, py + 14, titleText, {
      fontSize: Math.round(16 * s) + 'px',
      fontFamily: "'Arial', sans-serif", fontStyle: 'bold',
      color: titleColor || C.gold,
    });
    con.add(title);

    // Sep line
    const sep = this.add.graphics();
    sep.lineStyle(1, 0x1E3E7E, 0.7);
    sep.lineBetween(px + 12, py + 44, px + pw - 12, py + 44);
    con.add(sep);

    // Close button
    const closeBtn = this.add.text(px + pw - 12, py + 12, '✕', {
      fontSize: '18px', fontFamily: 'Arial', color: '#446688',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this._closePanel());
    con.add(closeBtn);

    return { con, px, py, pw, ph, s, contentY: py + 52 };
  }

  _addBtn(con, x, y, w, label, color, callback) {
    const s   = this._scale;
    const h   = Math.round(30 * s);
    const bg  = this.add.rectangle(x + w * 0.5, y + h * 0.5, w, h, 0x091624, 1)
      .setInteractive({ useHandCursor: true });
    const txt = this.add.text(x + 8, y + h * 0.5, label, {
      fontSize: Math.round(12 * s) + 'px',
      fontFamily: 'Arial', color: color || '#88BBFF',
      fixedWidth: w - 16,
    }).setOrigin(0, 0.5);
    bg.on('pointerover', () => bg.setFillColor(0x112244));
    bg.on('pointerout',  () => bg.setFillColor(0x091624));
    bg.on('pointerdown', callback);
    con.add(bg); con.add(txt);
    return h + 6;
  }

  // ─── DOCK ────────────────────────────────────────────────────────────────

  _openDock() {
    const { con, px, py, pw, ph, s, contentY } = this._makePanel('Space Dock', '#88BBFF');
    const inv = getInventory();

    con.add(this.add.text(px + 16, contentY, 'Your ship is docked and ready for departure.', {
      fontSize: Math.round(13 * s) + 'px', fontFamily: 'Arial', color: C.text,
      wordWrap: { width: pw - 32 },
    }));
    con.add(this.add.text(px + 16, contentY + Math.round(36 * s),
      `Credits: ${inv.credits}   HP: ${inv.miloHp}/${inv.miloMaxHp}`, {
        fontSize: Math.round(12 * s) + 'px', fontFamily: 'Arial', color: C.gold,
      }));

    this._addBtn(con,
      px + 16, contentY + Math.round(75 * s), pw - 32,
      '▸  Leave Port (return to space)', '#FF8844',
      () => this._exitPort(),
    );
  }

  // ─── BAR ─────────────────────────────────────────────────────────────────

  _openBar() {
    const { con, px, py, pw, ph, s, contentY } = this._makePanel('The Bar', '#FF8844');

    const lines = [
      '"Hey there, spacer. What\'ll it be?"',
      '"Word is there\'s a plasma rifle on Triton."',
      '"Lost three ships to pirates near Saturn last cycle."',
      '"You look like trouble. Just like I like it."',
    ];
    const quote = lines[Math.floor(Math.random() * lines.length)];

    con.add(this.add.text(px + 16, contentY, quote, {
      fontSize: Math.round(13 * s) + 'px', fontFamily: 'Arial',
      fontStyle: 'italic', color: '#FFCC88',
      wordWrap: { width: pw - 32 },
    }));

    const brawlLabel = '▸  Start a brawl  (turn-based combat)';
    const talkLabel  = '▸  Just drink quietly';

    let y = contentY + Math.round(70 * s);
    this._addBtn(con, px + 16, y, pw - 32, brawlLabel, C.red, () => {
      this._closePanel();
      this._startBrawl();
    });
    y += Math.round(38 * s);
    this._addBtn(con, px + 16, y, pw - 32, talkLabel, '#88BBFF', () => this._closePanel());
  }

  // ─── GYM ─────────────────────────────────────────────────────────────────

  _openGym() {
    const { con, px, py, pw, ph, s, contentY } = this._makePanel('Training Bay', '#AA44FF');
    const inv = getInventory();

    const refreshText = () => {
      statusTxt.setText(`HP: ${inv.miloHp} / ${inv.miloMaxHp}  (max ${inv.miloMaxHp})`);
    };

    con.add(this.add.text(px + 16, contentY,
      'Hard training sessions improve your maximum health.', {
        fontSize: Math.round(13 * s) + 'px', fontFamily: 'Arial', color: C.text,
        wordWrap: { width: pw - 32 },
      }));

    const statusTxt = this.add.text(px + 16, contentY + Math.round(40 * s), '', {
      fontSize: Math.round(13 * s) + 'px', fontFamily: 'Arial', color: C.green,
    });
    con.add(statusTxt);
    refreshText();

    let y = contentY + Math.round(80 * s);
    this._addBtn(con, px + 16, y, pw - 32,
      '▸  Train hard  (+10 max HP, costs 25 credits)', C.green, () => {
        if (inv.credits < 25) {
          statusTxt.setText('Not enough credits!').setColor(C.red);
          return;
        }
        inv.credits -= 25;
        trainMilo();
        refreshText();
        statusTxt.setText(`Trained! HP: ${inv.miloHp} / ${inv.miloMaxHp}`).setColor(C.green);
      });
    y += Math.round(38 * s);
    this._addBtn(con, px + 16, y, pw - 32,
      '▸  Rest & heal  (+20 HP, costs 15 credits)', '#88BBFF', () => {
        if (inv.credits < 15) {
          statusTxt.setText('Not enough credits!').setColor(C.red); return;
        }
        inv.credits -= 15;
        healMilo(20);
        refreshText();
      });
    y += Math.round(38 * s);
    this._addBtn(con, px + 16, y, pw - 32, '▸  Leave', '#446688', () => this._closePanel());
  }

  // ─── LIBRARY ─────────────────────────────────────────────────────────────

  _openLibrary() {
    const { con, px, py, pw, ph, s, contentY } = this._makePanel('Archive', '#4488FF');
    const inv = getInventory();
    const unread = LIBRARY_BOOKS.filter(b => !inv.booksRead.includes(b.id));
    const read   = LIBRARY_BOOKS.filter(b =>  inv.booksRead.includes(b.id));

    let y = contentY;
    if (unread.length === 0) {
      con.add(this.add.text(px + 16, y, 'You have read all books here.', {
        fontSize: Math.round(13 * s) + 'px', fontFamily: 'Arial', color: '#446688',
      }));
    }

    // Show one unread at a time
    let bookIdx = 0;
    const showBook = () => {
      if (unread.length === 0) return;
      const book = unread[bookIdx % unread.length];
      titleTxt.setText(book.title);
      bodyTxt.setText(book.text);
      if (book.revealWeapon) {
        const wDef = WEAPONS.find(w => w.id === book.revealWeapon);
        hintTxt.setText(wDef ? `Hint: "${wDef.name}" discovered!` : '');
      } else {
        hintTxt.setText('');
      }
    };

    const titleTxt = this.add.text(px + 16, y, '', {
      fontSize: Math.round(14 * s) + 'px', fontFamily: 'Arial',
      fontStyle: 'bold', color: C.gold, wordWrap: { width: pw - 32 },
    });
    con.add(titleTxt);
    y += Math.round(30 * s);

    const bodyTxt = this.add.text(px + 16, y, '', {
      fontSize: Math.round(12 * s) + 'px', fontFamily: 'Arial',
      color: C.text, wordWrap: { width: pw - 32 }, lineSpacing: 4,
    });
    con.add(bodyTxt);
    y += Math.round(70 * s);

    const hintTxt = this.add.text(px + 16, y, '', {
      fontSize: Math.round(12 * s) + 'px', fontFamily: 'Arial', color: C.green,
    });
    con.add(hintTxt);
    y += Math.round(24 * s);

    if (unread.length > 0) {
      showBook();
      this._addBtn(con, px + 16, y, pw - 32, '▸  Read this book', C.green, () => {
        const book = unread[bookIdx % unread.length];
        if (!inv.booksRead.includes(book.id)) inv.booksRead.push(book.id);
        if (book.revealWeapon) {
          const wDef = WEAPONS.find(w => w.id === book.revealWeapon);
          if (wDef) hintTxt.setText(`"${wDef.name}" added to knowledge!`);
        }
        bookIdx++;
        if (bookIdx < unread.length) showBook();
        else {
          titleTxt.setText('No more books here.');
          bodyTxt.setText('');
          hintTxt.setText('');
        }
      });
      y += Math.round(38 * s);
    }

    this._addBtn(con, px + 16, y, pw - 32, '▸  Leave', '#446688', () => this._closePanel());
  }

  // ─── SHOP ────────────────────────────────────────────────────────────────

  _openShop() {
    const { con, px, py, pw, ph, s, contentY } = this._makePanel('Shop', C.green);
    const inv = getInventory();

    // Tabs: BUY WEAPONS | BUY UPGRADES | SELL SPOILS
    let activeTab = 'weapons';
    let tabContent = null;

    const tabs = [
      { id: 'weapons',  label: 'Buy Weapons'   },
      { id: 'upgrades', label: 'Buy Upgrades'  },
      { id: 'sell',     label: 'Sell Spoils'   },
    ];

    const tabY = contentY;
    const tabW = Math.round((pw - 32) / 3);
    const tabBgs = [];
    for (let i = 0; i < tabs.length; i++) {
      const tx = px + 16 + i * (tabW + 4);
      const bg = this.add.rectangle(tx + tabW * 0.5, tabY + 13, tabW, 26, 0x091624, 1)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(tx + 4, tabY + 2, tabs[i].label, {
        fontSize: Math.round(11 * s) + 'px', fontFamily: 'Arial', color: '#88BBFF',
        fixedWidth: tabW - 8,
      });
      const idx = i;
      bg.on('pointerdown', () => {
        activeTab = tabs[idx].id;
        refreshTabs();
        buildTabContent();
      });
      con.add(bg); con.add(txt);
      tabBgs.push({ bg, txt, id: tabs[i].id });
    }

    const refreshTabs = () => {
      for (const t of tabBgs) {
        t.bg.setFillColor(t.id === activeTab ? 0x1E3E7E : 0x091624);
      }
    };

    const credTxt = this.add.text(px + 16, tabY + Math.round(32 * s),
      `Credits: ${inv.credits}`, {
        fontSize: Math.round(12 * s) + 'px', fontFamily: 'Arial', color: C.gold,
      });
    con.add(credTxt);

    const listStart = tabY + Math.round(60 * s);

    const buildTabContent = () => {
      if (tabContent) tabContent.destroy();
      tabContent = this.add.container(0, 0);
      con.add(tabContent);
      credTxt.setText(`Credits: ${inv.credits}`);

      if (activeTab === 'weapons') {
        let oy = 0;
        for (const w of WEAPONS) {
          if (w.buyPrice === 0) continue;   // no selling fists
          const owned = hasWeapon(w.id);
          const canBuy = !owned && inv.credits >= w.buyPrice;
          const col = owned ? '#446644' : (canBuy ? '#88BBFF' : '#444466');
          const suffix = owned ? ' [owned]' : ` — ${w.buyPrice}c`;
          const row = this.add.text(px + 16, listStart + oy,
            `${w.name}${suffix}  (${w.damage} dmg)`, {
              fontSize: Math.round(11 * s) + 'px', fontFamily: 'Arial',
              color: col, fixedWidth: pw - 32,
              backgroundColor: canBuy ? '#091624' : undefined,
              padding: canBuy ? { x: 4, y: 3 } : undefined,
            });
          if (canBuy) {
            row.setInteractive({ useHandCursor: true });
            row.on('pointerover', () => row.setStyle({ color: '#FFFFFF', backgroundColor: '#112244' }));
            row.on('pointerout',  () => row.setStyle({ color: col,       backgroundColor: '#091624' }));
            row.on('pointerdown', () => {
              if (inv.credits < w.buyPrice) return;
              inv.credits -= w.buyPrice;
              addWeapon(w);
              buildTabContent();
            });
          }
          tabContent.add(row);
          oy += Math.round(24 * s);
        }
      }

      if (activeTab === 'upgrades') {
        let oy = 0;
        for (const u of SHIP_UPGRADES) {
          const curLevel = inv.shipUpgrades[u.type] || 0;
          const owned    = curLevel >= u.level;
          const canBuy   = !owned && curLevel === u.level - 1 && inv.credits >= u.buyPrice;
          const col      = owned ? '#446644' : (canBuy ? '#88BBFF' : '#444466');
          const suffix   = owned ? ' [installed]' : ` — ${u.buyPrice}c`;
          const row = this.add.text(px + 16, listStart + oy,
            `${u.name}${suffix}`, {
              fontSize: Math.round(11 * s) + 'px', fontFamily: 'Arial',
              color: col, fixedWidth: pw - 32,
              backgroundColor: canBuy ? '#091624' : undefined,
              padding: canBuy ? { x: 4, y: 3 } : undefined,
            });
          if (canBuy) {
            row.setInteractive({ useHandCursor: true });
            row.on('pointerover', () => row.setStyle({ color: '#FFFFFF', backgroundColor: '#112244' }));
            row.on('pointerout',  () => row.setStyle({ color: col,       backgroundColor: '#091624' }));
            row.on('pointerdown', () => {
              if (inv.credits < u.buyPrice) return;
              inv.credits -= u.buyPrice;
              inv.shipUpgrades[u.type] = u.level;
              buildTabContent();
            });
          }
          tabContent.add(row);
          oy += Math.round(24 * s);
        }
      }

      if (activeTab === 'sell') {
        let oy = 0;
        if (inv.spoils.length === 0) {
          tabContent.add(this.add.text(px + 16, listStart, 'No spoils to sell.', {
            fontSize: Math.round(12 * s) + 'px', fontFamily: 'Arial', color: '#446668',
          }));
        }
        for (const sp of inv.spoils) {
          const row = this.add.text(px + 16, listStart + oy,
            `${sp.name} ×${sp.qty}  → ${sp.sellPrice}c each`, {
              fontSize: Math.round(11 * s) + 'px', fontFamily: 'Arial',
              color: '#FFCC66', fixedWidth: pw - 32,
              backgroundColor: '#091624', padding: { x: 4, y: 3 },
            });
          row.setInteractive({ useHandCursor: true });
          row.on('pointerover', () => row.setStyle({ backgroundColor: '#112244' }));
          row.on('pointerout',  () => row.setStyle({ backgroundColor: '#091624' }));
          row.on('pointerdown', () => { sellSpoil(sp.id); buildTabContent(); });
          tabContent.add(row);
          oy += Math.round(24 * s);
        }
      }
    };

    refreshTabs();
    buildTabContent();

    const closeY = py + ph - Math.round(38 * s);
    this._addBtn(con, px + 16, closeY, pw - 32, '▸  Leave shop', '#446668',
      () => this._closePanel());
  }

  // ------------------------------------------------------------------ brawl

  _startBrawl() {
    this.scene.sleep('PortScene');
    this.scene.launch('BrawlScene', {
      moonId: this._moonId,
    });
  }

  _onBrawlReturn(sys, data) {
    // data: { creditsEarned, spoils[] } from BrawlScene
    if (data) {
      const inv = getInventory();
      inv.credits += data.creditsEarned || 0;
      for (const s of (data.spoils || [])) addSpoil(s);
    }
    this._panelOpen = false;
    this._updateHud();
  }

  // ------------------------------------------------------------------ exit

  _exitPort() {
    this.cameras.main.fadeOut(300, 0, 5, 20);
    this.time.delayedCall(320, () => {
      this.scene.stop('PortScene');
      const ss = this.scene.get('SolarSystemScene');
      if (ss && ss.onPortExit) ss.onPortExit();
    });
  }
}
