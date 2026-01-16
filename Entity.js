export class Entity {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.active = true;
  }

  update(dt) {}

  render(ctx) {}

  destroy() {
    this.active = false;
  }
}
