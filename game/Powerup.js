const PERMANENT_POWERUPS = [
  { stat: 'damage', name: 'DAMAGE', icon: 'DMG', increment: 3, max: 100 },
  { stat: 'fireRate', name: 'FIRE RATE', icon: 'ROF', increment: 0.5, max: 20 },
  { stat: 'projectileSpeed', name: 'BULLET SPEED', icon: 'SPD', increment: 100, max: 2000 },
  { stat: 'projectileCount', name: 'MULTI-SHOT', icon: 'CNT', increment: 1, max: 8 },
  { stat: 'spread', name: 'SPREAD', icon: 'SPR', increment: 5, max: 60 },
  { stat: 'critChance', name: 'CRIT CHANCE', icon: 'CRT', increment: 0.05, max: 0.5 },
  { stat: 'critMultiplier', name: 'CRIT DAMAGE', icon: 'CRD', increment: 0.25, max: 5 },
  { stat: 'pierce', name: 'PIERCE', icon: 'PRC', increment: 1, max: 5 },
  { stat: 'maxHp', name: 'MAX HP', icon: 'HP+', increment: 20, max: 300 },
  { stat: 'armor', name: 'ARMOR', icon: 'ARM', increment: 2, max: 20 },
  { stat: 'regen', name: 'REGEN', icon: 'REG', increment: 1, max: 10 },
  { stat: 'luck', name: 'LUCK', icon: 'LCK', increment: 0.05, max: 0.6 }
];

const TEMPORARY_POWERUPS = [
  { 
    id: 'doubleFireRate', 
    name: 'RAPID FIRE', 
    duration: 5, 
    apply: (stats) => { stats.fireRate *= 2; },
    remove: (stats, originalFireRate) => { stats.fireRate = originalFireRate; }
  },
  { 
    id: 'invulnerability', 
    name: 'SHIELD', 
    duration: 2, 
    apply: (stats) => { stats.invulnerable = true; },
    remove: (stats) => { stats.invulnerable = false; }
  },
  { 
    id: 'doubleDamage', 
    name: 'POWER SHOT', 
    duration: 5, 
    apply: (stats) => { stats.damage *= 2; },
    remove: (stats, originalDamage) => { stats.damage = originalDamage; }
  },
  { 
    id: 'superSpeed', 
    name: 'HYPER BULLETS', 
    duration: 4, 
    apply: (stats) => { stats.projectileSpeed *= 1.5; },
    remove: (stats, originalSpeed) => { stats.projectileSpeed = originalSpeed; }
  },
  { 
    id: 'tripleShot', 
    name: 'TRIPLE SHOT', 
    duration: 6, 
    apply: (stats) => { stats.projectileCount += 2; },
    remove: (stats) => { stats.projectileCount -= 2; }
  }
];

export class PowerupSystem {
  constructor() {
    this.dropCharge = 0;
    this.activeTempPowerups = [];
    this.recentPermanent = null;
  }

  addDropCharge(amount, luck) {
    const luckBonus = 1 + Math.min(luck, 0.6) * 0.5;
    this.dropCharge += amount * luckBonus;
    
    if (this.dropCharge >= 1) {
      this.dropCharge -= 1;
      return true;
    }
    return false;
  }

  rollDropType(luck) {
    const nothingChance = Math.max(0.1, 0.4 - luck * 0.3);
    const tempChance = 0.4;
    const permChance = 0.2 + luck * 0.2;
    
    const total = nothingChance + tempChance + permChance;
    const roll = Math.random() * total;
    
    if (roll < permChance) return 'permanent';
    if (roll < permChance + tempChance) return 'temporary';
    return 'nothing';
  }

  getRandomTempPowerup() {
    const index = Math.floor(Math.random() * TEMPORARY_POWERUPS.length);
    return { ...TEMPORARY_POWERUPS[index] };
  }

  getPermanentOptions(currentStats, luck, count = 3) {
    const available = PERMANENT_POWERUPS.filter(p => {
      if (p.stat === this.recentPermanent) return false;
      
      const currentValue = currentStats[p.stat];
      return currentValue < p.max;
    });
    
    if (available.length === 0) return [];

    const tierWeights = [0.5, 0.35, 0.15];
    const luckModifier = luck * 0.3;
    tierWeights[0] -= luckModifier;
    tierWeights[2] += luckModifier;

    const selected = [];
    const used = new Set();
    
    while (selected.length < count && selected.length < available.length) {
      const index = Math.floor(Math.random() * available.length);
      if (used.has(index)) continue;
      used.add(index);
      
      const powerup = available[index];
      const tierRoll = Math.random();
      let tier = 1;
      if (tierRoll > tierWeights[0] + tierWeights[1]) tier = 3;
      else if (tierRoll > tierWeights[0]) tier = 2;
      
      selected.push({
        ...powerup,
        tier,
        actualIncrement: powerup.increment * tier
      });
    }
    
    return selected;
  }

  applyTempPowerup(powerup, stats) {
    const originalValue = stats[this.getStatKey(powerup.id)];
    powerup.apply(stats);
    powerup.originalValue = originalValue;
    powerup.timeRemaining = powerup.duration;
    
    const existingIndex = this.activeTempPowerups.findIndex(p => p.id === powerup.id);
    if (existingIndex >= 0) {
      this.activeTempPowerups[existingIndex].timeRemaining = powerup.duration;
    } else {
      this.activeTempPowerups.push(powerup);
    }
  }

  getStatKey(powerupId) {
    switch (powerupId) {
      case 'doubleFireRate': return 'fireRate';
      case 'doubleDamage': return 'damage';
      case 'superSpeed': return 'projectileSpeed';
      default: return null;
    }
  }

  updateTempPowerups(dt, stats) {
    for (let i = this.activeTempPowerups.length - 1; i >= 0; i--) {
      const powerup = this.activeTempPowerups[i];
      powerup.timeRemaining -= dt;
      
      if (powerup.timeRemaining <= 0) {
        powerup.remove(stats, powerup.originalValue);
        this.activeTempPowerups.splice(i, 1);
      }
    }
  }

  applyPermanentPowerup(powerup, stats) {
    const newValue = Math.min(
      stats[powerup.stat] + powerup.actualIncrement,
      powerup.max
    );
    stats[powerup.stat] = newValue;
    this.recentPermanent = powerup.stat;
    
    if (powerup.stat === 'maxHp') {
      stats.hp = Math.min(stats.hp + powerup.actualIncrement, stats.maxHp);
    }
    
    return {
      stat: powerup.name,
      value: `+${powerup.actualIncrement}`,
      newValue
    };
  }

  getActiveTempPowerups() {
    return this.activeTempPowerups;
  }

  clearTempPowerups(stats) {
    for (const powerup of this.activeTempPowerups) {
      powerup.remove(stats, powerup.originalValue);
    }
    this.activeTempPowerups = [];
  }

  reset() {
    this.dropCharge = 0;
    this.activeTempPowerups = [];
    this.recentPermanent = null;
  }
}
