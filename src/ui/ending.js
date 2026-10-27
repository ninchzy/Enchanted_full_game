import { Container, Graphics } from 'pixi.js';
import { VIEW_W, VIEW_H } from '../config.js';
import { BLOOD } from '../gfx/palette.js';
import { hasSaves } from '../saves.js';
import { stopAllSounds } from '../audio.js';
import { makeText, cursorGraphics, TEXT_COL, DIM_COL } from './common.js';

const MENU_Y = 176;
const LINE = 16;

/**
 * The end of a story ending: "Ending n/3" above GAME OVER (the title screen's lettering,
 * in the blood colour), with Load Save and Back To Title Screen underneath. Load Save is
 * greyed out when there are no save files.
 */
export class EndingScreen {
  constructor(game) {
    this.game = game;
    this.view = new Container();
    this.view.visible = false;
    this.active = false;
  }

  show(label) {
    this.view.removeChildren().forEach((ch) => ch.destroy({ children: true }));
    this.view.addChild(new Graphics().rect(0, 0, VIEW_W, VIEW_H).fill({ color: 0x050404 }));

    const title = makeText('GAME OVER', { size: 34, lineHeight: 38, resMul: 2, smooth: true, fill: BLOOD.main });
    title.style.stroke = { color: BLOOD.main, width: 1.5, join: 'miter' };
    title.style.dropShadow = { color: '#000000', distance: 2, blur: 0, angle: Math.PI / 4, alpha: 1 };
    title.scale.x = (VIEW_W - 24) / title.width;
    title.x = Math.round((VIEW_W - title.width) / 2);
    title.y = 86;
    const sub = makeText(label, { size: 12 });
    sub.x = Math.round((VIEW_W - sub.width) / 2);
    sub.y = title.y - 22;
    this.view.addChild(sub, title);

    this.options = [
      { label: 'Load Save', enabled: hasSaves() },
      { label: 'Back To Title Screen', enabled: true },
    ].map((o, i) => {
      const t = makeText(o.label, { size: 12, fill: o.enabled ? TEXT_COL : DIM_COL });
      t.x = Math.round((VIEW_W - t.width) / 2);
      t.y = MENU_Y + i * LINE;
      t.eventMode = 'static';
      t.cursor = o.enabled ? 'pointer' : 'default';
      t.on('pointertap', () => {
        if (!o.enabled) return;
        this.sel = i;
        this.place();
        this.choose();
      });
      this.view.addChild(t);
      return { ...o, text: t };
    });
    this.cursor = cursorGraphics();
    this.view.addChild(this.cursor);
    this.sel = this.options[0].enabled ? 0 : 1;
    this.place();

    this.view.alpha = 0;
    this.time = 0;
    this.view.visible = true;
    this.active = true;
  }

  hide() {
    this.view.visible = false;
    this.active = false;
  }

  place() {
    const t = this.options[this.sel].text;
    this.cursor.x = t.x - 10;
    this.cursor.y = t.y + 5;
    this.options.forEach((o, i) => (o.text.alpha = !o.enabled ? 0.4 : i === this.sel ? 1 : 0.6));
  }

  choose() {
    const g = this.game;
    if (this.sel === 0) {
      this.hide();
      stopAllSounds(0.5); // the ending's music stops with it
      g.mode = 'title';
      g.saveScreen.show('load'); // backing out of it leads to the title screen
    } else {
      this.hide();
      g.toTitle();
    }
  }

  update(dt, input) {
    this.time += dt;
    this.view.alpha = Math.min(1, this.time / 1.2); // fades in
    if (this.time < 1.2) return;
    if ((input.hit('up') || input.hit('down')) && this.options[0].enabled) {
      this.sel = 1 - this.sel;
      this.place();
    } else if (input.hit('ok')) this.choose();
  }
}
