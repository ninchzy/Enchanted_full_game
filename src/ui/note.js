import { Container, Graphics } from 'pixi.js';
import { VIEW_W, VIEW_H } from '../config.js';
import { makeText } from './common.js';

const PAPER = 0xd8d0bb, PAPER_DK = 0xb9b09a, PAPER_LT = 0xe6dfcc, INK = '#3b332b';

/** A piece of paper held up in the middle of the screen with writing on it. Any key closes it. */
export class NoteView {
  constructor() {
    this.view = new Container();
    this.view.visible = false;
    this.active = false;
  }

  show(lines) {
    this.view.removeChildren().forEach((ch) => ch.destroy());
    this.view.addChild(new Graphics().rect(0, 0, VIEW_W, VIEW_H).fill({ color: 0x000000, alpha: 0.8 }));

    const text = makeText(lines.join('\n'), { size: 12, lineHeight: 19, fill: INK });
    text.style.dropShadow = false;
    const w = Math.max(170, Math.ceil(text.width) + 44), h = Math.ceil(text.height) + 48;
    const x = Math.round((VIEW_W - w) / 2), y = Math.round((VIEW_H - h) / 2) - 6;

    // the paper: slightly uneven edges, a fold across the middle, a few stains
    const g = new Graphics();
    g.rect(x + 3, y + 4, w, h).fill({ color: 0x000000, alpha: 0.5 });
    g.poly([x + 2, y, x + w, y + 2, x + w - 1, y + h, x, y + h - 2]).fill({ color: PAPER });
    g.rect(x + 3, y + Math.round(h / 2), w - 5, 1).fill({ color: PAPER_DK });
    g.rect(x + 3, y + Math.round(h / 2) + 1, w - 5, 1).fill({ color: PAPER_LT });
    g.poly([x + w - 14, y + 2, x + w, y + 2, x + w, y + 15]).fill({ color: PAPER_DK }); // dog-eared corner
    g.circle(x + 22, y + h - 16, 7).fill({ color: 0x9c8f72, alpha: 0.25 });
    g.circle(x + w - 30, y + 20, 4).fill({ color: 0x9c8f72, alpha: 0.2 });
    this.view.addChild(g);

    text.x = x + Math.round((w - text.width) / 2);
    text.y = y + 24;
    this.view.addChild(text);

    const hint = makeText('SPACE to put it away', { size: 9, fill: '#6f6a63' });
    hint.x = Math.round((VIEW_W - hint.width) / 2);
    hint.y = VIEW_H - 16;
    this.view.addChild(hint);

    this.view.visible = true;
    this.active = true;
    this.time = 0;
  }

  hide() {
    this.view.visible = false;
    this.active = false;
  }

  update(dt, input) {
    this.time += dt;
    if (this.time < 0.15) return; // the key press that opened it
    if (input.hit('ok') || input.hit('cancel') || input.hit('menu')) this.hide();
  }
}
