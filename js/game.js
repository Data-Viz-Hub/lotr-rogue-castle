/* ═══════════════════════════════════════════════════
   game.js — Game class: state machine, loop, input
═══════════════════════════════════════════════════ */

'use strict';

class Game {
  constructor(canvas) {
    Renderer.init(canvas);
    this.canvas = canvas;
    this._reset();
    this._bindInput();
    this._buildHeroPanel();
  }

  // ─── Public ────────────────────────────────────────
  start() {
    this._reset();
    this.running  = true;
    this.lastTime = performance.now();
    requestAnimationFrame(t => this._loop(t));
  }

  // ─── Full reset (new game) ────────────────────────
  _reset() {
    this.running = false;
    this.phase   = 'playing';   // playing | scene_complete | defeat

    this.sceneNum            = 1;
    this.sceneTransitionTimer = 0;
    this.killCount           = 0;
    this.totalKills          = 0;

    this.waveMgr             = new WaveManager(SCENE_1_WAVES);
    this.heroes              = [];
    this.enemies             = [];
    this.projectiles         = [];
    this.weaponProjectiles   = [];
    this.castleWeapons       = [];
    this.castle              = new Castle();
    this.gold                = CFG.STARTING_GOLD;
    this.time                = 0;

    this.selectedHeroType   = null;
    this.placementCursor    = null;
    this.waveAnnounce       = null;
    this.activeUpgradeSlot  = null;

    this._closeUpgradePanel();
    this._updateHeroPanel();
    this._updateHeader();
  }

  // ─── Game loop ─────────────────────────────────────
  _loop(timestamp) {
    if (!this.running) return;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;
    this.time    += dt;
    this._update(dt);
    Renderer.draw(this._renderState());
    requestAnimationFrame(t => this._loop(t));
  }

  _renderState() {
    return {
      heroes:             this.heroes,
      enemies:            this.enemies,
      projectiles:        this.projectiles,
      weaponProjectiles:  this.weaponProjectiles,
      castleWeapons:      this.castleWeapons,
      castle:             this.castle,
      gold:               this.gold,
      waveMgr:            this.waveMgr,
      phase:              this.phase,
      sceneNum:           this.sceneNum,
      sceneTransitionTimer: this.sceneTransitionTimer,
      selectedHeroType:   this.selectedHeroType,
      placementCursor:    this.placementCursor,
      waveAnnounce:       this.waveAnnounce,
      time:               this.time,
    };
  }

  // ─── Update ───────────────────────────────────────
  _update(dt) {
    if (this.phase === 'scene_complete') {
      this.sceneTransitionTimer -= dt;
      if (this.sceneTransitionTimer <= 0) this._startNextScene();
      return;
    }
    if (this.phase !== 'playing') return;

    // Wave manager → spawns
    const liveEnemies = this.enemies.filter(e => e.alive).length;
    const spawns      = this.waveMgr.update(dt, liveEnemies);
    for (const s of spawns) this.enemies.push(new Enemy(s.lane, s.type));

    // Wave announce banner
    if (spawns.length > 0 && !this.waveMgr.inCountdown) {
      const label = this.waveMgr.currentWaveLabel;
      if (label && (!this.waveAnnounce || this.waveAnnounce.text !== label)) {
        this.waveAnnounce = { text: label, alpha: 2.5 };
        this._updateWaveLabel();
      }
    }
    if (this.waveAnnounce) this.waveAnnounce.alpha -= dt * 1.1;

    // Entity updates
    for (const h of this.heroes)         h.update(dt, this.enemies, this.projectiles);
    for (const w of this.castleWeapons)  w.update(dt, this.enemies, this.weaponProjectiles);
    for (const e of this.enemies)        e.update(dt, this.heroes, this.castle);
    for (const p of this.projectiles)    p.update(dt);
    for (const p of this.weaponProjectiles) {
      if (p.isCatapult) p.update(dt, this.enemies);
      else              p.update(dt);
    }

    // Collect gold from kills
    for (const e of this.enemies) {
      if (!e.alive && !e._rewarded) {
        e._rewarded = true;
        if (!e.reachedCastle) {
          this.gold += e.reward;
          this.killCount++;
          this.totalKills++;
          this._showToast(`+${e.reward} ⚜  (${e.name} slain)`, 1300);
        }
      }
    }

    // Prune dead entities
    this.enemies           = this.enemies.filter(e => e.alive);
    this.projectiles       = this.projectiles.filter(p => p.alive);
    this.weaponProjectiles = this.weaponProjectiles.filter(p => p.alive);
    this.heroes            = this.heroes.filter(h => h.alive);

    this._updateHeader();

    // Scene complete (endless: start next scene instead of showing victory)
    if (this.waveMgr.complete && this.enemies.length === 0) {
      this._triggerSceneComplete();
    }
    // Defeat
    if (!this.castle.alive) this._triggerDefeat();
  }

  // ─── Scene transitions (endless) ─────────────────
  _triggerSceneComplete() {
    this.phase                = 'scene_complete';
    this.sceneTransitionTimer = CFG.SCENE_TRANSITION;
    this.killCount            = 0;   // reset per-scene counter
    // Restore some castle HP as reward
    this.castle.hp = Math.min(this.castle.maxHp, this.castle.hp + 30);
    this.castle.hitFlash = 0;
    this._closeUpgradePanel();
  }

  _startNextScene() {
    this.sceneNum++;
    const waves   = generateSceneWaves(this.sceneNum);
    this.waveMgr  = new WaveManager(waves);
    // Keep: heroes, castleWeapons, gold, castle HP
    this.enemies           = [];
    this.projectiles       = [];
    this.weaponProjectiles = [];
    this.phase             = 'playing';
    this._updateHeader();
    this._updateWaveLabel();
    this._showToast(`⚔  Scene ${this.sceneNum} begins!`, 2000);
  }

  _triggerDefeat() {
    this.phase   = 'defeat';
    this.running = false;
    document.getElementById('stat-kills').textContent  = this.totalKills;
    document.getElementById('stat-scene').textContent  = this.sceneNum;
    document.getElementById('stat-hp').textContent     = 0;
    this._showScreen('defeat-screen');
  }

  // ─── Hero placement ───────────────────────────────
  _selectHero(type) {
    this._closeUpgradePanel();
    this.selectedHeroType = this.selectedHeroType === type ? null : type;
    this._updateHeroPanel();
  }

  _tryPlace(col, row) {
    if (!this.selectedHeroType) return;
    const cfg = HEROES[this.selectedHeroType];
    if (this.gold < cfg.cost)    { this._showToast('Not enough gold!', 1600); return; }
    if (col < 0 || col >= CFG.COLS || row !== 0) return;
    if (this.heroes.some(h => !h.onCastle && h.alive && h.col === col && h.lane === 0)) {
      this._showToast('Cell occupied!', 1200); return;
    }
    this.gold -= cfg.cost;
    this.heroes.push(new Hero(col, 0, this.selectedHeroType));
    this.selectedHeroType = null;
    this._updateHeroPanel(); this._updateHeader();
  }

  _placeHeroOnCastle(slot) {
    if (!this.selectedHeroType) return;
    const cfg = HEROES[this.selectedHeroType];
    if (this.gold < cfg.cost)    { this._showToast('Not enough gold!', 1600); return; }
    if (this.heroes.some(h => h.onCastle && h.alive && h.castleSlotId === slot.id)) {
      this._showToast('Slot occupied!', 1200); return;
    }
    this.gold -= cfg.cost;
    this.heroes.push(new Hero(null, null, this.selectedHeroType, slot));
    this.selectedHeroType = null;
    this._updateHeroPanel(); this._updateHeader();
    this._showToast(`${HEROES[this.heroes[this.heroes.length - 1].type].shortName} on the walls!`, 1400);
  }

  _canvasToGrid(cx, cy) {
    if (cy < CFG.LANE_TOP || cy > CFG.LANE_BOT) return { col: -1, row: -1 };
    const col = Math.floor((cx - CFG.GRID_X) / CFG.CELL_W);
    return { col, row: 0 };
  }

  // ─── Weapon slot interaction ───────────────────────
  _handleWeaponSlotClick(cx, cy) {
    for (const slot of CFG.WEAPON_SLOTS) {
      if (!this._nearSlot(cx, cy, slot)) continue;
      const weapon = this.castleWeapons.find(w => w.slotId === slot.id);
      if (!weapon) {
        const cost = CASTLE_WEAPONS[slot.weaponType].cost;
        if (this.gold < cost) { this._showToast('Not enough gold!', 1600); return; }
        this.gold -= cost;
        this.castleWeapons.push(new CastleWeapon(slot.id));
        this._updateHeader();
        this._showToast(`${CASTLE_WEAPONS[slot.weaponType].name} deployed!`, 1400);
      } else {
        this.activeUpgradeSlot = slot.id;
        this._openUpgradePanel(weapon);
      }
      return;
    }
  }

  _nearSlot(cx, cy, slot) {
    const dx = cx - slot.x, dy = cy - slot.y;
    return Math.sqrt(dx * dx + dy * dy) <= slot.r + 12;
  }

  // ─── Upgrade panel ────────────────────────────────
  _openUpgradePanel(weapon) {
    const wcfg = CASTLE_WEAPONS[weapon.type];
    document.getElementById('upg-emoji').textContent = wcfg.emoji;
    document.getElementById('upg-name').textContent  = wcfg.name;
    document.getElementById('upg-level').textContent = `Level ${weapon.level}`;
    document.getElementById('upg-dmg').textContent   = Math.round(weapon.damage);
    document.getElementById('upg-spd').textContent   = weapon.attackSpeed.toFixed(2) + '/s';

    const btn    = document.getElementById('upg-btn');
    const maxDiv = document.getElementById('upg-maxed');
    const actDiv = document.getElementById('upg-action');

    if (weapon.isMaxLevel) {
      actDiv.classList.add('hidden'); maxDiv.classList.remove('hidden');
    } else {
      actDiv.classList.remove('hidden'); maxDiv.classList.add('hidden');
      const up = weapon.nextUpgrade;
      btn.textContent = `${up.label}  ⚜ ${up.cost}`;
      btn.disabled    = this.gold < up.cost;
      btn.onclick     = () => this._doUpgrade(weapon);
    }
    document.getElementById('upgrade-panel').classList.remove('hidden');
  }

  _doUpgrade(weapon) {
    const up = weapon.nextUpgrade;
    if (!up || this.gold < up.cost) return;
    this.gold -= up.cost;
    weapon.applyUpgrade();
    this._updateHeader();
    this._showToast(`${CASTLE_WEAPONS[weapon.type].name} upgraded!`, 1400);
    this._openUpgradePanel(weapon);
  }

  _closeUpgradePanel() {
    this.activeUpgradeSlot = null;
    const panel = document.getElementById('upgrade-panel');
    if (panel) panel.classList.add('hidden');
  }

  // ─── Input ────────────────────────────────────────
  _bindInput() {
    const canvas = this.canvas;

    canvas.addEventListener('click', e => {
      if (this.phase !== 'playing') return;
      const rect   = canvas.getBoundingClientRect();
      const scaleX = CFG.CANVAS_W / rect.width;
      const scaleY = CFG.CANVAS_H / rect.height;
      const cx     = (e.clientX - rect.left) * scaleX;
      const cy     = (e.clientY - rect.top)  * scaleY;

      // Castle area
      if (cx <= CFG.CASTLE_W + 12) {
        if (this.selectedHeroType) {
          // Check hero castle slots first
          for (const slot of CFG.HERO_CASTLE_SLOTS) {
            if (this._nearSlot(cx, cy, slot)) {
              this._placeHeroOnCastle(slot);
              return;
            }
          }
          // Missed hero slot → cancel selection
          this.selectedHeroType = null;
          this._updateHeroPanel();
        } else {
          this._handleWeaponSlotClick(cx, cy);
        }
        return;
      }

      // Grid area
      if (this.selectedHeroType) {
        const { col, row } = this._canvasToGrid(cx, cy);
        if (row === 0 && col >= 0) {
          this._tryPlace(col, row);
          this._closeUpgradePanel();
        }
      } else {
        this._closeUpgradePanel();
      }
    });

    canvas.addEventListener('mousemove', e => {
      if (!this.selectedHeroType) { this.placementCursor = null; return; }
      const rect   = canvas.getBoundingClientRect();
      const scaleX = CFG.CANVAS_W / rect.width;
      const scaleY = CFG.CANVAS_H / rect.height;
      this.placementCursor = {
        mx: (e.clientX - rect.left) * scaleX,
        my: (e.clientY - rect.top)  * scaleY,
      };
    });

    canvas.addEventListener('mouseleave', () => { this.placementCursor = null; });

    canvas.addEventListener('contextmenu', e => {
      e.preventDefault();
      this.selectedHeroType = null;
      this._closeUpgradePanel();
      this._updateHeroPanel();
    });
  }

  // ─── UI helpers ───────────────────────────────────
  _buildHeroPanel() {
    const container = document.getElementById('hero-cards');
    container.innerHTML = '';
    for (const [type, cfg] of Object.entries(HEROES)) {
      const card = document.createElement('div');
      card.className    = 'hero-card';
      card.dataset.type = type;
      card.innerHTML    = `
        <div class="card-emoji">${cfg.emoji}</div>
        <div class="card-name">${cfg.shortName}</div>
        <div class="card-cost">⚜ ${cfg.cost}</div>
        <div class="card-stat">${cfg.desc}</div>
      `;
      card.addEventListener('click', () => this._selectHero(type));
      container.appendChild(card);
    }
  }

  _updateHeroPanel() {
    document.querySelectorAll('.hero-card').forEach(card => {
      const type = card.dataset.type;
      card.classList.toggle('selected', type === this.selectedHeroType);
      card.classList.toggle('disabled', this.gold < HEROES[type].cost && type !== this.selectedHeroType);
    });
  }

  _updateHeader() {
    document.getElementById('gold-amount').textContent     = this.gold;
    document.getElementById('castle-hp-bar').style.width  = `${this.castle.hpFraction * 100}%`;
    document.getElementById('castle-hp-text').textContent = Math.ceil(this.castle.hp);
    const sn = document.getElementById('header-scene-num');
    if (sn) sn.textContent = this.sceneNum;
    this._updateHeroPanel();

    // Refresh upgrade button disabled state when gold changes
    if (this.activeUpgradeSlot !== null) {
      const weapon = this.castleWeapons.find(w => w.slotId === this.activeUpgradeSlot);
      if (weapon && !weapon.isMaxLevel) {
        const btn = document.getElementById('upg-btn');
        if (btn) btn.disabled = this.gold < weapon.nextUpgrade.cost;
      }
    }
  }

  _updateWaveLabel() {
    const wm = this.waveMgr;
    document.getElementById('wave-label').textContent =
      `Wave ${wm.currentWaveNum} / ${wm.totalWaves}`;
  }

  _showToast(msg, duration = 1500) {
    const el = document.getElementById('toast-msg');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
  }

  _showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }
}
