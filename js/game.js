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

  // ─── Reset ────────────────────────────────────────
  _reset() {
    this.running = false;
    this.phase   = 'playing';

    const scene  = CHAPTERS[0].scenes[0];
    this.waveMgr = new WaveManager(scene.waves);

    this.heroes            = [];
    this.enemies           = [];
    this.projectiles       = [];     // hero shots
    this.weaponProjectiles = [];     // catapult / fire shots
    this.castleWeapons     = [];     // deployed castle weapons
    this.castle            = new Castle();
    this.gold              = CFG.STARTING_GOLD;
    this.killCount         = 0;

    this.selectedHeroType   = null;
    this.placementCursor    = null;
    this.waveAnnounce       = null;
    this.activeUpgradeSlot  = null;  // slotId of open upgrade panel

    this._closeUpgradePanel();
    this._updateHeroPanel();
    this._updateHeader();
  }

  // ─── Game loop ─────────────────────────────────────
  _loop(timestamp) {
    if (!this.running) return;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;
    this._update(dt);
    Renderer.draw(this._renderState());
    requestAnimationFrame(t => this._loop(t));
  }

  _renderState() {
    return {
      heroes:            this.heroes,
      enemies:           this.enemies,
      projectiles:       this.projectiles,
      weaponProjectiles: this.weaponProjectiles,
      castleWeapons:     this.castleWeapons,
      castle:            this.castle,
      gold:              this.gold,
      waveMgr:           this.waveMgr,
      phase:             this.phase,
      selectedHeroType:  this.selectedHeroType,
      placementCursor:   this.placementCursor,
      waveAnnounce:      this.waveAnnounce,
    };
  }

  // ─── Update ───────────────────────────────────────
  _update(dt) {
    if (this.phase !== 'playing') return;

    // Wave manager
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

    // Update heroes
    for (const h of this.heroes) h.update(dt, this.enemies, this.projectiles);

    // Update castle weapons
    for (const w of this.castleWeapons) w.update(dt, this.enemies, this.weaponProjectiles);

    // Update enemies
    for (const e of this.enemies) e.update(dt, this.heroes, this.castle);

    // Update hero projectiles
    for (const p of this.projectiles) p.update(dt);

    // Update weapon projectiles (catapult needs enemy list for AoE)
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
          this._showToast(`+${e.reward} ⚜  (${e.name} slain)`, 1400);
        }
      }
    }

    // Prune dead entities
    this.enemies           = this.enemies.filter(e => e.alive);
    this.projectiles       = this.projectiles.filter(p => p.alive);
    this.weaponProjectiles = this.weaponProjectiles.filter(p => p.alive);
    this.heroes            = this.heroes.filter(h => h.alive);

    this._updateHeader();

    if (this.waveMgr.complete && this.enemies.length === 0) this._triggerVictory();
    if (!this.castle.alive)                                  this._triggerDefeat();
  }

  // ─── Screens ──────────────────────────────────────
  _triggerVictory() {
    this.phase   = 'victory';
    this.running = false;
    document.getElementById('stat-kills').textContent = this.killCount;
    document.getElementById('stat-gold').textContent  = this.gold;
    document.getElementById('stat-hp').textContent    = Math.ceil(this.castle.hp);
    this._showScreen('victory-screen');
  }

  _triggerDefeat() {
    this.phase   = 'defeat';
    this.running = false;
    this._showScreen('defeat-screen');
  }

  // ─── Hero placement ───────────────────────────────
  _selectHero(type) {
    // Selecting a hero cancels any open upgrade panel
    this._closeUpgradePanel();
    this.selectedHeroType = this.selectedHeroType === type ? null : type;
    this._updateHeroPanel();
  }

  _tryPlace(col, row) {
    if (!this.selectedHeroType) return;
    const cfg = HEROES[this.selectedHeroType];
    if (this.gold < cfg.cost)    { this._showToast('Not enough gold!', 1600); return; }
    if (col < 0 || col >= CFG.COLS || row < 0 || row >= CFG.ROWS) return;
    if (this.heroes.some(h => h.alive && h.col === col && h.lane === row)) {
      this._showToast('Cell occupied!', 1200); return;
    }
    this.gold -= cfg.cost;
    this.heroes.push(new Hero(col, row, this.selectedHeroType));
    this.selectedHeroType = null;
    this._updateHeroPanel();
    this._updateHeader();
  }

  _canvasToGrid(cx, cy) {
    const col = Math.floor((cx - CFG.GRID_X) / CFG.CELL_W);
    let row = -1;
    for (let r = 0; r < CFG.ROWS; r++) {
      const top = CFG.LANE_Y[r] - CFG.CELL_H / 2;
      if (cy >= top && cy < top + CFG.CELL_H) { row = r; break; }
    }
    return { col, row };
  }

  // ─── Weapon slot interaction ───────────────────────
  _handleWeaponSlotClick(cx, cy) {
    for (const slot of CFG.WEAPON_SLOTS) {
      const dx = cx - slot.x, dy = cy - slot.y;
      if (Math.sqrt(dx * dx + dy * dy) > slot.r + 10) continue;

      const weapon = this.castleWeapons.find(w => w.slotId === slot.id);
      if (!weapon) {
        // Deploy weapon
        const cost = CASTLE_WEAPONS[slot.weaponType].cost;
        if (this.gold < cost) { this._showToast('Not enough gold!', 1600); return; }
        this.gold -= cost;
        this.castleWeapons.push(new CastleWeapon(slot.id));
        this._updateHeader();
        this._showToast(`${CASTLE_WEAPONS[slot.weaponType].name} deployed!`, 1400);
      } else {
        // Open upgrade panel
        this.activeUpgradeSlot = slot.id;
        this._openUpgradePanel(weapon);
      }
      return;
    }
  }

  // ─── Upgrade panel (DOM) ─────────────────────────
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
      actDiv.classList.add('hidden');
      maxDiv.classList.remove('hidden');
    } else {
      actDiv.classList.remove('hidden');
      maxDiv.classList.add('hidden');
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
    // Refresh panel
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

      // Castle area click
      if (cx < CFG.CASTLE_W + 10) {
        this.selectedHeroType = null;
        this._updateHeroPanel();
        this._handleWeaponSlotClick(cx, cy);
        return;
      }

      // Grid area click
      if (this.selectedHeroType) {
        const { col, row } = this._canvasToGrid(cx, cy);
        if (row >= 0) {
          this._tryPlace(col, row);
          // Close upgrade panel when placing a hero
          this._closeUpgradePanel();
        }
      } else {
        // Clicking grid with no hero selected closes upgrade panel
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
      card.className   = 'hero-card';
      card.dataset.type = type;
      card.innerHTML   = `
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
    document.getElementById('gold-amount').textContent = this.gold;
    document.getElementById('castle-hp-bar').style.width = `${this.castle.hpFraction * 100}%`;
    document.getElementById('castle-hp-text').textContent = Math.ceil(this.castle.hp);
    this._updateHeroPanel();

    // Refresh upgrade panel button state (gold may have changed)
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
