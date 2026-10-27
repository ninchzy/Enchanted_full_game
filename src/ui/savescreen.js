import { Container, Graphics, Sprite } from 'pixi.js';
import { VIEW_W, VIEW_H } from '../config.js';
import { PC } from '../gfx/pixel.js';
import { c, OUT } from '../gfx/palette.js';
import { BONE, SKULL_FRONT, TORSO_FRONT } from '../gfx/characters.js';
import { MAPS } from '../maps/index.js';
import { SLOTS, listSaves, formatPlaytime } from '../saves.js';
import { makeText, windowGraphics, TEXT_COL, DIM_COL } from './common.js';
import { Choice } from './choice.js';

const SLOT_H = 62;
const TOP = 30;
const STEP = SLOT_H + 4;
const VISIBLE = 3; // files on screen at once; the list scrolls to keep the selected one in view

let portraitTex = null;
/** the skeleton's face, like the character portraits in classic save screens */
function portrait() {
  if (portraitTex) return portraitTex;
  const body = new PC(24, 26);
  body.pattern(TORSO_FRONT, BONE, 0, 13);
  body.pattern(SKULL_FRONT, BONE, 0, 1);
  const pc = new PC(44, 44);
  pc.rect(0, 0, 44, 44, OUT);
  pc.rect(1, 1, 42, 42, c(0x2c3434));
  for (let y = 1; y < 43; y += 2) pc.hl(1, y, 42, c(0x323b3b));
  // head and shoulders, shown at twice the size
  pc.ctx.imageSmoothingEnabled = false;
  pc.ctx.drawImage(body.canvas, 2, 0, 20, 22, 2, 2, 40, 44);
  portraitTex = pc.texture();
  return portraitTex;
}

/** muted teal checkerboard behind the save files */
function checker() {
  const g = new Graphics();
  g.rect(0, 0, VIEW_W, VIEW_H).fill({ color: 0x172222 });
  for (let y = 0; y < VIEW_H; y += 12)
    for (let x = (y / 12) % 2 ? 12 : 0; x < VIEW_W; x += 24) g.rect(x, y, 12, 12).fill({ color: 0x1f2e2e });
  return g;
}

/**
 * The list of save files. In 'load' mode (Continue on the title screen, Load Save in the ESC
 * menu) you pick a file to play; in 'save' mode (the book on the upper floor) you pick a slot
 * to write to.
 */
export class SaveScreen {
  constructor(game) {
    this.game = game;
    this.view = new Container();
    this.view.visible = false;
    this.open = false;
    this.confirm = new Choice();
    this.time = 0;
    this.scroll = 0;
    // the mouse wheel scrolls through the files too
    window.addEventListener('wheel', (e) => {
      if (!this.open || this.confirm.active || this.closing || this.game.editor?.isOpen) return;
      this.move(e.deltaY > 0 ? 1 : -1, false);
    });
  }

  show(mode) {
    this.mode = mode;
    this.open = true;
    this.view.visible = true;
    this.sel = 0;
    this.closing = 0;
    this.saves = listSaves();
    if (mode === 'load') {
      const first = this.saves.findIndex(Boolean);
      this.sel = Math.max(0, first);
    }
    this.scroll = 0;
    this.build();
  }

  hide() {
    this.open = false;
    this.view.visible = false;
    this.confirm.active = false;
    this.confirm.view.visible = false; // a question left open goes with it
  }

  build() {
    this.view.removeChild(this.confirm.view); // reused, not rebuilt
    this.view.removeChildren().forEach((ch) => ch.destroy({ children: true }));
    this.view.addChild(checker());
    this.view.addChild(windowGraphics(8, 5, VIEW_W - 16, 21));
    this.header = makeText(this.mode === 'load' ? 'Load which file?' : 'Save to which file?', { size: 11 });
    this.header.x = 18;
    this.header.y = 10;
    this.view.addChild(this.header);
    // which files are showing, with arrows when there are more above or below
    this.range = makeText('', { size: 9, fill: DIM_COL });
    this.arrows = new Graphics();
    this.view.addChild(this.range, this.arrows);

    // the files, in a list that scrolls behind a window three files tall
    this.list = new Container();
    const mask = new Graphics().rect(0, TOP, VIEW_W, VISIBLE * STEP - 4).fill({ color: 0xffffff });
    this.list.mask = mask;
    this.view.addChild(mask, this.list);

    this.slots = [];
    for (let i = 0; i < SLOTS; i++) {
      const y = TOP + i * STEP;
      const data = this.saves[i];
      const box = windowGraphics(8, y, VIEW_W - 16, SLOT_H);
      box.eventMode = 'static';
      box.cursor = 'pointer';
      box.on('pointertap', () => {
        this.sel = i;
        this.place();
        this.pick();
      });
      this.list.addChild(box);
      // "File N" with a frame around it when selected
      const frame = new Graphics();
      const label = makeText(`File ${i + 1}`, { size: 11, fill: data || this.mode === 'save' ? TEXT_COL : DIM_COL });
      label.x = 20;
      label.y = y + 7;
      this.list.addChild(frame, label);
      if (data) {
        const where = makeText(MAPS[data.player?.map]?.name ?? 'Somewhere in the house', { size: 11 });
        where.x = 20;
        where.y = y + 32;
        const face = new Sprite(portrait());
        face.x = 168;
        face.y = y + 10;
        const time = makeText(formatPlaytime(data.playtime), { size: 11 });
        time.x = VIEW_W - 22 - Math.ceil(time.width);
        time.y = y + SLOT_H - 20;
        this.list.addChild(where, face, time);
      } else {
        const empty = makeText(this.mode === 'save' ? '(empty: a new save)' : '(empty)', { size: 10, fill: DIM_COL });
        empty.x = 20;
        empty.y = y + 30;
        this.list.addChild(empty);
      }
      this.slots.push({ y, frame, label, data });
    }
    const hint = makeText('W/S choose · SPACE confirm · ESC back', { size: 9, fill: DIM_COL });
    hint.x = Math.round((VIEW_W - hint.width) / 2);
    hint.y = VIEW_H - 13;
    this.view.addChild(hint);
    // everything behind a question goes dark, so the question stands out
    this.dim = new Graphics().rect(0, 0, VIEW_W, VIEW_H).fill({ color: 0x000000, alpha: 0.72 });
    this.dim.visible = false;
    this.view.addChild(this.dim);
    this.view.addChild(this.confirm.view);
    this.place();
  }

  place() {
    // scroll just enough to keep the selected file on screen
    if (this.sel < this.scroll) this.scroll = this.sel;
    if (this.sel >= this.scroll + VISIBLE) this.scroll = this.sel - VISIBLE + 1;
    this.list.y = -this.scroll * STEP;
    const last = Math.min(SLOTS, this.scroll + VISIBLE);
    this.range.text = `${this.scroll + 1}-${last} of ${SLOTS}`;
    this.range.x = VIEW_W - 34 - Math.ceil(this.range.width);
    this.range.y = 11;
    const g = this.arrows.clear();
    const ax = VIEW_W - 24, up = this.scroll > 0, down = last < SLOTS;
    g.poly([ax, 14, ax + 3, 10, ax + 6, 14]).fill({ color: 0xd9d3c7, alpha: up ? 1 : 0.2 });
    g.poly([ax, 17, ax + 3, 21, ax + 6, 17]).fill({ color: 0xd9d3c7, alpha: down ? 1 : 0.2 });

    this.slots.forEach((s, i) => {
      s.frame.clear();
      if (i !== this.sel) return;
      const w = Math.ceil(s.label.width) + 10;
      s.frame.rect(15, s.y + 5, w, 17).fill({ color: 0xd9d3c7, alpha: 0.12 });
      s.frame.rect(15, s.y + 5, w, 1).fill({ color: 0xd9d3c7 });
      s.frame.rect(15, s.y + 21, w, 1).fill({ color: 0xd9d3c7 });
      s.frame.rect(15, s.y + 5, 1, 17).fill({ color: 0xd9d3c7 });
      s.frame.rect(15 + w - 1, s.y + 5, 1, 17).fill({ color: 0xd9d3c7 });
    });
  }

  selectable(i) {
    return this.mode === 'save' || !!this.saves[i];
  }

  /** to the next file that can be picked; W/S wrap round the ends, the mouse wheel doesn't */
  move(d, wrap = true) {
    for (let k = 1; k <= SLOTS; k++) {
      const raw = this.sel + d * k;
      if (!wrap && (raw < 0 || raw >= SLOTS)) break;
      const i = (raw + SLOTS * 2) % SLOTS;
      if (this.selectable(i)) {
        this.sel = i;
        break;
      }
    }
    this.place();
  }

  pick() {
    const i = this.sel;
    if (!this.selectable(i) || this.closing) return;
    if (this.mode === 'load') {
      // from the ESC menu, the game being played is thrown away
      if (this.game.mode !== 'play') return this.game.loadSave(i + 1);
      this.confirm.show(['Yes', 'No'], (p) => p === 'Yes' && this.game.loadSave(i + 1), 'Load this file? All unsaved progress will be lost.', 1);
      this.dim.visible = true;
      return;
    }
    const write = () => {
      this.game.saveTo(i + 1);
      this.saves = listSaves();
      this.build();
      this.header.text = `Saved to File ${i + 1}.`;
      this.closing = 1.1; // close by itself after a moment
    };
    if (this.saves[i]) {
      this.confirm.show(['Yes', 'No'], (p) => p === 'Yes' && write(), 'Override this slot?', 1);
      this.dim.visible = true;
    } else write();
  }

  close() {
    this.hide();
    // (from the ESC menu, its menu is still open underneath)
    if (this.mode === 'load' && this.game.mode === 'title') this.game.title.show('menu');
  }

  update(dt, input) {
    this.time += dt;
    if (this.closing) {
      this.closing -= dt;
      if (this.closing <= 0 || input.hit('ok') || input.hit('cancel')) this.close();
      return;
    }
    if (this.confirm.active) {
      this.confirm.update(dt, input);
      this.dim.visible = this.confirm.active;
      return;
    }
    this.dim.visible = false;
    if (input.hit('up')) this.move(-1);
    else if (input.hit('down')) this.move(1);
    else if (input.hit('ok')) this.pick();
    else if (input.hit('cancel') || input.hit('menu')) this.close();
  }
}
