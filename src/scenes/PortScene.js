// PortScene — base schematic navigation.
// Inspired by classic CRPG base screens: an overhead blueprint of the station
// with labelled rooms you click to enter. No walking — just select a room.

import { getPortForMoon }           from '../data/ports.js';
import { WEAPONS, SHIP_UPGRADES, SPOILS, LIBRARY_BOOKS } from '../data/items.js';
import {
  getInventory, addWeapon, hasWeapon,
  addSpoil, sellSpoil, healMilo, trainMilo,
} from '../systems/InventorySystem.js';

// Room type → icon character and accent colour
const ROOM_STYLE = {
  dock:    { icon: '⊕', accent: 0x2266AA, label: 'SPACE DOCK'  },
  bar:     { icon: '⊗', accent: 0xAA4400, label: 'BAR'         },
  shop:    { icon: '⊞', accent: 0x116622, label: 'SHOP'        },
  gym:     { icon: '⊡', accent: 0x662288, label: 'GYM'         },
  library: { icon: '⊟', accent: 0x224488, label: 'LIBRARY'     },
};

const C = {
  bg:         0x020810,
  schematic:  0x030F1E,
  corridor:   0x0A1E30,
  roomBg:     0x061422,
  roomHover:  0x0E2A46,
  roomSel:    0x0A1E36,
  border:     0x1E3E7E,
  borderDim:  0x0E2040,
  connLine:   0x0E2A46,
  text:       '#CCDDF0',
  textDim:    '#334455',
  gold:       '#FFD700',
  green:      '#44FF88',
  red:        '#FF4444',
  orange:     '#FF8844',
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
    this.cameras.main.setBackgroundColor(C.bg);

    // Leave room for HUD strip (top) and status bar (bottom)
    const HUD_H    = 42;
    const STATUS_H = 36;
    const mapH     = height - HUD_H - STATUS_H;
    const mapW     = width;

    this._mapX = 0;
    this._mapY = HUD_H;
    this._mapW = mapW;
    this._mapH = mapH;

    // ── background schematic grid ─────────────────────────────────────────
    const bgG = this.add.graphics();
    bgG.fillStyle(C.schematic, 1);
    bgG.fillRect(0, HUD_H, mapW, mapH);
    // subtle dot-grid
    bgG.fillStyle(0x0C2030, 1);
    for (let gx = 12; gx < mapW; gx += 24) {
      for (let gy = HUD_H + 12; gy < HUD_H + mapH; gy += 24) {
        bgG.fillRect(gx, gy, 1, 1);
      }
    }

    // ── compute room screen rects ─────────────────────────────────────────
    // The port data uses a 750×460 world; scale it to fit our map area
    const DATA_W = 750;
    const DATA_H = 460;
    const scaleX = mapW  / DATA_W;
    const scaleY = mapH  / DATA_H;
    const s      = Math.min(scaleX, scaleY);
    const offX   = this._mapX + (mapW  - DATA_W * s) * 0.5;
    const offY   = this._mapY + (mapH  - DATA_H * s) * 0.5;

    this._roomRects = this._portData.rooms.map(r => ({
      room: r,
      sx: offX + r.x * s,
      sy: offY + r.y * s,
      sw: r.w * s,
      sh: r.h * s,
      cx: offX + r.cx * s,
      cy: offY + r.cy * s,
    }));

    // ── draw corridor connectors ──────────────────────────────────────────
    const connG = this.add.graphics();
    connG.lineStyle(Math.max(6, 14 * s), C.corridor, 1);
    for (const wRect of this._portData.walkable) {
      const wx = offX + wRect.x * s;
      const wy = offY + wRect.y * s;
      const ww = wRect.w * s;
      const wh = wRect.h * s;
      connG.fillStyle(C.corridor, 1);
      connG.fillRect(wx, wy, ww, wh);
    }

    // ── draw room boxes ───────────────────────────────────────────────────
    this._roomGfx = [];
    this._roomBtns = [];

    for (const rr of this._roomRects) {
      const style = ROOM_STYLE[rr.room.type] || ROOM_STYLE.dock;

      // Room background (interactive zone)
      const bg = this.add.graphics();
      this._drawRoomBox(bg, rr, style, false);

      // Hit area
      const hit = this.add.zone(rr.sx, rr.sy, rr.sw, rr.sh)
        .setOrigin(0).setInteractive({ useHandCursor: true });

      // Icon (large, centred)
      const iconTxt = this.add.text(rr.cx, rr.cy - rr.sh * 0.08, style.icon, {
        fontSize: Math.round(Math.min(rr.sw, rr.sh) * 0.38) + 'px',
        fontFamily: 'Arial',
        color: '#' + style.accent.toString(16).padStart(6, '0'),
        alpha: 0.9,
      }).setOrigin(0.5, 0.5);

      // Room label
      const labelTxt = this.add.text(rr.cx, rr.sy + rr.sh - Math.round(14 * s), style.label, {
        fontSize: Math.round(Math.max(9, 11 * s)) + 'px',
        fontFamily: 'Arial',
        fontStyle: 'bold',
        color: '#' + style.accent.toString(16).padStart(6, '0'),
        alpha: 0.85,
      }).setOrigin(0.5, 1);

      // Room sub-name
      const subTxt = this.add.text(rr.cx, rr.sy + Math.round(8 * s), rr.room.name, {
        fontSize: Math.round(Math.max(8, 9 * s)) + 'px',
        fontFamily: 'Arial',
        color: C.textDim,
      }).setOrigin(0.5, 0);

      // Hover / click handlers
      hit.on('pointerover', () => {
        this._drawRoomBox(bg, rr, style, true);
        labelTxt.setAlpha(1);
      });
      hit.on('pointerout', () => {
        this._drawRoomBox(bg, rr, style, false);
        labelTxt.setAlpha(0.85);
      });
      hit.on('pointerdown', () => {
        if (!this._panelOpen) this._openRoom(rr.room);
      });

      this._roomGfx.push({ bg, rr, style, iconTxt, labelTxt, subTxt });
      this._roomBtns.push(hit);
    }

    // ── station name banner ───────────────────────────────────────────────
    const bannerG = this.add.graphics();
    bannerG.fillStyle(0x030C18, 0.95);
    bannerG.fillRect(0, 0, width, HUD_H);
    bannerG.lineStyle(1, C.border, 0.5);
    bannerG.lineBetween(0, HUD_H, width, HUD_H);

    this.add.text(width * 0.5, HUD_H * 0.5,
      `${this._moonName.toUpperCase()} STATION`, {
        fontSize: '16px', fontFamily: 'Arial', fontStyle: 'bold',
        color: C.gold,
      }).setOrigin(0.5);

    // ── status bar (bottom) ───────────────────────────────────────────────
    const statY = height - STATUS_H;
    const statG = this.add.graphics();
    statG.fillStyle(0x030C18, 0.95);
    statG.fillRect(0, statY, width, STATUS_H);
    statG.lineStyle(1, C.border, 0.4);
    statG.lineBetween(0, statY, width, statY);

    this._statusTxt = this.add.text(12, statY + STATUS_H * 0.5,
      '', { fontSize: '13px', fontFamily: 'Arial', color: C.text }).setOrigin(0, 0.5);
    this._updateStatus('Select a room to enter.');

    // ── panel state ───────────────────────────────────────────────────────
    this._panel     = null;
    this._panelOpen = false;

    // BrawlScene resume event
    this.events.on('resume', this._onBrawlReturn, this);

    this.cameras.main.fadeIn(280, 0, 5, 20);
  }

  // ------------------------------------------------------------------ helpers

  _drawRoomBox(g, rr, style, hovered) {
    g.clear();
    g.fillStyle(hovered ? C.roomHover : C.roomBg, 1);
    g.fillRect(rr.sx, rr.sy, rr.sw, rr.sh);
    g.lineStyle(hovered ? 2 : 1.5, hovered ? style.accent : C.borderDim, 1);
    g.strokeRect(rr.sx, rr.sy, rr.sw, rr.sh);
    // corner ticks
    const t = Math.min(8, rr.sw * 0.12);
    g.lineStyle(hovered ? 2 : 1, style.accent, hovered ? 0.9 : 0.35);
    const x1 = rr.sx, y1 = rr.sy, x2 = rr.sx + rr.sw, y2 = rr.sy + rr.sh;
    g.lineBetween(x1, y1, x1 + t, y1); g.lineBetween(x1, y1, x1, y1 + t);
    g.lineBetween(x2, y1, x2 - t, y1); g.lineBetween(x2, y1, x2, y1 + t);
    g.lineBetween(x1, y2, x1 + t, y2); g.lineBetween(x1, y2, x1, y2 - t);
    g.lineBetween(x2, y2, x2 - t, y2); g.lineBetween(x2, y2, x2, y2 - t);
  }

  _updateStatus(msg) {
    const inv = getInventory();
    this._statusTxt.setText(
      `HP ${inv.miloHp}/${inv.miloMaxHp}   Credits ${inv.credits}   |   ${msg}`,
    );
  }

  // ------------------------------------------------------------------ room panels

  _openRoom(room) {
    if (this._panelOpen) return;
    this._panelOpen = true;
    this._updateStatus(`Entering: ${room.name}`);

    switch (room.type) {
      case 'dock':    this._openDock();    break;
      case 'bar':     this._openBar();     break;
      case 'shop':    this._openShop();    break;
      case 'gym':     this._openGym();     break;
      case 'library': this._openLibrary(); break;
    }
  }

  _closePanel() {
    if (this._panel) { this._panel.destroy(); this._panel = null; }
    this._panelOpen = false;
    this._updateStatus('Select a room to enter.');
  }

  // ─── panel builder ────────────────────────────────────────────────────────

  _makePanel(titleText, titleColor) {
    const { width, height } = this.scale;
    const pw = Math.min(width  - 24, 430);
    const ph = Math.min(height - 80, 360);
    const px = (width  - pw) * 0.5;
    const py = (height - ph) * 0.5;

    const con = this.add.container(0, 0).setDepth(50);
    this._panel = con;

    // Backdrop
    const mask = this.add.rectangle(0, 0, width, height, 0x000000, 0.6)
      .setOrigin(0).setInteractive();
    con.add(mask);

    // Panel box
    const bg = this.add.graphics();
    bg.fillStyle(0x050D1A, 0.98);
    bg.fillRoundedRect(px, py, pw, ph, 14);
    bg.lineStyle(2, 0x1E3E7E, 1);
    bg.strokeRoundedRect(px, py, pw, ph, 14);
    // Accent bar at top
    bg.fillStyle(0x0A1E36, 1);
    bg.fillRoundedRect(px, py, pw, 46, { tl: 14, tr: 14, bl: 0, br: 0 });
    con.add(bg);

    // Title
    con.add(this.add.text(px + 16, py + 14, titleText, {
      fontSize: '17px', fontFamily: 'Arial', fontStyle: 'bold',
      color: titleColor || C.gold,
    }));

    // Sep line
    const sep = this.add.graphics();
    sep.lineStyle(1, 0x1E3E7E, 0.6);
    sep.lineBetween(px + 12, py + 46, px + pw - 12, py + 46);
    con.add(sep);

    // Close button
    const closeBtn = this.add.text(px + pw - 12, py + 12, '✕', {
      fontSize: '18px', fontFamily: 'Arial', color: '#446688',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this._closePanel());
    con.add(closeBtn);

    return { con, px, py, pw, ph, contentY: py + 54 };
  }

  _addBtn(con, x, y, w, label, color, callback) {
    const h  = 32;
    const bg = this.add.rectangle(x + w * 0.5, y + h * 0.5, w, h, 0x091624, 1)
      .setInteractive({ useHandCursor: true });
    const txt = this.add.text(x + 10, y + h * 0.5, label, {
      fontSize: '13px', fontFamily: 'Arial', color: color || '#88BBFF',
      fixedWidth: w - 20,
    }).setOrigin(0, 0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x112244));
    bg.on('pointerout',  () => bg.setFillStyle(0x091624));
    bg.on('pointerdown', callback);
    con.add(bg); con.add(txt);
    return h + 6;
  }

  // ─── DOCK ────────────────────────────────────────────────────────────────

  _openDock() {
    const { con, px, py, pw, contentY } = this._makePanel('⊕  Space Dock', '#88BBFF');
    const inv = getInventory();

    con.add(this.add.text(px + 16, contentY,
      'Your ship is docked and fuelled for departure.', {
        fontSize: '14px', fontFamily: 'Arial', color: C.text,
        wordWrap: { width: pw - 32 },
      }));
    con.add(this.add.text(px + 16, contentY + 30,
      `Credits: ${inv.credits}   HP: ${inv.miloHp}/${inv.miloMaxHp}`, {
        fontSize: '13px', fontFamily: 'Arial', color: C.gold,
      }));

    this._addBtn(con, px + 16, contentY + 68, pw - 32,
      '▸  Undock — return to space', C.orange, () => this._exitPort());
    this._addBtn(con, px + 16, contentY + 108, pw - 32,
      '▸  Stay in port', '#446688', () => this._closePanel());
  }

  // ─── BAR ─────────────────────────────────────────────────────────────────

  _openBar() {
    const { con, px, py, pw, contentY } = this._makePanel('⊗  The Bar', C.orange);

    const lines = [
      '"Hey spacer — what\'ll it be?"',
      '"Word is there\'s a plasma rifle floating around Triton."',
      '"Lost three ships to pirates near Saturn last cycle."',
      '"You look like trouble. Just the way I like it."',
      '"Sit down before someone takes offence to your face."',
    ];
    const quote = lines[Math.floor(Math.random() * lines.length)];

    con.add(this.add.text(px + 16, contentY, quote, {
      fontSize: '14px', fontFamily: 'Arial', fontStyle: 'italic',
      color: '#FFCC88', wordWrap: { width: pw - 32 },
    }));

    let y = contentY + 62;
    this._addBtn(con, px + 16, y, pw - 32,
      '▸  Start a brawl  (turn-based combat)', C.red, () => {
        this._closePanel(); this._startBrawl();
      });
    y += 38;
    this._addBtn(con, px + 16, y, pw - 32,
      '▸  Drink quietly and leave', '#88BBFF', () => this._closePanel());
  }

  // ─── GYM ─────────────────────────────────────────────────────────────────

  _openGym() {
    const { con, px, py, pw, contentY } = this._makePanel('⊡  Training Bay', '#AA44FF');
    const inv = getInventory();

    con.add(this.add.text(px + 16, contentY,
      'Hard training builds endurance and maximum health.', {
        fontSize: '14px', fontFamily: 'Arial', color: C.text,
        wordWrap: { width: pw - 32 },
      }));

    const statusTxt = this.add.text(px + 16, contentY + 34,
      `HP: ${inv.miloHp} / ${inv.miloMaxHp}`, {
        fontSize: '14px', fontFamily: 'Arial', color: C.green,
      });
    con.add(statusTxt);

    const refresh = () => statusTxt.setText(`HP: ${inv.miloHp} / ${inv.miloMaxHp}`);

    let y = contentY + 72;
    this._addBtn(con, px + 16, y, pw - 32,
      '▸  Train hard  (+10 max HP)  — 25 credits', C.green, () => {
        if (inv.credits < 25) { statusTxt.setText('Not enough credits!').setColor(C.red); return; }
        inv.credits -= 25; trainMilo(); refresh();
        this._updateStatus(`Trained! HP ${inv.miloHp}/${inv.miloMaxHp}`);
      });
    y += 38;
    this._addBtn(con, px + 16, y, pw - 32,
      '▸  Rest and heal  (+20 HP)  — 15 credits', '#88BBFF', () => {
        if (inv.credits < 15) { statusTxt.setText('Not enough credits!').setColor(C.red); return; }
        inv.credits -= 15; healMilo(20); refresh();
        this._updateStatus(`Healed. HP ${inv.miloHp}/${inv.miloMaxHp}`);
      });
    y += 38;
    this._addBtn(con, px + 16, y, pw - 32, '▸  Leave', '#446688', () => this._closePanel());
  }

  // ─── LIBRARY ─────────────────────────────────────────────────────────────

  _openLibrary() {
    const { con, px, py, pw, contentY } = this._makePanel('⊟  Archive', '#4488FF');
    const inv = getInventory();
    const unread = LIBRARY_BOOKS.filter(b => !inv.booksRead.includes(b.id));

    let bookIdx = 0;

    const titleTxt = this.add.text(px + 16, contentY, '', {
      fontSize: '15px', fontFamily: 'Arial', fontStyle: 'bold',
      color: C.gold, wordWrap: { width: pw - 32 },
    });
    con.add(titleTxt);

    const bodyTxt = this.add.text(px + 16, contentY + 28, '', {
      fontSize: '13px', fontFamily: 'Arial',
      color: C.text, wordWrap: { width: pw - 32 }, lineSpacing: 4,
    });
    con.add(bodyTxt);

    const hintTxt = this.add.text(px + 16, contentY + 120, '', {
      fontSize: '13px', fontFamily: 'Arial', color: C.green,
    });
    con.add(hintTxt);

    const showBook = () => {
      if (unread.length === 0) {
        titleTxt.setText('Archive empty.');
        bodyTxt.setText('You have read everything here.');
        return;
      }
      const book = unread[bookIdx % unread.length];
      titleTxt.setText(book.title);
      bodyTxt.setText(book.text);
      hintTxt.setText(book.revealWeapon ? '[ contains a weapon hint ]' : '');
    };
    showBook();

    let y = contentY + 160;
    if (unread.length > 0) {
      this._addBtn(con, px + 16, y, pw - 32, '▸  Read this book', C.green, () => {
        const book = unread[bookIdx % unread.length];
        if (!inv.booksRead.includes(book.id)) inv.booksRead.push(book.id);
        if (book.revealWeapon) {
          const wDef = WEAPONS.find(w => w.id === book.revealWeapon);
          if (wDef) hintTxt.setText(`Discovered: "${wDef.name}"!`).setColor('#FFFFAA');
        }
        bookIdx++;
        showBook();
      });
      y += 38;
    }
    this._addBtn(con, px + 16, y, pw - 32, '▸  Leave', '#446688', () => this._closePanel());
  }

  // ─── SHOP ────────────────────────────────────────────────────────────────
  // Layout: prominent credits banner at top, then tab row, then content.
  // Weapons are shown as icon-grid slots (like classic CRPG inventory screens).

  _openShop() {
    const { con, px, py, pw, ph, contentY } = this._makePanel('⊞  Shop', C.green);
    const inv = getInventory();

    // ── Credits banner (large, centred — prominent like a Gold Box screen) ──
    const credBg = this.add.graphics();
    credBg.fillStyle(0x030C18, 1);
    credBg.fillRoundedRect(px + 16, contentY, pw - 32, 34, 6);
    con.add(credBg);
    const credTxt = this.add.text(px + pw * 0.5, contentY + 17, '', {
      fontSize: '18px', fontFamily: 'Arial', fontStyle: 'bold', color: C.gold,
    }).setOrigin(0.5);
    con.add(credTxt);
    const refreshCreds = () => credTxt.setText(`◆  ${inv.credits.toLocaleString()}  CREDITS`);
    refreshCreds();

    // ── Tab strip ────────────────────────────────────────────────────────────
    const tabY  = contentY + 42;
    let activeTab = 'weapons';
    const tabs  = [
      { id: 'weapons',  label: 'WEAPONS'  },
      { id: 'upgrades', label: 'UPGRADES' },
      { id: 'spoils',   label: 'SPOILS'   },
    ];
    const tabW  = Math.round((pw - 32) / 3) - 3;
    const tabBgs = [];
    for (let i = 0; i < tabs.length; i++) {
      const tx  = px + 16 + i * (tabW + 4);
      const tbg = this.add.rectangle(tx + tabW * 0.5, tabY + 13, tabW, 24, 0x091624, 1)
        .setInteractive({ useHandCursor: true });
      const ttx = this.add.text(tx + tabW * 0.5, tabY + 3, tabs[i].label, {
        fontSize: '11px', fontFamily: 'Arial', fontStyle: 'bold', color: '#88BBFF',
      }).setOrigin(0.5, 0);
      const idx = i;
      tbg.on('pointerdown', () => { activeTab = tabs[idx].id; refreshTabs(); buildTab(); });
      con.add(tbg); con.add(ttx);
      tabBgs.push({ tbg, id: tabs[i].id });
    }
    const refreshTabs = () => {
      for (const t of tabBgs) t.tbg.setFillStyle(t.id === activeTab ? 0x1E3E7E : 0x091624);
    };

    // ── Detail panel (right of weapon grid) ──────────────────────────────────
    const listY  = tabY + 30;
    const listH  = ph - (listY - py) - 44;
    // Split: left ~58% for grid/list, right ~38% for detail
    const leftW  = Math.round((pw - 32) * 0.58);
    const rightX = px + 16 + leftW + 8;
    const rightW = pw - 32 - leftW - 8;

    let tabCon  = null;
    let detailTxt = null;   // reused detail panel text

    // Right-side detail box (persistent)
    const detBg = this.add.graphics();
    detBg.fillStyle(0x030C18, 1);
    detBg.fillRoundedRect(rightX, listY, rightW, listH, 6);
    detBg.lineStyle(1, 0x0E2040, 1);
    detBg.strokeRoundedRect(rightX, listY, rightW, listH, 6);
    con.add(detBg);
    detailTxt = this.add.text(rightX + 8, listY + 8, 'Select an item\nto see details.', {
      fontSize: '11px', fontFamily: 'Arial', color: '#334455',
      wordWrap: { width: rightW - 16 }, lineSpacing: 4,
    });
    con.add(detailTxt);

    const showDetail = (lines) => detailTxt.setText(lines.join('\n'));

    const buildTab = () => {
      if (tabCon) tabCon.destroy();
      tabCon = this.add.container(0, 0);
      con.add(tabCon);
      refreshCreds();

      // ── WEAPONS tab: icon grid ─────────────────────────────────────────────
      if (activeTab === 'weapons') {
        const forSale = WEAPONS.filter(w => w.buyPrice > 0);
        const slotSz  = Math.round(Math.min((leftW - 4) / 4, listH / 2) - 4);
        const cols    = Math.max(1, Math.floor((leftW) / (slotSz + 4)));

        forSale.forEach((w, i) => {
          const col   = i % cols;
          const row   = Math.floor(i / cols);
          const sx    = px + 16 + col * (slotSz + 4);
          const sy    = listY + row * (slotSz + 4);
          const owned = hasWeapon(w.id);
          const can   = !owned && inv.credits >= w.buyPrice;

          const fillCol = owned ? 0x1A3A1A : can ? 0x0A1E36 : 0x0A0A14;
          const bdrCol  = owned ? 0x446644 : can ? 0x1E3E7E : 0x111122;

          const sg = this.add.graphics();
          sg.fillStyle(fillCol, 1);
          sg.fillRect(sx, sy, slotSz, slotSz);
          sg.lineStyle(1.5, bdrCol, 1);
          sg.strokeRect(sx, sy, slotSz, slotSz);
          tabCon.add(sg);

          // Weapon type indicator bar (top)
          const barCol = w.type === 'ranged' ? 0x224488 : 0x1A2E0A;
          sg.fillStyle(barCol, 1);
          sg.fillRect(sx + 2, sy + 2, slotSz - 4, 3);

          // Damage number (big, centred)
          const dmgT = this.add.text(sx + slotSz * 0.5, sy + slotSz * 0.38,
            `${w.damage}`, {
              fontSize: Math.round(slotSz * 0.36) + 'px',
              fontFamily: 'Arial', fontStyle: 'bold',
              color: owned ? '#446644' : can ? '#AADDFF' : '#223344',
            }).setOrigin(0.5);
          tabCon.add(dmgT);

          // Short name (bottom)
          const nameT = this.add.text(sx + slotSz * 0.5, sy + slotSz - 12,
            w.name.split(' ')[0].substring(0, 6), {
              fontSize: Math.round(slotSz * 0.17) + 'px',
              fontFamily: 'Arial',
              color: owned ? '#446644' : '#334455',
            }).setOrigin(0.5, 1);
          tabCon.add(nameT);

          // Owned checkmark
          if (owned) {
            tabCon.add(this.add.text(sx + slotSz - 4, sy + 4, '✓', {
              fontSize: '10px', fontFamily: 'Arial', color: '#44BB44',
            }).setOrigin(1, 0));
          }

          if (!owned) {
            const zone = this.add.zone(sx, sy, slotSz, slotSz).setOrigin(0)
              .setInteractive({ useHandCursor: can });
            tabCon.add(zone);
            zone.on('pointerover', () => {
              sg.clear();
              sg.fillStyle(can ? 0x112244 : 0x0A0A14, 1);
              sg.fillRect(sx, sy, slotSz, slotSz);
              sg.lineStyle(1.5, can ? 0x4488FF : bdrCol, 1);
              sg.strokeRect(sx, sy, slotSz, slotSz);
              sg.fillStyle(barCol, 1);
              sg.fillRect(sx + 2, sy + 2, slotSz - 4, 3);
              showDetail([
                w.name,
                `Damage: ${w.damage}`,
                `Type: ${w.type}`,
                w.uses ? `Uses: ${w.uses}` : 'Uses: unlimited',
                '',
                w.desc,
                '',
                can ? `Price: ${w.buyPrice}c` : `Need ${w.buyPrice - inv.credits}c more`,
              ]);
            });
            zone.on('pointerout', () => {
              sg.clear();
              sg.fillStyle(fillCol, 1); sg.fillRect(sx, sy, slotSz, slotSz);
              sg.lineStyle(1.5, bdrCol, 1); sg.strokeRect(sx, sy, slotSz, slotSz);
              sg.fillStyle(barCol, 1); sg.fillRect(sx + 2, sy + 2, slotSz - 4, 3);
              showDetail(['Select an item\nto see details.']);
            });
            if (can) {
              zone.on('pointerdown', () => {
                inv.credits -= w.buyPrice; addWeapon(w); buildTab();
              });
            }
          }
        });
      }

      // ── UPGRADES tab: compact list ─────────────────────────────────────────
      if (activeTab === 'upgrades') {
        let oy = 0;
        const colW = leftW;
        for (const u of SHIP_UPGRADES) {
          const cur    = inv.shipUpgrades[u.type] || 0;
          const owned  = cur >= u.level;
          const canBuy = !owned && cur === u.level - 1 && inv.credits >= u.buyPrice;
          const locked = !owned && cur < u.level - 1;
          const col    = owned ? '#446644' : canBuy ? '#88BBFF' : '#334455';

          const row = this.add.graphics();
          row.fillStyle(owned ? 0x0A1A0A : canBuy ? 0x0A1624 : 0x080810, 1);
          row.fillRect(px + 16, listY + oy, colW, 26);
          if (canBuy) {
            row.lineStyle(1, 0x1E3E7E, 0.6);
            row.strokeRect(px + 16, listY + oy, colW, 26);
          }
          tabCon.add(row);

          const statusStr = owned ? '✓' : canBuy ? `${u.buyPrice}c` : locked ? '🔒' : '';
          tabCon.add(this.add.text(px + 20, listY + oy + 5,
            `${u.name}  —  ${u.desc}`, {
              fontSize: '11px', fontFamily: 'Arial', color: col, fixedWidth: colW - 50,
            }));
          tabCon.add(this.add.text(px + 16 + colW - 4, listY + oy + 5,
            statusStr, { fontSize: '11px', fontFamily: 'Arial', color: col }).setOrigin(1, 0));

          if (canBuy) {
            const zone = this.add.zone(px + 16, listY + oy, colW, 26).setOrigin(0)
              .setInteractive({ useHandCursor: true });
            tabCon.add(zone);
            zone.on('pointerover', () => {
              row.clear();
              row.fillStyle(0x112244, 1); row.fillRect(px + 16, listY + oy, colW, 26);
              showDetail([u.name, '', u.desc, '', `Price: ${u.buyPrice}c`]);
            });
            zone.on('pointerout', () => {
              row.clear();
              row.fillStyle(0x0A1624, 1); row.fillRect(px + 16, listY + oy, colW, 26);
              row.lineStyle(1, 0x1E3E7E, 0.6); row.strokeRect(px + 16, listY + oy, colW, 26);
              showDetail(['Select an item\nto see details.']);
            });
            zone.on('pointerdown', () => {
              inv.credits -= u.buyPrice; inv.shipUpgrades[u.type] = u.level; buildTab();
            });
          }
          oy += 30;
        }
      }

      // ── SPOILS tab: list with coloured gem icons ───────────────────────────
      if (activeTab === 'spoils') {
        // Spoil gem colours
        const gemCol = {
          scrap: 0x667788, chip: 0x4488AA, parts: 0x448844,
          crystal: 0x8844AA, relic: 0xCC8800,
        };

        if (inv.spoils.length === 0) {
          tabCon.add(this.add.text(px + 16, listY + 16,
            'No spoils in your pack.', {
              fontSize: '13px', fontFamily: 'Arial', color: '#334455',
            }));
        } else {
          // Total value
          const total = inv.spoils.reduce((s, sp) => s + sp.sellPrice * sp.qty, 0);
          tabCon.add(this.add.text(px + 16, listY + 2,
            `Total value: ${total.toLocaleString()} credits`, {
              fontSize: '11px', fontFamily: 'Arial', color: '#556677',
            }));

          // Sell-All button
          const saBtn = this.add.rectangle(px + leftW - 2, listY + 10, 74, 20, 0x1A3A0A, 1)
            .setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
          const saTxt = this.add.text(px + leftW - 39, listY + 10, 'SELL ALL', {
            fontSize: '10px', fontFamily: 'Arial', fontStyle: 'bold', color: C.green,
          }).setOrigin(0.5);
          saBtn.on('pointerover', () => saBtn.setFillStyle(0x2A5A1A));
          saBtn.on('pointerout',  () => saBtn.setFillStyle(0x1A3A0A));
          saBtn.on('pointerdown', () => {
            for (const sp of [...inv.spoils]) sellSpoil(sp.id, sp.qty);
            buildTab();
          });
          tabCon.add(saBtn); tabCon.add(saTxt);

          let oy = 22;
          for (const sp of inv.spoils) {
            const col = gemCol[sp.id] || 0x668866;

            // Gem icon (small diamond)
            const gi = this.add.graphics();
            const gx = px + 22, gy = listY + oy + 14;
            gi.fillStyle(col, 1);
            gi.fillTriangle(gx, gy - 8, gx - 7, gy, gx + 7, gy);
            gi.fillTriangle(gx, gy + 4, gx - 7, gy, gx + 7, gy);
            tabCon.add(gi);

            // Name + qty
            tabCon.add(this.add.text(px + 34, listY + oy + 3,
              `${sp.name}  ×${sp.qty}`, {
                fontSize: '12px', fontFamily: 'Arial', color: '#AABBCC',
              }));
            // Value
            tabCon.add(this.add.text(px + 34, listY + oy + 17,
              `${sp.sellPrice}c each`, {
                fontSize: '11px', fontFamily: 'Arial', color: '#556677',
              }));

            // Sell-one button
            const sb = this.add.rectangle(px + leftW - 2, listY + oy + 14,
              54, 20, 0x0A2A0A, 1).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
            const st = this.add.text(px + leftW - 28, listY + oy + 14,
              `SELL`, { fontSize: '10px', fontFamily: 'Arial', color: '#44AA44' }).setOrigin(0.5);
            sb.on('pointerover', () => sb.setFillStyle(0x1A4A1A));
            sb.on('pointerout',  () => sb.setFillStyle(0x0A2A0A));
            const spId = sp.id;
            sb.on('pointerdown', () => { sellSpoil(spId); buildTab(); });
            tabCon.add(sb); tabCon.add(st);

            oy += 34;
          }
        }
      }
    };

    refreshTabs();
    buildTab();

    const closeY = py + ph - 38;
    this._addBtn(con, px + 16, closeY, pw - 32, '▸  Leave shop', '#446668',
      () => this._closePanel());
  }

  // ------------------------------------------------------------------ brawl

  _startBrawl() {
    this.scene.sleep('PortScene');
    this.scene.launch('BrawlScene', { moonId: this._moonId });
  }

  _onBrawlReturn(sys, data) {
    if (data) {
      const inv = getInventory();
      inv.credits += data.creditsEarned || 0;
      for (const s of (data.spoils || [])) addSpoil(s);
    }
    this._panelOpen = false;
    this._updateStatus('Select a room to enter.');
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
