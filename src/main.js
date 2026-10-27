import '@fontsource/dotgothic16/latin-400.css';
import { Application, Container, TextureSource } from 'pixi.js';
import { VIEW_W, VIEW_H, FONT } from './config.js';
import { Game } from './game.js';
import { setTextResolution } from './ui/common.js';
import { loadEdits } from './editor/edits.js';
import { Editor, PANEL_W } from './editor/editor.js';
import { loadSoundVolumes } from './audio.js';
import { loadItemTexts } from './items.js';

TextureSource.defaultOptions.scaleMode = 'nearest';

function fitScale() {
  // leave room for the editor panel when it is open
  const w = window.innerWidth - (document.body.classList.contains('editor-open') ? PANEL_W : 0);
  return Math.max(1, Math.floor(Math.min(w / VIEW_W, window.innerHeight / VIEW_H)));
}

async function boot() {
  await Promise.all([document.fonts.load(`16px "${FONT}"`), loadEdits(), loadSoundVolumes(), loadItemTexts()]);

  let scale = fitScale();
  const app = new Application();
  await app.init({
    width: VIEW_W * scale,
    height: VIEW_H * scale,
    background: '#000000',
    antialias: false,
    roundPixels: true,
  });
  document.body.appendChild(app.canvas);

  const root = new Container();
  root.scale.set(scale);
  app.stage.addChild(root);
  setTextResolution(scale);

  const game = new Game(root);
  window.game = game; // handy for debugging from the console

  const relayout = () => {
    const s = fitScale();
    if (s === scale) return;
    scale = s;
    app.renderer.resize(VIEW_W * s, VIEW_H * s);
    root.scale.set(s);
    setTextResolution(s);
  };
  window.addEventListener('resize', relayout);
  // the editor is for making the game: only while running `npm run dev`, not in a build
  if (import.meta.env.DEV) new Editor(game, app.canvas, relayout);

  app.ticker.add((ticker) => {
    game.update(Math.min(0.05, ticker.deltaMS / 1000));
  });
}

boot();
