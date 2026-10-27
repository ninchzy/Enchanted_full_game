import { Container, CanvasTextMetrics } from 'pixi.js';
import { VIEW_W, VIEW_H, FONT } from '../config.js';
import { makeText, windowGraphics, arrowGraphics, TEXT_COL, ITEM_COL } from './common.js';

const CHARS_PER_SEC = 48;
const MAX_LINES = 3; // what fits in the box

/**
 * Split a page into what the typewriter reveals one at a time: a letter together with any
 * accent marks stacked on it (the chanting is full of them), or a whole style tag such as
 * <item>, which shows up instantly.
 */
function tokens(text) {
  return text.match(/<\/?\w+>|.[̀-ͯ҃-҉᷀-᷿⃐-⃿︠-︯]*/gsu) ?? [];
}

/** the first `n` letters of a page, with any tag left open closed again */
function reveal(toks, n) {
  let out = '', shown = 0;
  const open = [];
  for (const t of toks) {
    const tag = t.match(/^<(\/?)(\w+)>$/);
    if (tag) {
      if (tag[1]) open.pop();
      else open.push(tag[2]);
      out += t;
      continue;
    }
    if (shown >= n) break;
    out += t;
    shown++;
  }
  return out + open.reverse().map((t) => `</${t}>`).join('');
}

/**
 * Bottom-of-screen message box with a typewriter effect. SPACE (and only SPACE) skips /
 * advances.
 * A page is a string, or { text, color, shake } for someone speaking (see VOICE in
 * common.js); `shake` makes the words tremble.
 * <item>…</item> inside a page shows a found item's name in bold yellow; <b>…</b> is just bold.
 */
export class Dialogue {
  constructor() {
    this.view = new Container();
    this.view.visible = false;
    const x = 8, w = VIEW_W - 16, h = 60, y = VIEW_H - h - 8;
    this.view.addChild(windowGraphics(x, y, w, h));
    this.text = makeText('', { wrap: w - 24 });
    this.text.style.tagStyles = { item: { fill: ITEM_COL, fontWeight: 'bold' }, b: { fontWeight: 'bold' } };
    this.text.style.padding = 8; // room for the marks piled above and below the chanting
    // the pixel font has no accent marks: letters carrying them fall back to a plain
    // monospace font instead of the browser's serif default
    this.text.style.fontFamily = [FONT, 'Consolas', 'monospace'];
    this.text.x = this.textX = x + 12;
    this.text.y = this.textY = y + 9;
    this.view.addChild(this.text);
    this.arrow = arrowGraphics();
    this.arrow.x = x + w - 14;
    this.arrow.y = y + h - 10;
    this.view.addChild(this.arrow);
    this.active = false;
    this.time = 0;
  }

  show(pages, onDone) {
    this.pages = (Array.isArray(pages) ? pages : [pages])
      .map((p) => (typeof p === 'string' ? { text: p } : p))
      .flatMap((p) => this.fit(p));
    this.onDone = onDone;
    this.active = true;
    this.view.visible = true;
    this.open(0);
  }

  /** a page too long for the box (more than MAX_LINES lines) becomes several, split between words */
  fit(page) {
    if (/<\/?\w+>/.test(page.text)) return [page]; // item messages are short
    const lines = (s) => CanvasTextMetrics.measureText(s, this.text.style).lines.length;
    if (lines(page.text) <= MAX_LINES) return [page];
    const out = [];
    let words = page.text.split(' ');
    while (words.length) {
      let n = words.length;
      while (n > 1 && lines(words.slice(0, n).join(' ')) > MAX_LINES) n--;
      out.push({ ...page, text: words.slice(0, n).join(' ') });
      words = words.slice(n);
    }
    return out;
  }

  open(i) {
    this.page = i;
    this.shown = 0;
    const p = this.pages[i];
    this.toks = tokens(p.text);
    this.count = this.toks.filter((t) => !/^<\/?\w+>$/.test(t)).length;
    this.text.style.fill = p.color ?? TEXT_COL;
    this.text.text = '';
    this.shake = !!p.shake;
    this.text.x = this.textX;
    this.text.y = this.textY;
  }

  update(dt, input) {
    if (!this.active) return;
    this.time += dt;
    if (this.shown < this.count) {
      this.shown = Math.min(this.count, this.shown + dt * CHARS_PER_SEC);
      this.text.text = reveal(this.toks, Math.floor(this.shown));
    }
    const done = this.shown >= this.count;
    this.arrow.visible = done && Math.floor(this.time * 3) % 2 === 0;
    if (this.shake) {
      // trembling text: a jolt of a pixel or so every frame
      this.text.x = this.textX + Math.round((Math.random() - 0.5) * 3);
      this.text.y = this.textY + Math.round((Math.random() - 0.5) * 3);
    }

    if (input.hitKey('Space')) {
      if (!done) {
        this.shown = this.count;
        this.text.text = this.pages[this.page].text;
      } else if (this.page < this.pages.length - 1) {
        this.open(this.page + 1);
      } else {
        this.active = false;
        this.view.visible = false;
        const cb = this.onDone;
        this.onDone = null;
        cb?.();
      }
    }
  }
}
