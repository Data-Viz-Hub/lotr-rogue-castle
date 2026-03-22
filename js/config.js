/* ═══════════════════════════════════════════════════
   config.js — Layout, entity stats, scene generation
═══════════════════════════════════════════════════ */

'use strict';

// ─── Canvas / layout ──────────────────────────────────
const CFG = {
  CANVAS_W: 900,
  CANVAS_H: 480,

  // Single lane
  COLS: 8,
  ROWS: 1,
  CELL_W: 90,
  CELL_H: 140,    // single lane height

  CASTLE_W: 180,
  GRID_X:   180,

  SPAWN_X: 980,   // enemies appear here (right edge)

  CASTLE_MAX_HP:   200,
  STARTING_GOLD:   300,   // ← test-mode generous start

  WAVE_GAP:         6,    // seconds between waves in a scene
  FIRST_WAVE_DELAY: 3,    // countdown before wave 1
  SCENE_TRANSITION: 3.5,  // pause between scenes
};

// Single lane centred vertically
CFG.LANE_Y   = [ Math.floor(CFG.CANVAS_H / 2) ];   // [240]
CFG.LANE_TOP = CFG.LANE_Y[0] - CFG.CELL_H / 2;     // 170
CFG.LANE_BOT = CFG.LANE_Y[0] + CFG.CELL_H / 2;     // 310

// ─── Castle weapon slots ──────────────────────────────
// Positioned on the castle body; x roughly at castle's right section
CFG.WEAPON_SLOTS = [
  { id: 0, weaponType: 'catapult',     x: 122, y: 82,  r: 26 },  // top tower
  { id: 1, weaponType: 'fire_machine', x: 80,  y: 155, r: 22 },  // upper wall
  { id: 2, weaponType: 'fire_machine', x: 80,  y: 325, r: 22 },  // lower wall
  { id: 3, weaponType: 'catapult',     x: 122, y: 398, r: 26 },  // bottom tower
];

// ─── Castle hero slots ────────────────────────────────
// Two embrasures on the right face of the castle (lane level)
CFG.HERO_CASTLE_SLOTS = [
  { id: 0, x: 158, y: 212, r: 24 },   // upper embrasure
  { id: 1, x: 158, y: 268, r: 24 },   // lower embrasure
];

// ─── Heroes (test-mode pricing) ───────────────────────
const HEROES = {
  archer: {
    name: 'Legolas\'s Archer',
    shortName: 'Archer',
    emoji: '🏹',
    cost: 20,              // ← cheap
    hp: 70,
    damage: 18,
    range: 230,
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
    cost: 30,
    hp: 150,
    damage: 30,
    range: 70,
    attackSpeed: 0.9,
    projSpeed: 0,
    color: '#3a5aaa',
    strokeColor: '#6080d0',
    desc: 'Melee · Tanky\nDmg 30 · HP 150',
  },
  mage: {
    name: 'Wizard',
    shortName: 'Wizard',
    emoji: '🧙',
    cost: 40,
    hp: 55,
    damage: 40,
    range: 260,
    attackSpeed: 0.65,
    projSpeed: 280,
    color: '#7030a0',
    strokeColor: '#b060e0',
    desc: 'Ranged · AoE\nDmg 40 · HP 55',
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
    hp: 240,
    damage: 40,
    speed: 22,
    attackSpeed: 0.55,
    reward: 60,
    castleDamage: 80,
    radius: 27,
    color: '#2a2a2a',
    strokeColor: '#606060',
  },
};

// ─── Castle weapons (test-mode pricing) ──────────────
const CASTLE_WEAPONS = {
  catapult: {
    name: 'Catapult',
    emoji: '⚙',
    cost: 50,              // ← cheap
    baseDamage:      55,
    baseAttackSpeed: 0.35,
    projSpeed: 175,
    aoeRadius: 42,
    color: '#8a6020',
    strokeColor: '#c09040',
    upgrades: [
      { label: 'Heavier Stones', cost: 25, damageBonus: 22, speedBonus: 0    },
      { label: 'Faster Winch',   cost: 35, damageBonus: 0,  speedBonus: 0.15 },
      { label: 'Burning Rocks',  cost: 50, damageBonus: 30, speedBonus: 0    },
      { label: 'War Machine',    cost: 60, damageBonus: 0,  speedBonus: 0.20 },
    ],
  },
  fire_machine: {
    name: 'Fire Cannon',
    emoji: '🔥',
    cost: 40,              // ← cheap
    baseDamage:      22,
    baseAttackSpeed: 1.1,
    projSpeed: 310,
    aoeRadius: 0,
    color: '#a03010',
    strokeColor: '#e05020',
    upgrades: [
      { label: 'Hotter Fuel',  cost: 25, damageBonus: 12, speedBonus: 0    },
      { label: 'Rapid Fire',   cost: 30, damageBonus: 0,  speedBonus: 0.35 },
      { label: 'Inferno Oil',  cost: 45, damageBonus: 16, speedBonus: 0    },
      { label: 'Hellblast',    cost: 55, damageBonus: 0,  speedBonus: 0.40 },
    ],
  },
};

// ─── Scene 1 waves (hand-crafted) ────────────────────
const SCENE_1_WAVES = [
  {
    label: 'Wave 1 — The Scouts',
    enemies: [ { type: 'goblin', count: 5, interval: 2.0 } ],
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
];

// ─── Procedural scene wave generator ─────────────────
// Called for scene 2, 3, 4 … (endless)
function generateSceneWaves(sceneNum) {
  const waveCount = Math.min(2 + Math.ceil(sceneNum / 2), 5);
  const waves     = [];

  for (let w = 0; w < waveCount; w++) {
    const enemies = [];

    // Goblins — always present, scale count + spawn speed
    const gc = Math.round(4 + sceneNum * 2.2 + w * 1.5);
    const gi = parseFloat(Math.max(0.55, 2.2 - sceneNum * 0.13).toFixed(2));
    enemies.push({ type: 'goblin', count: gc, interval: gi });

    // Orcs — from scene 2
    if (sceneNum >= 2) {
      const oc = Math.round(1 + (sceneNum - 1) * 1.1 + w * 0.8);
      const oi = parseFloat(Math.max(0.9, 4.0 - sceneNum * 0.18).toFixed(2));
      enemies.push({ type: 'orc', count: oc, interval: oi });
    }

    // Uruk-hai — from scene 4
    if (sceneNum >= 4) {
      const uc = Math.max(1, Math.round((sceneNum - 3) * 0.8 + w * 0.5));
      const ui = parseFloat(Math.max(2.0, 7.0 - sceneNum * 0.25).toFixed(2));
      enemies.push({ type: 'uruk', count: uc, interval: ui });
    }

    waves.push({ label: `Scene ${sceneNum} · Wave ${w + 1}`, enemies });
  }
  return waves;
}
