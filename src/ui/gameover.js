import { Container, Graphics } from 'pixi.js';
import { VIEW_W, VIEW_H } from '../config.js';
import { BLOOD } from '../gfx/palette.js';
import { makeText, windowGraphics, cursorGraphics } from './common.js';

/**
 * Shown when the hooded figure catches the player. "Restart" goes back to the last save
 * file used (loaded or written), or starts a new game if there is none.
 */
export class GameOverUI {
  constructor(onRestart) {
    this.onRestart = onRestart;
    this.view = new Container();
    this.view.visible = false;
    this.active = false;
    this.time = 0;
  }

  show(reason) {
    this.active = true;
    this.view.visible = true;
    this.view.alpha = 0;
    this.time = 0;
    this.view.removeChildren().forEach((c) => c.destroy({ children: true }));
    this.view.addChild(new Graphics().rect(0, 0, VIEW_W, VIEW_H).fill({ color: 0x000000, alpha: 0.88 }));
    const title = makeText('YOU WERE FOUND', { size: 22, fill: BLOOD.main, lineHeight: 26 });
    title.x = Math.round((VIEW_W - title.width) / 2);
    title.y = 70;
    const sub = makeText(reason, { size: 11, wrap: VIEW_W - 60 });
    sub.x = Math.round((VIEW_W - sub.width) / 2);
    sub.y = 104;
    this.view.addChild(title, sub);

    const bw = 84, bh = 22, bx = Math.round((VIEW_W - bw) / 2), by = 150;
    const btn = windowGraphics(bx, by, bw, bh);
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointertap', () => this.restart());
    const label = makeText('Restart', { size: 11 });
    label.x = bx + 26;
    label.y = by + 5;
    const cur = cursorGraphics();
    cur.x = bx + 14;
    cur.y = by + 8;
    this.cursor = cur;
    this.view.addChild(btn, label, cur);
  }

  hide() {
    this.active = false;
    this.view.visible = false;
  }

  restart() {
    if (!this.active) return;
    this.hide();
    this.onRestart();
  }

  update(dt, input) {
    this.time += dt;
    this.view.alpha = Math.min(1, this.time / 0.8);
    this.cursor.visible = Math.floor(this.time * 2.5) % 2 === 0;
    if (this.time > 0.8 && input.hit('ok')) this.restart();
  }
}
