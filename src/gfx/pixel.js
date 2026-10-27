import { Texture, CanvasSource } from 'pixi.js';

/** Deterministic RNG (mulberry32) so procedurally drawn art looks the same every run. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(x, y = 0, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

export const hash01 = (x, y, s) => hash(x, y, s) / 4294967296;

/** Tiny pixel canvas with helpers for hand-made pixel art. */
export class PC {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.ctx.imageSmoothingEnabled = false;
  }
  px(x, y, col) {
    this.ctx.fillStyle = col;
    this.ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  }
  rect(x, y, w, h, col) {
    if (w <= 0 || h <= 0) return;
    this.ctx.fillStyle = col;
    this.ctx.fillRect(Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h));
  }
  hl(x, y, w, col) { this.rect(x, y, w, 1, col); }
  vl(x, y, h, col) { this.rect(x, y, 1, h, col); }
  frame(x, y, w, h, col) {
    this.hl(x, y, w, col);
    this.hl(x, y + h - 1, w, col);
    this.vl(x, y, h, col);
    this.vl(x + w - 1, y, h, col);
  }
  /** filled pixel ellipse */
  ellipse(cx, cy, rx, ry, col) {
    for (let y = -ry; y <= ry; y++) {
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / (ry + 0.5)) ** 2)));
      this.rect(cx - half, cy + y, half * 2 + 1, 1, col);
    }
  }
  line(x0, y0, x1, y1, col) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, col);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  /** random pixels of a color */
  speckle(x, y, w, h, col, density, r) {
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) if (r() < density) this.px(x + i, y + j, col);
  }
  /** draw an ascii pixel map; '.' and ' ' are transparent */
  pattern(rows, pal, ox = 0, oy = 0) {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        const col = pal[ch];
        if (col) this.px(ox + x, oy + y, col);
      }
    });
  }
  draw(other, x = 0, y = 0) {
    this.ctx.drawImage(other.canvas ?? other, Math.floor(x), Math.floor(y));
  }
  flipped() {
    const out = new PC(this.w, this.h);
    out.ctx.translate(this.w, 0);
    out.ctx.scale(-1, 1);
    out.ctx.drawImage(this.canvas, 0, 0);
    return out;
  }
  /** add a 1px outline around every opaque region */
  outline(col) {
    const { w, h } = this;
    const data = this.ctx.getImageData(0, 0, w, h).data;
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 0;
    const pts = [];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) pts.push([x, y]);
    for (const [x, y] of pts) this.px(x, y, col);
  }
  texture() {
    return new Texture({ source: new CanvasSource({ resource: this.canvas, scaleMode: 'nearest' }) });
  }
}
