import { Sprite, Texture, CanvasSource } from 'pixi.js';
import { VIEW_W, VIEW_H } from '../config.js';

/**
 * Darkness overlay drawn on a small canvas every frame: ambient darkness with holes
 * cut out around light sources, the attic's dark zone, a vignette, and film grain.
 */
export class Lighting {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = VIEW_W;
    this.canvas.height = VIEW_H;
    this.ctx = this.canvas.getContext('2d');
    this.source = new CanvasSource({ resource: this.canvas, scaleMode: 'nearest' });
    this.sprite = new Sprite(new Texture({ source: this.source }));

    // static vignette
    const v = document.createElement('canvas');
    v.width = VIEW_W;
    v.height = VIEW_H;
    const vc = v.getContext('2d');
    const g = vc.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.68);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.6)');
    vc.fillStyle = g;
    vc.fillRect(0, 0, VIEW_W, VIEW_H);
    this.vignette = v;

    // a few frames of grain
    this.grain = [];
    for (let i = 0; i < 4; i++) {
      const n = document.createElement('canvas');
      n.width = VIEW_W;
      n.height = VIEW_H;
      const nc = n.getContext('2d');
      const img = nc.createImageData(VIEW_W, VIEW_H);
      for (let p = 0; p < img.data.length; p += 4) {
        const on = Math.random() < 0.5;
        const v = on ? 255 : 0;
        img.data[p] = img.data[p + 1] = img.data[p + 2] = v;
        img.data[p + 3] = Math.random() < 0.35 ? 14 : 0;
      }
      nc.putImageData(img, 0, 0);
      this.grain.push(n);
    }
    this.time = 0;
  }

  /** `player` is anything with worldX / worldY; `lightScale` shrinks the player's light (e.g. while hiding) */
  render(world, camX, camY, player, dt, lightScale = 1) {
    this.time += dt;
    const ctx = this.ctx;
    const def = world.def;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = `rgba(4,3,3,${def.ambient ?? 0.5})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.globalCompositeOperation = 'destination-out';
    const hole = (x, y, r, a) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(0.55, `rgba(0,0,0,${a * 0.55})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    if (lightScale > 0) hole(player.worldX + 8 - camX, player.worldY - camY, (def.playerLight ?? 84) * lightScale, def.playerLightAlpha ?? 0.85);
    for (const l of world.lights) {
      let r = l.r, a = l.a;
      if (l.delay !== undefined) {
        // ignition: a quick flare that settles
        const k = (world.time - l.delay) / 0.4;
        if (k <= 0) continue;
        const grow = Math.min(1, k);
        r *= grow * (1 + Math.max(0, 1 - k) * 0.25);
        a *= grow;
      }
      if (l.flicker) r *= 1 + Math.sin(this.time * 11 + l.phase) * 0.05 + (Math.random() - 0.5) * 0.06;
      hole(l.x - camX, l.y - camY, r, a);
    }

    ctx.globalCompositeOperation = 'source-over';
    for (const z of world.zones) {
      const a = 1 - z.k;
      if (a <= 0) continue;
      const [x, y, w, h] = z.mask;
      ctx.fillStyle = `rgba(0,0,0,${a})`;
      ctx.fillRect(x * 16 - camX, y * 16 - camY, w * 16, h * 16);
    }
    if (def.darkZone) {
      const { from, to, max } = def.darkZone;
      const g = ctx.createLinearGradient(from - camX, 0, to - camX, 0);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, `rgba(0,0,0,${max})`);
      ctx.fillStyle = g;
      ctx.fillRect(from - camX, 0, VIEW_W, VIEW_H);
    }
    ctx.drawImage(this.vignette, 0, 0);
    ctx.drawImage(this.grain[Math.floor(this.time * 14) % this.grain.length], 0, 0);
    this.source.update();
  }
}
