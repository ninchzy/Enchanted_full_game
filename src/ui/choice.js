import { Container } from 'pixi.js';
import { VIEW_W, VIEW_H } from '../config.js';
import { makeText, windowGraphics, cursorGraphics } from './common.js';

/**
 * A small menu of options (e.g. Investigate / Hide, Yes / No), optionally with a question
 * shown in a text box underneath. W/S choose, SPACE confirms, ESC / TAB cancels.
 */
export class Choice {
  constructor() {
    this.view = new Container();
    this.view.visible = false;
    this.active = false;
    this.time = 0;
  }

  /**
   * `start` picks which option the cursor starts on (e.g. "No" for risky questions);
   * `color` colours the question (someone asking it out loud)
   */
  show(options, onPick, prompt = null, start = 0, color = null) {
    this.view.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.options = options;
    this.onPick = onPick;
    this.sel = start;
    this.active = true;
    this.view.visible = true;

    const boxH = 60, boxY = VIEW_H - boxH - 8;
    if (prompt) {
      this.view.addChild(windowGraphics(8, boxY, VIEW_W - 16, boxH));
      const t = makeText(prompt, { wrap: VIEW_W - 40, ...(color ? { fill: color } : {}) });
      t.x = 20;
      t.y = boxY + 9;
      this.view.addChild(t);
    }
    const labels = options.map((o) => makeText(o, { size: 11 }));
    const w = Math.max(64, Math.ceil(Math.max(...labels.map((l) => l.width))) + 30);
    const h = options.length * 15 + 12;
    const x = VIEW_W - 8 - w, y = (prompt ? boxY : VIEW_H - 8) - h - 4;
    this.view.addChild(windowGraphics(x, y, w, h));
    labels.forEach((l, i) => {
      l.x = x + 18;
      l.y = y + 6 + i * 15;
      this.view.addChild(l);
    });
    this.labels = labels;
    this.cursor = cursorGraphics();
    this.cursorX = x + 9;
    this.top = y + 10;
    this.view.addChild(this.cursor);
    this.place();
  }

  place() {
    this.cursor.x = this.cursorX;
    this.cursor.y = this.top + this.sel * 15;
    this.labels.forEach((l, i) => (l.alpha = i === this.sel ? 1 : 0.55));
  }

  close(result) {
    this.active = false;
    this.view.visible = false;
    const cb = this.onPick;
    this.onPick = null;
    cb?.(result);
  }

  update(dt, input) {
    if (!this.active) return;
    if (input.hit('up')) { this.sel = (this.sel + this.options.length - 1) % this.options.length; this.place(); }
    else if (input.hit('down')) { this.sel = (this.sel + 1) % this.options.length; this.place(); }
    else if (input.hit('ok')) this.close(this.options[this.sel]);
    else if (input.hit('cancel') || input.hit('menu')) this.close(null);
  }
}
