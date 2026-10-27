// Editor changes are kept apart from the hand-written map files. Each map can have
// src/maps/edits/<mapId>.json:
//   { "props": { "<key>": { changed fields } | { "deleted": true } },
//     "added": [ { "uid": "...", "t": "crate", "x": 3, "y": 4, ... } ] }
// A key identifies an object from the map file by its type and original position,
// e.g. "bookshelf@2,2" (with "#1", "#2" when several identical ones share a spot).

const bundled = import.meta.glob('../maps/edits/*.json', { eager: true, import: 'default' });

export const EDITS = {};
for (const [file, data] of Object.entries(bundled)) EDITS[file.match(/([\w-]+)\.json$/)[1]] = data;

/** in dev, read the files fresh from disk (the bundled copy can be stale after saving) */
export async function loadEdits() {
  if (!import.meta.env.DEV) return;
  try {
    const res = await fetch('/__editor/edits');
    if (!res.ok) return;
    const fresh = await res.json();
    for (const k of Object.keys(EDITS)) delete EDITS[k];
    Object.assign(EDITS, fresh);
  } catch {
    // no editor endpoint: keep the bundled edits
  }
}

export function editsFor(mapId) {
  const e = (EDITS[mapId] ??= {});
  e.props ??= {};
  e.added ??= [];
  return e;
}

const INTERNAL = new Set(['_key', '_orig', '_added']);

/** the plain-data part of a prop (no functions, no internal bookkeeping) */
export function serializable(p) {
  const out = {};
  for (const [k, v] of Object.entries(p)) {
    if (INTERNAL.has(k) || typeof v === 'function') continue;
    if (k === 'use' && v && Object.values(v).some((x) => typeof x === 'function')) continue;
    out[k] = v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  }
  return out;
}

function keyProps(props) {
  const seen = new Map();
  return props.map((p) => {
    const base = `${p.t}@${p.x},${p.y}`;
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n ? `${base}#${n}` : base;
  });
}

/** the map definition with this map's edits applied */
export function applyEdits(def) {
  const e = EDITS[def.id];
  const keys = keyProps(def.props);
  const props = [];
  def.props.forEach((p, i) => {
    const o = e?.props?.[keys[i]];
    if (o?.deleted) return;
    const merged = { ...p, ...(o || {}), _key: keys[i], _orig: p };
    for (const k in o) if (o[k] === null) delete merged[k];
    props.push(merged);
  });
  for (const a of e?.added || []) props.push({ ...a, _key: 'new:' + a.uid, _added: true });
  return { ...def, props };
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** replace the editable fields of a prop (an entry of applyEdits(def).props) */
export function setFields(mapId, prop, fields) {
  const e = editsFor(mapId);
  if (prop._added) {
    const a = e.added.find((x) => 'new:' + x.uid === prop._key);
    if (!a) return;
    const uid = a.uid;
    for (const k of Object.keys(a)) delete a[k];
    Object.assign(a, clean(fields), { uid });
    return;
  }
  const orig = serializable(prop._orig);
  const diff = {};
  for (const k of new Set([...Object.keys(orig), ...Object.keys(fields)])) {
    if (k === 't') continue;
    if (!same(orig[k], fields[k])) diff[k] = fields[k] === undefined ? null : fields[k];
  }
  if (Object.keys(diff).length) e.props[prop._key] = diff;
  else delete e.props[prop._key];
}

export function deleteProp(mapId, prop) {
  const e = editsFor(mapId);
  if (prop._added) e.added = e.added.filter((x) => 'new:' + x.uid !== prop._key);
  else e.props[prop._key] = { deleted: true };
}

export function resetProp(mapId, prop) {
  if (!prop._added) delete editsFor(mapId).props[prop._key];
}

/** add a new prop; returns its key */
export function addProp(mapId, fields) {
  const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  editsFor(mapId).added.push({ uid, ...clean(fields) });
  return 'new:' + uid;
}

function clean(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) if (v !== undefined && v !== null && k !== 'uid') out[k] = v;
  return out;
}

/** write the given maps' edits to src/maps/edits (dev server only) */
export async function saveEdits(mapIds) {
  const maps = {};
  for (const id of mapIds) maps[id] = EDITS[id] ?? null;
  const res = await fetch('/__editor/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ maps }),
  });
  const out = await res.json().catch(() => ({ ok: false, error: 'no response' }));
  if (!res.ok || !out.ok) throw new Error(out.error || 'save failed');
}
