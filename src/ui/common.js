import { Graphics, Text } from 'pixi.js';
import { FONT } from '../config.js';

// UI is laid out in the same 320x240 virtual pixels as the game. Text is rasterised at
// the current screen scale so it stays sharp.
const texts = new Set();
let resolution = 3;

export const TEXT_COL = '#d9d3c7';
export const DIM_COL = '#6f6a63';

/** text colours for who is speaking out loud (thoughts and narration stay TEXT_COL) */
export const VOICE = {
  skeleton: '#d8c296', // light sand
  seeker: '#8e9cab', // blue-grey
  ritual: '#D11B5C', // the chanting, in the blood colour
};
/** names of items you just found: bold yellow */
export const ITEM_COL = '#f0cf4a';

export function makeText(str, opts = {}) {
  const t = new Text({
    text: str,
    style: {
      fontFamily: FONT,
      fontSize: opts.size ?? 12,
      fill: opts.fill ?? TEXT_COL,
      lineHeight: opts.lineHeight ?? 15,
      wordWrap: !!opts.wrap,
      wordWrapWidth: opts.wrap ?? 0,
      breakWords: true,
      dropShadow: { color: '#000000', distance: 1, blur: 0, angle: Math.PI / 4, alpha: 1 },
    },
    // stretched text (the title) gets a sharper texture, filtered smoothly
    resolution: resolution * (opts.resMul ?? 1),
    ...(opts.smooth ? { textureStyle: { scaleMode: 'linear' } } : {}),
  });
  t.resMul = opts.resMul ?? 1;
  texts.add(t);
  t.on('destroyed', () => texts.delete(t));
  return t;
}

export function setTextResolution(r) {
  resolution = r;
  for (const t of texts) t.resolution = r * t.resMul;
}

/** RPG Maker style window: dark body with a thin light frame */
export function drawWindow(g, x, y, w, h) {
  g.rect(x, y, w, h).fill({ color: 0x000000, alpha: 0.95 });
  g.rect(x + 1, y + 1, w - 2, h - 2).fill({ color: 0x8f8a82 });
  g.rect(x + 2, y + 2, w - 4, h - 4).fill({ color: 0x2b2725 });
  g.rect(x + 3, y + 3, w - 6, h - 6).fill({ color: 0x0e0c0c });
  g.rect(x + 3, y + 3, w - 6, Math.floor((h - 6) / 2)).fill({ color: 0x141111 });
  // knock out the corners for a softer frame
  for (const [cx, cy] of [[x, y], [x + w - 1, y], [x, y + h - 1], [x + w - 1, y + h - 1]]) g.rect(cx, cy, 1, 1).fill({ color: 0x000000 });
  return g;
}

export function windowGraphics(x, y, w, h) {
  const g = new Graphics();
  drawWindow(g, x, y, w, h);
  return g;
}

/** small down-pointing triangle used as "more text" marker */
export function arrowGraphics() {
  const g = new Graphics();
  g.rect(0, 0, 5, 1).fill({ color: 0xd9d3c7 });
  g.rect(1, 1, 3, 1).fill({ color: 0xd9d3c7 });
  g.rect(2, 2, 1, 1).fill({ color: 0xd9d3c7 });
  return g;
}

/** right-pointing cursor triangle */
export function cursorGraphics() {
  const g = new Graphics();
  g.rect(0, 0, 1, 5).fill({ color: 0xd9d3c7 });
  g.rect(1, 1, 1, 3).fill({ color: 0xd9d3c7 });
  g.rect(2, 2, 1, 1).fill({ color: 0xd9d3c7 });
  return g;
}
