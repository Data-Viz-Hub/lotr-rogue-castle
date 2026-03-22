/* ═══════════════════════════════════════════════════
   main.js — Bootstrap & screen transitions
═══════════════════════════════════════════════════ */

'use strict';

let game = null;

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function startGame() {
  showScreen('game-screen');
  const canvas = document.getElementById('game-canvas');

  // Size canvas to fit the available area
  const wrap = document.getElementById('canvas-wrap');
  const availW = wrap.clientWidth;
  const availH = wrap.clientHeight;

  // Maintain aspect ratio
  const scale = Math.min(availW / CFG.CANVAS_W, availH / CFG.CANVAS_H);
  canvas.style.width  = `${CFG.CANVAS_W * scale}px`;
  canvas.style.height = `${CFG.CANVAS_H * scale}px`;

  if (!game) {
    game = new Game(canvas);
  } else {
    game._reset();
    game._buildHeroPanel();
  }
  game.start();
}

document.addEventListener('DOMContentLoaded', () => {
  // Title → Game
  document.getElementById('start-btn')
    .addEventListener('click', startGame);

  // Defeat → retry
  document.getElementById('retry-btn')
    .addEventListener('click', startGame);

  // Victory → retry (play again)
  document.getElementById('retry-victory-btn')
    .addEventListener('click', startGame);

  // Upgrade panel close button
  document.getElementById('upg-close')
    .addEventListener('click', () => game && game._closeUpgradePanel());

  // Resize handling
  window.addEventListener('resize', () => {
    if (!game) return;
    const wrap   = document.getElementById('canvas-wrap');
    const canvas = document.getElementById('game-canvas');
    const scale  = Math.min(wrap.clientWidth / CFG.CANVAS_W, wrap.clientHeight / CFG.CANVAS_H);
    canvas.style.width  = `${CFG.CANVAS_W * scale}px`;
    canvas.style.height = `${CFG.CANVAS_H * scale}px`;
  });
});
