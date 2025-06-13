const { contextBridge, ipcRenderer } = require('electron');
const log = require('electron-log');
const { app } = require('electron')

log.catchErrors()

contextBridge.exposeInMainWorld('electronAPI', {
  imprimirHTML: (html) => ipcRenderer.invoke('imprimir-html', html),
  checkForUpdates: () => ipcRenderer.send('update:check'),
  installUpdate: () => ipcRenderer.send('update:install'),
  getVersion: () => app.getVersion(),
  log: {
    info: (msg) => log.info(msg),
    error: (msg) => log.error(msg),
  },
  onUpdateChecking: (callback) => ipcRenderer.on('update:checking', callback),
  onUpdateAvailable: (callback) => ipcRenderer.on('update:available', callback),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update:not-available', callback),
  onUpdateProgress: (callback) => ipcRenderer.on('update:progress', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update:downloaded', callback),
  removeListener: (channel, listener) => ipcRenderer.removeListener(channel, listener),
});
