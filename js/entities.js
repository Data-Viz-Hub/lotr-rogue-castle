/* ═══════════════════════════════════════════════════
   entities.js — Hero, Enemy, projectiles, CastleWeapon, WaveManager
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
    this.attackTimer = 0;
    this.hitFlash    = 0;
  }

  update(dt, enemies, projectiles) {
    if (!this.alive) return;
    if (this.attackTimer > 0) this.attackTimer -= dt;
    if (this.hitFlash > 0)    this.hitFlash    -= dt;
    if (this.attackTimer > 0) return;

    // Nearest enemy in same lane within range
    let best = null, bestDist = Infinity;
    for (const e of enemies) {
      if (!e.alive || e.lane !== this.lane) continue;
      const dist = Math.abs(e.x - this.x);
      if (dist <= this.range && dist < bestDist) { best = e; bestDist = dist; }
    }
    if (!best) return;

    this.attackTimer = 1 / this.attackSpeed;
    if (this.projSpeed === 0) {
      best.takeDamage(this.damage);
    } else {
      projectiles.push(new HeroShot(this.x, this.y, best, this.damage, this.type));
    }
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = 0.18;
    if (this.hp <= 0) { this.hp = 0; this.alive = false; }
  }
}

// ─── Enemy (walks LEFT — from SPAWN_X toward castle on left) ─
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
    this.name         = cfg.name;
    this.alive        = true;
    this.reachedCastle= false;
    this.attackTimer  = 0;
    this.hitFlash     = 0;
    this.blocked      = false;
  }

  update(dt, heroes, castle) {
    if (!this.alive) return;
    if (this.attackTimer > 0) this.attackTimer -= dt;
    if (this.hitFlash > 0)    this.hitFlash    -= dt;

    const blocker = this._findBlocker(heroes);

    if (blocker) {
      this.blocked = true;
      if (this.attackTimer <= 0) {
        blocker.takeDamage(this.damage);
        this.attackTimer = 1 / this.attackSpeed;
      }
    } else {
      this.blocked = false;
      this.x -= this.speed * dt;  // walk LEFT

      // Reached castle right face
      if (this.x - this.radius <= CFG.CASTLE_W) {
        castle.takeDamage(this.castleDamage);
        this.alive = false;
        this.reachedCastle = true;
      }
    }
  }

  // Enemy approaches from the right; hero is to its left
  _findBlocker(heroes) {
    for (const h of heroes) {
      if (!h.alive || h.lane !== this.lane) continue;
      // Enemy left-edge overlaps hero right-area
      if (this.x - this.radius <= h.x + 28 && this.x > h.x - 28) {
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

// ─── Hero projectile (straight-line) ─────────────────
class HeroShot {
  constructor(sx, sy, target, damage, heroType) {
    this.x        = sx;
    this.y        = sy;
    this.target   = target;
    this.damage   = damage;
    this.speed    = HEROES[heroType].projSpeed;
    this.alive    = true;
    this.isHeroShot = true;
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
    const dx = this.target.x - this.x, dy = this.target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 8) { this.target.takeDamage(this.damage); this.alive = false; return; }
    this.x += (dx / dist) * this.speed * dt;
    this.y += (dy / dist) * this.speed * dt;
  }
}

// ─── Catapult shot (parabolic arc, AoE on landing) ───
class CatapultShot {
  constructor(sx, sy, target, damage, aoeRadius) {
    this.sx       = sx;
    this.sy       = sy;
    this.target   = target;
    this.damage   = damage;
    this.aoeRadius= aoeRadius;
    this.progress = 0;
    this.duration = 1.6;      // seconds to reach target
    this.arcHeight= 90;       // peak arc height above the baseline
    this.x        = sx;
    this.y        = sy;
    this.alive    = true;
    this.isCatapult = true;
    // Snapshot target position at launch (so it tracks in-flight)
    this.tx = target.x;
    this.ty = target.y;
  }

  update(dt, enemies) {
    if (!this.alive) return;

    // Track target while alive
    if (this.target.alive) { this.tx = this.target.x; this.ty = this.target.y; }

    this.progress += dt / this.duration;
    const t = Math.min(this.progress, 1);

    this.x = this.sx + (this.tx - this.sx) * t;
    this.y = this.sy + (this.ty - this.sy) * t - 4 * this.arcHeight * t * (1 - t);

    if (t >= 1) {
      // AoE impact
      for (const e of enemies) {
        if (!e.alive) continue;
        const dx = e.x - this.tx, dy = e.y - this.ty;
        if (Math.sqrt(dx * dx + dy * dy) <= this.aoeRadius) {
          e.takeDamage(this.damage);
        }
      }
      this.alive = false;
    }
  }
}

// ─── Fire cannon shot (straight, single target) ───────
class FireShot {
  constructor(sx, sy, target, damage, speed) {
    this.x      = sx;
    this.y      = sy;
    this.target = target;
    this.damage = damage;
    this.speed  = speed;
    this.alive  = true;
    this.isFireShot = true;
  }

  update(dt) {
    if (!this.alive) return;
    if (!this.target.alive) { this.alive = false; return; }
    const dx = this.target.x - this.x, dy = this.target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10) { this.target.takeDamage(this.damage); this.alive = false; return; }
    this.x += (dx / dist) * this.speed * dt;
    this.y += (dy / dist) * this.speed * dt;
  }
}

// ─── Castle weapon (catapult or fire_machine) ─────────
class CastleWeapon {
  constructor(slotId) {
    const slot       = CFG.WEAPON_SLOTS[slotId];
    const type       = slot.weaponType;
    const cfg        = CASTLE_WEAPONS[type];
    this.slotId      = slotId;
    this.type        = type;
    this.x           = slot.x;
    this.y           = slot.y;
    this.damage      = cfg.baseDamage;
    this.attackSpeed = cfg.baseAttackSpeed;
    this.projSpeed   = cfg.projSpeed;
    this.aoeRadius   = cfg.aoeRadius;
    this.range       = 700;     // covers whole battlefield
    this.attackTimer = 0;
    this.upgradeLevel= 0;       // 0 = base purchased, upgrades add to this
    this.alive       = true;
  }

  get cfg()           { return CASTLE_WEAPONS[this.type]; }
  get maxUpgrades()   { return this.cfg.upgrades.length; }
  get isMaxLevel()    { return this.upgradeLevel >= this.maxUpgrades; }
  get nextUpgrade()   { return this.isMaxLevel ? null : this.cfg.upgrades[this.upgradeLevel]; }
  get level()         { return this.upgradeLevel + 1; }

  applyUpgrade() {
    const up = this.nextUpgrade;
    if (!up) return;
    this.damage      += up.damageBonus;
    this.attackSpeed += up.speedBonus;
    this.upgradeLevel++;
  }

  update(dt, enemies, weaponProjectiles) {
    if (this.attackTimer > 0) { this.attackTimer -= dt; return; }

    // Find nearest enemy anywhere on the field
    let best = null, bestDist = Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.x - this.x, dy = e.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < bestDist) { best = e; bestDist = dist; }
    }
    if (!best) return;

    this.attackTimer = 1 / this.attackSpeed;

    if (this.type === 'catapult') {
      weaponProjectiles.push(
        new CatapultShot(this.x, this.y, best, this.damage, this.aoeRadius)
      );
    } else {
      weaponProjectiles.push(
        new FireShot(this.x, this.y, best, this.damage, this.projSpeed)
      );
    }
  }
}

// ─── Castle ──────────────────────────────────────────
class Castle {
  constructor() {
    this.maxHp    = CFG.CASTLE_MAX_HP;
    this.hp       = this.maxHp;
    this.hitFlash = 0;
  }
  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = 0.35;
    if (this.hp < 0) this.hp = 0;
  }
  get alive()      { return this.hp > 0; }
  get hpFraction() { return this.hp / this.maxHp; }
}

// ─── WaveManager ─────────────────────────────────────
class WaveManager {
  constructor(waveData) {
    this.waves          = waveData;
    this.waveIndex      = -1;
    this.spawnQueue     = [];
    this.spawnTimer     = 0;
    this.countdownTimer = CFG.FIRST_WAVE_DELAY;
    this.inCountdown    = true;
    this.allSpawned     = false;
    this.complete       = false;
  }

  get currentWaveNum() { return this.waveIndex + 1; }
  get totalWaves()     { return this.waves.length; }
  get countdownSecs()  { return Math.ceil(this.countdownTimer); }

  update(dt, liveEnemies) {
    if (this.complete) return [];

    if (this.inCountdown) {
      this.countdownTimer -= dt;
      if (this.countdownTimer <= 0) {
        this.inCountdown = false;
        this._startNextWave();
      }
      return [];
    }

    this.spawnTimer += dt;
    const toSpawn = [];
    while (this.spawnQueue.length > 0 && this.spawnQueue[0].time <= this.spawnTimer) {
      const s = this.spawnQueue.shift();
      toSpawn.push({ type: s.type, lane: s.lane });
    }

    if (this.spawnQueue.length === 0 && liveEnemies === 0) {
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
      this.allSpawned = true; this.complete = true; return;
    }
    this.spawnTimer = 0;
    this.spawnQueue = [];
    let cursor      = 0;
    for (const group of this.waves[this.waveIndex].enemies) {
      for (let i = 0; i < group.count; i++) {
        const lane = (group.lane != null) ? group.lane : Math.floor(Math.random() * CFG.ROWS);
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
