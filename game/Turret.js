import { Entity } from './Entity.js';

export class Turret extends Entity {
  constructor(x, y) {
    super(x, y);
    this.angle = -Math.PI / 2;
    this.baseRadius = 28;
    this.barrelLength = 35;
    this.barrelWidth = 8;
    
    this.stats = {
      damage: 10,
      fireRate: 5,
      projectileSpeed: 800,
      projectileCount: 1,
      spread: 5,
      critChance: 0.05,
      critMultiplier: 2,
      pierce: 0,
      maxHp: 100,
      hp: 100,
      armor: 0,
      regen: 0,
      luck: 0
    };
    
    this.fireTimer = 0;
    this.isFiring = false;
    this.glowIntensity = 0;
    this.targetGlow = 0;
    this.damageFlash = 0;
  }

  get fireInterval() {
    return 1 / this.stats.fireRate;
  }

  setTargetAngle(targetX, targetY) {
    this.angle = Math.atan2(targetY - this.y, targetX - this.x);
  }

  startFiring() {
    this.isFiring = true;
  }

  stopFiring() {
    this.isFiring = false;
  }

  takeDamage(amount) {
    const actualDamage = Math.max(1, amount - this.stats.armor);
    this.stats.hp = Math.max(0, this.stats.hp - actualDamage);
    this.damageFlash = 1;
    return this.stats.hp <= 0;
  }

  heal(amount) {
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amount);
  }

  update(dt) {
    if (this.stats.regen > 0 && this.stats.hp < this.stats.maxHp) {
      this.heal(this.stats.regen * dt);
    }

    this.fireTimer += dt;
    
    const totalStats = this.stats.damage + this.stats.fireRate + this.stats.projectileSpeed / 100;
    this.targetGlow = Math.min(1, totalStats / 100);
    this.glowIntensity += (this.targetGlow - this.glowIntensity) * dt * 2;
    
    if (this.damageFlash > 0) {
      this.damageFlash -= dt * 5;
    }
  }

  canFire() {
    return this.isFiring && this.fireTimer >= this.fireInterval;
  }

  fire() {
    this.fireTimer = 0;
    const bullets = [];
    const count = this.stats.projectileCount;
    const spreadRad = (this.stats.spread * Math.PI) / 180;
    
    for (let i = 0; i < count; i++) {
      let angle = this.angle;
      if (count > 1) {
        angle += spreadRad * ((i / (count - 1)) - 0.5);
      } else if (this.stats.spread > 0) {
        angle += (Math.random() - 0.5) * spreadRad;
      }
      
      const isCrit = Math.random() < this.stats.critChance;
      const damage = isCrit ? this.stats.damage * this.stats.critMultiplier : this.stats.damage;
      
      bullets.push({
        x: this.x + Math.cos(this.angle) * this.barrelLength,
        y: this.y + Math.sin(this.angle) * this.barrelLength,
        angle,
        speed: this.stats.projectileSpeed,
        damage,
        pierce: this.stats.pierce,
        isCrit
      });
    }
    
    return bullets;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const glowColor = `rgba(0, 240, 255, ${0.2 + this.glowIntensity * 0.4})`;
    const gradient = ctx.createRadialGradient(0, 0, this.baseRadius * 0.5, 0, 0, this.baseRadius * 2);
    gradient.addColorStop(0, glowColor);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.baseRadius * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1A1A24';
    ctx.strokeStyle = '#00F0FF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, this.baseRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0A0A0F';
    ctx.beginPath();
    ctx.arc(0, 0, this.baseRadius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(this.angle);
    
    const barrelGradient = ctx.createLinearGradient(0, -this.barrelWidth/2, 0, this.barrelWidth/2);
    barrelGradient.addColorStop(0, '#00D0E0');
    barrelGradient.addColorStop(0.5, '#00F0FF');
    barrelGradient.addColorStop(1, '#00D0E0');
    ctx.fillStyle = barrelGradient;
    
    ctx.beginPath();
    ctx.roundRect(
      this.baseRadius * 0.3, 
      -this.barrelWidth / 2, 
      this.barrelLength, 
      this.barrelWidth,
      4
    );
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (this.isFiring && this.fireTimer < 0.05) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(this.barrelLength + 10, 0, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    if (this.damageFlash > 0) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.fillStyle = `rgba(255, 0, 85, ${this.damageFlash * 0.5})`;
      ctx.beginPath();
      ctx.arc(0, 0, this.baseRadius * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
