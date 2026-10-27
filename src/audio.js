// Sound. Recorded files from /sounds (music, cutscene sounds, the door) plus a few
// placeholder effects synthesised with the Web Audio API (footsteps, rummaging, the groan).
// play(name, volume) is what the game calls for effects; playSample / startLoop for files.

import musicUrl from '../sounds/background music.mp3';
import cutsceneUrl from '../sounds/first cutscene.mp3';
import ritualUrl from '../sounds/first cutscene sound effect (every 6 seconds).wav';
import candleUrl from '../sounds/candle and torch.wav';
import pentagramUrl from '../sounds/pentagram illuminating.wav';
import barrierUrl from '../sounds/magical barrier.wav';
import doorUrl from '../sounds/opening door (4).wav';
import itemUrl from '../sounds/finding an item.wav';
import walkUrl from '../sounds/walking.mp3';
// 0:44 to 2:44 of "summoning room and hidden room", cut by tools/cut-loop.mjs so its end
// flows back into its start (the full recording is 10 minutes / 112 MB)
import ritualRoomUrl from '../sounds/summoning room loop (cut from 0.44, 2min).wav';
import ropeUrl from '../sounds/rope.wav';
import ropePullUrl from '../sounds/rope pulling.wav';
import splashUrl from '../sounds/water splash.wav';
import unlockUrl from '../sounds/unlocking door.flac';
import mainDoorUrl from '../sounds/unlocking main door.wav';
import portalIdleUrl from '../sounds/portal idle.mp3';
import pushUrl from '../sounds/push.wav';
import shatterUrl from '../sounds/shatter.ogg';
import gameOverUrl from '../sounds/game over ending screen.wav';
import chaseUrl from '../sounds/horror chase.wav';
import bonesFallUrl from '../sounds/bones falling.wav';
import endUrl from '../sounds/end.wav';

const FILES = {
  music: musicUrl,
  cutscene: cutsceneUrl,
  ritual: ritualUrl,
  candle: candleUrl,
  pentagram: pentagramUrl,
  barrier: barrierUrl,
  door: doorUrl,
  item: itemUrl,
  walk: walkUrl,
  ritualRoom: ritualRoomUrl,
  rope: ropeUrl,
  ropePull: ropePullUrl,
  splash: splashUrl,
  unlock: unlockUrl,
  mainDoor: mainDoorUrl,
  portalIdle: portalIdleUrl,
  push: pushUrl,
  shatter: shatterUrl,
  bonesFall: bonesFallUrl,
  end: endUrl,
  gameOver: gameOverUrl,
  chase: chaseUrl,
};

/**
 * How the two music tracks loop. Neither was made as a loop (the background music has two
 * seconds of silence up front and both fade out at the end), so each repeat starts at
 * `from` while the previous copy is still fading out at `next`: no gap, no hard cut.
 */
const LOOPS = {
  music: { from: 2.0, next: 125.0 },
  cutscene: { from: 0, next: 47.0 },
  // already cut as a loop: simply repeats, sample for sample
  ritualRoom: { native: true },
  // the background music once the front door has been opened
  mainDoor: { from: 0.2, next: 48.9 },
  // the background music once the amulet is broken: it builds up and stays loud to the
  // end, so each repeat starts while the last copy dies away
  end: { from: 0.29, next: 73.2 },
  // while he chases the skeleton: a second of silence first, a fade at the end
  chase: { from: 0.98, next: 53.0 },
  // ending 1's GAME OVER screen: made to loop (loud right to its last sample)
  gameOver: { native: true, loopStart: 'audible' },
  // the portal's hum: "portal idle", steady from start to end, looped without its
  // encoder silence at the very start
  portalHum: { native: true, file: 'portalIdle', loopStart: 'audible', loopEnd: 'audible', sfx: true },
};

// The context exists from the start (decoding works while it is suspended); browsers
// only let it play after the first key press or click.
const ctx = new (window.AudioContext || window.webkitAudioContext)();
// music (the looping tracks) and sound effects (everything else, the portal's hum too) go
// through their own volume, then the editor's master volume, then the player's
const musicBus = ctx.createGain();
const sfxBus = ctx.createGain();
const master = ctx.createGain();
const playerMaster = ctx.createGain();
musicBus.connect(master);
sfxBus.connect(master);
master.connect(playerMaster).connect(ctx.destination);
let noiseBuf = null;

export function unlockAudio() {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume().catch(() => {});
}
// every kind of key press, click and touch counts: browsers only allow sound after one
for (const ev of ['keydown', 'keyup', 'pointerdown', 'pointerup', 'mousedown', 'click', 'touchend']) {
  window.addEventListener(ev, unlockAudio, { capture: true });
}

let lastNudge = 0;
/**
 * Called every frame: if the browser has paused sound (it does that to pages that make
 * sound before the player has touched them, and sometimes after a reload), keep asking
 * it to start again once the player has interacted with the page.
 */
export function keepAudioAlive() {
  if (ctx.state === 'running' && noiseBuf) return;
  const now = performance.now();
  if (now - lastNudge < 500) return;
  lastNudge = now;
  if (navigator.userActivation?.hasBeenActive ?? true) unlockAudio();
}

const running = () => ctx.state === 'running' && noiseBuf;
/** 'running' once the browser lets the game make sound (for checking from the console) */
export const audioState = () => ctx.state;

/* ---------------- volume per sound (set in the editor) ---------------- */

/** every sound the editor lists, by the name the game plays it under */
export const SOUND_LIST = [
  { id: 'master', label: 'Master volume' },
  { id: 'music', label: 'Background music', loop: true },
  { id: 'ritualRoom', label: 'Summoning / hidden room', loop: true },
  { id: 'cutscene', label: 'First cutscene (track)', loop: true },
  { id: 'mainDoor', label: 'After the front door opens', loop: true },
  { id: 'portalHum', label: 'Portal hum (near the door)', loop: true },
  { id: 'end', label: 'After the amulet breaks', loop: true },
  { id: 'gameOver', label: 'Ending 1 GAME OVER screen', loop: true },
  { id: 'chase', label: 'Chase', loop: true },
  { id: 'ritual', label: 'Ritual sound (every 6 s)' },
  { id: 'candle', label: 'Candle and torch' },
  { id: 'pentagram', label: 'Pentagram illuminating' },
  { id: 'barrier', label: 'Magical barrier' },
  { id: 'item', label: 'Finding an item' },
  { id: 'door', label: 'Doors' },
  { id: 'unlock', label: 'Unlocking a door' },
  { id: 'rope', label: 'Rope (tied to the well)' },
  { id: 'splash', label: 'Water splash' },
  { id: 'ropePull', label: 'Pulling the rope up' },
  { id: 'push', label: 'Hitting the portal' },
  { id: 'shatter', label: 'The amulet shattering' },
  { id: 'bonesFall', label: 'Bones falling' },
  { id: 'pushback', label: 'Pushed back by the portal' },
  { id: 'step', label: 'Skeleton footsteps' },
  { id: 'stepHollow', label: 'Footsteps on the hollow rug' },
  { id: 'heavystep', label: 'His footsteps' },
  { id: 'rummage', label: 'He searches a spot' },
  { id: 'wake', label: 'He wakes up' },
  { id: 'caught', label: 'Caught' },
];

// src/sound-volumes.json: { "<id>": 0.8, ... } (1 = as recorded, missing = 1)
import savedVolumes from './sound-volumes.json';
const volumes = { ...savedVolumes };

/** in dev, read the file fresh (the bundled copy can be stale after saving from the editor) */
export async function loadSoundVolumes() {
  if (!import.meta.env.DEV) return applyVolumes();
  try {
    const res = await fetch('/__editor/sounds');
    if (res.ok) Object.assign(volumes, await res.json());
  } catch {
    // no dev server: keep the bundled volumes
  }
  applyVolumes();
}

export const soundVolume = (id) => volumes[id] ?? 1;
export const soundVolumes = () => ({ ...volumes });

export function setSoundVolume(id, v) {
  volumes[id] = v;
  applyVolumes();
}

function applyVolumes() {
  master.gain.value = soundVolume('master');
  for (const [name, l] of Object.entries(loops)) l.trim.gain.value = soundVolume(name);
}

/* ---------------- the player's volumes (the Settings menu) ---------------- */

const MIX_KEY = 'skeleton-house:volume';
const MIX = { master: playerMaster, music: musicBus, sfx: sfxBus };
const mix = { master: 1, music: 1, sfx: 1 };
try {
  Object.assign(mix, JSON.parse(localStorage.getItem(MIX_KEY)));
} catch {
  // nothing saved yet (or storage blocked): everything at full volume
}
applyMix();

/** 'master' | 'music' | 'sfx', from 0 to 1 */
export const mixVolume = (kind) => mix[kind];

export function setMixVolume(kind, v) {
  mix[kind] = Math.max(0, Math.min(1, v));
  applyMix();
  try {
    localStorage.setItem(MIX_KEY, JSON.stringify(mix));
  } catch {
    // not remembered for next time, but it still applies now
  }
}

function applyMix() {
  // squared, so halfway on the slider sounds about half as loud
  for (const [kind, node] of Object.entries(MIX)) node.gain.value = mix[kind] ** 2;
}

let musicPreview = null;
/** a few seconds of the background music, to hear the music volume when none is playing */
export function previewMusic() {
  if (Object.values(loops).some((l) => !l.stopped && !LOOPS[l.name].sfx)) return;
  musicPreview?.stop(0.3);
  musicPreview = playSample('music', { offset: LOOPS.music.from + 8, dur: 3, fadeOut: 0.8, bus: musicBus });
}

function out(vol) {
  const g = ctx.createGain();
  g.gain.value = vol;
  g.connect(sfxBus);
  return g;
}

/* ---------------- recorded sounds ---------------- */

const buffers = {};
const loading = {};
const audibleEnd = {}; // seconds into the file where the sound has died away
const audibleStart = {}; // ...and where it starts

function load(name) {
  return (loading[name] ??= fetch(FILES[name])
    .then((r) => r.arrayBuffer())
    .then((b) => ctx.decodeAudioData(b))
    .then((buf) => {
      buffers[name] = buf;
      // find where it really ends (many files trail off into silence)
      const d = buf.getChannelData(0);
      let peak = 0;
      for (let i = 0; i < d.length; i += 16) peak = Math.max(peak, Math.abs(d[i]));
      let last = d.length - 1;
      while (last > 0 && Math.abs(d[last]) < peak * 0.02) last--;
      audibleEnd[name] = last / buf.sampleRate;
      let first = 0;
      while (first < last && Math.abs(d[first]) < peak * 0.02) first++;
      audibleStart[name] = first / buf.sampleRate;
      return buf;
    }));
}

/** start fetching and decoding every sound file */
export function preloadSounds() {
  for (const name of Object.keys(FILES)) load(name).catch((e) => console.warn('sound', name, e));
}

/** how long a file's sound lasts, without its silent tail (null until loaded) */
export function soundLength(name) {
  return audibleEnd[name] ?? null;
}

const playing = new Set(); // sample handles, so everything can be cut at once

/**
 * play a recorded sound once; returns a handle with stop(), or null if it can't play yet.
 * `key` is whose volume setting applies (the file's name unless an effect says otherwise).
 */
export function playSample(name, { vol = 1, offset = 0, dur, fadeOut = 0, rate = 1, key = name, fx = null, bus = sfxBus } = {}) {
  const buf = buffers[name];
  if (!buf || !running()) return null;
  vol *= soundVolume(key);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = rate;
  if (dur) dur /= rate; // `dur` is measured in the file; played faster it ends sooner
  const g = ctx.createGain();
  const t = ctx.currentTime + 0.005;
  g.gain.setValueAtTime(vol, t);
  if (dur && fadeOut) {
    g.gain.setValueAtTime(vol, t + dur - fadeOut);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
  }
  src.connect(g);
  if (fx === 'hollow') hollow(g);
  else g.connect(bus);
  src.start(t, offset, dur && dur * rate);
  const h = {
    stop(fade = 0.05) {
      const now = ctx.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0.0001, now + fade);
      try { src.stop(now + fade + 0.02); } catch { /* already stopped */ }
      playing.delete(h);
    },
  };
  src.onended = () => playing.delete(h);
  playing.add(h);
  return h;
}

/**
 * Make a sound hollow, like a step on boards with an empty space underneath: a boom of
 * the space below and the ring of the boards, then a few quick, dull echoes inside it.
 */
function hollow(input) {
  const boom = ctx.createBiquadFilter();
  boom.type = 'peaking';
  boom.frequency.value = 170;
  boom.Q.value = 3;
  boom.gain.value = 12;
  const ring = ctx.createBiquadFilter();
  ring.type = 'peaking';
  ring.frequency.value = 620;
  ring.Q.value = 6;
  ring.gain.value = 10;
  const body = ctx.createGain();
  body.gain.value = 0.55; // the boosts above would clip otherwise
  input.connect(boom).connect(ring).connect(body);
  body.connect(sfxBus);
  // echoes: a short delay feeding back into itself, losing its top each time round
  const delay = ctx.createDelay(0.5);
  delay.delayTime.value = 0.052;
  const damp = ctx.createBiquadFilter();
  damp.type = 'lowpass';
  damp.frequency.value = 1400;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.5;
  const wet = ctx.createGain();
  wet.gain.value = 0.7;
  body.connect(delay);
  delay.connect(damp).connect(feedback).connect(delay);
  damp.connect(wet).connect(sfxBus);
}

/** a music track repeating seamlessly (see LOOPS) */
class Loop {
  constructor(name, vol) {
    this.name = name;
    // `gain` is what the game asks for (fades, half volume while he searches),
    // `trim` the track's own volume setting from the editor
    this.gain = ctx.createGain();
    this.gain.gain.value = vol;
    this.trim = ctx.createGain();
    this.trim.gain.value = soundVolume(name);
    this.gain.connect(this.trim).connect(LOOPS[name].sfx ? sfxBus : musicBus);
    this.sources = [];
    this.stopped = false;
    this.timer = null;
    this.file = LOOPS[name].file ?? name; // a loop can reuse another sound's file
    load(this.file).then(() => {
      if (!this.stopped) this.begin();
    });
  }

  begin() {
    const { from } = LOOPS[this.name];
    // wait for the first key press if the browser hasn't allowed sound yet
    if (!running()) {
      this.timer = setTimeout(() => this.begin(), 200);
      return;
    }
    const cfg = LOOPS[this.name];
    if (cfg.native) {
      const src = ctx.createBufferSource();
      src.buffer = buffers[this.file];
      src.loop = true;
      if (cfg.loopEnd) src.loopEnd = cfg.loopEnd === 'audible' ? audibleEnd[this.file] + 0.05 : cfg.loopEnd;
      if (cfg.loopStart) src.loopStart = cfg.loopStart === 'audible' ? audibleStart[this.file] : cfg.loopStart;
      src.playbackRate.value = cfg.rate ?? 1;
      src.connect(this.gain);
      src.start(ctx.currentTime + 0.05, src.loopStart || 0);
      this.sources.push(src);
      return;
    }
    this.nextStart = ctx.currentTime + 0.05;
    this.offset = from;
    this.schedule();
  }

  /** queue the next copy a few seconds before it is due */
  schedule() {
    if (this.stopped) return;
    const { from, next } = LOOPS[this.name];
    const buf = buffers[this.file];
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.gain);
    src.start(this.nextStart, this.offset);
    src.onended = () => (this.sources = this.sources.filter((s) => s !== src));
    this.sources.push(src);
    this.nextStart += next - this.offset;
    const lead = (this.nextStart - ctx.currentTime - 3) * 1000;
    this.timer = setTimeout(() => this.schedule(), Math.max(0, lead));
  }

  setVolume(v, ramp = 1) {
    const now = ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(v, now + ramp);
  }

  stop(fade = 0.05) {
    this.stopped = true;
    clearTimeout(this.timer);
    this.setVolume(0.0001, fade);
    const at = ctx.currentTime + fade + 0.02;
    for (const s of this.sources) {
      try { s.stop(at); } catch { /* not started */ }
    }
  }
}

const loops = {};

/** start a looping track (does nothing if it is already playing) */
export function startLoop(name, vol = 1) {
  if (loops[name] && !loops[name].stopped) return loops[name];
  loops[name] = new Loop(name, vol);
  return loops[name];
}

export function stopLoop(name, fade = 0.5) {
  loops[name]?.stop(fade);
  delete loops[name];
}

export function setLoopVolume(name, vol, ramp = 1) {
  loops[name]?.setVolume(vol, ramp);
}

export function isLooping(name) {
  return !!loops[name] && !loops[name].stopped;
}

/** silence everything: music, recorded and synthesised sounds */
export function stopAllSounds(fade = 0.05) {
  for (const name of Object.keys(loops)) stopLoop(name, fade);
  for (const h of [...playing]) h.stop(fade);
}

/** effects that come from a recording rather than being synthesised */
const RECORDED = {
  // the fourth of the sounds in "opening door (4).wav"
  door: { file: 'door', offset: 3.3, dur: 1.0, fadeOut: 0.3 },
  // "walking.mp3" holds two footsteps; each step on a tile plays the next one, so they
  // keep time with the walk. The skeleton's are sped up a little; his are slower and
  // deeper, heavier than the skeleton's bones.
  step: { file: 'walk', parts: [[0.17, 0.3], [0.72, 0.3]], rate: 1.15, gain: 1.8, fadeOut: 0.08 },
  heavystep: { file: 'walk', parts: [[0.17, 0.3], [0.72, 0.3]], rate: 0.85, gain: 1.3, fadeOut: 0.08 },
  // the skeleton's step on something hollow underneath (the workshop rug): much higher
  stepHollow: { file: 'walk', parts: [[0.17, 0.3], [0.72, 0.3]], rate: 1.7, gain: 2.2, fadeOut: 0.06, fx: 'hollow' },
  // one footstep stretched out very long and played loud: the portal throwing him back
  pushback: { file: 'walk', offset: 0.15, dur: 0.35, rate: 0.28, gain: 2.2, fadeOut: 0.3 },
  // the third splash in "water splash.wav"
  splash: { file: 'splash', offset: 7.2, dur: 2.3, fadeOut: 0.7 },
  // the first 4 seconds of "rope pulling.wav"
  ropePull: { file: 'ropePull', offset: 0, dur: 4, fadeOut: 0.6 },
};
const nextPart = {};

function noise(dest, t, len, filter, freq, peak, q = 1) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.playbackRate.value = 0.85 + Math.random() * 0.3;
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(f).connect(g).connect(dest);
  src.start(t, Math.random() * 0.5, len + 0.05);
}

const SOUNDS = {
  /** a footstep on old wooden boards */
  step(dest, t) {
    noise(dest, t, 0.09, 'bandpass', 180 + Math.random() * 60, 0.9, 1.4);
    noise(dest, t, 0.04, 'highpass', 2200, 0.08);
  },
  /** a heavier, slower step */
  heavystep(dest, t) {
    noise(dest, t, 0.14, 'lowpass', 140, 1.2, 1);
    noise(dest, t + 0.01, 0.07, 'bandpass', 420, 0.25, 2);
  },
  /** rummaging through a hiding spot */
  rummage(dest, t) {
    for (let i = 0; i < 6; i++) noise(dest, t + i * 0.18 + Math.random() * 0.08, 0.08, 'highpass', 1300 + Math.random() * 800, 0.35);
    noise(dest, t + 0.5, 0.12, 'lowpass', 200, 0.6);
  },
  /** a low groan: he has woken up */
  wake(dest, t) {
    for (const det of [0, 7]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(78 + det, t);
      o.frequency.exponentialRampToValueAtTime(42 + det, t + 2);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 380;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      o.connect(f).connect(g).connect(dest);
      o.start(t);
      o.stop(t + 2.3);
    }
  },
  /** sting when you are caught */
  caught(dest, t) {
    noise(dest, t, 0.9, 'lowpass', 300, 1.4);
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.9);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + 1.05);
  },
};

/** play a sound at a volume from 0 to 1 (quietly ignored before audio is unlocked) */
export function play(name, vol = 1) {
  if (!running() || vol <= 0.01) return;
  const rec = RECORDED[name];
  if (rec) {
    let { offset, dur } = rec;
    if (rec.parts) {
      const i = (nextPart[name] = ((nextPart[name] ?? -1) + 1) % rec.parts.length);
      [offset, dur] = rec.parts[i];
    }
    const v = Math.min(1, vol) * (rec.gain ?? 1);
    playSample(rec.file, { vol: v, offset, dur, fadeOut: rec.fadeOut, rate: rec.rate, key: name, fx: rec.fx });
  } else if (SOUNDS[name]) SOUNDS[name](out(Math.min(1, vol) * soundVolume(name)), ctx.currentTime + 0.005);
  else if (FILES[name]) playSample(name, { vol });
}

/** play a sound once so its volume can be judged (the editor's ▶ buttons) */
export function previewSound(id) {
  unlockAudio();
  const go = () => {
    const cfg = LOOPS[id];
    if (cfg) {
      // a few seconds of the track, from where its loop starts
      return playSample(cfg.file ?? id, { offset: cfg.from ?? 0, dur: 6, fadeOut: 1, rate: cfg.rate ?? 1, key: id });
    }
    if (id === 'master') return play('door', 0.6);
    if (RECORDED[id] || SOUNDS[id]) return play(id, id === 'step' ? 0.3 : 0.8);
    return playSample(id);
  };
  // the very first click may be what unlocks sound: give it a moment
  if (!running()) setTimeout(go, 150);
  else go();
}
