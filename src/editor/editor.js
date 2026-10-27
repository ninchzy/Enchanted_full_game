import './editor.css';
import { Container, Graphics, Sprite, Point } from 'pixi.js';
import { TILE, VIEW_W, VIEW_H } from '../config.js';
import { PROPS, propInfo, propCanvases } from '../gfx/props.js';
import { placement, transformSprite } from '../world/world.js';
import { MAPS } from '../maps/index.js';
import { EDITS, serializable, setFields, deleteProp, resetProp, addProp, saveEdits } from './edits.js';
import { isTyping } from '../input.js';
import { hasViews, WALLS } from '../gfx/props_views.js';
import { SOUND_LIST, soundVolume, soundVolumes, setSoundVolume, previewSound } from '../audio.js';
import { ITEMS, saveItemTexts } from '../items.js';
import { PC } from '../gfx/pixel.js';

/** write the sound volumes to src/sound-volumes.json (dev server only) */
async function saveSoundVolumes() {
  // only what differs from 100% is kept
  const vols = Object.fromEntries(Object.entries(soundVolumes()).filter(([, v]) => Math.abs(v - 1) > 0.001));
  const res = await fetch('/__editor/sounds', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vols),
  });
  const out = await res.json().catch(() => ({ ok: false, error: 'no response' }));
  if (!res.ok || !out.ok) throw new Error(out.error || 'save failed');
}

export const PANEL_W = 300;

// fields with their own controls; everything else shows up under "Options"
const CORE = new Set(['t', 'x', 'y', 'dx', 'dy', 'scale', 'rot', 'flip', 'solid', 'text', 'uid', 'wall', 'z', 'hide']);
const isBox = (s) => !!s && typeof s === 'object' && !Array.isArray(s);

// extra words the asset search understands
const KEYWORDS = {
  armchair: 'chair seat couch', chair: 'seat kitchen dining', rockingchair: 'rocking chair seat', torture_chair: 'chair spikes seat',
  sofa_back: 'sofa couch seat', bed: 'double', bed_single: 'bed', sheet: 'covered dust cloth furniture cabinet dresser mirror',
  mirror: 'bathroom wall', mirror_round: 'mirror standing', medcab: 'medicine cabinet', uppercab: 'cabinet cupboard kitchen wall',
  nightstand: 'bedside table cabinet drawer', sidetable: 'table vase flowers', table_small: 'coffee table', table: 'dining kitchen',
  counter: 'kitchen sink stove cabinet', shelf_metal: 'shelf shelves pantry rack', bookshelf: 'shelf shelves books', wardrobe: 'closet cabinet',
  dresser: 'drawers chest cabinet', plant: 'flower pot', crop: 'plant garden corn cabbage', window: 'curtains glass',
  door_side: 'door', door_front: 'door entrance', door_back: 'door', doorway: 'door opening', door_dungeon: 'door', exit_bottom: 'door exit',
  picture: 'painting portrait frame photo', picture_side: 'painting portrait frame', blood: 'splatter pool trail gore',
  cobweb: 'spider web', cobweb_big: 'spider web', web: 'spider cobweb hanging', mannequin: 'dummy figure doll statue',
  beam: 'post pillar wood', hatch: 'trapdoor ladder', trapdoor: 'hatch', tv: 'television', candle: 'light fire',
  torch: 'light fire', well: 'water', tree: 'dead', box: 'cardboard', crate: 'box', trunk: 'chest', sack: 'bag',
  pots: 'flower pot', planter: 'flower bed', corpse: 'body dead', shackled: 'skeleton chains', seated_skeleton: 'skeleton chair diary',
  bones: 'skeleton', bone: 'femur dog bones skeleton', ribcage: 'ribs bones skeleton', skull: 'head bones skeleton',
  bone_pile: 'bones skeleton pile', wall_breach: 'hole wall broken crack hiding spot', wallhole: 'hole wall', debris: 'rubble trash', rug: 'carpet', doormat: 'mat rug', writing: 'blood symbols', handprint: 'blood hand',
};
const norm = (s) => s.toLowerCase().replace(/[\s_\-]+/g, '');

/** the next view when turning: furniture with side/bottom views cycles walls, anything else turns 90° */
function turned(fields) {
  if (hasViews(fields.t)) {
    const i = WALLS.indexOf(fields.wall ?? 'back');
    const wall = WALLS[(i + 1) % WALLS.length];
    if (wall === 'back') delete fields.wall;
    else fields.wall = wall;
  } else {
    const rot = ((((fields.rot ?? 0) + 90 + 180) % 360) + 360) % 360 - 180;
    if (rot) fields.rot = rot;
    else delete fields.rot;
  }
  return fields;
}
const ACCENT = 0xd11b5c;

const toText = (v) => (Array.isArray(v) ? v.join('\n\n') : v ?? '');
function fromText(s) {
  const pages = s.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean);
  return pages.length === 0 ? undefined : pages.length === 1 ? pages[0] : pages;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/**
 * In-game editor: select, move, scale, rotate, flip, delete and add objects, and edit the
 * text they show. Changes are stored as edits on top of the map files (see edits.js).
 */
export class Editor {
  constructor(game, canvas, relayout) {
    this.game = game;
    this.canvas = canvas;
    this.relayout = relayout;
    game.editor = this;

    this.isOpen = false;
    this.showAll = false;
    this.opts = { light: false, grid: true, coll: false };
    this.selKey = null;
    this.hoverKey = null;
    this.stamp = null;
    this.drag = null;
    this.pan = null;
    this.undoStack = [];
    this.redoStack = [];
    this.dirty = new Set();

    // overlay drawn above the lighting, in world coordinates
    this.layer = new Container();
    this.overlay = new Graphics();
    this.layer.addChild(this.overlay);
    this.layer.visible = false;
    game.root.addChildAt(this.layer, game.root.getChildIndex(game.uiLayer));

    this.buildDom();
    this.bindCanvas();
    this.bindKeys();
  }

  get mapId() {
    return this.game.world.def.id;
  }

  /* ------------------------------------------------------------ DOM */

  buildDom() {
    const tab = document.createElement('button');
    tab.className = 'ed-tab';
    tab.innerHTML = 'EDITOR<span class="ed-dot"></span>';
    tab.title = 'Open the editor';
    tab.addEventListener('click', () => (this.isOpen ? this.close() : this.open()));
    document.body.appendChild(tab);
    this.tab = tab;

    const panel = document.createElement('aside');
    panel.className = 'ed-panel';
    panel.innerHTML = `
      <div class="ed-head"><b>Editor</b><button class="ed-x" data-k="close" title="Close">×</button></div>
      <div class="ed-sec">
        <label class="ed-row">Map <select data-k="map"></select></label>
        <div class="ed-toggles">
          <label><input type="checkbox" data-k="light"> Lighting</label>
          <label><input type="checkbox" data-k="grid" checked> Grid</label>
          <label><input type="checkbox" data-k="coll"> Collision</label>
          <label title="Also show objects that only appear later in the story"><input type="checkbox" data-k="all"> All story states</label>
        </div>
      </div>
      <details class="ed-sec ed-sounds">
        <summary class="ed-title">Sound volumes</summary>
        <div data-k="sounds"></div>
        <div class="ed-note">100% = as recorded. Music changes while you drag; ▶ plays a sound at its new volume. Save writes src/sound-volumes.json.</div>
      </details>
      <details class="ed-sec ed-items">
        <summary class="ed-title">Item descriptions</summary>
        <div data-k="items"></div>
        <div class="ed-note">The line shown at the bottom of the inventory. It changes in the game as you type; Save writes src/item-texts.json.</div>
      </details>
      <div class="ed-sec" data-k="sel"></div>
      <div class="ed-sec ed-assets">
        <div class="ed-title">Add object</div>
        <input type="search" placeholder="Search…" data-k="search">
        <div class="ed-asset-grid" data-k="assets"></div>
      </div>
      <div class="ed-foot">
        <div class="ed-btns">
          <button data-k="undo">Undo</button>
          <button data-k="redo">Redo</button>
          <button data-k="save" class="ed-primary">Save</button>
        </div>
        <div class="ed-status" data-k="status"></div>
        <details class="ed-help"><summary>Controls</summary>
          <div>Click: select · Drag: move by tile (Shift: by pixel)</div>
          <div>Mouse wheel: scale · Shift + wheel: rotate</div>
          <div>Right-drag: move the view</div>
          <div>Arrows: nudge (Shift: 1 px) · Del: delete</div>
          <div>Ctrl+D: duplicate · Ctrl+Z / Ctrl+Y: undo / redo · Ctrl+S: save</div>
          <div>R: turn (furniture switches between back wall, side wall and bottom wall views)</div>
          <div>Collision → Custom box, then “Move box with the mouse” to drag the red box</div>
          <div>Draw order → In front / Behind, e.g. for a plant standing on a table</div>
          <div>Esc: cancel placing / deselect</div>
        </details>
      </div>`;
    document.body.appendChild(panel);
    this.panel = panel;
    const $ = (k) => panel.querySelector(`[data-k="${k}"]`);
    this.$ = $;

    $('close').addEventListener('click', () => this.close());
    const mapSel = $('map');
    for (const [id, def] of Object.entries(MAPS)) mapSel.add(new Option(`${def.name} (${id})`, id));
    mapSel.addEventListener('change', () => this.gotoMap(mapSel.value));

    $('light').addEventListener('change', (e) => {
      this.opts.light = e.target.checked;
      this.game.lighting.sprite.visible = this.opts.light;
    });
    $('grid').addEventListener('change', (e) => (this.opts.grid = e.target.checked));
    $('coll').addEventListener('change', (e) => (this.opts.coll = e.target.checked));
    $('all').addEventListener('change', (e) => {
      this.showAll = e.target.checked;
      this.rebuild();
    });
    $('search').addEventListener('input', (e) => this.filterAssets(e.target.value));
    $('undo').addEventListener('click', () => this.undo());
    $('redo').addEventListener('click', () => this.redo());
    $('save').addEventListener('click', () => this.save());
    this.buildSounds();
    this.buildItems();
  }

  /** one text box per inventory item for the description line; saved with everything else */
  buildItems() {
    const box = this.$('items');
    for (const [id, it] of Object.entries(ITEMS)) {
      const row = document.createElement('div');
      row.className = 'ed-item';
      const icon = document.createElement('canvas');
      icon.width = icon.height = 16;
      const pc = new PC(16, 16);
      it.icon(pc);
      icon.getContext('2d').drawImage(pc.canvas, 0, 0);
      const name = document.createElement('span');
      name.textContent = it.name;
      if (it.usable === false) name.className = 'ed-item-blue'; // the blue-grey items
      const reset = document.createElement('button');
      reset.textContent = '↺';
      reset.title = 'Back to the original text';
      const top = document.createElement('div');
      top.className = 'ed-item-top';
      top.append(icon, name, reset);
      const text = document.createElement('textarea');
      text.rows = 2;
      text.value = it.desc;
      const changed = () => {
        it.desc = text.value;
        reset.disabled = it.desc === it.defaultDesc;
        if (this.game.inv.open) this.game.inv.refresh();
        this.itemsDirty = true;
        this.updateDirty();
      };
      text.addEventListener('input', changed);
      reset.addEventListener('click', () => {
        text.value = it.defaultDesc;
        changed();
      });
      reset.disabled = it.desc === it.defaultDesc;
      row.append(top, text);
      box.append(row);
    }
  }

  /** one slider per sound (0–200%), saved together with the map edits */
  buildSounds() {
    const box = this.$('sounds');
    for (const s of SOUND_LIST) {
      const row = document.createElement('div');
      row.className = 'ed-snd' + (s.id === 'master' ? ' ed-snd-master' : '');
      row.innerHTML = `
        <div class="ed-snd-top"><span>${esc(s.label)}</span><span class="ed-snd-val"></span><button title="Play it">▶</button></div>
        <input type="range" min="0" max="200" step="5">`;
      const val = row.querySelector('.ed-snd-val');
      const range = row.querySelector('input');
      const show = () => (val.textContent = `${range.value}%`);
      range.value = Math.round(soundVolume(s.id) * 100);
      show();
      range.addEventListener('input', () => {
        setSoundVolume(s.id, Number(range.value) / 100);
        show();
        this.soundsDirty = true;
        this.updateDirty();
      });
      // double-click the slider: back to 100%
      range.addEventListener('dblclick', () => {
        range.value = 100;
        range.dispatchEvent(new Event('input'));
      });
      row.querySelector('button').addEventListener('click', () => previewSound(s.id));
      box.append(row);
    }
  }

  buildAssets() {
    if (this.assetsBuilt) return;
    this.assetsBuilt = true;
    const grid = this.$('assets');
    for (const t of Object.keys(PROPS).sort()) {
      const src = propCanvases({ t }, 1)[0].canvas;
      const thumb = document.createElement('canvas');
      thumb.width = thumb.height = 40;
      const ctx = thumb.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      let s = Math.min(38 / src.width, 38 / src.height);
      if (s >= 1) s = Math.floor(s);
      const w = src.width * s, h = src.height * s;
      ctx.drawImage(src, Math.round((40 - w) / 2), Math.round((40 - h) / 2), Math.round(w), Math.round(h));
      const item = document.createElement('button');
      item.className = 'ed-asset';
      item.dataset.t = t;
      item.title = t;
      item.append(thumb);
      const label = document.createElement('span');
      label.textContent = t.replace(/_/g, ' ');
      item.append(label);
      item.addEventListener('click', () => this.setStamp(this.stamp?.t === t ? null : t));
      grid.append(item);
    }
  }

  /** every word typed must appear in the name or keywords; spaces, underscores and plurals don't matter */
  filterAssets(q) {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean).map((w) => w.replace(/(es|s)$/, (m) => (w.length > 3 ? '' : m)));
    const whole = norm(q).replace(/s$/, '');
    let shown = 0;
    for (const el of this.$('assets').children) {
      const t = el.dataset.t;
      const hay = `${t} ${t.replace(/_/g, ' ')} ${KEYWORDS[t] ?? ''}`.toLowerCase();
      const ok = !words.length || norm(hay).includes(whole) || words.every((w) => hay.includes(w) || norm(hay).includes(w));
      el.style.display = ok ? '' : 'none';
      if (ok) shown++;
    }
    this.$('assets').dataset.empty = shown ? '' : 'Nothing matches. Try another word.';
  }

  status(msg, kind = '') {
    const el = this.$('status');
    el.textContent = msg;
    el.className = 'ed-status ' + kind;
  }

  updateDirty() {
    const n = this.dirty.size + (this.soundsDirty ? 1 : 0) + (this.itemsDirty ? 1 : 0);
    this.tab.classList.toggle('dirty', n > 0);
    this.$('save').textContent = n ? `Save (${n})` : 'Save';
  }

  /* ------------------------------------------------------------ open / close */

  open() {
    const g = this.game;
    this.isOpen = true;
    document.body.classList.add('editor-open');
    this.relayout();
    g.input.enabled = false;
    g.input.clear();
    // drop whatever the game was doing
    if (g.dialogue.active) {
      g.dialogue.active = false;
      g.dialogue.view.visible = false;
    }
    g.inv.hide();
    if (g.fade) {
      g.fade = null;
      g.fadeG.alpha = 0;
    }
    g.player.moving = false;
    g.camOverride = { x: g.camX, y: g.camY };
    g.lighting.sprite.visible = this.opts.light;
    this.layer.visible = true;
    this.$('map').value = this.mapId;
    this.buildAssets();
    this.renderSel();
    this.status(this.dirty.size ? 'You have unsaved changes.' : 'Click an object to edit it.');
  }

  close() {
    const g = this.game;
    this.isOpen = false;
    this.setStamp(null);
    this.select(null);
    document.body.classList.remove('editor-open');
    this.relayout();
    g.input.enabled = true;
    g.camOverride = null;
    g.lighting.sprite.visible = true;
    this.layer.visible = false;
    if (this.showAll) {
      this.showAll = false;
      this.$('all').checked = false;
      this.rebuild();
    }
  }

  gotoMap(id) {
    // arrive where a door into this map would put you, or in the middle
    let at = null;
    for (const m of Object.values(MAPS)) for (const d of m.doors || []) if (d.to === id && !at) at = d.at;
    const def = MAPS[id];
    if (!at) at = [Math.floor(def.tiles[0].length / 2), Math.floor(def.tiles.length / 2), 'down'];
    const g = this.game;
    this.select(null);
    g.camOverride = null;
    g.loadMap(id, at[0], at[1], at[2], true);
    g.camOverride = { x: g.camX, y: g.camY };
    this.$('map').value = id;
    g.showBanner(def.name);
  }

  /* ------------------------------------------------------------ selection & form */

  entry(key = this.selKey) {
    return key ? this.game.world.props.find((p) => p.def._key === key) : null;
  }

  select(key) {
    if (key !== this.selKey && this.boxMode) this.setBoxMode(false);
    this.selKey = key;
    this.renderSel();
  }

  renderSel() {
    const box = this.$('sel');
    const e = this.entry();
    if (!e) {
      box.innerHTML = `<div class="ed-title">Selected</div><div class="ed-note">Nothing selected. Click an object in the game, or pick one under “Add object” to place it.</div>`;
      return;
    }
    const p = e.def;
    const scripted = typeof p.onInteract === 'function';
    const obj = e.layer === 'obj';
    box.innerHTML = `
      <div class="ed-title">Selected: ${esc(p.t.replace(/_/g, ' '))} <small>${p._added ? 'added' : esc(p._key)}</small></div>
      <div class="ed-grid2">
        <label>X <input type="number" step="1" data-f="x"></label>
        <label>Y <input type="number" step="1" data-f="y"></label>
        <label>Offset X <input type="number" step="1" data-f="dx"></label>
        <label>Offset Y <input type="number" step="1" data-f="dy"></label>
      </div>
      <label class="ed-row">Scale <input type="range" min="0.25" max="4" step="0.05" data-f="scale"><input type="number" min="0.1" max="8" step="0.05" data-f="scale" class="ed-num"></label>
      <label class="ed-row">Rotate <input type="range" min="-180" max="180" step="1" data-f="rot"><input type="number" step="1" data-f="rot" class="ed-num"></label>
      ${hasViews(p.t) ? `<label class="ed-row">Placed against <select data-f="wall">
          <option value="back">Back wall (front view)</option><option value="left">Left wall (side view)</option>
          <option value="right">Right wall (side view)</option><option value="bottom">Bottom wall (seen from above)</option>
        </select></label>` : ''}
      <div class="ed-row"><button data-a="turn" title="R">Turn (R)</button><label class="ed-check"><input type="checkbox" data-f="flip"> Flip horizontally</label></div>
      <label class="ed-row ed-check" title="SPACE on it offers Investigate / Hide"><input type="checkbox" data-f="hide"> Hiding spot (the player can hide here)</label>
      <label class="ed-row">Collision <select data-f="solid">
          <option value="">Default</option><option value="true">Whole object blocks</option>
          <option value="false">Walk through</option><option value="custom">Custom box</option>
        </select></label>
      <div class="ed-box" data-k="box">
        <div class="ed-grid2 ed-grid4">
          <label>X <input type="number" step="1" data-f="bx"></label>
          <label>Y <input type="number" step="1" data-f="by"></label>
          <label>W <input type="number" step="1" min="1" data-f="bw"></label>
          <label>H <input type="number" step="1" min="1" data-f="bh"></label>
        </div>
        <button data-a="boxmode" class="ed-wide">Move box with the mouse</button>
        <div class="ed-note">Tiles, counted from the object's X / Y. Drag the red box in the game; Shift + drag resizes it.</div>
      </div>
      ${obj ? `<div class="ed-row">Draw order
          <input type="number" step="1" data-f="z" class="ed-num" title="Pixels: higher draws in front">
          <button data-a="front" title="Draw it in front of everything it overlaps">In front</button>
          <button data-a="behind" title="Draw it behind everything it overlaps">Behind</button>
        </div>` : ''}
      <div class="ed-title">Interaction text</div>
      ${scripted
        ? '<div class="ed-note warn">This object runs a script when you interact with it, so its text lives in the map file.</div>'
        : '<div class="ed-note">A blank line starts a new text box. Leave it empty and the object can’t be inspected.</div>'}
      <textarea data-f="text" rows="5" ${scripted ? 'disabled' : ''} placeholder="(no text)"></textarea>
      <details class="ed-adv"><summary>Options (advanced)</summary>
        <textarea data-f="opts" rows="4" spellcheck="false"></textarea>
        <div class="ed-note">Look options for this object as JSON, e.g. {"kind": "corn"} or {"blood": true}.</div>
      </details>
      <div class="ed-btns">
        <button data-a="dup">Duplicate</button>
        <button data-a="reset" ${p._added ? 'disabled' : ''} title="Back to how the map file has it">Reset</button>
        <button data-a="del" class="ed-danger">Delete</button>
      </div>`;
    box.querySelectorAll('[data-f]').forEach((el) => {
      el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', () => this.onField(el));
    });
    box.querySelector('[data-a="turn"]').addEventListener('click', () => this.turn());
    box.querySelector('[data-a="boxmode"]').addEventListener('click', () => this.setBoxMode(!this.boxMode));
    box.querySelector('[data-a="front"]')?.addEventListener('click', () => this.order(1));
    box.querySelector('[data-a="behind"]')?.addEventListener('click', () => this.order(-1));
    box.querySelector('[data-a="dup"]').addEventListener('click', () => this.duplicate());
    box.querySelector('[data-a="reset"]').addEventListener('click', () => this.mutate(() => resetProp(this.mapId, this.entry().def)));
    box.querySelector('[data-a="del"]').addEventListener('click', () => this.remove());
    this.syncSel(true);
  }

  /** copy the selected prop's values into the form (skipping the field being typed in) */
  syncSel(all = false) {
    const e = this.entry();
    if (!e) return;
    const p = e.def;
    const opts = Object.fromEntries(Object.entries(serializable(p)).filter(([k]) => !CORE.has(k)));
    const custom = isBox(p.solid);
    const values = {
      x: p.x, y: p.y, dx: p.dx ?? 0, dy: p.dy ?? 0, scale: p.scale ?? 1, rot: p.rot ?? 0,
      flip: !!p.flip, wall: p.wall ?? 'back', z: p.z ?? 0, hide: !!p.hide,
      solid: custom ? 'custom' : p.solid === true ? 'true' : p.solid === false ? 'false' : '',
      bx: custom ? p.solid.x : 0, by: custom ? p.solid.y : 0, bw: custom ? p.solid.w : 1, bh: custom ? p.solid.h : 1,
      text: toText(p.text), opts: JSON.stringify(opts),
    };
    this.$('sel').querySelector('[data-k="box"]').style.display = custom ? '' : 'none';
    if (!custom && this.boxMode) this.setBoxMode(false);
    this.$('sel').querySelectorAll('[data-f]').forEach((el) => {
      if (!all && el === document.activeElement) return;
      const v = values[el.dataset.f];
      if (el.type === 'checkbox') el.checked = v;
      else el.value = v;
      el.classList.remove('invalid');
    });
  }

  onField(el) {
    const f = el.dataset.f;
    let patch;
    if (f === 'x' || f === 'y' || f === 'dx' || f === 'dy' || f === 'z') {
      const n = parseInt(el.value, 10);
      if (Number.isNaN(n)) return;
      patch = { [f]: n };
    } else if (f === 'bx' || f === 'by' || f === 'bw' || f === 'bh') {
      const n = parseInt(el.value, 10);
      if (Number.isNaN(n)) return;
      const e = this.entry();
      if (!isBox(e?.def.solid)) return;
      const k = f[1];
      const box = { ...e.def.solid, [k]: k === 'w' || k === 'h' ? Math.max(1, n) : n };
      return this.change((fields) => (fields.solid = box), 'box');
    } else if (f === 'solid' && el.value === 'custom') {
      // start the custom box from what the object blocks right now
      const e = this.entry();
      const [tx, ty, tw, th] = e.solidTiles ?? e.area;
      patch = { solid: { x: tx - e.def.x, y: ty - e.def.y, w: tw, h: th } };
    } else if (f === 'scale' || f === 'rot') {
      const n = parseFloat(el.value);
      if (Number.isNaN(n)) return;
      patch = { [f]: f === 'scale' ? Math.max(0.1, Math.min(8, n)) : n };
      // keep the slider and the number box in step
      this.$('sel').querySelectorAll(`[data-f="${f}"]`).forEach((o) => o !== el && (o.value = n));
    } else if (f === 'flip') patch = { flip: el.checked };
    else if (f === 'hide') patch = { hide: el.checked || undefined };
    else if (f === 'wall') patch = { wall: el.value === 'back' ? undefined : el.value };
    else if (f === 'solid') patch = { solid: el.value === '' ? undefined : el.value === 'true' };
    else if (f === 'text') patch = { text: fromText(el.value) };
    else if (f === 'opts') {
      let parsed;
      try {
        parsed = JSON.parse(el.value || '{}');
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
      } catch {
        el.classList.add('invalid');
        return;
      }
      el.classList.remove('invalid');
      this.change((fields) => {
        for (const k of Object.keys(fields)) if (!CORE.has(k)) delete fields[k];
        for (const [k, v] of Object.entries(parsed)) if (!CORE.has(k)) fields[k] = v;
      }, 'opts');
      return;
    }
    this.change((fields) => {
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || (k === 'flip' && !v) || ((k === 'dx' || k === 'dy' || k === 'z' || k === 'rot') && !v) || (k === 'scale' && v === 1)) delete fields[k];
        else fields[k] = v;
      }
    }, f);
  }

  /* ------------------------------------------------------------ edits */

  /** change the selected prop's fields */
  change(mutator, mergeKey) {
    const e = this.entry();
    if (!e) return;
    const fields = serializable(e.def);
    mutator(fields);
    this.mutate(() => setFields(this.mapId, e.def, fields), mergeKey && this.selKey + ':' + mergeKey);
  }

  /** run an edit with undo support, then rebuild the map */
  mutate(fn, mergeKey) {
    const map = this.mapId;
    const before = JSON.stringify(EDITS[map] ?? {});
    fn();
    const after = JSON.stringify(EDITS[map] ?? {});
    if (before === after) return;
    const now = performance.now();
    const last = this.undoStack[this.undoStack.length - 1];
    if (mergeKey && last && last.mergeKey === mergeKey && last.map === map && now - last.time < 800) {
      last.after = after;
      last.time = now;
    } else this.undoStack.push({ map, before, after, mergeKey, time: now });
    if (this.undoStack.length > 300) this.undoStack.shift();
    this.redoStack = [];
    this.dirty.add(map);
    this.rebuild();
  }

  restore(map, json) {
    const data = JSON.parse(json);
    if (Object.keys(data).length) EDITS[map] = data;
    else delete EDITS[map];
    this.dirty.add(map);
    if (map !== this.mapId) this.gotoMap(map);
    this.rebuild();
  }

  undo() {
    const step = this.undoStack.pop();
    if (!step) return this.status('Nothing to undo.');
    this.redoStack.push(step);
    this.restore(step.map, step.before);
    this.status('Undone.');
  }

  redo() {
    const step = this.redoStack.pop();
    if (!step) return this.status('Nothing to redo.');
    this.undoStack.push(step);
    this.restore(step.map, step.after);
    this.status('Redone.');
  }

  rebuild() {
    this.game.refresh();
    if (this.selKey && !this.entry()) this.select(null);
    else this.syncSel();
    this.updateDirty();
  }

  duplicate() {
    const e = this.entry();
    if (!e) return;
    const fields = serializable(e.def);
    delete fields.uid;
    fields.x += 1;
    let key;
    this.mutate(() => (key = addProp(this.mapId, fields)));
    this.select(key);
  }

  remove() {
    const e = this.entry();
    if (!e) return;
    this.mutate(() => deleteProp(this.mapId, e.def));
    this.select(null);
    this.status('Deleted. Ctrl+Z brings it back.');
  }

  async save() {
    if (!this.dirty.size && !this.soundsDirty && !this.itemsDirty) return this.status('Nothing to save.');
    const maps = [...this.dirty];
    try {
      const saved = [];
      if (maps.length) {
        await saveEdits(maps);
        this.dirty.clear();
        saved.push(`src/maps/edits/ (${maps.join(', ')})`);
      }
      if (this.soundsDirty) {
        await saveSoundVolumes();
        this.soundsDirty = false;
        saved.push('src/sound-volumes.json');
      }
      if (this.itemsDirty) {
        await saveItemTexts();
        this.itemsDirty = false;
        saved.push('src/item-texts.json');
      }
      this.updateDirty();
      this.status(`Saved to ${saved.join(' and ')}.`, 'ok');
    } catch (err) {
      // no dev server (e.g. a built copy): offer the edits as a file instead
      const blob = new Blob([JSON.stringify(EDITS, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'edits.json';
      a.textContent = 'Download edits.json';
      this.status(`Could not save (${err.message}). Saving needs “npm run dev”. `, 'err');
      this.$('status').append(a);
    }
  }

  /* ------------------------------------------------------------ placing new objects */

  setStamp(t, view = {}) {
    if (this.ghost) {
      this.ghost.destroy();
      this.ghost = null;
    }
    this.stamp = t ? { t, ...view } : null;
    for (const el of this.$('assets').children) el.classList.toggle('active', el.dataset.t === t);
    if (t) {
      const pc = propCanvases(this.stamp, 1)[0];
      this.ghost = new Sprite(pc._tex ??= pc.texture());
      this.ghost.alpha = 0.65;
      this.ghost.visible = false;
      this.layer.addChild(this.ghost);
      const where = this.stamp.wall ? ` (against the ${this.stamp.wall} wall)` : '';
      this.status(`Click in the game to place a ${t.replace(/_/g, ' ')}${where}. R turns it. Shift places several. Esc stops.`);
    }
  }

  stampFields(wx, wy) {
    const s = this.stamp;
    const info = propInfo(s);
    return { ...s, x: Math.floor(wx / TILE) - Math.floor((info.tw - 1) / 2), y: Math.floor(wy / TILE) - (info.th - 1) };
  }

  /** R: turn the object being placed, or the selected one */
  turn() {
    if (this.stamp) {
      const { t, ...view } = turned({ ...this.stamp });
      const ghostPos = this.ghost && { x: this.ghost.x, y: this.ghost.y, v: this.ghost.visible };
      this.setStamp(t, view);
      if (this.lastPointer) this.moveGhost(this.lastPointer);
      else if (ghostPos) Object.assign(this.ghost, { x: ghostPos.x, y: ghostPos.y, visible: ghostPos.v });
      return;
    }
    if (this.entry()) this.change((f) => turned(f), 'turn');
  }

  moveGhost(w) {
    if (!this.stamp || !this.ghost) return;
    const fields = this.stampFields(w.x, w.y);
    transformSprite(this.ghost, placement(fields, propInfo(fields)));
    this.ghost.visible = true;
  }

  /* ------------------------------------------------------------ mouse */

  toWorld(e) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * VIEW_W + this.game.camX,
      y: ((e.clientY - r.top) / r.height) * VIEW_H + this.game.camY,
    };
  }

  toScreen(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * this.canvas.width) / r.width, y: ((e.clientY - r.top) * this.canvas.height) / r.height };
  }

  /** the object under the mouse: opaque pixels first, standing objects over wall pieces over floor decals */
  pick(e) {
    const g = this.toScreen(e);
    const rank = { obj: 0, wall: 1, floor: 2 };
    const hits = this.game.world.props.filter((p) => p.sprite.getBounds().containsPoint(g.x, g.y));
    const opaque = hits.filter((p) => this.opaqueAt(p.sprite, g));
    const list = opaque.length ? opaque : hits;
    const area = (p) => {
      const b = p.sprite.getBounds();
      return b.width * b.height;
    };
    list.sort((a, b) => rank[a.layer] - rank[b.layer] || (a.layer === 'obj' ? b.sprite.zIndex - a.sprite.zIndex : 0) || area(a) - area(b));
    return list[0] ?? null;
  }

  opaqueAt(spr, g) {
    const local = spr.toLocal(new Point(g.x, g.y));
    const canvas = spr.texture.source.resource;
    const px = Math.floor(local.x + spr.anchor.x * spr.texture.width);
    const py = Math.floor(local.y + spr.anchor.y * spr.texture.height);
    if (px < 0 || py < 0 || px >= canvas.width || py >= canvas.height) return false;
    return canvas.getContext('2d').getImageData(px, py, 1, 1).data[3] > 0;
  }

  bindCanvas() {
    const c = this.canvas;
    c.addEventListener('contextmenu', (e) => this.isOpen && e.preventDefault());
    c.addEventListener('pointerdown', (e) => {
      if (!this.isOpen) return;
      e.preventDefault();
      c.setPointerCapture(e.pointerId);
      if (e.button === 1 || e.button === 2) {
        if (this.stamp && e.button === 2) return this.setStamp(null);
        this.pan = { sx: e.clientX, sy: e.clientY, cx: this.game.camOverride.x, cy: this.game.camOverride.y };
        return;
      }
      const w = this.toWorld(e);
      if (this.boxMode && isBox(this.entry()?.def.solid)) {
        this.boxDrag = { start: w, box: { ...this.entry().def.solid }, resize: e.shiftKey };
        return;
      }
      if (this.stamp) {
        const fields = this.stampFields(w.x, w.y);
        let key;
        this.mutate(() => (key = addProp(this.mapId, fields)));
        this.select(key);
        if (!e.shiftKey) this.setStamp(null);
        return;
      }
      const hit = this.pick(e);
      this.select(hit ? hit.def._key : null);
      if (hit) {
        const p = hit.def;
        this.drag = { start: w, x: p.x, y: p.y, dx: p.dx ?? 0, dy: p.dy ?? 0, sx: hit.sprite.x, sy: hit.sprite.y, patch: null };
      }
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.isOpen) return;
      const r = c.getBoundingClientRect();
      if (this.pan) {
        this.game.camOverride.x = this.pan.cx - ((e.clientX - this.pan.sx) / r.width) * VIEW_W;
        this.game.camOverride.y = this.pan.cy - ((e.clientY - this.pan.sy) / r.height) * VIEW_H;
        return;
      }
      const w = this.toWorld(e);
      this.lastPointer = w;
      if (this.boxDrag) {
        const b = this.boxDrag.box;
        const tx = Math.round((w.x - this.boxDrag.start.x) / TILE), ty = Math.round((w.y - this.boxDrag.start.y) / TILE);
        this.boxPreview = this.boxDrag.resize
          ? { ...b, w: Math.max(1, b.w + tx), h: Math.max(1, b.h + ty) }
          : { ...b, x: b.x + tx, y: b.y + ty };
        return;
      }
      if (this.drag) {
        const d = this.drag;
        const mx = w.x - d.start.x, my = w.y - d.start.y;
        const e2 = this.entry();
        if (!e2) return;
        if (e.shiftKey) {
          d.patch = { dx: d.dx + Math.round(mx), dy: d.dy + Math.round(my) };
          e2.sprite.x = d.sx + Math.round(mx);
          e2.sprite.y = d.sy + Math.round(my);
        } else {
          const tx = Math.round(mx / TILE), ty = Math.round(my / TILE);
          d.patch = { x: d.x + tx, y: d.y + ty };
          e2.sprite.x = d.sx + tx * TILE;
          e2.sprite.y = d.sy + ty * TILE;
        }
        return;
      }
      if (this.stamp && this.ghost) return this.moveGhost(w);
      this.hoverKey = this.pick(e)?.def._key ?? null;
      c.style.cursor = this.hoverKey ? 'pointer' : 'default';
    });
    const end = () => {
      if (this.boxDrag) {
        const box = this.boxPreview;
        this.boxDrag = null;
        this.boxPreview = null;
        if (box) this.change((fields) => (fields.solid = box), 'box');
      }
      if (this.drag?.patch) {
        const patch = this.drag.patch;
        this.drag = null;
        this.change((fields) => {
          for (const [k, v] of Object.entries(patch)) {
            if ((k === 'dx' || k === 'dy') && !v) delete fields[k];
            else fields[k] = v;
          }
        });
      }
      this.drag = null;
      this.pan = null;
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', () => {
      this.hoverKey = null;
      if (this.ghost) this.ghost.visible = false;
    });
    c.addEventListener(
      'wheel',
      (e) => {
        if (!this.isOpen || !this.entry()) return;
        e.preventDefault();
        const dir = e.deltaY < 0 ? 1 : -1;
        if (e.shiftKey || e.altKey) {
          this.change((f) => {
            const r = (((f.rot ?? 0) + dir * 15 + 540) % 360) - 180;
            if (r) f.rot = r;
            else delete f.rot;
          }, 'rot');
        } else {
          this.change((f) => {
            const s = Math.round(Math.max(0.1, Math.min(8, (f.scale ?? 1) * (dir > 0 ? 1.1 : 1 / 1.1))) * 100) / 100;
            if (Math.abs(s - 1) < 0.001) delete f.scale;
            else f.scale = s;
          }, 'scale');
        }
      },
      { passive: false },
    );
  }

  /* ------------------------------------------------------------ keyboard */

  bindKeys() {
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen || isTyping(e)) return;
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      let handled = true;
      if (ctrl && k === 'z' && !e.shiftKey) this.undo();
      else if (ctrl && (k === 'y' || (k === 'z' && e.shiftKey))) this.redo();
      else if (ctrl && k === 's') this.save();
      else if (ctrl && k === 'd') this.duplicate();
      else if (k === 'delete' || k === 'backspace') this.remove();
      else if (k === 'escape') this.boxMode ? this.setBoxMode(false) : this.stamp ? this.setStamp(null) : this.select(null);
      else if (k === 'r' && !ctrl) this.turn();
      else if (k.startsWith('arrow') && this.entry()) {
        const [mx, my] = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[k];
        this.change((f) => {
          if (e.shiftKey) {
            f.dx = (f.dx ?? 0) + mx;
            f.dy = (f.dy ?? 0) + my;
            if (!f.dx) delete f.dx;
            if (!f.dy) delete f.dy;
          } else {
            f.x += mx;
            f.y += my;
          }
        }, 'nudge');
      } else handled = false;
      if (handled) e.preventDefault();
    });
  }

  /* ------------------------------------------------------------ overlay */

  update() {
    const g = this.game;
    const o = this.overlay;
    const w = g.world;
    this.layer.x = -g.camX;
    this.layer.y = -g.camY;
    o.clear();
    const px = 1 / g.root.scale.x; // one screen pixel
    if (this.opts.grid) {
      for (let x = 0; x <= w.w; x++) o.rect(x * TILE, 0, px, w.ph).fill({ color: 0xffffff, alpha: 0.08 });
      for (let y = 0; y <= w.h; y++) o.rect(0, y * TILE, w.pw, px).fill({ color: 0xffffff, alpha: 0.08 });
    }
    if (this.opts.coll) {
      for (let y = 0; y < w.h; y++)
        for (let x = 0; x < w.w; x++)
          if (w.solid[y * w.w + x] && w.tile(x, y) !== ' ') o.rect(x * TILE, y * TILE, TILE, TILE).fill({ color: 0xff3030, alpha: 0.2 });
      for (const d of w.doors.values()) o.rect(d.x * TILE, d.y * TILE, TILE, TILE).fill({ color: 0x3080ff, alpha: 0.35 });
      // hiding spots in green
      for (const p of w.props) {
        if (!p.def.hide) continue;
        const [ax, ay, aw, ah] = p.area;
        o.rect(ax * TILE, ay * TILE, aw * TILE, ah * TILE).fill({ color: 0x40d070, alpha: 0.35 });
      }
    }
    const outline = (spr, color, alpha, t) => {
      const b = spr.getBounds();
      const a = this.layer.toLocal(new Point(b.minX, b.minY));
      const c = this.layer.toLocal(new Point(b.maxX, b.maxY));
      const lw = t * px;
      o.rect(a.x, a.y, c.x - a.x, lw).fill({ color, alpha });
      o.rect(a.x, c.y - lw, c.x - a.x, lw).fill({ color, alpha });
      o.rect(a.x, a.y, lw, c.y - a.y).fill({ color, alpha });
      o.rect(c.x - lw, a.y, lw, c.y - a.y).fill({ color, alpha });
    };
    const hover = this.hoverKey !== this.selKey && this.entry(this.hoverKey);
    if (hover) outline(hover.sprite, 0xffffff, 0.5, 1);
    const sel = this.entry();
    if (sel) {
      outline(sel.sprite, ACCENT, 1, 2);
      if (!this.drag?.patch) {
        // red: the tiles it blocks (and can be inspected from); pink: inspect-only area
        const p = sel.def;
        const b = this.boxPreview;
        const solid = b ? [p.x + b.x, p.y + b.y, b.w, b.h] : sel.solidTiles;
        if (solid) {
          const [sx, sy, sw, sh] = solid.map((v) => v * TILE);
          o.rect(sx, sy, sw, sh).fill({ color: 0xff3030, alpha: this.boxMode ? 0.4 : 0.25 });
          const lw = (this.boxMode ? 2 : 1) * px;
          o.rect(sx, sy, sw, lw).fill({ color: 0xff5050 });
          o.rect(sx, sy + sh - lw, sw, lw).fill({ color: 0xff5050 });
          o.rect(sx, sy, lw, sh).fill({ color: 0xff5050 });
          o.rect(sx + sw - lw, sy, lw, sh).fill({ color: 0xff5050 });
        } else {
          const [ax, ay, aw, ah] = sel.area;
          o.rect(ax * TILE, ay * TILE, aw * TILE, ah * TILE).fill({ color: ACCENT, alpha: 0.18 });
        }
      }
    }
  }

  /* ------------------------------------------------------------ collision box & draw order */

  setBoxMode(on) {
    this.boxMode = on;
    this.boxDrag = null;
    this.boxPreview = null;
    const btn = this.$('sel').querySelector('[data-a="boxmode"]');
    if (btn) {
      btn.classList.toggle('active', on);
      btn.textContent = on ? 'Done moving the box' : 'Move box with the mouse';
    }
    if (on) this.status('Drag in the game to move the red collision box. Shift + drag resizes it. Esc when done.');
  }

  /** put the selected object in front of (dir > 0) or behind (dir < 0) everything it overlaps */
  order(dir) {
    const e = this.entry();
    if (!e || e.layer !== 'obj') return;
    const b = e.sprite.getBounds();
    const others = this.game.world.props.filter((o) => {
      if (o === e || o.layer !== 'obj') return false;
      const ob = o.sprite.getBounds();
      return ob.minX < b.maxX && ob.maxX > b.minX && ob.minY < b.maxY && ob.maxY > b.minY;
    });
    if (!others.length) return this.status('Nothing overlaps it, so the draw order makes no difference here.');
    const zs = others.map((o) => o.sprite.zIndex);
    const target = dir > 0 ? Math.max(...zs) + 1 : Math.min(...zs) - 1;
    this.change((f) => {
      const z = dir > 0 ? Math.ceil(target - e.baseZ) : Math.floor(target - e.baseZ);
      if (z) f.z = z;
      else delete f.z;
    }, 'z');
    this.status(dir > 0 ? 'Now drawn in front of everything it overlaps.' : 'Now drawn behind everything it overlaps.');
  }
}
