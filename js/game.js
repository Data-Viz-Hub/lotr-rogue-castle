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
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(t => this._loop(t));
  }

  // ─── Internal reset ───────────────────────────────
  _reset() {
    this.running  = false;
    this.phase    = 'playing'; // playing | victory | defeat

    // Scene data (Chapter 1, Scene 1)
    const scene    = CHAPTERS[0].scenes[0];
    this.waveMgr   = new WaveManager(scene.waves);

    this.heroes      = [];
    this.enemies     = [];
    this.projectiles = [];
    this.castle      = new Castle();
    this.gold        = CFG.STARTING_GOLD;
    this.killCount   = 0;

    this.selectedHeroType = null;
    this.placementCursor  = null;
    this.waveAnnounce     = null;

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
      heroes:           this.heroes,
      enemies:          this.enemies,
      projectiles:      this.projectiles,
      castle:           this.castle,
      gold:             this.gold,
      waveMgr:          this.waveMgr,
      phase:            this.phase,
      selectedHeroType: this.selectedHeroType,
      placementCursor:  this.placementCursor,
      waveAnnounce:     this.waveAnnounce,
    };
  }

  // ─── Update ───────────────────────────────────────
  _update(dt) {
    if (this.phase !== 'playing') return;

    // Wave manager
    const liveEnemies = this.enemies.filter(e => e.alive).length;
    const spawns = this.waveMgr.update(dt, liveEnemies);

    for (const s of spawns) {
      this.enemies.push(new Enemy(s.lane, s.type));
    }

    // Track wave change for announce banner
    if (spawns.length > 0 && !this.waveMgr.inCountdown) {
      const label = this.waveMgr.currentWaveLabel;
      if (label && (!this.waveAnnounce || this.waveAnnounce.text !== label)) {
        this.waveAnnounce = { text: label, alpha: 2.5 };
        this._updateWaveLabel();
      }
    }

    // Fade wave announce
    if (this.waveAnnounce) {
      this.waveAnnounce.alpha -= dt * 1.1;
    }

    // Update heroes
    for (const h of this.heroes) {
      h.update(dt, this.enemies, this.projectiles);
    }

    // Update enemies
    for (const e of this.enemies) {
      e.update(dt, this.heroes, this.castle);
    }

    // Update projectiles
    for (const p of this.projectiles) {
      p.update(dt);
    }

    // Collect gold from killed enemies
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

    // Prune dead entities (rewards already collected above, safe to remove all dead)
    this.enemies      = this.enemies.filter(e => e.alive);
    this.projectiles  = this.projectiles.filter(p => p.alive);
    this.heroes       = this.heroes.filter(h => h.alive);

    this._updateHeader();

    // Victory check
    if (this.waveMgr.complete && this.enemies.filter(e => e.alive).length === 0) {
      this._triggerVictory();
    }

    // Defeat check
    if (!this.castle.alive) {
      this._triggerDefeat();
    }
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
    this.selectedHeroType = this.selectedHeroType === type ? null : type;
    this._updateHeroPanel();
  }

  _tryPlace(col, row) {
    if (!this.selectedHeroType) return;
    const cfg = HEROES[this.selectedHeroType];

    if (this.gold < cfg.cost) {
      this._showToast('Not enough gold!', 1600);
      return;
    }
    if (col < 0 || col >= CFG.COLS || row < 0 || row >= CFG.ROWS) return;
    if (this.heroes.some(h => h.alive && h.col === col && h.lane === row)) {
      this._showToast('Cell occupied!', 1200);
      return;
    }

    this.gold -= cfg.cost;
    const hero = new Hero(col, row, this.selectedHeroType);
    this.heroes.push(hero);
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

  // ─── Input ────────────────────────────────────────
  _bindInput() {
    const canvas = this.canvas;

    canvas.addEventListener('click', e => {
      if (this.phase !== 'playing') return;
      if (!this.selectedHeroType) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CFG.CANVAS_W / rect.width;
      const scaleY = CFG.CANVAS_H / rect.height;
      const cx = (e.clientX - rect.left) * scaleX;
      const cy = (e.clientY - rect.top)  * scaleY;
      const { col, row } = this._canvasToGrid(cx, cy);
      if (row >= 0 && cx < CFG.CASTLE_X) {
        this._tryPlace(col, row);
      }
    });

    canvas.addEventListener('mousemove', e => {
      if (!this.selectedHeroType) { this.placementCursor = null; return; }
      const rect = canvas.getBoundingClientRect();
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
      this._updateHeroPanel();
    });
  }

  // ─── UI helpers ───────────────────────────────────
  _buildHeroPanel() {
    const container = document.getElementById('hero-cards');
    container.innerHTML = '';

    for (const [type, cfg] of Object.entries(HEROES)) {
      const card = document.createElement('div');
      card.className  = 'hero-card';
      card.dataset.type = type;
      card.innerHTML = `
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
    const cards = document.querySelectorAll('.hero-card');
    cards.forEach(card => {
      const type = card.dataset.type;
      const cfg  = HEROES[type];
      card.classList.toggle('selected',  type === this.selectedHeroType);
      card.classList.toggle('disabled',  this.gold < cfg.cost && type !== this.selectedHeroType);
    });
  }

  _updateHeader() {
    document.getElementById('gold-amount').textContent = this.gold;
    const bar  = document.getElementById('castle-hp-bar');
    const text = document.getElementById('castle-hp-text');
    bar.style.width = `${this.castle.hpFraction * 100}%`;
    text.textContent = Math.ceil(this.castle.hp);
    this._updateHeroPanel();
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
