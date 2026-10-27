import { Container } from 'pixi.js';
import { VIEW_W } from '../config.js';
import { makeText, cursorGraphics, TEXT_COL, DIM_COL } from './common.js';

/**
 * A column of options centred on the screen, the way the title screen shows them: plain
 * text, no boxes, a cursor beside the selected one. Greyed-out options (`enabled: false`)
 * are skipped. W/S choose, SPACE picks; clicking an option picks it too.
 */
export class MenuList {
  /** `items`: [{ label, enabled }]; `onPick(label)` */
  constructor(items, { y, line = 16, size = 12, sel = 0, onPick }) {
    this.view = new Container();
    this.onPick = onPick;
    this.active = true; // clicks only count while the menu is the one being used
    this.items = items.map((o, i) => {
      const enabled = o.enabled ?? true;
      const t = makeText(o.label, { size, fill: enabled ? TEXT_COL : DIM_COL });
      t.x = Math.round((VIEW_W - t.width) / 2);
      t.y = y + i * line;
      t.eventMode = 'static';
      t.cursor = enabled ? 'pointer' : 'default';
      t.on('pointertap', () => {
        if (!enabled || !this.active) return;
        this.sel = i;
        this.place();
        this.pick();
      });
      this.view.addChild(t);
      return { label: o.label, enabled, text: t };
    });
    this.cursor = cursorGraphics();
    this.view.addChild(this.cursor);
    this.sel = sel;
    if (!this.items[sel].enabled) this.move(1);
    this.place();
  }

  place() {
    const t = this.items[this.sel].text;
    this.cursor.x = t.x - 10;
    this.cursor.y = t.y + 5;
    this.items.forEach((o, i) => (o.text.alpha = !o.enabled ? 0.4 : i === this.sel ? 1 : 0.6));
  }

  move(d) {
    const n = this.items.length;
    for (let k = 1; k <= n; k++) {
      const i = (this.sel + d * k + n * 2) % n;
      if (this.items[i].enabled) {
        this.sel = i;
        break;
      }
    }
    this.place();
  }

  pick() {
    this.onPick(this.items[this.sel].label);
  }

  update(input) {
    if (input.hit('up')) this.move(-1);
    else if (input.hit('down')) this.move(1);
    else if (input.hit('ok')) this.pick();
  }
}
