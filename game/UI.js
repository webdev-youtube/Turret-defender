export class UIManager {
  constructor() {
    this.hpFill = document.getElementById('hp-fill');
    this.hpDamage = document.getElementById('hp-damage');
    this.hpText = document.getElementById('hp-text');
    this.timer = document.getElementById('timer');
    this.tempPowerups = document.getElementById('temp-powerups');
    this.bossWarning = document.getElementById('boss-warning');
    
    this.statDamage = document.getElementById('stat-damage');
    this.statFirerate = document.getElementById('stat-firerate');
    this.statSpeed = document.getElementById('stat-speed');
    this.statPierce = document.getElementById('stat-pierce');
    
    this.powerupModal = document.getElementById('powerup-modal');
    this.powerupOptions = document.getElementById('powerup-options');
    
    this.mainMenu = document.getElementById('main-menu');
    this.gameScreen = document.getElementById('game-screen');
    this.deathScreen = document.getElementById('death-screen');
    this.statsModal = document.getElementById('stats-modal');
    this.settingsModal = document.getElementById('settings-modal');
    
    this.floatingTexts = [];
    this.lastHp = 100;
    this.targetDamageWidth = 100;
  }

  showScreen(screenId) {
    this.mainMenu.classList.remove('active');
    this.gameScreen.classList.remove('active');
    this.deathScreen.classList.remove('active');
    
    document.getElementById(screenId).classList.add('active');
  }

  showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
  }

  hideModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
  }

  updateHP(current, max) {
    const percent = (current / max) * 100;
    this.hpFill.style.width = `${percent}%`;
    this.hpText.textContent = `${Math.ceil(current)} / ${max}`;
    
    if (current < this.lastHp) {
      this.hpDamage.style.width = `${(this.lastHp / max) * 100}%`;
      this.targetDamageWidth = percent;
    }
    
    this.lastHp = current;
  }

  updateDamageBar() {
    const currentWidth = parseFloat(this.hpDamage.style.width) || 100;
    if (currentWidth > this.targetDamageWidth) {
      const newWidth = Math.max(this.targetDamageWidth, currentWidth - 0.5);
      this.hpDamage.style.width = `${newWidth}%`;
    }
  }

  updateTimer(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    this.timer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  updateStats(stats) {
    this.statDamage.textContent = Math.round(stats.damage);
    this.statFirerate.textContent = stats.fireRate.toFixed(1);
    this.statSpeed.textContent = Math.round(stats.projectileSpeed / 100);
    this.statPierce.textContent = stats.pierce;
  }

  updateTempPowerups(powerups) {
    this.tempPowerups.innerHTML = '';
    
    for (const powerup of powerups) {
      const el = document.createElement('div');
      el.className = 'temp-powerup';
      el.innerHTML = `
        <span class="temp-powerup-name">${powerup.name}</span>
        <span class="temp-powerup-timer">${powerup.timeRemaining.toFixed(1)}s</span>
      `;
      this.tempPowerups.appendChild(el);
    }
  }

  showBossWarning() {
    this.bossWarning.classList.remove('hidden');
    setTimeout(() => {
      this.bossWarning.classList.add('hidden');
    }, 3000);
  }

  hideBossWarning() {
    this.bossWarning.classList.add('hidden');
  }

  showPowerupSelection(options, callback) {
    this.powerupOptions.innerHTML = '';
    
    for (const option of options) {
      const card = document.createElement('div');
      card.className = 'powerup-card';
      card.innerHTML = `
        <div class="powerup-icon">${option.icon}</div>
        <div class="powerup-info">
          <div class="powerup-name">${option.name}</div>
          <div class="powerup-value">+${option.actualIncrement}${option.tier > 1 ? ` (Tier ${option.tier})` : ''}</div>
        </div>
      `;
      
      card.addEventListener('click', () => {
        callback(option);
        this.hideModal('powerup-modal');
      });
      
      this.powerupOptions.appendChild(card);
    }
    
    this.showModal('powerup-modal');
  }

  showDeathScreen(stats) {
    document.getElementById('death-time').textContent = this.formatTime(stats.survivalTime);
    document.getElementById('death-kills').textContent = stats.enemiesKilled;
    document.getElementById('death-bosses').textContent = stats.bossesDefeated;
    document.getElementById('death-damage').textContent = stats.highestDamage;
    
    this.showScreen('death-screen');
  }

  updateLifetimeStats(stats) {
    document.getElementById('total-runs').textContent = stats.totalRuns;
    document.getElementById('total-kills').textContent = stats.totalKills;
    document.getElementById('best-time').textContent = this.formatTime(stats.bestTime);
    document.getElementById('total-bosses').textContent = stats.totalBosses;
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  addFloatingText(x, y, text, color = '#AAFF00') {
    const el = document.createElement('div');
    el.className = 'floating-text';
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.color = color;
    
    document.getElementById('game-screen').appendChild(el);
    
    setTimeout(() => {
      el.remove();
    }, 1000);
  }

  screenShake() {
    const gameScreen = document.getElementById('game-screen');
    gameScreen.classList.add('screen-shake');
    setTimeout(() => {
      gameScreen.classList.remove('screen-shake');
    }, 300);
  }

  reset() {
    this.lastHp = 100;
    this.targetDamageWidth = 100;
    this.hpFill.style.width = '100%';
    this.hpDamage.style.width = '100%';
    this.tempPowerups.innerHTML = '';
    this.hideBossWarning();
  }
}
