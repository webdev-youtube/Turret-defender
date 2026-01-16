export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.mouseX = 0;
    this.mouseY = 0;
    this.isPointerDown = false;
    this.enabled = true;
    
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);
    
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerUp);
    canvas.addEventListener('contextmenu', this.onContextMenu);
    
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
  }

  updatePosition(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    this.mouseX = (clientX - rect.left) * scaleX;
    this.mouseY = (clientY - rect.top) * scaleY;
  }

  onPointerMove(e) {
    if (!this.enabled) return;
    this.updatePosition(e.clientX, e.clientY);
  }

  onPointerDown(e) {
    if (!this.enabled) return;
    e.preventDefault();
    this.isPointerDown = true;
    this.updatePosition(e.clientX, e.clientY);
  }

  onPointerUp(e) {
    this.isPointerDown = false;
  }

  onTouchStart(e) {
    if (!this.enabled) return;
    e.preventDefault();
    this.isPointerDown = true;
    if (e.touches.length > 0) {
      this.updatePosition(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  onTouchMove(e) {
    if (!this.enabled) return;
    e.preventDefault();
    if (e.touches.length > 0) {
      this.updatePosition(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  onTouchEnd(e) {
    e.preventDefault();
    this.isPointerDown = false;
  }

  onContextMenu(e) {
    e.preventDefault();
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
    this.isPointerDown = false;
  }

  destroy() {
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerUp);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    this.canvas.removeEventListener('touchcancel', this.onTouchEnd);
  }
}
