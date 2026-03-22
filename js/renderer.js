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

  // ─── Main entry ───────────────────────────────────
  draw(state) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CFG.CANVAS_W, CFG.CANVAS_H);

    this._drawBackground(ctx);
    this._drawLanes(ctx);
    this._drawGrid(ctx, state);
    this._drawCastle(ctx, state.castle, state.castleWeapons);
    this._drawWeaponProjectiles(ctx, state.weaponProjectiles);
    this._drawHeroProjectiles(ctx, state.projectiles);
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

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 137.508 + 23) % CFG.CANVAS_W);
      const sy = ((i * 97.3   + 11) % (CFG.CANVAS_H * 0.42));
      ctx.beginPath();
      ctx.arc(sx, sy, (i % 3 === 0) ? 1.2 : 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Moon (right side)
    ctx.fillStyle = '#d0c890';
    ctx.shadowColor = '#d0c89060'; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(840, 38, 22, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Ground
    const ground = ctx.createLinearGradient(0, CFG.CANVAS_H * 0.55, 0, CFG.CANVAS_H);
    ground.addColorStop(0, '#0a1010'); ground.addColorStop(1, '#060a08');
    ctx.fillStyle = ground;
    ctx.fillRect(CFG.CASTLE_W, CFG.CANVAS_H * 0.55, CFG.CANVAS_W - CFG.CASTLE_W, CFG.CANVAS_H);

    // Distant mountains (right half of canvas)
    ctx.fillStyle = '#0c1520';
    ctx.beginPath();
    ctx.moveTo(CFG.CASTLE_W, CFG.CANVAS_H * 0.55);
    const mPts = [
      CFG.CASTLE_W, 200, 300, 130, 380, 165, 460, 100,
      540, 140, 620, 90, 700, 120, 800, 80, CFG.CANVAS_W, 110,
    ];
    for (let i = 0; i < mPts.length; i += 2) ctx.lineTo(mPts[i], mPts[i + 1]);
    ctx.lineTo(CFG.CANVAS_W, CFG.CANVAS_H * 0.55);
    ctx.closePath(); ctx.fill();
  },

  // ─── Lane tracks ─────────────────────────────────
  _drawLanes(ctx) {
    for (let row = 0; row < CFG.ROWS; row++) {
      const cy  = CFG.LANE_Y[row];
      const top = cy - CFG.CELL_H / 2;

      // Lane background
      const grad = ctx.createLinearGradient(0, top, 0, top + CFG.CELL_H);
      grad.addColorStop(0,   'rgba(20,30,50,0.6)');
      grad.addColorStop(0.5, 'rgba(15,22,38,0.8)');
      grad.addColorStop(1,   'rgba(10,15,28,0.6)');
      ctx.fillStyle = grad;
      ctx.fillRect(CFG.CASTLE_W, top, CFG.CANVAS_W - CFG.CASTLE_W, CFG.CELL_H);

      // Worn path strip
      const pathGrad = ctx.createLinearGradient(0, cy - 12, 0, cy + 12);
      pathGrad.addColorStop(0,   'rgba(40,30,15,0.3)');
      pathGrad.addColorStop(0.5, 'rgba(55,42,22,0.4)');
      pathGrad.addColorStop(1,   'rgba(40,30,15,0.3)');
      ctx.fillStyle = pathGrad;
      ctx.fillRect(CFG.CASTLE_W, cy - 18, CFG.CANVAS_W - CFG.CASTLE_W, 36);

      // Lane borders
      ctx.strokeStyle = 'rgba(60,80,120,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(CFG.CASTLE_W, top); ctx.lineTo(CFG.CANVAS_W, top); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(CFG.CASTLE_W, top + CFG.CELL_H); ctx.lineTo(CFG.CANVAS_W, top + CFG.CELL_H); ctx.stroke();
    }
  },

  // ─── Hero placement grid ─────────────────────────
  _drawGrid(ctx, state) {
    const { selectedHeroType, heroes, gold } = state;
    for (let row = 0; row < CFG.ROWS; row++) {
      for (let col = 0; col < CFG.COLS; col++) {
        const cx = CFG.GRID_X + col * CFG.CELL_W + CFG.CELL_W / 2;
        const cy = CFG.LANE_Y[row];
        const occupied = heroes.some(h => h.alive && h.col === col && h.lane === row);
        if (occupied) continue;

        if (selectedHeroType) {
          const canAfford = gold >= HEROES[selectedHeroType].cost;
          if (canAfford) {
            ctx.strokeStyle = 'rgba(180,150,50,0.4)'; ctx.lineWidth = 1;
            ctx.setLineDash([3, 4]);
            ctx.strokeRect(
              CFG.GRID_X + col * CFG.CELL_W + 4,
              cy - CFG.CELL_H / 2 + 4,
              CFG.CELL_W - 8, CFG.CELL_H - 8
            );
            ctx.setLineDash([]);
          }
        } else {
          ctx.fillStyle = 'rgba(80,100,140,0.12)';
          ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();
        }
      }
    }
  },

  // ─── Castle (LEFT side, 0 → CASTLE_W) ────────────
  _drawCastle(ctx, castle, castleWeapons) {
    const W = CFG.CASTLE_W;  // 180
    const H = CFG.CANVAS_H;
    const flash = castle.hitFlash > 0 ? Math.min(castle.hitFlash / 0.35, 1) : 0;

    // Stone body
    const wallGrad = ctx.createLinearGradient(0, 0, W, 0);
    wallGrad.addColorStop(0,   `rgba(${25 + flash*70},${22},${20},1)`);
    wallGrad.addColorStop(0.6, `rgba(${42 + flash*80},${38},${35},1)`);
    wallGrad.addColorStop(1,   `rgba(${35 + flash*60},${32},${30},1)`);
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, W, H);

    // Stone texture — horizontal mortar
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 1;
    for (let y = 24; y < H; y += 24) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    // Vertical mortar (offset per row)
    for (let y = 24; y < H; y += 24) {
      const offset = Math.floor(y / 24) % 2 === 0 ? 0 : 22;
      for (let bx = offset; bx < W; bx += 44) {
        ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx, y + 24); ctx.stroke();
      }
    }

    // Left tower strip
    ctx.fillStyle = flash > 0.15 ? `rgba(${55+flash*70},38,34,0.9)` : 'rgba(28,24,22,0.7)';
    ctx.fillRect(0, 0, 28, H);

    // Right edge shadow (facing battlefield)
    const edge = ctx.createLinearGradient(W - 22, 0, W, 0);
    edge.addColorStop(0, 'rgba(0,0,0,0)');
    edge.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = edge;
    ctx.fillRect(W - 22, 0, 22, H);

    // Battlements on the RIGHT face (facing enemy)
    const mW = 16, mH = 22, gap = 12;
    ctx.fillStyle = flash > 0.2 ? `rgba(${60+flash*70},48,44,1)` : '#38302e';
    for (let my = 10; my < H; my += mW + gap) {
      ctx.fillRect(W - 3, my, 12, mW);
    }

    // Gate arch (lower-center of the right face) — passage for heroes
    const gateY = Math.round(H / 2) - 50;
    const gateH = 80, gateW = 36;
    ctx.fillStyle = '#060808';
    ctx.beginPath();
    ctx.moveTo(W, gateY + gateH);
    ctx.lineTo(W, gateY + gateW / 2);
    ctx.arc(W - gateW / 2, gateY + gateW / 2, gateW / 2, 0, Math.PI, true);
    ctx.lineTo(W - gateW, gateY + gateH);
    ctx.closePath();
    ctx.fill();

    // ─ Castle HP bar ─
    const barW = 140, barH = 11;
    const barX = (W - barW) / 2;
    const barY = 14;
    ctx.fillStyle = '#111'; ctx.fillRect(barX, barY, barW, barH);
    const hpColor = castle.hpFraction > 0.5 ? '#2a8a3a'
                  : castle.hpFraction > 0.25 ? '#c08020' : '#c0302a';
    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, barY, barW * castle.hpFraction, barH);
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = '#e8d5a3'; ctx.font = '9px Cinzel, serif'; ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(castle.hp)} / ${castle.maxHp}`, W / 2, barY + barH + 10);

    // ─ Weapon slots ─
    for (const slot of CFG.WEAPON_SLOTS) {
      const weapon = castleWeapons.find(w => w.slotId === slot.id);
      this._drawWeaponSlot(ctx, slot, weapon);
    }
  },

  _drawWeaponSlot(ctx, slot, weapon) {
    const { x, y, r, weaponType } = slot;
    const wCfg = CASTLE_WEAPONS[weaponType];

    if (!weapon) {
      // Empty slot — dashed circle with "+" and cost
      ctx.strokeStyle = 'rgba(160,130,50,0.5)'; ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);

      // Icon
      ctx.fillStyle = 'rgba(160,130,50,0.35)';
      ctx.font = `${r - 4}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(wCfg.emoji, x, y);
      ctx.textBaseline = 'alphabetic';

      // Cost badge below
      ctx.fillStyle = 'rgba(10,15,28,0.8)';
      ctx.fillRect(x - 18, y + r + 2, 36, 13);
      ctx.fillStyle = '#c9a040'; ctx.font = '9px Cinzel, serif';
      ctx.fillText(`⚜${wCfg.cost}`, x, y + r + 12);
    } else {
      // Deployed weapon
      const wcfg2 = CASTLE_WEAPONS[weapon.type];
      ctx.shadowColor = wcfg2.strokeColor; ctx.shadowBlur = 10;
      ctx.fillStyle   = wcfg2.color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = wcfg2.strokeColor; ctx.lineWidth = 2; ctx.stroke();
      ctx.shadowBlur  = 0;

      // Emoji
      ctx.font = `${r - 2}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(wcfg2.emoji, x, y);
      ctx.textBaseline = 'alphabetic';

      // Level badge
      ctx.fillStyle = 'rgba(10,15,28,0.85)';
      ctx.fillRect(x - 14, y + r + 2, 28, 13);
      ctx.fillStyle = '#c9a040'; ctx.font = '9px Cinzel, serif';
      ctx.fillText(`Lv ${weapon.level}`, x, y + r + 12);

      // Upgrade indicator (small ring if upgrades available)
      if (!weapon.isMaxLevel) {
        ctx.strokeStyle = '#c9922c'; ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 3]);
        ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  },

  // ─── Weapon projectiles ───────────────────────────
  _drawWeaponProjectiles(ctx, projs) {
    for (const p of projs) {
      if (!p.alive) continue;
      if (p.isCatapult) {
        // Boulder — large brown rock with motion blur
        ctx.shadowColor = '#80601080'; ctx.shadowBlur = 8;
        ctx.fillStyle   = '#7a5818';
        ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#b08030'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.shadowBlur  = 0;
        // Impact marker at target (faint)
        ctx.strokeStyle = 'rgba(200,80,0,0.2)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.tx, p.ty, p.aoeRadius, 0, Math.PI * 2); ctx.stroke();
      } else {
        // Fire ball
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 7);
        grad.addColorStop(0,   '#ffffa0');
        grad.addColorStop(0.4, '#ff6020');
        grad.addColorStop(1,   'rgba(200,30,0,0)');
        ctx.shadowColor = '#ff5000'; ctx.shadowBlur = 14;
        ctx.fillStyle   = grad;
        ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur  = 0;
      }
    }
  },

  // ─── Hero projectiles ─────────────────────────────
  _drawHeroProjectiles(ctx, projectiles) {
    for (const p of projectiles) {
      if (!p.alive) continue;
      ctx.shadowColor = p.color; ctx.shadowBlur = 10;
      ctx.fillStyle   = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle   = '#ffffff88';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius * 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur  = 0;
    }
  },

  // ─── Heroes ───────────────────────────────────────
  _drawHeroes(ctx, heroes) {
    for (const h of heroes) { if (h.alive) this._drawHero(ctx, h); }
  },

  _drawHero(ctx, hero) {
    const { x, y, color, strokeColor, hitFlash, hp, maxHp, range } = hero;
    const r = 22;

    ctx.strokeStyle = `${strokeColor}28`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, range, 0, Math.PI * 2); ctx.stroke();

    ctx.shadowColor = hitFlash > 0 ? '#ff6060' : strokeColor;
    ctx.shadowBlur  = hitFlash > 0 ? 18 : 8;
    ctx.fillStyle   = hitFlash > 0 ? '#ff4040' : color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hitFlash > 0 ? '#ff8080' : strokeColor; ctx.lineWidth = 2; ctx.stroke();
    ctx.shadowBlur  = 0;

    ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(hero.emoji, x, y);
    ctx.textBaseline = 'alphabetic';

    this._drawHpBar(ctx, x, y - r - 8, 44, 5, hp / maxHp, '#3ab84e', '#c03030');
  },

  // ─── Enemies ──────────────────────────────────────
  _drawEnemies(ctx, enemies) {
    for (const e of enemies) { if (e.alive) this._drawEnemy(ctx, e); }
  },

  _drawEnemy(ctx, enemy) {
    const { x, y, radius, color, strokeColor, hitFlash, hp, maxHp, blocked } = enemy;

    ctx.shadowColor = hitFlash > 0 ? '#ffaa00' : strokeColor;
    ctx.shadowBlur  = hitFlash > 0 ? 20 : 6;
    ctx.fillStyle   = hitFlash > 0 ? '#ff9900' : color;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = hitFlash > 0 ? '#ffcc44' : strokeColor; ctx.lineWidth = 2; ctx.stroke();
    ctx.shadowBlur  = 0;

    const fontSize = Math.max(10, radius - 4);
    ctx.font = `${fontSize}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(enemy.emoji, x, y);
    ctx.textBaseline = 'alphabetic';

    if (blocked) {
      ctx.fillStyle = '#ff4040';
      ctx.beginPath(); ctx.arc(x + radius - 4, y - radius + 4, 4, 0, Math.PI * 2); ctx.fill();
    }

    this._drawHpBar(ctx, x, y - radius - 8, radius * 2 + 8, 4, hp / maxHp, '#8abf40', '#804020');
  },

  // ─── HP bar ───────────────────────────────────────
  _drawHpBar(ctx, cx, barTopY, width, height, fraction, colorFull, colorLow) {
    const bx = cx - width / 2;
    ctx.fillStyle = '#111'; ctx.fillRect(bx, barTopY, width, height);
    ctx.fillStyle = fraction > 0.5 ? colorFull : fraction > 0.25 ? '#c0a020' : colorLow;
    ctx.fillRect(bx, barTopY, width * Math.max(0, fraction), height);
    ctx.strokeStyle = '#33333380'; ctx.lineWidth = 0.5; ctx.strokeRect(bx, barTopY, width, height);
  },

  // ─── Overlays ────────────────────────────────────
  _drawOverlays(ctx, state) {
    const { waveMgr, waveAnnounce, selectedHeroType, placementCursor } = state;

    // Wave countdown banner
    if (waveMgr.inCountdown && !waveMgr.complete) {
      const nextW = waveMgr.waveIndex + 2;
      if (nextW <= waveMgr.totalWaves) {
        this._drawCountdownBanner(ctx, `Wave ${nextW} incoming in ${waveMgr.countdownSecs}…`);
      }
    }

    // Wave announce flash
    if (waveAnnounce && waveAnnounce.alpha > 0) {
      ctx.globalAlpha = Math.min(waveAnnounce.alpha, 1);
      ctx.fillStyle   = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, CFG.CANVAS_H / 2 - 36, CFG.CANVAS_W, 72);
      ctx.fillStyle   = '#e8c060'; ctx.font = 'bold 22px Cinzel, serif'; ctx.textAlign = 'center';
      ctx.fillText(waveAnnounce.text, CFG.CANVAS_W / 2, CFG.CANVAS_H / 2 + 8);
      ctx.globalAlpha = 1;
    }

    // Placement ghost cursor
    if (placementCursor && selectedHeroType) {
      const { mx, my } = placementCursor;
      const cfg = HEROES[selectedHeroType];
      ctx.globalAlpha = 0.45;
      ctx.fillStyle   = cfg.color;
      ctx.beginPath(); ctx.arc(mx, my, 22, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = cfg.strokeColor; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff'; ctx.fillText(cfg.emoji, mx, my);
      ctx.textBaseline = 'alphabetic';
      ctx.globalAlpha = 1;
    }
  },

  _drawCountdownBanner(ctx, text) {
    ctx.fillStyle = 'rgba(8,13,24,0.72)';
    ctx.fillRect(0, CFG.CANVAS_H - 40, CFG.CANVAS_W, 40);
    ctx.strokeStyle = 'rgba(100,80,30,0.5)'; ctx.lineWidth = 1;
    ctx.strokeRect(0, CFG.CANVAS_H - 40, CFG.CANVAS_W, 40);
    ctx.fillStyle = '#c9922c'; ctx.font = '14px Cinzel, serif'; ctx.textAlign = 'center';
    ctx.fillText(text, CFG.CANVAS_W / 2, CFG.CANVAS_H - 14);
  },
};
