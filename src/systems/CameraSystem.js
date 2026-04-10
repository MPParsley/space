// CameraSystem — handles pan, pinch-to-zoom, and tap detection
// Works with both mouse (desktop) and multi-touch (mobile)

const MIN_ZOOM = 0.12;
const MAX_ZOOM = 4.0;
const INITIAL_ZOOM = 0.22;
const WORLD_HALF = 1600; // camera bounds: ± this value from origin

export class CameraSystem {
  constructor(scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;

    // Initial camera setup
    this.camera.setBounds(-WORLD_HALF, -WORLD_HALF, WORLD_HALF * 2, WORLD_HALF * 2);
    this.camera.setZoom(INITIAL_ZOOM);
    this.camera.centerOn(0, 0);

    // Pointer state: Map<pointerId, {x, y, startX, startY, startTime, moved}>
    this.ptrs = new Map();

    // Single-finger pan state
    this.dragScrollX = 0;
    this.dragScrollY = 0;

    // Two-finger pinch state
    this.pinchActive = false;
    this.pinchStartDist = 0;
    this.pinchStartZoom = 1;
    this.pinchStartMidX = 0;
    this.pinchStartMidY = 0;
    this.pinchScrollX = 0;
    this.pinchScrollY = 0;

    // Tap callback — set by SolarSystemScene
    this.onTap = null;

    scene.input.on('pointerdown', this._down, this);
    scene.input.on('pointermove', this._move, this);
    scene.input.on('pointerup', this._up, this);
    scene.input.on('pointerout', this._cancel, this);

    // Mouse wheel zoom
    scene.input.on('wheel', (_ptr, _objs, _dx, dy) => {
      const newZoom = Phaser.Math.Clamp(
        this.camera.zoom * (dy > 0 ? 0.9 : 1.1),
        MIN_ZOOM, MAX_ZOOM,
      );
      this.camera.setZoom(newZoom);
    });
  }

  _down(ptr) {
    // Ignore touches inside the virtual joystick area so they don't pan/tap
    const ui = this.scene.scene.get('UIScene');
    if (ui && ui._isJoystickTouch && ui._isJoystickTouch(ptr.x, ptr.y)) return;

    this.ptrs.set(ptr.id, {
      x: ptr.x, y: ptr.y,
      startX: ptr.x, startY: ptr.y,
      startTime: Date.now(),
      moved: false,
    });

    if (this.ptrs.size === 1) {
      // Start single-finger drag
      this.dragScrollX = this.camera.scrollX;
      this.dragScrollY = this.camera.scrollY;
    } else if (this.ptrs.size === 2) {
      // Start pinch — cancel any existing single drag
      this._startPinch();
    }
  }

  _startPinch() {
    const [p1, p2] = Array.from(this.ptrs.values());
    this.pinchActive = true;
    this.pinchStartDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    this.pinchStartZoom = this.camera.zoom;
    this.pinchStartMidX = (p1.x + p2.x) * 0.5;
    this.pinchStartMidY = (p1.y + p2.y) * 0.5;
    this.pinchScrollX = this.camera.scrollX;
    this.pinchScrollY = this.camera.scrollY;
  }

  _move(ptr) {
    const p = this.ptrs.get(ptr.id);
    if (!p) return;

    if (Math.hypot(ptr.x - p.startX, ptr.y - p.startY) > 8) p.moved = true;
    p.x = ptr.x;
    p.y = ptr.y;

    if (this.ptrs.size >= 2 && this.pinchActive) {
      this._handlePinch();
    } else if (this.ptrs.size === 1) {
      this._handlePan(p);
    }
  }

  _handlePinch() {
    const [p1, p2] = Array.from(this.ptrs.values());
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const zoom = Phaser.Math.Clamp(
      this.pinchStartZoom * (dist / this.pinchStartDist),
      MIN_ZOOM, MAX_ZOOM,
    );
    this.camera.setZoom(zoom);

    // Two-finger pan (track midpoint movement)
    const midX = (p1.x + p2.x) * 0.5;
    const midY = (p1.y + p2.y) * 0.5;
    this.camera.scrollX = this.pinchScrollX + (this.pinchStartMidX - midX) / zoom;
    this.camera.scrollY = this.pinchScrollY + (this.pinchStartMidY - midY) / zoom;
  }

  _handlePan(p) {
    const zoom = this.camera.zoom;
    this.camera.scrollX = this.dragScrollX + (p.startX - p.x) / zoom;
    this.camera.scrollY = this.dragScrollY + (p.startY - p.y) / zoom;
  }

  _up(ptr) {
    const p = this.ptrs.get(ptr.id);
    if (!p) return;

    // Tap = short, barely moved, only one pointer at time of release
    const duration = Date.now() - p.startTime;
    if (!p.moved && duration < 320 && this.ptrs.size === 1 && this.onTap) {
      this.onTap(ptr.x, ptr.y);
    }

    this.ptrs.delete(ptr.id);
    this._afterRelease();
  }

  _cancel(ptr) {
    this.ptrs.delete(ptr.id);
    this._afterRelease();
  }

  _afterRelease() {
    if (this.ptrs.size < 2) {
      this.pinchActive = false;
    }
    if (this.ptrs.size === 1) {
      // Restart single-finger drag from current position
      const p = Array.from(this.ptrs.values())[0];
      p.startX = p.x;
      p.startY = p.y;
      this.dragScrollX = this.camera.scrollX;
      this.dragScrollY = this.camera.scrollY;
    }
  }

  /** True while any pointer is actively panning/pinching — used by soft-follow. */
  isPanning() {
    return this.ptrs.size > 0;
  }

  // Smoothly zoom in and centre on a world point
  focusOn(worldX, worldY, zoom, duration = 750) {
    const z = Phaser.Math.Clamp(zoom, MIN_ZOOM, MAX_ZOOM);
    this.scene.tweens.add({
      targets: this.camera,
      zoom: z,
      scrollX: worldX - this.camera.width * 0.5 / z,
      scrollY: worldY - this.camera.height * 0.5 / z,
      duration,
      ease: 'Sine.easeInOut',
    });
  }
}
