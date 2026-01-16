import { GameEngine } from './GameEngine.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const game = new GameEngine(canvas);
});
