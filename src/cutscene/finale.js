import { Sprite } from 'pixi.js';
import { play, playSample, stopAllSounds, stopLoop, soundLength } from '../audio.js';
import { kneelFrame } from '../gfx/characters.js';
import { propCanvases } from '../gfx/props.js';
import { floodFrom, pathTo, walkable, DELTA } from '../world/nav.js';
import { VOICE } from '../ui/common.js';
import { me, him } from './lines.js';
import { lerp, ease } from './director.js';
import { playRitual, glow } from './intro.js';

// The amulet and the stump in the backyard: break it (the portal goes), or don't, and he
// comes out to talk, which ends in one of two endings.

const ASK_FIRST = 'Break the amulet?';
const ASK = 'Are you sure you want to break the amulet?';

/** the hooded figure trailing off: no quote marks */
const hisPause = (text) => ({ text, color: VOICE.seeker });

/** Use on the stump: asked twice. Yes, yes breaks it; yes, no brings him out. */
export function useAmulet(g) {
  if (g.cycle.phase.kind === 'seek') return g.say("I don't have time for that right now.");
  if (g.flags.has('finale_decide')) return g.say('He is still waiting for my answer.');
  g.choice.show(['Yes', 'No'], (first) => {
    if (first !== 'Yes') return;
    g.choice.show(['Yes', 'No'], (second) => {
      if (second === 'Yes') breakAmulet(g);
      else if (second === 'No') spareIt(g);
    }, ASK, 1);
  }, ASK_FIRST, 1);
}

/** the amulet shatters on the stump, and the portal by the front door goes with it */
function breakAmulet(g) {
  g.runScene(async (d) => {
    g.removeItem('strange_amulet');
    play('shatter', 1);
    await d.wait(Math.min(3, soundLength('shatter') ?? 1.5) + 0.3);
    playSample('barrier');
    g.flags.add('portal_broken'); // the portal is gone; its hum stops
    await d.wait((soundLength('barrier') ?? 5.3) + 0.4);
    await d.say(me('Looks like that did something...'));
    g.flags.add('end_music'); // the background music is the end track from now on
  });
}

/** take `n` steps in one direction at `stepTime` seconds a step (scripted: walls don't stop it) */
async function steps(d, actor, dir, n, stepTime, sound = null) {
  actor.walkTime = stepTime;
  for (let i = 0; i < n; i++) {
    actor.startMove(dir);
    if (sound) play(sound, 0.18);
    await d.until(() => !actor.moving);
  }
  delete actor.walkTime;
}

/**
 * Ending 1: stepping up to the empty doorway once the amulet is broken. He walks out
 * through the dark, out of the house and away from it into the blackness, where he
 * glows, burns white... and only bones are left. The hooded figure watches from the door.
 */
export function ending1(g) {
  g.runScene(async (d) => {
    g.intro = { stage: 'ending1', noMusic: true }; // no clock, no getting caught, no music
    const p = g.player;
    await d.say([me('This is it...'), me('...')]);
    await d.say([
      "Deep inside I feel nervous, like a heart that has been taken from me still beats at it's place, faster and louder than ever before.",
      'There is no going back now...',
    ]);

    // into the blackness where the portal was; the music dies away
    if (g.track) stopLoop(g.track, 2);
    g.track = null;
    p.face('up');
    await steps(d, p, 'up', 1, 0.5, 'step');
    p.startMove('up');
    p.walkTime = 0.5;
    await d.tween(0.5, (k) => (p.sprite.alpha = 1 - k));
    await d.until(() => !p.moving);
    delete p.walkTime;
    p.sprite.visible = false;
    await d.wait(3);

    // outside the house
    await d.tween(0.8, (k) => (g.blackG.alpha = k));
    g.loadMap('outside', 9, 2, 'down', true);
    g.cineCam = null;
    p.sprite.visible = true;
    p.sprite.alpha = 1;
    await d.wait(0.5);
    await d.tween(1.2, (k) => (g.blackG.alpha = 1 - k));
    await d.wait(0.6);
    // he walks away from the door; once he reaches the middle of the screen the camera
    // keeps him there, so the house slides away and he is alone in the dark
    await steps(d, p, 'down', 11, 0.45, 'step');
    await d.wait(1.2);

    // he starts to glow
    const fx = g.fxWorld;
    const bright = new Sprite(p.sprite.texture);
    bright.anchor.set(0.5, 1);
    bright.position.set(p.sprite.x, p.sprite.y);
    bright.blendMode = 'add';
    bright.alpha = 0;
    const halo = glow(p.sprite.x, p.sprite.y - 14);
    fx.addChild(halo, bright);
    const brighten = (sec, b, h, s) => {
      const b0 = bright.alpha, h0 = halo.alpha, s0 = halo.scale.x;
      return d.tween(sec, (k) => {
        bright.alpha = lerp(b0, b, k);
        halo.alpha = lerp(h0, h, k);
        halo.scale.set(lerp(s0, s, k));
      });
    };
    await brighten(1.6, 0.35, 0.25, 0.5);
    await d.say(me('Wait, what is happening??'));
    await brighten(1.3, 0.6, 0.45, 0.8);
    await d.say(me("I can't move my body...."));
    await brighten(1.3, 0.95, 0.7, 1.1);
    await d.say(me('AAAAAAHHHH!!', { shake: true }));

    // white-out, just as in the first cutscene: the barrier sound ends as it turns white
    const grow = Math.max(3, soundLength('barrier') ?? 5.3);
    playSample('barrier');
    await d.tween(grow, (k) => {
      bright.alpha = 1;
      halo.alpha = Math.min(1, 0.7 + k);
      halo.scale.set(1.1 + k * k * 10);
      g.whiteG.alpha = Math.max(0, (k - 0.5) / 0.5) ** 1.6;
    });
    g.whiteG.alpha = 1;
    // ...and where he stood, a pile of bones
    g.clearCineFx();
    p.sprite.visible = false;
    const bones = new Sprite(propCanvases({ t: 'bone_pile' }, 7)[0].texture());
    bones.anchor.set(0.5, 1);
    bones.position.set(p.sprite.x, p.sprite.y - 1);
    bones.zIndex = p.sprite.y;
    g.world.objLayer.addChild(bones);
    await d.tween(0.6, (k) => (g.whiteG.alpha = 1 - k));
    await d.wait(5);

    // back up to the house: he is standing in the door
    const from = { x: g.camX, y: g.camY }, to = g.camAt(9 * 16, 16);
    g.cineCam = { ...from };
    await d.tween(2.5, (k) => {
      g.cineCam.x = lerp(from.x, to.x, ease(k));
      g.cineCam.y = lerp(from.y, to.y, ease(k));
    });
    const s = g.seeker, a = s.actor;
    s.mode = 'frozen';
    s.map = 'outside';
    Object.assign(a, { tx: 9, ty: 2, moving: false, pose: null });
    a.face('down');
    g.attachSeeker();
    await d.tween(0.8, (k) => (a.sprite.alpha = k));
    await d.wait(3);
    await d.say(him("Looks like you weren't the right candidate after all..."));
    await d.wait(2);
    await d.say(him('Shame.'));
    // ...and he goes back inside
    a.face('up');
    await d.tween(0.9, (k) => (a.sprite.alpha = 1 - k));
    s.map = 'kitchen';
    g.attachSeeker();
    a.sprite.alpha = 1;
    await d.wait(1);
    g.showEnding('Ending 1/3', 'gameOver');
  });
}

/** scenes that start when the player steps on certain tiles (`stepScenes` in a map) */
export const STEP_SCENES = { ending1 };

/** which way to face to look at the tile (x, y) */
function towards(from, x, y) {
  const dx = x - from.tx, dy = y - from.ty;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

/** walk an actor along a list of directions, one tile at a time */
async function walk(d, actor, dirs) {
  for (const dir of dirs) {
    actor.startMove(dir);
    await d.until(() => !actor.moving);
  }
}

/** the shortest walk for him in this map to a tile next to the player */
function pathNextTo(g, a, p) {
  const nav = g.getNavs()[g.world.def.id];
  const flood = floodFrom(nav, a.tx, a.ty);
  let best = null;
  for (const [dx, dy] of Object.values(DELTA)) {
    const x = p.tx + dx, y = p.ty + dy;
    if (!walkable(nav, x, y)) continue;
    const dist = flood.dist[y * nav.w + x];
    if (dist >= 0 && (!best || dist < best.dist)) best = { x, y, dist };
  }
  return best ? pathTo(flood, best.x, best.y) : [];
}

/** You hold back the axe: he has been watching. */
function spareIt(g) {
  g.runScene(async (d) => {
    g.intro = { stage: 'finale' }; // no clock, no getting caught, no saving
    const s = g.seeker, a = s.actor, p = g.player;
    await d.say('You lower the axe in hesitation just as the hooded figure watches you do so near the back door of the house.');

    // he comes out through the back door
    s.mode = 'frozen';
    s.map = 'backyard';
    Object.assign(a, { tx: 11, ty: 3, moving: false, pose: null });
    a.face('down');
    g.attachSeeker();
    play('door', 0.6);
    const start = g.followCam();
    g.cineCam = { ...start };
    const there = g.camAt(a.worldX, a.worldY);
    await d.tween(1.2, (k) => {
      g.cineCam.x = lerp(start.x, there.x, ease(k));
      g.cineCam.y = lerp(start.y, there.y, ease(k));
    });
    await d.say(him('I see...'));

    // ...and walks over to the skeleton, the camera following him
    const follow = d.repeat(() => (g.cineCam = g.camAt(a.worldX, a.worldY)));
    await walk(d, a, pathNextTo(g, a, p));
    follow.stop();
    a.face(towards(a, p.tx, p.ty));
    p.face(towards(p, a.tx, a.ty));
    const from = { ...g.cineCam }, back = g.followCam();
    await d.tween(0.6, (k) => {
      g.cineCam.x = lerp(from.x, back.x, ease(k));
      g.cineCam.y = lerp(from.y, back.y, ease(k));
    });
    g.cineCam = null;

    await d.say([
      him("It seems like you're not like the rest, you actually care."),
      him('You actually care about an old man and his longing for his wife.'),
      him('You shall be spared.'),
      me('But is this really what you want?'),
      me("She's...gone, and there is no real way to bring her back."),
      me('You should make amends with reality, whatever it may be, instead of trying to force something unnatural to happen.'),
      him('...'),
      him('Perhaps...'),
      him('...'),
      him("Perhaps you're right."),
      him("I'm...sorry...I did this to you."),
      me('I do not forgive you for your actions. What you did to me, to everyone else...just for your own selfish act.'),
      me('...'),
      me("But what am I to do now...? I can't live like a skeleton in this world."),
      him("There is a way, but...I'm sorry, after all of this, I cannot bring myself to do that"),
      me('What is it?'),
      hisPause('*sigh*'),
      him('In order to bring someone back to life, fully, you need a body as a sacrifice. The body needs to be that of a pure hearted person, someone who truly cared for others.'),
      him('Of course, other things needed to be properly done, but without getting into details...'),
      him("I wanted to use somebody to bring back my wife and, without a doubt, you're the perfect candidate."),
      him('The final test after cognitive and memory tests is the test of empathy.'),
      him('I made sure the amulet was easy to spot and that you understood what it does.'),
      him("That crystal was once bigger, but the previous candidate broke the crystal in hopes of escaping. That's why I had to try again."),
      him('Now, to answer your question...'),
      him('I believe the opposite can also be done, hypothetically speaking...'),
      him('...'),
      him('If I wanted to, I could use my wife as a sacrifice to bring you back to life.'),
      me('I see...'),
      me('...'),
      me('What are you planning to do after you bring her back?'),
      him('I want us to spend the last days together.'),
      me('What if it happens that she dies again very quickly?'),
      him('That will be impossible.'),
      him('You see, when you complete the ritual, the person you brought back to life lives until the one who performed the ritual dies.'),
      me("But if you've always brought one person back to life, how would I play into this game?"),
      him("I thought of using you as the vestige of the soul that's going to be used instead of mine. Mine isn't pure enough to bring someone fully to life, nor has it been even before all of this started."),
      him("That's why I could only manage to bring someone in their skeletal form. Even without everything else being done to perfection, my soul was just not too pure of an anchor to resurrect someone."),
      him('But, if the book is correct, there is a way to use someone on the side as an anchor while you still perform the ritual yourself.'),
      him("Obviously no one was going to willingly give up their life for someone who they haven't known half of their lifetime like I did, that's why I had to resort to...well...this."),
      him('With nothing left, you cannot return to the real world, therefore your only option was to...cooperate.'),
      him('...'),
      him('Saying it out loud makes me realize why the last subject broke the crystal in the end...'),
      him("There is no way for a madman to convince someone to help him, especially not after everything I've done..."),
      him('So...tell me...'),
    ]);

    // he goes down on his knees
    a.pose = kneelFrame().texture();
    await d.wait(1.2);
    await finalQuestion(g, d);
  });
}

const FINAL_QUESTION =
  '"Would you, by some chance, after everything, sacrifice yourself for my selfishness? There is really not a nice way to put this..."';
const THINK = 'Think about it';

/**
 * His last question. Yes and No lead to their endings; "Think about it" leaves him kneeling
 * there (no clock, timers hidden) so the game can be saved first; talking to him again asks
 * once more (see askAgain). ESC isn't an answer: he asks again.
 */
async function finalQuestion(g, d) {
  let answer = null;
  while (!answer) {
    let picked = false;
    g.choice.show(['Yes', 'No', THINK], (pick) => ((answer = pick), (picked = true)), FINAL_QUESTION, 0, VOICE.seeker);
    await d.until(() => picked);
  }
  if (answer === THINK) {
    await d.say(me('Let me think this over...'));
    enterDecide(g);
    g.timersHidden = false; // (they stay hidden while deciding; no fade back)
    return;
  }
  g.flags.delete('finale_decide');
  if (answer === 'Yes') await sacrifice(g, d);
  else await refuse(g, d);
}

/** waiting for the answer: free to walk around and save, he stays where he is, on his knees */
export function enterDecide(g) {
  g.flags.add('finale_decide'); // saved with the game, so loading puts it back like this
  g.intro = { stage: 'decide' }; // no clock, no getting caught, timers hidden
  const s = g.seeker;
  s.mode = 'frozen';
  s.actor.pose = kneelFrame().texture();
  g.cine = false;
}

/** talking to him again while deciding: the same question, the same three answers */
export function askAgain(g) {
  g.runScene(async (d) => {
    g.intro = { stage: 'finale' };
    const a = g.seeker.actor, p = g.player;
    a.face(towards(a, p.tx, p.ty));
    await finalQuestion(g, d);
  });
}

/** Ending 2: the skeleton goes with him to the summoning room */
async function sacrifice(g, d) {
  const s = g.seeker, a = s.actor;
  a.pose = null;
  await d.wait(0.6);
  await d.say(him("Alright, let's do this swiftly."));

  // he walks to the back door and goes inside
  const nav = g.getNavs()[g.world.def.id];
  const flood = floodFrom(nav, a.tx, a.ty);
  await walk(d, a, pathTo(flood, 11, 3) ?? []);
  a.face('up');
  await d.wait(0.3);
  play('door', 0.6);
  s.map = 'kitchen'; // out of sight
  g.attachSeeker();

  // the player follows in their own time
  g.intro.stage = 'follow';
  g.cine = false;
  await d.until(() => g.intro.go);
  g.cine = true;
  stopAllSounds(0.6);
  await d.tween(0.8, (k) => (g.blackG.alpha = k));
  await d.wait(0.6);

  // the summoning again, this time with him kneeling there too
  await playRitual(g, d, { skeleton: true });
  await d.wait(2.5);
  await d.say(him('Thank you.'));
  g.showEnding('Ending 2/3');
}

/** Ending 3: no */
async function refuse(g, d) {
  g.seeker.actor.pose = null;
  await d.wait(0.6);
  await d.say(him("Well, I guess you weren't the right fit after all."));
  await d.say('He picks up the axe you have put down moments ago and swings it towards your skull.');
  g.blackG.alpha = 1;
  play('bonesFall', 1);
  await d.wait(1.8);
  await d.say('A loud crack and rattling of the bones is the last thing you hear before your vision goes dark and your body falls to the ground.');
  g.showEnding('Ending 3/3');
}
