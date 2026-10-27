import { c, BLOOD, OUT } from './palette.js';

// Shared palettes and drawing helpers for props.

export const WOOD = { hi: c(0x8c6a4c), top: c(0x76583e), mid: c(0x5e4532), dk: c(0x45321f), deep: c(0x2c2016) };
export const DWOOD = { hi: c(0x6a5442), top: c(0x54412f), mid: c(0x433427), dk: c(0x30251c), deep: c(0x1b1410) };
export const LWOOD = { hi: c(0xa3845f), top: c(0x8d6f4e), mid: c(0x735a3f), dk: c(0x56432f), deep: c(0x382b1f) };
export const GWOOD = { hi: c(0x9c9384), top: c(0x857c6e), mid: c(0x6c6458), dk: c(0x524b42), deep: c(0x35302a) }; // weathered, grey
export const METAL = { hi: c(0xa3a19a), top: c(0x85837c), mid: c(0x6a6862), dk: c(0x4a4945), deep: c(0x2b2a28) };
export const IRON = { hi: c(0x6e6b66), top: c(0x58554f), mid: c(0x45423e), dk: c(0x302e2b), deep: c(0x1c1b19) };
export const PORC = { hi: c(0xd6d2c8), top: c(0xbcb7ac), mid: c(0x9e998f), dk: c(0x77736b), deep: c(0x4c4944) };
export const STONE = { hi: c(0x938e85), top: c(0x7c776f), mid: c(0x67635c), dk: c(0x4d4a45), deep: c(0x302e2b) };
export const SHEET = { hi: c(0xaeaa9f), top: c(0x959187), mid: c(0x7f7b72), dk: c(0x625f58), deep: c(0x45433f) };
export const BONE = { hi: c(0xe8e0cb), top: c(0xc2b8a0), mid: c(0x938a77), dk: c(0x645d51) };
export const PAPER = c(0xc9c1ad);
export const DUST = c(0x9d988e);
export const FLAME = { a: c(0xfff0c8), b: c(0xe8c98a), c: c(0xa8875a) };

/** a 3/4 view box: lighter top face and a darker front face */
export function box(pc, x, y, w, h, top, P) {
  pc.rect(x, y, w, h, OUT);
  pc.rect(x + 1, y + 1, w - 2, top - 1, P.top);
  pc.hl(x + 1, y + 1, w - 2, P.hi);
  pc.rect(x + 1, y + top, w - 2, h - top - 1, P.mid);
  pc.hl(x + 1, y + top, w - 2, P.dk);
  pc.hl(x + 1, y + h - 2, w - 2, P.dk);
}

export function knob(pc, x, y) {
  pc.px(x, y, c(0xb09a6a));
}

/** tiny flickering candle flame, x/y = wick top */
export function flame(pc, x, y, frame) {
  if (frame % 2 === 0) {
    pc.px(x, y - 3, FLAME.c);
    pc.px(x, y - 2, FLAME.b);
    pc.px(x, y - 1, FLAME.a);
  } else {
    pc.px(x + (frame === 1 ? 1 : 0), y - 3, FLAME.c);
    pc.px(x, y - 2, FLAME.a);
    pc.px(x, y - 1, FLAME.b);
  }
}

/** irregular splatter built from overlapping lumps, a few glossy pixels and flung droplets */
export function bloodBlob(pc, cx, cy, rx, ry, r) {
  cx = Math.round(cx); cy = Math.round(cy);
  const lumps = [];
  const n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    lumps.push([
      cx + Math.round((r() - 0.5) * rx * 1.3),
      cy + Math.round((r() - 0.5) * ry * 1.3),
      Math.max(1, Math.round(rx * (0.35 + r() * 0.45))),
      Math.max(1, Math.round(ry * (0.35 + r() * 0.45))),
    ]);
  }
  for (const [x, y, a, b] of lumps) pc.ellipse(x, y, a, b, BLOOD.deep);
  for (const [x, y, a, b] of lumps) if (a > 1 && b > 1) pc.ellipse(x, y, a - 1, b - 1, BLOOD.dark);
  for (const [x, y, a] of lumps) if (a > 2 && r() < 0.7) pc.px(x - 1, y - 1, BLOOD.main);
  pc.px(lumps[0][0] - 1, lumps[0][1] - 1, BLOOD.light);
  const drops = 4 + Math.floor(r() * 6);
  for (let i = 0; i < drops; i++) {
    const a = r() * Math.PI * 2, d = rx + 1 + r() * 5;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * (ry / Math.max(1, rx));
    pc.px(x, y, r() < 0.6 ? BLOOD.dark : BLOOD.main);
    if (r() < 0.3) pc.px(x + Math.sign(Math.cos(a)), y, BLOOD.deep);
  }
}

export function drip(pc, x, y, len, col = BLOOD.dark) {
  pc.vl(x, y, len, col);
  pc.px(x, y + len, BLOOD.deep);
}

export function cobwebPx(pc, x, y, size, flipX) {
  pc.ctx.save();
  pc.ctx.globalAlpha = 0.45;
  const col = c(0xdedad2);
  const sx = flipX ? -1 : 1;
  for (let i = 0; i <= 4; i++) {
    const a = (i / 4) * (Math.PI / 2);
    pc.line(x, y, x + sx * Math.cos(a) * size, y + Math.sin(a) * size, col);
  }
  for (let k = 1; k <= 3; k++) {
    const rr = (size * k) / 3.5;
    let px = x + sx * rr, py = y;
    for (let i = 1; i <= 4; i++) {
      const a = (i / 4) * (Math.PI / 2);
      const nx = x + sx * Math.cos(a) * rr * 0.9, ny = y + Math.sin(a) * rr * 0.9;
      pc.line(px, py, nx, ny, col);
      px = nx; py = ny;
    }
  }
  pc.ctx.restore();
}

/** soft dark ellipse under a standing object */
export function groundShadow(pc, cx, cy, rx, ry, alpha = 0.4) {
  pc.ctx.save();
  pc.ctx.globalAlpha = alpha;
  pc.ellipse(cx, cy, rx, ry, '#000000');
  pc.ctx.restore();
}
