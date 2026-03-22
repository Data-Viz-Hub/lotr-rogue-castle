/* ═══════════════════════════════════════════════════
   renderer.js — Canvas drawing (single lane, rich visuals)
═══════════════════════════════════════════════════ */

'use strict';

const Renderer = {

  init(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');
    canvas.width  = CFG.CANVAS_W;
    canvas.height = CFG.CANVAS_H;
    this._initPatterns();
  },

  // ─── Pattern cache ────────────────────────────────
  _initPatterns() {
    this.stonePattern  = this._makeStonePattern();
    this.stripePattern = this._makeStripePattern();
  },

  _makeStonePattern() {
    const c = document.createElement('canvas');
    c.width = 40; c.height = 40;
    const cx = c.getContext('2d');
    // Base mortar
    cx.fillStyle = '#111826'; cx.fillRect(0, 0, 40, 40);
    // Stone blocks (2×2 grid with slight colour variation)
    const cols = ['#192036', '#172034', '#1b2238', '#162032'];
    [[1,1,18,18],[21,1,18,18],[1,21,18,18],[21,21,18,18]].forEach(([x,y,w,h], i) => {
      cx.fillStyle = cols[i]; cx.fillRect(x, y, w, h);
    });
    // Subtle highlight on each block
    cx.fillStyle = 'rgba(255,255,255,0.04)';
    cx.fillRect(2, 2, 7, 2); cx.fillRect(22, 22, 7, 2);
    // Mortar lines
    cx.strokeStyle = '#0a1018'; cx.lineWidth = 1.5;
    cx.strokeRect(0, 0, 40, 40);
    cx.beginPath(); cx.moveTo(20, 0); cx.lineTo(20, 40); cx.moveTo(0, 20); cx.lineTo(40, 20); cx.stroke();
    return this.ctx.createPattern(c, 'repeat');
  },

  _makeStripePattern() {
    // Dark diagonal stripes for off-lane areas
    const c = document.createElement('canvas');
    c.width = 18; c.height = 18;
    const cx = c.getContext('2d');
    cx.fillStyle = '#07101c'; cx.fillRect(0, 0, 18, 18);
    cx.fillStyle = '#0b1626';
    // Fill diagonal band
    cx.beginPath();
    cx.moveTo(0,0); cx.lineTo(7,0); cx.lineTo(18,11); cx.lineTo(18,18); cx.lineTo(11,18); cx.lineTo(0,7);
    cx.closePath(); cx.fill();
    return this.ctx.createPattern(c, 'repeat');
  },

  // ─── Main draw entry ──────────────────────────────
  draw(state) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CFG.CANVAS_W, CFG.CANVAS_H);

    this._drawBackground(ctx, state.time);
    this._drawLane(ctx);
    this._drawGrid(ctx, state);
    this._drawCastle(ctx, state.castle, state.castleWeapons, state.heroes, state.time);
    this._drawWeaponProjectiles(ctx, state.weaponProjectiles);
    this._drawHeroProjectiles(ctx, state.projectiles);
    this._drawHeroes(ctx, state.heroes);
    this._drawEnemies(ctx, state.enemies);
    this._drawOverlays(ctx, state);
  },

  // ─── Background ───────────────────────────────────
  _drawBackground(ctx, t = 0) {
    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, CFG.CANVAS_H);
    sky.addColorStop(0,   '#060a1a');
    sky.addColorStop(0.5, '#0a1228');
    sky.addColorStop(1,   '#0e1830');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CFG.CANVAS_W, CFG.CANVAS_H);

    // Stars
    for (let i = 0; i < 70; i++) {
      const sx = (i * 127.3 + 17) % CFG.CANVAS_W;
      const sy = (i * 83.7  + 9)  % (CFG.CANVAS_H * 0.44);
      const twinkle = 0.4 + 0.3 * Math.sin(t * 2 + i);
      ctx.fillStyle = `rgba(255,255,255,${twinkle.toFixed(2)})`;
      ctx.beginPath(); ctx.arc(sx, sy, i % 4 === 0 ? 1.3 : 0.7, 0, Math.PI * 2); ctx.fill();
    }

    // Moon
    ctx.shadowColor = '#c8c080'; ctx.shadowBlur = 22;
    ctx.fillStyle   = '#d8d090';
    ctx.beginPath(); ctx.arc(840, 40, 24, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur  = 0;

    // Off-lane areas: stripe pattern + dark overlay
    ctx.fillStyle = this.stripePattern;
    ctx.fillRect(CFG.CASTLE_W, 0, CFG.CANVAS_W - CFG.CASTLE_W, CFG.LANE_TOP);
    ctx.fillRect(CFG.CASTLE_W, CFG.LANE_BOT, CFG.CANVAS_W - CFG.CASTLE_W, CFG.CANVAS_H - CFG.LANE_BOT);

    // Subtle dark gradient over stripe areas to blend toward sky
    const topFade = ctx.createLinearGradient(0, 0, 0, CFG.LANE_TOP);
    topFade.addColorStop(0, 'rgba(6,10,26,0.85)');
    topFade.addColorStop(1, 'rgba(6,10,26,0)');
    ctx.fillStyle = topFade;
    ctx.fillRect(CFG.CASTLE_W, 0, CFG.CANVAS_W - CFG.CASTLE_W, CFG.LANE_TOP);

    const botFade = ctx.createLinearGradient(0, CFG.LANE_BOT, 0, CFG.CANVAS_H);
    botFade.addColorStop(0, 'rgba(4,7,18,0)');
    botFade.addColorStop(1, 'rgba(4,7,18,0.9)');
    ctx.fillStyle = botFade;
    ctx.fillRect(CFG.CASTLE_W, CFG.LANE_BOT, CFG.CANVAS_W - CFG.CASTLE_W, CFG.CANVAS_H - CFG.LANE_BOT);

    // Distant mountains silhouette (behind lane)
    ctx.fillStyle = '#0c1524';
    ctx.beginPath();
    const mPts = [
      CFG.CASTLE_W, CFG.LANE_TOP,
      260, 115, 340, 145, 430, 95, 510, 130, 600, 90,
      680, 120, 760, 80, 860, 108, CFG.CANVAS_W, 95,
      CFG.CANVAS_W, CFG.LANE_TOP,
    ];
    ctx.moveTo(mPts[0], mPts[1]);
    for (let i = 2; i < mPts.length; i += 2) ctx.lineTo(mPts[i], mPts[i + 1]);
    ctx.closePath(); ctx.fill();
  },

  // ─── Single lane ──────────────────────────────────
  _drawLane(ctx) {
    // Stone cobblestone path
    ctx.fillStyle = this.stonePattern;
    ctx.fillRect(CFG.CASTLE_W, CFG.LANE_TOP, CFG.CANVAS_W - CFG.CASTLE_W, CFG.CELL_H);

    // Top edge vignette (shadow from above)
    const topShad = ctx.createLinearGradient(0, CFG.LANE_TOP, 0, CFG.LANE_TOP + 20);
    topShad.addColorStop(0, 'rgba(0,0,0,0.55)');
    topShad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topShad;
    ctx.fillRect(CFG.CASTLE_W, CFG.LANE_TOP, CFG.CANVAS_W - CFG.CASTLE_W, 20);

    // Bottom edge shadow
    const botShad = ctx.createLinearGradient(0, CFG.LANE_BOT - 20, 0, CFG.LANE_BOT);
    botShad.addColorStop(0, 'rgba(0,0,0,0)');
    botShad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = botShad;
    ctx.fillRect(CFG.CASTLE_W, CFG.LANE_BOT - 20, CFG.CANVAS_W - CFG.CASTLE_W, 20);

    // Top/bottom border lines
    ctx.strokeStyle = '#2a3a50'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(CFG.CASTLE_W, CFG.LANE_TOP); ctx.lineTo(CFG.CANVAS_W, CFG.LANE_TOP); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CFG.CASTLE_W, CFG.LANE_BOT); ctx.lineTo(CFG.CANVAS_W, CFG.LANE_BOT); ctx.stroke();

    // Centre guide line (faint, worn path)
    ctx.strokeStyle = 'rgba(30,45,70,0.5)'; ctx.lineWidth = 1;
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(CFG.CASTLE_W, CFG.LANE_Y[0]);
    ctx.lineTo(CFG.CANVAS_W, CFG.LANE_Y[0]);
    ctx.stroke();
    ctx.setLineDash([]);
  },

  // ─── Hero placement grid ─────────────────────────
  _drawGrid(ctx, state) {
    const { selectedHeroType, heroes, gold } = state;
    for (let col = 0; col < CFG.COLS; col++) {
      const cx  = CFG.GRID_X + col * CFG.CELL_W + CFG.CELL_W / 2;
      const cy  = CFG.LANE_Y[0];
      const occ = heroes.some(h => !h.onCastle && h.alive && h.col === col && h.lane === 0);
      if (occ) continue;

      if (selectedHeroType) {
        const canAfford = gold >= HEROES[selectedHeroType].cost;
        if (canAfford) {
          ctx.strokeStyle = 'rgba(180,150,50,0.5)'; ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 5]);
          ctx.strokeRect(
            CFG.GRID_X + col * CFG.CELL_W + 5,
            cy - CFG.CELL_H / 2 + 5,
            CFG.CELL_W - 10,
            CFG.CELL_H - 10
          );
          ctx.setLineDash([]);
        }
      } else {
        ctx.fillStyle = 'rgba(70,100,140,0.15)';
        ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
      }
    }
  },

  // ─── Castle (left side, faces right) ─────────────
  _drawCastle(ctx, castle, castleWeapons, heroes, t = 0) {
    const W = CFG.CASTLE_W;
    const H = CFG.CANVAS_H;
    const flash = castle.hitFlash > 0 ? Math.min(castle.hitFlash / 0.35, 1) : 0;

    // ── Main stone body ──
    const wallGrad = ctx.createLinearGradient(0, 0, W, 0);
    wallGrad.addColorStop(0,   `rgb(${22 + flash*60},${18},${16})`);
    wallGrad.addColorStop(0.7, `rgb(${38 + flash*80},${34},${30})`);
    wallGrad.addColorStop(1,   `rgb(${30 + flash*50},${26},${24})`);
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, W, H);

    // Stone texture — mortar grid
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 26) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (let y = 0; y < H; y += 26) {
      const off = Math.floor(y / 26) % 2 === 0 ? 0 : 24;
      for (let bx = off; bx < W; bx += 48) {
        ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx, y + 26); ctx.stroke();
      }
    }

    // Left side dark strip (cliff edge)
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, 14, H);

    // ── Battlements on RIGHT face (facing enemy) ──
    const mW = 14, mH = 20;
    ctx.fillStyle = flash > 0.2 ? `rgb(${55+flash*70},42,38)` : '#332e2c';
    for (let my = 4; my < H - mH; my += mW + 10) {
      ctx.fillRect(W - 6, my, 12, mH);
    }

    // Right-face shadow (depth illusion)
    const faceShadow = ctx.createLinearGradient(W - 24, 0, W, 0);
    faceShadow.addColorStop(0, 'rgba(0,0,0,0)');
    faceShadow.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = faceShadow;
    ctx.fillRect(W - 24, 0, 24, H);

    // ── Gate arch at lane level ──
    const gateDepth = 42;
    const gateX     = W - gateDepth;
    const gateW     = gateDepth;
    const laneT     = CFG.LANE_TOP;
    const laneH     = CFG.CELL_H;
    const archR     = gateW / 2;
    const archCY    = laneT + archR;

    ctx.fillStyle = '#030508';
    ctx.beginPath();
    ctx.moveTo(gateX, laneT + laneH);
    ctx.lineTo(gateX, archCY);
    ctx.arc(gateX + archR, archCY, archR, Math.PI, 0);
    ctx.lineTo(gateX + gateW, laneT + laneH);
    ctx.closePath();
    ctx.fill();

    // Gate keystone highlight
    ctx.strokeStyle = 'rgba(140,110,60,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(gateX + archR, archCY, archR, Math.PI, 0);
    ctx.stroke();

    // ── Torches (flickering glow) ──
    const torchPositions = [[18, 100], [18, 380], [W - 22, laneT - 18], [W - 22, laneT + laneH + 18]];
    torchPositions.forEach(([tx, ty], i) => {
      const flicker = 0.65 + 0.35 * Math.sin(t * 5.5 + i * 1.7);
      ctx.shadowColor = `rgba(255,130,20,${(flicker * 0.7).toFixed(2)})`;
      ctx.shadowBlur  = 18 * flicker;
      ctx.fillStyle   = `rgba(255,${Math.round(120 + 60*flicker)},20,0.9)`;
      ctx.beginPath();
      ctx.arc(tx, ty, 4 + flicker, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // ── Castle HP bar ──
    const barW = 136, barH = 10;
    const barX = (W - barW) / 2, barY = 16;
    ctx.fillStyle = '#111'; ctx.fillRect(barX, barY, barW, barH);
    const hpColor = castle.hpFraction > 0.5 ? '#2a8a3a'
                  : castle.hpFraction > 0.25 ? '#c08020' : '#c0302a';
    ctx.fillStyle = hpColor;
    ctx.fillRect(barX, barY, barW * castle.hpFraction, barH);
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = '#e8d5a3'; ctx.font = '9px Cinzel, serif'; ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(castle.hp)} / ${castle.maxHp}`, W / 2, barY + barH + 10);

    // ── Weapon slots ──
    for (const slot of CFG.WEAPON_SLOTS) {
      const weapon = castleWeapons.find(w => w.slotId === slot.id);
      this._drawWeaponSlot(ctx, slot, weapon);
    }

    // ── Hero castle slots ──
    for (const slot of CFG.HERO_CASTLE_SLOTS) {
      const hero = heroes.find(h => h.onCastle && h.alive && h.castleSlotId === slot.id);
      this._drawHeroCastleSlot(ctx, slot, hero);
    }
  },

  _drawWeaponSlot(ctx, slot, weapon) {
    const { x, y, r, weaponType } = slot;
    const wCfg = CASTLE_WEAPONS[weaponType];

    if (!weapon) {
      ctx.strokeStyle = 'rgba(160,130,50,0.45)'; ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 5]);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `${r - 3}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(160,130,50,0.5)';
      ctx.fillText(wCfg.emoji, x, y);
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgba(10,15,28,0.8)';
      ctx.fillRect(x - 18, y + r + 2, 36, 13);
      ctx.fillStyle = '#c9a040'; ctx.font = '9px Cinzel, serif';
      ctx.fillText(`⚜${wCfg.cost}`, x, y + r + 12);
    } else {
      ctx.shadowColor = wCfg.strokeColor; ctx.shadowBlur = 10;
      ctx.fillStyle   = wCfg.color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = wCfg.strokeColor; ctx.lineWidth = 2; ctx.stroke();
      ctx.shadowBlur  = 0;
      ctx.font = `${r - 2}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(wCfg.emoji, x, y);
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgba(10,15,28,0.85)';
      ctx.fillRect(x - 14, y + r + 2, 28, 13);
      ctx.fillStyle = '#c9a040'; ctx.font = '9px Cinzel, serif';
      ctx.fillText(`Lv ${weapon.level}`, x, y + r + 12);
      if (!weapon.isMaxLevel) {
        ctx.strokeStyle = '#c9922c'; ctx.lineWidth = 1.5; ctx.setLineDash([2, 3]);
        ctx.beginPath(); ctx.arc(x, y, r + 5, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  },

  _drawHeroCastleSlot(ctx, slot, hero) {
    const { x, y, r } = slot;

    if (!hero) {
      // Empty: faint shield-shaped niche with hero silhouette
      ctx.strokeStyle = 'rgba(100,140,200,0.4)'; ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(100,140,200,0.2)'; ctx.font = `${r}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🛡', x, y);
      ctx.textBaseline = 'alphabetic';
      // "Hero" label hint
      ctx.fillStyle = 'rgba(10,15,28,0.8)';
      ctx.fillRect(x - 18, y + r + 2, 36, 13);
      ctx.fillStyle = '#8090b0'; ctx.font = '8px Cinzel, serif';
      ctx.fillText('hero', x, y + r + 11);
    } else {
      // Deployed hero on castle wall
      ctx.shadowColor = hero.strokeColor; ctx.shadowBlur = 12;
      ctx.fillStyle   = hero.hitFlash > 0 ? '#ff5050' : hero.color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = hero.hitFlash > 0 ? '#ff9090' : hero.strokeColor;
      ctx.lineWidth   = 2; ctx.stroke();
      ctx.shadowBlur  = 0;
      ctx.font = `${r - 4}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(hero.emoji, x, y);
      ctx.textBaseline = 'alphabetic';
      this._drawHpBar(ctx, x, y - r - 8, 44, 5, hero.hp / hero.maxHp, '#3ab84e', '#c03030');
    }
  },

  // ─── Weapon projectiles ───────────────────────────
  _drawWeaponProjectiles(ctx, projs) {
    for (const p of projs) {
      if (!p.alive) continue;
      if (p.isCatapult) {
        // Boulder with arc shadow
        ctx.shadowColor = 'rgba(160,100,0,0.4)'; ctx.shadowBlur = 8;
        ctx.fillStyle   = '#7a5818';
        ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#b08030'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.shadowBlur  = 0;
        // AoE landing ring
        ctx.strokeStyle = 'rgba(220,80,0,0.18)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(p.tx, p.ty, p.aoeRadius, 0, Math.PI * 2); ctx.stroke();
      } else {
        // Fireball with radial gradient
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 8);
        g.addColorStop(0,   '#ffffaa');
        g.addColorStop(0.4, '#ff7020');
        g.addColorStop(1,   'rgba(220,30,0,0)');
        ctx.shadowColor = '#ff6010'; ctx.shadowBlur = 16;
        ctx.fillStyle   = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill();
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

  // ─── Heroes (lane + castle) ───────────────────────
  _drawHeroes(ctx, heroes) {
    for (const h of heroes) {
      if (!h.alive || h.onCastle) continue; // castle heroes drawn in _drawCastle
      this._drawHero(ctx, h);
    }
  },

  _drawHero(ctx, hero) {
    const { x, y, color, strokeColor, hitFlash, hp, maxHp, range } = hero;
    const r = 22;
    // Range ring
    ctx.strokeStyle = `${strokeColor}20`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x, y, range, 0, Math.PI * 2); ctx.stroke();
    // Body
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
    ctx.font = `${Math.max(10, radius - 4)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
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
    const { waveMgr, waveAnnounce, selectedHeroType, placementCursor, phase, sceneNum, sceneTransitionTimer } = state;

    // Wave countdown banner
    if (waveMgr && waveMgr.inCountdown && !waveMgr.complete) {
      const nextW = waveMgr.waveIndex + 2;
      if (nextW <= waveMgr.totalWaves) {
        this._drawBanner(ctx, `Wave ${nextW} incoming in ${waveMgr.countdownSecs}…`, '#c9922c', 0.72);
      }
    }

    // Wave announce flash
    if (waveAnnounce && waveAnnounce.alpha > 0) {
      ctx.globalAlpha = Math.min(waveAnnounce.alpha, 1);
      ctx.fillStyle   = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, CFG.CANVAS_H / 2 - 38, CFG.CANVAS_W, 76);
      ctx.fillStyle = '#e8c060'; ctx.font = 'bold 22px Cinzel, serif'; ctx.textAlign = 'center';
      ctx.fillText(waveAnnounce.text, CFG.CANVAS_W / 2, CFG.CANVAS_H / 2 + 8);
      ctx.globalAlpha = 1;
    }

    // Scene complete transition
    if (phase === 'scene_complete') {
      ctx.fillStyle = 'rgba(4,7,18,0.78)';
      ctx.fillRect(0, 0, CFG.CANVAS_W, CFG.CANVAS_H);

      ctx.fillStyle = '#c9a040'; ctx.font = 'bold 32px Cinzel Decorative, Cinzel, serif'; ctx.textAlign = 'center';
      ctx.fillText(`Scene ${sceneNum} Complete!`, CFG.CANVAS_W / 2, CFG.CANVAS_H / 2 - 24);

      ctx.fillStyle = '#8090b0'; ctx.font = '15px Cinzel, serif';
      ctx.fillText('Marshalling forces… castle partially restored.', CFG.CANVAS_W / 2, CFG.CANVAS_H / 2 + 14);

      // Countdown bar
      const prog     = sceneTransitionTimer / CFG.SCENE_TRANSITION;
      const barW     = 420, barH = 7;
      const barX     = (CFG.CANVAS_W - barW) / 2;
      const barY     = CFG.CANVAS_H / 2 + 42;
      ctx.fillStyle  = '#1a2030'; ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle  = '#c9922c'; ctx.fillRect(barX, barY, barW * (1 - prog), barH);
      ctx.strokeStyle = '#4a3718'; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, barW, barH);
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

  _drawBanner(ctx, text, color, bgAlpha = 0.7) {
    ctx.fillStyle = `rgba(8,13,24,${bgAlpha})`;
    ctx.fillRect(0, CFG.CANVAS_H - 42, CFG.CANVAS_W, 42);
    ctx.strokeStyle = 'rgba(100,80,30,0.45)'; ctx.lineWidth = 1;
    ctx.strokeRect(0, CFG.CANVAS_H - 42, CFG.CANVAS_W, 42);
    ctx.fillStyle = color; ctx.font = '14px Cinzel, serif'; ctx.textAlign = 'center';
    ctx.fillText(text, CFG.CANVAS_W / 2, CFG.CANVAS_H - 14);
  },
};
