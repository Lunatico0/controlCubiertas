const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  imprimirHTML: (html) => ipcRenderer.invoke('imprimir-html', html),
  checkForUpdates: () => ipcRenderer.send('update:check'),
  downloadUpdate: () => ipcRenderer.send('update:download'),
  installUpdate: () => ipcRenderer.send('update:install'),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  onUpdateChecking: (callback) => ipcRenderer.on('update:checking', callback),
  onUpdateAvailable: (callback) => ipcRenderer.on('update:available', callback),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update:not-available', callback),
  onUpdateProgress: (callback) => ipcRenderer.on('update:progress', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update:downloaded', callback),
  onUpdateError: (callback) => ipcRenderer.on('update:error', callback),

  removeListener: (channel, listener) => ipcRenderer.removeListener(channel, listener),
});
