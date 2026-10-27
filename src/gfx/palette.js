// The whole game is drawn as if a grayscale filter at 70% opacity sat on top of it.
// Every color goes through c(), which applies that filter, EXCEPT blood, which keeps
// its full saturation so it is the only thing that stands out.

export const MUTE = 0.7;

function split(hex) {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}
function join(r, g, b) {
  const cl = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return (cl(r) << 16) | (cl(g) << 8) | cl(b);
}

export function mute(hex, amount = MUTE) {
  const [r, g, b] = split(hex);
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  return join(r + (l - r) * amount, g + (l - g) * amount, b + (l - b) * amount);
}

/** multiply brightness (f < 1 darker, f > 1 lighter) */
export function shade(hex, f) {
  const [r, g, b] = split(hex);
  return join(r * f, g * f, b * f);
}

export function mix(a, b, t) {
  const [r1, g1, b1] = split(a);
  const [r2, g2, b2] = split(b);
  return join(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export const toCss = (hex) => '#' + hex.toString(16).padStart(6, '0');

const cache = new Map();
/** muted css color; optional brightness factor */
export function c(hex, f = 1) {
  const key = hex * 7 + f;
  let v = cache.get(key);
  if (!v) {
    v = toCss(mute(f === 1 ? hex : shade(hex, f)));
    cache.set(key, v);
  }
  return v;
}

/** "Love Potion" #D11B5C and darker shades of the same hue. Never muted. */
export const BLOOD = {
  light: '#E04A80',
  main: '#D11B5C',
  dark: '#9C1446',
  deep: '#610C2C',
};

export const OUT = c(0x15110f); // universal sprite outline
export const BLACK = '#050404';
