// Game items — weapons, ship upgrades, spoils, brawl enemies, library books

export const WEAPONS = [
  { id: 'fists',   name: 'Fists',         damage: 15, uses: null, type: 'melee',  buyPrice: 0,   sellPrice: 0,   desc: 'Your trusty two fists.' },
  { id: 'bottle',  name: 'Glass Bottle',  damage: 22, uses: 3,    type: 'melee',  buyPrice: 35,  sellPrice: 8,   desc: 'Breaks after a few hits.' },
  { id: 'wrench',  name: 'Wrench',        damage: 28, uses: null, type: 'melee',  buyPrice: 65,  sellPrice: 22,  desc: 'Heavy tool. Never runs out.' },
  { id: 'knife',   name: 'Combat Knife',  damage: 36, uses: null, type: 'melee',  buyPrice: 95,  sellPrice: 38,  desc: 'Sharp and reliable.' },
  { id: 'stunner', name: 'Stun Pistol',   damage: 32, uses: 8,    type: 'ranged', buyPrice: 140, sellPrice: 55,  desc: 'Stuns an enemy for one turn.' },
  { id: 'blaster', name: 'Blaster',       damage: 50, uses: 12,   type: 'ranged', buyPrice: 230, sellPrice: 90,  desc: 'Reliable sidearm.' },
  { id: 'plasma',  name: 'Plasma Rifle',  damage: 68, uses: 6,    type: 'ranged', buyPrice: 390, sellPrice: 155, desc: 'Powerful but limited charges.' },
];

export const SHIP_UPGRADES = [
  { id: 'engine1',  name: 'Engine Boost I',      type: 'engine',  level: 1, buyPrice: 180, desc: 'Ship max speed +20%.' },
  { id: 'engine2',  name: 'Engine Boost II',     type: 'engine',  level: 2, buyPrice: 420, desc: 'Ship max speed +40%.' },
  { id: 'weapons1', name: 'Weapon Array I',      type: 'weapons', level: 1, buyPrice: 250, desc: 'Battle damage +25%.' },
  { id: 'weapons2', name: 'Weapon Array II',     type: 'weapons', level: 2, buyPrice: 560, desc: 'Battle damage +50%.' },
  { id: 'shields1', name: 'Shield Generator I',  type: 'shields', level: 1, buyPrice: 310, desc: 'Take 20% less damage in battles.' },
  { id: 'shields2', name: 'Shield Generator II', type: 'shields', level: 2, buyPrice: 680, desc: 'Take 40% less damage in battles.' },
];

export const SPOILS = [
  { id: 'scrap',   name: 'Metal Scrap',    sellPrice: 12 },
  { id: 'chip',    name: 'Data Chip',      sellPrice: 28 },
  { id: 'parts',   name: 'Ship Parts',     sellPrice: 45 },
  { id: 'crystal', name: 'Space Crystal',  sellPrice: 72 },
  { id: 'relic',   name: 'Ancient Relic',  sellPrice: 115 },
];

export const BRAWL_ENEMIES = [
  { id: 'patron',  name: 'Bar Patron',   hp: 45,  damage: 12, credits: 18, spoilChance: 0.45 },
  { id: 'worker',  name: 'Dock Worker',  hp: 55,  damage: 15, credits: 25, spoilChance: 0.50 },
  { id: 'thug',    name: 'Space Thug',   hp: 70,  damage: 20, credits: 38, spoilChance: 0.60 },
  { id: 'bouncer', name: 'Bar Bouncer',  hp: 90,  damage: 25, credits: 55, spoilChance: 0.70 },
  { id: 'pirate',  name: 'Pirate',       hp: 110, damage: 30, credits: 75, spoilChance: 0.80 },
];

export const LIBRARY_BOOKS = [
  {
    id: 'b_weapons',
    title: 'Weapons of the Outer Belt',
    text: 'A guide to hardware found on the outer moons. Stun Pistols are stocked at Europa and Titan bases. Plasma Rifles are rare but show up at Triton.',
    revealWeapon: 'stunner',
  },
  {
    id: 'b_history',
    title: 'History of the Space Ports',
    text: 'The first ports were built on Earth\'s Moon in the early days of space travel. Today, every major moon hosts at least a small docking facility.',
    revealWeapon: null,
  },
  {
    id: 'b_upgrades',
    title: 'Ship Engineering Manual',
    text: 'Engine upgrades can dramatically improve manoeuvrability. Shield Generators are available at most shops, though the Mark II variants are harder to find.',
    revealWeapon: null,
  },
  {
    id: 'b_moons',
    title: 'Moons of the Solar System',
    text: 'Europa has a liquid water ocean beneath its ice. Titan has methane lakes. Triton orbits backwards and is slowly spiralling toward Neptune.',
    revealWeapon: null,
  },
  {
    id: 'b_combat',
    title: 'Self-Defence in Deep Space',
    text: 'A Combat Knife is the most reliable melee weapon — never runs out of uses. In longer brawls, save ranged weapons for heavily armoured opponents.',
    revealWeapon: 'knife',
  },
];
