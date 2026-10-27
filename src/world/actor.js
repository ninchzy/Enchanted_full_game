import { Sprite } from 'pixi.js';
import { TILE, WALK_TIME, RUN_TIME } from '../config.js';

export const DELTA = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

// RPG Maker walk cycle: idle, left step, idle, right step
const CYCLE = [1, 0, 1, 2];

/** A character that moves tile by tile with smooth interpolation. */
export class Actor {
  constructor(sheet, x, y, dir = 'down') {
    this.sheet = sheet;
    this.tx = x;
    this.ty = y;
    this.dir = dir;
    this.moving = false;
    this.from = [x, y];
    this.t = 0;
    this.step = 0;
    this.idleTime = 0;
    this.idleAnim = false; // cycle frames while standing (used by the cloaked figure)
    this.sprite = new Sprite(sheet.tex[dir][1]);
    this.sprite.anchor.set(0.5, 1);
    this.sync();
  }

  get worldX() {
    if (!this.moving) return this.tx * TILE;
    return (this.from[0] + (this.tx - this.from[0]) * this.t) * TILE;
  }
  get worldY() {
    if (!this.moving) return this.ty * TILE;
    return (this.from[1] + (this.ty - this.from[1]) * this.t) * TILE;
  }

  face(dir) {
    this.dir = dir;
    this.sync();
  }

  startMove(dir, run = false) {
    const [dx, dy] = DELTA[dir];
    this.dir = dir;
    this.from = [this.tx, this.ty];
    this.tx += dx;
    this.ty += dy;
    this.t = 0;
    this.stepTime = run ? RUN_TIME : this.walkTime ?? WALK_TIME;
    this.moving = true;
  }

  /** returns true on the frame the actor arrives on its tile */
  update(dt) {
    let arrived = false;
    if (this.moving) {
      const before = this.t;
      this.t = Math.min(1, this.t + dt / (this.stepTime ?? WALK_TIME));
      if (before < 0.5 && this.t >= 0.5) this.step++;
      if (this.t >= 1) {
        this.moving = false;
        this.step++;
        arrived = true;
      }
    } else if (this.idleAnim) {
      this.idleTime += dt;
    }
    this.sync();
    return arrived;
  }

  sync() {
    let frame = 1;
    if (this.moving) frame = CYCLE[this.step % 4];
    else if (this.idleAnim) frame = [1, 0, 1, 2][Math.floor(this.idleTime * 1.6) % 4];
    else if (this.step % 2 === 1) this.step++; // always restart the cycle from idle
    // `pose`: a texture that replaces the walk cycle (e.g. him kneeling in a cutscene)
    this.sprite.texture = this.pose ?? this.sheet.tex[this.dir][frame];
    this.sprite.x = Math.round(this.worldX) + TILE / 2;
    this.sprite.y = Math.round(this.worldY) + TILE + 1;
    this.sprite.zIndex = this.worldY + TILE + 0.5;
  }
}
