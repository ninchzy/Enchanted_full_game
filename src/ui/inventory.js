import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { VIEW_W, VIEW_H } from '../config.js';
import { ITEMS, itemIcon } from '../items.js';
import { makeText, windowGraphics, cursorGraphics, DIM_COL, TEXT_COL, VOICE } from './common.js';

const COLS = 2;
const ROWS = 6;
const SLOT_W = 146;
const SLOT_H = 20;
const GRID_X = 14;
const GRID_Y = 42;
/** items that can't be used on anything are listed in this colour */
export const KEEPSAKE_COL = VOICE.seeker;

/** what SPACE offers for an item: Inspect only for notes, Use only for usable items */
function optionsFor(id) {
  const it = ITEMS[id];
  return [...(it.note ? ['Inspect'] : []), ...(it.usable !== false ? ['Use'] : [])];
}

/**
 * TAB menu. WASD moves through the item grid; the line at the bottom describes the
 * selected item. SPACE opens a pop-up with what can be done with it (Use, and Inspect for
 * notes); items that can't be used (blue-grey) and have nothing to read offer nothing.
 * TAB or ESC backs out.
 */
export class InventoryUI {
  constructor(game) {
    this.game = game;
    this.view = new Container();
    this.view.visible = false;
    this.open = false;

    const dim = new Graphics().rect(0, 0, VIEW_W, VIEW_H).fill({ color: 0x000000, alpha: 0.55 });
    this.view.addChild(dim);

    this.view.addChild(windowGraphics(8, 8, 90, 24));
    const title = makeText('Inventory');
    title.x = 18;
    title.y = 12;
    this.view.addChild(title);

    this.view.addChild(windowGraphics(8, 34, VIEW_W - 16, SLOT_H * ROWS + 16));

    this.highlight = new Graphics();
    this.view.addChild(this.highlight);

    this.slots = [];
    for (let i = 0; i < COLS * ROWS; i++) {
      const col = i % COLS, row = Math.floor(i / COLS);
      const x = GRID_X + col * SLOT_W, y = GRID_Y + row * SLOT_H;
      const icon = new Sprite();
      icon.x = x + 4;
      icon.y = y + 2;
      const label = makeText('', { size: 11 });
      label.x = x + 24;
      label.y = y + 3;
      this.view.addChild(icon, label);
      this.slots.push({ x, y, icon, label });
    }

    const descY = 34 + SLOT_H * ROWS + 20;
    this.view.addChild(windowGraphics(8, descY, VIEW_W - 16, VIEW_H - descY - 8));
    this.desc = makeText('', { wrap: VIEW_W - 40 });
    this.desc.x = 20;
    this.desc.y = descY + 9;
    this.view.addChild(this.desc);

    // Inspect / Use pop-up (built for the item it is opened on)
    this.popup = new Container();
    this.popup.visible = false;
    this.view.addChild(this.popup);

    this.sel = 0;
    this.choice = 0;
    this.time = 0;
  }

  show() {
    this.open = true;
    this.view.visible = true;
    this.popup.visible = false;
    this.sel = Math.min(this.sel, COLS * ROWS - 1);
    this.refresh();
  }

  hide() {
    this.open = false;
    this.view.visible = false;
    this.popup.visible = false;
  }

  itemAt(i) {
    return this.game.inventory[i] ?? null;
  }

  refresh() {
    this.slots.forEach((s, i) => {
      const id = this.itemAt(i);
      s.icon.texture = id ? itemIcon(id) : Texture.EMPTY;
      s.icon.visible = !!id;
      s.label.text = id ? ITEMS[id].name : '';
      s.label.style.fill = id && ITEMS[id].usable === false ? KEEPSAKE_COL : TEXT_COL;
    });
    const id = this.itemAt(this.sel);
    this.desc.text = id ? ITEMS[id].desc : '';
    if (!this.game.inventory.length) {
      this.desc.text = 'You are not carrying anything.';
      this.desc.style.fill = DIM_COL;
    } else this.desc.style.fill = '#d9d3c7';
  }

  update(dt, input) {
    this.time += dt;
    const s = this.slots[this.sel];
    const pulse = 0.18 + Math.sin(this.time * 5) * 0.07;
    this.highlight.clear();
    this.highlight.rect(s.x, s.y, SLOT_W - 4, SLOT_H - 1).fill({ color: 0xd9d3c7, alpha: pulse });
    this.highlight.rect(s.x, s.y, SLOT_W - 4, 1).fill({ color: 0xd9d3c7, alpha: 0.5 });
    this.highlight.rect(s.x, s.y + SLOT_H - 2, SLOT_W - 4, 1).fill({ color: 0xd9d3c7, alpha: 0.5 });

    if (this.popup.visible) {
      if (input.hit('up') || input.hit('down')) {
        this.choice = (this.choice + 1) % this.options.length;
        this.placeCursor();
      } else if (input.hit('ok')) {
        const id = this.itemAt(this.sel);
        this.popup.visible = false;
        if (this.options[this.choice] === 'Inspect') {
          this.game.note.show(ITEMS[id].note);
        } else {
          this.hide();
          this.game.useItem(id);
        }
      } else if (input.hit('cancel') || input.hit('menu')) {
        this.popup.visible = false;
      }
      return;
    }

    const col = this.sel % COLS, row = Math.floor(this.sel / COLS);
    let moved = false;
    if (input.hit('left') && col > 0) { this.sel--; moved = true; }
    if (input.hit('right') && col < COLS - 1) { this.sel++; moved = true; }
    if (input.hit('up') && row > 0) { this.sel -= COLS; moved = true; }
    if (input.hit('down') && row < ROWS - 1) { this.sel += COLS; moved = true; }
    if (moved) this.refresh();

    if (input.hit('ok') && this.itemAt(this.sel)) {
      if (optionsFor(this.itemAt(this.sel)).length) this.openPopup(this.itemAt(this.sel), s);
    } else if (input.hit('cancel') || input.hit('menu')) {
      this.hide();
    }
  }

  openPopup(id, slot) {
    this.options = optionsFor(id);
    this.popup.removeChildren().forEach((ch) => ch.destroy());
    const h = this.options.length * 15 + 12;
    this.popup.addChild(windowGraphics(0, 0, 64, h));
    this.popupLabels = this.options.map((o, i) => {
      const t = makeText(o, { size: 11 });
      t.x = 16;
      t.y = 6 + i * 15;
      this.popup.addChild(t);
      return t;
    });
    this.popupCursor = cursorGraphics();
    this.popup.addChild(this.popupCursor);
    this.choice = 0;
    this.popup.x = Math.min(slot.x + 90, VIEW_W - 72);
    this.popup.y = Math.min(slot.y + 4, VIEW_H - h - 8);
    this.popup.visible = true;
    this.placeCursor();
  }

  placeCursor() {
    this.popupCursor.x = 8;
    this.popupCursor.y = 10 + this.choice * 15;
    this.popupLabels.forEach((l, i) => (l.alpha = i === this.choice ? 1 : 0.55));
  }
}
