import { PC, rng, hash } from './pixel.js';
import { c, BLOOD, OUT, BLACK } from './palette.js';

// Character cells follow RPG Maker 2000 proportions: 24px wide, standing on a 16px tile.
// Frames per direction: 0 = left step, 1 = idle, 2 = right step.
export const DIRS = ['down', 'left', 'right', 'up'];

/* ------------------------------------------------------------------ */
/* Skeleton (player)                                                   */
/* ------------------------------------------------------------------ */

export const BONE = {
  k: c(0x16120f),
  w: c(0xe8e0cb),
  l: c(0xc2b8a0),
  m: c(0x938a77),
  d: c(0x645d51),
};

export const SKULL_FRONT = [
  '.........kkkkkk.........',
  '.......kkwwwwwwkk.......',
  '......kwwwwwwwwwlk......',
  '.....kwwwwwwwwwwwlk.....',
  '.....kwwwwwwwwwwwmk.....',
  '.....kwkkkwwwkkkwmk.....',
  '.....kwkkkwwwkkkwmk.....',
  '.....kwkkkwwwkkklmk.....',
  '.....kmwwwwkwwwwlmk.....',
  '......kmwwwwwwwlmk......',
  '.......kkwkwkwkkk.......',
  '........kkkkkkkk........',
];

const SKULL_BACK = [
  '.........kkkkkk.........',
  '.......kkwwwwwwkk.......',
  '......kwwwwwwwwwlk......',
  '.....kwwwwwwwwwwwlk.....',
  '.....kwwwwwwwwwwwmk.....',
  '.....kwwwwwmwwwwwmk.....',
  '.....kwwwwwwmwwwlmk.....',
  '.....klwwwwwmwwwlmk.....',
  '.....kmlwwwwwwwllmk.....',
  '......kmllwwwlllmk......',
  '.......kmmmmmmmmk.......',
  '........kkkkkkkk........',
];

// 3/4 view, facing left
const SKULL_SIDE = [
  '.........kkkkkk.........',
  '.......kkwwwwwwkk.......',
  '......kwwwwwwwwwlk......',
  '.....kwwwwwwwwwwwlk.....',
  '.....kwwwwwwwwwwwmk.....',
  '.....kkkwwkkkwwwwmk.....',
  '.....kkkwwkkkwwwlmk.....',
  '.....kkkwwkkkwwwlmk.....',
  '.....kwwkwwwwwwlmmk.....',
  '......kwwwwwwwlmmk......',
  '......kkwkwkwkkkk.......',
  '.......kkkkkkkk.........',
];

export const TORSO_FRONT = [
  '..........kwwk..........',
  '......kkkkkwwkkkkk......',
  '.....kwwwwkwwkwwwwk.....',
  '....kwlkkwwwwwwkklwk....',
  '....kwk.kkkwwkkk.kwk....',
  '....kwk.kwwwwwwk.kwk....',
  '...kwlk.kkkwwkkk.klwk...',
  '...kwk..kwwwwwwk..kwk...',
  '...kwk...kkwwkk...kwk...',
  '..kwwwk.kwwkkwwk.kwwwk..',
  '..kwkwk..kwwwwk..kwkwk..',
  '...kkk...kk..kk...kkk...',
];

const TORSO_BACK = [
  '..........kmmk..........',
  '......kkkkkwwkkkkk......',
  '.....kwwwwkmmkwwwwk.....',
  '....kwlkwlkwwklwklwk....',
  '....kwk.kmkmmkmk.kwk....',
  '....kwk.kwkwwkwk.kwk....',
  '...kwlk.kmkmmkmk.klwk...',
  '...kwk..kkkwwkkk..kwk...',
  '...kwk....kmmk....kwk...',
  '..kwwwk.kwwwwwwk.kwwwk..',
  '..kwkwk..kwmmwk..kwkwk..',
  '...kkk...kk..kk...kkk...',
];

// facing left: ribcage bulges forward, spine runs down the back
const TORSO_SIDE = [
  '...........kwk..........',
  '.........kkwwwk.........',
  '........kwwwkwwk........',
  '........kwkkwkwk........',
  '........kwwwwkwk........',
  '........kwkkwkwk........',
  '.........kwwwkwk........',
  '..........kkkwk.........',
  '.........kwwwwk.........',
  '.........kwkkwk.........',
  '..........kk.kk.........',
];

function shadow(pc, cx, y, w) {
  pc.ctx.fillStyle = 'rgba(0,0,0,0.35)';
  pc.ctx.fillRect(cx - w / 2 + 1, y, w - 2, 1);
  pc.ctx.fillRect(cx - w / 2, y + 1, w, 1);
}

function legFront(pc, x, top, lift, footLeft) {
  const footY = 29 - lift;
  for (let y = top; y < footY; y++) {
    pc.px(x, y, BONE.k);
    pc.px(x + 1, y, y === footY - 2 ? BONE.m : BONE.w);
    pc.px(x + 2, y, BONE.k);
  }
  const fx = footLeft ? x - 1 : x;
  pc.rect(fx, footY, 4, 1, BONE.k);
  pc.rect(fx + 1, footY, 2, 1, BONE.w);
  pc.rect(fx, footY + 1, 4, 1, BONE.k);
}

function limbSide(pc, x0, y0, x1, y1, col, footLen) {
  for (let y = y0; y <= y1; y++) {
    const t = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
    const x = Math.round(x0 + (x1 - x0) * t);
    pc.rect(x - 1, y, 3, 1, BONE.k);
    pc.px(x, y, col);
  }
  if (footLen) {
    // foot pointing left
    pc.rect(x1 - footLen, y1 + 1, footLen + 2, 1, BONE.k);
    pc.rect(x1 - footLen + 1, y1 + 1, footLen, 1, col);
    pc.rect(x1 - footLen, y1 + 2, footLen + 2, 1, BONE.k);
  } else {
    // hand
    pc.rect(x1 - 1, y1 + 1, 3, 2, BONE.k);
    pc.px(x1, y1 + 1, col);
  }
}

function shadeRight(pc, fromX) {
  // bones on the right side of the body catch less light
  const img = pc.ctx.getImageData(0, 0, pc.w, pc.h);
  const w = BONE.w, l = BONE.l;
  const wr = parseInt(w.slice(1, 3), 16), wg = parseInt(w.slice(3, 5), 16), wb = parseInt(w.slice(5, 7), 16);
  const lr = parseInt(l.slice(1, 3), 16), lg = parseInt(l.slice(3, 5), 16), lb = parseInt(l.slice(5, 7), 16);
  const d = img.data;
  for (let y = 0; y < pc.h; y++)
    for (let x = fromX; x < pc.w; x++) {
      const i = (y * pc.w + x) * 4;
      if (d[i + 3] && d[i] === wr && d[i + 1] === wg && d[i + 2] === wb) {
        d[i] = lr; d[i + 1] = lg; d[i + 2] = lb;
      }
    }
  pc.ctx.putImageData(img, 0, 0);
}

/** one frame of the player skeleton; also reused for the skeletons found around the house */
export function skeletonFrame(dir, frame, noShadow = false) {
  const pc = new PC(24, 32);
  const step = frame !== 1;
  const bob = step ? -1 : 0;
  if (!noShadow) shadow(pc, 12, 30, 12);

  if (dir === 'down' || dir === 'up') {
    legFront(pc, 8, 25 + bob, frame === 2 ? 2 : 0, true);
    legFront(pc, 13, 25 + bob, frame === 0 ? 2 : 0, false);
    pc.pattern(dir === 'down' ? TORSO_FRONT : TORSO_BACK, BONE, 0, 13 + bob);
    pc.pattern(dir === 'down' ? SKULL_FRONT : SKULL_BACK, BONE, 0, 1 + bob);
    shadeRight(pc, 15);
  } else {
    // facing left; 'right' is mirrored afterwards
    const swing = frame === 0 ? 1 : frame === 2 ? -1 : 0;
    const hip = 24 + bob;
    // back leg, far arm
    limbSide(pc, 13, hip, 13 - swing * 3, 28, BONE.m, 3);
    limbSide(pc, 13, 15 + bob, 13 - swing * 2, 21 + bob, BONE.m);
    pc.pattern(TORSO_SIDE, BONE, 0, 13 + bob);
    // front leg, near arm
    limbSide(pc, 11, hip, 11 + swing * 3, 28, BONE.w, 3);
    limbSide(pc, 11, 15 + bob, 11 + swing * 2 + 1, 21 + bob, BONE.w);
    pc.pattern(SKULL_SIDE, BONE, 0, 1 + bob);
  }
  return pc;
}

/** a bone drawn as a thick line: dark outline, light middle */
function boneLine(pc, x0, y0, x1, y1, col) {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) pc.line(x0 + dx, y0 + dy, x1 + dx, y1 + dy, BONE.k);
  pc.line(x0, y0, x1, y1, col);
}

/**
 * The skeleton kneeling on one knee, head bowed, hands held out in front (used in the
 * ending's ritual). Drawn facing left; `facing: 'right'` flips it.
 */
export function skeletonKneelFrame(facing = 'left') {
  const pc = new PC(24, 32);
  shadow(pc, 12, 29, 16);
  const hipY = 25;
  // far leg: knee on the ground, shin trailing behind
  boneLine(pc, 13, hipY, 13, 28, BONE.m);
  boneLine(pc, 13, 28, 18, 28, BONE.m);
  // far arm reaching forward
  boneLine(pc, 13, 17, 8, 22, BONE.m);
  pc.pattern(TORSO_SIDE, BONE, -1, 15);
  // near leg: thigh forward, shin straight down to the foot
  boneLine(pc, 11, hipY, 6, hipY, BONE.w);
  boneLine(pc, 6, hipY, 6, 28, BONE.w);
  pc.rect(3, 28, 5, 2, BONE.k); pc.hl(4, 28, 3, BONE.w);
  // near arm, hands together in front of him
  boneLine(pc, 11, 17, 7, 23, BONE.w);
  pc.rect(5, 22, 3, 3, BONE.k); pc.px(6, 23, BONE.w);
  // skull bowed a little forward
  pc.pattern(SKULL_SIDE, BONE, -2, 4);
  return facing === 'right' ? pc.flipped() : pc;
}

/* ------------------------------------------------------------------ */
/* Cloaked figure (AI)                                                 */
/* ------------------------------------------------------------------ */

const CLOAK = {
  light: c(0x5a524b),
  base: c(0x3f3934),
  dark: c(0x2a2622),
  deep: c(0x181513),
};

const HOOD = [1, 3, 4, 5, 5, 6, 6, 6, 6, 6, 5, 6]; // half widths from row 3

function cloakFrame(dir, frame) {
  const pc = new PC(24, 40);
  const r = rng(hash(frame, DIRS.indexOf(dir), 77));
  const side = dir === 'left' || dir === 'right';
  const cx = 12;
  const hemBase = 37;

  const halfAt = (y) => {
    if (y < 15) return HOOD[y - 3] ?? 6;
    if (y < 16) return side ? 6 : 8;
    if (y < 17) return side ? 6 : 9;
    return side ? 6 + Math.floor((y - 17) / 8) : 9 + Math.floor((y - 17) / 9);
  };

  for (let y = 3; y <= hemBase + 1; y++) {
    const half = halfAt(y);
    const offs = side && y >= 15 ? 1 : 0; // body sits a bit behind the hood when seen from the side
    for (let x = cx - half + offs; x <= cx + half + offs; x++) {
      // ragged hem that sways a little per frame
      const hem = hemBase + ((hash(x + frame * 2, 3) % 3) === 0 ? 1 : 0) - ((hash(x, frame) % 5) === 0 ? 1 : 0);
      if (y > hem) continue;
      const dx = x - cx - offs;
      let col = CLOAK.base;
      if (dx < -half * 0.45) col = CLOAK.light;
      else if (dx > half * 0.4) col = CLOAK.dark;
      if (y >= 19) {
        const sway = (y + frame) % 7 < 3 ? 0 : 1;
        if (!side && (dx === -3 + sway || dx === 3 + sway)) col = CLOAK.dark;
        if (side && dx === 1 + sway) col = CLOAK.dark;
      }
      if (y >= hem) col = CLOAK.deep;
      pc.px(x, y, col);
    }
  }

  // hood shading on top
  pc.hl(cx - 2, 4, 3, CLOAK.light);

  if (dir === 'down') {
    // face: an empty void inside the hood
    pc.ellipse(cx, 10, 4, 3, CLOAK.deep);
    pc.ellipse(cx, 10, 3, 2, BLACK);
    pc.rect(cx - 2, 12, 5, 1, BLACK);
    // sleeves
    for (const sx of [-1, 1]) {
      const x = cx + sx * 6;
      pc.rect(sx < 0 ? x - 2 : x, 16, 3, 13, sx < 0 ? CLOAK.light : CLOAK.dark);
      pc.vl(sx < 0 ? x + 1 : x - 1, 17, 12, CLOAK.deep);
      pc.rect(sx < 0 ? x - 2 : x, 28, 3, 2, CLOAK.deep);
    }
  } else if (dir === 'up') {
    pc.vl(cx, 5, 10, CLOAK.dark);
    pc.vl(cx + 1, 6, 8, CLOAK.deep);
    pc.hl(cx - 4, 15, 9, CLOAK.dark);
  } else {
    // facing left: hood opening on the left edge
    pc.rect(cx - 6, 7, 3, 6, CLOAK.deep);
    pc.rect(cx - 6, 8, 2, 4, BLACK);
    pc.px(cx - 6, 7, CLOAK.base);
    // arm/sleeve in front of the body
    pc.rect(cx - 1, 16, 3, 13, CLOAK.base);
    pc.vl(cx - 2, 17, 12, CLOAK.deep);
    pc.rect(cx - 1, 28, 3, 2, CLOAK.deep);
  }

  // blood: soaked hem, a stained sleeve with drips, a few spatters on the chest
  const filled = pc.ctx.getImageData(0, 0, 24, 40).data;
  for (let x = 0; x < 24; x++)
    for (let y = 31; y <= hemBase + 1; y++) {
      if (!filled[(y * 24 + x) * 4 + 3]) continue;
      const p = (y - 31) / 7;
      if (r() < p * 0.55) pc.px(x, y, r() < 0.5 ? BLOOD.dark : BLOOD.deep);
      else if (r() < p * 0.12) pc.px(x, y, BLOOD.main);
    }
  if (dir === 'down') {
    // blood soaked into the right sleeve, dripping from the cuff
    pc.px(cx + 6, 27, BLOOD.dark); pc.px(cx + 7, 27, BLOOD.deep);
    pc.px(cx + 6, 28, BLOOD.main); pc.px(cx + 7, 28, BLOOD.dark); pc.px(cx + 8, 28, BLOOD.dark);
    pc.px(cx + 7, 25, BLOOD.deep);
    pc.px(cx + 7, 30, BLOOD.main);
    pc.px(cx + 7, 31 + (frame % 2), BLOOD.dark);
    pc.px(cx - 2, 20, BLOOD.dark);
    pc.px(cx + 1, 22, BLOOD.main);
    pc.px(cx - 1, 24, BLOOD.deep);
  } else if (side) {
    pc.px(cx - 1, 28, BLOOD.dark); pc.px(cx, 28, BLOOD.main); pc.px(cx + 1, 27, BLOOD.deep);
    pc.px(cx, 30, BLOOD.main);
  } else {
    pc.px(cx - 3, 21, BLOOD.dark);
    pc.px(cx + 4, 25, BLOOD.deep);
  }

  pc.outline(OUT);
  // ground shadow behind everything
  pc.ctx.globalCompositeOperation = 'destination-over';
  shadow(pc, 12, 38, 18);
  pc.ctx.globalCompositeOperation = 'source-over';
  return pc;
}

/**
 * The cloaked figure kneeling on the floor, facing down (used in the summoning cutscene):
 * shorter than standing, head bowed, the coat spreading out to both sides on the boards.
 */
export function kneelFrame() {
  const W = 36, H = 34, cx = 18;
  const pc = new PC(W, H);
  const r = rng(hash(9, 4, 77));
  const top = 5; // the hood sits lower: he is bowing
  const hem = 30;
  const halfAt = (y) => {
    if (y < top + 11) return HOOD[y - top] ?? 6;
    if (y < top + 13) return 8 + (y - top - 11); // shoulders
    if (y < 22) return 10;
    return 10 + Math.round((y - 22) ** 1.35 * 0.85); // the coat pooling on the floor
  };
  for (let y = top; y <= hem + 1; y++) {
    const half = Math.min(cx - 1, halfAt(y));
    for (let x = cx - half; x <= cx + half; x++) {
      const dx = x - cx;
      // the ragged edge of the coat lying on the floor
      const edge = hem - (Math.abs(dx) > 8 ? (hash(x, 5) % 3) : 0) + ((hash(x, 2) % 4) === 0 ? 1 : 0);
      if (y > edge) continue;
      let col = CLOAK.base;
      if (dx < -half * 0.45) col = CLOAK.light;
      else if (dx > half * 0.4) col = CLOAK.dark;
      // folds running out to the sides
      if (y >= 22 && (dx === -4 - Math.floor((y - 22) / 2) || dx === 5 + Math.floor((y - 22) / 2))) col = CLOAK.dark;
      if (y >= edge) col = CLOAK.deep;
      pc.px(x, y, col);
    }
  }
  pc.hl(cx - 2, top + 1, 3, CLOAK.light);
  // the bowed face: only a sliver of the void inside the hood shows
  pc.ellipse(cx, top + 8, 3, 2, CLOAK.deep);
  pc.rect(cx - 2, top + 8, 5, 2, BLACK);
  // sleeves resting on the knees, hands hidden
  for (const sx of [-1, 1]) {
    const x = cx + sx * 7;
    pc.rect(sx < 0 ? x - 2 : x, top + 12, 3, 9, sx < 0 ? CLOAK.light : CLOAK.dark);
    pc.vl(sx < 0 ? x + 1 : x - 1, top + 13, 8, CLOAK.deep);
    pc.rect(sx < 0 ? x - 1 : x - 1, top + 20, 4, 2, CLOAK.deep);
  }
  // blood soaked into the coat where it touches the floor
  const filled = pc.ctx.getImageData(0, 0, W, H).data;
  for (let x = 0; x < W; x++)
    for (let y = 24; y <= hem + 1; y++) {
      if (!filled[(y * W + x) * 4 + 3]) continue;
      const p = (y - 24) / 7;
      if (r() < p * 0.5) pc.px(x, y, r() < 0.5 ? BLOOD.dark : BLOOD.deep);
      else if (r() < p * 0.1) pc.px(x, y, BLOOD.main);
    }
  pc.px(cx + 7, top + 21, BLOOD.main); pc.px(cx + 8, top + 21, BLOOD.dark);
  pc.px(cx - 1, top + 15, BLOOD.dark); pc.px(cx + 2, top + 17, BLOOD.main);
  pc.outline(OUT);
  pc.ctx.globalCompositeOperation = 'destination-over';
  shadow(pc, cx, hem + 1, 30);
  pc.ctx.globalCompositeOperation = 'source-over';
  return pc;
}

/* ------------------------------------------------------------------ */

function buildSheet(frameFn) {
  const sheet = {};
  for (const dir of ['down', 'left', 'up']) sheet[dir] = [0, 1, 2].map((f) => frameFn(dir, f));
  sheet.right = sheet.left.map((pc) => pc.flipped());
  const tex = {};
  for (const dir of DIRS) tex[dir] = sheet[dir].map((pc) => pc.texture());
  return { tex, canvases: sheet };
}

let cache = null;
export function characterSheets() {
  if (!cache) {
    cache = {
      skeleton: buildSheet(skeletonFrame),
      cloaked: buildSheet(cloakFrame),
    };
  }
  return cache;
}
