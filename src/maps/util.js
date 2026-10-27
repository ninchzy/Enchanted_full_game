/**
 * Standard full-screen room (20x15 tiles): ceiling border, a two tile high back wall,
 * and 11 rows of floor. `rows` are the 18 interior columns of floor rows 3..13;
 * omitted rows are plain floor.
 */
export function room(rows = {}) {
  const out = ['#'.repeat(20), '#' + 'W'.repeat(18) + '#', '#' + 'W'.repeat(18) + '#'];
  for (let y = 3; y <= 13; y++) {
    const r = rows[y] ?? '.'.repeat(18);
    if (r.length !== 18) throw new Error(`room row ${y} must be 18 chars, got ${r.length}`);
    out.push('#' + r + '#');
  }
  out.push('#'.repeat(20));
  return out;
}

/** the two trigger tiles of a two-tile-high side door */
export function sideDoor(x, y, to, at) {
  return [
    { x, y, to, at },
    { x, y: y + 1, to, at },
  ];
}
