import { Entity } from './Entity.js';

const ENEMY_TYPES = {
  normal: {
    color: '#6A6AFF',
    speed: 50,
    hp: 75,
    damage: 10,
    radius: 14,
    dropCharge: 0.30,
    outline: 2
  },
  fast: {
    color: '#FF6AFF',
    speed: 90,
    hp: 37,
    damage: 8,
    radius: 10,
    dropCharge: 0.08,
    outline: 1
  },
  shield: {
    color: '#FFAA00',
    speed: 35,
    hp: 100,
    damage: 12,
    radius: 16,
    dropCharge: 0.2,
    outline: 2,
    shieldHp: 30
  },
  tank: {
    color: '#FFAA6A',
    speed: 20,
    hp: 200,
    damage: 25,
    radius: 22,
    dropCharge: 0.40,
    outline: 3
  }
};

let enemyIdCounter = 0;

export class Enemy extends Entity {
  constructor(x, y, type, scaleFactor = 1) {
    super(x, y);
    this.id = ++enemyIdCounter;
    this.type = type;
    const config = ENEMY_TYPES[type];
    
    this.color = config.color;
    this.speed = config.speed * (1 + scaleFactor * 0.05);
    this.maxHp = Math.floor(config.hp * (1 + scaleFactor * 0.1));
    this.hp = this.maxHp;
    this.damage = config.damage;
    this.radius = config.radius;
    this.dropCharge = config.dropCharge;
    this.outline = config.outline;
    
    if (config.shieldHp) {
      this.maxShieldHp = Math.floor(config.shieldHp * (1 + scaleFactor * 0.1));
      this.shieldHp = this.maxShieldHp;
    }
    
    this.targetX = 0;
    this.targetY = 0;
    this.hitFlash = 0;
    this.deathParticles = [];
  }

  setTarget(x, y) {
    this.targetX = x;
    this.targetY = y;
  }

  takeDamage(amount) {
    if (this.shieldHp > 0) {
      this.shieldHp -= amount;
      if (this.shieldHp < 0) {
        this.hp += this.shieldHp;
        this.shieldHp = 0;
      }
    } else {
      this.hp -= amount;
    }
    
    this.hitFlash = 1;
    
    if (this.hp <= 0) {
      this.destroy();
      return true;
    }
    return false;
  }

  update(dt) {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 1) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }
    
    if (this.hitFlash > 0) {
      this.hitFlash -= dt * 8;
    }
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.shieldHp > 0) {
      const shieldAlpha = 0.4 + (this.shieldHp / this.maxShieldHp) * 0.4;
      ctx.strokeStyle = `rgba(255, 170, 0, ${shieldAlpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
        const x = Math.cos(angle) * (this.radius + 6);
        const y = Math.sin(angle) * (this.radius + 6);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = this.outline;

    switch (this.type) {
      case 'normal':
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      case 'fast':
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(this.radius, this.radius);
        ctx.lineTo(-this.radius, this.radius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case 'shield':
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
          const x = Math.cos(angle) * this.radius;
          const y = Math.sin(angle) * this.radius;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case 'tank':
        ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
        ctx.strokeRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
        break;
    }

    if (this.hitFlash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.hitFlash * 0.7})`;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const hpPercent = this.hp / this.maxHp;
    if (hpPercent < 1) {
      const barWidth = this.radius * 2;
      const barHeight = 4;
      const barY = -this.radius - 12;
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);
      
      ctx.fillStyle = '#FF0055';
      ctx.fillRect(-barWidth / 2, barY, barWidth * hpPercent, barHeight);
    }

    ctx.restore();
  }

  getDeathParticles() {
    const particles = [];
    const count = Math.floor(this.radius / 4);
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 100 + Math.random() * 200;
      particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 8,
        color: this.color,
        life: 1
      });
    }
    
    return particles;
  }
}

export class EnemyPool {
  constructor(maxSize = 100) {
    this.pools = {
      normal: [],
      fast: [],
      shield: [],
      tank: []
    };
    this.active = [];
    this.maxSize = maxSize;
  }

  get(x, y, type, scaleFactor) {
    let enemy;
    
    if (this.pools[type].length > 0) {
      enemy = this.pools[type].pop();
      const config = ENEMY_TYPES[type];
      enemy.id = ++enemyIdCounter;
      enemy.x = x;
      enemy.y = y;
      enemy.speed = config.speed * (1 + scaleFactor * 0.05);
      enemy.maxHp = Math.floor(config.hp * (1 + scaleFactor * 0.1));
      enemy.hp = enemy.maxHp;
      enemy.active = true;
      enemy.hitFlash = 0;
      if (config.shieldHp) {
        enemy.maxShieldHp = Math.floor(config.shieldHp * (1 + scaleFactor * 0.1));
        enemy.shieldHp = enemy.maxShieldHp;
      }
    } else {
      enemy = new Enemy(x, y, type, scaleFactor);
    }
    
    this.active.push(enemy);
    return enemy;
  }

  update(dt, targetX, targetY) {
    for (const enemy of this.active) {
      enemy.setTarget(targetX, targetY);
      enemy.update(dt);
    }
  }

  removeInactive() {
    const removed = [];
    for (let i = this.active.length - 1; i >= 0; i--) {
      const enemy = this.active[i];
      if (!enemy.active) {
        removed.push(enemy);
        this.pools[enemy.type].push(enemy);
        this.active.splice(i, 1);
      }
    }
    return removed;
  }

  render(ctx) {
    for (const enemy of this.active) {
      enemy.render(ctx);
    }
  }

  clear() {
    for (const enemy of this.active) {
      this.pools[enemy.type].push(enemy);
    }
    this.active = [];
  }
}
