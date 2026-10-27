import { Container, Graphics, Rectangle } from 'pixi.js';
import { VIEW_W, VIEW_H } from '../config.js';
import { mixVolume, setMixVolume, previewMusic, play } from '../audio.js';
import { makeText, cursorGraphics, TEXT_COL, DIM_COL } from './common.js';

const ROWS = [
  { id: 'fullscreen', label: 'Fullscreen' },
  { id: 'master', label: 'Master volume' },
  { id: 'music', label: 'Music' },
  { id: 'sfx', label: 'Sound effects' },
  { id: 'back', label: 'Back' },
];
const TOP = 84; // first row; the others follow below
const LINE = 20;
const LABEL_X = 46;
const VALUE_X = 166;
const SEGS = 10; // a volume bar is ten blocks, 10% each
const SEG_W = 6;
const SEG_STEP = 8;

/** the desktop app sets fullscreen itself (it always starts fullscreen); in a browser the page asks */
const desktop = () => window.enchanted;

function setFullscreen(on) {
  if (desktop()) return desktop().setFullscreen(on);
  if (on) document.documentElement.requestFullscreen?.().catch(() => {});
  else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

async function isFullscreen() {
  return desktop() ? desktop().isFullscreen() : !!document.fullscreenElement;
}

/**
 * Settings, opened from the title screen or the ESC menu: fullscreen, and the master,
 * music and sound effect volumes. Black like the title, everything in the middle.
 * W/S choose, A/D (or SPACE on fullscreen) change, ESC or Back closes.
 */
export class SettingsScreen {
  constructor() {
    this.view = new Container();
    this.view.visible = false;
    this.open = false;
    this.fullscreen = false;
    // F11 / Alt+Enter, or the browser leaving fullscreen, while the screen is up
    window.addEventListener('resize', () => this.open && this.readFullscreen());
    this.build();
  }

  show(onClose = null) {
    this.onClose = onClose;
    this.open = true;
    this.view.visible = true;
    this.sel = 0;
    this.readFullscreen();
    this.refresh();
  }

  hide() {
    this.open = false;
    this.view.visible = false;
  }

  close() {
    this.hide();
    const cb = this.onClose;
    this.onClose = null;
    cb?.();
  }

  async readFullscreen() {
    this.fullscreen = await isFullscreen();
    this.refresh();
  }

  build() {
    const bg = new Graphics().rect(0, 0, VIEW_W, VIEW_H).fill({ color: 0x050404 });
    bg.eventMode = 'static'; // clicks don't fall through to the game
    this.view.addChild(bg);

    const head = makeText('SETTINGS', { size: 16, lineHeight: 20 });
    head.x = Math.round((VIEW_W - head.width) / 2);
    head.y = 40;
    this.view.addChild(head);

    this.rows = ROWS.map((r, i) => {
      const y = TOP + i * LINE + (r.id === 'back' ? 8 : 0);
      const label = makeText(r.label, { size: 12 });
      label.x = r.id === 'back' ? Math.round((VIEW_W - label.width) / 2) : LABEL_X;
      label.y = y;
      label.eventMode = 'static';
      label.cursor = 'pointer';
      label.on('pointertap', () => {
        this.sel = i;
        if (r.id === 'back') this.close();
        else if (r.id === 'fullscreen') this.change(r, 1);
        this.refresh();
      });
      this.view.addChild(label);
      const row = { ...r, y, label };
      if (r.id === 'fullscreen') {
        row.value = makeText('', { size: 12 });
        row.value.x = VALUE_X;
        row.value.y = y;
        row.value.eventMode = 'static';
        row.value.cursor = 'pointer';
        row.value.on('pointertap', () => {
          this.sel = i;
          this.change(r, 1);
        });
        this.view.addChild(row.value);
      } else if (r.id !== 'back') {
        row.bar = new Graphics();
        row.bar.x = VALUE_X;
        row.bar.y = y + 4;
        // clicking a block sets the volume to it; just left of the bar is silence
        row.bar.eventMode = 'static';
        row.bar.cursor = 'pointer';
        row.bar.hitArea = new Rectangle(-6, -3, SEGS * SEG_STEP + 6, 13);
        row.bar.on('pointertap', (e) => {
          this.sel = i;
          const x = e.getLocalPosition(row.bar).x;
          this.setVolume(r, x < 0 ? 0 : Math.min(SEGS, Math.floor(x / SEG_STEP) + 1) / SEGS);
        });
        row.pct = makeText('', { size: 10, fill: DIM_COL });
        row.pct.y = y + 1;
        this.view.addChild(row.bar, row.pct);
      }
      return row;
    });

    this.cursor = cursorGraphics();
    this.view.addChild(this.cursor);

    const hint = makeText('W/S choose · A/D change · ESC back', { size: 9, fill: DIM_COL });
    hint.x = Math.round((VIEW_W - hint.width) / 2);
    hint.y = VIEW_H - 13;
    this.view.addChild(hint);
  }

  refresh() {
    this.rows.forEach((r, i) => {
      const on = i === this.sel;
      r.label.alpha = on ? 1 : 0.6;
      if (r.value) {
        r.value.text = this.fullscreen ? 'On' : 'Off';
        r.value.alpha = on ? 1 : 0.6;
      }
      if (r.bar) {
        const v = Math.round(mixVolume(r.id) * SEGS);
        const g = r.bar.clear();
        for (let k = 0; k < SEGS; k++) {
          g.rect(k * SEG_STEP, 0, SEG_W, 7).fill({ color: k < v ? 0xd9d3c7 : 0x3a3633 });
        }
        r.bar.alpha = on ? 1 : 0.6;
        r.pct.text = `${v * 10}%`;
        r.pct.x = VALUE_X + SEGS * SEG_STEP + 30 - Math.ceil(r.pct.width);
        r.pct.alpha = on ? 1 : 0.6;
      }
    });
    const t = this.rows[this.sel].label;
    this.cursor.x = t.x - 10;
    this.cursor.y = t.y + 5;
  }

  setVolume(row, v) {
    setMixVolume(row.id, v);
    // something to hear it by: the music for its own volume, a footstep for the rest
    if (row.id === 'music') previewMusic();
    else play('step', 0.5);
    this.refresh();
  }

  /** A/D (d = -1 / 1), or SPACE */
  change(row, d) {
    if (row.id === 'fullscreen') {
      this.fullscreen = !this.fullscreen;
      setFullscreen(this.fullscreen);
    } else if (row.bar) {
      const v = Math.round(mixVolume(row.id) * SEGS) + d;
      if (v < 0 || v > SEGS) return;
      this.setVolume(row, v / SEGS);
    }
    this.refresh();
  }

  update(dt, input) {
    const row = this.rows[this.sel];
    if (input.hit('cancel') || input.hit('menu')) this.close();
    else if (input.hit('up')) this.sel = (this.sel + ROWS.length - 1) % ROWS.length;
    else if (input.hit('down')) this.sel = (this.sel + 1) % ROWS.length;
    else if (input.hit('left')) this.change(row, -1);
    else if (input.hit('right')) this.change(row, 1);
    else if (input.hit('ok')) {
      if (row.id === 'back') return this.close();
      if (row.id === 'fullscreen') this.change(row, 1);
    }
    this.refresh();
  }
}
