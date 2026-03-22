/* ═══════════════════════════════════════════════════
   config.js — Game constants, entity stats, scene data
═══════════════════════════════════════════════════ */

'use strict';

// ─── Canvas layout ─────────────────────────────────
const CFG = {
  CANVAS_W: 900,
  CANVAS_H: 480,

  COLS: 9,           // hero placement columns
  ROWS: 3,           // lanes
  CELL_W: 76,        // cell width in px
  CELL_H: 110,       // cell height (lane height) in px

  GRID_X: 20,        // x where grid starts
  GRID_Y: 75,        // y of first lane top

  CASTLE_X: 700,     // x where castle starts  (20 + 9*76 = 704 ≈ 700)
  CASTLE_W: 200,

  SPAWN_X: -60,      // enemies spawn here

  CASTLE_MAX_HP: 200,
  STARTING_GOLD: 150,

  WAVE_GAP: 7,       // seconds between waves
  FIRST_WAVE_DELAY: 3, // countdown before wave 1
};

// Lane y-centers
CFG.LANE_Y = [
  CFG.GRID_Y + CFG.CELL_H * 0 + CFG.CELL_H / 2,  // 75 + 55 = 130
  CFG.GRID_Y + CFG.CELL_H * 1 + CFG.CELL_H / 2,  // 75+110+55 = 240
  CFG.GRID_Y + CFG.CELL_H * 2 + CFG.CELL_H / 2,  // 75+220+55 = 350
];

// ─── Heroes ─────────────────────────────────────────
const HEROES = {
  archer: {
    name: 'Legolas\'s Archer',
    shortName: 'Archer',
    emoji: '🏹',
    cost: 50,
    hp: 70,
    damage: 18,
    range: 220,
    attackSpeed: 1.4,  // attacks / second
    projSpeed: 350,
    color: '#3a7a3a',
    strokeColor: '#5ab55a',
    desc: 'Ranged · Fast\nDmg 18 · HP 70',
  },
  swordsman: {
    name: 'Gondor Swordsman',
    shortName: 'Swordsman',
    emoji: '⚔️',
    cost: 75,
    hp: 140,
    damage: 28,
    range: 65,
    attackSpeed: 0.9,
    projSpeed: 0,      // melee — instant
    color: '#3a5aaa',
    strokeColor: '#6080d0',
    desc: 'Melee · Tanky\nDmg 28 · HP 140',
  },
  mage: {
    name: 'Wizard',
    shortName: 'Wizard',
    emoji: '🧙',
    cost: 100,
    hp: 55,
    damage: 38,
    range: 260,
    attackSpeed: 0.65,
    projSpeed: 280,
    color: '#7030a0',
    strokeColor: '#b060e0',
    desc: 'Ranged · AoE\nDmg 38 · HP 55',
  },
};

// ─── Enemies ─────────────────────────────────────────
const ENEMIES = {
  goblin: {
    name: 'Goblin',
    emoji: '👺',
    hp: 45,
    damage: 10,       // damage dealt to blocking hero per attack
    speed: 65,        // px / second
    attackSpeed: 1.2,
    reward: 10,
    castleDamage: 25,
    radius: 14,
    color: '#5a8a20',
    strokeColor: '#8abf40',
  },
  orc: {
    name: 'Orc',
    emoji: '👹',
    hp: 110,
    damage: 22,
    speed: 38,
    attackSpeed: 0.8,
    reward: 25,
    castleDamage: 50,
    radius: 20,
    color: '#3a5a20',
    strokeColor: '#6a9a40',
  },
  uruk: {
    name: 'Uruk-hai',
    emoji: '🗡️',
    hp: 220,
    damage: 38,
    speed: 24,
    attackSpeed: 0.6,
    reward: 60,
    castleDamage: 80,
    radius: 26,
    color: '#2a2a2a',
    strokeColor: '#606060',
  },
};

// ─── Chapter / Scene data ────────────────────────────
// Each wave entry: { type, count, interval (seconds between spawns), lane (null = random) }
const CHAPTERS = [
  {
    id: 1,
    name: 'The Shadow Stirs',
    scenes: [
      {
        id: 1,
        name: 'Goblin Raid at Weathertop',
        waves: [
          {
            label: 'Wave 1 — The Scouts',
            enemies: [
              { type: 'goblin', count: 5, interval: 2.0 },
            ],
          },
          {
            label: 'Wave 2 — The Warband',
            enemies: [
              { type: 'goblin', count: 6, interval: 1.6 },
              { type: 'orc',    count: 2, interval: 4.0 },
            ],
          },
          {
            label: 'Wave 3 — The Warchief',
            enemies: [
              { type: 'goblin', count: 4, interval: 1.2 },
              { type: 'orc',    count: 3, interval: 2.5 },
              { type: 'uruk',   count: 1, interval: 8.0 },
            ],
          },
        ],
      },
    ],
  },
];
