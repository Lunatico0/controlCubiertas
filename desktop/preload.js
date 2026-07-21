const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  imprimirHTML: (html) => ipcRenderer.invoke('imprimir-html', html),
  checkForUpdates: () => ipcRenderer.send('update:check'),
  downloadUpdate: () => ipcRenderer.send('update:download'),
  installUpdate: () => ipcRenderer.send('update:install'),
  installOnNextLaunch: () => ipcRenderer.send('update:install-later'),
  listReleases: () => ipcRenderer.invoke('update:listReleases'),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  cacheTenantLogo: (dataUrl) => ipcRenderer.invoke('tenant:cacheLogo', dataUrl),

  // Controles de la ventana (titlebar frameless custom).
  minimizeWindow: () => ipcRenderer.send('win:minimize'),
  maximizeWindow: () => ipcRenderer.send('win:maximize'),
  closeWindow: () => ipcRenderer.send('win:close'),
  isWindowMaximized: () => ipcRenderer.invoke('win:isMaximized'),
  onMaximizeChange: (callback) => ipcRenderer.on('win:maximized', callback),

  onUpdateChecking: (callback) => ipcRenderer.on('update:checking', callback),
  onUpdateAvailable: (callback) => ipcRenderer.on('update:available', callback),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update:not-available', callback),
  onUpdateProgress: (callback) => ipcRenderer.on('update:progress', callback),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update:downloaded', callback),
  onUpdateError: (callback) => ipcRenderer.on('update:error', callback),

  removeListener: (channel, listener) => ipcRenderer.removeListener(channel, listener),
});
