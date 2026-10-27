import { Container, Sprite } from 'pixi.js';
import { TILE } from '../config.js';
import { renderMapBase, isSolidTile } from '../gfx/tiles.js';
import { propInfo, propCanvases } from '../gfx/props.js';
import { Actor } from './actor.js';
import { active, placement, propTiles, canStep } from './nav.js';

export { placement };

// seconds before the first `sequence` light ignites, and between each one after that
const SEQ_START = 0.8;
const SEQ_STEP = 0.55;

function strHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** the floor tiles never change at runtime, so each map's base image is made once */
const baseCache = new Map();
function baseTexture(def) {
  if (!baseCache.has(def.id)) baseCache.set(def.id, renderMapBase(def).texture());
  return baseCache.get(def.id);
}

const tex = (pc) => (pc._tex ??= pc.texture());
const inRect = ([x, y, w, h], px, py) => px >= x && py >= y && px < x + w && py < y + h;

/** the prop as it should be drawn, with any `looks` whose flag is set applied */
function lookFor(p, isActive) {
  if (!p.looks) return p;
  let out = p;
  for (const [flag, fields] of p.looks) if (isActive({ if: flag })) out = { ...out, ...fields };
  return out;
}

/** the tiles a sprite covers (by at least a few pixels), as [x, y, w, h] */
function spriteTiles(spr) {
  const MIN = 3;
  const left = spr.x - spr.width * spr.anchor.x, top = spr.y - spr.height * spr.anchor.y;
  const x0 = Math.floor((left + MIN) / TILE), x1 = Math.floor((left + spr.width - MIN) / TILE);
  const y0 = Math.floor((top + MIN) / TILE), y1 = Math.floor((top + spr.height - MIN) / TILE);
  return [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
}

/** apply a prop's transform to a sprite */
export function transformSprite(spr, pl) {
  spr.anchor.set(0.5, pl.anchorY);
  spr.x = Math.round(pl.ax);
  spr.y = Math.round(pl.ay);
  spr.scale.set(pl.flip ? -pl.scale : pl.scale, pl.scale);
  spr.rotation = pl.rot;
}

/** A loaded map: rendered layers, collision, doors, interactables, lights and actors. */
export class World {
  constructor(def, sheets, flags = new Set(), spawn = null, opts = {}) {
    this.def = def;
    this.h = def.tiles.length;
    this.w = def.tiles[0].length;
    this.pw = this.w * TILE;
    this.ph = this.h * TILE;
    this.time = 0;
    this.container = new Container();
    this.decalLayer = new Container(); // floor decals, then things on walls
    this.objLayer = new Container(); // standing objects and characters, sorted by depth
    this.objLayer.sortableChildren = true;
    const isActive = (o) => opts.showAll || active(o, flags);

    def.tiles.forEach((row, y) => {
      if (row.length !== this.w) throw new Error(`${def.id}: row ${y} is ${row.length} wide, expected ${this.w}`);
    });

    this.solid = new Uint8Array(this.w * this.h);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) if (isSolidTile(def.tiles[y][x])) this.solid[y * this.w + x] = 1;

    this.props = [];
    this.lights = [];
    this.animated = [];

    const order = { floor: 0, wall: 1, obj: 2 };
    const list = def.props
      .map((p, i) => ({ p, i, info: propInfo(p) }))
      .filter(({ p }) => isActive(p))
      .sort((a, b) => order[a.info.layer] - order[b.info.layer] || a.i - b.i);

    const sequenced = [];
    for (const { p: base, i } of list) {
      // `looks: [[flag, { fields }], ...]` changes how a prop is drawn once a story flag
      // is set (e.g. the well with a rope tied on). Only the drawing: the prop itself,
      // its text and its edits stay as they are.
      const p = lookFor(base, isActive);
      const info = propInfo(p);
      const canvases = propCanvases(p, strHash(def.id + '/' + (p._key ?? i)));
      const pl = placement(p, info);
      const textures = canvases.map(tex);
      const spr = new Sprite(textures[0]);
      transformSprite(spr, pl);

      let anim = null;
      if (info.layer === 'obj') {
        // `z` nudges the draw order, e.g. a plant standing on a table
        spr.zIndex = pl.ay + (p.z ?? 0);
        this.objLayer.addChild(spr);
      } else this.decalLayer.addChild(spr);
      if (textures.length > 1) {
        anim = { spr, textures, t: Math.random(), f: 0, delay: p.sequence ? Infinity : 0, steady: !!info.def.steady };
        this.animated.push(anim);
      }

      let { solidTiles, area } = propTiles(p, info, pl);
      // `reach: 'sprite'`: can be interacted with on every tile it is drawn over (a big rug)
      if (p.reach === 'sprite') area = spriteTiles(spr);
      if (solidTiles) {
        const [tx, ty, tw, th] = solidTiles;
        for (let y = ty; y < ty + th; y++) for (let x = tx; x < tx + tw; x++) this.setSolid(x, y);
      }
      const rec = { def: base, info, layer: info.layer, area, sprite: spr, baseZ: pl.ay, solidTiles, anim, light: null };
      this.props.push(rec);

      if (info.light) {
        const lx = pl.fx + (info.tw * TILE) / 2 + (info.light.dx ?? 0) + pl.dx;
        const ly = pl.fy + (info.th * TILE) / 2 + (info.light.dy ?? 0) + pl.dy;
        const light = {
          x: pl.ax + (lx - pl.ax) * (pl.flip ? -pl.scale : pl.scale),
          y: pl.ay + (ly - pl.ay) * pl.scale,
          r: info.light.r * pl.scale,
          a: info.light.a,
          flicker: info.light.flicker,
          phase: Math.random() * 10,
        };
        this.lights.push(light);
        rec.light = light;
        if (p.sequence) sequenced.push({ light, anim });
      }
    }

    // lights flagged `sequence` ignite one by one, nearest to where the player arrived first
    if (sequenced.length) {
      const sx = (spawn?.x ?? 0) * TILE, sy = (spawn?.y ?? 0) * TILE;
      sequenced.sort((a, b) => Math.hypot(a.light.x - sx, a.light.y - sy) - Math.hypot(b.light.x - sx, b.light.y - sy));
      sequenced.forEach((s, rank) => {
        s.light.delay = SEQ_START + rank * SEQ_STEP;
        if (s.anim) s.anim.delay = s.light.delay;
      });
    }
    // opts.onIgnite(light) is called as each of them catches fire (the game plays a sound)
    this.toIgnite = sequenced.map((s) => s.light);
    this.onIgnite = opts.onIgnite ?? null;

    for (const l of def.lights || []) this.lights.push({ ...l, phase: Math.random() * 10 });

    // hidden areas (e.g. the pantry): pitch black until the player steps inside
    this.zones = (def.zones || []).map((z) => ({ ...z, k: spawn && inRect(z.reveal, spawn.x, spawn.y) ? 1 : 0 }));

    this.baseSprite = new Sprite(baseTexture(def));
    this.container.addChild(this.baseSprite, this.decalLayer, this.objLayer);

    this.doors = new Map();
    for (const d of def.doors || []) if (active(d, flags)) this.doors.set(d.x + ',' + d.y, d);

    this.actors = [];
    for (const a of def.actors || []) {
      const actor = new Actor(sheets[a.sprite], a.x, a.y, a.dir);
      actor.def = a;
      actor.idleAnim = a.sprite === 'cloaked';
      this.actors.push(actor);
      this.objLayer.addChild(actor.sprite);
    }
  }

  setSolid(x, y) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.solid[y * this.w + x] = 1;
  }

  tile(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return ' ';
    return this.def.tiles[y][x];
  }

  doorAt(x, y) {
    return this.doors.get(x + ',' + y);
  }

  actorAt(x, y, except) {
    return this.actors.find((a) => a !== except && a.tx === x && a.ty === y);
  }

  /** can an actor standing on (x, y) step in direction dir? */
  canMove(x, y, dir, self) {
    if (!canStep(this, x, y, dir)) return false;
    const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
    return !this.actorAt(x + dx, y + dy, self);
  }

  /** the thing you inspect when facing (x, y) */
  interactAt(x, y) {
    const actor = this.actorAt(x, y);
    if (actor && actor.def?.text) return { kind: 'actor', target: actor, text: actor.def.text };
    const rank = { obj: 0, wall: 1, floor: 2 };
    const hits = this.props
      .filter((p) => {
        const [ax, ay, aw, ah] = p.area;
        const d = p.def;
        return (d.text || d.use || d.onInteract || d.hide) && x >= ax && y >= ay && x < ax + aw && y < ay + ah;
      })
      .sort((a, b) => rank[a.layer] - rank[b.layer]);
    if (hits.length) {
      const d = hits[0].def;
      return { kind: 'prop', target: hits[0], text: d.text, use: d.use, onInteract: d.onInteract };
    }
    const tileText = this.def.tileText?.[this.tile(x, y)];
    if (tileText) return { kind: 'tile', text: tileText };
    return null;
  }

  update(dt, player) {
    this.time += dt;
    if (this.toIgnite.length) {
      const lit = this.toIgnite.filter((l) => this.time >= l.delay);
      if (lit.length) {
        this.toIgnite = this.toIgnite.filter((l) => !lit.includes(l));
        for (const l of lit) this.onIgnite?.(l);
      }
    }
    if (player) {
      for (const z of this.zones) {
        const target = inRect(z.reveal, player.tx, player.ty) ? 1 : 0;
        z.k += Math.sign(target - z.k) * Math.min(Math.abs(target - z.k), dt * 3.5);
      }
    }
    for (const a of this.animated) {
      if (this.time < a.delay) continue; // not lit yet: stays on frame 0
      a.t += dt;
      if (a.t > 0.12) {
        a.t = 0;
        const first = a.delay > 0 ? 1 : 0; // sequenced props use frame 0 as "unlit"
        const n = a.textures.length - first;
        // flames flicker at random; `steady` animations (the portal) play in order
        const step = a.steady ? 1 : 1 + Math.floor(Math.random() * 2);
        a.f = first + ((((a.f - first + step) % n) + n) % n);
        a.spr.texture = a.textures[a.f];
      }
    }
    for (const actor of this.actors) actor.update(dt);
  }

  destroy() {
    this.container.destroy({ children: true });
  }
}
