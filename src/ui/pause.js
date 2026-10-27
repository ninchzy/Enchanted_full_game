import { Container, Graphics } from 'pixi.js';
import { VIEW_W, VIEW_H } from '../config.js';
import { hasSaves } from '../saves.js';
import { makeText } from './common.js';
import { MenuList } from './menulist.js';

const LINE = 16;

/**
 * ESC during the game (never during a cutscene): a black screen with Back / Load Save /
 * Settings / Exit Game in the middle, like the title screen. The game waits underneath.
 * Exit Game asks first, in the same style.
 */
export class PauseMenu {
  constructor(game) {
    this.game = game;
    this.view = new Container();
    this.view.visible = false;
    this.open = false;
  }

  show() {
    this.open = true;
    this.view.visible = true;
    this.showMenu();
  }

  hide() {
    this.open = false;
    this.view.visible = false;
  }

  /** clear the screen down to the black background */
  clear() {
    this.view.removeChildren().forEach((ch) => ch.destroy({ children: true }));
    const bg = new Graphics().rect(0, 0, VIEW_W, VIEW_H).fill({ color: 0x050404 });
    bg.eventMode = 'static'; // clicks don't fall through to the game
    this.view.addChild(bg);
  }

  showMenu(sel = 0) {
    this.clear();
    this.question = false;
    const items = [
      { label: 'Back' },
      { label: 'Load Save', enabled: hasSaves() },
      { label: 'Settings' },
      { label: 'Exit Game' },
    ];
    const y = Math.round((VIEW_H - items.length * LINE) / 2);
    this.list = new MenuList(items, { y, line: LINE, sel, onPick: (label) => this.choose(label) });
    this.view.addChild(this.list.view);
  }

  choose(label) {
    const g = this.game;
    if (label === 'Back') this.hide();
    else if (label === 'Load Save') g.saveScreen.show('load');
    else if (label === 'Settings') g.settings.show();
    else if (label === 'Exit Game') this.ask('Are you sure?\nAll unsaved progress will be lost.', () => g.toTitle(), 3);
  }

  /** a Yes / No question in the middle of the screen (No first); No goes back to option `back` */
  ask(text, onYes, back) {
    this.clear();
    this.question = back;
    const q = makeText(text, { size: 12, wrap: VIEW_W - 64 });
    q.style.align = 'center';
    q.x = Math.round((VIEW_W - q.width) / 2);
    q.y = Math.round(VIEW_H / 2 - q.height - 12);
    this.view.addChild(q);
    this.list = new MenuList([{ label: 'Yes' }, { label: 'No' }], {
      y: Math.round(VIEW_H / 2 + 4),
      line: LINE,
      sel: 1,
      onPick: (label) => (label === 'Yes' ? onYes() : this.showMenu(back)),
    });
    this.view.addChild(this.list.view);
  }

  update(dt, input) {
    if (input.hit('cancel')) {
      // ESC backs out of a question, or closes the menu
      if (this.question !== false) this.showMenu(this.question);
      else this.hide();
      return;
    }
    this.list.update(input);
  }
}
