import { c, OUT } from './palette.js';
import { DWOOD, WOOD, LWOOD, groundShadow, flame } from './draw.js';

// Attic clutter and the open doorway between rooms.

const WEB = c(0xdedad2);

function drawMirrorRound(pc) {
  const W = pc.w, H = pc.h, cx = W / 2;
  groundShadow(pc, cx, H - 2, 10, 2);
  // stand
  pc.line(cx - 8, H - 2, cx - 3, H - 14, OUT); pc.line(cx + 8, H - 2, cx + 3, H - 14, OUT);
  pc.line(cx - 7, H - 2, cx - 2, H - 14, DWOOD.mid); pc.line(cx + 7, H - 2, cx + 2, H - 14, DWOOD.mid);
  // ornate frame and glass
  pc.ellipse(cx, 16, 13, 15, OUT);
  pc.ellipse(cx, 16, 12, 14, c(0x8a7650));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    pc.px(cx + Math.cos(a) * 12, 16 + Math.sin(a) * 14, c(0xa89060));
  }
  pc.ellipse(cx, 16, 10, 12, c(0x434b55));
  pc.ellipse(cx - 3, 11, 4, 5, c(0x58616c));
  // a dark shape in the reflection that shouldn't be there
  pc.ellipse(cx + 3, 18, 2, 3, c(0x1c1d20));
  pc.rect(cx + 1, 21, 5, 6, c(0x1c1d20));
  // crack
  const cr = c(0xb8c0c7);
  pc.line(cx - 6, 6, cx - 1, 15, cr); pc.line(cx - 1, 15, cx + 6, 12, cr); pc.line(cx - 1, 15, cx - 3, 25, cr);
}

/** dense corner web, bigger and fuller than the small cobweb */
function drawCobwebBig(pc, r, o) {
  const W = pc.w;
  const flip = o.corner === 'tr';
  const ox = flip ? W - 1 : 0, sx = flip ? -1 : 1;
  const size = W - 2;
  pc.ctx.save();
  pc.ctx.globalAlpha = 0.5;
  const spokes = 9;
  for (let i = 0; i <= spokes; i++) {
    const a = (i / spokes) * (Math.PI / 2);
    pc.line(ox, 0, ox + sx * Math.cos(a) * size, Math.sin(a) * size, WEB);
  }
  for (let k = 1; k <= 7; k++) {
    const rr = (size * k) / 7.5;
    let px = ox + sx * rr, py = 0;
    for (let i = 1; i <= spokes; i++) {
      const a = (i / spokes) * (Math.PI / 2);
      const sag = 0.86 + (r() - 0.5) * 0.06;
      const nx = ox + sx * Math.cos(a) * rr * sag, ny = Math.sin(a) * rr * sag;
      pc.line(px, py, nx, ny, WEB);
      px = nx; py = ny;
    }
  }
  // torn strands hanging down, and dust caught in it
  pc.ctx.globalAlpha = 0.35;
  for (let i = 0; i < 4; i++) {
    const x = ox + sx * (4 + r() * size * 0.7);
    pc.line(x, size * 0.3 * r(), x + (r() - 0.5) * 3, size * (0.6 + r() * 0.4), WEB);
  }
  pc.ctx.globalAlpha = 0.6;
  for (let i = 0; i < 10; i++) pc.px(ox + sx * r() * size * 0.7, r() * size * 0.7, c(0x9d988e));
  pc.ctx.restore();
}

/** a web hanging from the rafters, sagging threads with dangling strands */
function drawWebHang(pc, r) {
  const W = pc.w, H = pc.h;
  pc.ctx.save();
  pc.ctx.globalAlpha = 0.4;
  // a few sagging threads, torn in places
  for (let k = 0; k < 3; k++) {
    const y0 = 1 + k * 3, sag = 5 + k * 5 + r() * 3;
    let px = 0, py = y0;
    for (let x = 1; x <= W - 1; x++) {
      const t = x / (W - 1);
      const y = y0 + Math.sin(t * Math.PI) * sag;
      const torn = Math.floor((x + k * 5) / 5) % 4 === 3 && k > 0;
      if (!torn) pc.line(px, py, x, y, WEB);
      px = x; py = y;
    }
  }
  // ragged strands hanging down
  pc.ctx.globalAlpha = 0.32;
  for (let i = 0; i < 5; i++) {
    const x = 3 + r() * (W - 6);
    const len = H * (0.35 + r() * 0.6);
    pc.line(x, 2 + r() * 8, x + (r() - 0.5) * 3, len, WEB);
  }
  pc.ctx.restore();
}

/** an open doorway in a side wall: frame posts at both ends and a dark threshold */
function drawDoorway(pc, r, o) {
  const W = pc.w, H = pc.h;
  // threshold boards
  pc.rect(2, 3, W - 4, H - 6, c(0x2a211a));
  for (let y = 5; y < H - 4; y += 4) pc.hl(2, y, W - 4, c(0x3a2d22));
  // jambs
  for (const y of [0, H - 4]) {
    pc.rect(0, y, W, 4, OUT);
    pc.rect(1, y + 1, W - 2, 2, WOOD.mid);
    pc.hl(1, y + 1, W - 2, WOOD.hi);
  }
  // the door itself, swung open against the far wall
  const fx = o.side === 'R' ? 1 : W - 4;
  pc.rect(fx, 4, 3, H - 8, OUT);
  pc.vl(fx + 1, 5, H - 10, DWOOD.mid);
}

/** the save point: a big open book on a lectern, lit by two candles */
/**
 * The save point: a lectern seen from the side, its high back edge against the right-hand
 * wall and the open book sloping down towards the room. One candle stands at the back.
 */
function drawSaveBook(pc, r, o, f) {
  const W = pc.w, H = pc.h;
  const DESK = 24; // underside of the desk
  const wd = LWOOD; // lighter than the floor so it stands out
  groundShadow(pc, W / 2, H - 2, 8, 2);
  // foot and post
  pc.rect(3, H - 5, W - 6, 4, OUT); pc.rect(4, H - 4, W - 8, 2, wd.mid); pc.hl(4, H - 4, W - 8, wd.hi);
  pc.rect(7, DESK, 6, H - DESK - 4, OUT); pc.rect(8, DESK, 4, H - DESK - 5, wd.dk); pc.vl(8, DESK, H - DESK - 5, wd.mid);
  // the desk: a wedge seen from the side, high against the wall, low towards the room
  const top = (x) => 8 + Math.round(((W - 3 - x) * 5) / (W - 4));
  for (let x = 1; x < W - 1; x++) pc.vl(x, top(x) - 1, DESK - top(x) + 2, OUT);
  for (let x = 2; x < W - 2; x++) {
    const y = top(x);
    pc.vl(x, y, 8, wd.top); // the slanted top
    pc.px(x, y + 8, wd.hi); // its front edge
    pc.vl(x, y + 9, DESK - y - 9, wd.mid); // the side panel
    if (x > 3 && x < W - 4) pc.px(x, DESK - 2, wd.dk); // a carved line along the bottom
  }
  pc.vl(3, top(3) + 10, DESK - top(3) - 12, wd.dk);
  pc.vl(W - 5, top(W - 5) + 10, DESK - top(W - 5) - 12, wd.dk);
  // the open book lying on it: a page at the back, the spine, a page in front
  const page = c(0xddd5c1), shadeP = c(0xb9b09b), ink = c(0x6e675c), cover = c(0x3a2f26);
  for (let x = 2; x < W - 6; x++) {
    const y = top(x);
    pc.vl(x, y, 8, cover);
    if (x === 2) continue;
    pc.vl(x, y + 1, 2, page);
    pc.px(x, y + 3, shadeP); // the spine
    pc.vl(x, y + 4, 2, page);
    pc.px(x, y + 6, shadeP);
    // lines of writing
    if (x > 3 && x < W - 8 && x % 2) {
      if ((x * 7) % 5) pc.px(x, y + 1, ink);
      if ((x * 3) % 4) pc.px(x, y + 5, ink);
    }
  }
  pc.hl(3, top(3) + 1, 2, c(0xf0e9d8));
  // ribbon bookmark hanging over the front edge
  pc.vl(5, top(5) + 7, 6, c(0x4a4440)); pc.px(5, top(5) + 13, OUT);
  // a candle at the back, against the wall
  const cx = W - 5, cy = top(cx) - 5;
  pc.rect(cx - 1, cy, 4, 8, OUT); pc.rect(cx, cy + 1, 2, 7, c(0xd8d1c0)); pc.px(cx, cy + 1, c(0xece6d8));
  pc.px(cx + 2, cy + 3, c(0xd8d1c0)); // a drip of wax
  flame(pc, cx + 1, cy + 1, f);
}

/**
 * What is left of the front door once it is unlocked: the doorway filled edge to edge with
 * a flat sheet of purple light, its streaks flowing and folding into each other like a
 * nether portal, a few sparks rising off it. One of the few saturated colours in the game.
 */
function drawPortal(pc, r, o, f) {
  const W = pc.w, H = pc.h;
  const FRAMES = 8;
  // the stripped door frame, dark stone around the opening
  pc.rect(0, 0, W, H, OUT);
  pc.rect(1, 1, W - 2, H - 1, c(0x1e1a1c));
  pc.vl(1, 1, H - 1, c(0x2e282b)); pc.hl(1, 1, W - 2, c(0x342d31));
  const x0 = 3, y0 = 3, x1 = W - 3, y1 = H;
  if (o.empty) {
    // the portal is gone: just the dark opening where the door used to be
    pc.rect(x0, y0, x1 - x0, y1 - y0, c(0x0c0a0b));
    pc.rect(x0, y0, x1 - x0, 2, c(0x151213));
    return;
  }
  const cols = ['#24073f', '#3d0d6b', '#58169a', '#7425c4', '#9446e6', '#b67dfb', '#dcbcff'];
  const t = (f / FRAMES) * Math.PI * 2;
  // fixed per-pixel grain (the same in every frame, so it doesn't fizz)
  const grain = [];
  for (let i = 0; i < W * H; i++) grain.push(r() - 0.5);
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const u = (x - x0) / (x1 - x0), v = (y - y0) / (y1 - y0);
      // diagonal streaks that wobble and drift with time (warped twice for the folding look)
      const wu = u + Math.sin(v * 7 + t) * 0.09 + Math.sin(v * 13 - t * 2) * 0.03;
      const wv = v + Math.sin(u * 6 - t) * 0.08;
      let s = Math.sin((wu * 2.2 + wv * 1.4) * Math.PI * 2 - t) * 0.6;
      s += Math.sin((wu * -1.6 + wv * 2.6) * Math.PI * 2 + t * 2) * 0.4;
      s += Math.sin((wu + wv) * 9 + t * 3) * 0.15;
      let k = (s + 1.15) * 2.6 + grain[y * W + x] * 0.9;
      // a darker edge where the light meets the frame
      const edge = Math.min(x - x0, x1 - 1 - x, y - y0);
      if (edge === 0) k -= 2;
      else if (edge === 1) k -= 1;
      pc.px(x, y, cols[Math.max(0, Math.min(cols.length - 1, Math.floor(k)))]);
    }
  // sparks rising off the surface, each at its own pace
  for (let i = 0; i < 6; i++) {
    const sx = x0 + 2 + ((i * 7 + 3) % (x1 - x0 - 4));
    const sy = y1 - 2 - (((f + i * 3) * 4) % (y1 - y0 - 2));
    pc.px(sx, sy, i % 2 ? '#efe0ff' : '#c895ff');
  }
}

/** pills spilled on the floor, the empty bottle tipped over beside them */
function drawPills(pc, r) {
  const W = pc.w, H = pc.h;
  const white = c(0xe2dccd), whiteD = c(0xb9b2a2), red = c(0xa8685a), amber = c(0x8a6a48), amberD = c(0x5e4532);
  // the bottle on its side, cap off
  pc.rect(1, H - 7, 7, 5, OUT);
  pc.rect(2, H - 6, 5, 3, amber);
  pc.hl(2, H - 6, 5, c(0xa8865e));
  pc.hl(3, H - 4, 3, amberD);
  pc.rect(8, H - 6, 2, 3, c(0x2a2624)); // open mouth
  pc.rect(12, H - 4, 3, 3, OUT); pc.px(13, H - 3, white); // the cap, rolled away
  // tablets and capsules scattered in front of it
  const spots = [[10, 4], [4, 6], [13, 8], [7, 9], [11, 11], [2, 4], [14, 2]];
  for (const [x, y] of spots) {
    if (r() < 0.45) {
      // capsule: two halves
      pc.px(x, y, white); pc.px(x + 1, y, red); pc.px(x, y + 1, whiteD); pc.px(x + 1, y + 1, OUT);
    } else {
      pc.px(x, y, white); pc.px(x, y + 1, whiteD);
    }
  }
}

export const ATTIC_PROPS = {
  pills: { w: 16, h: 16, tw: 1, th: 1, layer: 'floor', solid: false, draw: drawPills },
  portal: {
    w: 32, h: 32, tw: 2, th: 2, layer: 'wall', frames: (o) => (o.empty ? 1 : 8), steady: true, draw: drawPortal,
    light: (o) => (o.empty ? null : { r: 70, a: 0.95, dy: 10, flicker: true }),
  },
  savebook: {
    w: 20, h: 32, tw: 1, th: 1, frames: 3, draw: drawSaveBook,
    light: { r: 46, a: 0.95, dx: 5, dy: -20, flicker: true },
  },
  mirror_round: { w: 30, h: 44, tw: 2, th: 1, draw: drawMirrorRound },
  cobweb_big: { w: 32, h: 32, tw: 2, th: 2, layer: 'wall', draw: drawCobwebBig },
  web: { w: 26, h: 34, tw: 2, th: 1, solid: null, dy: -18, draw: drawWebHang },
  doorway: { w: 16, h: 32, tw: 1, th: 2, layer: 'floor', draw: drawDoorway },
};
