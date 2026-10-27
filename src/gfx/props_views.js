import { PC } from './pixel.js';
import { c, OUT, BLOOD } from './palette.js';
import { WOOD, DWOOD, LWOOD, METAL, DUST } from './draw.js';

// Furniture can be placed against the back wall (its normal, front-facing sprite), a side
// wall, or the bottom wall. Side and bottom views are generated from a simple box:
//   L  length along the wall (px)    D  depth away from the wall    H  height
// Against the LEFT wall we see the top and the end facing the camera, plus a thin strip
// of the front (doors, book spines...) facing into the room. The RIGHT wall is the mirror.
// Against the BOTTOM wall we look at the top and the plain back panel.

export const WALLS = ['back', 'right', 'bottom', 'left']; // R in the editor turns through these

const BOOK_COLS = [0x6b3f33, 0x3e5a48, 0x4a4f6a, 0x7a6a48, 0x5e4a5c, 0x8a8170, 0x3f3a35, 0x6a5a3a];
const COUNTER_TOP = { hi: c(0xa7a39a), top: c(0x8d8981), mid: c(0x6d6a63), dk: c(0x5d5a54), deep: c(0x3d3b37) };
const FRIDGE = { hi: c(0xc4c0b5), top: c(0xaaa69b), mid: c(0x9a968b), dk: c(0x77736a), deep: c(0x55524b) };

export const VIEWS = {
  bookshelf: { L: 32, D: 12, H: 38, P: (o) => (o.dark ? DWOOD : WOOD), front: 'books' },
  wardrobe: { L: 30, D: 14, H: 42, P: (o) => (o.dark ? DWOOD : WOOD), front: 'doors' },
  dresser: { L: 30, D: 12, H: 20, P: (o) => (o.dark ? DWOOD : WOOD), front: 'drawers' },
  shelf_metal: { L: 30, D: 12, H: 34, P: () => METAL, front: 'open' },
  nightstand: { L: 14, D: 12, H: 14, P: () => WOOD, front: 'drawers' },
  sidetable: { L: 14, D: 10, H: 11, P: () => WOOD, front: 'legs' },
  counter: { L: 16, D: 14, H: 17, P: () => WOOD, top: COUNTER_TOP, front: 'doors' },
  fridge: { L: 16, D: 14, H: 30, P: () => FRIDGE, front: 'handle' },
  piano: { L: 32, D: 12, H: 28, P: () => DWOOD, front: 'keys' },
  workbench: { L: 62, D: 14, H: 16, P: () => LWOOD, front: 'legs' },
  toolbox: { L: 14, D: 9, H: 8, P: () => ({ hi: c(0x8a5045), top: c(0x6e3b30), mid: c(0x592f27), dk: c(0x3f211c), deep: c(0x2a1612) }), front: 'plain' },
  trunk: { L: 26, D: 14, H: 14, P: () => DWOOD, front: 'plain' },
  tv: { L: 18, D: 14, H: 20, P: () => ({ hi: c(0x7a7468), top: c(0x666055), mid: c(0x524d44), dk: c(0x3a3630), deep: c(0x24211d) }), front: 'screen' },
};

export const hasViews = (t) => !!VIEWS[t];

/** size and footprint of a prop shown against a given wall */
export function viewInfo(t, wall) {
  const v = VIEWS[t];
  const tilesL = Math.max(1, Math.round(v.L / 16));
  if (wall === 'left' || wall === 'right') return { tw: 1, th: tilesL, w: v.D + 3, h: v.L + v.H };
  return { tw: tilesL, th: 1, w: v.L, h: v.D + v.H };
}

export function drawView(pc, r, o) {
  const v = VIEWS[o.t];
  const P = v.P(o);
  if (o.wall === 'bottom') return drawBack(pc, r, o, v, P);
  // draw facing right (against the left wall), mirror for the right wall
  const g = new PC(pc.w, pc.h);
  drawSide(g, r, o, v, P);
  pc.draw(o.wall === 'right' ? g.flipped() : g, 0, 0);
}

function drawSide(pc, r, o, v, P) {
  const { L, D, H } = v;
  const T = v.top || P;
  const h = L + H;
  // silhouette
  pc.rect(0, 0, D, h, OUT);
  // top
  pc.rect(1, 1, D - 2, L - 1, T.top);
  pc.vl(1, 1, L - 1, T.hi);
  pc.hl(1, 1, D - 2, T.hi);
  pc.speckle(1, 1, D - 2, L - 2, DUST, 0.06, r);
  // end panel facing the camera
  pc.rect(1, L, D - 2, H - 1, P.mid);
  pc.hl(1, L, D - 2, P.dk);
  if (H > 12) pc.frame(3, L + 3, D - 6, H - 7, P.dk);
  pc.hl(1, h - 2, D - 2, P.deep ?? P.dk);
  // thin strip of the front, facing into the room
  const fx = D, fy = 1, fh = h - 2;
  pc.rect(fx, 0, 3, h, OUT);
  pc.rect(fx, fy, 2, fh, P.dk);
  frontDetail(pc, r, v, P, fx, fy, fh, L);
  if (o.blood) {
    pc.px(4, L + 4, BLOOD.dark); pc.px(5, L + 5, BLOOD.main); pc.vl(5, L + 6, 4, BLOOD.dark);
  }
}

function frontDetail(pc, r, v, P, x, y, h, L) {
  switch (v.front) {
    case 'books': {
      // shelves with book spines poking out
      for (let yy = y + 2; yy < y + h - 2; yy++) {
        if ((yy - y) % 11 === 0) { pc.rect(x, yy, 2, 1, P.hi); continue; }
        if (r() < 0.85) pc.px(x, yy, c(BOOK_COLS[Math.floor(r() * BOOK_COLS.length)]));
        if (r() < 0.6) pc.px(x + 1, yy, c(BOOK_COLS[Math.floor(r() * BOOK_COLS.length)], 0.7));
      }
      break;
    }
    case 'doors':
      pc.vl(x + 1, y + 2, h - 4, P.mid);
      pc.px(x + 1, y + Math.floor(h * 0.45), c(0xb09a6a));
      pc.px(x + 1, y + Math.floor(h * 0.45) + 2, c(0xb09a6a));
      break;
    case 'drawers':
      for (let yy = y + 3; yy < y + h - 2; yy += 5) { pc.px(x, yy, P.mid); pc.px(x + 1, yy + 2, c(0xb09a6a)); }
      break;
    case 'open':
      for (let yy = y + 2; yy < y + h - 2; yy++) {
        if ((yy - y) % 11 === 0) pc.rect(x, yy, 2, 1, METAL.hi);
        else if (r() < 0.5) pc.px(x, yy, r() < 0.5 ? c(0x6e7a70) : c(0x8a7458));
      }
      break;
    case 'keys':
      for (let yy = y + Math.floor(L * 0.2); yy < y + L; yy++) pc.px(x + 1, yy, yy % 3 ? c(0xcdc7b8) : OUT);
      break;
    case 'handle':
      pc.vl(x + 1, y + 6, 6, METAL.hi);
      pc.vl(x + 1, y + 16, 8, METAL.hi);
      break;
    case 'screen':
      pc.rect(x, y + 6, 2, h - 14, c(0x2d322f));
      break;
    case 'legs':
      pc.vl(x, y + 2, h - 4, P.mid);
      break;
    default:
      pc.vl(x + 1, y + 2, h - 4, P.mid);
  }
}

function drawBack(pc, r, o, v, P) {
  const { L, D, H } = v;
  const T = v.top || P;
  const h = D + H;
  pc.rect(0, 0, L, h, OUT);
  // top, its far edge showing a sliver of the front
  pc.rect(1, 1, L - 2, D - 1, T.top);
  pc.hl(1, 1, L - 2, T.hi);
  pc.speckle(1, 2, L - 2, D - 3, DUST, 0.06, r);
  if (v.front === 'books') for (let x = 2; x < L - 2; x++) if (r() < 0.8) pc.px(x, 1, c(BOOK_COLS[Math.floor(r() * BOOK_COLS.length)]));
  // plain back panel made of boards
  pc.rect(1, D, L - 2, H - 1, P.mid);
  pc.hl(1, D, L - 2, P.dk);
  if (v.front === 'open') {
    // open shelving: you can see the shelves and what is on them
    for (let y = D + 3; y < h - 2; y += 10) {
      pc.hl(1, y, L - 2, METAL.hi);
      for (let x = 3; x < L - 3; x += 4) if (r() < 0.7) pc.rect(x, y - 4, 3, 4, r() < 0.5 ? c(0x6e7a70) : c(0x8a7458));
    }
  } else {
    for (let x = 6; x < L - 2; x += 6) pc.vl(x, D + 1, H - 3, P.dk);
  }
  pc.hl(1, h - 2, L - 2, P.deep ?? P.dk);
  if (o.blood) { pc.px(L / 2, D + 3, BLOOD.main); pc.vl(L / 2, D + 4, 5, BLOOD.dark); }
}
