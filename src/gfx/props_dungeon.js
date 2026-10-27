import { hash } from './pixel.js';
import { c, BLOOD, OUT, BLACK } from './palette.js';
import { DWOOD, WOOD, IRON, METAL, STONE, BONE, PAPER, FLAME, box, bloodBlob, drip } from './draw.js';

// Secret passage under the workshop and the room at the end of it.

/* ---------- passage ---------- */

function drawTorch(pc, r, o, f) {
  const cx = 6;
  pc.ctx.translate(0, 3); // room for the flame above the handle
  // wall plate and bracket
  pc.rect(cx - 2, 14, 5, 7, OUT);
  pc.rect(cx - 1, 15, 3, 5, IRON.mid);
  pc.px(cx, 16, IRON.hi);
  pc.rect(cx - 3, 10, 7, 4, OUT);
  pc.rect(cx - 2, 11, 5, 2, IRON.top);
  pc.hl(cx - 2, 11, 5, IRON.hi);
  // wooden handle wrapped in cloth
  pc.rect(cx - 1, 6, 3, 5, OUT);
  pc.vl(cx, 6, 4, WOOD.mid);
  pc.rect(cx - 2, 5, 5, 3, OUT);
  pc.rect(cx - 1, 5, 3, 2, c(0x4a3f33));
  if (f === 0) {
    // not lit yet: charred tip
    pc.px(cx, 4, c(0x2a2420));
    return;
  }
  const sway = f === 1 ? 0 : f === 2 ? 1 : -1;
  pc.ellipse(cx, 2, 2, 3, FLAME.c);
  pc.ellipse(cx, 3, 1, 2, FLAME.b);
  pc.px(cx, 4, FLAME.a);
  pc.px(cx, 3, FLAME.a);
  pc.px(cx + sway, -2, FLAME.c);
  pc.px(cx - sway, -1, FLAME.b);
  // embers
  if (f === 2) pc.px(cx + 3, -1, FLAME.b);
}

function drawWallHole(pc, r, o) {
  const W = pc.w, H = pc.h;
  const cx = W / 2, cy = H / 2;
  // ragged rim of broken stone
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const rad = 5 + (hash(i, 3, o.seed ?? 0) % 3);
    pc.px(cx + Math.cos(a) * (rad + 1), cy + Math.sin(a) * (rad * 0.8 + 1), STONE.dk);
  }
  pc.ellipse(cx, cy, 6, 5, OUT);
  pc.ellipse(cx, cy, 5, 4, c(0x0c0b0a));
  pc.ellipse(cx, cy + 1, 3, 2, BLACK);
  pc.hl(cx - 4, cy - 4, 6, STONE.hi);
  if (o.eyes) { pc.px(cx - 2, cy, c(0x8a8680)); pc.px(cx + 1, cy, c(0x8a8680)); }
  if (o.bones) { pc.rect(cx - 1, cy + 2, 4, 2, BONE.top); pc.px(cx, cy + 2, OUT); }
  // rubble that fell out
  pc.px(cx - 3, H - 1, STONE.mid); pc.px(cx + 2, H - 1, STONE.dk); pc.px(cx + 4, H - 2, STONE.mid);
}

function drawDungeonDoor(pc) {
  const W = pc.w;
  // stone arch
  pc.rect(0, 8, W, 24, OUT);
  pc.ellipse(W / 2, 10, W / 2 - 1, 9, OUT);
  pc.rect(1, 9, W - 2, 23, STONE.mid);
  pc.ellipse(W / 2, 10, W / 2 - 2, 8, STONE.mid);
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    pc.px(W / 2 + Math.cos(a) * (W / 2 - 2), 10 + Math.sin(a) * 8, STONE.dk);
  }
  // wooden door inside the arch
  pc.ellipse(W / 2, 12, W / 2 - 5, 7, DWOOD.mid);
  pc.rect(5, 12, W - 10, 20, DWOOD.mid);
  for (let x = 8; x < W - 5; x += 4) pc.vl(x, 6, 26, DWOOD.dk);
  // iron bands with studs
  for (const y of [14, 26]) {
    pc.rect(5, y, W - 10, 2, IRON.dk);
    for (let x = 6; x < W - 5; x += 3) pc.px(x, y, IRON.hi);
  }
  // barred window
  pc.rect(W / 2 - 4, 8, 8, 4, BLACK);
  for (let x = W / 2 - 3; x < W / 2 + 4; x += 2) pc.vl(x, 8, 4, IRON.mid);
  // ring handle
  pc.frame(W - 11, 19, 4, 4, IRON.hi);
  pc.rect(0, 30, W, 2, STONE.dk);
}

function drawExitBottom(pc, r, o) {
  // a doorway in the bottom wall, leading back the way you came
  const W = pc.w;
  const J = o.wood ? DWOOD : STONE;
  for (let y = 0; y < 16; y++) pc.rect(3, y, W - 6, 1, y < 2 ? c(0x2e2a26) : y < 6 ? c(0x15120f) : BLACK);
  pc.rect(0, 0, 3, 16, OUT); pc.rect(1, 0, 2, 16, J.mid); pc.vl(1, 0, 16, J.hi);
  pc.rect(W - 3, 0, 3, 16, OUT); pc.rect(W - 3, 0, 2, 16, J.dk);
  pc.hl(3, 0, W - 6, J.hi);
}

/* ---------- the room at the end ---------- */

function drawRack(pc, r) {
  const W = pc.w;
  box(pc, 4, 6, W - 8, 16, 11, DWOOD);
  for (let x = 8; x < W - 8; x += 5) pc.vl(x, 7, 9, DWOOD.dk);
  // rollers with spokes at both ends
  for (const rx of [3, W - 4]) {
    pc.ellipse(rx, 11, 3, 6, OUT);
    pc.ellipse(rx, 11, 2, 5, IRON.mid);
    pc.vl(rx, 4, 15, IRON.hi);
    pc.line(rx - 3, 6, rx + 3, 16, IRON.dk);
  }
  // ropes
  pc.line(6, 9, 16, 10, c(0x8a7a5a)); pc.line(6, 13, 16, 12, c(0x8a7a5a));
  pc.line(W - 6, 9, W - 16, 10, c(0x8a7a5a)); pc.line(W - 6, 13, W - 16, 12, c(0x8a7a5a));
  bloodBlob(pc, W / 2, 11, 6, 3, r);
  drip(pc, W / 2 + 2, 17, 6); drip(pc, W / 2 - 4, 17, 3);
  for (const lx of [6, W - 8]) { pc.rect(lx, 21, 3, 7, OUT); pc.vl(lx + 1, 21, 6, DWOOD.dk); }
}

function drawIronMaiden(pc, r) {
  const W = pc.w, H = pc.h;
  // body
  pc.rect(1, 8, W - 2, H - 9, OUT);
  pc.ellipse(W / 2, 9, W / 2 - 1, 8, OUT);
  pc.rect(2, 9, W - 4, H - 11, IRON.mid);
  pc.ellipse(W / 2, 9, W / 2 - 2, 7, IRON.mid);
  // open half: dark inside, rows of spikes
  pc.rect(3, 10, W / 2 - 3, H - 14, c(0x0d0c0b));
  for (let y = 12; y < H - 6; y += 4) for (let x = 5; x < W / 2; x += 3) pc.px(x, y, METAL.hi);
  for (let y = 14; y < H - 6; y += 6) pc.px(6 + (y % 3), y + 1, BLOOD.main);
  // closed half with a carved face
  pc.vl(W / 2, 4, H - 7, OUT);
  pc.ellipse(W * 0.72, 12, 3, 4, IRON.top);
  pc.px(W * 0.72 - 1, 11, OUT); pc.px(W * 0.72 + 1, 11, OUT); pc.hl(W * 0.72 - 1, 14, 3, OUT);
  pc.vl(W - 3, 10, H - 14, IRON.hi);
  // hinge bands
  for (const y of [16, H - 10]) pc.hl(W / 2, y, W / 2 - 2, IRON.dk);
  bloodBlob(pc, W / 2 - 2, H - 3, 6, 2, r);
  drip(pc, 6, H - 8, 4);
}

function drawTortureChair(pc, r) {
  const W = pc.w;
  pc.rect(2, 0, W - 4, 13, OUT); pc.rect(3, 1, W - 6, 11, IRON.mid);
  for (let y = 2; y < 12; y += 2) for (let x = 4 + (y % 4 ? 1 : 0); x < W - 4; x += 2) pc.px(x, y, METAL.hi);
  box(pc, 1, 12, W - 2, 6, 4, IRON);
  for (let x = 3; x < W - 3; x += 2) pc.px(x, 13, METAL.hi);
  // leather straps
  pc.hl(1, 15, 3, c(0x3a2c22)); pc.hl(W - 4, 15, 3, c(0x3a2c22));
  pc.rect(2, 18, 2, 6, OUT); pc.rect(W - 4, 18, 2, 6, OUT);
  pc.px(7, 14, BLOOD.main); pc.px(9, 13, BLOOD.dark); drip(pc, 8, 17, 4);
}

function drawDrain(pc) {
  pc.ellipse(6, 6, 5, 4, OUT);
  pc.ellipse(6, 6, 4, 3, IRON.dk);
  for (let x = 3; x < 10; x += 2) pc.vl(x, 3, 7, IRON.hi);
  pc.ellipse(6, 6, 1, 1, BLACK);
  pc.px(0, 3, BLOOD.dark); pc.px(1, 4, BLOOD.dark); pc.px(2, 4, BLOOD.deep);
}

function drawPuddle(pc, r) {
  const W = pc.w, H = pc.h;
  pc.ctx.save();
  pc.ctx.globalAlpha = 0.75;
  pc.ellipse(W / 2, H / 2, W / 2 - 2, H / 2 - 3, c(0x26282a));
  pc.ellipse(W / 2 + 2, H / 2 + 1, W / 4, H / 4, c(0x1c1e20));
  pc.ctx.restore();
  pc.px(W / 2 - 3, H / 2 - 2, c(0x8a9096));
  pc.px(W / 2 - 2, H / 2 - 2, c(0x6a7076));
}

function drawToolsWall(pc, r) {
  const W = pc.w, H = pc.h;
  pc.rect(0, 0, W, H, OUT);
  pc.rect(1, 1, W - 2, H - 2, DWOOD.mid);
  pc.hl(1, 1, W - 2, DWOOD.hi);
  // cleaver
  pc.rect(4, 4, 7, 6, METAL.hi); pc.vl(10, 4, 6, METAL.dk); pc.rect(6, 10, 2, 6, WOOD.dk);
  pc.px(5, 8, BLOOD.main); pc.px(6, 9, BLOOD.dark); drip(pc, 6, 16, 3);
  // saw
  pc.rect(14, 3, 14, 4, METAL.hi); for (let x = 14; x < 28; x += 2) pc.px(x, 7, METAL.dk); pc.rect(28, 3, 4, 5, WOOD.dk);
  pc.px(20, 7, BLOOD.main); pc.px(23, 7, BLOOD.dark);
  // hooks and pliers
  for (const hx of [16, 22]) { pc.vl(hx, 11, 5, METAL.mid); pc.px(hx + 1, 16, METAL.mid); pc.px(hx + 2, 15, METAL.mid); }
  pc.line(35, 4, 37, 15, METAL.mid); pc.line(39, 4, 37, 15, METAL.mid);
  pc.px(37, 15, BLOOD.dark);
}

export const DUNGEON_PROPS = {
  torch: {
    w: 12, h: 25, tw: 1, th: 2, dy: -5, solid: null, frames: 4,
    draw: drawTorch,
    light: { r: 64, a: 0.97, dy: 6, flicker: true },
  },
  wallhole: { w: 16, h: 16, tw: 1, th: 2, layer: 'wall', draw: drawWallHole },
  door_dungeon: { w: 28, h: 32, tw: 2, th: 2, layer: 'wall', draw: drawDungeonDoor },
  exit_bottom: { w: 32, h: 16, tw: 2, th: 1, layer: 'wall', draw: drawExitBottom },
  rack: { w: 46, h: 28, tw: 3, th: 2, draw: drawRack },
  iron_maiden: { w: 26, h: 42, tw: 2, th: 2, solid: [0, 1, 2, 1], draw: drawIronMaiden },
  torture_chair: { w: 16, h: 24, tw: 1, th: 1, draw: drawTortureChair },
  drain: { w: 12, h: 12, tw: 1, th: 1, layer: 'floor', draw: drawDrain },
  puddle: { w: (o) => (o.tw ?? 2) * 16, h: (o) => (o.th ?? 1) * 16, layer: 'floor', draw: drawPuddle },
  tools_wall: { w: 44, h: 20, tw: 3, th: 2, layer: 'wall', draw: drawToolsWall },
};
