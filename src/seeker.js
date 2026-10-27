import { Sprite } from 'pixi.js';
import { TILE, WALK_TIME } from './config.js';
import { PC } from './gfx/pixel.js';
import { c, BLOOD, OUT } from './gfx/palette.js';
import { Actor } from './world/actor.js';
import { DELTA, planTrip, floodFrom, walkable, canStep } from './world/nav.js';
import { STAIR_TILES } from './gfx/tiles.js';
import { hearing, guessRoom } from './acoustics.js';
import { play } from './audio.js';

// The hooded figure. He stays frozen while the player explores; on his turn he walks the
// whole house (also where the player can't see him) checking hiding spots.

const STEP_TIME = WALK_TIME / 0.9; // seconds per tile: 10% slower than the player walks
const CHASE_STEP = WALK_TIME; // chasing he runs as fast as the skeleton walks (running gets away)
const SEARCH_TIME = 1.6; // how long he rummages through a hiding spot
const DOOR_TIME = 0.45;
const SPOTS_PER_TURN = 10;
const EARSHOT = 6; // tiles: during a chase he keeps track of the skeleton within this

/**
 * What he can see in the dark, facing down: [sideways, ahead]. Beside him, three wide for
 * two tiles ahead, and one tile further straight on. Turned to whichever way he faces.
 */
const SIGHT = [[-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1], [-1, 2], [0, 2], [1, 2], [0, 3]];

/** a random number from 0 to 1 from the browser's cryptographic generator */
function rand() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 4294967296;
}

const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

export class Seeker {
  constructor(game, start) {
    this.game = game;
    this.map = start.map;
    this.actor = new Actor(game.sheets.cloaked, start.x, start.y, start.dir);
    this.actor.idleAnim = true;
    this.actor.walkTime = STEP_TIME;
    this.sleepSprite = makeSleepSprite(game.sheets.cloaked);
    this.mode = 'frozen'; // frozen | seek | stopping | sleepwalk | asleep
    this.queue = []; // hiding spots left to check this turn
    this.trip = null; // the walk he is on: { legs, li, si, face, task }
    this.wait = 0; // seconds to stand still, then run `then`
    this.then = null;
    this.memory = null; // where the player hid first last turn, checked first next turn
    this.firstHide = null;
    this.chasing = false; // he has seen (or heard, right next to him) the skeleton
    this.heard = null; // { map }: the room he is going to check because he heard running
  }

  get pos() {
    return { map: this.map, x: this.actor.tx, y: this.actor.ty };
  }

  /** the sprite to draw: standing, or lying in bed */
  get sprite() {
    return this.mode === 'asleep' ? this.sleepSprite : this.actor.sprite;
  }

  get asleep() {
    return this.mode === 'asleep';
  }

  /* ---------------- turns ---------------- */

  /** his turn: pick the spots to check, remembered spot first */
  startSeek() {
    const navs = this.game.getNavs();
    const h = this.game.hidden;
    this.firstHide = h ? { map: h.map, key: h.key } : null;
    this.mode = 'seek';
    this.trip = null;
    this.wait = 0;
    this.then = null;

    const all = Object.values(navs).flatMap((n) => n.hides).filter((s) => s.goals.length);
    const reachable = (s, from) => planTrip(navs, from, s.map, s.goals);
    const queue = [];
    if (this.memory) {
      const m = all.find((s) => s.map === this.memory.map && s.key === this.memory.key);
      if (m && reachable(m, this.pos)) queue.push(m);
    }
    // ten random spots he can actually get to, visited in random order
    for (const s of shuffle(all.filter((s) => !queue.includes(s)))) {
      if (queue.length >= SPOTS_PER_TURN + (this.memory ? 1 : 0)) break;
      if (reachable(s, this.pos)) queue.push(s);
    }
    this.queue = queue;
  }

  /** what a save file needs to put him back */
  snapshot() {
    return {
      map: this.map,
      x: this.actor.tx,
      y: this.actor.ty,
      dir: this.actor.dir,
      mode: this.mode === 'stopping' ? 'frozen' : this.mode,
      memory: this.memory,
      firstHide: this.firstHide,
    };
  }

  /** continue from a save file (call once the player's map is loaded) */
  restore(s) {
    this.memory = s.memory ?? null;
    if (s.mode === 'seek') {
      this.startSeek(); // a new random set of spots
      this.firstHide = s.firstHide ?? this.firstHide;
    } else if (s.mode === 'sleepwalk') this.goToSleep();
    else if (s.mode === 'asleep') this.fallAsleep(this.game.getNavs().bedroom?.hides.find((h) => h.t === 'bed'));
  }

  /** time is up: stop where he is (after the step he is on) */
  endSeek() {
    this.stopChase();
    this.heard = null;
    if (this.mode === 'seek') {
      this.mode = 'stopping';
      this.memory = this.firstHide;
      if (!this.then?.door) { this.wait = 0; this.then = null; }
    }
  }

  /** the player hid somewhere during his turn */
  onPlayerHid(spot) {
    if (this.mode === 'seek' && !this.firstHide) this.firstHide = spot;
  }

  /** after the fifth round he goes to bed in the bedroom */
  goToSleep() {
    this.mode = 'sleepwalk';
    this.trip = null;
    this.queue = [];
    if (!this.then?.door) { this.wait = 0; this.then = null; }
  }

  wake() {
    if (this.mode === 'asleep') {
      this.mode = 'frozen';
      this.game.attachSeeker();
    }
    play('wake', 0.8);
  }

  /* ---------------- moving ---------------- */

  /* ---------------- seeing, hearing, chasing ---------------- */

  /** is the skeleton in what he can see right now (not hidden, nothing solid in between)? */
  sees() {
    const g = this.game, p = g.player, a = this.actor;
    if (g.hidden || g.world.def.id !== this.map) return false;
    const nav = g.getNavs()[this.map];
    const [fx, fy] = DELTA[a.dir];
    const [sx, sy] = [Math.abs(fy), Math.abs(fx)]; // sideways
    const at = (side, ahead) => [a.tx + fx * ahead + sx * side, a.ty + fy * ahead + sy * side];
    for (const [side, ahead] of SIGHT) {
      const [x, y] = at(side, ahead);
      if (x !== p.tx || y !== p.ty) continue;
      // walls and furniture between them block the view
      for (let k = 1; k < ahead; k++) {
        const [ix, iy] = at(Math.round((side * k) / ahead), k);
        if (nav.solid[iy * nav.w + ix]) return false;
      }
      return true;
    }
    return false;
  }

  /** every frame of his search: spotting the skeleton, and catching it once he is right next to it */
  watch() {
    const g = this.game, p = g.player, a = this.actor;
    if (this.chasing) {
      const near = !g.hidden && g.world.def.id === this.map && manhattan({ x: a.tx, y: a.ty }, { x: p.tx, y: p.ty }) <= 1;
      if (near) g.caught('He caught you.');
    } else if (this.sees()) this.startChase();
  }

  startChase() {
    if (this.chasing) return;
    this.chasing = true;
    this.heard = null;
    if (this.trip?.task.type === 'search' && !this.trip.task.heard) this.queue.unshift(this.trip.task.spot);
    this.trip = null;
    if (!this.then?.door) {
      this.wait = 0;
      this.then = null;
    }
    this.actor.walkTime = CHASE_STEP;
  }

  stopChase() {
    if (!this.chasing) return;
    this.chasing = false;
    this.trip = null;
    this.actor.walkTime = STEP_TIME;
  }

  /**
   * The skeleton ran (`at` = { map, x, y }) during his search. In the same room: chase.
   * Otherwise he goes to check the room he thinks it came from (see guessRoom).
   */
  hearRun(at) {
    if (this.mode !== 'seek' || this.chasing) return;
    const guess = guessRoom(this.map, at.map, rand);
    if (!guess) return;
    if (guess === 'chase') return this.startChase();
    if (this.heard?.map === guess || this.trip?.task.heardMap === guess) return; // already on his way
    this.heard = { map: guess };
    if (this.trip?.task.type === 'search' && !this.trip.task.heard) this.queue.unshift(this.trip.task.spot);
    this.trip = null;
    if (!this.then) this.wait = 0; // (a search or a door in progress is finished first)
  }

  /** one step of the chase: straight for the skeleton, through doors if need be */
  chaseStep(navs) {
    const g = this.game, p = g.player, a = this.actor;
    const h = g.hidden;
    if (h) {
      // he heard where it hid if he was close enough; otherwise it got away
      const spot = Object.values(navs).flatMap((n) => n.hides).find((s) => s.map === h.map && s.key === h.key);
      const plan = spot && planTrip(navs, this.pos, spot.map, spot.goals);
      this.stopChase();
      if (plan && (spot.map === this.map || plan.cost <= EARSHOT + 2)) this.trip = { ...plan, li: 0, si: 0, task: { type: 'search', spot, heard: true } };
      return;
    }
    const here = g.world.def.id;
    const plan = planTrip(navs, this.pos, here, [{ x: p.tx, y: p.ty }]);
    // out of the room and out of earshot: lost
    if (!plan || (here !== this.map && plan.cost > EARSHOT)) return this.stopChase();
    const leg = plan.legs[0];
    if (!leg.dirs.length) return;
    const dir = leg.dirs[0];
    if (leg.door && leg.dirs.length === 1) return this.passDoor(navs, leg.door, dir);
    if (!canStep(navs[this.map], a.tx, a.ty, dir)) {
      this.wait = 0.2;
      return;
    }
    a.startMove(dir);
    this.sound('heavystep', 1);
  }

  update(dt) {
    const a = this.actor;
    if (this.mode === 'asleep') return;
    if (this.mode === 'seek') this.watch();
    if (a.moving) {
      a.update(dt);
      if (a.moving) return;
    }
    if (this.wait > 0) {
      a.update(dt);
      this.wait -= dt;
      if (this.wait > 0) return;
      const fn = this.then;
      this.then = null;
      fn?.();
      return;
    }
    if (this.mode === 'stopping') {
      this.mode = 'frozen';
      this.trip = null;
      this.relocate();
      return;
    }
    if (this.mode === 'frozen') {
      a.update(dt);
      return;
    }
    this.step();
  }

  step() {
    const navs = this.game.getNavs();
    if (this.chasing) return this.chaseStep(navs);
    if (!this.trip) {
      this.pickTask(navs);
      if (!this.trip) {
        this.wait = 0.5;
        return;
      }
    }
    const trip = this.trip;
    const leg = trip.legs[trip.li];
    if (!leg) return this.arrive();
    if (trip.si >= leg.dirs.length) {
      trip.li++;
      trip.si = 0;
      return;
    }
    const dir = leg.dirs[trip.si];
    const a = this.actor;
    // the last step of a leg goes through a door, up the stairs, or down a ladder
    if (leg.door && trip.si === leg.dirs.length - 1) {
      trip.si++;
      this.passDoor(navs, leg.door, dir);
      return;
    }
    const [dx, dy] = DELTA[dir];
    const nav = navs[this.map];
    if (!canStep(nav, a.tx, a.ty, dir)) {
      this.trip = null; // something changed in the way: plan again
      if (trip.task.spot) this.queue.unshift(trip.task.spot);
      return;
    }
    const p = this.game.player;
    if (this.game.world.def.id === this.map && !this.game.hidden && p.tx === a.tx + dx && p.ty === a.ty + dy) {
      a.face(dir);
      this.wait = 0.3;
      return;
    }
    trip.si++;
    a.startMove(dir);
    this.sound('heavystep', 0.85);
  }

  passDoor(navs, door, dir) {
    const a = this.actor;
    a.face(dir);
    if (doorMakesSound(navs[this.map], door)) this.sound('door', 1, { map: this.map, x: door.x, y: door.y });
    this.wait = DOOR_TIME;
    this.then = () => {
      this.map = door.to;
      a.tx = door.at[0];
      a.ty = door.at[1];
      a.moving = false;
      a.face(door.at[2] ?? dir);
      this.game.attachSeeker();
    };
    this.then.door = true;
  }

  pickTask(navs) {
    if (this.mode === 'sleepwalk') {
      const bed = navs.bedroom?.hides.find((s) => s.t === 'bed');
      const goals = bed ? bed.goals : [{ x: 9, y: 7, dir: 'up' }];
      const plan = planTrip(navs, this.pos, 'bedroom', goals);
      if (plan) this.trip = { ...plan, li: 0, si: 0, task: { type: 'sleep', bed } };
      return;
    }
    // he heard running: check one random hiding spot in the room he thinks it came from
    if (this.heard) {
      const target = this.heard.map;
      this.heard = null;
      const spots = (navs[target]?.hides ?? []).filter((s) => s.goals.length);
      const spot = spots[Math.floor(rand() * spots.length)];
      const plan = spot && planTrip(navs, this.pos, target, spot.goals);
      if (plan) {
        this.trip = { ...plan, li: 0, si: 0, task: { type: 'search', spot, heard: true, heardMap: target } };
        return;
      }
      // nowhere to hide in there: walk in and look around
      const ways = Object.values(navs).flatMap((n) => n.doors).filter((d) => d.to === target).map((d) => ({ x: d.at[0], y: d.at[1] }));
      const look = ways.length && planTrip(navs, this.pos, target, ways);
      if (look) {
        this.trip = { ...look, li: 0, si: 0, task: { type: 'wander', heardMap: target } };
        return;
      }
    }
    while (this.queue.length) {
      const spot = this.queue.shift();
      const plan = planTrip(navs, this.pos, spot.map, spot.goals);
      if (plan) {
        this.trip = { ...plan, li: 0, si: 0, task: { type: 'search', spot } };
        return;
      }
    }
    // checked everything on his list: prowl around the room he is in
    const nav = navs[this.map];
    const flood = floodFrom(nav, this.actor.tx, this.actor.ty);
    const options = [];
    for (let i = 0; i < flood.dist.length; i++) if (flood.dist[i] >= 3 && flood.dist[i] <= 10) options.push(i);
    if (!options.length) return;
    const t = options[Math.floor(rand() * options.length)];
    const goal = { x: t % nav.w, y: Math.floor(t / nav.w), dir: ['up', 'down', 'left', 'right'][Math.floor(rand() * 4)] };
    const plan = planTrip(navs, this.pos, this.map, [goal]);
    if (plan) this.trip = { ...plan, li: 0, si: 0, task: { type: 'wander' } };
  }

  arrive() {
    const { task, face } = this.trip;
    this.trip = null;
    if (face) this.actor.face(face);
    if (task.type === 'search') {
      this.sound('rummage', 1);
      this.wait = SEARCH_TIME;
      this.then = () => {
        const h = this.game.hidden;
        if (h && h.map === task.spot.map && h.key === task.spot.key) this.game.caught(`He found you ${h.phrase}.`);
      };
    } else if (task.type === 'sleep') {
      this.fallAsleep(task.bed);
    } else {
      this.wait = 0.6 + rand();
    }
  }

  fallAsleep(bed) {
    this.mode = 'asleep';
    if (bed) {
      const [ax, ay, aw, ah] = bed.area;
      this.sleepSprite.x = Math.round((ax + aw / 2) * TILE);
      this.sleepSprite.y = Math.round(ay * TILE + 1);
      this.sleepSprite.zIndex = (ay + ah) * TILE + 1;
    }
    this.game.attachSeeker();
  }

  /** play a sound he makes, as loud as the player would hear it from where they are */
  sound(name, vol, at = this.pos) {
    const g = this.game;
    const v = hearing(g.getNavs(), at, { map: g.world.def.id, x: g.player.tx, y: g.player.ty });
    play(name, v * vol);
  }

  /* ---------------- when his turn ends ---------------- */

  /**
   * Don't leave him standing where the player can't get past: away from doors, stairs and
   * ladders (at least 4 tiles), and in a corridor pushed two tiles on and up against a wall.
   */
  relocate() {
    const navs = this.game.getNavs();
    const nav = navs[this.map];
    const a = this.actor;
    const here = { x: a.tx, y: a.ty };
    // where the player can come in, and the doors / stairs / ladders themselves
    const arrivals = [];
    for (const n of Object.values(navs)) for (const d of n.doors) if (d.to === this.map) arrivals.push({ x: d.at[0], y: d.at[1] });
    const blockers = [...nav.doors.map((d) => ({ x: d.x, y: d.y })), ...arrivals];
    for (let y = 0; y < nav.h; y++) for (let x = 0; x < nav.w; x++) if (STAIR_TILES.has(nav.tile(x, y))) blockers.push({ x, y });
    const nearest = (t, list) => Math.min(...list.map((b) => manhattan(b, t)));
    const p = this.game.player;
    const playerHere = this.game.world.def.id === this.map;
    const fine = (t) => walkable(nav, t.x, t.y) && !STAIR_TILES.has(nav.tile(t.x, t.y)) && (!playerHere || manhattan(t, { x: p.tx, y: p.ty }) >= 3);

    let target = null;
    const corridor = nav.def.corridor;
    if (corridor === 'vertical') {
      // two tiles further down, against the closest side wall
      let l = here.x, r = here.x;
      while (walkable(nav, l - 1, here.y)) l--;
      while (walkable(nav, r + 1, here.y)) r++;
      const wallX = here.x - l <= r - here.x ? l : r;
      target = searchLine(nav.h, here.y + 2, (y) => ({ x: wallX, y }), (t) => fine(t) && nearest(t, arrivals) >= 2);
    } else if (corridor === 'horizontal') {
      let u = here.y, d = here.y;
      while (walkable(nav, here.x, u - 1)) u--;
      while (walkable(nav, here.x, d + 1)) d++;
      const wallY = here.y - u < d - here.y ? u : d;
      target = searchLine(nav.w, here.x + 2, (x) => ({ x, y: wallY }), (t) => fine(t) && nearest(t, arrivals) >= 2);
    } else if (blockers.length && (nearest(here, blockers) <= 1 || STAIR_TILES.has(nav.tile(here.x, here.y)))) {
      // the closest spot at least 4 tiles from every door, stairs and ladder
      const flood = floodFrom(nav, here.x, here.y);
      let best = null;
      for (let i = 0; i < flood.dist.length; i++) {
        if (flood.dist[i] < 0) continue;
        const t = { x: i % nav.w, y: Math.floor(i / nav.w) };
        if (!fine(t) || nearest(t, blockers) < 4) continue;
        if (!best || flood.dist[i] < best.d) best = { d: flood.dist[i], t };
      }
      target = best?.t ?? null;
    }
    if (target) {
      a.tx = target.x;
      a.ty = target.y;
      a.face('down');
    }
  }
}

/** try positions along a line: from `start` onwards first, then back the other way */
function searchLine(len, start, at, ok) {
  for (let v = Math.max(0, start); v < len; v++) if (ok(at(v))) return at(v);
  for (let v = Math.min(len - 1, start - 1); v >= 0; v--) if (ok(at(v))) return at(v);
  return null;
}

/** stairs, ladders and the attic hatch don't creak like a door */
export function doorMakesSound(nav, door) {
  if (STAIR_TILES.has(nav.tile(door.x, door.y))) return false;
  return !nav.def.props.some((p) => (p.t === 'ladder' || p.t === 'hatch') && door.x === p.x && door.y >= p.y && door.y < p.y + 3);
}

/** the cloaked figure lying in bed: hood on the pillow, the cloak stretched down the bed */
function makeSleepSprite(sheet) {
  const src = sheet.canvases.down[1];
  const pc = new PC(24, 40);
  const base = c(0x3f3934), dark = c(0x2a2622), light = c(0x5a524b);
  // the body under the cloak, narrowing towards the feet
  for (let y = 12; y <= 37; y++) {
    const half = y < 16 ? 7 : y < 28 ? 8 : Math.max(4, 8 - Math.floor((y - 28) / 2));
    for (let x = 12 - half; x <= 12 + half; x++) pc.px(x, y, x < 9 ? light : x > 14 ? dark : base);
  }
  pc.vl(12, 16, 18, dark);
  pc.speckle(4, 31, 16, 7, BLOOD.dark, 0.25, Math.random);
  pc.px(10, 35, BLOOD.main);
  // the hood, face still hidden in the dark
  pc.ctx.drawImage(src.canvas, 0, 2, 24, 15, 0, 0, 24, 15);
  pc.outline(OUT);
  const spr = new Sprite(pc.texture());
  spr.anchor.set(0.5, 0);
  return spr;
}
