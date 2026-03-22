/* ═══════════════════════════════════════════════════
   renderer.js — All canvas drawing
═══════════════════════════════════════════════════ */

'use strict';

const Renderer = {

  init(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    canvas.width  = CFG.CANVAS_W;
    canvas.height = CFG.CANVAS_H;
  },

  // ─── Main draw entry ──────────────────────────────
  draw(state) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CFG.CANVAS_W, CFG.CANVAS_H);

    this._drawBackground(ctx);
    this._drawLanes(ctx);
    this._drawGrid(ctx, state);
    this._drawCastle(ctx, state.castle);
    this._drawProjectiles(ctx, state.projectiles);
    this._drawHeroes(ctx, state.heroes);
    this._drawEnemies(ctx, state.enemies);
    this._drawOverlays(ctx, state);
  },

  // ─── Background ───────────────────────────────────
  _drawBackground(ctx) {
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, CFG.CANVAS_H * 0.6);
    sky.addColorStop(0,   '#06091a');
    sky.addColorStop(0.5, '#0c1428');
    sky.addColorStop(1,   '#141e35');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CFG.CANVAS_W, CFG.CANVAS_H);

    // Stars (static, seeded by position)
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 137.508 + 23) % CFG.CANVAS_W);
      const sy = ((i * 97.3   + 11) % (CFG.CANVAS_H * 0.45));
      const sr = (i % 3 === 0) ? 1.2 : 0.7;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Moon
    ctx.fillStyle = '#d0c890';
    ctx.shadowColor = '#d0c89060';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(820, 38, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Ground gradient
    const ground = ctx.createLinearGradient(0, CFG.CANVAS_H * 0.55, 0, CFG.CANVAS_H);
    ground.addColorStop(0, '#0a1010');
    ground.addColorStop(1, '#060a08');
    ctx.fillStyle = ground;
    ctx.fillRect(0, CFG.CANVAS_H * 0.55, CFG.CANVAS_W, CFG.CANVAS_H);

    // Distant mountains silhouette
    ctx.fillStyle = '#0c1520';
    ctx.beginPath();
    ctx.moveTo(0, CFG.CANVAS_H * 0.55);
    const mPts = [0,180, 60,120, 110,155, 170,100, 230,145, 300,95, 360,130,
                  440,85, 510,120, 580,90, 640,118, 700,80, CFG.CASTLE_X,60];
    for (let i = 0; i < mPts.length; i += 2) {
      ctx.lineTo(mPts[i], mPts[i+1]);
    }
    ctx.lineTo(CFG.CASTLE_X, CFG.CANVAS_H * 0.55);
    ctx.closePath();
    ctx.fill();
  },

  // ─── Lane tracks ─────────────────────────────────
  _drawLanes(ctx) {
    for (let row = 0; row < CFG.ROWS; row++) {
      const cy = CFG.LANE_Y[row];
      const top = cy - CFG.CELL_H / 2;

      // Lane background
      const grad = ctx.createLinearGradient(0, top, 0, top + CFG.CELL_H);
      grad.addColorStop(0,   'rgba(20,30,50,0.6)');
      grad.addColorStop(0.5, 'rgba(15,22,38,0.8)');
      grad.addColorStop(1,   'rgba(10,15,28,0.6)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, top, CFG.CASTLE_X, CFG.CELL_H);

      // Lane path (worn dirt track)
      const pathGrad = ctx.createLinearGradient(0, cy - 12, 0, cy + 12);
      pathGrad.addColorStop(0,   'rgba(40,30,15,0.3)');
      pathGrad.addColorStop(0.5, 'rgba(55,42,22,0.4)');
      pathGrad.addColorStop(1,   'rgba(40,30,15,0.3)');
      ctx.fillStyle = pathGrad;
      ctx.fillRect(0, cy - 18, CFG.CASTLE_X, 36);

      // Top/bottom lane border lines
      ctx.strokeStyle = 'rgba(60,80,120,0.35)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(0, top);
      ctx.lineTo(CFG.CASTLE_X, top);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, top + CFG.CELL_H);
      ctx.lineTo(CFG.CASTLE_X, top + CFG.CELL_H);
      ctx.stroke();
    }
  },

  // ─── Placement grid ───────────────────────────────
  _drawGrid(ctx, state) {
    const { selectedHeroType, heroes, gold } = state;

    for (let row = 0; row < CFG.ROWS; row++) {
      for (let col = 0; col < CFG.COLS; col++) {
        const cx = CFG.GRID_X + col * CFG.CELL_W + CFG.CELL_W / 2;
        const cy = CFG.LANE_Y[row];
        const occupied = heroes.some(h => h.alive && h.col === col && h.lane === row);

        if (occupied) continue; // Don't draw grid dot on occupied cells

        if (selectedHeroType) {
          const cfg = HEROES[selectedHeroType];
          const canAfford = gold >= cfg.cost;
          if (canAfford) {
            // Highlight available cells
            ctx.strokeStyle = 'rgba(180,150,50,0.4)';
            ctx.lineWidth   = 1;
            ctx.setLineDash([3, 4]);
            ctx.strokeRect(
              CFG.GRID_X + col * CFG.CELL_W + 4,
              cy - CFG.CELL_H / 2 + 4,
              CFG.CELL_W - 8,
              CFG.CELL_H - 8
            );
            ctx.setLineDash([]);
          }
        } else {
          // Faint grid markers
          ctx.fillStyle = 'rgba(80,100,140,0.12)';
          ctx.beginPath();
          ctx.arc(cx, cy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  },

  // ─── Castle ───────────────────────────────────────
  _drawCastle(ctx, castle) {
    const x = CFG.CASTLE_X;
    const w = CFG.CASTLE_W;
    const h = CFG.CANVAS_H;

    // Flash tint on hit
    const flash = castle.hitFlash > 0 ? Math.min(castle.hitFlash / 0.3, 1) : 0;

    // Stone wall base
    const wallGrad = ctx.createLinearGradient(x, 0, x + w, 0);
    wallGrad.addColorStop(0, `rgba(${40 + flash*80},${38 + flash*10},${35},1)`);
    wallGrad.addColorStop(1, `rgba(${30 + flash*80},${28},${26},1)`);
    ctx.fillStyle = wallGrad;
    ctx.fillRect(x, 0, w, h);

    // Stone texture — horizontal mortar lines
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth   = 1;
    for (let y = 30; y < h; y += 22) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      ctx.stroke();
    }
    // Vertical mortar (offset per row)
    for (let y = 30; y < h; y += 22) {
      const rowOffset = Math.floor(y / 22) % 2 === 0 ? 0 : 20;
      for (let bx = x + rowOffset; bx < x + w; bx += 40) {
        ctx.beginPath();
        ctx.moveTo(bx, y);
        ctx.lineTo(bx, y + 22);
        ctx.stroke();
      }
    }

    // Gate arch
    const gateX = x + 28;
    const gateW = 60;
    const gateH = 100;
    const gateTop = h - gateH;
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.moveTo(gateX, h);
    ctx.lineTo(gateX, gateTop + gateW / 2);
    ctx.arc(gateX + gateW / 2, gateTop + gateW / 2, gateW / 2, Math.PI, 0);
    ctx.lineTo(gateX + gateW, h);
    ctx.closePath();
    ctx.fill();

    // Battlements (merlons) at top
    ctx.fillStyle = flash > 0.2 ? `rgba(${60+flash*80},50,46,1)` : '#3c3230';
    const merlonW = 18, merlonH = 24, gap = 14;
    for (let mx = x + 5; mx < x + w - merlonW; mx += merlonW + gap) {
      ctx.fillRect(mx, 0, merlonW, merlonH);
    }

    // Left edge shadow
    const edgeShadow = ctx.createLinearGradient(x, 0, x + 20, 0);
    edgeShadow.addColorStop(0, 'rgba(0,0,0,0.6)');
    edgeShadow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = edgeShadow;
    ctx.fillRect(x, 0, 20, h);

    // Castle HP bar (on the wall)
    const barW = 160, barH = 12;
    const barX = x + (w - barW) / 2;
    const barY = 30;
    ctx.fillStyle = '#111';
    ctx.fillRect(barX, barY, barW, barH);
    const hpColor = castle.hpFraction > 0.5 ? '#2a8a3a'
                  : castle.hpFraction > 0.25 ? '#c08020' : '#c0302a';
    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, barY, barW * castle.hpFraction, barH);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // HP text
    ctx.fillStyle = '#e8d5a3';
    ctx.font      = '10px Cinzel, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(castle.hp)} / ${castle.maxHp}`, x + w / 2, barY + barH + 12);
  },

  // ─── Heroes ───────────────────────────────────────
  _drawHeroes(ctx, heroes) {
    for (const hero of heroes) {
      if (!hero.alive) continue;
      this._drawHero(ctx, hero);
    }
  },

  _drawHero(ctx, hero) {
    const { x, y, color, strokeColor, hitFlash, hp, maxHp, range, type } = hero;
    const r = 22;

    // Range ring (subtle) — only when selected type matches
    // (drawn faintly always so player can see coverage)
    ctx.strokeStyle = `${strokeColor}28`;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(x, y, range, 0, Math.PI * 2);
    ctx.stroke();

    // Body glow
    ctx.shadowColor = hitFlash > 0 ? '#ff6060' : strokeColor;
    ctx.shadowBlur  = hitFlash > 0 ? 18 : 8;

    // Body circle
    ctx.fillStyle = hitFlash > 0 ? '#ff4040' : color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = hitFlash > 0 ? '#ff8080' : strokeColor;
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // Emoji icon
    ctx.font      = '16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hero.emoji, x, y);
    ctx.textBaseline = 'alphabetic';

    // HP bar
    this._drawHpBar(ctx, x, y - r - 8, 44, 5, hp / maxHp, '#3ab84e', '#c03030');
  },

  // ─── Enemies ──────────────────────────────────────
  _drawEnemies(ctx, enemies) {
    for (const e of enemies) {
      if (!e.alive) continue;
      this._drawEnemy(ctx, e);
    }
  },

  _drawEnemy(ctx, enemy) {
    const { x, y, radius, color, strokeColor, hitFlash, hp, maxHp, blocked } = enemy;

    ctx.shadowColor = hitFlash > 0 ? '#ffaa00' : strokeColor;
    ctx.shadowBlur  = hitFlash > 0 ? 20 : 6;

    ctx.fillStyle = hitFlash > 0 ? '#ff9900' : color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = hitFlash > 0 ? '#ffcc44' : strokeColor;
    ctx.lineWidth   = 2;
    ctx.stroke();
    ctx.shadowBlur  = 0;

    // Emoji
    const fontSize = Math.max(10, radius - 4);
    ctx.font      = `${fontSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(enemy.emoji, x, y);
    ctx.textBaseline = 'alphabetic';

    // Attack animation dot when blocked
    if (blocked) {
      ctx.fillStyle = '#ff4040';
      ctx.beginPath();
      ctx.arc(x + radius - 4, y - radius + 4, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // HP bar
    this._drawHpBar(ctx, x, y - radius - 8, radius * 2 + 8, 4, hp / maxHp, '#8abf40', '#804020');
  },

  // ─── Projectiles ──────────────────────────────────
  _drawProjectiles(ctx, projectiles) {
    for (const p of projectiles) {
      if (!p.alive) continue;

      ctx.shadowColor = p.color;
      ctx.shadowBlur  = 10;
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      // Bright core
      ctx.fillStyle = '#ffffff88';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  },

  // ─── Shared HP bar ────────────────────────────────
  _drawHpBar(ctx, cx, barTopY, width, height, fraction, colorFull, colorLow) {
    const bx = cx - width / 2;
    ctx.fillStyle = '#111';
    ctx.fillRect(bx, barTopY, width, height);
    const color = fraction > 0.5 ? colorFull
                : fraction > 0.25 ? '#c0a020' : colorLow;
    ctx.fillStyle = color;
    ctx.fillRect(bx, barTopY, width * Math.max(0, fraction), height);
    ctx.strokeStyle = '#33333380';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(bx, barTopY, width, height);
  },

  // ─── Overlays (countdown, wave announce) ──────────
  _drawOverlays(ctx, state) {
    const { waveMgr, phase } = state;

    // Wave countdown
    if (waveMgr.inCountdown && !waveMgr.complete) {
      const secs = waveMgr.countdownSecs;
      const nextWave = waveMgr.waveIndex + 2; // 1-based next wave
      if (nextWave <= waveMgr.totalWaves) {
        this._drawCountdownBanner(ctx, `Wave ${nextWave} incoming in ${secs}…`);
      }
    }

    // Wave announce (brief flash at wave start) — handled via state.waveAnnounce
    if (state.waveAnnounce && state.waveAnnounce.alpha > 0) {
      const wa = state.waveAnnounce;
      ctx.globalAlpha = Math.min(wa.alpha, 1);
      ctx.fillStyle   = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, CFG.CANVAS_H / 2 - 36, CFG.CANVAS_W, 72);
      ctx.fillStyle   = '#e8c060';
      ctx.font        = 'bold 22px Cinzel, serif';
      ctx.textAlign   = 'center';
      ctx.fillText(wa.text, CFG.CANVAS_W / 2, CFG.CANVAS_H / 2 + 8);
      ctx.globalAlpha = 1;
    }

    // Placement ghost: draw a faint hero icon following cursor
    if (state.placementCursor && state.selectedHeroType) {
      const { mx, my } = state.placementCursor;
      const cfg = HEROES[state.selectedHeroType];
      ctx.globalAlpha = 0.45;
      ctx.fillStyle   = cfg.color;
      ctx.beginPath();
      ctx.arc(mx, my, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = cfg.strokeColor;
      ctx.lineWidth   = 2;
      ctx.stroke();
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText(cfg.emoji, mx, my);
      ctx.textBaseline = 'alphabetic';
      ctx.globalAlpha = 1;
    }
  },

  _drawCountdownBanner(ctx, text) {
    ctx.fillStyle = 'rgba(8,13,24,0.7)';
    ctx.fillRect(0, CFG.CANVAS_H - 40, CFG.CANVAS_W, 40);
    ctx.strokeStyle = 'rgba(100,80,30,0.5)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(0, CFG.CANVAS_H - 40, CFG.CANVAS_W, 40);
    ctx.fillStyle   = '#c9922c';
    ctx.font        = '14px Cinzel, serif';
    ctx.textAlign   = 'center';
    ctx.fillText(text, CFG.CANVAS_W / 2, CFG.CANVAS_H - 14);
  },
};
