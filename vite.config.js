import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EDITS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'src', 'maps', 'edits');
const VOLUMES_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'src', 'sound-volumes.json');
const ITEM_TEXTS_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'src', 'item-texts.json');
const MAP_ID = /^[a-z0-9_]+$/;

function readAll() {
  const out = {};
  if (!fs.existsSync(EDITS_DIR)) return out;
  for (const f of fs.readdirSync(EDITS_DIR)) {
    if (!f.endsWith('.json')) continue;
    try {
      out[f.slice(0, -5)] = JSON.parse(fs.readFileSync(path.join(EDITS_DIR, f), 'utf8'));
    } catch {
      // a broken file is skipped rather than taking the editor down
    }
  }
  return out;
}

/**
 * Lets the in-game editor read and write src/maps/edits/<map>.json, and the sound volumes
 * in src/sound-volumes.json, while `npm run dev` runs.
 */
function editorFiles() {
  return {
    name: 'editor-files',
    configureServer(server) {
      // inventory descriptions changed in the editor: { "<item id>": "text" }
      server.middlewares.use('/__editor/items', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        if (req.method !== 'POST') {
          let data = '{}';
          try {
            data = fs.readFileSync(ITEM_TEXTS_FILE, 'utf8');
          } catch {
            // no file yet: the descriptions written in src/items.js
          }
          return res.end(data);
        }
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          try {
            const texts = JSON.parse(body);
            for (const [k, v] of Object.entries(texts)) {
              if (!/^\w+$/.test(k) || typeof v !== 'string' || v.length > 2000) throw new Error('bad item text ' + k);
            }
            fs.writeFileSync(ITEM_TEXTS_FILE, JSON.stringify(texts, null, 2) + '\n');
            res.end('{"ok":true}');
          } catch (e) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
          }
        });
      });
      server.middlewares.use('/__editor/sounds', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        if (req.method !== 'POST') {
          let data = '{}';
          try {
            data = fs.readFileSync(VOLUMES_FILE, 'utf8');
          } catch {
            // no file yet: every sound at 100%
          }
          return res.end(data);
        }
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          try {
            const vols = JSON.parse(body);
            for (const [k, v] of Object.entries(vols)) {
              if (!/^\w+$/.test(k) || typeof v !== 'number' || !(v >= 0 && v <= 4)) throw new Error('bad volume ' + k);
            }
            fs.writeFileSync(VOLUMES_FILE, JSON.stringify(vols, null, 2) + '\n');
            res.end('{"ok":true}');
          } catch (e) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
          }
        });
      });
      server.middlewares.use('/__editor/edits', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(readAll()));
      });
      server.middlewares.use('/__editor/save', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end();
        }
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          try {
            const { maps } = JSON.parse(body);
            fs.mkdirSync(EDITS_DIR, { recursive: true });
            for (const [id, data] of Object.entries(maps)) {
              if (!MAP_ID.test(id)) throw new Error('bad map id ' + id);
              const file = path.join(EDITS_DIR, id + '.json');
              const empty = !data || (!Object.keys(data.props || {}).length && !(data.added || []).length);
              if (empty) fs.rmSync(file, { force: true });
              else fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
            }
            res.setHeader('Content-Type', 'application/json');
            res.end('{"ok":true}');
          } catch (e) {
            res.statusCode = 400;
            res.end(JSON.stringify({ ok: false, error: String(e.message || e) }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [editorFiles()],
  server: {
    // saving edits must not trigger a page reload in the middle of editing
    watch: { ignored: ['**/src/maps/edits/**', '**/src/sound-volumes.json', '**/src/item-texts.json'] },
  },
});
