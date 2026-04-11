// Port layouts for moon stations.
// World size: 750 × 460 px.
// walkable: array of {x,y,w,h} — Milo can walk inside these rects.
// rooms: array of {type, name, label, cx, cy, color, w, h}
//   type: 'dock' | 'bar' | 'shop' | 'gym' | 'library'
//   cx/cy: centre of the room (trigger point for interaction)

// ─────────────────────────────────────────────────────────────────────────────
// Layout 0 — compact T-shape: dock · bar · shop  (3 rooms)
// Used by: Moon (Luna), Callisto
// ─────────────────────────────────────────────────────────────────────────────
const LAYOUT_0 = {
  walkable: [
    // horizontal corridor
    { x:  60, y: 180, w: 630, h: 100 },
    // dock stub top-left
    { x:  60, y:  60, w: 150, h: 145 },
    // shop stub top-right
    { x: 540, y:  60, w: 150, h: 145 },
  ],
  rooms: [
    {
      type: 'dock',    name: 'Space Dock',  label: 'DOCK',
      x: 60, y: 60, w: 150, h: 120,
      cx: 135, cy: 120, color: 0x1A3A5C,
    },
    {
      type: 'bar',     name: 'The Crater Bar', label: 'BAR',
      x: 290, y: 195, w: 170, h: 70,
      cx: 375, cy: 230, color: 0x3A1A0A,
    },
    {
      type: 'shop',    name: 'Lunar Shop',  label: 'SHOP',
      x: 540, y: 60, w: 150, h: 120,
      cx: 615, cy: 120, color: 0x0A2A1A,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Layout 1 — cross-shape: dock · bar · shop · gym  (4 rooms)
// Used by: Ganymede, Titan
// ─────────────────────────────────────────────────────────────────────────────
const LAYOUT_1 = {
  walkable: [
    // main horizontal corridor
    { x:  40, y: 180, w: 670, h: 100 },
    // vertical corridor
    { x: 325, y:  40, w: 100, h: 380 },
  ],
  rooms: [
    {
      type: 'dock',    name: 'Space Dock',  label: 'DOCK',
      x: 40, y: 185, w: 120, h: 90,
      cx: 100, cy: 230, color: 0x1A3A5C,
    },
    {
      type: 'bar',     name: 'Ganymede Bar', label: 'BAR',
      x: 200, y: 185, w: 115, h: 90,
      cx: 257, cy: 230, color: 0x3A1A0A,
    },
    {
      type: 'shop',    name: 'Orbital Shop', label: 'SHOP',
      x: 435, y: 185, w: 115, h: 90,
      cx: 493, cy: 230, color: 0x0A2A1A,
    },
    {
      type: 'gym',     name: 'Training Bay', label: 'GYM',
      x: 330, y: 310, w: 90, h: 110,
      cx: 375, cy: 365, color: 0x2A0A2A,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Layout 2 — L-shape + branches: dock · bar · shop · gym · library  (5 rooms)
// Used by: Europa, Triton
// ─────────────────────────────────────────────────────────────────────────────
const LAYOUT_2 = {
  walkable: [
    // long horizontal spine
    { x:  30, y: 200, w: 690, h:  90 },
    // left vertical branch (dock top-left)
    { x:  30, y:  60, w: 100, h: 165 },
    // right vertical branch (library top-right)
    { x: 620, y:  60, w: 100, h: 165 },
    // gym stub bottom-centre
    { x: 325, y: 265, w: 100, h: 135 },
  ],
  rooms: [
    {
      type: 'dock',    name: 'Space Dock',   label: 'DOCK',
      x: 30, y: 60, w: 100, h: 120,
      cx:  80, cy: 120, color: 0x1A3A5C,
    },
    {
      type: 'bar',     name: 'Deep-Sea Bar', label: 'BAR',
      x: 155, y: 205, w: 140, h: 80,
      cx: 225, cy: 245, color: 0x3A1A0A,
    },
    {
      type: 'shop',    name: 'Ice Shelf Shop', label: 'SHOP',
      x: 420, y: 205, w: 140, h: 80,
      cx: 490, cy: 245, color: 0x0A2A1A,
    },
    {
      type: 'gym',     name: 'Zero-G Gym',  label: 'GYM',
      x: 330, y: 270, w:  90, h: 120,
      cx: 375, cy: 330, color: 0x2A0A2A,
    },
    {
      type: 'library', name: 'Archive',     label: 'LIB',
      x: 620, y: 60, w: 100, h: 120,
      cx: 670, cy: 120, color: 0x1A1A3A,
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Moon → layout mapping
// ─────────────────────────────────────────────────────────────────────────────
export const PORT_LAYOUTS = {
  moon:     LAYOUT_0,
  callisto: LAYOUT_0,
  ganymede: LAYOUT_1,
  titan:    LAYOUT_1,
  europa:   LAYOUT_2,
  triton:   LAYOUT_2,
};

export function getPortForMoon(moonId) {
  return PORT_LAYOUTS[moonId] || LAYOUT_0;
}
