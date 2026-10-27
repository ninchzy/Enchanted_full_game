import { Container } from 'pixi.js';
import { VIEW_W } from '../config.js';
import { BLOOD } from '../gfx/palette.js';
import { makeText, windowGraphics, TEXT_COL, DIM_COL } from './common.js';

const fmt = (s) => {
  s = Math.max(0, Math.ceil(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Top middle of the screen: the explore timer and the search timer side by side. The one
 * running is bright, the other shows how long it will last.
 */
export class TimersUI {
  constructor() {
    this.view = new Container();
    const w = 150, h = 20, x = Math.round((VIEW_W - w) / 2);
    this.view.addChild(windowGraphics(x, 4, w, h));
    this.left = makeText('', { size: 10 });
    this.right = makeText('', { size: 10 });
    this.left.x = x + 9;
    this.right.x = x + w / 2 + 4;
    this.left.y = this.right.y = 7;
    this.view.addChild(this.left, this.right);
    this.last = '';
  }

  update(cycle) {
    const p = cycle.phase, next = cycle.next;
    const roamPhase = p.kind === 'seek' ? next : p;
    const roamLabel = roamPhase.kind === 'sleep' ? 'ASLEEP' : 'EXPLORE';
    const roam = `${roamLabel} ${fmt(p.kind === 'seek' ? roamPhase.dur : cycle.left)}`;
    const seek = `SEARCH ${fmt(p.kind === 'seek' ? cycle.left : cycle.durations.seek)}`;
    const key = roam + seek + p.kind;
    if (key === this.last) return;
    this.last = key;
    this.left.text = roam;
    this.right.text = seek;
    const seeking = p.kind === 'seek';
    this.left.style.fill = seeking ? DIM_COL : TEXT_COL;
    this.right.style.fill = seeking ? BLOOD.light : DIM_COL;
  }
}
