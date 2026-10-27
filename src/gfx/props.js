import { PC, rng, hash } from './pixel.js';
import { c, BLOOD, OUT, BLACK } from './palette.js';
import { WOOD, DWOOD, LWOOD, METAL, PORC, STONE, SHEET, PAPER, DUST, box, knob, flame, bloodBlob, drip, cobwebPx } from './draw.js';
import { DUNGEON_PROPS } from './props_dungeon.js';
import { OUTDOOR_PROPS } from './props_outdoor.js';
import { ATTIC_PROPS } from './props_attic.js';
import { REMAINS_PROPS } from './props_remains.js';
import { VIEWS, viewInfo, drawView } from './props_views.js';

// Every prop is drawn in code. A prop definition:
//   w, h      sprite size in px (may be functions of the instance options)
//   tw, th    footprint in tiles (sprite is bottom-aligned and centred on it)
//   layer     'obj' (y-sorted with characters) | 'wall' (painted on the wall) | 'floor' (decal)
//   solid     [x, y, w, h] in footprint tiles, or null. Defaults to the whole footprint for 'obj'
//   frames    number of animation frames (draw receives the frame index)
//   light     { r, a, dx, dy, flicker } light emitted, relative to the footprint centre
/* ------------------------------------------------------------------ */
/* furniture                                                           */
/* ------------------------------------------------------------------ */

const BOOK_COLS = [0x6b3f33, 0x3e5a48, 0x4a4f6a, 0x7a6a48, 0x5e4a5c, 0x8a8170, 0x3f3a35, 0x6a5a3a];

function drawBookshelf(pc, r, o) {
  const P = o.dark ? DWOOD : WOOD;
  box(pc, 0, 0, 32, 40, 4, P);
  pc.rect(3, 5, 26, 33, P.deep);
  pc.rect(1, 4, 2, 35, P.mid);
  pc.rect(29, 4, 2, 35, P.mid);
  const shelves = [15, 26, 37];
  let top = 5;
  for (const sy of shelves) {
    let x = 3;
    while (x < 28) {
      if (r() < 0.13) { x += 2 + Math.floor(r() * 3); continue; }
      const bw = r() < 0.6 ? 2 : 3;
      const bh = Math.min(sy - top, 6 + Math.floor(r() * 4));
      if (x + bw > 29) break;
      if (o.occult && r() < 0.25) {
        // a little skull or a jar instead of a book
        if (r() < 0.5) {
          pc.rect(x, sy - 4, 4, 4, c(0xd8d0bc));
          pc.px(x + 1, sy - 3, OUT); pc.px(x + 2, sy - 3, OUT);
        } else {
          pc.rect(x, sy - 5, 3, 5, c(0x6e7a70));
          pc.px(x + 1, sy - 3, BLOOD.deep);
        }
        x += 4;
        continue;
      }
      const hex = BOOK_COLS[Math.floor(r() * BOOK_COLS.length)];
      const f = o.occult ? 0.6 : 1;
      pc.rect(x, sy - bh, bw, bh, c(hex, f));
      pc.hl(x, sy - bh, bw, c(0xb0a690, 0.8));
      pc.vl(x + bw - 1, sy - bh + 1, bh - 1, c(hex, f * 0.7));
      if (bh > 6) pc.hl(x, sy - bh + 2, bw, c(0xa09070, 0.7));
      x += bw;
    }
    pc.rect(3, sy, 26, 2, P.top);
    pc.hl(3, sy + 1, 26, P.dk);
    pc.speckle(3, sy, 26, 1, DUST, 0.35, r);
    top = sy + 2;
  }
  pc.speckle(1, 1, 30, 3, DUST, 0.3, r);
  if (o.cobweb) cobwebPx(pc, 3, 5, 9, false);
}

function drawBed(pc, r, o) {
  const W = pc.w;
  const P = o.dark ? DWOOD : WOOD;
  const blanket = o.blanket ?? 0x56606b;
  // headboard
  box(pc, 3, 0, W - 6, 14, 3, P);
  pc.rect(0, 0, 5, 17, OUT); pc.rect(1, 1, 3, 15, P.mid); pc.hl(1, 1, 3, P.hi);
  pc.rect(W - 5, 0, 5, 17, OUT); pc.rect(W - 4, 1, 3, 15, P.mid); pc.hl(W - 4, 1, 3, P.hi);
  pc.rect(6, 5, W - 12, 6, P.dk);
  // mattress
  pc.rect(2, 12, W - 4, 37, OUT);
  if (o.bare) {
    pc.rect(3, 13, W - 6, 33, c(0x8f887a));
    pc.speckle(3, 13, W - 6, 33, c(0x7a7366), 0.25, r);
    // torn open, springs showing
    pc.rect(8, 24, W - 18, 10, c(0x2a2724));
    for (let x = 9; x < W - 11; x += 3) { pc.px(x, 27, METAL.mid); pc.px(x + 1, 28, METAL.hi); pc.px(x, 30, METAL.mid); }
    pc.ellipse(W - 12, 18, 3, 2, c(0x6e6656));
  } else {
    pc.rect(3, 13, W - 6, 33, c(0xcfc9ba));
    // pillows
    const pw = W > 32 ? Math.floor((W - 10) / 2) : W - 8;
    for (let i = 0; i < (W > 32 ? 2 : 1); i++) {
      const px = 4 + i * (pw + 2);
      pc.rect(px, 14, pw, 7, c(0xbab3a3));
      pc.hl(px, 14, pw, c(0xd8d2c4));
      pc.hl(px, 20, pw, c(0x99927f));
    }
    // blanket with a turned-down edge and wrinkles
    pc.rect(3, 23, W - 6, 23, c(blanket));
    pc.rect(3, 22, W - 6, 2, c(0xcfc9ba));
    pc.hl(3, 24, W - 6, c(blanket, 0.7));
    for (let i = 0; i < 4; i++) {
      const wx = 5 + Math.floor(r() * (W - 14)), wy = 27 + Math.floor(r() * 14);
      pc.line(wx, wy, wx + 4, wy + 2, c(blanket, 0.78));
    }
    pc.vl(3, 23, 23, c(blanket, 0.75));
  }
  pc.rect(3, 45, W - 6, 3, c(o.bare ? 0x6e6758 : blanket, 0.6));
  // footboard
  box(pc, 0, 46, W, 8, 3, P);
  if (o.blood) {
    bloodBlob(pc, Math.floor(W * 0.62), 33, 5, 4, r);
    drip(pc, Math.floor(W * 0.62) + 2, 37, 9);
    drip(pc, Math.floor(W * 0.62) - 3, 36, 6);
  }
}

function drawNightstand(pc, r, o, f) {
  box(pc, 0, 10, 14, 14, 4, WOOD);
  pc.rect(2, 16, 10, 4, WOOD.dk);
  pc.hl(2, 16, 10, OUT);
  knob(pc, 7, 18);
  if (o.item === 'candle') {
    pc.rect(6, 6, 2, 5, c(0xd8d1c0));
    pc.px(6, 10, c(0xa8a090));
    flame(pc, 6, 6, f);
  } else if (o.item === 'lamp') {
    pc.rect(6, 6, 2, 5, METAL.dk);
    pc.rect(3, 1, 8, 5, OUT);
    pc.rect(4, 1, 6, 4, c(0xb2a78e));
    pc.hl(4, 1, 6, c(0xcabfa5));
    pc.px(9, 3, c(0x7a6f5a)); pc.px(5, 4, BLOOD.deep);
  } else if (o.item === 'book') {
    pc.rect(3, 9, 8, 2, c(0x4a4f6a));
    pc.hl(3, 9, 8, PAPER);
  }
}

function drawWardrobe(pc, r, o) {
  const P = o.dark ? DWOOD : WOOD;
  box(pc, 0, 0, 30, 46, 4, P);
  pc.rect(0, 0, 30, 2, OUT);
  pc.rect(2, 6, 12, 37, P.mid); pc.frame(2, 6, 12, 37, P.dk);
  pc.rect(16, 6, 12, 37, P.mid); pc.frame(16, 6, 12, 37, P.dk);
  pc.frame(4, 9, 8, 13, P.dk); pc.frame(4, 25, 8, 15, P.dk);
  pc.frame(18, 9, 8, 13, P.dk); pc.frame(18, 25, 8, 15, P.dk);
  pc.vl(14, 6, 37, OUT); pc.vl(15, 6, 37, P.deep);
  knob(pc, 12, 24); knob(pc, 17, 24);
  if (o.ajar) { pc.rect(15, 6, 3, 37, BLACK); pc.px(16, 30, c(0xc8c0ad)); pc.px(16, 31, c(0xc8c0ad)); }
  if (o.scratched) {
    const s = c(0xb7a78f);
    for (let i = 0; i < 4; i++) pc.line(5 + i * 2, 28, 7 + i * 2, 38, s);
    for (let i = 0; i < 3; i++) pc.line(19 + i * 2, 12, 22 + i * 2, 20, s);
  }
  pc.speckle(1, 1, 28, 3, DUST, 0.3, r);
}

function drawDresser(pc, r, o) {
  const P = o.dark ? DWOOD : WOOD;
  const top = pc.h - 22;
  if (o.mirror) {
    pc.rect(7, 0, 16, top + 2, OUT);
    pc.rect(8, 1, 14, top, P.mid);
    pc.rect(10, 3, 10, top - 4, c(0x59616a));
    pc.line(11, 4, 14, 8, c(0x8a939a));
    pc.line(16, 6, 13, top - 3, c(0xc9cdd0));
    pc.line(16, 6, 19, top - 6, c(0xc9cdd0));
    if (o.blood) { pc.vl(12, top - 9, 6, BLOOD.dark); pc.vl(13, top - 10, 7, BLOOD.main); }
  }
  box(pc, 0, top, 30, 22, 5, P);
  for (let i = 0; i < 3; i++) {
    const y = top + 6 + i * 5;
    pc.hl(2, y + 4, 26, P.dk);
    knob(pc, 8, y + 2); knob(pc, 21, y + 2);
  }
  if (o.items) {
    pc.rect(3, top + 1, 2, 3, c(0x7a8a8f)); pc.px(3, top, c(0xaab7b9));
    pc.rect(24, top + 2, 4, 2, PAPER);
  }
}

function drawSideTable(pc, r, o) {
  box(pc, 0, 12, 14, 6, 3, WOOD);
  pc.rect(1, 18, 2, 6, OUT); pc.vl(1, 18, 5, WOOD.dk);
  pc.rect(11, 18, 2, 6, OUT); pc.vl(11, 18, 5, WOOD.dk);
  pc.hl(2, 21, 10, WOOD.deep);
  if (o.vase !== false) {
    // vase with dead flowers
    pc.ellipse(7, 9, 2, 3, c(0x7d8a8c));
    pc.px(6, 8, c(0xa9b5b6));
    pc.rect(6, 5, 3, 2, c(0x6c787a));
    const stem = c(0x3c3a2e), head = c(0x6e5d4e);
    pc.line(7, 5, 5, 1, stem); pc.line(7, 5, 9, 0, stem); pc.line(7, 5, 11, 3, stem);
    pc.px(5, 1, head); pc.px(4, 2, head); pc.px(9, 0, head); pc.px(10, 1, head); pc.px(11, 3, head); pc.px(12, 4, head);
    pc.px(3, 13, head);
  }
}

function drawChair(pc, r, o) {
  const P = WOOD;
  if (o.dir === 'fallen') {
    pc.rect(0, 6, 16, 5, OUT); pc.rect(1, 7, 14, 3, P.mid); pc.hl(1, 7, 14, P.top);
    pc.rect(11, 0, 4, 7, OUT); pc.rect(12, 1, 2, 6, P.dk);
    pc.rect(2, 0, 2, 7, OUT); pc.rect(7, 0, 2, 7, OUT);
    return;
  }
  if (o.dir === 'up') {
    box(pc, 0, 4, 12, 6, 4, P);
    pc.rect(1, 10, 2, 8, OUT); pc.rect(9, 10, 2, 8, OUT);
    pc.rect(1, 6, 10, 10, OUT); pc.rect(2, 7, 8, 8, P.mid);
    pc.vl(4, 7, 8, P.dk); pc.vl(7, 7, 8, P.dk); pc.hl(2, 7, 8, P.top);
    return;
  }
  pc.rect(1, 0, 10, 10, OUT); pc.rect(2, 1, 8, 8, P.mid);
  pc.vl(4, 2, 7, P.dk); pc.vl(7, 2, 7, P.dk); pc.hl(2, 1, 8, P.hi);
  box(pc, 0, 9, 12, 6, 4, P);
  pc.rect(1, 15, 2, 5, OUT); pc.rect(9, 15, 2, 5, OUT);
}

function drawTable(pc, r, o) {
  const W = pc.w;
  box(pc, 0, 0, W, 22, 18, WOOD);
  for (let i = 0; i < 4; i++) pc.hl(2 + Math.floor(r() * 10), 4 + i * 4, W - 16, WOOD.mid);
  pc.rect(1, 22, 3, 8, OUT); pc.vl(2, 22, 7, WOOD.dk);
  pc.rect(W - 4, 22, 3, 8, OUT); pc.vl(W - 3, 22, 7, WOOD.dk);
  if (o.cloth) {
    pc.rect(3, 1, W - 6, 21, c(0xb5ae9f));
    pc.hl(3, 1, W - 6, c(0xc9c3b4));
    for (let x = 3; x < W - 3; x += 2) pc.px(x, 22, c(0x8f897c));
    bloodBlob(pc, W - 14, 12, 4, 3, r);
    drip(pc, W - 12, 18, 6);
  }
  if (o.plates) {
    for (const [px, py] of [[10, 6], [W - 12, 6], [W / 2, 14]]) {
      pc.ellipse(px, py, 4, 2, PORC.mid);
      pc.ellipse(px, py, 3, 1, PORC.hi);
      pc.px(px, py, c(0x4a3a2a)); pc.px(px + 1, py, c(0x3c4a2e));
    }
    pc.line(W / 2 - 6, 9, W / 2 - 2, 9, METAL.hi);
  }
  if (o.candle) {
    pc.rect(W / 2 - 1, 3, 2, 6, c(0xd8d1c0));
    pc.px(W / 2 - 1, 2, OUT);
  }
}

function drawCounter(pc, r, o, f) {
  const top = 9;
  // counter top
  pc.rect(0, 0, 16, pc.h, OUT);
  pc.rect(1, 1, 14, top - 1, c(0x8d8981));
  pc.hl(1, 1, 14, c(0xa7a39a));
  pc.hl(1, top - 1, 14, c(0x5d5a54));
  pc.speckle(1, 2, 14, top - 3, c(0x7a766e), 0.2, r);
  // cabinet front
  pc.rect(1, top, 14, pc.h - top - 1, WOOD.mid);
  pc.frame(2, top + 2, 12, pc.h - top - 4, WOOD.dk);
  knob(pc, o.kind === 'stove' ? 8 : 12, top + 5);
  if (o.kind === 'sink') {
    pc.rect(3, 2, 10, 5, OUT);
    pc.rect(4, 3, 8, 3, c(0x4b4f4f));
    pc.px(5, 4, c(0x2c2a26)); pc.px(9, 5, c(0x3c4a2e));
    pc.rect(7, 0, 2, 3, METAL.hi); pc.px(8, 2, METAL.dk);
  } else if (o.kind === 'stove') {
    pc.rect(1, 1, 14, top - 1, c(0x3d3c39));
    pc.hl(1, 1, 14, c(0x5a5955));
    for (const [bx, by] of [[4, 3], [11, 3], [4, 6], [11, 6]]) { pc.frame(bx - 2, by - 1, 4, 3, c(0x6c6a65)); }
    pc.rect(2, top + 2, 12, pc.h - top - 4, METAL.mid);
    pc.rect(4, top + 4, 8, 5, c(0x262624));
    pc.hl(4, top + 3, 8, METAL.hi);
    pc.px(3, top + 1, METAL.hi); pc.px(6, top + 1, METAL.hi); pc.px(9, top + 1, METAL.hi); pc.px(12, top + 1, METAL.hi);
  }
  if (o.knife) {
    pc.line(3, 5, 9, 3, METAL.hi);
    pc.line(10, 3, 12, 2, WOOD.dk);
    pc.px(5, 4, BLOOD.main); pc.px(6, 4, BLOOD.dark); pc.px(4, 6, BLOOD.dark); pc.px(7, 6, BLOOD.deep);
  }
  if (o.dishes) {
    pc.ellipse(5, 4, 3, 1, PORC.mid); pc.ellipse(5, 3, 3, 1, PORC.hi); pc.px(11, 3, c(0x7d8a8c)); pc.px(11, 4, c(0x7d8a8c));
  }
}

function drawUpperCab(pc, r, o) {
  box(pc, 0, 0, 16, 14, 2, WOOD);
  pc.frame(2, 3, 12, 9, WOOD.dk);
  if (o.open) {
    pc.rect(2, 3, 12, 9, BLACK);
    pc.px(4, 10, PORC.mid); pc.px(5, 10, PORC.mid); pc.px(10, 9, c(0x7d8a8c));
    pc.rect(13, 3, 3, 10, WOOD.mid);
  } else knob(pc, 12, 9);
}

function drawFridge(pc, r) {
  const F = { hi: c(0xc4c0b5), top: c(0xaaa69b), mid: c(0x9a968b), dk: c(0x77736a) };
  pc.rect(0, 0, 16, 36, OUT);
  pc.rect(1, 1, 14, 34, F.mid);
  pc.rect(1, 1, 14, 3, F.top); pc.hl(2, 1, 12, F.hi);
  pc.ctx.clearRect(0, 0, 1, 1); pc.ctx.clearRect(15, 0, 1, 1);
  pc.vl(1, 4, 30, F.hi);
  pc.hl(1, 12, 14, OUT);
  pc.rect(12, 6, 2, 4, METAL.hi); pc.rect(12, 15, 2, 8, METAL.hi);
  pc.speckle(2, 25, 10, 8, c(0x7a6a58), 0.3, r);
  pc.rect(1, 33, 14, 2, F.dk);
  // something leaking from the door seal
  drip(pc, 4, 12, 9);
  pc.px(5, 13, BLOOD.main);
  drip(pc, 9, 33, 2, BLOOD.deep);
}

function drawBathtub(pc, r) {
  const W = pc.w;
  pc.rect(1, 2, W - 2, 22, OUT);
  pc.rect(0, 4, W, 18, OUT);
  pc.rect(2, 3, W - 4, 20, PORC.top);
  pc.rect(1, 5, W - 2, 16, PORC.top);
  pc.hl(2, 3, W - 4, PORC.hi);
  pc.rect(1, 14, W - 2, 9, PORC.mid);
  pc.hl(2, 22, W - 4, PORC.dk);
  // murky water
  pc.rect(4, 5, W - 8, 8, OUT);
  pc.rect(5, 6, W - 10, 6, c(0x2f3532));
  pc.speckle(5, 6, W - 10, 6, BLOOD.deep, 0.35, r);
  pc.speckle(8, 7, W - 18, 4, BLOOD.dark, 0.15, r);
  pc.hl(6, 6, 8, c(0x4c5450));
  // faucet
  pc.rect(1, 6, 3, 3, METAL.hi); pc.px(3, 9, METAL.dk);
  // claw feet
  for (const fx of [3, W - 6]) { pc.rect(fx, 23, 3, 3, OUT); pc.px(fx + 1, 24, METAL.mid); }
  // spill over the rim
  drip(pc, W - 14, 13, 6);
  drip(pc, W - 11, 13, 3);
  pc.px(W - 13, 13, BLOOD.main);
}

function drawToilet(pc, r) {
  box(pc, 1, 0, 10, 9, 3, PORC);
  pc.ellipse(6, 15, 5, 5, OUT);
  pc.ellipse(6, 15, 4, 4, PORC.top);
  pc.ellipse(6, 14, 3, 2, c(0x3b403e));
  pc.hl(3, 12, 6, PORC.hi);
  pc.line(3, 4, 8, 6, PORC.dk);
  pc.rect(4, 19, 4, 3, OUT); pc.rect(5, 19, 2, 2, PORC.mid);
}

function drawSink(pc, r) {
  pc.ellipse(7, 5, 6, 4, OUT);
  pc.ellipse(7, 5, 5, 3, PORC.top);
  pc.ellipse(7, 5, 3, 2, c(0x6f706a));
  pc.px(7, 6, BLACK);
  pc.rect(6, 0, 2, 3, METAL.hi);
  pc.rect(5, 9, 5, 13, OUT); pc.rect(6, 9, 3, 12, PORC.mid); pc.vl(6, 9, 12, PORC.hi);
  pc.px(9, 5, BLOOD.dark); pc.px(10, 4, BLOOD.deep);
}

function drawMirror(pc, r, o) {
  pc.rect(0, 0, 12, 16, OUT);
  pc.rect(1, 1, 10, 14, c(0x6b5a40));
  pc.rect(2, 2, 8, 12, c(0x59616a));
  pc.hl(2, 2, 8, c(0x7c858e));
  const cr = c(0xc9cdd0);
  pc.line(6, 7, 2, 3, cr); pc.line(6, 7, 9, 13, cr); pc.line(6, 7, 9, 4, cr); pc.line(6, 7, 3, 12, cr);
  if (o.blood) { pc.vl(3, 5, 7, BLOOD.dark); pc.vl(4, 4, 6, BLOOD.main); pc.px(4, 11, BLOOD.deep); }
}

function drawMedCab(pc) {
  box(pc, 0, 0, 14, 14, 2, METAL);
  pc.rect(2, 3, 10, 9, BLACK);
  pc.hl(2, 7, 10, METAL.dk);
  pc.px(3, 6, c(0x8a6a45)); pc.px(4, 6, c(0x8a6a45)); pc.px(8, 11, PORC.hi); pc.px(10, 6, c(0x8a6a45));
  pc.rect(12, 3, 2, 10, c(0x59616a));
}

function drawTowel(pc) {
  pc.hl(0, 1, 10, METAL.hi);
  pc.rect(1, 2, 8, 11, OUT);
  pc.rect(2, 2, 6, 10, c(0x9a958a));
  pc.hl(2, 6, 6, c(0x85806f));
  pc.vl(5, 7, 4, BLOOD.dark); pc.px(4, 8, BLOOD.main);
}

function drawBucket(pc) {
  pc.line(9, 0, 6, 8, WOOD.top);
  pc.line(10, 0, 7, 8, WOOD.dk);
  pc.rect(1, 8, 10, 9, OUT);
  pc.rect(2, 9, 8, 7, METAL.mid);
  pc.hl(2, 9, 8, c(0x2f3532));
  pc.vl(3, 10, 6, METAL.hi);
}

function drawSofaBack(pc, r) {
  const F = { hi: c(0x7a6b5f), top: c(0x65584d), mid: c(0x524740), dk: c(0x3c342f) };
  const W = pc.w;
  pc.rect(6, 0, W - 12, 8, OUT); pc.rect(7, 1, W - 14, 6, F.top);
  pc.vl(W / 2, 1, 6, F.dk);
  pc.rect(5, 6, W - 10, 16, OUT);
  pc.rect(6, 7, W - 12, 3, F.hi);
  pc.rect(6, 10, W - 12, 11, F.mid);
  for (let x = 12; x < W - 10; x += 8) pc.px(x, 15, F.dk);
  for (const ax of [0, W - 8]) {
    pc.rect(ax, 3, 8, 21, OUT); pc.rect(ax + 1, 4, 6, 19, F.top); pc.hl(ax + 2, 4, 4, F.hi); pc.rect(ax + 1, 12, 6, 11, F.mid);
  }
  // torn fabric with stuffing
  pc.rect(W - 18, 12, 4, 3, c(0xd5d0c4)); pc.px(W - 17, 15, c(0xd5d0c4));
  pc.rect(6, 21, 3, 3, OUT); pc.rect(W - 9, 21, 3, 3, OUT);
}

function drawArmchair(pc, r) {
  const F = { hi: c(0x75695c), top: c(0x60564b), mid: c(0x4e463e), dk: c(0x38322d) };
  pc.rect(2, 0, 16, 11, OUT); pc.rect(3, 1, 14, 9, F.mid); pc.hl(3, 1, 14, F.hi);
  pc.rect(4, 10, 12, 8, OUT); pc.rect(5, 10, 10, 6, F.top); pc.hl(5, 10, 10, F.hi);
  for (const ax of [0, 15]) { pc.rect(ax, 7, 5, 14, OUT); pc.rect(ax + 1, 8, 3, 12, F.top); pc.hl(ax + 1, 8, 3, F.hi); }
  pc.rect(4, 17, 12, 5, OUT); pc.rect(5, 17, 10, 4, F.dk);
  pc.rect(2, 21, 2, 3, OUT); pc.rect(16, 21, 2, 3, OUT);
}

function drawTV(pc) {
  const CAS = { hi: c(0x7a7468), top: c(0x666055), mid: c(0x524d44), dk: c(0x3a3630) };
  // antenna
  pc.line(10, 5, 5, 0, METAL.mid);
  pc.line(11, 5, 16, 1, METAL.mid);
  box(pc, 1, 5, 18, 15, 3, CAS);
  pc.rect(3, 9, 11, 9, OUT);
  pc.rect(4, 10, 9, 7, c(0x2d322f));
  pc.px(5, 11, c(0x6d7570)); pc.px(6, 11, c(0x5a625d)); pc.px(5, 12, c(0x5a625d));
  pc.px(16, 10, METAL.hi); pc.px(16, 13, METAL.hi); pc.rect(15, 15, 3, 2, CAS.dk);
  // stand
  pc.rect(2, 20, 16, 3, OUT); pc.rect(3, 20, 14, 2, WOOD.dk);
  pc.rect(3, 23, 2, 3, OUT); pc.rect(15, 23, 2, 3, OUT);
}

function drawFireplace(pc, r) {
  // stone surround
  pc.rect(0, 5, 36, 31, OUT);
  pc.rect(1, 6, 34, 29, STONE.top);
  for (let y = 7; y < 34; y += 4) {
    pc.hl(1, y, 34, STONE.dk);
    for (let x = (y % 8 === 3 ? 3 : 7); x < 35; x += 8) pc.vl(x, y + 1, 3, STONE.dk);
  }
  // opening
  pc.rect(8, 15, 20, 20, OUT);
  pc.rect(9, 17, 18, 17, BLACK);
  pc.rect(10, 15, 16, 2, BLACK);
  pc.rect(10, 29, 16, 4, c(0x5f5c57));
  pc.speckle(10, 29, 16, 4, c(0x7d7a74), 0.3, r);
  pc.rect(12, 28, 10, 2, c(0x2e2520));
  for (let x = 11; x < 26; x += 3) pc.vl(x, 26, 6, c(0x3a3936));
  // mantle
  box(pc, 0, 0, 36, 7, 4, DWOOD);
  pc.rect(3, 0, 2, 2, c(0xd8d1c0));
  pc.rect(30, 0, 2, 2, c(0xd8d1c0));
  pc.rect(15, 0, 6, 2, c(0x7d6a45));
  // hearth
  pc.rect(0, 33, 36, 3, OUT); pc.rect(1, 33, 34, 2, STONE.mid);
}

function drawPiano(pc, r) {
  box(pc, 0, 0, 32, 32, 4, DWOOD);
  pc.rect(6, 7, 20, 7, OUT); pc.rect(7, 8, 18, 5, PAPER);
  for (let y = 9; y < 13; y += 2) pc.hl(8, y, 16, c(0x8a8270));
  pc.rect(1, 17, 30, 5, OUT);
  pc.rect(2, 18, 28, 3, c(0xcdc7b8));
  for (let x = 3; x < 30; x += 4) { pc.rect(x, 18, 2, 2, OUT); }
  pc.px(16, 20, BLOOD.main); pc.px(17, 20, BLOOD.main);
  drip(pc, 16, 22, 6);
  pc.rect(2, 22, 28, 2, DWOOD.dk);
  pc.ctx.clearRect(12, 18, 2, 3); pc.rect(12, 18, 2, 3, BLACK);
  pc.speckle(1, 1, 30, 3, DUST, 0.3, r);
}

function drawClock(pc) {
  box(pc, 0, 0, 14, 42, 3, DWOOD);
  pc.rect(0, 0, 14, 2, OUT);
  pc.ellipse(7, 9, 4, 4, OUT);
  pc.ellipse(7, 9, 3, 3, c(0xc9c2b0));
  pc.line(7, 9, 7, 7, OUT); pc.line(7, 9, 9, 10, OUT);
  pc.rect(4, 16, 6, 18, OUT);
  pc.rect(5, 17, 4, 16, c(0x2b2a26));
  pc.vl(7, 17, 11, c(0x8f8460));
  pc.ellipse(7, 29, 1, 1, c(0x9c8f68));
  pc.rect(1, 36, 12, 5, DWOOD.dk);
}

function drawPlant(pc, r) {
  pc.rect(2, 13, 8, 9, OUT);
  pc.rect(3, 13, 6, 8, c(0x8a5e48));
  pc.hl(2, 13, 8, c(0xa07058));
  const stem = c(0x4e4634), leaf = c(0x6e6450);
  pc.line(6, 13, 3, 3, stem); pc.line(6, 13, 9, 1, stem); pc.line(6, 13, 6, 5, stem);
  for (const [lx, ly] of [[3, 4], [2, 6], [9, 2], [10, 4], [6, 6], [5, 8], [8, 7]]) pc.px(lx, ly, leaf);
  pc.px(1, 21, leaf); pc.px(10, 20, leaf);
}

/* ---------- hallway / doors / windows / walls ---------- */

function drawDoorFront(pc, r, o) {
  pc.rect(0, 0, 32, 32, OUT);
  pc.rect(1, 1, 30, 31, DWOOD.dk);
  // transom
  pc.rect(3, 2, 26, 4, c(0x1e2226)); pc.px(6, 3, c(0x4a525a));
  for (const lx of [2, 17]) {
    pc.rect(lx, 7, 13, 25, DWOOD.mid);
    pc.frame(lx + 2, 9, 9, 9, DWOOD.dk);
    pc.frame(lx + 2, 20, 9, 10, DWOOD.dk);
    pc.hl(lx, 7, 13, DWOOD.hi);
  }
  pc.vl(15, 7, 25, OUT); pc.vl(16, 7, 25, DWOOD.deep);
  knob(pc, 13, 20); knob(pc, 18, 20);
  // boarded and chained shut
  const plank = (y0, y1) => {
    pc.line(1, y0, 30, y1, OUT); pc.line(1, y0 + 1, 30, y1 + 1, LWOOD.top); pc.line(1, y0 + 2, 30, y1 + 2, LWOOD.mid); pc.line(1, y0 + 3, 30, y1 + 3, OUT);
    pc.px(3, y0 + 1, METAL.hi); pc.px(28, y1 + 1, METAL.hi);
  };
  plank(10, 14);
  plank(25, 22);
  for (let x = 4; x < 29; x += 2) pc.px(x, 18 + ((x >> 1) & 1), METAL.hi);
  pc.rect(14, 19, 5, 5, OUT); pc.rect(15, 20, 3, 3, METAL.mid); pc.px(16, 21, OUT);
}

function drawDoorSide(pc, r, o) {
  // a door in a side wall, seen at an angle. side 'L' = door in a wall left of the floor
  const g = new PC(16, 32);
  g.rect(2, 0, 14, 32, OUT);
  // frame
  g.rect(3, 0, 12, 2, DWOOD.top);
  g.vl(14, 1, 30, DWOOD.hi);
  // door slab
  g.rect(3, 2, 11, 28, WOOD.mid);
  g.rect(3, 2, 2, 28, WOOD.dk);
  g.vl(13, 2, 28, WOOD.top);
  g.hl(5, 2, 8, WOOD.hi);
  g.frame(6, 5, 6, 10, WOOD.dk);
  g.vl(7, 6, 8, WOOD.top);
  g.frame(6, 17, 6, 10, WOOD.dk);
  g.vl(7, 18, 8, WOOD.top);
  // knob on the side facing the room
  g.rect(11, 16, 2, 2, OUT);
  g.px(11, 16, c(0xc8b27e));
  g.rect(2, 30, 14, 2, OUT);
  g.hl(3, 30, 11, DWOOD.dk);
  if (o.blood) { g.vl(9, 12, 10, BLOOD.dark); g.vl(10, 14, 6, BLOOD.main); g.px(9, 22, BLOOD.deep); }
  if (o.mark) { g.line(7, 8, 10, 12, c(0xb7a78f)); g.line(10, 8, 7, 12, c(0xb7a78f)); }
  pc.draw(o.side === 'R' ? g.flipped() : g, 0, 0);
}

function drawWindow(pc, r, o) {
  const W = pc.w;
  const fx = 3;
  pc.rect(fx, 1, 16, 22, OUT);
  pc.rect(fx + 1, 2, 14, 20, c(0x5a4434));
  pc.rect(fx + 2, 3, 12, 18, c(0x232930));
  for (let y = 3; y < 10; y++) for (let x = fx + 2; x < fx + 2 + (10 - y); x++) pc.px(x, y, c(0x3b434d));
  pc.px(fx + 4, 5, c(0x9aa3ad)); pc.px(fx + 5, 5, c(0x7a838d));
  pc.vl(fx + 8, 3, 18, c(0x5a4434)); pc.hl(fx + 2, 11, 12, c(0x5a4434));
  pc.line(fx + 10, 13, fx + 13, 19, c(0x8d96a0));
  pc.line(fx + 11, 13, fx + 9, 17, c(0x8d96a0));
  pc.rect(fx, 22, 16, 2, OUT); pc.rect(fx + 1, 22, 14, 1, c(0x6e5440));
  // torn curtains
  const cl = c(0x5e5850), cd = c(0x48433d);
  pc.rect(0, 0, W, 2, OUT); pc.hl(0, 1, W, METAL.dk);
  pc.rect(0, 2, 5, 18, cl); pc.vl(2, 2, 18, cd);
  for (let x = 0; x < 5; x++) pc.vl(x, 20, (x * 7) % 4, cl);
  pc.rect(W - 5, 2, 5, 12, cl); pc.vl(W - 3, 2, 12, cd);
  for (let x = W - 5; x < W; x++) pc.vl(x, 14, (x * 5) % 5, cl);
}

function drawPicture(pc, r, o) {
  const W = pc.w, H = pc.h;
  pc.rect(0, 0, W, H, OUT);
  pc.rect(1, 1, W - 2, H - 2, c(0x7d6a45));
  pc.hl(1, 1, W - 2, c(0x9c8758));
  pc.rect(2, 2, W - 4, H - 4, c(0x3a3530));
  const kind = o.kind || 'portrait';
  if (kind === 'portrait') {
    const cx = Math.floor(W / 2);
    pc.ellipse(cx, 6, 2, 2, c(0x8a7e70));
    pc.rect(cx - 3, 9, 7, H - 11, c(0x4a4038));
    const s = c(0xd0c8b8);
    pc.line(cx - 2, 4, cx + 2, 8, s); pc.line(cx + 2, 4, cx - 2, 8, s);
    if (o.blood) { pc.px(cx - 1, 7, BLOOD.main); pc.px(cx - 1, 8, BLOOD.dark); pc.px(cx + 1, 7, BLOOD.main); pc.px(cx + 1, 9, BLOOD.dark); }
  } else if (kind === 'landscape') {
    pc.rect(2, 2, W - 4, 5, c(0x5a5f63));
    pc.rect(2, 7, W - 4, H - 9, c(0x3f4038));
    pc.line(4, 7, 8, 5, c(0x4b4d45)); pc.line(8, 5, 12, 7, c(0x4b4d45));
    pc.vl(W - 5, 3, 5, OUT); pc.px(W - 6, 4, OUT); pc.px(W - 4, 3, OUT);
  } else if (kind === 'family') {
    pc.rect(2, 2, W - 4, H - 4, c(0x6e685e));
    for (const [fx, fh] of [[4, 6], [8, 7], [12, 4]]) {
      pc.rect(fx - 1, H - 2 - fh + 2, 3, fh - 2, c(0x3a3530));
      pc.rect(fx - 1, H - 2 - fh, 3, 2, BLACK);
    }
  }
}

function drawPictureSide(pc, r, o) {
  const g = new PC(16, 18);
  g.rect(6, 0, 6, 18, OUT);
  g.rect(7, 1, 4, 16, c(0x7d6a45));
  g.rect(8, 3, 2, 12, c(0x3a3530));
  g.px(8, 5, c(0x8a7e70));
  g.px(9, 6, c(0x6a6056));
  if (o.blood) { g.px(8, 8, BLOOD.main); g.px(8, 9, BLOOD.dark); }
  pc.draw(o.side === 'R' ? g.flipped() : g, 0, 0);
}

function drawRug(pc, r, o) {
  const W = pc.w, H = pc.h;
  const base = o.color ?? 0x5b4636;
  const rc = (f) => c(base, f);
  pc.rect(0, 0, W, H, rc(0.55));
  pc.rect(1, 1, W - 2, H - 2, rc(1.55));
  pc.rect(3, 3, W - 6, H - 6, rc(0.7));
  pc.rect(4, 4, W - 8, H - 8, rc(1.1));
  // dotted inner border
  for (let x = 6; x < W - 6; x += 2) { pc.px(x, 6, rc(1.6)); pc.px(x, H - 7, rc(1.6)); }
  for (let y = 6; y < H - 6; y += 2) { pc.px(6, y, rc(1.6)); pc.px(W - 7, y, rc(1.6)); }
  // repeating diamond field
  for (let y = 10; y < H - 9; y += 8)
    for (let x = 10; x < W - 9; x += 8) {
      pc.px(x, y - 1, rc(0.75)); pc.px(x - 1, y, rc(0.75)); pc.px(x + 1, y, rc(0.75)); pc.px(x, y + 1, rc(0.75));
      pc.px(x, y, rc(1.5));
    }
  if (W > 24 && H > 24) {
    const cx = Math.floor(W / 2), cy = Math.floor(H / 2);
    for (let i = 0; i < 7; i++) {
      pc.hl(cx - i, cy - 6 + i, i * 2 + 1, rc(0.6));
      pc.hl(cx - i, cy + 6 - i, i * 2 + 1, rc(0.6));
    }
    for (let i = 0; i < 4; i++) {
      pc.hl(cx - i, cy - 3 + i, i * 2 + 1, rc(1.5));
      pc.hl(cx - i, cy + 3 - i, i * 2 + 1, rc(1.5));
    }
    pc.px(cx, cy, rc(0.5));
  }
  // fringe on short sides
  if (o.vertical) for (let x = 1; x < W - 1; x += 2) { pc.px(x, 0, rc(1.6)); pc.px(x, H - 1, rc(1.6)); }
  else for (let y = 1; y < H - 1; y += 2) { pc.px(0, y, rc(1.6)); pc.px(W - 1, y, rc(1.6)); }
  // stains and wear
  for (let i = 0; i < 3; i++) pc.ellipse(4 + Math.floor(r() * (W - 8)), 4 + Math.floor(r() * (H - 8)), 2 + Math.floor(r() * 3), 1 + Math.floor(r() * 2), rc(0.75));
  pc.speckle(0, 0, W, H, rc(0.85), 0.06, r);
  if (o.blood) bloodBlob(pc, Math.floor(W * 0.7), Math.floor(H * 0.6), 3, 2, r);
  // a torn corner
  pc.ctx.clearRect(W - 4, H - 3, 4, 3);
  pc.ctx.clearRect(W - 2, H - 5, 2, 2);
}

function drawDoormat(pc, r) {
  pc.rect(0, 0, pc.w, pc.h, c(0x4b4136));
  pc.rect(1, 1, pc.w - 2, pc.h - 2, c(0x5e5244));
  pc.speckle(1, 1, pc.w - 2, pc.h - 2, c(0x4b4136), 0.35, r);
}

/* ---------- decals ---------- */

function drawBlood(pc, r, o) {
  const W = pc.w, H = pc.h;
  const kind = o.kind || 'splat';
  if (kind === 'splat') {
    bloodBlob(pc, W / 2, H / 2, Math.min(5, W / 3), Math.min(4, H / 3), r);
  } else if (kind === 'pool') {
    bloodBlob(pc, W / 2, H / 2, W / 2 - 5, H / 2 - 4, r);
    bloodBlob(pc, W / 2 + 3, H / 2 + 1, W / 4, H / 4, r);
  } else if (kind === 'trail' || kind === 'drag') {
    // from one end of the footprint to the other
    const [x0, y0, x1, y1] = o.from === 'v' ? [W / 2, 2, W / 2, H - 3] : [2, H / 2, W - 3, H / 2];
    const n = kind === 'drag' ? 60 : Math.floor(Math.max(W, H) / 7);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = x0 + (x1 - x0) * t + (r() - 0.5) * 3, y = y0 + (y1 - y0) * t + (r() - 0.5) * 3;
      if (kind === 'drag') {
        pc.px(x, y, r() < 0.3 ? BLOOD.main : BLOOD.dark);
        if (r() < 0.5) pc.px(x + (o.from === 'v' ? 1 : 0), y + (o.from === 'v' ? 0 : 1), BLOOD.deep);
      } else {
        pc.px(x, y, BLOOD.dark);
        if (r() < 0.5) pc.px(x + 1, y, BLOOD.main);
      }
    }
  }
}

function drawHandprint(pc, r) {
  const g = BLOOD.dark;
  pc.rect(3, 6, 5, 5, g);
  for (const [fx, fy, fl] of [[3, 2, 4], [5, 1, 5], [7, 2, 4], [8, 4, 2]]) pc.vl(fx, fy, fl, g);
  pc.line(2, 7, 0, 5, g);
  pc.px(4, 7, BLOOD.main); pc.px(5, 8, BLOOD.main);
  drip(pc, 4, 11, 3); drip(pc, 7, 11, 1);
}

function drawWriting(pc, r) {
  const W = pc.w, H = pc.h;
  let x = 2;
  while (x < W - 5) {
    const y = 2 + Math.floor(r() * 4);
    const h = 6 + Math.floor(r() * (H - 12));
    const col = r() < 0.4 ? BLOOD.main : BLOOD.dark;
    const k = Math.floor(r() * 4);
    if (k === 0) { pc.vl(x + 2, y, h, col); pc.line(x, y + 2, x + 4, y + 2, col); }
    else if (k === 1) { pc.line(x, y + h, x + 2, y, col); pc.line(x + 2, y, x + 4, y + h, col); pc.hl(x + 1, y + h / 2, 3, col); }
    else if (k === 2) { pc.ellipse(x + 2, y + 3, 2, 2, col); pc.ctx.clearRect(x + 1, y + 2, 3, 3); pc.vl(x + 2, y + 5, h - 5, col); }
    else { pc.line(x, y, x + 4, y + h, col); pc.line(x + 4, y, x, y + h, col); }
    if (r() < 0.6) drip(pc, x + 2, y + h, 2 + Math.floor(r() * 5));
    x += 6 + Math.floor(r() * 3);
  }
}

function drawDebris(pc, r, o) {
  const W = pc.w, H = pc.h;
  for (let i = 0; i < (o.n ?? 5); i++) {
    const x = Math.floor(r() * (W - 6)), y = Math.floor(r() * (H - 3));
    const k = r();
    if (k < 0.4) { pc.rect(x, y, 4 + Math.floor(r() * 4), 2, OUT); pc.hl(x, y, 4 + Math.floor(r() * 3), WOOD.top); }
    else if (k < 0.65) { pc.rect(x, y, 4, 3, PAPER); pc.hl(x + 1, y + 1, 2, c(0x8a8270)); }
    else if (k < 0.85) { pc.px(x, y, c(0xc9cdd0)); pc.px(x + 2, y + 1, c(0x9ea4a8)); pc.px(x + 1, y + 2, c(0xc9cdd0)); }
    else { pc.ellipse(x + 2, y + 1, 2, 1, DUST); }
  }
}

function drawCobweb(pc, r, o) {
  cobwebPx(pc, o.corner === 'tr' ? pc.w - 1 : 0, 0, Math.min(pc.w, pc.h) - 1, o.corner === 'tr');
}

function drawPlates(pc, r) {
  for (let i = 0; i < 6; i++) {
    const x = 1 + Math.floor(r() * (pc.w - 4)), y = 1 + Math.floor(r() * (pc.h - 3));
    pc.px(x, y, PORC.hi); pc.px(x + 1, y, PORC.mid); pc.px(x + 1, y + 1, PORC.hi);
  }
  pc.ellipse(6, 5, 3, 1, PORC.mid); pc.ctx.clearRect(6, 4, 3, 3);
}

function drawDoll(pc, r) {
  pc.rect(2, 6, 8, 6, OUT); pc.rect(3, 7, 6, 4, c(0x7a7268));
  pc.ellipse(6, 3, 3, 3, OUT); pc.ellipse(6, 3, 2, 2, c(0xd9d0c2));
  pc.hl(3, 0, 6, c(0x3a302a)); pc.px(3, 1, c(0x3a302a)); pc.px(9, 1, c(0x3a302a));
  pc.px(5, 3, OUT); pc.px(7, 3, BLACK); pc.px(7, 4, BLOOD.dark);
  pc.px(1, 9, c(0xd9d0c2)); pc.px(10, 9, c(0xd9d0c2));
}

/* ---------- attic ---------- */

function sheetShape(pc, r, topFn, hemFn, seed) {
  const W = pc.w;
  for (let x = 1; x < W - 1; x++) {
    const t = Math.round(topFn(x)), b = Math.round(hemFn(x));
    for (let y = t; y <= b; y++) {
      const fold = (x + Math.floor(y / 6) + seed) % 6;
      let col = x < W * 0.3 ? SHEET.hi : x > W * 0.72 ? SHEET.mid : SHEET.top;
      if (fold === 0 && y > t + 3) col = SHEET.dk;
      if (y === t) col = SHEET.hi;
      if (y >= b - 1) col = SHEET.dk;
      pc.px(x, y, col);
    }
  }
  pc.speckle(1, 0, W - 2, pc.h, DUST, 0.05, r);
  pc.outline(OUT);
  pc.ctx.globalCompositeOperation = 'destination-over';
  pc.ctx.fillStyle = 'rgba(0,0,0,0.4)';
  pc.ctx.fillRect(1, pc.h - 2, W - 2, 2);
  pc.ctx.globalCompositeOperation = 'source-over';
}

function drawSheet(pc, r, o) {
  const W = pc.w, H = pc.h;
  const k = o.kind || 'tall';
  const s = o.seed ?? 0;
  const hem = (x) => H - 3 + ((hash(x, s) % 3) - 1) * 0.7;
  if (k === 'tall') sheetShape(pc, r, (x) => 2 + Math.abs(x - W / 2) * 0.25 + (x < 3 || x > W - 4 ? 3 : 0), hem, s);
  else if (k === 'wide') sheetShape(pc, r, (x) => 3 + Math.sin(x / 4) * 1.5 + (x < 4 || x > W - 5 ? 4 : 0) + (x > W * 0.25 && x < W * 0.75 ? 3 : 0), hem, s);
  else if (k === 'round') sheetShape(pc, r, (x) => 2 + Math.pow(Math.abs(x - W / 2) / (W / 2), 2) * 8, hem, s);
  else if (k === 'lump') sheetShape(pc, r, (x) => (Math.abs(x - W / 2) < 3 ? 1 : Math.abs(x - W / 2) < 5 ? 6 : 8 + Math.abs(x - W / 2) * 0.3), hem, s);
  else if (k === 'cabinet') {
    // a tall cupboard: square shoulders, a wooden foot showing under the hem
    sheetShape(pc, r, (x) => 2 + (x < 2 || x > W - 3 ? 1 : 0) + (x === W >> 1 ? 1 : 0), (x) => hem(x) - (x > W - 6 ? 2 : 0), s);
    pc.rect(W - 5, H - 5, 3, 3, OUT); pc.rect(W - 4, H - 5, 1, 2, DWOOD.mid);
  } else if (k === 'dresser') {
    // a chest of drawers with the sheet slipped off one corner
    sheetShape(pc, r, (x) => 4 + Math.sin(x / 5) * 0.8 + (x < 3 || x > W - 4 ? 2 : 0), (x) => (x > W - 11 ? H - 12 + (W - x) * 0.6 : hem(x)), s);
    const x0 = W - 11, y0 = H - 13;
    pc.rect(x0, y0, 10, 12, OUT);
    pc.rect(x0 + 1, y0 + 1, 8, 10, WOOD.mid);
    pc.hl(x0 + 1, y0 + 4, 8, WOOD.dk); pc.hl(x0 + 1, y0 + 8, 8, WOOD.dk);
    pc.px(x0 + 4, y0 + 2, c(0xb09a6a)); pc.px(x0 + 4, y0 + 6, c(0xb09a6a));
  } else if (k === 'mirror') {
    // a big round standing mirror, the sheet sliding off it
    const cx = W / 2;
    pc.rect(cx - 4, H - 6, 2, 5, OUT); pc.rect(cx + 2, H - 6, 2, 5, OUT);
    pc.ellipse(cx, 16, 11, 14, OUT);
    pc.ellipse(cx, 16, 10, 13, c(0x7d6a45));
    pc.ellipse(cx, 16, 8, 11, c(0x4e5660));
    pc.line(cx - 4, 10, cx + 5, 24, c(0xa9b2ba)); pc.line(cx + 2, 8, cx - 2, 18, c(0x8d96a0));
    const sheet = new PC(W, H);
    sheetShape(sheet, r, (x) => 1 + Math.abs(x - cx) * 0.35, (x) => 14 + x * 0.9 + ((hash(x, s) % 3) - 1), s);
    pc.draw(sheet, 0, 0);
  } else sheetShape(pc, r, (x) => 2 + (x < 3 || x > W - 4 ? 2 : 0) + Math.sin(x / 3) * 0.8, hem, s);
}

function drawCrate(pc, r) {
  box(pc, 0, 2, 16, 16, 5, LWOOD);
  for (let y = 9; y < 17; y += 3) pc.hl(1, y, 14, LWOOD.dk);
  pc.vl(1, 7, 10, LWOOD.dk); pc.vl(14, 7, 10, LWOOD.dk);
  pc.line(2, 8, 13, 16, LWOOD.dk);
  pc.hl(1, 4, 14, LWOOD.mid);
  pc.speckle(1, 3, 14, 3, DUST, 0.3, r);
}

function drawBox(pc, r, o) {
  const P = { hi: c(0xa58c6a), top: c(0x8a7458), mid: c(0x735f47), dk: c(0x574735) };
  box(pc, 0, 2, 14, 12, 5, P);
  if (o.open) { pc.rect(2, 3, 10, 3, BLACK); pc.rect(0, 0, 3, 5, P.top); pc.rect(11, 0, 3, 5, P.top); }
  else pc.vl(7, 3, 4, c(0xb5ab95));
  pc.rect(3, 9, 5, 2, PAPER); pc.hl(4, 9, 3, OUT);
}

function drawBarrel(pc) {
  pc.rect(1, 3, 12, 15, OUT);
  pc.rect(2, 4, 10, 13, WOOD.mid);
  for (let x = 4; x < 12; x += 3) pc.vl(x, 5, 12, WOOD.dk);
  pc.hl(1, 7, 12, METAL.dk); pc.hl(1, 14, 12, METAL.dk);
  pc.ellipse(7, 3, 5, 2, OUT); pc.ellipse(7, 3, 4, 1, WOOD.top);
  pc.vl(2, 5, 11, WOOD.hi);
}

function drawTrunk(pc, r) {
  const W = pc.w;
  pc.rect(0, 2, W, 16, OUT);
  pc.rect(1, 3, W - 2, 5, DWOOD.top); pc.hl(2, 2, W - 4, DWOOD.hi);
  pc.rect(1, 8, W - 2, 9, DWOOD.mid);
  pc.hl(1, 8, W - 2, OUT);
  for (const bx of [4, W - 6]) { pc.rect(bx, 2, 2, 16, METAL.dk); pc.vl(bx, 3, 14, METAL.mid); }
  pc.rect(W / 2 - 2, 7, 4, 4, METAL.mid); pc.px(W / 2 - 1, 9, OUT);
  pc.speckle(1, 3, W - 2, 4, DUST, 0.3, r);
}

function drawRockingChair(pc) {
  pc.rect(2, 0, 12, 12, OUT); pc.rect(3, 1, 10, 10, WOOD.mid);
  for (let x = 4; x < 13; x += 2) pc.vl(x, 2, 9, WOOD.dk);
  pc.hl(3, 1, 10, WOOD.hi);
  box(pc, 1, 11, 14, 6, 4, WOOD);
  pc.vl(2, 17, 4, OUT); pc.vl(13, 17, 4, OUT);
  pc.line(0, 20, 6, 23, OUT); pc.line(6, 23, 15, 21, OUT);
  pc.line(0, 21, 6, 24, WOOD.dk);
}

/** a full-body shop mannequin: blank egg head, jointed limbs, one forearm broken off */
function drawMannequin(pc, r, o) {
  const L = c(0xcfc6b4), M = c(0xaaa190), J = c(0x7c7466);
  const g = new PC(pc.w, pc.h);
  const cx = 8;
  // head, tilted a little, with a hairline crack
  g.ellipse(cx + 1, 5, 3, 4, L);
  g.vl(cx + 3, 3, 5, M);
  g.px(cx + 3, 1, L);
  g.line(cx, 2, cx + 1, 6, J);
  g.rect(cx, 9, 2, 2, M);
  // torso
  g.rect(cx - 5, 11, 11, 2, L);
  g.rect(cx - 4, 13, 9, 6, L);
  g.vl(cx + 4, 13, 6, M);
  g.rect(cx - 3, 19, 7, 2, L);
  g.hl(cx - 3, 19, 7, J);
  g.rect(cx - 4, 21, 9, 3, L);
  g.vl(cx + 4, 21, 3, M);
  // legs with knee joints
  g.rect(cx - 3, 24, 3, 10, L);
  g.rect(cx + 1, 24, 3, 10, M);
  g.hl(cx - 3, 29, 7, J);
  g.rect(cx - 4, 34, 4, 1, L);
  g.rect(cx + 1, 34, 4, 1, M);
  // arms: the left one whole, the right one snapped at the elbow
  g.rect(cx - 7, 11, 2, 8, L);
  g.hl(cx - 7, 19, 2, J);
  g.rect(cx - 7, 20, 2, 6, L);
  g.rect(cx - 7, 26, 2, 2, M);
  g.rect(cx + 6, 11, 2, 8, M);
  g.px(cx + 6, 18, J); g.px(cx + 7, 18, J);
  if (o.dress) {
    // a moth-eaten wedding dress
    const D = c(0xc9c1ad), Dd = c(0x9e9686);
    for (let y = 13; y <= 33; y++) {
      const half = y < 20 ? 4 : Math.min(7, 4 + Math.floor((y - 19) / 3));
      g.rect(cx - half, y, half * 2 + 1, 1, y > 30 ? Dd : D);
    }
    for (let i = 0; i < 12; i++) g.px(cx - 5 + Math.floor(r() * 11), 15 + Math.floor(r() * 17), c(0x3a3631));
    g.vl(cx + 4, 20, 12, Dd);
  }
  g.outline(OUT);
  pc.ctx.save();
  pc.ctx.globalAlpha = 0.4;
  pc.ellipse(cx, 35, 6, 1, '#000000');
  pc.ctx.restore();
  pc.draw(g, 0, 0);
  // the missing forearm, lying at its feet
  pc.line(cx + 5, 36, cx + 9, 34, OUT);
  pc.line(cx + 5, 35, cx + 9, 33, L);
}

function drawBeam(pc) {
  pc.rect(1, 0, 8, pc.h, OUT);
  pc.rect(2, 0, 6, pc.h - 1, DWOOD.mid);
  pc.vl(2, 0, pc.h - 1, DWOOD.hi);
  pc.vl(7, 0, pc.h - 1, DWOOD.dk);
  pc.rect(0, pc.h - 3, 10, 3, OUT);
  pc.ctx.fillStyle = 'rgba(0,0,0,0.6)';
  pc.ctx.fillRect(1, 0, 8, 8);
}

function drawLadder(pc, r) {
  // the hatch in the ceiling and a ladder leaning against the wall
  pc.rect(0, 0, 14, 8, OUT);
  pc.rect(1, 1, 12, 6, BLACK);
  pc.hl(1, 7, 12, DWOOD.dk);
  for (const x of [1, 11]) { pc.rect(x, 2, 2, pc.h - 2, OUT); pc.vl(x, 2, pc.h - 3, WOOD.top); }
  for (let y = 6; y < pc.h - 2; y += 6) { pc.rect(3, y, 8, 2, OUT); pc.hl(3, y, 8, WOOD.hi); }
}

function drawHatch(pc) {
  // open floor hatch in the attic with the top of the ladder
  pc.rect(1, 0, 14, 6, OUT); pc.rect(2, 1, 12, 4, WOOD.mid); pc.hl(2, 1, 12, WOOD.hi);
  pc.rect(1, 6, 14, 12, OUT);
  pc.rect(2, 7, 12, 10, BLACK);
  pc.rect(4, 6, 2, 10, WOOD.top); pc.rect(10, 6, 2, 10, WOOD.top);
  pc.hl(4, 10, 8, WOOD.dk); pc.hl(4, 14, 8, c(0x2e2218));
}

/* ---------- workshop ---------- */

function drawWorkbench(pc, r, o) {
  const W = pc.w;
  box(pc, 0, 6, W, 9, 6, LWOOD);
  pc.rect(2, 15, 3, 13, OUT); pc.vl(3, 15, 12, LWOOD.dk);
  pc.rect(W - 5, 15, 3, 13, OUT); pc.vl(W - 4, 15, 12, LWOOD.dk);
  pc.rect(4, 22, W - 8, 3, OUT); pc.hl(5, 22, W - 10, LWOOD.mid);
  // stuff under the bench
  pc.rect(8, 18, 8, 4, OUT); pc.rect(9, 19, 6, 3, c(0x6e3b30));
  pc.rect(W - 16, 17, 6, 5, c(0x5e5a52));
  // tools on top
  pc.line(6, 9, 13, 9, WOOD.mid); pc.rect(13, 8, 3, 3, METAL.hi); // hammer
  pc.rect(19, 7, 12, 3, METAL.hi); for (let x = 19; x < 31; x += 2) pc.px(x, 10, METAL.dk); pc.rect(31, 7, 4, 3, WOOD.dk); // saw
  pc.rect(W - 10, 0, 8, 8, OUT); pc.rect(W - 9, 1, 6, 6, METAL.mid); pc.hl(W - 9, 1, 6, METAL.hi); pc.vl(W - 6, 0, 8, METAL.dk); // vise
  for (let i = 0; i < 6; i++) pc.px(38 + Math.floor(r() * 12), 8 + Math.floor(r() * 4), METAL.hi);
  if (o.blood) { bloodBlob(pc, 28, 10, 3, 1, r); drip(pc, 29, 13, 8); drip(pc, 26, 13, 4); }
}

function drawPegboard(pc, r) {
  const W = pc.w, H = pc.h;
  pc.rect(0, 0, W, H, OUT);
  pc.rect(1, 1, W - 2, H - 2, c(0x8a7a62));
  for (let y = 3; y < H - 2; y += 3) for (let x = 3; x < W - 2; x += 3) pc.px(x, y, c(0x5e5242));
  const sil = c(0x4a4034);
  // tool outlines, some tools missing
  pc.line(6, 4, 6, 16, METAL.mid); pc.rect(4, 3, 5, 3, METAL.hi); // wrench
  pc.rect(13, 4, 3, 10, WOOD.mid); pc.rect(12, 3, 5, 3, METAL.hi); // hammer
  pc.line(22, 4, 22, 15, sil); pc.line(24, 4, 24, 15, sil); pc.hl(21, 4, 5, sil); // missing (outline)
  pc.rect(30, 3, 14, 6, METAL.hi); for (let x = 30; x < 44; x += 2) pc.px(x, 9, METAL.dk); pc.rect(44, 3, 4, 6, WOOD.dk); // saw
  pc.line(52, 4, 55, 14, METAL.mid); pc.line(56, 4, 53, 14, METAL.mid); // pliers
  pc.px(31, 5, BLOOD.main); pc.px(33, 6, BLOOD.dark); pc.px(36, 5, BLOOD.dark);
}

function drawShelfMetal(pc, r, o) {
  const W = pc.w, H = pc.h;
  pc.rect(0, 0, 2, H, OUT); pc.rect(W - 2, 0, 2, H, OUT);
  pc.vl(1, 0, H - 1, METAL.mid); pc.vl(W - 2, 0, H - 1, METAL.mid);
  for (const sy of [10, 22, H - 3]) {
    pc.rect(0, sy, W, 3, OUT); pc.hl(1, sy, W - 2, METAL.hi); pc.hl(1, sy + 1, W - 2, METAL.dk);
    let x = 3;
    while (x < W - 6) {
      const k = r();
      if (k < 0.35) { // jar
        pc.rect(x, sy - 6, 4, 6, OUT); pc.rect(x + 1, sy - 5, 2, 5, c(o.pantry ? 0x7a7a60 : 0x6e7a70)); pc.px(x + 1, sy - 4, c(0xb0bab0));
        if (r() < 0.3) pc.px(x + 2, sy - 2, BLOOD.deep);
        x += 5;
      } else if (k < 0.65) { // can
        pc.rect(x, sy - 7, 5, 7, OUT); pc.rect(x + 1, sy - 6, 3, 6, METAL.mid); pc.hl(x + 1, sy - 6, 3, METAL.hi);
        pc.px(x + 2, sy - 3, c(0x8a7a62));
        x += 6;
      } else if (k < 0.8) { // box
        pc.rect(x, sy - 5, 6, 5, OUT); pc.rect(x + 1, sy - 4, 4, 4, c(0x8a7458)); x += 7;
      } else x += 3;
    }
  }
  pc.speckle(2, 0, W - 4, H, DUST, 0.03, r);
}

function drawSawhorse(pc) {
  const W = pc.w;
  pc.rect(0, 2, W, 4, OUT); pc.hl(1, 3, W - 2, LWOOD.top); pc.hl(1, 4, W - 2, LWOOD.dk);
  for (const lx of [3, W - 5]) { pc.line(lx, 6, lx - 2, 13, OUT); pc.line(lx + 1, 6, lx + 3, 13, OUT); }
  pc.rect(4, 0, W - 10, 3, OUT); pc.hl(5, 1, W - 12, LWOOD.hi);
}

function drawToolbox(pc) {
  const T = { hi: c(0x8a5045), top: c(0x6e3b30), mid: c(0x592f27), dk: c(0x3f211c) };
  box(pc, 0, 3, 14, 9, 4, T);
  pc.rect(4, 0, 6, 3, OUT); pc.rect(5, 1, 4, 1, METAL.mid);
  pc.rect(6, 7, 3, 3, METAL.hi); pc.px(7, 8, OUT);
}

function drawPlanks(pc) {
  for (let i = 0; i < 3; i++) {
    const y = 2 + i * 3, x = (i * 5) % 7;
    pc.rect(x, y, pc.w - 7, 4, OUT); pc.hl(x + 1, y + 1, pc.w - 9, LWOOD.top); pc.hl(x + 1, y + 2, pc.w - 9, LWOOD.dk);
  }
}

function drawTableSaw(pc, r) {
  const W = pc.w;
  box(pc, 0, 2, W, 12, 7, METAL);
  pc.rect(2, 14, 3, 8, OUT); pc.rect(W - 5, 14, 3, 8, OUT);
  pc.rect(W / 2 - 1, 0, 3, 7, OUT); pc.rect(W / 2, 0, 1, 6, METAL.hi);
  pc.px(W / 2, 1, BLOOD.main); pc.px(W / 2, 3, BLOOD.dark);
  bloodBlob(pc, W / 2 + 4, 6, 2, 1, r);
  drip(pc, W / 2 + 6, 9, 9);
}

/* ---------- summoning room ---------- */

function drawPentagram(pc, r) {
  const W = pc.w, cx = W / 2, cy = pc.h / 2, R = W / 2 - 4;
  const ring = (rad, col) => {
    for (let a = 0; a < 360; a += 1) {
      const t = (a * Math.PI) / 180;
      pc.px(cx + Math.cos(t) * rad, cy + Math.sin(t) * rad * 0.82, col);
    }
  };
  ring(R, BLOOD.dark); ring(R - 1, BLOOD.main); ring(R - 6, BLOOD.dark);
  const pts = [];
  for (let i = 0; i < 5; i++) {
    const t = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    pts.push([cx + Math.cos(t) * (R - 6), cy + Math.sin(t) * (R - 6) * 0.82]);
  }
  for (let i = 0; i < 5; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 2) % 5];
    pc.line(ax, ay, bx, by, BLOOD.main);
    pc.line(ax + 1, ay, bx + 1, by, BLOOD.dark);
  }
  // glyphs between the rings
  for (let i = 0; i < 14; i++) {
    const t = (i / 14) * Math.PI * 2;
    const gx = cx + Math.cos(t) * (R - 3), gy = cy + Math.sin(t) * (R - 3) * 0.82;
    pc.px(gx, gy, BLOOD.deep); pc.px(gx + 1, gy - 1, BLOOD.dark); if (i % 2) pc.px(gx - 1, gy + 1, BLOOD.dark);
  }
  bloodBlob(pc, cx, cy, 6, 4, r);
  for (let i = 0; i < 25; i++) pc.px(cx + (r() - 0.5) * W * 0.9, cy + (r() - 0.5) * pc.h * 0.8, r() < 0.5 ? BLOOD.deep : BLOOD.dark);
}

function drawCandle(pc, r, o, f) {
  const black = o.black !== false;
  const body = black ? c(0x2a2624) : c(0xd8d1c0), hi = black ? c(0x3f3a37) : c(0xece6d8);
  pc.rect(2, 4, 4, 8, OUT);
  pc.rect(3, 5, 2, 7, body); pc.vl(3, 5, 6, hi);
  pc.px(3, 4, OUT);
  if (black) pc.px(4, 7, BLOOD.dark);
  else pc.px(2, 9, c(0xc8c0ad));
  if (o.unlit) pc.px(4, 3, OUT); // just the black wick (the summoning cutscene lights them)
  else flame(pc, 4, 4, f);
}

function drawAltar(pc, r, o, f) {
  const W = pc.w;
  box(pc, 0, 9, W, 17, 7, STONE);
  // black cloth draped over it
  pc.rect(1, 10, W - 2, 6, c(0x221f1e));
  for (let x = 2; x < W - 2; x += 3) pc.vl(x, 16, 2 + (x % 3), c(0x221f1e));
  pc.hl(1, 10, W - 2, c(0x35302e));
  drip(pc, 10, 16, 7); drip(pc, 23, 16, 4);
  // skull
  pc.ellipse(8, 7, 3, 3, OUT); pc.ellipse(8, 7, 2, 2, c(0xd8d0bc)); pc.px(7, 7, OUT); pc.px(9, 7, OUT); pc.hl(7, 9, 3, c(0xb0a690));
  // book with bloody writing
  pc.rect(13, 9, 9, 4, OUT); pc.rect(14, 9, 3, 3, PAPER); pc.rect(18, 9, 3, 3, PAPER);
  pc.px(15, 10, BLOOD.main); pc.px(19, 10, BLOOD.dark); pc.px(19, 11, BLOOD.main);
  // dagger
  pc.line(24, 12, 29, 10, METAL.hi); pc.px(23, 12, WOOD.dk); pc.px(22, 13, WOOD.dk);
  pc.px(27, 11, BLOOD.main); pc.px(28, 10, BLOOD.dark);
  // candles
  for (const cxp of [2, W - 4]) { pc.rect(cxp, 4, 2, 6, c(0x2a2624)); flame(pc, cxp + 1, 4, f); }
}

function drawCage(pc, r) {
  const W = pc.w, H = pc.h;
  pc.rect(1, 6, W - 2, H - 7, c(0x0f0d0c));
  for (const [bx, by] of [[6, H - 6], [9, H - 4], [W - 9, H - 5]]) pc.hl(bx, by, 4, c(0xd8d0bc));
  pc.ellipse(W - 10, H - 9, 2, 2, c(0xd8d0bc)); pc.px(W - 11, H - 9, OUT);
  pc.hl(4, H - 3, 10, BLOOD.deep); pc.hl(6, H - 2, 6, BLOOD.dark);
  for (let x = 1; x < W - 1; x += 3) { pc.vl(x, 4, H - 5, OUT); pc.vl(x + 1, 4, H - 5, METAL.dk); }
  pc.rect(0, 2, W, 3, OUT); pc.hl(1, 3, W - 2, METAL.mid);
  pc.rect(0, H - 3, W, 3, OUT); pc.hl(1, H - 2, W - 2, METAL.dk);
  pc.rect(W / 2 - 1, 0, 2, 3, METAL.dk);
}

function drawChains(pc) {
  for (const cx of [2, 8]) {
    for (let y = 0; y < pc.h - 6; y += 2) {
      pc.px(cx + (y % 4 ? 1 : 0), y, METAL.mid);
      pc.px(cx + (y % 4 ? 1 : 0), y + 1, METAL.dk);
    }
    pc.frame(cx - 1, pc.h - 6, 4, 4, METAL.mid);
  }
  pc.px(9, pc.h - 2, BLOOD.dark);
}

/* ---------- workshop secret ---------- */

function drawTrapdoor(pc) {
  pc.rect(0, 0, 16, 16, OUT);
  pc.rect(1, 1, 14, 14, DWOOD.mid);
  for (let x = 4; x < 15; x += 4) pc.vl(x, 1, 14, DWOOD.dk);
  pc.hl(1, 1, 14, DWOOD.hi);
  // iron hinges and bands
  for (const y of [3, 11]) { pc.rect(1, y, 14, 2, METAL.dk); pc.hl(1, y, 14, METAL.mid); }
  // rusty padlock
  pc.rect(6, 6, 4, 5, OUT);
  pc.rect(7, 7, 2, 3, c(0x7a5a40));
  pc.frame(6, 4, 4, 3, METAL.mid);
  pc.px(7, 8, OUT);
}

function drawRugRolled(pc) {
  // the workshop rug, rolled up and pushed aside
  const base = 0x5c4a3a;
  pc.rect(1, 2, 28, 9, OUT);
  pc.rect(2, 3, 26, 7, c(base));
  pc.hl(2, 3, 26, c(base, 1.4));
  pc.hl(2, 8, 26, c(base, 0.7));
  for (let x = 5; x < 27; x += 5) pc.vl(x, 4, 4, c(base, 0.8));
  pc.ellipse(27, 6, 2, 4, OUT);
  pc.ellipse(27, 6, 1, 3, c(base, 1.3));
  pc.px(27, 6, c(base, 0.6));
  for (let y = 3; y < 10; y += 2) pc.px(0, y, c(base, 1.6));
}

/* ------------------------------------------------------------------ */

export const PROPS = {
  bookshelf: { w: 32, h: 40, tw: 2, th: 2, solid: [0, 1, 2, 1], draw: drawBookshelf },
  bed: { w: 44, h: 54, tw: 3, th: 3, draw: drawBed },
  bed_single: { w: 28, h: 54, tw: 2, th: 3, draw: drawBed },
  nightstand: { w: 14, h: 24, tw: 1, th: 1, draw: drawNightstand, frames: 3, light: (o) => (o.item === 'candle' ? { r: 34, a: 0.8, dy: -10, flicker: true } : null) },
  wardrobe: { w: 30, h: 46, tw: 2, th: 2, solid: [0, 1, 2, 1], draw: drawWardrobe },
  dresser: { w: 30, h: (o) => (o.mirror ? 42 : 26), tw: 2, th: 1, draw: drawDresser },
  sidetable: { w: 14, h: 24, tw: 1, th: 1, draw: drawSideTable },
  chair: { w: (o) => (o.dir === 'fallen' ? 16 : 12), h: (o) => (o.dir === 'fallen' ? 12 : o.dir === 'up' ? 18 : 20), tw: 1, th: 1, draw: drawChair },
  table: { w: 46, h: 30, tw: 3, th: 2, draw: drawTable },
  table_small: { w: 30, h: 28, tw: 2, th: 2, draw: drawTable },
  counter: { w: 16, h: 26, tw: 1, th: 1, draw: drawCounter },
  uppercab: { w: 16, h: 14, tw: 1, th: 1, layer: 'wall', draw: drawUpperCab },
  fridge: { w: 16, h: 36, tw: 1, th: 1, draw: drawFridge },
  bathtub: { w: 44, h: 28, tw: 3, th: 2, draw: drawBathtub },
  toilet: { w: 12, h: 22, tw: 1, th: 1, draw: drawToilet },
  sink: { w: 14, h: 22, tw: 1, th: 1, draw: drawSink },
  mirror: { w: 12, h: 16, tw: 1, th: 2, layer: 'wall', draw: drawMirror },
  medcab: { w: 14, h: 14, tw: 1, th: 2, layer: 'wall', draw: drawMedCab },
  towel: { w: 10, h: 14, tw: 1, th: 2, layer: 'wall', draw: drawTowel },
  bucket: { w: 12, h: 18, tw: 1, th: 1, draw: drawBucket },
  sofa_back: { w: 44, h: 24, tw: 3, th: 1, draw: drawSofaBack },
  armchair: { w: 20, h: 24, tw: 1, th: 1, draw: drawArmchair },
  tv: { w: 20, h: 26, tw: 1, th: 1, draw: drawTV },
  fireplace: { w: 36, h: 36, tw: 2, th: 2, solid: [0, 1, 2, 1], draw: drawFireplace },
  piano: { w: 32, h: 32, tw: 2, th: 1, draw: drawPiano },
  clock: { w: 14, h: 42, tw: 1, th: 1, draw: drawClock },
  plant: { w: 12, h: 22, tw: 1, th: 1, draw: drawPlant },
  door_front: { w: 32, h: 32, tw: 2, th: 2, layer: 'wall', draw: drawDoorFront },
  door_side: { w: 16, h: 32, tw: 1, th: 2, layer: 'wall', draw: drawDoorSide },
  window: { w: 22, h: 26, tw: 1, th: 2, layer: 'wall', draw: drawWindow, light: { r: 50, a: 0.45, dy: 30 } },
  picture: { w: (o) => (o.kind === 'portrait' || !o.kind ? 12 : 16), h: (o) => (o.kind === 'portrait' || !o.kind ? 14 : 12), tw: 1, th: 2, layer: 'wall', draw: drawPicture },
  picture_side: { w: 16, h: 18, tw: 1, th: 2, layer: 'wall', draw: drawPictureSide },
  rug: { w: (o) => o.tw * 16, h: (o) => o.th * 16, layer: 'floor', draw: drawRug },
  doormat: { w: (o) => o.tw * 16 - 4, h: 10, layer: 'floor', draw: drawDoormat },
  blood: { w: (o) => (o.tw ?? 1) * 16, h: (o) => (o.th ?? 1) * 16, layer: 'floor', draw: drawBlood },
  handprint: { w: 10, h: 15, tw: 1, th: 2, layer: 'wall', draw: drawHandprint },
  writing: { w: (o) => (o.tw ?? 2) * 16, h: 24, th: 2, layer: 'wall', draw: drawWriting },
  debris: { w: (o) => (o.tw ?? 1) * 16, h: (o) => (o.th ?? 1) * 16, layer: 'floor', draw: drawDebris },
  cobweb: { w: 14, h: 14, tw: 1, th: 1, layer: 'wall', draw: drawCobweb },
  plates: { w: 16, h: 12, tw: 1, th: 1, layer: 'floor', draw: drawPlates },
  doll: { w: 12, h: 13, tw: 1, th: 1, draw: drawDoll },
  sheet: {
    w: (o) => ({ tall: 16, wide: 30, round: 16, lump: 16, low: 28, cabinet: 18, dresser: 32, mirror: 24 })[o.kind || 'tall'],
    h: (o) => ({ tall: 34, wide: 22, round: 18, lump: 26, low: 14, cabinet: 40, dresser: 26, mirror: 42 })[o.kind || 'tall'],
    tw: (o) => (o.kind === 'wide' || o.kind === 'low' || o.kind === 'dresser' ? 2 : 1),
    th: 1,
    draw: drawSheet,
  },
  crate: { w: 16, h: 18, tw: 1, th: 1, draw: drawCrate },
  box: { w: 14, h: 14, tw: 1, th: 1, draw: drawBox },
  barrel: { w: 14, h: 18, tw: 1, th: 1, draw: drawBarrel },
  trunk: { w: 26, h: 18, tw: 2, th: 1, draw: drawTrunk },
  rockingchair: { w: 16, h: 25, tw: 1, th: 1, draw: drawRockingChair },
  mannequin: { w: 18, h: 38, tw: 1, th: 1, draw: drawMannequin },
  beam: { w: 10, h: 46, tw: 1, th: 1, draw: drawBeam },
  ladder: { w: 14, h: 52, tw: 1, th: 3, solid: [0, 2, 1, 1], draw: drawLadder },
  hatch: { w: 16, h: 18, tw: 1, th: 1, draw: drawHatch },
  workbench: { w: 62, h: 28, tw: 4, th: 1, draw: drawWorkbench },
  pegboard: { w: 60, h: 18, tw: 4, th: 2, layer: 'wall', draw: drawPegboard },
  shelf_metal: { w: 30, h: 36, tw: 2, th: 1, draw: drawShelfMetal },
  sawhorse: { w: 28, h: 14, tw: 2, th: 1, draw: drawSawhorse },
  toolbox: { w: 14, h: 12, tw: 1, th: 1, draw: drawToolbox },
  planks: { w: 28, h: 12, tw: 2, th: 1, draw: drawPlanks },
  tablesaw: { w: 28, h: 22, tw: 2, th: 1, draw: drawTableSaw },
  pentagram: { w: 96, h: 80, tw: 6, th: 5, layer: 'floor', draw: drawPentagram },
  candle: { w: 8, h: 12, tw: 1, th: 1, frames: 3, draw: drawCandle, light: { r: 30, a: 0.85, dy: -6, flicker: true } },
  altar: { w: 34, h: 26, tw: 2, th: 1, frames: 3, draw: drawAltar, light: { r: 40, a: 0.8, dy: -14, flicker: true } },
  cage: { w: 30, h: 40, tw: 2, th: 2, solid: [0, 1, 2, 1], draw: drawCage },
  chains: { w: 12, h: 24, tw: 1, th: 2, layer: 'wall', draw: drawChains },
  trapdoor: { w: 16, h: 16, tw: 1, th: 1, layer: 'floor', draw: drawTrapdoor },
  rug_rolled: { w: 30, h: 12, tw: 2, th: 1, draw: drawRugRolled },
  ...DUNGEON_PROPS,
  ...OUTDOOR_PROPS,
  ...ATTIC_PROPS,
  ...REMAINS_PROPS,
};

const cache = new Map();
const NON_VISUAL = new Set(['x', 'y', 'dx', 'dy', 'scale', 'rot', 'flip', 'solid', 'text', 'use', 'onInteract', 'if', 'unless', 'sequence', '_key', '_orig', '_added', 'uid']);
const val =(v, o) => (typeof v === 'function' ? v(o) : v);

/** resolve sizes for an instance */
export function propInfo(inst) {
  const def = PROPS[inst.t];
  if (!def) throw new Error('Unknown prop: ' + inst.t);
  const o = inst;
  if (o.wall && o.wall !== 'back' && VIEWS[o.t]) {
    // shown against a side wall or the bottom wall: generated view, blocks its whole footprint
    const v = viewInfo(o.t, o.wall);
    return {
      def: { ...def, solid: undefined, dy: 0, draw: drawView },
      tw: v.tw,
      th: v.th,
      w: v.w,
      h: v.h,
      layer: 'obj',
      frames: 1,
      light: null,
      opts: { ...o, tw: v.tw, th: v.th },
    };
  }
  const tw = o.tw ?? val(def.tw, o) ?? 1;
  const th = o.th ?? val(def.th, o) ?? 1;
  const oo = { ...o, tw, th };
  return {
    def,
    tw,
    th,
    w: val(def.w, oo),
    h: val(def.h, oo),
    layer: def.layer || 'obj',
    frames: val(def.frames, oo) || 1,
    light: val(def.light, oo) || null,
    opts: oo,
  };
}

/** returns canvases (one per frame) for a prop instance */
export function propCanvases(inst, seed) {
  const info = propInfo(inst);
  // only options that change how it looks are part of the cache key
  const visual = Object.entries(inst).filter(([k, v]) => !NON_VISUAL.has(k) && typeof v !== 'function');
  const key = JSON.stringify(visual) + '|' + seed;
  if (cache.has(key)) return cache.get(key);
  const out = [];
  for (let f = 0; f < info.frames; f++) {
    const pc = new PC(Math.ceil(info.w), Math.ceil(info.h));
    info.def.draw(pc, rng(seed), info.opts, f);
    out.push(pc);
  }
  cache.set(key, out);
  return out;
}
