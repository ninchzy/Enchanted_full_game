import { Container, Graphics } from 'pixi.js';
import { VIEW_W, VIEW_H } from '../config.js';
import { makeText, windowGraphics, DIM_COL } from './common.js';
import { isTyping } from '../input.js';

const SLOTS = 4;
const SLOT_W = 30, SLOT_H = 38, GAP = 8;

/**
 * A combination lock filling the screen: four slots that show the digits typed on the
 * keyboard (digits only; Backspace takes one back). SPACE tries the code: right calls
 * onSolve, wrong says "Nothing happened." underneath. ESC walks away.
 */
export class CodeLock {
  constructor() {
    this.view = new Container();
    this.view.visible = false;
    this.active = false;
    this.digits = '';
    // digits and Backspace come straight from the keyboard (the game's controls don't have them)
    window.addEventListener('keydown', (e) => {
      if (!this.active || isTyping(e)) return;
      if (/^[0-9]$/.test(e.key)) {
        // after a wrong try, the next digit starts over
        if (this.digits.length >= SLOTS) {
          if (!this.message.text) return;
          this.digits = '';
        }
        this.digits += e.key;
        this.message.text = '';
        this.draw();
      } else if (e.key === 'Backspace') {
        this.digits = this.digits.slice(0, -1);
        this.message.text = '';
        this.draw();
      } else if (e.key === 'Escape') this.leave = true;
    });
  }

  show({ code, onSolve }) {
    this.code = code;
    this.onSolve = onSolve;
    this.digits = '';
    this.leave = false;
    this.time = 0;
    this.view.removeChildren().forEach((ch) => ch.destroy());
    this.view.addChild(new Graphics().rect(0, 0, VIEW_W, VIEW_H).fill({ color: 0x000000, alpha: 0.92 }));

    const total = SLOTS * SLOT_W + (SLOTS - 1) * GAP;
    this.x0 = Math.round((VIEW_W - total) / 2);
    this.y0 = Math.round(VIEW_H / 2 - SLOT_H / 2) - 8;
    this.view.addChild(windowGraphics(this.x0 - 16, this.y0 - 14, total + 32, SLOT_H + 42));
    const confirm = makeText('Press SPACE to confirm', { size: 9, fill: DIM_COL });
    confirm.x = Math.round((VIEW_W - confirm.width) / 2);
    confirm.y = this.y0 + SLOT_H + 8;
    this.view.addChild(confirm);

    this.slots = new Graphics();
    this.view.addChild(this.slots);
    this.nums = [];
    for (let i = 0; i < SLOTS; i++) {
      const t = makeText('', { size: 22, lineHeight: 26 });
      t.y = this.y0 + 5;
      this.view.addChild(t);
      this.nums.push(t);
    }
    this.message = makeText('', { size: 11 });
    this.view.addChild(this.message);
    const hint = makeText('ESC to leave', { size: 9, fill: DIM_COL });
    hint.x = Math.round((VIEW_W - hint.width) / 2);
    hint.y = VIEW_H - 16;
    this.view.addChild(hint);

    this.view.visible = true;
    this.active = true;
    this.draw();
  }

  hide() {
    this.view.visible = false;
    this.active = false;
  }

  draw() {
    const g = this.slots.clear();
    for (let i = 0; i < SLOTS; i++) {
      const x = this.x0 + i * (SLOT_W + GAP), y = this.y0;
      const next = i === this.digits.length;
      g.rect(x, y, SLOT_W, SLOT_H).fill({ color: 0x000000 });
      g.rect(x + 1, y + 1, SLOT_W - 2, SLOT_H - 2).fill({ color: next ? 0x8f8a82 : 0x4a4541 });
      g.rect(x + 2, y + 2, SLOT_W - 4, SLOT_H - 4).fill({ color: 0x0e0c0c });
      const t = this.nums[i];
      t.text = this.digits[i] ?? '';
      t.x = x + Math.round((SLOT_W - t.width) / 2);
    }
    this.message.x = Math.round((VIEW_W - this.message.width) / 2);
    this.message.y = this.y0 + SLOT_H + 40;
  }

  update(dt, input) {
    this.time += dt;
    // the blinking slot for the next digit
    const blink = Math.floor(this.time * 2.5) % 2 === 0;
    const i = this.digits.length;
    if (i < SLOTS && this.cursorOn !== blink) {
      this.cursorOn = blink;
      this.draw();
      if (!blink) {
        const x = this.x0 + i * (SLOT_W + GAP);
        this.slots.rect(x + 1, this.y0 + 1, SLOT_W - 2, SLOT_H - 2).fill({ color: 0x4a4541 });
        this.slots.rect(x + 2, this.y0 + 2, SLOT_W - 4, SLOT_H - 4).fill({ color: 0x0e0c0c });
      }
    }
    if (this.leave) {
      this.hide();
      return;
    }
    if (this.time > 0.15 && input.hit('ok')) {
      if (this.digits === this.code) {
        this.hide();
        this.onSolve?.();
      } else {
        this.message.text = 'Nothing happened.';
        this.draw();
      }
    }
  }
}
