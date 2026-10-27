import { PC } from './pixel.js';
import { c, BLOOD, OUT, BLACK } from './palette.js';
import { DWOOD, IRON, METAL, STONE, PAPER, box, bloodBlob, groundShadow } from './draw.js';
import { BONE, SKULL_FRONT, TORSO_FRONT, skeletonFrame } from './characters.js';

// Bodies, bones and skeletons. Every skeleton is built from the player's own sprite
// parts so they all look like the same kind of creature.

const B = BONE; // k outline, w white, l light, m mid, d dark

/** copy a canvas row by row, shifting each row sideways: a crisp pixel-art "lean" */
function shearDraw(dst, src, x, y, shiftForRow) {
  for (let row = 0; row < src.h; row++) {
    dst.ctx.drawImage(src.canvas, 0, row, src.w, 1, x + shiftForRow(row), y + row, src.w, 1);
  }
}

/** a 3px wide bone (outline, light centre) between two points */
function boneLimb(pc, x0, y0, x1, y1, col = B.w) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / steps), y = Math.round(y0 + ((y1 - y0) * i) / steps);
    pc.rect(x - 1, y - 1, 3, 3, B.k);
  }
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / steps), y = Math.round(y0 + ((y1 - y0) * i) / steps);
    pc.px(x, y, col);
  }
}

/* ---------- skeletons ---------- */

function drawSeatedSkeleton(pc, r) {
  const W = pc.w;
  const C = DWOOD;
  groundShadow(pc, W / 2, pc.h - 2, 13, 2);
  // chair back
  pc.rect(7, 4, 20, 22, OUT);
  pc.rect(8, 5, 18, 20, C.mid);
  for (let x = 11; x < 25; x += 4) pc.vl(x, 7, 17, C.dk);
  pc.hl(8, 5, 18, C.hi);
  pc.rect(6, 2, 3, 5, OUT); pc.rect(25, 2, 3, 5, OUT); pc.px(7, 3, C.hi); pc.px(26, 3, C.hi);

  // upper body, leaning hard to the right as if about to slide off
  const torso = new PC(24, 12);
  torso.pattern(TORSO_FRONT, B, 0, 0);
  // the left hand rests on the diary, so cut off the hanging left forearm
  torso.ctx.clearRect(0, 8, 6, 4);
  const ox = 5;
  shearDraw(pc, torso, ox, 13, (row) => Math.round((11 - row) / 4));
  // skull, slumped onto the right shoulder and tilted
  const skull = new PC(24, 12);
  skull.pattern(SKULL_FRONT, B, 0, 0);
  shearDraw(pc, skull, ox + 4, 3, (row) => Math.round((11 - row) / 2.5));

  // seat in front of the pelvis
  box(pc, 5, 23, 24, 6, 4, C);
  // right arm hanging over the side of the chair
  boneLimb(pc, ox + 20, 22, ox + 22, 31, B.l);
  pc.rect(ox + 21, 31, 3, 3, B.k); pc.px(ox + 22, 32, B.l); pc.px(ox + 21, 34, B.k); pc.px(ox + 23, 34, B.k);
  // legs: one knee forward, the other splayed out sideways
  boneLimb(pc, ox + 8, 28, ox + 8, 36, B.w);
  pc.rect(ox + 6, 37, 5, 2, B.k); pc.hl(ox + 7, 37, 3, B.w);
  pc.ellipse(ox + 8, 28, 1, 1, B.w);
  boneLimb(pc, ox + 14, 28, ox + 19, 36, B.l);
  pc.rect(ox + 18, 37, 5, 2, B.k); pc.hl(ox + 19, 37, 3, B.l);
  pc.ellipse(ox + 14, 28, 1, 1, B.l);
  // chair legs
  pc.rect(6, 29, 2, 10, OUT); pc.rect(27, 29, 2, 10, OUT);

  // the diary, slipping off its lap to the left
  for (let i = 0; i < 6; i++) {
    const y = 20 + i;
    const x0 = ox + 1 - Math.floor(i / 2);
    pc.rect(x0, y, 10, 1, i === 0 || i === 5 ? OUT : i === 4 ? PAPER : c(0x4a3a30));
    pc.px(x0 - 1, y, OUT); pc.px(x0 + 10, y, OUT);
  }
  pc.px(ox + 6, 22, c(0x8f7a5a));
  pc.px(ox + 1, 22, B.w); pc.px(ox + 1, 23, B.l); // the fingers holding it

  // cobweb between the skull and the chair
  pc.ctx.save();
  pc.ctx.globalAlpha = 0.4;
  pc.line(26, 3, 21, 9, c(0xdedad2));
  pc.line(26, 6, 22, 5, c(0xdedad2));
  pc.ctx.restore();
}

function drawShackled(pc) {
  // shackles bolted high on the wall
  for (const x of [3, 20]) {
    for (let y = 0; y < 3; y++) pc.px(x, y, y % 2 ? METAL.dk : METAL.mid);
    pc.rect(x - 2, 3, 5, 4, IRON.deep);
    pc.frame(x - 2, 3, 5, 4, METAL.mid);
  }
  // arms pulled up to the shackles
  boneLimb(pc, 3, 6, 8, 16, B.w);
  boneLimb(pc, 20, 6, 15, 16, B.l);
  // ribcage without its own arms, hung under the skull
  const torso = new PC(24, 12);
  torso.pattern(TORSO_FRONT, B, 0, 0);
  torso.ctx.clearRect(0, 2, 7, 10);
  torso.ctx.clearRect(17, 2, 7, 10);
  pc.draw(torso, 0, 14);
  // head hanging forward, slightly to one side
  const skull = new PC(24, 12);
  skull.pattern(SKULL_FRONT, B, 0, 0);
  shearDraw(pc, skull, 1, 4, (row) => (row < 6 ? -1 : 0));
  // dangling legs, toes pointing down
  for (const [x, col] of [[9, B.w], [14, B.l]]) {
    boneLimb(pc, x, 26, x, 34, col);
    pc.rect(x - 1, 35, 3, 3, B.k); pc.px(x, 35, col); pc.px(x, 36, col);
  }
  // old blood from the wrists
  pc.px(4, 7, BLOOD.dark); pc.px(19, 8, BLOOD.deep); pc.vl(5, 9, 2, BLOOD.deep);
}

/** remains lying on the floor: the player sprite turned on its back, slightly out of place */
function lyingSkeleton(pc, x, y, r) {
  const s = skeletonFrame('down', 1, true);
  const g = new PC(32, 24);
  g.ctx.translate(0, 24);
  g.ctx.rotate(-Math.PI / 2);
  g.ctx.drawImage(s.canvas, 0, 4);
  pc.draw(g, x, y);
  // a few bones knocked loose
  pc.line(x + 30, y + 3, x + 34, y + 1, B.k); pc.line(x + 30, y + 2, x + 34, y, B.l);
  pc.speckle(x, y, 32, 24, c(0x9d988e), 0.03, r);
}

/* ---------- bodies ---------- */

function drawCorpse(pc, r, o) {
  const W = pc.w, H = pc.h;
  const kind = o.kind || 'shroud';
  if (kind === 'bones') {
    bloodBlob(pc, 16, H - 6, 9, 3, r);
    lyingSkeleton(pc, 3, H - 26, r);
    return;
  }
  bloodBlob(pc, kind === 'body' ? 9 : W / 2, H / 2 + 2, 9, 4, r);
  const g = new PC(W, H);
  if (kind === 'shroud') {
    // a body wrapped in a dirty sheet and tied with rope
    const cy = H / 2;
    const half = (x) => {
      if (x < 10) return Math.sqrt(Math.max(0, 16 - (x - 5.5) ** 2)); // head
      if (x < 12) return 3;
      if (x < 17) return 3 + (x - 11);
      if (x < 27) return 6 - (x - 17) * 0.12;
      if (x < 34) return 4.8 - (x - 27) * 0.25;
      return Math.sqrt(Math.max(0, 9 - (x - 34) ** 2)) + 1;
    };
    const hi = c(0xb3ac9c), mid = c(0x9a9486), lo = c(0x7a7468);
    for (let x = 1; x < W - 1; x++) {
      const h = Math.round(half(x));
      for (let y = cy - h; y <= cy + h; y++) {
        let col = y < cy - h / 3 ? hi : y > cy + h / 3 ? lo : mid;
        if ((x + y) % 7 === 0 && x > 11) col = lo; // folds
        g.px(x, y, col);
      }
    }
    for (const x of [11, 23, 32]) {
      const h = Math.round(half(x)) + 1;
      g.rect(x, cy - h, 2, h * 2 + 1, c(0x5a4632));
      g.px(x + 2, cy + h - 1, c(0x5a4632));
    }
    bloodBlob(g, 18, cy, 3, 2, r);
    g.speckle(1, 0, W - 2, H, c(0x6e685e), 0.06, r);
  } else {
    drawBodyFaceDown(g, r);
  }
  g.outline(OUT);
  pc.draw(g, 0, 0);
}

/** someone lying face down, head to the left, one arm stretched out past the head */
function drawBodyFaceDown(g, r) {
  const skin = c(0xaca698), skinLo = c(0x8a8478);
  const shirt = c(0x7a7c84), shirtHi = c(0x8e9098), shirtLo = c(0x5c5e66);
  const pants = c(0x48443e), pantsHi = c(0x5a5650), shoe = c(0x1c1a18);
  const hair = c(0x2e2622), hairHi = c(0x463a32);
  const SEP = c(0x2a2724); // dark line between limbs so the shape reads
  // legs, slightly apart, with shoes
  g.rect(26, 5, 10, 4, pants); g.hl(26, 5, 10, pantsHi);
  g.rect(26, 11, 11, 4, pants); g.hl(26, 11, 11, pantsHi);
  g.rect(36, 4, 3, 5, shoe); g.rect(37, 10, 3, 5, shoe);
  g.hl(26, 9, 9, SEP); g.hl(26, 10, 9, SEP);
  // torso: shoulders on the left, narrowing to the waist
  for (let x = 11; x < 27; x++) {
    const top = x < 15 ? 3 : 4 + Math.floor((x - 15) / 5);
    const bot = x < 15 ? 16 : 15 - Math.floor((x - 15) / 5);
    for (let y = top; y <= bot; y++) g.px(x, y, y <= top + 1 ? shirtHi : y >= bot - 2 ? shirtLo : shirt);
  }
  g.vl(16, 6, 8, shirtLo); // spine crease
  g.line(19, 5, 23, 9, shirtLo); g.line(20, 11, 24, 8, shirtLo);
  g.rect(21, 12, 3, 2, skin); g.px(22, 14, skinLo); // shirt torn open
  // arm stretched out past the head, fingers splayed
  g.rect(3, 1, 9, 3, shirt); g.hl(3, 1, 9, shirtHi);
  g.rect(0, 1, 3, 3, skin); g.px(0, 0, skin); g.px(1, 0, skin);
  g.hl(3, 4, 8, SEP);
  // the other arm along the side, hand palm up
  g.rect(13, 16, 8, 3, shirt); g.hl(13, 18, 8, shirtLo);
  g.rect(21, 16, 3, 3, skin); g.px(24, 17, skinLo);
  g.hl(13, 15, 8, SEP);
  // head and matted hair, an ear showing
  g.ellipse(7, 10, 4, 4, hair);
  g.px(5, 8, hairHi); g.px(6, 7, hairHi); g.px(8, 8, hairHi);
  g.px(9, 13, skin); g.px(10, 13, skinLo);
  g.px(5, 12, BLOOD.deep); g.px(6, 13, BLOOD.dark); g.px(8, 12, BLOOD.main);
  g.speckle(11, 3, 16, 14, c(0x6a6c72), 0.05, r);
}

/* ---------- bones ---------- */

/** a classic "dog bone" femur: knobbly ends and a straight shaft */
function femur(pc, x, y, len, col = B.w) {
  pc.rect(x + 1, y, len - 2, 3, B.k);
  pc.hl(x + 2, y + 1, len - 4, col);
  for (const ex of [x, x + len - 3]) {
    pc.rect(ex, y - 2, 3, 3, B.k); pc.rect(ex, y + 2, 3, 3, B.k);
    pc.px(ex + 1, y - 1, col); pc.px(ex + 1, y + 3, col);
    pc.px(ex + 1, y + 1, col);
  }
}

function drawBone(pc) {
  femur(pc, 1, 3, pc.w - 2, B.w);
}

function drawRibcage(pc) {
  const W = pc.w, cx = Math.floor(W / 2);
  // ribs curving out from the spine
  for (let i = 0; i < 5; i++) {
    const y = 3 + i * 2;
    const reach = 6 - Math.abs(i - 1.5) * 0.8;
    for (const s of [-1, 1]) {
      pc.line(cx, y, cx + s * reach, y + 2, B.k);
      pc.line(cx + s * reach, y + 2, cx + s * (reach - 1), y + 4, B.k);
      pc.line(cx + s, y - 1, cx + s * (reach - 1), y + 1, i % 2 ? B.l : B.w);
    }
  }
  // spine
  for (let y = 1; y < pc.h - 1; y++) { pc.rect(cx - 1, y, 3, 1, B.k); pc.px(cx, y, y % 2 ? B.m : B.w); }
}

function drawSkull(pc) {
  pc.pattern(SKULL_FRONT.map((row) => row.slice(5, 19)), B, 0, 0);
}

function drawBonePile(pc, r) {
  groundShadow(pc, pc.w / 2, pc.h - 3, 13, 3, 0.3);
  femur(pc, 2, 12, 14, B.l);
  femur(pc, 14, 13, 13, B.m);
  const rib = new PC(16, 14);
  drawRibcage(rib);
  pc.draw(rib, 8, 1);
  femur(pc, 4, 7, 12, B.w);
  const sk = new PC(14, 12);
  drawSkull(sk);
  pc.draw(sk, 16, 4);
  pc.px(10, 16, BLOOD.deep); pc.px(11, 16, BLOOD.dark);
  pc.speckle(0, 0, pc.w, pc.h, c(0x9d988e), 0.02, r);
}

function drawBonesScatter(pc) {
  // two crossed femurs and a jaw fragment
  femur(pc, 1, 2, 12, B.w);
  femur(pc, 5, 7, 11, B.l);
  pc.rect(11, 1, 4, 3, B.k); pc.hl(12, 2, 2, B.w);
  pc.px(2, 9, BLOOD.deep); pc.px(3, 9, BLOOD.dark);
}

/* ---------- walls ---------- */

/**
 * A chunk of wall that has caved in: an opening broken out brick by brick, wide at the
 * bottom where it meets the floor, big enough for the skeleton to squeeze into, with the
 * fallen bricks spilling out in front of it.
 */
function drawWallBreach(pc, r) {
  const W = pc.w, H = pc.h;
  const floor = 30; // sprite row where the wall meets the floor
  const cx = W / 2;
  // the opening follows the 6px brick courses: each course breaks off at its own width
  const courses = [];
  for (let k = 0; k < 5; k++) {
    const half = [4, 8, 10, 12, 13][k];
    courses.push({ l: Math.round(cx - half - (r() < 0.5 ? 0 : 3)), rr: Math.round(cx + half + (r() < 0.5 ? 0 : 3)) });
  }
  const inside = (x, y) => {
    if (y < 2 || y >= floor) return false;
    const c0 = courses[Math.min(4, Math.floor((y - 2) / 6))];
    return x >= c0.l && x < c0.rr;
  };
  for (let y = 0; y < floor; y++) {
    for (let x = 0; x < W; x++) {
      if (inside(x, y)) {
        // the hollow: black, with the broken thickness of the wall showing at the edges
        const edge = !inside(x - 2, y) || !inside(x, y - 2);
        const far = !inside(x - 4, y) || !inside(x, y - 4);
        pc.px(x, y, edge ? c(0x2a2724) : far ? c(0x141210) : BLACK);
      } else if (inside(x + 1, y) || inside(x, y + 1)) {
        pc.px(x, y, STONE.hi); // chipped, lit brick edge above / left of the hole
      } else if (inside(x - 1, y)) {
        pc.px(x, y, STONE.deep);
      }
    }
  }
  // a faint glimpse of the floor continuing inside
  pc.rect(courses[4].l + 3, floor - 3, courses[4].rr - courses[4].l - 6, 2, c(0x1c1a18));
  // fallen bricks spilling out onto the floor, bigger ones in front
  for (let i = 0; i < 14; i++) {
    const t = r();
    const w = 3 + Math.floor(r() * 4), h = 2 + Math.floor(r() * 2);
    const x = Math.round(cx - 14 + r() * 26), y = floor - 3 + Math.floor(t * 11);
    pc.rect(x, y, w, h + 1, OUT);
    pc.rect(x + 1, y, w - 2, h, t < 0.5 ? STONE.mid : STONE.top);
    pc.hl(x + 1, y, w - 2, STONE.hi);
  }
  pc.speckle(2, floor + 1, W - 4, H - floor - 2, STONE.dk, 0.18, r);
  pc.speckle(2, floor + 1, W - 4, H - floor - 2, STONE.mid, 0.08, r);
}

export const REMAINS_PROPS = {
  seated_skeleton: { w: 34, h: 40, tw: 2, th: 1, draw: drawSeatedSkeleton },
  shackled: { w: 24, h: 40, tw: 1, th: 2, layer: 'wall', draw: drawShackled },
  corpse: { w: 42, h: (o) => (o.kind === 'bones' ? 30 : o.kind === 'body' ? 21 : 18), tw: 2, th: 1, draw: drawCorpse },
  bones: { w: 16, h: 11, tw: 1, th: 1, layer: 'floor', draw: drawBonesScatter },
  bone: { w: 16, h: 9, tw: 1, th: 1, layer: 'floor', draw: drawBone },
  ribcage: { w: 16, h: 14, tw: 1, th: 1, layer: 'floor', draw: drawRibcage },
  skull: { w: 14, h: 12, tw: 1, th: 1, layer: 'floor', draw: drawSkull },
  bone_pile: { w: 32, h: 20, tw: 2, th: 1, draw: drawBonePile },
  wall_breach: { w: 32, h: 44, tw: 2, th: 2, layer: 'wall', dy: 8, draw: drawWallBreach },
};
