import { Entity } from './Entity.js';

export class Bullet extends Entity {
  constructor(x, y, angle, speed, damage, pierce, isCrit) {
    super(x, y);
    this.angle = angle;
    this.speed = speed;
    this.damage = damage;
    this.pierce = pierce;
    this.pierceCount = 0;
    this.isCrit = isCrit;
    this.radius = isCrit ? 6 : 4;
    this.trail = [];
    this.maxTrail = 8;
    this.hitEnemies = new Set();
  }

  update(dt) {
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrail) {
      this.trail.pop();
    }

    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
  }

  onHitEnemy(enemyId) {
    if (this.hitEnemies.has(enemyId)) return false;
    
    this.hitEnemies.add(enemyId);
    this.pierceCount++;
    
    if (this.pierceCount > this.pierce) {
      this.destroy();
    }
    
    return true;
  }

  render(ctx) {
    for (let i = 0; i < this.trail.length; i++) {
      const alpha = (1 - i / this.trail.length) * 0.5;
      const size = this.radius * (1 - i / this.trail.length);
      ctx.fillStyle = this.isCrit 
        ? `rgba(255, 255, 0, ${alpha})` 
        : `rgba(0, 240, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 2);
    gradient.addColorStop(0, this.isCrit ? '#FFFF00' : '#FFFFFF');
    gradient.addColorStop(0.5, this.isCrit ? '#FFAA00' : '#00F0FF');
    gradient.addColorStop(1, 'transparent');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class BulletPool {
  constructor(maxSize = 200) {
    this.pool = [];
    this.active = [];
    this.maxSize = maxSize;
  }

  get(x, y, angle, speed, damage, pierce, isCrit) {
    let bullet;
    
    if (this.pool.length > 0) {
      bullet = this.pool.pop();
      bullet.x = x;
      bullet.y = y;
      bullet.angle = angle;
      bullet.speed = speed;
      bullet.damage = damage;
      bullet.pierce = pierce;
      bullet.pierceCount = 0;
      bullet.isCrit = isCrit;
      bullet.radius = isCrit ? 6 : 4;
      bullet.active = true;
      bullet.trail = [];
      bullet.hitEnemies = new Set();
    } else {
      bullet = new Bullet(x, y, angle, speed, damage, pierce, isCrit);
    }
    
    this.active.push(bullet);
    return bullet;
  }

  update(dt, bounds) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const bullet = this.active[i];
      bullet.update(dt);
      
      if (!bullet.active || 
          bullet.x < -50 || bullet.x > bounds.width + 50 ||
          bullet.y < -50 || bullet.y > bounds.height + 50) {
        bullet.active = false;
        this.pool.push(bullet);
        this.active.splice(i, 1);
      }
    }
  }

  render(ctx) {
    for (const bullet of this.active) {
      bullet.render(ctx);
    }
  }

  clear() {
    this.pool.push(...this.active);
    this.active = [];
  }
}
