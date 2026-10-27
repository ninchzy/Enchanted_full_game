// The desktop app: one window running the built game (dist/, from `vite build`).
// The game is served from app://enchanted/ instead of straight from the files, because
// module scripts and fetch() don't work from file://; it also gives the saves
// (localStorage) a fixed home in %APPDATA%\Enchanted.
const { app, BrowserWindow, Menu, ipcMain, net, protocol } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const VIEW_W = 320; // VIEW_W / VIEW_H in src/config.js
const VIEW_H = 240;
const START_SCALE = 3;

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);
// music may start before the first key press
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function serveGame() {
  protocol.handle('app', (req) => {
    const rel = decodeURIComponent(new URL(req.url).pathname);
    const file = path.normalize(path.join(DIST, rel === '/' ? 'index.html' : rel));
    if (!file.startsWith(DIST + path.sep)) return new Response('', { status: 403 });
    if (!fs.existsSync(file)) return new Response('', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
}

function createWindow() {
  const win = new BrowserWindow({
    title: 'Enchanted',
    icon: path.join(ROOT, 'build', 'icon.ico'),
    width: VIEW_W * START_SCALE,
    height: VIEW_H * START_SCALE,
    minWidth: VIEW_W,
    minHeight: VIEW_H,
    useContentSize: true,
    fullscreen: true, // always starts fullscreen; the window size is for when it is switched off
    backgroundColor: '#000000',
    show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs') },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // F11 or Alt+Enter, besides the game's Settings
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) {
      e.preventDefault();
      win.setFullScreen(!win.isFullScreen());
    }
  });

  win.loadURL('app://enchanted/index.html');
}

if (!app.requestSingleInstanceLock()) {
  // already running: the first window comes to the front instead
  app.quit();
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });
  ipcMain.on('quit', () => app.quit());
  ipcMain.on('fullscreen:set', (e, on) => BrowserWindow.fromWebContents(e.sender).setFullScreen(!!on));
  ipcMain.handle('fullscreen:get', (e) => BrowserWindow.fromWebContents(e.sender).isFullScreen());
  app.on('window-all-closed', () => app.quit());
  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    serveGame();
    createWindow();
  });
}
