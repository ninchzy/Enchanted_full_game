const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  Space: 'ok', Enter: 'ok',
  Tab: 'menu',
  ShiftLeft: 'run', ShiftRight: 'run',
  Escape: 'cancel', Backspace: 'cancel',
};
const DIR_KEYS = ['up', 'down', 'left', 'right'];

export class Input {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();
    this.keys = new Set(); // the actual keys pressed this frame (KeyboardEvent.code)
    this.dirStack = []; // most recently pressed direction wins
    this.enabled = true; // off while the editor is open
    window.addEventListener('keydown', (e) => {
      const k = KEYMAP[e.code];
      if (!k || !this.enabled || isTyping(e)) return;
      e.preventDefault();
      if (e.repeat) {
        // key repeat only matters for menu navigation
        if (DIR_KEYS.includes(k)) this.pressed.add(k);
        return;
      }
      this.held.add(k);
      this.pressed.add(k);
      this.keys.add(e.code);
      if (DIR_KEYS.includes(k)) {
        this.dirStack = this.dirStack.filter((d) => d !== k);
        this.dirStack.push(k);
      }
    });
    window.addEventListener('keyup', (e) => {
      const k = KEYMAP[e.code];
      if (!k) return;
      this.held.delete(k);
      this.dirStack = this.dirStack.filter((d) => d !== k);
    });
    window.addEventListener('blur', () => {
      this.held.clear();
      this.dirStack = [];
    });
  }
  /** currently held movement direction, or null */
  get dir() {
    return this.dirStack[this.dirStack.length - 1] ?? null;
  }
  hit(k) {
    return this.pressed.has(k);
  }
  /** one particular key rather than a control (e.g. 'Space', where Enter must not count) */
  hitKey(code) {
    return this.keys.has(code);
  }
  endFrame() {
    this.pressed.clear();
    this.keys.clear();
  }
  clear() {
    this.held.clear();
    this.pressed.clear();
    this.keys.clear();
    this.dirStack = [];
  }
}

/** keys typed into a text box belong to the text box */
export function isTyping(e) {
  const el = e.target;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}
