// NPC ship encounter types — dialogue, AI, and visual data

export const ENCOUNTER_SHIPS = [
  {
    id: 'trader',
    name: 'Merchant Vessel',
    bodyColor:   0x2266AA,
    accentColor: 0x55AAFF,
    hpMax: 75,
    personality: 'peaceful',   // intimidate success chance: 0.78
    speed: 36,
    bulletDamage: 18,
    bulletInterval: 2200,
    hailNpc: 'Captain Mira',
    hailGreeting: 'Greetings, traveller! I ferry goods between the outer planets. Have you seen any pirates out here?',
    hailTree: [
      {
        id: 'root',
        text: 'Greetings, traveller! I ferry goods between the outer planets. Have you seen any pirates out here?',
        choices: [
          { text: 'What do you trade?',        next: 'trade'  },
          { text: 'No, all clear! Safe travels.', next: null },
        ],
      },
      {
        id: 'trade',
        text: 'Ice from Europa, gases from Jupiter, and trinkets from the asteroid belt. It keeps the colonies fed! The solar system is a busy place.',
        choices: [
          { text: 'Fascinating! Goodbye.',      next: null },
        ],
      },
    ],
    encounterOpen: 'Unidentified vessel — this is the cargo ship Ceres Star. Please state your intentions.',
    intimidateFlee: 'No trouble here! We are just passing through!',
    intimidateStand: 'You do not scare us! Back off!',
    attackQuip: 'Why are you attacking a peaceful ship?!',
  },
  {
    id: 'pirate',
    name: 'Space Pirate',
    bodyColor:   0x881100,
    accentColor: 0xFF4422,
    hpMax: 95,
    personality: 'aggressive', // intimidate success chance: 0.28
    speed: 55,
    bulletDamage: 25,
    bulletInterval: 1400,
    hailNpc: 'Pirate Captain',
    hailGreeting: 'Oh? Not fleeing? Brave little ship. Hand over your fuel cells and we will let you go.',
    hailTree: [
      {
        id: 'root',
        text: 'Oh? Not fleeing? Brave little ship. Hand over your fuel cells and we will let you go.',
        choices: [
          { text: 'Never! (prepare for battle)', next: null },
          { text: 'Fine — take them and leave.',  next: 'deal' },
        ],
      },
      {
        id: 'deal',
        text: 'Ha! Smart choice. We will let you pass... this time. Do not let us catch you out here again.',
        choices: [
          { text: '...Goodbye.',                  next: null },
        ],
      },
    ],
    encounterOpen: 'HALT! This sector belongs to us now. Hand over your cargo or we open fire!',
    intimidateFlee: 'Heh... you have got guts. Move along, then.',
    intimidateStand: 'Nice try, little ship. You just made a big mistake!',
    attackQuip: 'Finally some action! Let us go!',
  },
  {
    id: 'explorer',
    name: 'Scout Probe',
    bodyColor:   0x116633,
    accentColor: 0x44FF88,
    hpMax: 60,
    personality: 'peaceful',   // intimidate success chance: 0.82
    speed: 50,
    bulletDamage: 14,
    bulletInterval: 2600,
    hailNpc: 'Dr. ARIA-7',
    hailGreeting: 'Fascinating! Another ship out here! I am ARIA-7, a science probe mapping solar radiation patterns.',
    hailTree: [
      {
        id: 'root',
        text: 'Fascinating! Another ship out here! I am ARIA-7, a science probe mapping solar radiation patterns.',
        choices: [
          { text: 'What have you discovered?', next: 'found' },
          { text: 'Safe travels, ARIA-7!',      next: null   },
        ],
      },
      {
        id: 'found',
        text: "Jupiter's magnetic field is 20,000 times stronger than Earth's! It creates the most beautiful auroras in the solar system. I have been studying them for three years.",
        choices: [
          { text: 'Amazing! Thank you.',         next: null   },
        ],
      },
    ],
    encounterOpen: 'Unknown ship detected. Classification undetermined. Please identify yourself for my records.',
    intimidateFlee: 'Oh dear! I am not equipped for conflict. Retreating immediately!',
    intimidateStand: 'How rude! I am a scientist, not a threat!',
    attackQuip: 'This is most illogical!',
  },
  {
    id: 'warship',
    name: 'Battle Cruiser',
    bodyColor:   0x884400,
    accentColor: 0xFF8833,
    hpMax: 120,
    personality: 'aggressive', // intimidate success chance: 0.22
    speed: 44,
    bulletDamage: 30,
    bulletInterval: 1100,
    hailNpc: 'Commander Rex',
    hailGreeting: 'Identify yourself. You are operating in a restricted corridor. State your mission.',
    hailTree: [
      {
        id: 'root',
        text: 'Identify yourself. You are operating in a restricted corridor. State your mission.',
        choices: [
          { text: 'Just exploring the solar system.', next: 'explorer' },
          { text: 'None of your business!',           next: null       },
        ],
      },
      {
        id: 'explorer',
        text: 'A civilian explorer. Very well — proceed. But stay clear of the outer planets. We have active patrols there.',
        choices: [
          { text: 'Understood. Thank you.',            next: null       },
        ],
      },
    ],
    encounterOpen: 'ALERT: Unregistered vessel. You have five seconds to comply with identification protocols.',
    intimidateFlee: '...Stand down. We are watching you.',
    intimidateStand: 'Threat detected. Engaging combat protocols!',
    attackQuip: 'Big mistake. ENGAGE!',
  },
];
