/* ═══════════════════════════════════════════════════
   config.js — Game constants, entity stats, scene data
═══════════════════════════════════════════════════ */

'use strict';

// ─── Canvas layout ─────────────────────────────────
const CFG = {
  CANVAS_W: 900,
  CANVAS_H: 480,

  COLS: 9,            // hero placement columns
  ROWS: 3,            // lanes
  CELL_W: 80,         // cell width in px  (900-180)/9 = 80
  CELL_H: 110,        // lane height in px

  CASTLE_W: 180,      // castle occupies x: 0 → 180
  GRID_X:   180,      // hero grid starts here
  GRID_Y:   75,       // top of first lane

  SPAWN_X: 960,       // enemies spawn at right edge

  CASTLE_MAX_HP:  200,
  STARTING_GOLD:  150,

  WAVE_GAP:         7,   // seconds between waves
  FIRST_WAVE_DELAY: 3,   // countdown before wave 1
};

// Lane y-centers (same for left or right layout)
CFG.LANE_Y = [
  CFG.GRID_Y + CFG.CELL_H * 0 + CFG.CELL_H / 2,  // 130
  CFG.GRID_Y + CFG.CELL_H * 1 + CFG.CELL_H / 2,  // 240
  CFG.GRID_Y + CFG.CELL_H * 2 + CFG.CELL_H / 2,  // 350
];

// ─── Castle weapon slots (on the right face of the castle) ─
CFG.WEAPON_SLOTS = [
  { id: 0, weaponType: 'catapult',     x: 162, y: 95,  r: 26 },
  { id: 1, weaponType: 'fire_machine', x: 162, y: 200, r: 22 },
  { id: 2, weaponType: 'fire_machine', x: 162, y: 300, r: 22 },
  { id: 3, weaponType: 'catapult',     x: 162, y: 405, r: 26 },
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
    attackSpeed: 1.4,
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
    projSpeed: 0,       // melee — instant
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
    damage: 10,
    speed: 65,
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

// ─── Castle weapons ──────────────────────────────────
const CASTLE_WEAPONS = {
  catapult: {
    name: 'Catapult',
    emoji: '⚙',
    cost: 120,
    baseDamage:      55,
    baseAttackSpeed: 0.35,
    projSpeed: 180,   // lower = slower arc
    aoeRadius: 40,
    color: '#8a6020',
    strokeColor: '#c09040',
    upgrades: [
      { label: 'Heavier Stones',  cost: 80,  damageBonus: 20, speedBonus: 0 },
      { label: 'Faster Winch',    cost: 100, damageBonus: 0,  speedBonus: 0.15 },
      { label: 'Burning Rocks',   cost: 140, damageBonus: 30, speedBonus: 0 },
      { label: 'War Machine',     cost: 180, damageBonus: 0,  speedBonus: 0.20 },
    ],
  },
  fire_machine: {
    name: 'Fire Cannon',
    emoji: '🔥',
    cost: 100,
    baseDamage:      22,
    baseAttackSpeed: 1.1,
    projSpeed: 300,
    aoeRadius: 0,
    color: '#a03010',
    strokeColor: '#e05020',
    upgrades: [
      { label: 'Hotter Fuel',     cost: 70,  damageBonus: 10, speedBonus: 0 },
      { label: 'Rapid Fire',      cost: 90,  damageBonus: 0,  speedBonus: 0.35 },
      { label: 'Inferno Oil',     cost: 120, damageBonus: 15, speedBonus: 0 },
      { label: 'Hellblast',       cost: 160, damageBonus: 0,  speedBonus: 0.40 },
    ],
  },
};

// ─── Chapter / Scene data ────────────────────────────
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
