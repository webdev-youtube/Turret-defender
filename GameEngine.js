import { Turret } from './Turret.js';
import { BulletPool } from './Bullet.js';
import { EnemyPool } from './Enemy.js';
import { Boss } from './Boss.js';
import { PowerupSystem } from './Powerup.js';
import { InputManager } from './Input.js';
import { UIManager } from './UI.js';

const ENEMY_TYPES = ['normal', 'fast', 'shield', 'tank'];
const BOSS_TYPES = ['standard', 'fast', 'shield', 'tank'];

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    this.input = new InputManager(canvas);
    this.ui = new UIManager();
    this.powerupSystem = new PowerupSystem();
    
    this.settings = this.loadSettings();
    this.lifetimeStats = this.loadLifetimeStats();
    
    this.particles = [];
    this.isRunning = false;
    this.isPaused = false;
    this.gameTime = 0;
    this.lastTime = 0;
    this.showFps = this.settings.showFps;
    this.fps = 0;
    this.frameCount = 0;
    this.fpsTime = 0;
    
    this.setupEventListeners();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.bounds = {
      width: this.canvas.width,
      height: this.canvas.height
    };
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('turretDefenderSettings');
      return saved ? JSON.parse(saved) : { screenShake: true, showFps: false };
    } catch {
      return { screenShake: true, showFps: false };
    }
  }

  saveSettings() {
    localStorage.setItem('turretDefenderSettings', JSON.stringify(this.settings));
  }

  loadLifetimeStats() {
    try {
      const saved = localStorage.getItem('turretDefenderStats');
      return saved ? JSON.parse(saved) : { 
        totalRuns: 0, 
        totalKills: 0, 
        bestTime: 0, 
        totalBosses: 0 
      };
    } catch {
      return { totalRuns: 0, totalKills: 0, bestTime: 0, totalBosses: 0 };
    }
  }

  saveLifetimeStats() {
    localStorage.setItem('turretDefenderStats', JSON.stringify(this.lifetimeStats));
  }

  setupEventListeners() {
    document.getElementById('start-btn').addEventListener('click', () => this.startGame());
    document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
    document.getElementById('menu-btn').addEventListener('click', () => this.showMainMenu());
    
    document.getElementById('stats-btn').addEventListener('click', () => {
      this.ui.updateLifetimeStats(this.lifetimeStats);
      this.ui.showModal('stats-modal');
    });
    document.getElementById('close-stats-btn').addEventListener('click', () => {
      this.ui.hideModal('stats-modal');
    });
    
    document.getElementById('settings-btn').addEventListener('click', () => {
      document.getElementById('shake-toggle').checked = this.settings.screenShake;
      document.getElementById('fps-toggle').checked = this.settings.showFps;
      this.ui.showModal('settings-modal');
    });
    document.getElementById('close-settings-btn').addEventListener('click', () => {
      this.ui.hideModal('settings-modal');
    });
    
    document.getElementById('shake-toggle').addEventListener('change', (e) => {
      this.settings.screenShake = e.target.checked;
      this.saveSettings();
    });
    document.getElementById('fps-toggle').addEventListener('change', (e) => {
      this.settings.showFps = e.target.checked;
      this.showFps = e.target.checked;
      this.saveSettings();
    });
    
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', () => {
        this.ui.hideModal('stats-modal');
        this.ui.hideModal('settings-modal');
      });
    });
  }

  showMainMenu() {
    this.isRunning = false;
    this.ui.showScreen('main-menu');
    this.ui.hideModal('powerup-modal');
  }

  startGame() {
    this.turret = new Turret(this.bounds.width / 2, this.bounds.height - 80);
    this.bulletPool = new BulletPool();
    this.enemyPool = new EnemyPool();
    this.boss = null;
    this.powerupSystem.reset();
    this.particles = [];
    
    this.gameTime = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 1.5;
    this.bossTimer = 0;
    this.bossInterval = 60;
    this.difficultyFactor = 0;
    
    this.enemiesKilled = 0;
    this.bossesDefeated = 0;
    this.highestDamage = this.turret.stats.damage;
    
    this.pendingPowerupSelections = 0;
    this.isSelectingPowerup = false;
    
    this.ui.reset();
    this.ui.showScreen('game-screen');
    this.input.enable();
    
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  gameLoop(currentTime) {
    if (!this.isRunning) return;
    
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;
    
    this.frameCount++;
    this.fpsTime += dt;
    if (this.fpsTime >= 1) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = 0;
    }
    
    if (!this.isPaused && !this.isSelectingPowerup) {
      this.update(dt);
    }
    
    this.render();
    
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  update(dt) {
    this.gameTime += dt;
    this.difficultyFactor = this.gameTime / 60;
    
    this.turret.setTargetAngle(this.input.mouseX, this.input.mouseY);
    
    if (this.input.isPointerDown) {
      this.turret.startFiring();
    } else {
      this.turret.stopFiring();
    }
    
    this.turret.update(dt);
    
    if (this.turret.canFire()) {
      const bullets = this.turret.fire();
      for (const b of bullets) {
        this.bulletPool.get(b.x, b.y, b.angle, b.speed, b.damage, b.pierce, b.isCrit);
      }
    }
    
    this.bulletPool.update(dt, this.bounds);
    this.enemyPool.update(dt, this.turret.x, this.turret.y);
    
    if (this.boss) {
      this.boss.setTarget(this.turret.x, this.turret.y);
      this.boss.update(dt, this);
      
      const spawns = this.boss.getPendingSpawns();
      for (const spawn of spawns) {
        this.enemyPool.get(spawn.x, spawn.y, spawn.type, this.difficultyFactor);
      }
    }
    
    this.checkCollisions();
    
    this.updateParticles(dt);
    
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval && !this.boss) {
      this.spawnEnemy();
      this.spawnTimer = 0;
      this.spawnInterval = Math.max(0.3, 1.5 - this.difficultyFactor * 0.1);
    }
    
    if (!this.boss) {
      this.bossTimer += dt;
      if (this.bossTimer >= this.bossInterval) {
        this.spawnBoss();
        this.bossTimer = 0;
        this.bossInterval = Math.min(90, 60 + this.bossesDefeated * 10);
      }
    }
    
    this.powerupSystem.updateTempPowerups(dt, this.turret.stats);
    
    this.ui.updateHP(this.turret.stats.hp, this.turret.stats.maxHp);
    this.ui.updateDamageBar();
    this.ui.updateTimer(this.gameTime);
    this.ui.updateStats(this.turret.stats);
    this.ui.updateTempPowerups(this.powerupSystem.getActiveTempPowerups());
    
    if (this.turret.stats.damage > this.highestDamage) {
      this.highestDamage = this.turret.stats.damage;
    }
    
    if (this.turret.stats.hp <= 0) {
      this.gameOver();
    }
  }

  spawnEnemy() {
    const margin = 50;
    const x = margin + Math.random() * (this.bounds.width - margin * 2);
    const y = -50;
    
    let type = 'normal';
    const roll = Math.random();
    
    if (this.difficultyFactor > 0.5) {
      if (roll < 0.1 + this.difficultyFactor * 0.02) type = 'tank';
      else if (roll < 0.25 + this.difficultyFactor * 0.03) type = 'shield';
      else if (roll < 0.45) type = 'fast';
    } else {
      if (roll < 0.3) type = 'fast';
    }
    
    this.enemyPool.get(x, y, type, this.difficultyFactor);
  }

  spawnBoss() {
    const bossIndex = this.bossesDefeated % BOSS_TYPES.length;
    const bossType = BOSS_TYPES[bossIndex];
    
    this.boss = new Boss(
      this.bounds.width / 2,
      -100,
      bossType,
      this.difficultyFactor
    );
    
    if (this.settings.screenShake) {
      this.ui.screenShake();
    }
    this.ui.showBossWarning();
  }

  checkCollisions() {
    for (const bullet of this.bulletPool.active) {
      for (const enemy of this.enemyPool.active) {
        if (!enemy.active) continue;
        
        const dx = bullet.x - enemy.x;
        const dy = bullet.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < enemy.radius + bullet.radius) {
          if (bullet.onHitEnemy(enemy.id)) {
            const killed = enemy.takeDamage(bullet.damage);
            
            if (killed) {
              this.onEnemyKilled(enemy);
            }
          }
        }
      }
      
      if (this.boss && this.boss.active) {
        const dx = bullet.x - this.boss.x;
        const dy = bullet.y - this.boss.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < this.boss.radius + bullet.radius) {
          if (bullet.onHitEnemy('boss')) {
            const killed = this.boss.takeDamage(bullet.damage);
            
            if (killed) {
              this.onBossKilled();
            }
          }
        }
      }
    }
    
    for (const enemy of this.enemyPool.active) {
      const dx = enemy.x - this.turret.x;
      const dy = enemy.y - this.turret.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < enemy.radius + this.turret.baseRadius) {
        if (!this.turret.stats.invulnerable) {
          const isDead = this.turret.takeDamage(enemy.damage);
          if (this.settings.screenShake) {
            this.ui.screenShake();
          }
        }
        enemy.destroy();
      }
    }
    
    if (this.boss && this.boss.active) {
      const dx = this.boss.x - this.turret.x;
      const dy = this.boss.y - this.turret.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < this.boss.radius + this.turret.baseRadius) {
        if (!this.turret.stats.invulnerable) {
          this.turret.takeDamage(this.boss.damage);
          if (this.settings.screenShake) {
            this.ui.screenShake();
          }
        }
      }
    }
    
    this.enemyPool.removeInactive();
  }

  onEnemyKilled(enemy) {
    this.enemiesKilled++;
    this.particles.push(...enemy.getDeathParticles());
    
    const shouldDrop = this.powerupSystem.addDropCharge(
      enemy.dropCharge, 
      this.turret.stats.luck
    );
    
    if (shouldDrop) {
      const dropType = this.powerupSystem.rollDropType(this.turret.stats.luck);
      
      if (dropType === 'temporary') {
        const powerup = this.powerupSystem.getRandomTempPowerup();
        this.powerupSystem.applyTempPowerup(powerup, this.turret.stats);
        this.ui.addFloatingText(enemy.x, enemy.y, powerup.name, '#FFAA00');
      } else if (dropType === 'permanent') {
        this.showPermanentPowerupSelection();
      }
    }
  }

  onBossKilled() {
    this.bossesDefeated++;
    
    const particles = [];
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30;
      const speed = 150 + Math.random() * 300;
      particles.push({
        x: this.boss.x,
        y: this.boss.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 8 + Math.random() * 12,
        color: this.boss.color,
        life: 1.5
      });
    }
    this.particles.push(...particles);
    
    this.boss = null;
    this.ui.hideBossWarning();
    
    if (this.settings.screenShake) {
      this.ui.screenShake();
    }
    
    this.pendingPowerupSelections = 5;
    this.showPermanentPowerupSelection();
  }

  showPermanentPowerupSelection() {
    const options = this.powerupSystem.getPermanentOptions(
      this.turret.stats,
      this.turret.stats.luck
    );
    
    if (options.length === 0) {
      if (this.pendingPowerupSelections > 0) {
        this.pendingPowerupSelections--;
        if (this.pendingPowerupSelections > 0) {
          setTimeout(() => this.showPermanentPowerupSelection(), 100);
        }
      }
      return;
    }
    
    this.isSelectingPowerup = true;
    this.input.disable();
    
    this.ui.showPowerupSelection(options, (selected) => {
      const result = this.powerupSystem.applyPermanentPowerup(selected, this.turret.stats);
      
      this.ui.addFloatingText(
        this.turret.x, 
        this.turret.y - 60, 
        result.value + ' ' + result.stat
      );
      
      this.isSelectingPowerup = false;
      this.input.enable();
      
      if (this.pendingPowerupSelections > 0) {
        this.pendingPowerupSelections--;
        if (this.pendingPowerupSelections > 0) {
          setTimeout(() => this.showPermanentPowerupSelection(), 300);
        }
      }
    });
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= dt;
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render() {
    this.ctx.fillStyle = '#0A0A0F';
    this.ctx.fillRect(0, 0, this.bounds.width, this.bounds.height);
    
    this.renderGrid();
    
    for (const p of this.particles) {
      this.ctx.globalAlpha = p.life;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
    
    this.bulletPool.render(this.ctx);
    this.enemyPool.render(this.ctx);
    
    if (this.boss) {
      this.boss.render(this.ctx);
    }
    
    if (this.turret) {
      this.turret.render(this.ctx);
    }
    
    if (this.showFps) {
      this.ctx.fillStyle = '#00F0FF';
      this.ctx.font = '14px Rajdhani';
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`FPS: ${this.fps}`, 10, this.bounds.height - 10);
    }
  }

  renderGrid() {
    const gridSize = 40;
    const offset = (this.gameTime * 10) % gridSize;
    
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.03)';
    this.ctx.lineWidth = 1;
    
    for (let x = -offset; x < this.bounds.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.bounds.height);
      this.ctx.stroke();
    }
    
    for (let y = offset; y < this.bounds.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.bounds.width, y);
      this.ctx.stroke();
    }
  }

  gameOver() {
    this.isRunning = false;
    this.input.disable();
    this.powerupSystem.clearTempPowerups(this.turret.stats);
    
    this.lifetimeStats.totalRuns++;
    this.lifetimeStats.totalKills += this.enemiesKilled;
    this.lifetimeStats.totalBosses += this.bossesDefeated;
    if (this.gameTime > this.lifetimeStats.bestTime) {
      this.lifetimeStats.bestTime = this.gameTime;
    }
    this.saveLifetimeStats();
    
    this.ui.showDeathScreen({
      survivalTime: this.gameTime,
      enemiesKilled: this.enemiesKilled,
      bossesDefeated: this.bossesDefeated,
      highestDamage: Math.round(this.highestDamage)
    });
  }
}
