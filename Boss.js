import { Entity } from './Entity.js';

const BOSS_TYPES = {
  standard: {
    color: '#6A6AFF',
    baseHp: 500,
    damage: 15,
    radius: 45,
    speed: 25,
    abilities: ['speedBurst', 'spawnEnemies']
  },
  fast: {
    color: '#FF6AFF',
    baseHp: 300,
    damage: 8,
    radius: 35,
    speed: 40,
    abilities: ['dash']
  },
  shield: {
    color: '#FFAA00',
    baseHp: 600,
    damage: 12,
    radius: 50,
    speed: 20,
    abilities: ['shieldPulse', 'spawnEnemies']
  },
  tank: {
    color: '#FFAA6A',
    baseHp: 1000,
    damage: 20,
    radius: 55,
    speed: 12,
    abilities: ['spawnTanks']
  }
};

export class Boss extends Entity {
  constructor(x, y, type, scaleFactor = 1) {
    super(x, y);
    this.type = type;
    const config = BOSS_TYPES[type];
    
    this.color = config.color;
    this.baseSpeed = config.speed;
    this.speed = config.speed;
    this.maxHp = Math.floor(config.baseHp * (1 + scaleFactor * 0.3));
    this.hp = this.maxHp;
    this.damage = config.damage;
    this.radius = config.radius;
    this.abilities = config.abilities;
    
    this.targetX = 0;
    this.targetY = 0;
    this.hitFlash = 0;
    this.phase = 1;
    this.glowPulse = 0;
    
    this.abilityCooldowns = {};
    for (const ability of this.abilities) {
      this.abilityCooldowns[ability] = 2;
    }
    
    if (type === 'shield') {
      this.shieldHp = Math.floor(200 * (1 + scaleFactor * 0.2));
      this.maxShieldHp = this.shieldHp;
      this.shieldRefreshed = false;
    }
    
    this.dashTarget = null;
    this.isDashing = false;
    this.dashCooldown = 0;
    this.vulnerableTimer = 0;
    
    this.pendingSpawns = [];
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
    
    const hpPercent = this.hp / this.maxHp;
    if (hpPercent <= 0.5 && this.phase === 1) {
      this.phase = 2;
      this.onPhaseChange();
    }
    
    if (this.hp <= 0) {
      this.destroy();
      return true;
    }
    return false;
  }

  onPhaseChange() {
    if (this.type === 'shield' && !this.shieldRefreshed) {
      this.shieldHp = this.maxShieldHp;
      this.shieldRefreshed = true;
    }
    
    if (this.type === 'tank') {
      this.speed = this.baseSpeed * 1.3;
    }
    
    for (const ability in this.abilityCooldowns) {
      this.abilityCooldowns[ability] *= 0.7;
    }
  }

  update(dt, gameState) {
    this.glowPulse += dt * 3;
    
    if (this.hitFlash > 0) {
      this.hitFlash -= dt * 5;
    }
    
    if (this.vulnerableTimer > 0) {
      this.vulnerableTimer -= dt;
      return;
    }
    
    if (this.isDashing) {
      if (this.dashTarget) {
        const dx = this.dashTarget.x - this.x;
        const dy = this.dashTarget.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 20) {
          this.isDashing = false;
          this.dashTarget = null;
          this.vulnerableTimer = 1.0;
        } else {
          this.x += (dx / dist) * this.speed * 3 * dt;
          this.y += (dy / dist) * this.speed * 3 * dt;
        }
      }
      return;
    }

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > this.radius + 60) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }

    for (const ability of this.abilities) {
      if (this.abilityCooldowns[ability] !== undefined) {
        this.abilityCooldowns[ability] -= dt;
        
        if (this.abilityCooldowns[ability] <= 0) {
          this.useAbility(ability, gameState);
        }
      }
    }
  }

  useAbility(ability, gameState) {
    switch (ability) {
      case 'speedBurst':
        this.speed = this.baseSpeed * 2;
        setTimeout(() => {
          this.speed = this.baseSpeed;
        }, 2000);
        this.abilityCooldowns[ability] = this.phase === 2 ? 4 : 6;
        break;
        
      case 'spawnEnemies':
        const count = this.phase === 2 ? 3 : 2;
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 * i) / count;
          this.pendingSpawns.push({
            type: 'normal',
            x: this.x + Math.cos(angle) * 80,
            y: this.y + Math.sin(angle) * 80
          });
        }
        this.abilityCooldowns[ability] = 10;
        break;
        
      case 'dash':
        this.isDashing = true;
        this.dashTarget = { x: this.targetX, y: this.targetY };
        this.abilityCooldowns[ability] = 4;
        break;
        
      case 'shieldPulse':
        this.abilityCooldowns[ability] = 5;
        break;
        
      case 'spawnTanks':
        this.pendingSpawns.push({
          type: 'tank',
          x: this.x + (Math.random() - 0.5) * 100,
          y: this.y + (Math.random() - 0.5) * 100
        });
        this.abilityCooldowns[ability] = this.phase === 2 ? 8 : 15;
        break;
    }
  }

  getPendingSpawns() {
    const spawns = [...this.pendingSpawns];
    this.pendingSpawns = [];
    return spawns;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const glowSize = 20 + Math.sin(this.glowPulse) * 10;
    const gradient = ctx.createRadialGradient(0, 0, this.radius, 0, 0, this.radius + glowSize);
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(0.5, `${this.color}88`);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + glowSize, 0, Math.PI * 2);
    ctx.fill();

    if (this.shieldHp > 0) {
      const shieldAlpha = 0.3 + (this.shieldHp / this.maxShieldHp) * 0.5;
      ctx.strokeStyle = `rgba(106, 255, 255, ${shieldAlpha})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 15, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;

    switch (this.type) {
      case 'standard':
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 0.3, 0, Math.PI * 2);
        ctx.fill();
        break;
        
      case 'fast':
        ctx.beginPath();
        ctx.moveTo(0, -this.radius);
        ctx.lineTo(this.radius, this.radius * 0.7);
        ctx.lineTo(0, this.radius * 0.3);
        ctx.lineTo(-this.radius, this.radius * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
        
      case 'shield':
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 * i) / 8;
          const nextAngle = (Math.PI * 2 * (i + 1)) / 8;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius);
          ctx.lineTo(Math.cos(nextAngle) * this.radius, Math.sin(nextAngle) * this.radius);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        break;
        
      case 'tank':
        ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
        ctx.strokeRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
        ctx.fillStyle = '#000000';
        ctx.fillRect(-this.radius * 0.4, -this.radius * 0.4, this.radius * 0.8, this.radius * 0.8);
        break;
    }

    if (this.hitFlash > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.hitFlash * 0.5})`;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.vulnerableTimer > 0) {
      ctx.strokeStyle = '#FFAA00';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();

    const barWidth = this.radius * 3;
    const barHeight = 10;
    const barX = this.x - barWidth / 2;
    const barY = this.y - this.radius - 30;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
    
    const hpPercent = this.hp / this.maxHp;
    ctx.fillStyle = '#FF0055';
    ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
    
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }
}
