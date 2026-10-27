import { rng, PC } from './pixel.js';
import { c, BLOOD, OUT, BLACK } from './palette.js';
import { DWOOD, WOOD, GWOOD, METAL, IRON, STONE, bloodBlob, drip, groundShadow } from './draw.js';

// Backyard and tool shed.

const SOIL = c(0x4a3a2c);
const STALK = c(0xa09170), STALK_D = c(0x7a6e55);
const BARK = { hi: c(0x948878), mid: c(0x766a5c), dk: c(0x4a4038) };

function drawDoorBack(pc) {
  const W = pc.w;
  pc.rect(0, 0, W, 32, OUT);
  pc.rect(1, 1, W - 2, 31, DWOOD.dk);
  pc.rect(3, 3, W - 6, 29, GWOOD.mid);
  pc.vl(3, 3, 29, GWOOD.hi);
  // four-pane window, one pane broken
  pc.rect(6, 6, W - 12, 10, OUT);
  pc.rect(7, 7, W - 14, 8, c(0x23282e));
  pc.vl(W / 2, 7, 8, GWOOD.dk); pc.hl(7, 11, W - 14, GWOOD.dk);
  pc.rect(W / 2 + 1, 12, 3, 3, BLACK);
  pc.px(8, 8, c(0x5a6470));
  pc.frame(6, 19, W - 12, 9, GWOOD.dk);
  pc.px(W - 6, 19, c(0xb09a6a)); pc.px(W - 6, 20, c(0x7a6a4a));
  pc.rect(3, 29, W - 6, 2, METAL.dk);
}

function drawPlanter(pc, r) {
  // long stone flower bed, seen from above with its front face at the bottom
  const W = pc.w, H = pc.h;
  pc.rect(0, 2, W, H - 2, OUT);
  pc.rect(1, 3, W - 2, H - 10, STONE.top);
  pc.rect(3, 5, W - 6, H - 14, SOIL);
  pc.speckle(3, 5, W - 6, H - 14, c(0x5e4a38), 0.25, r);
  pc.rect(1, H - 7, W - 2, 6, STONE.mid);
  pc.hl(1, H - 7, W - 2, STONE.dk);
  for (let x = 4; x < W - 1; x += 5) pc.vl(x, H - 6, 5, STONE.dk);
  // dead flowers drooping out of the soil
  for (let y = 8; y < H - 12; y += 7) {
    const x = 5 + Math.floor(r() * (W - 10));
    pc.line(x, y + 4, x + 1, y, STALK_D);
    pc.px(x + 2, y, c(0x6e5d4e)); pc.px(x + 2, y + 1, c(0x6e5d4e)); pc.px(x - 1, y + 2, STALK);
  }
}

function drawCrop(pc, r, o) {
  const kind = o.kind || 'corn';
  if (kind === 'corn') {
    for (const [x, h] of [[4, 17], [8, 14], [11, 18]]) {
      pc.vl(x, 20 - h, h, STALK);
      pc.vl(x + 1, 21 - h, h - 1, STALK_D);
      // limp leaves
      pc.line(x, 20 - h + 4, x - 3, 20 - h + 8, STALK);
      pc.line(x + 1, 20 - h + 7, x + 4, 20 - h + 11, STALK_D);
      if (r() < 0.6) { pc.rect(x + 1, 20 - h + 5, 2, 3, c(0x6e6040)); pc.px(x + 2, 20 - h + 5, c(0x3a3226)); }
    }
    pc.line(8, 6, 12, 4, STALK); // snapped top
  } else if (kind === 'cabbage') {
    pc.ellipse(7, 15, 6, 4, OUT);
    pc.ellipse(7, 15, 5, 3, c(0x5c6046));
    pc.ellipse(6, 14, 3, 2, c(0x6b6e52));
    pc.px(9, 15, c(0x2e2a22)); pc.px(4, 16, c(0x2e2a22)); pc.px(8, 13, c(0x3e3a2c));
    pc.line(1, 17, 0, 19, c(0x6e5d4e)); pc.line(12, 17, 14, 19, c(0x6e5d4e));
  } else {
    // stake with a dead vine
    pc.vl(7, 2, 18, WOOD.dk); pc.vl(8, 2, 18, WOOD.mid);
    for (let y = 4; y < 18; y += 3) { pc.px(6 - (y % 2), y, STALK_D); pc.px(9 + (y % 2), y + 1, STALK); }
    pc.px(5, 9, c(0x3a2a24)); pc.px(10, 13, c(0x3a2a24)); pc.px(5, 16, c(0x3a2a24));
  }
}

function drawScarecrow(pc, r) {
  const W = pc.w, cx = Math.floor(W / 2);
  groundShadow(pc, cx, pc.h - 2, 5, 1);
  pc.rect(cx - 1, 10, 3, pc.h - 11, OUT); pc.vl(cx, 10, pc.h - 12, WOOD.mid);
  pc.rect(0, 13, W, 3, OUT); pc.hl(1, 14, W - 2, WOOD.mid);
  // ragged shirt
  const shirt = c(0x5e5a50);
  pc.rect(cx - 5, 12, 11, 12, OUT); pc.rect(cx - 4, 13, 9, 10, shirt);
  pc.rect(1, 12, cx - 4, 5, OUT); pc.rect(2, 13, cx - 5, 3, shirt);
  pc.rect(cx + 4, 12, W - cx - 5, 5, OUT); pc.rect(cx + 5, 13, W - cx - 7, 3, shirt);
  for (let y = 23; y < 27; y++) pc.px(cx - 4 + ((y * 3) % 9), y, shirt);
  const straw = c(0xb0a070);
  pc.px(0, 17, straw); pc.px(1, 18, straw); pc.px(W - 1, 17, straw); pc.px(W - 2, 18, straw);
  // burlap head with stitched face
  pc.ellipse(cx, 7, 5, 5, OUT);
  pc.ellipse(cx, 7, 4, 4, c(0x9a8a6a));
  pc.line(cx - 3, 5, cx - 1, 7, OUT); pc.line(cx - 1, 5, cx - 3, 7, OUT);
  pc.line(cx + 1, 5, cx + 3, 7, OUT); pc.line(cx + 3, 5, cx + 1, 7, OUT);
  for (let x = cx - 3; x <= cx + 3; x++) pc.px(x, 9, x % 2 ? BLOOD.dark : OUT);
  drip(pc, cx + 1, 10, 3);
  // hat
  pc.rect(cx - 7, 2, 15, 2, OUT); pc.rect(cx - 3, 0, 7, 3, OUT); pc.hl(cx - 6, 2, 13, c(0x3a3530));
}

function drawShed(pc, r) {
  const W = pc.w, H = pc.h;
  const roofH = 34;
  groundShadow(pc, W / 2, H - 2, W / 2 - 2, 2, 0.5);
  // roof: shingled slope facing us
  pc.rect(0, 0, W, roofH + 1, OUT);
  for (let y = 1; y < roofH; y++) {
    const row = Math.floor(y / 4), off = (row % 2) * 4;
    for (let x = 1; x < W - 1; x++) {
      let col = (x + off) % 8 === 0 || y % 4 === 0 ? c(0x2e2c29) : row % 3 === 0 ? c(0x55524c) : c(0x4a4743);
      if (y < 4) col = c(0x635f58);
      pc.px(x, y, col);
    }
  }
  // missing shingles and moss
  for (let i = 0; i < 6; i++) pc.rect(4 + Math.floor(r() * (W - 12)), 6 + Math.floor(r() * (roofH - 10)), 3, 2, BLACK);
  pc.speckle(1, 1, W - 2, roofH - 2, c(0x4f5640), 0.05, r);
  pc.hl(0, roofH, W, c(0x1c1a17));
  // front wall: weathered planks
  pc.rect(0, roofH + 1, W, H - roofH - 1, OUT);
  for (let x = 1; x < W - 1; x++) {
    const plank = Math.floor(x / 6);
    const col = x % 6 === 0 ? GWOOD.deep : plank % 2 ? GWOOD.mid : GWOOD.top;
    pc.vl(x, roofH + 1, H - roofH - 3, col);
  }
  pc.hl(1, roofH + 1, W - 2, c(0x2a2622));
  // window
  pc.rect(9, roofH + 7, 12, 9, OUT); pc.rect(10, roofH + 8, 10, 7, c(0x23282e));
  pc.vl(15, roofH + 8, 7, GWOOD.dk); pc.line(11, roofH + 9, 14, roofH + 13, c(0x7a838d));
  // door with a Z brace and an open padlock
  const dx = 32, dw = 16, dy = roofH + 4;
  pc.rect(dx - 1, dy - 1, dw + 2, H - dy, OUT);
  pc.rect(dx, dy, dw, H - dy - 1, DWOOD.mid);
  for (let x = dx + 4; x < dx + dw; x += 4) pc.vl(x, dy, H - dy - 1, DWOOD.dk);
  pc.hl(dx, dy + 3, dw, DWOOD.hi); pc.hl(dx, H - 6, dw, DWOOD.hi);
  pc.line(dx + 1, H - 7, dx + dw - 2, dy + 4, DWOOD.hi);
  pc.rect(dx + dw - 4, dy + 12, 3, 3, METAL.mid); pc.px(dx + dw - 3, dy + 11, METAL.hi);
  // tools leaning outside
  pc.line(W - 10, roofH + 4, W - 7, H - 3, WOOD.mid); pc.rect(W - 9, H - 5, 4, 3, METAL.mid);
}

/**
 * The well in the backyard, in three states (`state`): 'bare' (just the crank, no rope),
 * 'rope' (rope wound on the crank and hanging down into the dark) and 'bucket' (the
 * rope, plus the old bucket pulled up and left beside it in a puddle).
 */
function drawWell(pc, r, o) {
  const state = o.state ?? 'bare';
  if (state === 'bucket') {
    // the well drawn in the middle of a wider canvas, the bucket to its right
    const well = new PC(32, pc.h);
    drawWell(well, r, { ...o, state: 'rope' });
    const ox = (pc.w - 32) / 2;
    const H = pc.h;
    // the puddle the bucket stands in
    const water = c(0x3d4a52), wHi = c(0x6a7a84), wDk = c(0x2a343a);
    pc.ellipse(ox + 37, H - 3, 9, 3, wDk);
    pc.ellipse(ox + 37, H - 3, 8, 2, water);
    pc.hl(ox + 33, H - 4, 3, wHi); pc.px(ox + 41, H - 2, wHi); pc.px(ox + 29, H - 2, water);
    pc.draw(well, ox, 0);
    // the bucket: old staves, broken, still dripping
    const bx = ox + 32, by = H - 14;
    pc.rect(bx, by, 10, 11, OUT);
    pc.rect(bx + 1, by + 1, 8, 9, WOOD.mid);
    for (const sx of [bx + 3, bx + 6]) pc.vl(sx, by + 2, 8, WOOD.dk);
    pc.vl(bx + 1, by + 1, 9, WOOD.top);
    pc.hl(bx, by + 3, 10, IRON.mid); pc.hl(bx, by + 8, 10, IRON.mid);
    pc.ellipse(bx + 5, by + 1, 4, 1, c(0x2e3a40)); // water inside
    pc.px(bx + 4, by + 5, OUT); pc.px(bx + 7, by + 7, OUT); // holes
    pc.px(bx + 9, by + 10, wHi); pc.px(bx, by + 11, wHi);
    return;
  }
  const W = pc.w, H = pc.h, cx = W / 2;
  groundShadow(pc, cx, H - 2, W / 2 - 1, 2, 0.5);
  // stone cylinder
  pc.rect(2, 22, W - 4, H - 24, OUT);
  pc.rect(3, 22, W - 6, H - 25, STONE.mid);
  for (let y = 25; y < H - 3; y += 4) {
    pc.hl(3, y, W - 6, STONE.dk);
    for (let x = 5 + ((y >> 2) % 2) * 3; x < W - 3; x += 6) pc.vl(x, y + 1, 3, STONE.dk);
  }
  // rim and the black opening
  pc.ellipse(cx, 22, W / 2 - 2, 6, OUT);
  pc.ellipse(cx, 22, W / 2 - 3, 5, STONE.top);
  pc.ellipse(cx, 22, W / 2 - 6, 3, BLACK);
  pc.hl(cx - 8, 17, 10, STONE.hi);
  // posts, little roof and the crank
  for (const px of [4, W - 6]) { pc.rect(px, 3, 3, 20, OUT); pc.vl(px + 1, 4, 18, WOOD.mid); }
  pc.rect(1, 0, W - 2, 5, OUT); pc.rect(2, 1, W - 4, 3, DWOOD.top); pc.hl(2, 1, W - 4, DWOOD.hi);
  pc.rect(5, 8, W - 10, 2, OUT); pc.hl(6, 8, W - 12, WOOD.top);
  pc.rect(W - 4, 7, 3, 2, IRON.hi);
  if (state === 'rope') {
    // rope wound round the crank, its end hanging down into the dark
    const rope = c(0x9a8a68), ropeD = c(0x6e6248);
    pc.rect(cx - 6, 7, 12, 4, OUT);
    for (let x = cx - 5; x < cx + 6; x++) { pc.vl(x, 8, 2, x % 2 ? rope : ropeD); }
    pc.vl(cx, 11, 11, rope);
    pc.vl(cx + 1, 11, 11, ropeD);
    pc.px(cx, 15, ropeD);
  }
}

/** a stone flower bed along the front of the house, overgrown with dead, scraggly bushes */
function drawShrubBed(pc, r) {
  const W = pc.w, H = pc.h;
  const LEAF = { hi: c(0x7e8670), mid: c(0x5f6655), dk: c(0x40463a) };
  groundShadow(pc, W / 2, H - 2, W / 2 - 2, 2, 0.4);
  // the stone box
  pc.rect(0, H - 10, W, 9, OUT);
  pc.rect(1, H - 9, W - 2, 7, STONE.mid);
  pc.hl(1, H - 9, W - 2, STONE.hi);
  for (let x = 6; x < W - 2; x += 10) pc.vl(x, H - 8, 6, STONE.dk);
  // bushes: lumpy round clumps piled along it
  const clumps = Math.floor(W / 11);
  for (let i = 0; i < clumps; i++) {
    const cx = 6 + i * ((W - 12) / Math.max(1, clumps - 1)), cy = H - 13 - (i % 2) * 2, rr = 6 + (i % 3);
    pc.ellipse(cx, cy, rr + 1, rr - 1, OUT);
  }
  for (let i = 0; i < clumps; i++) {
    const cx = 6 + i * ((W - 12) / Math.max(1, clumps - 1)), cy = H - 13 - (i % 2) * 2, rr = 6 + (i % 3);
    pc.ellipse(cx, cy, rr, rr - 2, LEAF.mid);
    pc.ellipse(cx - 2, cy - 2, rr - 3, rr - 4, LEAF.hi);
  }
  for (let i = 0; i < W * 1.5; i++) pc.px(2 + r() * (W - 4), H - 22 + r() * 11, r() < 0.5 ? LEAF.dk : OUT);
}

/* ---------- graves ---------- */

const DIRT = { hi: c(0x7a6450), top: c(0x635040), mid: c(0x4a3a2c), dk: c(0x33281f), deep: c(0x1c1611) };

/** an old headstone with a rounded top, "RIP" cut into it, cracked and mossy */
function drawTombstone(pc, r) {
  const W = pc.w, H = pc.h;
  groundShadow(pc, W / 2, H - 2, 7, 2, 0.45);
  const top = 2, bot = H - 3;
  // slab: rounded top, then straight sides
  pc.ellipse(W / 2, top + 6, 6, 6, OUT);
  pc.rect(W / 2 - 6, top + 6, 13, bot - top - 6, OUT);
  pc.ellipse(W / 2, top + 6, 5, 5, STONE.top);
  pc.rect(W / 2 - 5, top + 6, 11, bot - top - 7, STONE.mid);
  pc.rect(W / 2 - 5, top + 6, 4, bot - top - 7, STONE.top); // lit left side
  pc.vl(W / 2 + 5, top + 6, bot - top - 7, STONE.dk);
  pc.hl(W / 2 - 3, top + 1, 6, STONE.hi);
  // "RIP" in tiny cut letters
  const ink = STONE.deep;
  const glyph = (x, y, rows) => rows.forEach((row, j) => [...row].forEach((ch, i) => ch === '#' && pc.px(x + i, y + j, ink)));
  const y = top + 6;
  glyph(W / 2 - 5, y, ['##.', '#.#', '##.', '#.#', '#.#']);
  glyph(W / 2 - 1, y, ['#', '#', '#', '#', '#']);
  glyph(W / 2 + 1, y, ['##.', '#.#', '##.', '#..', '#..']);
  // a few lines below the letters, worn almost smooth
  pc.hl(W / 2 - 4, y + 7, 9, STONE.dk); pc.hl(W / 2 - 3, y + 9, 7, STONE.dk);
  // a crack, moss at the foot, the base sunk into the grass
  pc.line(W / 2 + 3, top + 3, W / 2 + 1, top + 8, STONE.deep);
  for (let x = W / 2 - 5; x < W / 2 + 6; x++) if (r() < 0.5) pc.px(x, bot - 2 - Math.floor(r() * 2), c(0x5a6450));
  pc.rect(W / 2 - 7, bot - 1, 15, 2, OUT); pc.hl(W / 2 - 6, bot - 1, 13, STONE.dk);
}

/** an open grave: a dark pit in the grass, its walls of fresh-turned earth */
function drawGraveHole(pc, r) {
  const W = pc.w, H = pc.h;
  pc.rect(1, 1, W - 2, H - 2, DIRT.mid);
  pc.rect(2, 2, W - 4, H - 4, DIRT.dk);
  pc.rect(3, 5, W - 6, H - 8, DIRT.deep);
  // the far wall of the pit catches a little light, the bottom is black
  pc.rect(3, 3, W - 6, 2, DIRT.mid);
  pc.rect(4, 8, W - 8, H - 12, '#0b0907');
  // ragged grass edge and loose clods on the rim
  for (let x = 0; x < W; x++) {
    if (r() < 0.4) pc.px(x, 0, DIRT.top);
    if (r() < 0.4) pc.px(x, H - 1, DIRT.top);
  }
  for (let y = 0; y < H; y++) {
    if (r() < 0.35) pc.px(0, y, DIRT.top);
    if (r() < 0.35) pc.px(W - 1, y, DIRT.top);
  }
  for (let i = 0; i < 6; i++) pc.px(1 + Math.floor(r() * (W - 2)), 1 + Math.floor(r() * (H - 2)), DIRT.hi);
}

/** the earth dug out of the grave, heaped up beside it, a few clods rolled away */
function drawDirtPile(pc, r) {
  const W = pc.w, H = pc.h, cx = W / 2;
  groundShadow(pc, cx, H - 3, W / 2 - 2, 2, 0.4);
  // a loose heap: several lumps of different heights rather than one smooth mound
  const lumps = [[cx - 5, H - 6, 5, 4], [cx + 4, H - 6, 6, 4], [cx - 1, H - 9, 6, 5], [cx + 2, H - 11, 3, 3]];
  for (const [x, y, rx, ry] of lumps) pc.ellipse(x, y, rx + 1, ry + 1, OUT);
  for (const [x, y, rx, ry] of lumps) pc.ellipse(x, y, rx, ry, DIRT.mid);
  for (const [x, y, rx, ry] of lumps) pc.ellipse(x - 1, y - 1, Math.max(1, rx - 2), Math.max(1, ry - 2), DIRT.top);
  pc.ellipse(cx, H - 12, 2, 1, DIRT.hi);
  // crumbly, grainy earth
  for (let i = 0; i < 40; i++) {
    const x = 3 + Math.floor(r() * (W - 6)), y = H - 14 + Math.floor(r() * 12);
    if (pc.ctx.getImageData(x, y, 1, 1).data[3]) pc.px(x, y, r() < 0.55 ? DIRT.dk : DIRT.hi);
  }
  // clods that rolled off
  for (const [x, y] of [[W - 4, H - 4], [W - 7, H - 2], [3, H - 3]]) {
    pc.rect(x - 1, y - 1, 3, 2, OUT); pc.px(x, y - 1, DIRT.top); pc.px(x - 1, y - 1, DIRT.mid);
  }
}

function drawTree(pc, r, o) {
  const W = pc.w, H = pc.h, cx = Math.floor(W / 2);
  groundShadow(pc, cx, H - 3, 12, 3, 0.45);
  const rr = rng(o.seed ?? 3);
  const branch = (x, y, a, len, depth) => {
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    // thick limbs get an outline and a lit edge, twigs are single pixels
    if (depth >= 2) {
      pc.line(x - 1, y, x2 - 1, y2, OUT);
      pc.line(x + 1, y + 1, x2 + 1, y2 + 1, OUT);
      pc.line(x, y, x2, y2, BARK.hi);
      pc.line(x + 1, y, x2 + 1, y2, BARK.mid);
    } else pc.line(x, y, x2, y2, depth === 1 ? BARK.mid : BARK.dk);
    if (depth > 0) {
      branch(x2, y2, a - 0.35 - rr() * 0.4, len * (0.6 + rr() * 0.2), depth - 1);
      branch(x2, y2, a + 0.35 + rr() * 0.4, len * (0.6 + rr() * 0.2), depth - 1);
    }
    return [x2, y2];
  };
  // trunk
  const top = 26;
  pc.rect(cx - 4, top, 9, H - top - 3, OUT);
  pc.rect(cx - 3, top, 7, H - top - 4, BARK.mid);
  pc.vl(cx - 3, top, H - top - 4, BARK.hi);
  pc.vl(cx + 2, top, H - top - 4, BARK.dk);
  for (let y = top + 3; y < H - 6; y += 5) pc.px(cx + (y % 3) - 1, y, BARK.dk);
  // roots
  pc.line(cx - 4, H - 5, cx - 9, H - 3, BARK.dk); pc.line(cx + 4, H - 5, cx + 9, H - 2, BARK.dk);
  pc.ellipse(cx, H - 13, 1, 2, c(0x1c1815)); // knot hole
  // bare branches
  branch(cx, top + 2, -Math.PI / 2 - 0.5, 13, 3);
  branch(cx, top + 2, -Math.PI / 2 + 0.5, 12, 3);
  const [nx, ny] = branch(cx + 1, top + 8, -0.25, 12, 1);
  if (o.noose) {
    const rope = c(0x9a8a6a);
    const bx = Math.round(Math.min(nx, W - 4)), by = Math.round(ny);
    pc.vl(bx, by, 16, rope);
    pc.ellipse(bx, by + 19, 2, 3, rope);
    pc.ctx.clearRect(bx - 1, by + 17, 3, 5); // hollow loop
    pc.px(bx - 2, by + 18, rope); pc.px(bx + 2, by + 18, rope);
  }
}

function drawGardenTools(pc) {
  // rake, shovel and hoe leaning against the wall
  pc.line(3, 2, 6, 27, WOOD.mid); pc.rect(0, 0, 8, 3, OUT); for (let x = 0; x < 8; x += 2) pc.px(x, 3, METAL.mid);
  pc.line(13, 0, 13, 20, WOOD.mid); pc.rect(10, 20, 7, 7, OUT); pc.rect(11, 20, 5, 6, METAL.mid); pc.hl(11, 20, 5, METAL.hi);
  pc.line(22, 1, 20, 27, WOOD.dk); pc.rect(20, 0, 7, 3, OUT); pc.hl(21, 1, 5, METAL.mid);
  pc.px(13, 25, BLOOD.dark); pc.px(14, 24, BLOOD.main);
}

function drawStump(pc, r) {
  groundShadow(pc, 8, 15, 7, 2);
  pc.rect(1, 6, 14, 10, OUT); pc.rect(2, 6, 12, 9, BARK.mid); pc.vl(2, 6, 9, BARK.hi);
  pc.ellipse(8, 6, 7, 3, OUT); pc.ellipse(8, 6, 6, 2, c(0x9a8468)); pc.ellipse(8, 6, 3, 1, c(0x84705a));
  pc.px(8, 6, c(0x6e5c48));
  // axe buried in the top
  pc.line(9, 5, 14, 0, WOOD.dk); pc.line(10, 5, 15, 0, WOOD.mid);
  pc.rect(6, 3, 5, 3, METAL.hi); pc.hl(6, 5, 5, METAL.dk);
  bloodBlob(pc, 5, 6, 2, 1, r);
  drip(pc, 3, 8, 5);
}

function drawWheelbarrow(pc) {
  const W = pc.w;
  pc.line(W - 10, 9, W - 1, 6, WOOD.dk); pc.line(W - 10, 12, W - 1, 10, WOOD.dk);
  pc.rect(3, 3, W - 12, 10, OUT);
  pc.rect(4, 4, W - 14, 3, c(0x2a2826));
  pc.rect(4, 7, W - 14, 5, IRON.mid); pc.hl(4, 7, W - 14, IRON.hi);
  pc.speckle(4, 7, W - 14, 5, c(0x6e5040), 0.3, rng(4));
  pc.ellipse(4, 13, 3, 3, OUT); pc.ellipse(4, 13, 2, 2, IRON.dk);
  pc.vl(W - 12, 13, 4, OUT);
}

function drawSack(pc, r) {
  const S = c(0x8f8068), Sd = c(0x6e6250);
  pc.ellipse(7, 10, 6, 5, OUT); pc.ellipse(7, 10, 5, 4, S);
  pc.rect(5, 2, 5, 5, OUT); pc.rect(6, 3, 3, 4, S);
  pc.hl(5, 5, 5, c(0x5a4a38));
  pc.vl(9, 8, 6, Sd); pc.speckle(3, 8, 8, 5, Sd, 0.15, r);
  pc.px(4, 12, BLOOD.deep);
}

function drawPots(pc) {
  const T = c(0x8a5e48), Td = c(0x6a4636);
  for (const [y, w] of [[10, 6], [6, 5], [2, 4]]) {
    pc.rect(7 - w, y, w * 2, 5, OUT); pc.rect(8 - w, y + 1, w * 2 - 2, 3, T); pc.hl(8 - w, y + 3, w * 2 - 2, Td);
  }
  pc.px(10, 13, OUT); pc.px(11, 12, OUT);
}

export const OUTDOOR_PROPS = {
  door_back: { w: 22, h: 32, tw: 2, th: 2, layer: 'wall', draw: drawDoorBack },
  planter: { w: 16, h: 46, tw: 1, th: 3, draw: drawPlanter },
  crop: { w: 14, h: 20, tw: 1, th: 1, solid: null, draw: drawCrop },
  scarecrow: { w: 20, h: 36, tw: 1, th: 1, draw: drawScarecrow },
  shed: { w: 80, h: 64, tw: 5, th: 4, draw: drawShed },
  well: { w: (o) => (o.state === 'bucket' ? 54 : 32), h: 40, tw: 2, th: 2, draw: drawWell },
  tombstone: { w: 16, h: 24, tw: 1, th: 1, draw: drawTombstone },
  shrub_bed: { w: (o) => (o.tw ?? 4) * 16, h: 26, tw: (o) => o.tw ?? 4, th: 1, draw: drawShrubBed },
  grave_hole: { w: 16, h: 30, tw: 1, th: 2, layer: 'floor', solid: true, draw: drawGraveHole },
  dirt_pile: { w: 24, h: 18, tw: 1, th: 1, draw: drawDirtPile },
  tree: { w: 46, h: 62, tw: 2, th: 3, solid: [0, 2, 2, 1], draw: drawTree },
  garden_tools: { w: 28, h: 28, tw: 2, th: 2, layer: 'wall', draw: drawGardenTools },
  stump: { w: 16, h: 18, tw: 1, th: 1, draw: drawStump },
  wheelbarrow: { w: 28, h: 18, tw: 2, th: 1, draw: drawWheelbarrow },
  sack: { w: 14, h: 16, tw: 1, th: 1, draw: drawSack },
  pots: { w: 14, h: 16, tw: 1, th: 1, draw: drawPots },
};
