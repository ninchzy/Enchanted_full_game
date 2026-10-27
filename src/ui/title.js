import { Container, Graphics, Sprite } from 'pixi.js';
import { VIEW_W, VIEW_H, GAME_TITLE } from '../config.js';
import { hasSaves } from '../saves.js';
import { makeText, TEXT_COL } from './common.js';
import { MenuList } from './menulist.js';

const FADE = 0.45; // seconds for the title to fade out and the menu to fade in
const MENU_Y = 168; // first option; the others follow below

/**
 * First screen. It starts with the title and a slowly pulsing "Press SPACE to continue";
 * SPACE clears the text away and shows New Game / Continue / Settings / Exit at the bottom.
 * Continue is greyed out until there is a save file. Exit closes the desktop app (and does
 * nothing in a browser).
 */
export class TitleUI {
  constructor(game) {
    this.game = game;
    this.view = new Container();
    this.view.visible = false;
    this.time = 0;
  }

  /** `stage` 'press' starts at the title, 'menu' goes straight to the options */
  show(stage = 'press') {
    this.view.visible = true;
    this.active = true;
    this.time = 0;
    this.canContinue = hasSaves();
    this.build();
    this.setStage(stage, true);
  }

  hide() {
    this.view.visible = false;
    this.active = false;
  }

  build() {
    this.view.removeChildren().forEach((ch) => ch.destroy({ children: true }));
    const bg = new Graphics().rect(0, 0, VIEW_W, VIEW_H).fill({ color: 0x050404 });
    bg.eventMode = 'static';
    bg.on('pointertap', () => this.stage === 'press' && this.setStage('menu'));
    this.view.addChild(bg);

    // the hooded figure, barely visible in the dark
    const fig = new Sprite(this.game.sheets.cloaked.tex.down[1]);
    fig.anchor.set(0.5, 1);
    fig.scale.set(3.5);
    fig.x = VIEW_W / 2;
    fig.y = 168;
    fig.alpha = 0.18;
    this.figure = fig;
    this.view.addChild(fig);

    // the title: thick letters stretched across almost the whole screen
    this.titleGroup = new Container();
    const title = makeText(GAME_TITLE.toUpperCase(), { size: 34, lineHeight: 38, resMul: 2, smooth: true });
    title.style.stroke = { color: TEXT_COL, width: 1.5, join: 'miter' };
    title.style.dropShadow = { color: '#000000', distance: 2, blur: 0, angle: Math.PI / 4, alpha: 1 };
    title.scale.x = (VIEW_W - 24) / title.width;
    title.x = Math.round((VIEW_W - title.width) / 2);
    title.y = 88; // title and prompt sit together in the middle of the screen
    const press = makeText('Press SPACE to continue', { size: 11 });
    press.x = Math.round((VIEW_W - press.width) / 2);
    press.y = title.y + 54;
    this.press = press;
    this.titleGroup.addChild(title, press);
    this.view.addChild(this.titleGroup);

    // the menu: plain text, no boxes
    this.list = new MenuList(
      [
        { label: 'New Game' },
        { label: 'Continue', enabled: this.canContinue },
        { label: 'Settings' },
        { label: 'Exit' },
      ],
      { y: MENU_Y, sel: this.canContinue ? 1 : 0, onPick: (label) => this.choose(label) },
    );
    this.menu = this.list.view;
    this.view.addChild(this.menu);
  }

  /** switch between the title and the menu; the change fades unless `instant` */
  setStage(stage, instant = false) {
    this.stage = stage;
    this.list.active = stage === 'menu';
    this.fadeT = instant ? FADE * 2 : 0;
    this.titleGroup.visible = true;
    this.menu.visible = true;
    this.applyFade();
  }

  /** the old stage fades out first, then the new one fades in */
  applyFade() {
    const out = Math.max(0, 1 - this.fadeT / FADE);
    const inn = Math.min(1, Math.max(0, (this.fadeT - FADE) / FADE));
    const [from, to] = this.stage === 'menu' ? [this.titleGroup, this.menu] : [this.menu, this.titleGroup];
    from.alpha = out;
    from.visible = out > 0;
    to.alpha = inn;
    to.visible = inn > 0;
  }

  choose(label) {
    if (label === 'New Game') this.game.newGame();
    else if (label === 'Continue') {
      this.hide();
      this.game.saveScreen.show('load');
    } else if (label === 'Settings') this.game.settings.show();
    // Exit closes the desktop app; in a browser there is nothing to close
    else if (label === 'Exit') window.enchanted?.quit();
  }

  update(dt, input) {
    this.time += dt;
    this.figure.alpha = 0.14 + Math.sin(this.time * 1.3) * 0.05 + (Math.random() < 0.02 ? 0.06 : 0);
    this.press.alpha = 0.55 + Math.sin(this.time * 2.2) * 0.45;
    if (this.fadeT < FADE * 2) {
      this.fadeT += dt;
      this.applyFade();
      return; // no input mid-fade
    }
    if (this.stage === 'press') {
      if (input.hit('ok')) this.setStage('menu');
      return;
    }
    if (input.hit('cancel')) this.setStage('press');
    else this.list.update(input);
  }
}
