import { PC } from './gfx/pixel.js';
import { c, OUT } from './gfx/palette.js';

// Item database. `desc` is the line shown at the bottom of the inventory; that is all the
// text an item has, unless it says otherwise:
//   usable: false  - can't be used on anything; listed in blue-grey so it stands out
//   note: [lines]  - "Inspect" shows it written on a piece of paper in the middle of the screen
// Everything else can be used ("Use" tries it on whatever the skeleton is facing).
export const ITEMS = {
  pocket_watch: {
    name: 'Pocket Watch',
    usable: false,
    desc: 'His watch. It tells me how long I have.',
    icon(pc) {
      const s = c(0xb9b4aa), sd = c(0x7d786f), face = c(0xe6e0d2), hand = c(0x2a2522);
      // chain and crown
      pc.px(8, 0, sd); pc.px(9, 1, sd); pc.px(10, 0, sd);
      pc.rect(7, 1, 3, 2, OUT); pc.px(8, 2, s);
      // case and face
      pc.ellipse(8, 9, 6, 6, OUT);
      pc.ellipse(8, 9, 5, 5, s);
      pc.ellipse(8, 9, 4, 4, face);
      pc.px(4, 6, c(0xe9e6df)); pc.px(5, 5, c(0xe9e6df));
      pc.px(12, 12, sd); pc.px(11, 13, sd);
      // hour marks and hands
      pc.px(8, 5, sd); pc.px(12, 9, sd); pc.px(8, 13, sd); pc.px(4, 9, sd);
      pc.line(8, 9, 8, 6, hand);
      pc.line(8, 9, 10, 10, hand);
    },
  },
  paper: {
    name: 'Piece of Paper',
    usable: false,
    desc: 'A piece of paper containing a short poem',
    note: ['For me and my selfishness,', 'For you and your kindness,', 'One wish I only need', 'To reunite us once again.'],
    icon(pc) {
      const p = c(0xd9d1bd), pd = c(0xb3aa94), ink = c(0x5a5248);
      pc.rect(3, 1, 10, 14, OUT);
      pc.rect(4, 2, 8, 12, p);
      pc.vl(11, 2, 12, pd); pc.px(10, 2, pd); pc.px(11, 3, pd);
      for (let y = 4; y < 13; y += 2) pc.hl(5, y, y % 4 ? 5 : 4, ink);
    },
  },
  rusty_key: {
    name: 'Rusty Key',
    desc: 'A very old looking key, rusted. Looks like it has some grease on it.',
    icon(pc) {
      const k = c(0x8a6a48), kd = c(0x5e4532), kh = c(0xb08c62);
      pc.ellipse(5, 5, 3, 3, OUT);
      pc.ellipse(5, 5, 2, 2, k);
      pc.px(5, 5, OUT);
      pc.px(4, 4, kh);
      pc.rect(7, 4, 7, 3, OUT);
      pc.hl(8, 5, 5, k);
      pc.rect(11, 7, 1, 3, OUT); pc.rect(13, 7, 1, 2, OUT);
      pc.px(11, 7, kd); pc.px(13, 7, kd);
      pc.px(9, 5, c(0x3a3028)); // a smear of grease
    },
  },
  rope: {
    name: 'Rope',
    desc: 'A bundle of very well used rope. I wander what it was used for.',
    icon(pc) {
      const r = c(0x9a8a68), rd = c(0x6e6248);
      pc.ellipse(8, 8, 6, 6, OUT);
      pc.ellipse(8, 8, 5, 5, r);
      pc.ellipse(8, 8, 3, 3, OUT);
      pc.ellipse(8, 8, 2, 2, rd);
      pc.px(8, 8, OUT);
      for (const [x, y] of [[4, 5], [11, 5], [5, 11], [12, 10], [8, 3]]) pc.px(x, y, rd);
      pc.line(12, 12, 15, 15, OUT); pc.px(13, 13, r); // a loose end
    },
  },
  bucket: {
    name: 'Bucket',
    desc: "A very old busted bucket. Definitely can't use this to hold any liquid inside of it...",
    icon(pc) {
      const w = c(0x76583e), wd = c(0x45321f), iron = c(0x6a6a6a);
      pc.line(3, 4, 8, 1, OUT); pc.line(8, 1, 13, 4, OUT); // handle
      pc.rect(3, 4, 11, 11, OUT);
      pc.rect(4, 5, 9, 9, w);
      pc.vl(7, 5, 9, wd); pc.vl(10, 5, 9, wd);
      pc.hl(3, 7, 11, iron); pc.hl(3, 12, 11, iron);
      pc.px(5, 10, OUT); pc.px(11, 9, OUT); pc.px(8, 13, OUT); // holes
    },
  },
  spare_key: {
    name: 'Spare Key',
    desc: 'A spare key. Not sure what it\'s used for.',
    icon(pc) {
      const k = c(0xb3ab9b), kd = c(0x7d766a), kh = c(0xd6cfc0);
      pc.rect(1, 3, 6, 6, OUT); pc.rect(2, 4, 4, 4, k); pc.rect(3, 5, 2, 2, OUT); pc.px(2, 4, kh);
      pc.rect(7, 5, 8, 3, OUT); pc.hl(7, 6, 7, k);
      pc.rect(11, 8, 1, 3, OUT); pc.rect(13, 8, 1, 2, OUT); pc.px(11, 8, kd); pc.px(13, 8, kd);
      pc.px(1, 10, c(0x3d4a52)); pc.px(2, 11, c(0x3d4a52)); // still wet from the well
    },
  },
  strange_amulet: {
    name: 'Strange Amulet',
    desc: "There's a strange purple crystal incased in metal with intricate patterns made out of tiny wire. A sloppy craftsmanship, I might add.",
    icon(pc) {
      const wire = c(0x9a9590), wireD = c(0x5e5a55);
      // the cord it hangs from
      pc.line(3, 0, 8, 4, wireD); pc.line(13, 0, 8, 4, wireD);
      // the crystal: one of the few colours in the game
      pc.rect(6, 4, 5, 10, OUT);
      pc.rect(7, 5, 3, 8, '#7a3fc0');
      pc.vl(7, 5, 7, '#b88cf0'); pc.px(9, 12, '#4a1f80'); pc.px(8, 13, OUT);
      pc.px(8, 3, OUT); pc.px(8, 14, OUT);
      // wire wound round it, badly
      for (const [y, x0, x1] of [[6, 5, 11], [9, 5, 11], [11, 6, 10]]) pc.line(x0, y, x1, y + 1, wire);
      pc.px(5, 7, wire); pc.px(11, 10, wire); pc.px(4, 10, wireD);
    },
  },
  piano_keys: {
    name: 'Piano Keys',
    desc: 'Piano keys. You have a bone to pick with whoever put them in there.',
    icon(pc) {
      const ivory = c(0xe2dccb), ivoryD = c(0xb5ad99), ebony = c(0x1e1a18);
      for (const [x, y] of [[1, 3], [6, 6], [10, 2]]) {
        pc.rect(x, y, 5, 10, OUT);
        pc.rect(x + 1, y + 1, 3, 8, ivory);
        pc.vl(x + 3, y + 1, 8, ivoryD);
      }
      pc.rect(8, 9, 3, 6, OUT); pc.rect(9, 10, 1, 4, ebony); // a black key among them
    },
  },
  small_key: {
    name: 'Small Key',
    desc: 'A small metal key used for a padlock',
    icon(pc) {
      const k = c(0xa8a49c), kd = c(0x6d6a64), kh = c(0xd0ccc4);
      pc.ellipse(5, 8, 3, 3, OUT); pc.ellipse(5, 8, 2, 2, k); pc.px(5, 8, OUT); pc.px(4, 7, kh);
      pc.rect(8, 7, 6, 3, OUT); pc.hl(8, 8, 5, k);
      pc.rect(12, 10, 1, 2, OUT); pc.px(12, 10, kd);
    },
  },
  heavy_key: {
    name: 'Heavy Metal Key',
    desc: 'Heavy metal key. Looks well used.',
    icon(pc) {
      const k = c(0x6f6f73), kd = c(0x45454a), kh = c(0x9a9aa0);
      pc.ellipse(4, 7, 4, 4, OUT); pc.ellipse(4, 7, 3, 3, k); pc.ellipse(4, 7, 1, 1, OUT); pc.px(3, 5, kh);
      pc.rect(8, 5, 8, 5, OUT); pc.rect(8, 6, 7, 3, k); pc.hl(8, 6, 7, kh);
      pc.rect(11, 10, 2, 4, OUT); pc.rect(14, 10, 2, 3, OUT); pc.px(11, 10, kd); pc.px(14, 10, kd);
    },
  },
};

/* ---------- descriptions changed in the editor (src/item-texts.json) ---------- */

import savedTexts from './item-texts.json';

// the description as written above, so the editor can tell what changed (and go back to it)
for (const it of Object.values(ITEMS)) it.defaultDesc = it.desc;

function applyItemTexts(texts) {
  for (const [id, desc] of Object.entries(texts)) if (ITEMS[id]) ITEMS[id].desc = desc;
}
applyItemTexts(savedTexts);

/** in dev, read the file fresh (the bundled copy can be stale after saving from the editor) */
export async function loadItemTexts() {
  if (!import.meta.env.DEV) return;
  try {
    const res = await fetch('/__editor/items');
    if (res.ok) applyItemTexts(await res.json());
  } catch {
    // no dev server: keep the bundled texts
  }
}

/** write the descriptions that differ from items.js to src/item-texts.json (dev server only) */
export async function saveItemTexts() {
  const texts = {};
  for (const [id, it] of Object.entries(ITEMS)) if (it.desc !== it.defaultDesc) texts[id] = it.desc;
  const res = await fetch('/__editor/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(texts),
  });
  const out = await res.json().catch(() => ({ ok: false, error: 'no response' }));
  if (!res.ok || !out.ok) throw new Error(out.error || 'save failed');
}

const iconCache = new Map();
export function itemIcon(id) {
  if (!iconCache.has(id)) {
    const pc = new PC(16, 16);
    ITEMS[id].icon(pc);
    iconCache.set(id, pc.texture());
  }
  return iconCache.get(id);
}
