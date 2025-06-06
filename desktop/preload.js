const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  imprimirHTML: (html) => ipcRenderer.invoke('imprimir-html', html),

  // Auto-updater
  onUpdateChecking: (callback) => ipcRenderer.on('update:checking', callback),
  onUpdateAvailable: (callback) => ipcRenderer.on('update:available', callback),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update:not-available', callback),
  onUpdateProgress: (callback) => ipcRenderer.on('update:progress', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update:downloaded', callback),
  installUpdate: () => ipcRenderer.send('update:install')
});
