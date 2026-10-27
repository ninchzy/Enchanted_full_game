import { Sprite, Texture, CanvasSource } from 'pixi.js';
import { VOICE } from '../ui/common.js';
import { zalgo } from '../ui/zalgo.js';
import { play, playSample, startLoop, stopAllSounds, soundLength } from '../audio.js';
import { propCanvases } from '../gfx/props.js';
import { kneelFrame, skeletonKneelFrame } from '../gfx/characters.js';
import { lerp, ease } from './director.js';
import { me, him } from './lines.js';

// The opening of a new game: the summoning in the dark, waking up in the spare bedroom,
// meeting him in the hallway, and the rules of the game. Timers start at the very end.

/** the chanting: unreadable, in the blood colour */
const chant = (text, seed) => ({ text: zalgo(text, seed, 0.55), color: VOICE.ritual });

// PLACEHOLDER conversation, to be replaced with the real one
const TALK = [
  him('So. You can stand. Good.'),
  me('Who are you? What is this place?'),
  him('This is my house. For now, it is yours too.'),
  him("Let's play a game. Hide and seek. You remember how it goes?"),
  me('A game...?'),
  him('For five minutes you may go wherever you like. Search the house. Find a way out, if you can.'),
  him('Then it is my turn. For two minutes, I look for you.'),
  him('And when I am done, we start again. And again. Forever.'),
  me('And if you find me?'),
  him("Then you'll find out."),
  him('Here. So you always know how much time you have left.'),
];

/** where he waits during the explore phase once the game begins: by the front door */
export const SEEKER_AFTER_INTRO = { map: 'hall_g', x: 10, y: 3, dir: 'down' };

let glowTex = null;
/** soft white disc that fades out to the edge */
function glowTexture() {
  if (glowTex) return glowTex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glowTex = new Texture({ source: new CanvasSource({ resource: cv, scaleMode: 'linear' }) });
  return glowTex;
}

/** a soft glowing disc (white unless tinted), invisible until its alpha is raised */
export function glow(x, y, tint = 0xffffff) {
  const s = new Sprite(glowTexture());
  s.anchor.set(0.5);
  s.position.set(x, y);
  s.tint = tint;
  s.alpha = 0;
  return s;
}

/**
 * The summoning room as the cutscene shows it: pitch black but for the candles (unlit
 * for now) and the pentagram; the mannequin replaced by the pile of bones, with him
 * kneeling behind it.
 */
function setupRitual(game, { skeleton = false } = {}) {
  game.loadMap('summoning', 10, 12, 'up', true);
  const w = game.world;
  w.def.ambient = 1;
  game.player.sprite.visible = false;

  const find = (t) => w.props.find((p) => p.def.t === t);
  const pent = find('pentagram');
  const px = pent.sprite.x, py = pent.sprite.y;
  const mann = find('mannequin');
  // only the candles and the pentagram are shown; the rest of the room stays unseen
  for (const p of w.props) if (p.def.t !== 'candle' && p !== pent) p.sprite.visible = false;
  // he kneels where the mannequin stood, the bones lie just in front of him
  const kx = mann ? mann.sprite.x : px, ky = mann ? mann.sprite.y : py - 4;

  const kneel = new Sprite(kneelFrame().texture());
  kneel.anchor.set(0.5, 1);
  kneel.position.set(kx, ky + 2);
  kneel.zIndex = ky + 2;
  const boneTex = propCanvases({ t: 'bone_pile' }, 7)[0].texture();
  const bones = new Sprite(boneTex);
  bones.anchor.set(0.5, 1);
  bones.position.set(kx, ky + 19);
  // the ending's version: the skeleton kneels to the left of the bones, facing them
  const figures = [kneel, bones];
  if (skeleton) {
    const sk = new Sprite(skeletonKneelFrame('right').texture());
    sk.anchor.set(0.5, 1);
    sk.position.set(kx - 26, ky + 20);
    figures.push(sk);
  }
  // they stand above the glowing pentagram, so they live with the glows (above the
  // darkness): hidden until the candles light, and dimmed to match the candlelight
  for (const s of figures) {
    s.alpha = 0;
    s.tint = 0x9a9a9a;
  }

  // candles: unlit, and the only lights in the room
  const candles = w.props.filter((p) => p.def.t === 'candle' && p.light);
  const unlit = propCanvases({ t: 'candle', black: true, unlit: true }, 1)[0].texture();
  for (const cd of candles) {
    cd.sprite.texture = unlit;
    if (cd.anim) cd.anim.delay = Infinity;
    cd.light.delay = Infinity;
    cd.light.r = 46;
    cd.light.a = 0.9;
  }
  // lit clockwise, starting from the top
  const ang = (cd) => (Math.atan2(cd.sprite.y - py, cd.sprite.x - px) + Math.PI * 2.5) % (Math.PI * 2);
  candles.sort((a, b) => ang(a) - ang(b));
  const pentLight = { x: px, y: py, r: 0, a: 0, phase: 0 };
  w.lights = [...candles.map((cd) => cd.light), pentLight];

  // glows, drawn above the darkness so they really shine
  const fx = game.fxWorld;
  const halo = glow(px, py, 0xd11b5c);
  halo.scale.set(1.5, 1.2);
  halo.blendMode = 'add';
  const pentGlow = new Sprite(pent.sprite.texture);
  pentGlow.anchor.copyFrom(pent.sprite.anchor);
  pentGlow.position.copyFrom(pent.sprite.position);
  pentGlow.scale.copyFrom(pent.sprite.scale);
  pentGlow.rotation = pent.sprite.rotation;
  pentGlow.blendMode = 'add';
  pentGlow.alpha = 0;
  const bonesGlow = new Sprite(boneTex);
  bonesGlow.anchor.set(0.5, 1);
  bonesGlow.position.copyFrom(bones.position);
  bonesGlow.blendMode = 'add';
  bonesGlow.alpha = 0;
  const boneHalo = glow(kx, ky + 10);
  boneHalo.scale.set(0.6);
  fx.addChild(halo, pentGlow, ...figures, bonesGlow, boneHalo);

  return { w, candles, pentLight, halo, pentGlow, kneel, bones, figures, bonesGlow, boneHalo };
}

function ignite(w, cd) {
  cd.light.delay = w.time;
  if (cd.anim) cd.anim.delay = w.time;
  cd.sprite.texture = cd.anim ? cd.anim.textures[1] : cd.sprite.texture;
}

/**
 * The summoning, from the black screen to the white-out and the fade back to black (the
 * screen is left black). The opening plays it as is; the ending adds the skeleton
 * kneeling by the bones (`skeleton: true`).
 */
export async function playRitual(game, d, opts = {}) {
  game.intro = { ...(game.intro ?? {}), stage: 'ritual' };
  game.cine = true;
  game.blackG.alpha = 1;

  const rit = setupRitual(game, opts);
  startLoop('cutscene');
  await d.wait(4);
  await d.say(['*murmuring*', '*distant chanting*']);

  playSample('ritual');
  game.blackG.alpha = 0; // the room is still dark: only the candles will show it
  for (const [i, cd] of rit.candles.entries()) {
    ignite(rit.w, cd);
    playSample('candle', { vol: 0.75 });
    const from = rit.kneel.alpha, to = (i + 1) / rit.candles.length;
    await d.tween(0.45, (k) => rit.figures.forEach((s) => (s.alpha = lerp(from, to, k))));
  }
  await d.wait(0.9);
  await d.say(chant("Vhal'nek ur-zhoth, ka'ramesh ul-thaar", 11));

  d.repeat(() => playSample('ritual'), 6); // plays now, then every 6 seconds
  await d.say([chant("Ghor'na mezh drothek, sar'nai zul'kath", 23), chant('...', 3)]);

  // the pentagram lights up
  playSample('pentagram');
  await d.tween(1.6, (k) => {
    rit.figures.forEach((s) => (s.tint = k > 0.5 ? 0xc0b0b6 : 0x9a9a9a)); // lit from below now
    rit.pentGlow.alpha = k * 0.85;
    rit.halo.alpha = k * 0.4;
    rit.pentLight.r = 78 * k;
    rit.pentLight.a = 0.7 * k;
  });
  d.repeat((t) => {
    rit.pentGlow.alpha = 0.72 + Math.sin(t * 2.3) * 0.13;
    rit.halo.alpha = 0.34 + Math.sin(t * 2.3) * 0.06;
  });
  await d.say([chant("Ixh'ra vool, nai'keth eth mor-ghaal", 37), chant("Sa'thul ek-vorra, uth'nai zharoth!", 41), chant('...', 5)]);

  // the bones start to glow, pulsing...
  for (let i = 0; i < 3; i++) {
    playSample('pentagram');
    await d.tween(2.2, (k) => {
      const s = Math.sin(k * Math.PI);
      rit.bonesGlow.alpha = 0.2 + s * 0.8;
      rit.boneHalo.alpha = 0.12 + s * (0.4 + i * 0.12);
      rit.boneHalo.scale.set(0.6 + s * (0.35 + i * 0.15));
    });
  }
  // ...then grow until everything is white, just as the barrier sound ends
  const grow = Math.max(3, soundLength('barrier') ?? 5.3);
  playSample('barrier');
  await d.tween(grow, (k) => {
    rit.bonesGlow.alpha = 1;
    rit.boneHalo.alpha = Math.min(1, 0.15 + k * 1.4);
    rit.boneHalo.scale.set(0.6 + k * k * 10);
    game.whiteG.alpha = Math.max(0, (k - 0.5) / 0.5) ** 1.6;
  });
  game.whiteG.alpha = 1;
  stopAllSounds(0.03);
  d.stopRepeats();

  // white fades to black
  game.clearCineFx();
  game.blackG.alpha = 1;
  await d.tween(1.6, (k) => (game.whiteG.alpha = 1 - k));
}

export async function playIntro(game) {
  const d = game.director;
  game.intro = { stage: 'ritual' };

  /* ---------- the summoning ---------- */
  await playRitual(game, d);

  /* ---------- waking up ---------- */
  await d.wait(1.2);
  await d.say([{ text: '...', color: VOICE.skeleton }, me('Ow, my head.')]);

  game.intro.stage = 'wake';
  game.loadMap('spare', 8, 5, 'down', true);
  game.player.sprite.visible = true; // (the background music starts by itself: see game.updateMusic)
  await d.wait(0.6);
  await d.tween(1.6, (k) => (game.blackG.alpha = 1 - k));
  await d.wait(0.3);
  await d.say(me('Where am I?'));
  game.cine = false; // free to walk the room; objects only get "I should find out where I am first."

  /* ---------- he is waiting in the hallway ---------- */
  await d.until(() => game.world.def.id === 'hall_g' && !game.fade);
  game.intro.stage = 'scene';
  game.cine = true;
  await d.wait(0.5);
  const start = game.followCam();
  game.cineCam = { ...start };
  await d.tween(1.6, (k) => (game.cineCam.y = lerp(start.y, 0, ease(k))));

  // he steps out of the kitchen
  const s = game.seeker;
  const a = s.actor;
  s.mode = 'frozen';
  s.map = 'hall_g';
  a.tx = 11;
  a.ty = 8;
  a.moving = false;
  a.face('left');
  game.attachSeeker();
  play('door', 0.55);
  await d.wait(0.35);
  a.startMove('left');
  await d.until(() => !a.moving);
  await d.wait(0.25);
  a.face('down');
  await d.wait(0.5);
  await d.say([him("Oh, you're awake."), him("Come, let's talk.")]);

  const from = { ...game.cineCam }, back = game.followCam();
  await d.tween(1.4, (k) => (game.cineCam.y = lerp(from.y, back.y, ease(k))));
  game.cineCam = null;
  await d.say('I should see what is going on here.');

  /* ---------- the rules of the game ---------- */
  game.intro.stage = 'meet';
  game.cine = false;
  await d.until(() => game.intro.talk); // the player walks up to him and presses SPACE
  game.cine = true;
  const p = game.player;
  a.face(p.tx < a.tx ? 'left' : p.tx > a.tx ? 'right' : p.ty < a.ty ? 'up' : 'down');
  await d.say(TALK);
  await d.say(game.giveItem('pocket_watch'));

  // he takes his place by the front door, and the game begins
  await d.tween(0.6, (k) => (game.blackG.alpha = k));
  s.map = SEEKER_AFTER_INTRO.map;
  a.tx = SEEKER_AFTER_INTRO.x;
  a.ty = SEEKER_AFTER_INTRO.y;
  a.face(SEEKER_AFTER_INTRO.dir);
  game.attachSeeker();
  await d.wait(0.5);
  game.endIntro();
  await d.tween(0.6, (k) => (game.blackG.alpha = 1 - k));
}
