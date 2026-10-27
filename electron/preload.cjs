// What the game page may ask of the desktop app. In a browser `window.enchanted` doesn't exist.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('enchanted', {
  quit: () => ipcRenderer.send('quit'),
  setFullscreen: (on) => ipcRenderer.send('fullscreen:set', on),
  isFullscreen: () => ipcRenderer.invoke('fullscreen:get'),
});
