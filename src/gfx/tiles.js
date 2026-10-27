import { PC, hash, hash01 } from './pixel.js';
import { mute, shade } from './palette.js';
import { TILE } from '../config.js';

// Tile legend used by the map files:
//   ' ' void (pure black)        '#' ceiling / top of a wall
//   'W' wall face (wallpaper)     'L' / 'R' hallway side walls (left / right)
//   '.' floor (room theme)        'x' broken floorboards (walkable)
//   'o' hole in the floor         'S' stairs going up     'D' stairs going down

const m = (hex, f = 1) => mute(f === 1 ? hex : shade(hex, f));

const FLOORS = {
  wood: { hi: m(0x93714f), base: m(0x7a5c40), light: m(0x86664a), mid: m(0x6a4f37), seam: m(0x2f2219), grain: m(0x5e4531), nail: m(0x9a958a) },
  darkwood: { hi: m(0x6f5643), base: m(0x574334), light: m(0x624c3b), mid: m(0x4a392c), seam: m(0x1d1511), grain: m(0x443428), nail: m(0x7d7a72) },
  attic: { hi: m(0x5b4a3b), base: m(0x46392d), light: m(0x4f4033), mid: m(0x3b3026), seam: m(0x19130f), grain: m(0x382c22), nail: m(0x6a665f) },
  deck: { hi: m(0x9c9384), base: m(0x7f7669), light: m(0x898073), mid: m(0x6d655a), seam: m(0x2c2823), grain: m(0x655d52), nail: m(0x9a958a) },
};

const DARK = m(0x171413);
const RIM = m(0x5c5048);
const RIM2 = m(0x332b26);
const HOLE = 0x060505;

/* ---------------- floors ---------------- */

function woodPx(P, gx, gy, seed) {
  const row = gy >> 2, r = gy & 3;
  if (r === 3) return P.seam;
  const u = gx + (hash(row, 11, seed) % 48);
  const seg = Math.floor(u / 48), ux = u % 48;
  if (ux === 0) return P.seam;
  const t = hash(seg, row, seed) % 5;
  let col = [P.base, P.base, P.light, P.mid, P.base][t];
  if (r === 0 && t !== 3) col = t === 2 ? P.hi : P.light;
  if ((ux === 2 || ux === 45) && r === 1) return P.nail;
  if (hash(gx, gy, seed + 3) % 19 === 0) col = P.grain;
  if (hash(seg, row, seed + 9) % 7 === 0 && ux > 18 && ux < 22 && r === 1) col = P.seam;
  // worn / dirty patches
  if (hash01(gx >> 3, gy >> 3, seed + 7) < 0.18 && hash(gx, gy, seed) % 3 === 0) col = P.mid;
  return col;
}

const CHECK = { a: m(0x928c80), b: m(0x4a4642), grime: m(0x726c62), crack: m(0x2a2724) };
function checkerPx(gx, gy, seed) {
  const cell = ((gx >> 3) + (gy >> 3)) & 1;
  let col = cell ? CHECK.a : CHECK.b;
  const cx = gx >> 3, cy = gy >> 3;
  if (cell && hash01(gx >> 2, gy >> 2, seed) < 0.25 && hash(gx, gy) % 3 === 0) col = CHECK.grime;
  if (hash(cx, cy, seed + 1) % 23 === 0) {
    const lx = gx & 7, ly = gy & 7;
    if (lx === ly && lx < 6) col = CHECK.crack;
  }
  return col;
}

const BTILE = { a: m(0x8f918b), b: m(0x878983), hi: m(0x9a9c96), grout: m(0x5d5f5a), dirt: m(0x716f66), crack: m(0x3a3936) };
function bathTilePx(gx, gy, seed) {
  const lx = gx & 7, ly = gy & 7;
  if (lx === 7 || ly === 7) return BTILE.grout;
  const tx = gx >> 3, ty = gy >> 3;
  const h = hash(tx, ty, seed);
  let col = h % 2 ? BTILE.a : BTILE.b;
  if (lx === 0 || ly === 0) col = BTILE.hi;
  if (hash01(gx >> 4, gy >> 4, seed + 2) < 0.3 && hash(gx, gy, seed) % 3 === 0) col = BTILE.dirt;
  // the odd cracked tile
  if (h % 17 === 0 && ((lx === ly && lx < 5) || (lx === 4 && ly >= 4))) col = BTILE.crack;
  return col;
}

const CONC = { base: m(0x6b6761), light: m(0x7a766f), dark: m(0x56524d), crack: m(0x2c2a27), oil: m(0x3a3733) };
function concretePx(gx, gy, seed) {
  const h = hash(gx, gy, seed);
  let col = h % 7 === 0 ? CONC.light : h % 5 === 0 ? CONC.dark : CONC.base;
  // stains: round blotches with ragged edges, scattered one per few 32px cells
  const cx0 = gx >> 5, cy0 = gy >> 5;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const h = hash(cx0 + i, cy0 + j, seed + 4);
      if (h % 3) continue;
      const sx = (cx0 + i) * 32 + (h % 32), sy = (cy0 + j) * 32 + ((h >> 6) % 32);
      const rad = 3 + ((h >> 12) % 7);
      const d = Math.hypot((gx - sx) * 0.8, gy - sy) + hash01(gx, gy, seed + 5) * 2.5;
      if (d < rad) col = CONC.oil;
    }
  // long seams every 64px
  if (gx % 64 === 0 || gy % 64 === 0) col = CONC.dark;
  return col;
}

// dungeon flagstones: big, irregular slabs, darker than the walls
const FLAG = { tones: [m(0x4a4743), m(0x423f3b), m(0x504c47), m(0x3b3935)], mortar: m(0x1c1b19), wet: m(0x2c2e31), shine: m(0x80868c), crack: m(0x1a1918) };
function stonePx(gx, gy, seed) {
  const r = Math.floor(gy / 12), ly = gy % 12;
  const off = hash(r, 7, seed) % 20;
  const w = 14 + (hash(r, 8, seed) % 6);
  const sx = Math.floor((gx + off) / w), lx = (gx + off) % w;
  if (lx === 0 || ly === 0) return FLAG.mortar;
  const h = hash(sx, r, seed + 81);
  let col = FLAG.tones[h % 4];
  if (ly === 1 || lx === 1) col = shade(col, 1.15);
  if (ly === 11) col = shade(col, 0.8);
  if (hash(gx, gy, seed + 83) % 9 === 0) col = shade(col, 0.88);
  if (h % 7 === 0 && Math.abs(lx - ly - 1) < 1) col = FLAG.crack;
  if (hash01(gx >> 3, gy >> 3, seed + 82) < 0.07) col = hash(gx, gy) % 23 === 0 ? FLAG.shine : FLAG.wet;
  return col;
}

// backyard ground
const GRASS = { base: m(0x55603f), dark: m(0x47512f), dry: m(0x6b6445), tuft: m(0x6f7a50), shadow: m(0x3a4128), pebble: m(0x8a877c) };
function grassPx(gx, gy, seed) {
  const n = hash01(gx >> 2, gy >> 2, seed + 62);
  let col = n < 0.3 ? GRASS.dark : n > 0.78 ? GRASS.dry : GRASS.base;
  const h = hash(gx, gy, seed + 61);
  if (h % 7 === 0) col = GRASS.tuft;
  else if (h % 7 === 1) col = GRASS.shadow;
  if (h % 131 === 0) col = GRASS.pebble;
  return col;
}
const PATH = { base: m(0x6d5c48), light: m(0x7d6b55), dark: m(0x5a4b3a), pebble: m(0x8f887b) };
function pathPx(gx, gy, seed) {
  const h = hash(gx, gy, seed + 63);
  if (h % 41 === 0) return PATH.pebble;
  return h % 5 === 0 ? PATH.light : h % 4 === 0 ? PATH.dark : PATH.base;
}
const SOILC = { ridge: m(0x5c4a39), furrow: m(0x3e3128), clump: m(0x6e5a46), weed: m(0x56583e) };
function soilPx(gx, gy, seed) {
  const h = hash(gx, gy, seed + 64);
  let col = gy % 8 < 4 ? SOILC.ridge : SOILC.furrow;
  if (gy % 8 === 0) col = shade(SOILC.ridge, 1.12);
  if (h % 13 === 0) col = SOILC.clump;
  if (h % 97 === 0) col = SOILC.weed;
  return col;
}

function floorPx(theme, gx, gy, seed) {
  switch (theme) {
    case 'checker': return checkerPx(gx, gy, seed);
    case 'bathtile': return bathTilePx(gx, gy, seed);
    case 'concrete': return concretePx(gx, gy, seed);
    case 'stone': return stonePx(gx, gy, seed);
    default: return woodPx(FLOORS[theme] || FLOORS.wood, gx, gy, seed);
  }
}

/* ---------------- walls ---------------- */

const WALLS = {
  stripe: { base: m(0x6f6a55), alt: m(0x5b5747), line: m(0x807a63) },
  damask: { base: m(0x5d4f4e), motif: m(0x77665f), hi: m(0x8c7a70), lo: m(0x463a3a) },
  kitchen: { base: m(0x79745f), check: m(0x6a6553), tile: m(0x9d9b91), grout: m(0x77756c) },
  tilewall: { plaster: m(0x8b887f), tile: m(0xa6a9a3), tile2: m(0x9a9d97), grout: m(0x787b76), rail: m(0x5f625d) },
  plaster: { base: m(0x847d72), light: m(0x918a7f), lath: m(0x5c4e43), lath2: m(0x463a31) },
  planks: { a: m(0x5f4939), b: m(0x54402f), seam: m(0x2b2018), nail: m(0x8f8a80) },
  occult: { base: m(0x3c3436), alt: m(0x443b3d), scratch: m(0x5a5052) },
  attic: { board: m(0x463a30), board2: m(0x3d3229), seam: m(0x1c1612), beam: m(0x2d241d), beamHi: m(0x40342a) },
  stone: { tones: [m(0x5d5952), m(0x55514b), m(0x67625a), m(0x4e4a45)], mortar: m(0x262421), moss: m(0x4a5040) },
  concrete: { base: m(0x6f6d68), line: m(0x5f5d59), hole: m(0x3a3936), light: m(0x7a7873) },
  siding: { board: m(0x95928a), board2: m(0x8b8880), hi: m(0xa6a39a), lo: m(0x5c5a54), bare: m(0x6e5f4e), found: m(0x5e5b55), mortar: m(0x34322f) },
};
// styles that have no crown molding / skirting board
const NO_TRIM = new Set(['planks', 'attic', 'stone', 'concrete', 'siding']);

function wallPx(style, gx, gy, ly, isTop, isBottom, seed) {
  const W = WALLS[style] || WALLS.stripe;
  let col;
  switch (style) {
    case 'damask': {
      const oy = (Math.floor(gy / 12) & 1) * 5;
      const lx = (gx + oy) % 10, my = gy % 12;
      const d = Math.abs(lx - 5) + Math.abs(my - 6);
      col = d < 3 ? W.motif : d === 3 ? W.lo : W.base;
      if (d === 0) col = W.hi;
      break;
    }
    case 'kitchen': {
      if (isBottom && ly >= 4) {
        col = (gx & 3) === 3 || (ly & 3) === 3 ? W.grout : W.tile;
      } else col = ((gx >> 1) + (gy >> 1)) % 3 === 0 && (gx & 1) ? W.check : W.base;
      break;
    }
    case 'tilewall': {
      if (isBottom || !isTop) {
        col = (gx & 3) === 3 || (gy & 3) === 3 ? W.grout : hash(gx >> 2, gy >> 2) % 3 ? W.tile : W.tile2;
      } else col = ly >= 14 ? W.rail : W.plaster;
      break;
    }
    case 'plaster': {
      col = hash01(gx >> 2, gy >> 2, seed) < 0.3 ? W.light : W.base;
      // patches where plaster fell off, showing the lath
      if (hash01(gx >> 3, gy >> 3, seed + 5) < 0.14) col = gy % 3 === 0 ? W.lath2 : W.lath;
      break;
    }
    case 'planks': {
      const p = Math.floor(gx / 6), lx = gx % 6;
      col = lx === 0 ? W.seam : p & 1 ? W.a : W.b;
      if ((lx === 3 && (ly === 3 || ly === 12)) && isTop) col = W.nail;
      break;
    }
    case 'occult': {
      col = gx % 6 < 2 ? W.alt : W.base;
      if (hash(gx, gy, seed) % 41 === 0) col = W.scratch;
      break;
    }
    case 'attic': {
      const b = Math.floor(gy / 5);
      col = gy % 5 === 4 ? W.seam : (b + (hash(Math.floor((gx + b * 13) / 30), b) & 1)) & 1 ? W.board : W.board2;
      const bx = gx % 64;
      if (bx >= 30 && bx < 36) col = bx === 30 ? W.beamHi : W.beam;
      return col;
    }
    case 'stone': {
      const b = Math.floor(gy / 6), ly2 = gy % 6;
      const off = (b & 1) * 6;
      const bx = Math.floor((gx + off) / 12), lx2 = (gx + off) % 12;
      if (lx2 === 0 || ly2 === 0) col = W.mortar;
      else {
        col = W.tones[hash(bx, b, seed + 91) % 4];
        if (ly2 === 1) col = shade(col, 1.15);
        if (ly2 === 5) col = shade(col, 0.82);
        if (isBottom && ly >= 10 && hash01(gx >> 2, gy >> 1, seed + 92) < 0.35) col = W.moss;
      }
      if (isTop && ly < 2) col = shade(col, 0.6);
      break;
    }
    case 'concrete': {
      col = gy % 8 === 0 ? W.line : hash(gx, gy, seed) % 9 === 0 ? W.light : W.base;
      if (gx % 24 === 6 && gy % 16 === 4) col = W.hole;
      if (isBottom && ly >= 13) col = shade(col, 0.7);
      break;
    }
    case 'siding': {
      const b = Math.floor(gy / 5), ly2 = gy % 5;
      col = hash(b, Math.floor(gx / 40), seed) % 2 ? W.board : W.board2;
      if (ly2 === 0) col = W.hi;
      if (ly2 === 4) col = W.lo;
      if (hash01(gx >> 3, b, seed + 93) < 0.16 && ly2 > 0 && ly2 < 4) col = W.bare; // peeling paint
      if (isTop && ly < 3) col = ly === 2 ? m(0x3a3631) : m(0x1c1a17);
      if (isBottom && ly >= 11) {
        const fb = Math.floor((gx + (gy % 2) * 4) / 8);
        col = ly === 11 || gx % 8 === 0 ? W.mortar : hash(fb, gy >> 1) % 2 ? W.found : shade(W.found, 0.9);
      }
      break;
    }
    default: {
      const s = gx % 8;
      col = s < 3 ? W.alt : s === 5 ? W.line : W.base;
      if (s === 6 && gy % 6 === 2) col = W.line;
    }
  }
  // crown molding and baseboard
  if (isTop && !NO_TRIM.has(style)) {
    if (ly === 0) return m(0x2a1f17);
    if (ly === 1) return m(0x5b4433);
    if (ly === 2) return m(0x3c2c21);
  }
  if (isBottom && !NO_TRIM.has(style) || (isBottom && style === 'planks')) {
    if (ly === 12) return m(0x6b5240);
    if (ly >= 13) return ly === 15 ? m(0x281d16) : m(0x45342a);
    // grime collecting near the floor
    if (ly >= 9 && hash(gx, gy, seed + 1) % (14 - ly) === 0) return shade(col, 0.75);
  }
  // water stains running down
  const sx = Math.floor(gx / 16);
  const sh = hash(sx, 5, seed + 13);
  if (sh % 4 === 0) {
    const cx = sx * 16 + (sh % 13) + 1;
    const len = 6 + (sh % 17);
    const top = (sh >> 5) % 6;
    const yy = gy % 32;
    if (yy >= top && yy < top + len && Math.abs(gx - cx) <= (yy - top < len - 4 ? 1 : 0)) return shade(col, 0.8);
  }
  return col;
}

/* ---------------- fence ---------------- */

const FENCE = { lit: m(0x9a9282), mid: m(0x857d6f), dk: m(0x6a6358), top: m(0xa8a090), rail: m(0x5e564b) };
const fenceish = (ch) => ch === 'f' || ch === 'q';

function fencePx(ch, at, tx, ty, lx, ly, gx, gy, seed) {
  let col = grassPx(gx, gy, seed);
  const horiz = fenceish(at(tx - 1, ty)) || fenceish(at(tx + 1, ty));
  const vert = fenceish(at(tx, ty - 1)) || fenceish(at(tx, ty + 1)) || at(tx, ty - 1) === 'W';
  if (ch === 'q') {
    // collapsed section: boards lying in the grass and a snapped post
    const h = hash(tx, ty, seed + 75);
    if (Math.abs(lx - ly * 0.5 - (3 + (h % 4))) < 1 && ly > 3) col = FENCE.mid;
    if (Math.abs(ly - (10 + (h % 3))) < 1 && lx > 1 && lx < 13) col = FENCE.dk;
    if (lx >= 6 && lx <= 9 && ly >= 6 && ly <= 9) col = ly === 6 ? FENCE.top : FENCE.dk;
    return col;
  }
  if (horiz && vert) {
    // corner post
    if (lx >= 5 && lx <= 10 && ly >= 3 && ly <= 13) col = ly < 5 ? FENCE.top : lx === 5 ? FENCE.lit : FENCE.dk;
    return col;
  }
  if (horiz) {
    const pi = Math.floor(gx / 4), px = gx % 4;
    const h = hash(pi, ty, seed + 71);
    const missing = h % 6 === 0, broken = h % 6 === 1;
    const top = broken ? 7 + ((h >> 4) % 3) : 2;
    const rail = ly === 6 || ly === 7 || ly === 11 || ly === 12;
    const railGone = hash(Math.floor(gx / 16), ty, seed + 72) % 5 === 0 && ly < 9;
    if (!missing && px < 3 && ly >= top && ly <= 14 && !(ly === top && px !== 1 && !broken)) {
      col = ly === top ? FENCE.top : [FENCE.lit, FENCE.mid, FENCE.dk][px];
    } else if (rail && !railGone) col = FENCE.rail;
    if (ly === 15) col = shade(col, 0.6);
    return col;
  }
  // a side fence, seen from above: posts, a rail, pickets edge-on
  const segGone = hash(ty, Math.floor(gy / 4), seed + 73) % 5 === 0;
  if (lx >= 6 && lx <= 9 && !segGone && gy % 4 !== 3) col = lx === 6 ? FENCE.lit : FENCE.mid;
  if (lx >= 7 && lx <= 8 && !segGone) col = FENCE.rail;
  if (lx >= 5 && lx <= 10 && ly <= 3) col = ly < 2 ? FENCE.top : FENCE.dk;
  if (lx === 10 || lx === 11) col = shade(col, 0.6);
  return col;
}

/* ---------------- builder ---------------- */

const SOLID_TILES = new Set([' ', '#', 'W', 'L', 'R', 'o', 'F', 'f', 'q']);
/** tiles you can only step on and off vertically (stairs with railings / side stringers) */
export const STAIR_TILES = new Set(['S', 'D', 'P']);
export const isSolidTile = (ch) => SOLID_TILES.has(ch);

export function renderMapBase(map) {
  const H = map.tiles.length, Wd = map.tiles[0].length;
  const at = (x, y) => (y < 0 || x < 0 || y >= H || x >= Wd ? ' ' : map.tiles[y][x]);
  const pw = Wd * TILE, ph = H * TILE;
  const pc = new PC(pw, ph);
  const img = pc.ctx.createImageData(pw, ph);
  const d = img.data;
  const seed = hash(map.id.length * 31, map.id.charCodeAt(0));
  const theme = map.theme || {};
  const floorTheme = theme.floor || 'wood';
  const wallStyle = theme.wall || 'stripe';
  const woodP = FLOORS[floorTheme] || FLOORS.wood;

  const put = (x, y, hex) => {
    const i = (y * pw + x) * 4;
    d[i] = (hex >> 16) & 255; d[i + 1] = (hex >> 8) & 255; d[i + 2] = hex & 255; d[i + 3] = 255;
  };

  const isWallish = (ch) => ch === 'W' || ch === 'L' || ch === 'R';
  const isCeilOrVoid = (ch) => ch === '#' || ch === ' ';

  // stairs extents per column
  const stairSpan = (x, y, ch) => {
    let t = y, b = y;
    while (at(x, t - 1) === ch) t--;
    while (at(x, b + 1) === ch) b++;
    return [t, b];
  };

  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < Wd; tx++) {
      const ch = at(tx, ty);
      const x0 = tx * TILE, y0 = ty * TILE;
      for (let ly = 0; ly < TILE; ly++) {
        for (let lx = 0; lx < TILE; lx++) {
          const gx = x0 + lx, gy = y0 + ly;
          let col = 0;
          switch (ch) {
            case ' ': col = 0; break;
            case '#': {
              col = DARK;
              const n = !isCeilOrVoid(at(tx, ty - 1)), s = !isCeilOrVoid(at(tx, ty + 1));
              const w = !isCeilOrVoid(at(tx - 1, ty)), e = !isCeilOrVoid(at(tx + 1, ty));
              const dist = Math.min(n ? ly : 99, s ? 15 - ly : 99, w ? lx : 99, e ? 15 - lx : 99);
              if (dist === 0) col = RIM;
              else if (dist === 1) col = RIM2;
              // inner corners
              const corner = (dx, dy, cx, cy) =>
                !isCeilOrVoid(at(tx + dx, ty + dy)) && lx === cx && ly === cy;
              if (corner(-1, -1, 0, 0) || corner(1, -1, 15, 0) || corner(-1, 1, 0, 15) || corner(1, 1, 15, 15)) col = RIM;
              break;
            }
            case 'W': {
              col = wallPx(wallStyle, gx, gy, ly, !isWallish(at(tx, ty - 1)), !isWallish(at(tx, ty + 1)), seed);
              break;
            }
            case 'L':
            case 'R': {
              const fx = ch === 'L' ? lx : 15 - lx; // distance from the outer edge
              if (fx < 3) col = DARK;
              else if (fx === 3) col = RIM;
              else if (fx >= 14) col = fx === 14 ? m(0x6b5240) : m(0x3a2b21);
              else col = shade(wallPx(wallStyle, gx, gy, ly, false, false, seed), 0.78 + (fx - 4) * 0.012);
              break;
            }
            case 'S': {
              const [t, b] = stairSpan(tx, ty, 'S');
              const f = 0.12 + 0.88 * Math.pow((gy - t * TILE) / ((b + 1 - t) * TILE), 1.4);
              const step = gy % 5;
              const right = at(tx + 1, ty) !== 'S';
              const left = at(tx - 1, ty) !== 'S';
              const sx = (left ? lx : lx + 16); // x within a two-wide stair
              let base = [0x8b6c52, 0x6e5440, 0x4f3b2c, 0x4f3b2c, 0x2d2118][step];
              if (sx >= 6 && sx <= 25) base = [0x8a8366, 0x55584d, 0x45473f, 0x45473f, 0x26271f][step];
              if (left && lx < 2) base = 0x3b2c20;
              if (right && lx >= 12) {
                base = lx === 12 ? 0x1f1711 : lx === 13 ? (gy % 4 === 0 ? 0x6e5440 : 0x2a1f17) : lx === 14 ? 0x6b5240 : 0x2a1f17;
              }
              col = m(base, f);
              break;
            }
            case 'D': {
              const [t, b] = stairSpan(tx, ty, 'D');
              const f = 1 - 0.85 * ((gy - t * TILE) / ((b + 1 - t) * TILE));
              const step = gy % 5;
              let base = [0x8b6c52, 0x6e5440, 0x66503d, 0x5e4938, 0x1a130e][step];
              const left = at(tx - 1, ty) !== 'D', right = at(tx + 1, ty) !== 'D';
              const bottom = at(tx, ty + 1) !== 'D';
              let lit = f;
              if ((left && lx <= 2) || (right && lx >= 13)) {
                base = (left ? lx : 15 - lx) === 1 ? 0x6b5240 : 0x2a1f17;
                lit = 1;
              }
              if (bottom && ly >= 9) {
                lit = 1;
                if (ly === 9) base = 0x7a5d45;
                else if (ly === 10) base = 0x3a2b21;
                else base = gx % 4 === 0 ? 0x5c4635 : 0x0d0a08;
              }
              col = m(base, lit);
              break;
            }
            case 'x': {
              col = floorPx(floorTheme, gx, gy, seed);
              const row = gy >> 2, r = gy & 3;
              const h = hash(row, tx, seed + 21);
              if (h % 100 < 45 && r !== 3) {
                const a = h % 8, len = 4 + ((h >> 8) % 7);
                if (lx >= a && lx < a + len) col = r === 0 ? m(0x1a130e) : HOLE;
                else if (lx === a - 1 || lx === a + len) col = woodP.hi;
              }
              break;
            }
            case 'g':
              col = grassPx(gx, gy, seed);
              break;
            case ',': {
              col = pathPx(gx, gy, seed);
              // ragged edge where the path meets the grass
              const edge = (dx, dy, dist) => at(tx + dx, ty + dy) === 'g' && dist < 3 && hash(gx, gy, seed + 65) % (dist + 2) === 0;
              if (edge(-1, 0, lx) || edge(1, 0, 15 - lx) || edge(0, -1, ly) || edge(0, 1, 15 - ly)) col = grassPx(gx, gy, seed);
              break;
            }
            case 's':
              col = soilPx(gx, gy, seed);
              break;
            case 'p':
              col = woodPx(FLOORS.deck, gx, gy, seed);
              break;
            case 'F': {
              // front of the raised porch: an edge board over a lattice skirt
              if (ly < 3) col = m(ly === 0 ? 0x9c9384 : ly === 1 ? 0x7f7669 : 0x4e483f);
              else if (ly === 15) col = m(0x1c1915);
              else col = (lx + ly) % 6 === 0 || (lx - ly + 60) % 6 === 0 ? m(0x6e665a) : m(0x15120f);
              if ((at(tx - 1, ty) !== 'F' && lx < 2) || (at(tx + 1, ty) !== 'F' && lx > 13)) col = m(lx === 0 || lx === 15 ? 0x3a352e : 0x6e665a);
              break;
            }
            case 'P': {
              // wooden steps down from the porch
              col = m([0x9a907f, 0x857c6e, 0x7c7366, 0x5a5246, 0x3a352e][gy % 5]);
              if ((at(tx - 1, ty) !== 'P' && lx < 2) || (at(tx + 1, ty) !== 'P' && lx > 13)) col = m(lx === 0 || lx === 15 ? 0x2c2823 : 0x5a5246);
              break;
            }
            case 'f':
            case 'q':
              col = fencePx(ch, at, tx, ty, lx, ly, gx, gy, seed);
              break;
            default:
              col = floorPx(floorTheme, gx, gy, seed);
          }
          put(gx, gy, col);
        }
      }
    }
  }

  // holes: broken floorboards. Every 4px plank row snaps off at its own length, so the
  // edge is ragged plank by plank. Below: darkness, the cut thickness of the floor, joists.
  const holeMask = new Uint8Array(pw * ph);
  const floorLike = (ch) => ch !== 'o' && !isCeilOrVoid(ch) && !isWallish(ch);
  let anyHole = false;
  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < Wd; tx++) {
      if (at(tx, ty) !== 'o') continue;
      const fN = floorLike(at(tx, ty - 1)), fS = floorLike(at(tx, ty + 1));
      const fW = floorLike(at(tx - 1, ty)), fE = floorLike(at(tx + 1, ty));
      for (let p = 0; p < 4; p++) {
        const row = ty * 4 + p;
        const left = fW ? 2 + (hash(row, tx, seed + 31) % 8) : 0;
        const right = fE ? 2 + (hash(row, tx + 1, seed + 31) % 8) : 0;
        for (let lx = 0; lx < TILE; lx++) {
          const gx = tx * TILE + lx;
          let keep = lx < left || TILE - 1 - lx < right;
          // planks running along the north / south edge are only partly broken away
          if (!keep && fN && p === 0) keep = hash(Math.floor((gx + row * 3) / 6), row, seed + 47) % 3 !== 0;
          if (!keep && fS && p === 3) keep = hash(Math.floor((gx + row * 5) / 7), row, seed + 53) % 3 === 0;
          if (keep) continue;
          for (let r = 0; r < 4; r++) holeMask[(row * 4 + r) * pw + gx] = 1;
          anyHole = true;
        }
      }
    }
  }

  if (anyHole) {
    const isHole = (x, y) => x >= 0 && y >= 0 && x < pw && y < ph && holeMask[y * pw + x] === 1;
    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        const i = (y * pw + x) * 4;
        if (isHole(x, y)) {
          let col = HOLE;
          const jx = x % 48;
          if (jx >= 20 && jx < 24) col = jx === 20 ? m(0x2a221b) : m(0x17120e);
          // the cut side of the floor under the edge above
          if (!isHole(x, y - 1)) col = m(0x4a3829);
          else if (!isHole(x, y - 2)) col = m(0x2f231a);
          else if (!isHole(x, y - 3)) col = m(0x1c150f);
          put(x, y, col);
        } else if (isHole(x - 1, y) || isHole(x + 1, y)) {
          // splintered end of a broken plank
          if ((y & 3) !== 3) put(x, y, woodP.hi);
          else put(x, y, m(0x140f0b));
        } else if (isHole(x, y + 1) || isHole(x, y - 1)) {
          d[i] *= 0.55; d[i + 1] *= 0.55; d[i + 2] *= 0.55;
        }
      }
    }
  }

  pc.ctx.putImageData(img, 0, 0);
  return pc;
}
