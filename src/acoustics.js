// How loud a sound in one place is for someone in another, following the floor plan.
// - Only on the same floor (the yard and the shed count as one "floor"; the basement is
//   the secret passage and the room behind it).
// - Rooms right next to you (through a door, or just through a wall) are loud.
// - Each further room in between makes it much quieter, and so does distance: the further
//   down the hallway the seeker walks, the fainter his steps.

export const FLOOR = {
  hall_g: 'ground', bathroom: 'ground', bedroom: 'ground', spare: 'ground',
  kitchen: 'ground', living: 'ground', workshop: 'ground',
  landing: 'upper', summoning: 'upper',
  attic: 'attic',
  passage: 'basement', cellar: 'basement',
  backyard: 'yard', shed: 'yard',
};

/** rooms that share a wall but no door (from the ground floor sketch) */
const WALL_NEIGHBOURS = [
  ['bathroom', 'bedroom'],
  ['bedroom', 'spare'],
  ['kitchen', 'living'],
  ['living', 'workshop'],
];

/* ---------- where he thinks a running skeleton is ---------- */

/** each floor's hub: from there he can tell exactly which room a sound came from */
const HUB = { ground: 'hall_g', upper: 'landing', attic: 'attic', basement: 'passage', yard: 'backyard' };
/** floors he can hear across, from the hub at the top or bottom of the stairs / ladder */
const LINKED = [['ground', 'upper'], ['upper', 'attic']];
/** the side rooms of the ground floor: [side, row] (row 0 at the front with the stairs) */
const GRID = {
  bathroom: [0, 0], bedroom: [0, 1], spare: [0, 2],
  kitchen: [1, 0], living: [1, 1], workshop: [1, 2],
};
const ROOM_AT = Object.fromEntries(Object.entries(GRID).map(([id, [side, row]]) => [`${side},${row}`, id]));

/**
 * The skeleton ran in `heardMap` while he was in `seekerMap`: which room does he go and
 * check? 'chase' when it is the room he is in; null when he can't hear it at all.
 *  - from his floor's hub (the hallway, the landing...) he knows the exact room, also on
 *    the floor above or below;
 *  - between two side rooms of the ground floor he can only tell roughly: the right room,
 *    or the one next to it on his side (both neighbours when he is level with it);
 *    from the far end, a sound by the stairs might also have come from upstairs.
 */
export function guessRoom(seekerMap, heardMap, rand = Math.random) {
  if (seekerMap === heardMap) return 'chase';
  const fs = FLOOR[seekerMap], fh = FLOOR[heardMap];
  if (!fs || !fh) return null;
  if (fs !== fh) {
    const linked = LINKED.some(([a, b]) => (a === fs && b === fh) || (a === fh && b === fs));
    return linked && seekerMap === HUB[fs] ? heardMap : null;
  }
  if (seekerMap === HUB[fs] || !GRID[seekerMap] || !GRID[heardMap]) return heardMap;
  const [side, row] = GRID[heardMap], mine = GRID[seekerMap][1];
  const rows = mine === row ? [row - 1, row + 1] : [row + Math.sign(mine - row)];
  const options = [heardMap, ...rows.map((r) => ROOM_AT[`${side},${r}`]).filter(Boolean)];
  if (row === 0 && Math.abs(mine - row) === 2) options.push('landing');
  return options[Math.floor(rand() * options.length)];
}

const ROOMS_BETWEEN = [1, 0.9, 0.45, 0.2, 0.1]; // by how many doorways / walls the sound passes
const FALLOFF = 30; // tiles of distance until a sound is nearly gone

const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * Volume (0..1) at which `listener` hears a sound made at `source`; both are { map, x, y }.
 * `navs` gives each map's doors (see world/nav.js).
 */
export function hearing(navs, source, listener) {
  const floor = FLOOR[source.map];
  if (!floor || floor !== FLOOR[listener.map]) return 0;
  if (source.map === listener.map) return clamp(1 - dist(source, listener) / FALLOFF, 0.2, 1);

  // cheapest way for the sound to travel to the listener's room
  const seen = new Set();
  const open = [{ map: source.map, x: source.x, y: source.y, cost: 0, rooms: 0 }];
  while (open.length) {
    open.sort((a, b) => a.cost - b.cost);
    const n = open.shift();
    if (n.map === listener.map) {
      const cost = n.cost + dist(n, listener) * 0.3;
      return ROOMS_BETWEEN[Math.min(n.rooms, ROOMS_BETWEEN.length - 1)] * clamp(1 - cost / FALLOFF, 0.08, 1);
    }
    const key = `${n.map}:${n.x},${n.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const d of navs[n.map]?.doors ?? []) {
      if (FLOOR[d.to] !== floor) continue; // stairs, ladders and the trapdoor lead to other floors
      open.push({ map: d.to, x: d.at[0], y: d.at[1], cost: n.cost + dist(n, d) + 1, rooms: n.rooms + 1 });
    }
    for (const [a, b] of WALL_NEIGHBOURS) {
      const other = a === n.map ? b : b === n.map ? a : null;
      if (!other || !navs[other]) continue;
      open.push({ map: other, x: navs[other].w >> 1, y: navs[other].h >> 1, cost: n.cost + 6, rooms: n.rooms + 1 });
    }
  }
  return 0;
}
