const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

log.transports.file.resolvePath = () => path.join(app.getPath('userData'), 'update.log');
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

let mainWindow;
let splashWindow;

// ---------------- Animación Fade-in ----------------
function fadeIn(window, duration = 300, step = 0.08) {
  let opacity = 0;
  window.setOpacity(opacity);
  window.show();

  const interval = setInterval(() => {
    opacity += step;
    if (opacity >= 1) {
      opacity = 1;
      clearInterval(interval);
    }
    window.setOpacity(opacity);
  }, duration * step);
}

// ---------------- Funciones IPC ----------------
ipcMain.handle('imprimir-html', async (_, datos) => {
  const printWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: { contextIsolation: true },
  });

  const templatePath = path.join(__dirname, 'build', 'print-template.html');
  const cssPath = path.join(__dirname, 'build', 'print-css.css');

  try {
    let html = fs.readFileSync(templatePath, 'utf8');
    const css = fs.readFileSync(cssPath, 'utf8');
    html = html.replace('</head>', `<style>${css}</style></head>`);

    for (const key in datos) {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), datos[key]);
    }

    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    printWindow.webContents.on('did-finish-load', () => {
      printWindow.webContents.print({ silent: true, printBackground: true }, () => {
        log.info('[Electron] Impresión completada');
        printWindow.close();
      });
    });

  } catch (err) {
    log.error('[Electron] Error en impresión:', err);
    printWindow.close();
  }
});

ipcMain.handle('app:getVersion', () => app.getVersion());

ipcMain.on('update:check', () => {
  log.info('[Updater] Check manual solicitado');
  autoUpdater.checkForUpdates();
});

ipcMain.on('update:download', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.on('update:install', () => {
  log.info('[Updater] Usuario aceptó instalar');
  autoUpdater.quitAndInstall();
});

// ---------------- Ventana Principal ----------------
function createWindow() {
  splashWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    show: true,
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    icon: path.join(__dirname, 'build', 'TMBC.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: !app.isPackaged,
    },
  });

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.maximize();
  mainWindow.setMenu(null);
  mainWindow.setOpacity(0);

  mainWindow.once('ready-to-show', () => {
    splashWindow?.close();
    splashWindow = null;
    fadeIn(mainWindow);
  });

  const indexPath = path.join(__dirname, 'build', 'index.html');
  mainWindow.loadFile(indexPath).catch(err => {
    log.error('[Electron] No se pudo cargar el index:', err);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log.info('[Electron] Carga de ventana completa');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ---------------- Actualizaciones ----------------
function setupAutoUpdater() {
  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('update:checking');
  });

  autoUpdater.on('update-available', info => {
    mainWindow?.webContents.send('update:available', info);
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('update:not-available');
  });

  autoUpdater.on('download-progress', progress => {
    mainWindow?.webContents.send('update:progress', progress);
  });

  autoUpdater.on('update-downloaded', info => {
    mainWindow?.webContents.send('update:downloaded', info);
  });

  autoUpdater.on('error', err => {
    log.error('[AutoUpdater] Error:', err);
    mainWindow?.webContents.send('update:error', err.message);
  });
}

// ---------------- App Ready ----------------
app.whenReady().then(() => {
  autoUpdater.autoDownload = false;
  createWindow();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
