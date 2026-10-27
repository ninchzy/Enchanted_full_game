import { Container, Graphics } from 'pixi.js';
import { TILE, VIEW_W, VIEW_H, FADE_TIME } from './config.js';
import { Input } from './input.js';
import { characterSheets } from './gfx/characters.js';
import { MAPS } from './maps/index.js';
import { World } from './world/world.js';
import { Actor, DELTA } from './world/actor.js';
import { Lighting } from './world/lighting.js';
import { Dialogue } from './ui/dialogue.js';
import { InventoryUI } from './ui/inventory.js';
import { makeText, windowGraphics } from './ui/common.js';
import { ITEMS } from './items.js';
import { applyEdits } from './editor/edits.js';
import { Choice } from './ui/choice.js';
import { hidePhrase, spotName } from './hiding.js';
import { buildAllNavs, stairsAllow } from './world/nav.js';
import { Seeker, doorMakesSound } from './seeker.js';
import { Cycle } from './cycle.js';
import { TimersUI } from './ui/timers.js';
import { GameOverUI } from './ui/gameover.js';
import { play, playSample, preloadSounds, startLoop, stopLoop, setLoopVolume, stopAllSounds, keepAudioAlive } from './audio.js';
import { Director, Aborted } from './cutscene/director.js';
import { playIntro } from './cutscene/intro.js';
import { NoteView } from './ui/note.js';
import { CodeLock } from './ui/codelock.js';
import { BookView } from './ui/book.js';
import { EndingScreen } from './ui/ending.js';
import { spotFor } from './puzzles.js';
import { STEP_SCENES, askAgain, enterDecide } from './cutscene/finale.js';
import { SaveScreen } from './ui/savescreen.js';
import { TitleUI } from './ui/title.js';
import { PauseMenu } from './ui/pause.js';
import { SettingsScreen } from './ui/settings.js';
import { readSave, writeSave } from './saves.js';

const START = { map: 'hall_g', x: 10, y: 10, dir: 'up' };
/** where the hooded figure starts: right next to the stairs */
const SEEKER_START = { map: 'hall_g', x: 9, y: 5, dir: 'down' };

export class Game {
  constructor(root) {
    this.root = root;
    this.input = new Input();
    this.sheets = characterSheets();
    this.inventory = [];
    this.flags = new Set(); // story progress, e.g. 'rug_moved', 'trapdoor_open' (set by resetRun)

    this.worldLayer = new Container();
    this.lighting = new Lighting();
    this.uiLayer = new Container();
    this.banner = new Container();
    this.dialogue = new Dialogue();
    this.inv = new InventoryUI(this);
    this.choice = new Choice();
    this.hidden = null; // { x, y, key, from, ... } while hiding
    this.fadeG = new Graphics().rect(0, 0, VIEW_W, VIEW_H).fill({ color: 0x000000 });
    this.fadeG.alpha = 0;
    this.timers = new TimersUI();
    this.gameOver = new GameOverUI(() => this.restart());
    this.saveScreen = new SaveScreen(this);
    this.title = new TitleUI(this);
    this.pause = new PauseMenu(this); // ESC during the game
    this.settings = new SettingsScreen();
    this.ending = new EndingScreen(this);
    this.note = new NoteView(); // a piece of paper held up to read
    this.codeLock = new CodeLock(); // the safe's four-digit lock
    this.book = new BookView(); // the diary, open on screen
    this.uiLayer.addChild(this.banner, this.timers.view, this.inv.view, this.note.view, this.book.view, this.codeLock.view, this.dialogue.view, this.choice.view);
    // cutscene layers: glows in the world drawn above the darkness, then whole-screen
    // black and white under the message box
    this.fxWorld = new Container();
    this.blackG = new Graphics().rect(0, 0, VIEW_W, VIEW_H).fill({ color: 0x000000 });
    this.whiteG = new Graphics().rect(0, 0, VIEW_W, VIEW_H).fill({ color: 0xffffff });
    this.blackG.alpha = this.whiteG.alpha = 0;
    root.addChild(
      this.worldLayer, this.lighting.sprite, this.fxWorld, this.blackG, this.whiteG, this.uiLayer, this.fadeG,
      this.gameOver.view, this.ending.view, this.title.view, this.pause.view, this.saveScreen.view, this.settings.view,
    );

    this.player = new Actor(this.sheets.skeleton, START.x, START.y, START.dir);
    this.fade = null;
    this.bannerTime = 0;
    this.lastSlot = null; // the save file this run came from or was last written to
    // cutscenes: `intro` is the opening's progress ({ stage }), `cine` takes the controls
    // away from the player, `cineCam` holds the camera somewhere other than the player
    this.director = null;
    this.intro = null;
    this.cine = false;
    this.cineCam = null;
    this.musicVol = null;
    preloadSounds();
    this.resetRun();
    this.mode = 'title';
    this.title.show();
  }

  /* ---------------- starting, saving, loading ---------------- */

  /** put everything back to the start of a run, or to a save file's state */
  resetRun(data = null) {
    this.stopCutscene();
    for (const ui of [this.dialogue, this.choice]) {
      ui.active = false;
      ui.view.visible = false;
    }
    this.inv.hide();
    this.note.hide();
    this.book.hide();
    this.codeLock.hide();
    this.pause.hide();
    this.settings.hide();
    this.gameOver.hide();
    this.ending.hide();
    this.fade = null;
    this.fadeG.alpha = 0;
    this.hidden = null;
    this.player.sprite.visible = true;
    this.player.sprite.alpha = 1;

    this.inventory = data ? [...data.inventory] : []; // (the pocket watch comes in the opening)
    this.flags = new Set(data?.flags ?? []); // story progress, e.g. 'rug_moved', 'trapdoor_open'
    this.navs = null;
    this.playtime = data?.playtime ?? 0;

    if (this.seeker) for (const spr of [this.seeker.actor.sprite, this.seeker.sleepSprite]) spr.parent?.removeChild(spr);
    this.seeker = new Seeker(this, data?.seeker ?? SEEKER_START);
    this.cycle = new Cycle(this);
    if (data?.cycle) {
      this.cycle.index = data.cycle.index;
      this.cycle.left = data.cycle.left;
    }
    const at = data?.player ?? START;
    this.loadMap(at.map, at.x, at.y, at.dir);
    if (data?.seeker) this.seeker.restore(data.seeker);
    // saved while thinking over his question: he is still kneeling there, waiting
    if (this.flags.has('finale_decide')) enterDecide(this);
  }

  /** a new game starts with the opening cutscene */
  newGame() {
    this.lastSlot = null;
    this.resetRun();
    this.startPlaying();
    this.bannerTime = 0;
    this.banner.alpha = 0;
    // he waits in the kitchen, out of sight, until he steps out to meet the player
    Object.assign(this.seeker.actor, { tx: 1, ty: 12, moving: false });
    this.seeker.map = 'kitchen';
    this.director = new Director(this);
    playIntro(this).catch((e) => {
      if (!(e instanceof Aborted)) console.error(e);
    });
  }

  loadSave(slot) {
    const data = readSave(slot);
    if (!data) return;
    this.lastSlot = slot;
    this.resetRun(data);
    this.startPlaying();
  }

  startPlaying() {
    this.mode = 'play';
    this.title.hide();
    this.saveScreen.hide();
    stopAllSounds(0.2);
    this.track = null; // updateMusic starts the right one
    this.humVol = undefined;
  }

  /**
   * The background music, or the room's own track (`music` in a map, e.g. the summoning
   * room), at half volume while he searches so his footsteps can be heard.
   */
  updateMusic() {
    if (this.intro?.stage === 'ritual' || this.intro?.noMusic) return; // the cutscene has its own sound
    // the background music changes for good as the story moves on: the front door opened,
    // then the amulet broken
    const story = this.flags.has('end_music') ? 'end' : this.flags.has('portal_music') ? 'mainDoor' : 'music';
    // the chase music takes over while he is after you, wherever you are
    const chasing = !this.intro && this.seeker?.chasing;
    const track = chasing ? 'chase' : this.world.def.music ?? story;
    let fadeIn = 1.2;
    if (track !== this.track) {
      // into a chase fast; out of one slowly, the old music drifting back in
      const leavingChase = this.track === 'chase';
      if (this.track) stopLoop(this.track, leavingChase ? 3 : track === 'chase' ? 0.4 : 1.2);
      fadeIn = track === 'chase' ? 0.3 : leavingChase ? 3 : 1.2;
      startLoop(track, 0.0001);
      this.track = track;
      this.musicVol = null;
    }
    const vol = chasing ? 1 : !this.intro && this.cycle.phase.kind === 'seek' ? 0.5 : 1;
    if (vol !== this.musicVol) {
      setLoopVolume(track, vol, this.musicVol === null ? fadeIn : 1.5); // a new track fades in
      this.musicVol = vol;
    }
    this.updateAmbience();
  }

  /**
   * A sound tied to a spot (the portal's hum): `ambience` in a map sets how loud it is on
   * each tile; it is silent on every other tile and in every other room.
   */
  updateAmbience() {
    const AMB = 'portalHum';
    const on = this.flags.has('portal_open') && !this.flags.has('portal_broken');
    if (!on) {
      if (this.humVol !== undefined) stopLoop(AMB, 0.5);
      this.humVol = undefined;
      return;
    }
    const amb = this.world.def.ambience;
    const p = this.player;
    const vol = amb?.sound === AMB && this.flags.has(amb.if) ? amb.tiles[`${p.tx},${p.ty}`] ?? 0 : 0;
    if (this.humVol === undefined) startLoop(AMB, 0.0001);
    if (vol !== this.humVol) {
      setLoopVolume(AMB, Math.max(0.0001, vol), 0.4);
      this.humVol = vol;
    }
  }

  /** the opening is over: the clock starts and he starts playing */
  endIntro() {
    this.intro = null;
    this.cine = false;
    this.cineCam = null;
    this.flags.add('intro_done');
    this.cycle = new Cycle(this);
    this.musicVol = null;
  }

  /**
   * Play a short scripted scene (see cutscene/director.js). The rules for every cutscene:
   * the controls and the clock wait for it, the timers are hidden, and at the end the
   * screen fades to black and back with the timers showing again. A scene can show them
   * earlier itself while the screen is black (`timersHidden = false`).
   */
  runScene(script) {
    this.director?.abort();
    const d = (this.director = new Director(this));
    this.cine = true;
    this.timersHidden = true;
    script(d)
      .then(async () => {
        if (!this.timersHidden) return;
        if (this.blackG.alpha < 1) await d.tween(0.6, (k) => (this.blackG.alpha = Math.max(this.blackG.alpha, k)));
        await d.wait(0.3);
        this.timersHidden = false;
        await d.tween(0.6, (k) => (this.blackG.alpha = 1 - k));
      })
      .catch((e) => {
        if (!(e instanceof Aborted)) console.error(e);
      })
      .finally(() => {
        if (this.director === d) {
          this.cine = false;
          this.timersHidden = false;
        }
      });
  }

  /** cancel a running cutscene and clear what it put on screen */
  stopCutscene() {
    this.director?.abort();
    this.director = null;
    this.intro = null;
    this.cine = false;
    this.timersHidden = false;
    this.cineCam = null;
    this.clearCineFx();
    this.blackG.alpha = this.whiteG.alpha = 0;
  }

  clearCineFx() {
    this.fxWorld.removeChildren().forEach((ch) => ch.destroy());
  }

  /** put an item in the inventory; returns the "New item added" line to show */
  giveItem(id) {
    if (!this.inventory.includes(id)) this.inventory.push(id);
    playSample('item', { vol: 0.9 });
    return `New item added to inventory: <item>${ITEMS[id].name.toLowerCase()}</item>!`;
  }

  /** everything a save file needs */
  snapshot() {
    const p = this.player;
    return {
      version: 1,
      player: { map: this.world.def.id, x: p.tx, y: p.ty, dir: p.dir },
      inventory: [...this.inventory],
      flags: [...this.flags],
      playtime: this.playtime,
      cycle: { index: this.cycle.index, left: this.cycle.left },
      seeker: this.seeker.snapshot(),
    };
  }

  saveTo(slot) {
    writeSave(slot, this.snapshot());
    this.lastSlot = slot;
  }

  /** the book on the upper floor */
  openSaveBook() {
    // (while thinking over his question at the end, saving is allowed)
    if (this.intro && this.intro.stage !== 'decide') return this.say('I should see what is going on here.');
    // no saving while he is searching
    if (this.cycle.phase.kind === 'seek') return this.say("I don't have time for that right now.");
    this.saveScreen.show('save');
  }

  /** after being caught: back to the last save file, or a new game if there is none */
  restart() {
    if (this.lastSlot && readSave(this.lastSlot)) this.loadSave(this.lastSlot);
    else this.newGame();
  }

  toTitle() {
    this.mode = 'title';
    this.stopCutscene();
    this.ending.hide();
    stopAllSounds(0.3);
    for (const ui of [this.dialogue, this.choice]) {
      ui.active = false;
      ui.view.visible = false;
    }
    this.inv.hide();
    this.saveScreen.hide();
    this.pause.hide();
    this.settings.hide();
    this.title.show();
  }

  /** ESC during the game */
  openPauseMenu() {
    this.pause.show();
  }

  /** walkable tiles, doors and hiding spots of every map, rebuilt when something changes */
  getNavs() {
    return (this.navs ??= buildAllNavs(this.flags));
  }

  /** show the hooded figure if he is in the room the player is in */
  attachSeeker() {
    const s = this.seeker;
    for (const spr of [s.actor.sprite, s.sleepSprite]) spr.parent?.removeChild(spr);
    if (this.world && s.map === this.world.def.id) this.world.objLayer.addChild(s.sprite);
  }

  /** the hooded figure got the player */
  caught(reason) {
    if (this.gameOver.active) return;
    this.player.moving = false;
    this.choice.active = false;
    this.choice.view.visible = false;
    this.dialogue.active = false;
    this.dialogue.view.visible = false;
    this.inv.hide();
    if (this.track) stopLoop(this.track, 1.2);
    stopLoop('portalHum', 1.2);
    this.humVol = undefined;
    play('caught', 0.9);
    this.gameOver.show(reason);
  }

  loadMap(id, x, y, dir, quiet = false) {
    if (!MAPS[id]) throw new Error('No map ' + id);
    const def = applyEdits(MAPS[id]);
    if (this.hidden) {
      // only the editor can change maps mid-hide; just bring the player back out
      this.hidden = null;
      this.player.sprite.visible = true;
    }
    if (this.world) {
      // characters outlive the room: take them out before it is destroyed
      this.world.objLayer.removeChild(this.player.sprite);
      if (this.seeker) for (const spr of [this.seeker.actor.sprite, this.seeker.sleepSprite]) spr.parent?.removeChild(spr);
      this.world.destroy();
    }
    this.world = new World(def, this.sheets, this.flags, { x, y }, {
      showAll: this.editor?.showAll,
      // torches lighting one by one (the passage) flare up with the candle sound
      onIgnite: () => !this.editor?.isOpen && play('candle', 0.6),
    });
    this.worldLayer.removeChildren();
    this.worldLayer.addChild(this.world.container);
    this.player.tx = x;
    this.player.ty = y;
    this.player.moving = false;
    this.player.face(dir);
    this.lastTile = `${id}:${x},${y}`; // arriving on a tile isn't stepping onto it
    this.world.objLayer.addChild(this.player.sprite);
    if (this.seeker) this.attachSeeker();
    if (!quiet) this.showBanner(def.name);
    this.updateCamera();
  }

  /** rebuild the current map in place, after a flag changed what is in it */
  refresh() {
    this.navs = null; // doors or collision may have changed
    const p = this.player;
    this.loadMap(this.world.def.id, p.tx, p.ty, p.dir, true);
  }

  removeItem(id) {
    const i = this.inventory.indexOf(id);
    if (i >= 0) this.inventory.splice(i, 1);
  }

  showBanner(name) {
    this.banner.removeChildren().forEach((c) => c.destroy());
    const t = makeText(name, { size: 11 });
    const w = Math.ceil(t.width) + 22;
    // below the timers, which sit at the top middle
    this.banner.addChild(windowGraphics(8, 28, w, 22), t);
    t.x = 19;
    t.y = 32;
    this.bannerTime = 2.2;
    this.banner.alpha = 1;
  }

  /** black fade out, swap map, fade in */
  goTo(door) {
    const [x, y, dir] = door.at;
    if (doorMakesSound(this.getNavs()[this.world.def.id], door)) play('door', 0.45);
    this.fade = { t: 0, phase: 'out', door: { to: door.to, x, y, dir } };
  }

  say(pages, onDone) {
    this.dialogue.show(pages, onDone);
  }

  facing() {
    const [dx, dy] = DELTA[this.player.dir];
    return [this.player.tx + dx, this.player.ty + dy];
  }

  interact() {
    const [fx, fy] = this.facing();
    const s = this.seeker;
    if (s.map === this.world.def.id && s.actor.tx === fx && s.actor.ty === fy && !s.asleep) {
      // talking to him (in the opening he explains the game; at the end he waits for an answer)
      if (this.intro?.stage === 'meet') this.intro.talk = true;
      else if (this.intro?.stage === 'decide') askAgain(this);
      return;
    }
    const hit = this.world.interactAt(fx, fy);
    if (!hit) return;
    if (this.intro?.stage === 'wake') {
      this.say('I should find out where I am first.');
      return;
    }
    if (hit.kind === 'prop' && hit.target.def.hide) {
      this.choice.show(['Investigate', 'Hide'], (pick) => {
        if (pick === 'Investigate') this.investigate(hit);
        else if (pick === 'Hide') this.askHide(hit.target);
      });
      return;
    }
    this.investigate(hit);
  }

  investigate(hit) {
    const spot = spotFor(this.world.def.id, hit.target?.def?._key);
    if (spot?.investigate) spot.investigate(this, hit);
    else if (hit.onInteract) hit.onInteract(this);
    else if (hit.text) this.say(hit.text);
    else if (hit.target?.def) this.say(`A ${spotName(hit.target.def.t)}.`);
  }

  /* ---------------- hiding ---------------- */

  askHide(spot) {
    const where = hidePhrase(spot.def);
    this.choice.show(['Yes', 'No'], (pick) => pick === 'Yes' && this.hide(spot), `Hide ${where}?`);
  }

  /**
   * Hide in a spot. The player disappears; the spot is remembered as where they are
   * (`game.hidden.x / y`, e.g. for an enemy searching the room). They come back out on
   * the tile they hid from.
   */
  hide(spot) {
    const [ax, ay, aw, ah] = spot.area;
    const p = this.player;
    this.hidden = {
      map: this.world.def.id,
      key: spot.def._key,
      t: spot.def.t,
      x: ax + Math.floor(aw / 2),
      y: ay + Math.floor(ah / 2),
      from: { x: p.tx, y: p.ty, dir: p.dir },
      phrase: hidePhrase(spot.def),
      time: 0,
    };
    // where the light (and anyone looking) should consider the player to be
    this.hidden.focus = { worldX: this.hidden.x * TILE, worldY: this.hidden.y * TILE };
    p.sprite.visible = false;
    this.seeker.onPlayerHid({ map: this.hidden.map, key: this.hidden.key });
  }

  unhide() {
    const h = this.hidden;
    if (!h) return;
    const p = this.player;
    p.tx = h.from.x;
    p.ty = h.from.y;
    p.face(h.from.dir);
    p.sprite.visible = true;
    p.sprite.alpha = 0;
    this.hidden = null;
  }

  isHidden() {
    return !!this.hidden;
  }

  useItem(id) {
    const [fx, fy] = this.facing();
    // a key on a locked door
    const door = this.world.doorAt(fx, fy);
    if (door?.lock && !this.flags.has(door.lock.flag)) {
      if (door.lock.key !== id) return this.say("It doesn't fit.");
      return this.unlockDoor(door, id);
    }
    const hit = this.world.interactAt(fx, fy);
    const spot = spotFor(this.world.def.id, hit?.target?.def?._key);
    const res = spot?.use?.[id] ?? hit?.use?.[id];
    if (typeof res === 'function') res(this);
    else if (res) this.say(res);
    else this.say(`There's nowhere to use the ${ITEMS[id].name} here.`);
  }

  /** `lock: { flag, key, keep }` on a door: the key opens it for good (and is used up unless `keep`) */
  unlockDoor(door, id) {
    const { flag, keep } = door.lock;
    this.flags.add(flag);
    if (!keep) this.removeItem(id);
    play('unlock', 0.9);
    this.say('The door is unlocked.');
  }

  update(dt) {
    const input = this.input;
    keepAudioAlive();
    this.world.update(dt, this.player);

    if (this.editor?.isOpen) {
      // the game is frozen while editing; the editor draws its own overlay
      this.updateCamera();
      if (this.lighting.sprite.visible) this.lighting.render(this.world, this.camX, this.camY, this.player, dt);
      this.editor.update(dt);
      input.endFrame();
      return;
    }

    if (this.mode === 'title') {
      if (this.settings.open) this.settings.update(dt, input);
      else if (this.saveScreen.open) this.saveScreen.update(dt, input);
      else this.title.update(dt, input);
      input.endFrame();
      return;
    }
    if (this.mode === 'ending') {
      this.ending.update(dt, input);
      input.endFrame();
      return;
    }

    // a screen over the game (the ESC menu and what it opens, the save files, GAME OVER):
    // the game waits, the clock too
    const over = [this.settings, this.saveScreen, this.pause].find((s) => s.open) ?? (this.gameOver.active && this.gameOver);
    if (over) {
      over.update(dt, input);
      this.updateCamera();
      this.lighting.render(this.world, this.camX, this.camY, this.player, dt);
      input.endFrame();
      return;
    }

    // The clock and the hooded figure stop while the player reads an object's text or
    // answers a question (Investigate / Hide, Yes / No, the ESC menu).
    this.playtime += dt;
    this.director?.update(dt);
    const reading = this.dialogue.active || this.choice.active || this.note.active || this.book.active || this.codeLock.active || this.cine;
    if (this.intro) {
      // the opening: no clock, and he only moves when the scene moves him
      this.seeker.actor.update(dt);
    } else if (!reading) {
      this.cycle.update(dt);
      this.seeker.update(dt);
    }
    // (also out of the way while a page is held up to read: the clock is paused then anyway)
    this.timers.view.visible = !this.intro && !this.timersHidden && !this.book.active && !this.note.active;
    // (being next to him is only deadly once he is chasing you: see Seeker.watch)
    if (!this.intro) this.timers.update(this.cycle);
    this.updateMusic();

    if (this.fade) this.updateFade(dt);
    else if (this.codeLock.active) this.codeLock.update(dt, input);
    else if (this.note.active) this.note.update(dt, input);
    else if (this.book.active) this.book.update(dt, input);
    else if (this.dialogue.active) this.dialogue.update(dt, input);
    else if (this.choice.active) this.choice.update(dt, input);
    else if (this.inv.open) this.inv.update(dt, input);
    else if (this.hidden) this.updateHidden(dt, input);
    else if (this.cine) {
      if (this.player.moving) this.player.update(dt);
    } else this.updatePlay(dt, input);

    // fade the player back in after coming out of a hiding spot
    if (this.player.sprite.alpha < 1) this.player.sprite.alpha = Math.min(1, this.player.sprite.alpha + dt * 5);

    this.updateCamera();
    const h = this.hidden;
    const light = this.intro?.stage === 'ritual' ? 0 : h ? 0.55 : 1; // no light of his own in the summoning
    this.lighting.render(this.world, this.camX, this.camY, h ? h.focus : this.player, dt, light);

    if (this.bannerTime > 0) {
      this.bannerTime -= dt;
      this.banner.alpha = Math.min(1, this.bannerTime / 0.6);
    }
    input.endFrame();
  }

  updatePlay(dt, input) {
    const p = this.player;
    if (p.moving) {
      p.update(dt);
      if (p.moving) return;
    }
    // just stepped onto a new tile: some tiles start a scene (`stepScenes` in a map)
    const here = `${this.world.def.id}:${p.tx},${p.ty}`;
    if (here !== this.lastTile) {
      this.lastTile = here;
      const hit = (this.world.def.stepScenes ?? []).find(
        (s) => s.tiles.includes(`${p.tx},${p.ty}`) && (!s.if || this.flags.has(s.if)),
      );
      if (hit) {
        STEP_SCENES[hit.scene]?.(this);
        return;
      }
    }
    if (input.hit('menu')) {
      this.inv.show();
      return;
    }
    if (input.hit('cancel')) {
      this.openPauseMenu();
      return;
    }
    if (input.hit('ok')) {
      this.interact();
      return;
    }
    const dir = input.dir;
    if (!dir) return;
    const [dx, dy] = DELTA[dir];
    // the stairs' railings also guard the doors at the bottom of a stairwell
    const door = stairsAllow(this.world, p.tx, p.ty, dir) && this.world.doorAt(p.tx + dx, p.ty + dy);
    p.face(dir);
    if (door) {
      // the ending: following him back into the house leads to the summoning
      if (this.intro?.stage === 'follow' && this.world.def.id === 'backyard' && door.to === 'hall_g') {
        this.intro.go = true;
        return;
      }
      if (door.locked) this.say(door.locked);
      else if (door.lock && !this.flags.has(door.lock.flag)) this.say("It's locked.");
      else this.goTo(door);
      return;
    }
    const s = this.seeker;
    if (s.map === this.world.def.id && s.actor.tx === p.tx + dx && s.actor.ty === p.ty + dy) return;
    if (this.world.canMove(p.tx, p.ty, dir, p)) {
      const run = input.held.has('run');
      p.startMove(dir, run);
      // stepping onto something marked `hollow` (the workshop rug) sounds different
      const hollow = this.world.props.some((pr) => {
        if (!pr.def.hollow) return false;
        const [ax, ay, aw, ah] = pr.area;
        return p.tx >= ax && p.ty >= ay && p.tx < ax + aw && p.ty < ay + ah;
      });
      play(hollow ? 'stepHollow' : 'step', run ? 0.3 : 0.18);
      // running is loud: during his search he may hear it (see Seeker.hearRun)
      if (run) this.seeker.hearRun({ map: this.world.def.id, x: p.tx, y: p.ty });
    }
  }

  updateHidden(dt, input) {
    this.hidden.time += dt;
    if (input.hit('ok') && this.hidden.time > 0.25) this.unhide();
    else if (input.hit('cancel')) this.openPauseMenu();
  }

  updateFade(dt) {
    const f = this.fade;
    f.t += dt;
    if (f.phase === 'out') {
      this.fadeG.alpha = Math.min(1, f.t / FADE_TIME);
      if (f.t >= FADE_TIME) {
        this.loadMap(f.door.to, f.door.x, f.door.y, f.door.dir);
        f.phase = 'hold';
        f.t = 0;
      }
    } else if (f.phase === 'hold') {
      if (f.t >= 0.12) { f.phase = 'in'; f.t = 0; }
    } else {
      this.fadeG.alpha = Math.max(0, 1 - f.t / FADE_TIME);
      if (f.t >= FADE_TIME) this.fade = null;
    }
  }

  /** where the camera would be following the player */
  followCam() {
    return this.camAt(this.player.worldX, this.player.worldY);
  }

  /** the camera centred on a point in the world (as far as the map's edges allow) */
  camAt(wx, wy) {
    const w = this.world;
    return {
      x: w.pw <= VIEW_W ? -(VIEW_W - w.pw) / 2 : clamp(wx + TILE / 2 - VIEW_W / 2, 0, w.pw - VIEW_W),
      y: w.ph <= VIEW_H ? -(VIEW_H - w.ph) / 2 : clamp(wy + TILE / 2 - VIEW_H / 2, 0, w.ph - VIEW_H),
    };
  }

  /**
   * a story ending: everything stops and the GAME OVER screen ("Ending n/3") comes up,
   * with a looping track if the ending has one (`music`)
   */
  showEnding(label, music = null) {
    stopAllSounds(0.4);
    if (music) startLoop(music);
    this.stopCutscene();
    this.blackG.alpha = 1; // stays black behind it while it fades in
    this.inv.hide();
    this.mode = 'ending';
    this.ending.show(label);
  }

  updateCamera() {
    const w = this.world;
    let { x: cx, y: cy } = this.cineCam ?? this.followCam();
    if (this.camOverride) {
      // free camera for the editor, allowed to look a little past the map edges
      cx = this.camOverride.x = clamp(this.camOverride.x, -VIEW_W / 2, Math.max(0, w.pw - VIEW_W) + VIEW_W / 2);
      cy = this.camOverride.y = clamp(this.camOverride.y, -VIEW_H / 2, Math.max(0, w.ph - VIEW_H) + VIEW_H / 2);
    }
    this.camX = Math.round(cx);
    this.camY = Math.round(cy);
    this.worldLayer.x = this.fxWorld.x = -this.camX;
    this.worldLayer.y = this.fxWorld.y = -this.camY;
  }
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
