/* ═══════════════════════════════════════════════════
   entities.js — Hero, Enemy, Projectile
═══════════════════════════════════════════════════ */

'use strict';

// ─── Hero ────────────────────────────────────────────
class Hero {
  constructor(col, lane, type) {
    const cfg = HEROES[type];
    this.type        = type;
    this.col         = col;
    this.lane        = lane;
    this.x           = CFG.GRID_X + col * CFG.CELL_W + CFG.CELL_W / 2;
    this.y           = CFG.LANE_Y[lane];
    this.hp          = cfg.hp;
    this.maxHp       = cfg.hp;
    this.damage      = cfg.damage;
    this.range       = cfg.range;
    this.attackSpeed = cfg.attackSpeed;
    this.projSpeed   = cfg.projSpeed;
    this.color       = cfg.color;
    this.strokeColor = cfg.strokeColor;
    this.emoji       = cfg.emoji;
    this.alive       = true;
    this.attackTimer = 0;          // counts down to 0 before next attack
    this.hitFlash    = 0;          // visual flash when hit
  }

  update(dt, enemies, projectiles) {
    if (!this.alive) return;

    if (this.attackTimer > 0) this.attackTimer -= dt;
    if (this.hitFlash > 0)    this.hitFlash    -= dt;

    if (this.attackTimer > 0) return;

    // Find closest enemy in same lane within range
    let best = null, bestDist = Infinity;
    for (const e of enemies) {
      if (!e.alive || e.lane !== this.lane) continue;
      const dist = Math.abs(e.x - this.x);
      if (dist <= this.range && dist < bestDist) {
        best = e; bestDist = dist;
      }
    }

    if (!best) return;

    this.attackTimer = 1 / this.attackSpeed;

    if (this.projSpeed === 0) {
      // Melee: instant hit
      best.takeDamage(this.damage);
    } else {
      projectiles.push(new Projectile(this.x, this.y, best, this.damage, this.type));
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = 0.18;
    if (this.hp <= 0) { this.hp = 0; this.alive = false; }
  }
}

// ─── Enemy ───────────────────────────────────────────
class Enemy {
  constructor(lane, type) {
    const cfg = ENEMIES[type];
    this.type         = type;
    this.lane         = lane;
    this.x            = CFG.SPAWN_X;
    this.y            = CFG.LANE_Y[lane];
    this.hp           = cfg.hp;
    this.maxHp        = cfg.hp;
    this.damage       = cfg.damage;
    this.speed        = cfg.speed;
    this.attackSpeed  = cfg.attackSpeed;
    this.reward       = cfg.reward;
    this.castleDamage = cfg.castleDamage;
    this.radius       = cfg.radius;
    this.color        = cfg.color;
    this.strokeColor  = cfg.strokeColor;
    this.emoji        = cfg.emoji;
    this.alive        = true;
    this.reachedCastle = false;
    this.attackTimer  = 0;
    this.hitFlash     = 0;
    this.blocked      = false;    // currently fighting a hero
  }

  update(dt, heroes, castle) {
    if (!this.alive) return;

    if (this.attackTimer > 0) this.attackTimer -= dt;
    if (this.hitFlash > 0)    this.hitFlash    -= dt;

    // Find a hero directly in front (same lane, hero.x >= this.x - 10)
    const blocker = this._findBlocker(heroes);

    if (blocker) {
      this.blocked = true;
      // Attack blocker
      if (this.attackTimer <= 0) {
        blocker.takeDamage(this.damage);
        this.attackTimer = 1 / this.attackSpeed;
      }
    } else {
      this.blocked = false;
      this.x += this.speed * dt;

      // Reached castle
      if (this.x >= CFG.CASTLE_X) {
        castle.takeDamage(this.castleDamage);
        this.alive = false;
        this.reachedCastle = true;
      }
    }
  }

  _findBlocker(heroes) {
    for (const h of heroes) {
      if (!h.alive || h.lane !== this.lane) continue;
      // Enemy right-edge overlaps hero left-edge
      if (this.x + this.radius >= h.x - 28 && this.x < h.x + 28) {
        return h;
      }
    }
    return null;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = 0.15;
    if (this.hp <= 0) { this.hp = 0; this.alive = false; }
  }
}

// ─── Projectile ──────────────────────────────────────
class Projectile {
  constructor(sx, sy, target, damage, heroType) {
    this.x       = sx;
    this.y       = sy;
    this.target  = target;
    this.damage  = damage;
    this.heroType= heroType;
    this.speed   = HEROES[heroType].projSpeed;
    this.alive   = true;
    // visual style
    if (heroType === 'mage') {
      this.color = '#c060ff'; this.radius = 5;
    } else if (heroType === 'archer') {
      this.color = '#f0b030'; this.radius = 3;
    } else {
      this.color = '#8090c0'; this.radius = 4;
    }
  }

  update(dt) {
    if (!this.alive) return;
    if (!this.target.alive) { this.alive = false; return; }

    const dx   = this.target.x - this.x;
    const dy   = this.target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 8) {
      this.target.takeDamage(this.damage);
      this.alive = false;
      return;
    }

    const nx = dx / dist, ny = dy / dist;
    this.x += nx * this.speed * dt;
    this.y += ny * this.speed * dt;
  }
}

// ─── Castle ──────────────────────────────────────────
class Castle {
  constructor() {
    this.maxHp = CFG.CASTLE_MAX_HP;
    this.hp    = this.maxHp;
    this.hitFlash = 0;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = 0.3;
    if (this.hp < 0) this.hp = 0;
  }

  get alive() { return this.hp > 0; }
  get hpFraction() { return this.hp / this.maxHp; }
}

// ─── WaveManager ─────────────────────────────────────
class WaveManager {
  constructor(waveData) {
    this.waves         = waveData;
    this.waveIndex     = -1;
    this.spawnQueue    = [];   // [{time, type, lane}]
    this.spawnTimer    = 0;
    this.countdownTimer= CFG.FIRST_WAVE_DELAY;
    this.inCountdown   = true;
    this.allSpawned    = false;
    this.complete      = false;
  }

  get currentWaveNum() { return this.waveIndex + 1; }   // 1-based
  get totalWaves()     { return this.waves.length; }

  get countdownSecs() {
    return Math.ceil(this.countdownTimer);
  }

  // Call once per frame; returns array of {type, lane} to spawn
  update(dt, liveEnemies) {
    if (this.complete) return [];

    // Countdown before each wave
    if (this.inCountdown) {
      this.countdownTimer -= dt;
      if (this.countdownTimer <= 0) {
        this.inCountdown = false;
        this._startNextWave();
      }
      return [];
    }

    // Spawn from queue
    this.spawnTimer += dt;
    const toSpawn = [];
    while (this.spawnQueue.length > 0 && this.spawnQueue[0].time <= this.spawnTimer) {
      const s = this.spawnQueue.shift();
      toSpawn.push({ type: s.type, lane: s.lane });
    }

    // Check if wave is fully done (queue empty AND no living enemies)
    if (this.spawnQueue.length === 0 && liveEnemies === 0 && !this.allSpawned) {
      if (this.waveIndex >= this.waves.length - 1) {
        this.allSpawned = true;
        this.complete   = true;
      } else {
        this.inCountdown    = true;
        this.countdownTimer = CFG.WAVE_GAP;
      }
    }

    return toSpawn;
  }

  _startNextWave() {
    this.waveIndex++;
    if (this.waveIndex >= this.waves.length) {
      this.allSpawned = true;
      this.complete   = true;
      return;
    }

    this.spawnTimer = 0;
    this.spawnQueue = [];

    const wave = this.waves[this.waveIndex];
    let cursor  = 0;

    for (const group of wave.enemies) {
      for (let i = 0; i < group.count; i++) {
        const lane = (group.lane !== undefined && group.lane !== null)
          ? group.lane
          : Math.floor(Math.random() * CFG.ROWS);
        this.spawnQueue.push({ time: cursor, type: group.type, lane });
        cursor += group.interval;
      }
    }

    this.spawnQueue.sort((a, b) => a.time - b.time);
  }

  get currentWaveLabel() {
    const w = this.waves[this.waveIndex];
    return w ? w.label : '';
  }
}
