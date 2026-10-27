import { Container, Graphics, Sprite, CanvasTextMetrics, TextStyle } from 'pixi.js';
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { BLOOD } from '../gfx/palette.js';
import { rng, PC } from '../gfx/pixel.js';
import { makeText, DIM_COL, TEXT_COL } from './common.js';

// one sheet of paper in the middle of the screen, arrows either side
const SHEET_W = 236, SHEET_H = 200;
const SHEET_X = Math.round((VIEW_W - SHEET_W) / 2), SHEET_Y = 20;
const PAD_X = 12, PAD_Y = 11;
const TEXT_W = SHEET_W - PAD_X * 2, TEXT_H = SHEET_H - PAD_Y * 2;
const SIZE = 7, LINE = 9;
const INK = '#33291f';
// the sheet's pixel colours
const PAPER = '#d6cdb6', PAPER_WORN = '#c8bc9f', PAPER_EDGE = '#b3a585';
const RULE = '#bfbcb1', CREASE = '#ad9f84', CREASE_HI = '#e6dfcc';
const OIL = '#c9ba95', OIL_RING = '#ae9b72';
const DIRT = '#b2a68b', GRIT = '#6e6352', GRIT_DK = '#4f463a';
const BLOT = '#2a201a', SCRIBBLE = '#2b221b';

const measureStyle = new TextStyle({ fontFamily: FONT, fontSize: SIZE, lineHeight: LINE, wordWrap: true, wordWrapWidth: TEXT_W, breakWords: true });
const fits = (s) => CanvasTextMetrics.measureText(s, measureStyle).height <= TEXT_H;

/** lay entries out on pages: each entry starts a new page and runs on for as long as it needs */
function paginate(entries) {
  const pages = [];
  for (const entry of entries) {
    let page = '';
    const flush = () => {
      pages.push({ text: page.replace(/^\n+/, '').replace(/\n+$/, ''), messy: entry.messy, scribbles: entry.scribbles });
      page = '';
    };
    for (const para of entry.text.split('\n')) {
      const withPara = page + (page ? '\n' : '') + para;
      if (fits(withPara)) {
        page = withPara;
        continue;
      }
      // the paragraph runs over the page: fill word by word
      let first = true;
      for (const word of para.split(' ')) {
        const next = page + (first ? (page ? '\n' : '') : ' ') + word;
        if (fits(next)) page = next;
        else {
          flush();
          page = word;
        }
        first = false;
      }
    }
    flush();
  }
  return pages;
}

/**
 * Fill an irregular blob pixel by pixel. `shape(px, py, k)` decides each pixel's colour
 * from k: 0 at the middle, 1 at the edge (null leaves it as it is).
 */
function blob(pc, r, cx, cy, rx, ry, shape) {
  const p1 = r() * 6.28, p2 = r() * 6.28, a1 = 0.12 + r() * 0.12, a2 = 0.06 + r() * 0.1;
  for (let y = Math.floor(cy - ry * 1.4); y <= cy + ry * 1.4; y++)
    for (let x = Math.floor(cx - rx * 1.4); x <= cx + rx * 1.4; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry, t = Math.atan2(dy, dx);
      const edge = 1 + Math.sin(2 * t + p1) * a1 + Math.sin(3 * t + p2) * a2;
      const k = Math.hypot(dx, dy) / edge;
      if (k > 1) continue;
      const col = shape(x, y, k);
      if (col) pc.px(x, y, col);
    }
}

const sheetCache = new Map();

/**
 * The sheet itself, aged and stained differently for every page, drawn as pixel art at
 * the game's own pixel size so it sits with everything else.
 */
function drawSheet(page, index) {
  if (sheetCache.has(index)) return new Sprite(sheetCache.get(index));
  const r = rng(1000 + index * 97);
  const w = SHEET_W, h = SHEET_H;
  const pc = new PC(w + 4, h + 5);
  // shadow, then the paper
  pc.rect(4, 5, w, h, 'rgba(0,0,0,0.5)');
  pc.rect(0, 0, w, h, PAPER);
  // yellowed and worn towards the edges, a few pixels nibbled off
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const d = Math.min(x, y, w - 1 - x, h - 1 - y);
      if (d > 4) continue;
      if (d === 0 && r() < 0.18) pc.ctx.clearRect(x, y, 1, 1);
      else if (r() < 0.75 - d * 0.16) pc.px(x, y, d < 2 ? PAPER_EDGE : PAPER_WORN);
    }
  // faint ruled lines under the writing, a pixel missing here and there
  for (let ly = PAD_Y + LINE - 1; ly < h - 6; ly += LINE)
    for (let x = 6; x < w - 6; x++) if (r() > 0.06) pc.px(x, ly, RULE);
  // the crease where it was folded
  const fold = Math.round(h * 0.52);
  pc.hl(2, fold, w - 4, CREASE);
  pc.hl(2, fold + 1, w - 4, CREASE_HI);

  const at = () => [14 + Math.floor(r() * (w - 28)), 14 + Math.floor(r() * (h - 28))];
  // oil stains: a darker patch with a ring where it dried
  const oil = 1 + Math.floor(r() * 2);
  for (let i = 0; i < oil; i++) {
    const [cx, cy] = at(), rad = 7 + r() * 12;
    blob(pc, r, cx, cy, rad, rad * (0.7 + r() * 0.4), (x, y, k) => (k > 0.84 ? OIL_RING : OIL));
  }
  // dirt: a smudged thumbprint and grit
  if (r() < 0.75) {
    const [cx, cy] = at();
    blob(pc, r, cx, cy, 6 + r() * 4, 4 + r() * 3, (x, y) => ((x + y) % 2 ? DIRT : null));
    for (let k = 0; k < 16; k++) pc.px(cx - 10 + Math.floor(r() * 20), cy - 8 + Math.floor(r() * 16), r() < 0.5 ? GRIT : GRIT_DK);
  }
  // blood, on the pages where blood was spilled: dried long ago, soaked into the paper
  if (/stab|blood|knife|screech|dagger|red as/i.test(page.text)) {
    const cx = Math.round(w * (0.55 + r() * 0.35)), cy = Math.round(h * (0.1 + r() * 0.6));
    blob(pc, r, cx, cy, 8 + r() * 4, 6 + r() * 3, (x, y, k) => (k > 0.62 ? ((x * 3 + y) % 3 === 0 ? BLOOD.deep : null) : k > 0.3 ? BLOOD.deep : BLOOD.dark));
    for (let k = 0; k < 8; k++) {
      // drops flung mostly one way
      const a = -Math.PI / 2 + (r() - 0.5) * 2.4, d = 9 + r() * 14;
      const x = Math.round(cx + Math.cos(a) * d), y = Math.round(cy + Math.sin(a) * d);
      if (r() < 0.4) pc.rect(x, y, 2, 2, BLOOD.deep);
      else pc.px(x, y, BLOOD.deep);
    }
    // a smear where a finger dragged through it
    const sl = 10 + Math.floor(r() * 14);
    for (let i = 0; i < sl; i++) if (r() > i / sl - 0.2) pc.px(cx + 3 + i, cy + 2 + Math.round(i * 0.2), BLOOD.deep);
  }
  if (page.messy) {
    // a shaking hand: ink blots
    for (let k = 0; k < 4; k++) {
      const [cx, cy] = at();
      pc.px(cx, cy, BLOT);
      if (r() < 0.5) pc.rect(cx, cy, 2, 2, BLOT);
    }
  }
  if (page.scribbles) {
    // angry pen strokes slashed back and forth across the lower half
    const top = Math.round(h * 0.56), bottom = h - 12;
    const strokes = 7 + Math.floor(r() * 4);
    for (let s = 0; s < strokes; s++) {
      let x = 12 + r() * (w - 24), y = top + r() * (bottom - top);
      let dirX = r() < 0.5 ? -1 : 1, dirY = r() < 0.5 ? -1 : 1;
      const segs = 7 + Math.floor(r() * 9);
      for (let i = 0; i < segs; i++) {
        // jagged back-and-forth: up, down, up... drifting sideways, turning back at times
        dirY = -dirY;
        if (r() < 0.25) dirX = -dirX;
        const nx = Math.max(10, Math.min(w - 10, x + dirX * (6 + r() * 22)));
        const ny = Math.max(top, Math.min(bottom, y + dirY * (8 + r() * 22)));
        pc.line(Math.round(x), Math.round(y), Math.round(nx), Math.round(ny), SCRIBBLE);
        if (r() < 0.45) pc.line(Math.round(x), Math.round(y) + 1, Math.round(nx), Math.round(ny) + 1, SCRIBBLE); // pressed hard
        x = nx;
        y = ny;
      }
    }
  }
  const tex = pc.texture();
  sheetCache.set(index, tex);
  return new Sprite(tex);
}

/**
 * The diary held up in the middle of the darkened screen, one sheet at a time. A / D (or
 * the arrow keys) turn the page; SPACE turns forward too and closes after the last one;
 * ESC closes it. Above the sheet: which page this is, out of how many.
 */
export class BookView {
  constructor() {
    this.view = new Container();
    this.view.visible = false;
    this.active = false;
  }

  show(entries) {
    this.pages = paginate(entries);
    this.page = 0;
    this.time = 0;
    this.view.visible = true;
    this.active = true;
    this.build();
  }

  hide() {
    this.view.visible = false;
    this.active = false;
  }

  build() {
    this.view.removeChildren().forEach((ch) => ch.destroy({ children: true }));
    this.view.addChild(new Graphics().rect(0, 0, VIEW_W, VIEW_H).fill({ color: 0x000000, alpha: 0.85 }));

    const page = this.pages[this.page];
    const sheet = drawSheet(page, this.page);
    sheet.position.set(SHEET_X, SHEET_Y);
    this.view.addChild(sheet);
    const t = makeText(page.text, { size: SIZE, lineHeight: LINE, wrap: TEXT_W, fill: INK });
    t.style.dropShadow = false;
    t.x = SHEET_X + PAD_X;
    t.y = SHEET_Y + PAD_Y;
    if (page.messy) t.rotation = -0.012;
    this.view.addChild(t);

    const count = makeText(`${this.page + 1} out of ${this.pages.length}`, { size: 10 });
    count.x = Math.round((VIEW_W - count.width) / 2);
    count.y = 5;
    this.view.addChild(count);

    // A / D with arrows either side of the sheet
    const arrow = (cx, dir, label, on) => {
      const c = new Container();
      const a = new Graphics();
      const cy = SHEET_Y + SHEET_H / 2 + 6;
      a.poly(dir < 0 ? [cx + 4, cy - 7, cx - 4, cy, cx + 4, cy + 7] : [cx - 4, cy - 7, cx + 4, cy, cx - 4, cy + 7]).fill({ color: 0xd9d3c7 });
      const l = makeText(label, { size: 11, fill: TEXT_COL });
      l.x = Math.round(cx - l.width / 2);
      l.y = cy - 26;
      c.addChild(a, l);
      c.alpha = on ? 1 : 0.25;
      return c;
    };
    const side = SHEET_X / 2;
    this.view.addChild(
      arrow(Math.round(side), -1, 'A', this.page > 0),
      arrow(Math.round(VIEW_W - side), 1, 'D', this.page < this.pages.length - 1),
    );

    const hint = makeText('ESC to close', { size: 9, fill: DIM_COL });
    hint.x = Math.round((VIEW_W - hint.width) / 2);
    hint.y = VIEW_H - 14;
    this.view.addChild(hint);
  }

  turn(d) {
    const p = Math.max(0, Math.min(this.pages.length - 1, this.page + d));
    if (p === this.page) return false;
    this.page = p;
    this.build();
    return true;
  }

  update(dt, input) {
    this.time += dt;
    if (this.time < 0.15) return; // the key press that opened it
    if (input.hit('right')) this.turn(1);
    else if (input.hit('left')) this.turn(-1);
    else if (input.hit('ok')) {
      if (!this.turn(1)) this.hide();
    } else if (input.hit('cancel') || input.hit('menu')) this.hide();
  }
}
