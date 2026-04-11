// InventorySystem — module-level singleton persisting across all scenes.
// Import getInventory() anywhere; mutate the returned object directly.

import { WEAPONS } from '../data/items.js';

const _inv = {
  credits:      100,
  miloHp:       100,
  miloMaxHp:    100,
  weapons:      [{ ...WEAPONS[0] }],   // start with Fists (infinite uses)
  spoils:       [],                    // [{ ...spoilDef, qty }]
  shipUpgrades: { engine: 0, weapons: 0, shields: 0 },
  equippedWeapon: 'fists',
  booksRead:    [],                    // ids of read books
};

export function getInventory() { return _inv; }

// ── Weapon helpers ────────────────────────────────────────────────────────────

export function hasWeapon(id) {
  return _inv.weapons.some(w => w.id === id);
}

export function addWeapon(weaponDef) {
  if (!hasWeapon(weaponDef.id)) _inv.weapons.push({ ...weaponDef });
}

export function getEquippedWeapon() {
  return _inv.weapons.find(w => w.id === _inv.equippedWeapon) || _inv.weapons[0];
}

// Consume one use of the equipped weapon; returns false if it broke.
export function useEquippedWeapon() {
  const w = getEquippedWeapon();
  if (w.uses === null) return true;       // infinite uses
  w.uses -= 1;
  if (w.uses <= 0) {
    _inv.weapons = _inv.weapons.filter(x => x.id !== w.id);
    _inv.equippedWeapon = 'fists';
    return false;                         // weapon broke
  }
  return true;
}

// ── Spoils helpers ────────────────────────────────────────────────────────────

export function addSpoil(spoilDef, qty = 1) {
  const existing = _inv.spoils.find(s => s.id === spoilDef.id);
  if (existing) existing.qty += qty;
  else _inv.spoils.push({ ...spoilDef, qty });
}

export function sellSpoil(id, qty = 1) {
  const s = _inv.spoils.find(x => x.id === id);
  if (!s || s.qty <= 0) return 0;
  const n      = Math.min(qty, s.qty);
  const earned = s.sellPrice * n;
  s.qty -= n;
  if (s.qty === 0) _inv.spoils = _inv.spoils.filter(x => x.id !== id);
  _inv.credits += earned;
  return earned;
}

// ── HP helpers ────────────────────────────────────────────────────────────────

export function healMilo(amount) {
  _inv.miloHp = Math.min(_inv.miloMaxHp, _inv.miloHp + amount);
}

export function damageMilo(amount) {
  _inv.miloHp = Math.max(0, _inv.miloHp - amount);
}

export function trainMilo() {
  _inv.miloMaxHp = Math.min(200, _inv.miloMaxHp + 10);
  healMilo(10);
}
