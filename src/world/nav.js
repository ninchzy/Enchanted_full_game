import { TILE } from '../config.js';
import { isSolidTile, STAIR_TILES } from '../gfx/tiles.js';
import { propInfo } from '../gfx/props.js';
import { MAPS } from '../maps/index.js';
import { applyEdits } from '../editor/edits.js';

// Navigation data for every map: which tiles can be walked on, where the doors are and
// where the hiding spots are. Shared by the rendered World (collision) and the seeker,
// who walks the whole house even when the player can't see him.

export const DELTA = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const DIRS = Object.keys(DELTA);

/** does a prop/door's `if` / `unless` flag condition pass? */
export const active = (o, flags) => (!o.if || flags.has(o.if)) && (!o.unless || !flags.has(o.unless));

/**
 * Where a prop sits. Standing objects are anchored at the bottom centre of their
 * footprint (so scaling keeps them on the floor); decals and wall pieces at their centre.
 */
export function placement(p, info) {
  const fx = p.x * TILE, fy = p.y * TILE;
  const dx = p.dx ?? 0, dy = p.dy ?? info.def.dy ?? 0;
  const sx = fx + (info.tw * TILE - info.w) / 2 + dx;
  const sy = info.layer === 'wall' ? fy + (info.th * TILE - info.h) / 2 + dy : fy + info.th * TILE - info.h + dy;
  const bottom = info.layer === 'obj';
  return {
    fx, fy, dx, dy,
    ax: sx + info.w / 2,
    ay: bottom ? sy + info.h : sy + info.h / 2,
    anchorY: bottom ? 1 : 0.5,
    scale: p.scale ?? 1,
    flip: !!p.flip,
    rot: ((p.rot ?? 0) * Math.PI) / 180,
  };
}

/**
 * The tiles covered by a footprint-relative tile rect once the prop's offset and scale
 * are applied: every tile whose centre lies inside. Always at least one tile.
 */
export function tilesUnder([rx, ry, rw, rh], pl) {
  const s = pl.scale;
  let x0 = pl.fx + rx * TILE + pl.dx, y0 = pl.fy + ry * TILE + pl.dy;
  let x1 = x0 + rw * TILE, y1 = y0 + rh * TILE;
  x0 = pl.ax + (x0 - pl.ax) * s; x1 = pl.ax + (x1 - pl.ax) * s;
  y0 = pl.ay + (y0 - pl.ay) * s; y1 = pl.ay + (y1 - pl.ay) * s;
  if (pl.flip) [x0, x1] = [2 * pl.ax - x1, 2 * pl.ax - x0];
  const span = (a, b) => {
    let t0 = Math.ceil((a - TILE / 2) / TILE), t1 = Math.ceil((b - TILE / 2) / TILE) - 1;
    if (t1 < t0) t0 = t1 = Math.floor((a + b) / 2 / TILE);
    return [t0, t1 - t0 + 1];
  };
  const [tx, tw] = span(x0, x1), [ty, th] = span(y0, y1);
  return [tx, ty, tw, th];
}

/**
 * What a prop blocks and where it can be inspected from. A custom box from the editor
 * ({x, y, w, h} in tiles from the object's position) is used as is; otherwise the
 * footprint, scaled with the object.
 */
export function propTiles(p, info, pl) {
  let s = p.solid !== undefined ? p.solid : info.def.solid;
  if (s === undefined) s = info.layer === 'obj';
  let solidTiles = null;
  if (s && typeof s === 'object' && !Array.isArray(s)) solidTiles = [p.x + s.x, p.y + s.y, s.w, s.h];
  else if (s) solidTiles = tilesUnder(Array.isArray(s) ? s : [0, 0, info.tw, info.th], pl);
  const area = solidTiles ?? tilesUnder([0, 0, info.tw, info.th], pl);
  return { solidTiles, area };
}

/**
 * Do the stairs' railings allow the step from (x, y) in direction dir? Stairs are only
 * walked on and off vertically, and a stairwell going down is only entered from above;
 * this also covers the door tiles at its bottom, so nobody slips in past the railing.
 */
export function stairsAllow(nav, x, y, dir) {
  const [dx, dy] = DELTA[dir];
  const here = nav.tile(x, y), there = nav.tile(x + dx, y + dy);
  if ((STAIR_TILES.has(here) || STAIR_TILES.has(there)) && dx !== 0 && here !== there) return false;
  if (there === 'D' && here !== 'D' && dir !== 'down') return false;
  return true;
}

/** can something standing on (x, y) step in direction dir? (walls, stairs railings) */
export function canStep(nav, x, y, dir) {
  const [dx, dy] = DELTA[dir];
  const nx = x + dx, ny = y + dy;
  if (nx < 0 || ny < 0 || nx >= nav.w || ny >= nav.h) return false;
  if (nav.solid[ny * nav.w + nx]) return false;
  return stairsAllow(nav, x, y, dir);
}

/** collision, doors and hiding spots for one map (with editor edits and story flags applied) */
export function buildNav(id, flags) {
  const def = applyEdits(MAPS[id]);
  const h = def.tiles.length, w = def.tiles[0].length;
  const nav = {
    id, w, h, def,
    solid: new Uint8Array(w * h),
    tile: (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? ' ' : def.tiles[y][x]),
    doors: (def.doors || []).filter((d) => active(d, flags)),
    hides: [],
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (isSolidTile(def.tiles[y][x])) nav.solid[y * w + x] = 1;
  for (const p of def.props) {
    if (!active(p, flags)) continue;
    const info = propInfo(p);
    const { solidTiles, area } = propTiles(p, info, placement(p, info));
    if (solidTiles) {
      const [tx, ty, tw, th] = solidTiles;
      for (let y = ty; y < ty + th; y++)
        for (let x = tx; x < tx + tw; x++) if (x >= 0 && y >= 0 && x < w && y < h) nav.solid[y * w + x] = 1;
    }
    if (p.hide) nav.hides.push({ map: id, key: p._key, t: p.t, area });
  }
  nav.doorAt = new Map(nav.doors.map((d) => [d.x + ',' + d.y, d]));
  // tiles next to each hiding spot that someone can stand on to search it, facing it
  for (const s of nav.hides) {
    const [ax, ay, aw, ah] = s.area;
    s.goals = [];
    for (let y = ay - 1; y <= ay + ah; y++)
      for (let x = ax - 1; x <= ax + aw; x++) {
        const inside = x >= ax && x < ax + aw && y >= ay && y < ay + ah;
        const edge = (x >= ax && x < ax + aw) !== (y >= ay && y < ay + ah); // 4-neighbour, not corner
        if (inside || !edge || !walkable(nav, x, y)) continue;
        const dir = y < ay ? 'down' : y >= ay + ah ? 'up' : x < ax ? 'right' : 'left';
        s.goals.push({ x, y, dir });
      }
  }
  return nav;
}

export function buildAllNavs(flags) {
  const navs = {};
  for (const id of Object.keys(MAPS)) navs[id] = buildNav(id, flags);
  return navs;
}

export function walkable(nav, x, y) {
  return x >= 0 && y >= 0 && x < nav.w && y < nav.h && !nav.solid[y * nav.w + x] && !nav.doorAt.has(x + ',' + y);
}

/** breadth-first distances (and how we got there) from one tile, never stepping onto door tiles */
export function floodFrom(nav, sx, sy) {
  const n = nav.w * nav.h;
  const dist = new Int32Array(n).fill(-1);
  const via = new Int8Array(n).fill(-1);
  const q = [sy * nav.w + sx];
  dist[q[0]] = 0;
  for (let i = 0; i < q.length; i++) {
    const p = q[i], x = p % nav.w, y = (p / nav.w) | 0;
    DIRS.forEach((dir, di) => {
      if (!canStep(nav, x, y, dir)) return;
      const [dx, dy] = DELTA[dir];
      const np = (y + dy) * nav.w + (x + dx);
      if (dist[np] >= 0 || nav.doorAt.has(x + dx + ',' + (y + dy))) return;
      dist[np] = dist[p] + 1;
      via[np] = di;
      q.push(np);
    });
  }
  return { dist, via, w: nav.w };
}

/** the directions to walk from the flood's start to (x, y) */
export function pathTo(flood, x, y) {
  const dirs = [];
  let p = y * flood.w + x;
  if (flood.dist[p] < 0) return null;
  while (flood.dist[p] > 0) {
    const dir = DIRS[flood.via[p]];
    dirs.push(dir);
    const [dx, dy] = DELTA[dir];
    p -= dy * flood.w + dx;
  }
  return dirs.reverse();
}

/** walkable tiles next to a door from which you can step into it */
function doorApproaches(nav, d) {
  const out = [];
  for (const dir of DIRS) {
    const [dx, dy] = DELTA[dir];
    const x = d.x - dx, y = d.y - dy;
    if (!walkable(nav, x, y) || !stairsAllow(nav, x, y, dir)) continue;
    out.push({ x, y, dir });
  }
  return out;
}

/**
 * Plan a trip through the house: from {map, x, y} to any of `goals` ({x, y, dir}) in
 * `goalMap`, through doors, stairs and ladders. Returns { cost, legs } where each leg is
 * { map, dirs, door } (door is null on the last leg, whose final facing is `face`).
 */
export function planTrip(navs, from, goalMap, goals) {
  const seen = new Map();
  const open = [{ map: from.map, x: from.x, y: from.y, cost: 0, legs: [] }];
  while (open.length) {
    open.sort((a, b) => a.cost - b.cost);
    const node = open.shift();
    const key = `${node.map}:${node.x},${node.y}`;
    if (seen.has(key)) continue;
    seen.set(key, node.cost);
    const nav = navs[node.map];
    const flood = floodFrom(nav, node.x, node.y);
    if (node.map === goalMap) {
      let best = null;
      for (const g of goals) {
        const d = flood.dist[g.y * nav.w + g.x];
        if (d >= 0 && (!best || d < best.d)) best = { d, g };
      }
      if (best) {
        return {
          cost: node.cost + best.d,
          legs: [...node.legs, { map: node.map, dirs: pathTo(flood, best.g.x, best.g.y), door: null }],
          face: best.g.dir,
          end: best.g,
        };
      }
    }
    for (const d of nav.doors) {
      if (!navs[d.to]) continue;
      for (const a of doorApproaches(nav, d)) {
        const dist = flood.dist[a.y * nav.w + a.x];
        if (dist < 0) continue;
        open.push({
          map: d.to,
          x: d.at[0],
          y: d.at[1],
          cost: node.cost + dist + 2,
          legs: [...node.legs, { map: node.map, dirs: [...pathTo(flood, a.x, a.y), a.dir], door: d }],
        });
      }
    }
  }
  return null;
}
