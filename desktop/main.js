const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');const log = require('electron-log');

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

let mainWindow;
let splashWindow;

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
  }, duration * step); // el paso determina la velocidad del fade
}

ipcMain.handle('imprimir-html', async (_, html) => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    webPreferences: {
      contextIsolation: true
    }
  });

  const templatePath = path.join(__dirname, 'build', 'print-template.html');
  const cssPath = path.join(__dirname, 'build', 'print-css.css');

  try {
    let html = fs.readFileSync(templatePath, 'utf8');
    const css = fs.readFileSync(cssPath, 'utf8');

    html = html.replace('</head>', `<style>${css}</style></head>`);

    if (datos && typeof datos === 'object') {
      Object.keys(datos).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        html = html.replace(regex, datos[key]);
      });
    }

    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    win.webContents.on('did-finish-load', () => {
      win.webContents.print({ silent: true, printBackground: true },
        (success, failureReason) => {
          console.log('[Electron] Impresión completada:', success, failureReason);
          win.close();
        });
    });

  } catch (err) {
    console.error('[Electron] Error durante la impresion:', err);
    win.close();
  }
});

ipcMain.on('update:install', () => {
  console.log('[AutoUpdater] Usuario aceptó instalar la actualización.');
  autoUpdater.quitAndInstall();
});

function createWindow() {
  console.log('[Electron] Creando ventana de splash...');

  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    show: true,
  });

  splashWindow.loadFile('splash.html');

  console.log('[Electron] Creando ventana principal...');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    icon: path.join(__dirname, 'build', 'TMBC.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools:true,
    },
  });

  mainWindow.setOpacity(0);
  mainWindow.maximize();
  mainWindow.setMenu(null);

  const indexPath = path.join(__dirname, 'build', 'index.html');

  if (!fs.existsSync(indexPath)) {
    console.error('[Electron] El archivo index.html NO existe en la ruta especificada.');
    return;
  }

  mainWindow.loadFile(indexPath)
    .then(() => console.log('[Electron] index.html cargado correctamente'))
    .catch(err => console.error('[Electron] Error al cargar index.html:', err));

  mainWindow.webContents.openDevTools();

  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
    console.error('[Electron] Fallo al cargar el contenido:', errorDescription, `(Código: ${errorCode})`);
  });

  mainWindow.webContents.on('did-finish-load', async () => {
    console.log('[Electron] La ventana termino de cargar. Cerrando splash...');

    // Esperamos al menos 1 segundo para mostrar el splash
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }

    fadeIn(mainWindow);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  console.log('[Electron] App lista. Creando ventana...');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  autoUpdater.checkForUpdatesAndNotify()
    .then(() => {
      console.log('[Electron] Actualizaciones verificadas y notificadas.');
    })
    .catch(err => {
      console.error('[Electron] Error al verificar actualizaciones:', err);
    });

  autoUpdater.on('update-available', () => {
    console.log('[AutoUpdater] Actualización disponible.');
    // Acá después podrías enviar un mensaje al frontend para mostrar un Toast
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('[AutoUpdater] Actualización descargada. Se instalará al cerrar.');
    // También podrías notificar desde acá
  });

  autoUpdater.on('error', err => {
    console.error('[AutoUpdater] Error:', err);
  });

  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Buscando actualizaciones...');
    mainWindow?.webContents.send('update:checking');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Actualización disponible:', info);
    mainWindow?.webContents.send('update:available', info);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[AutoUpdater] No hay actualizaciones disponibles.');
    mainWindow?.webContents.send('update:not-available');
  });

  autoUpdater.on('download-progress', (progressObj) => {
    console.log('[AutoUpdater] Progreso descarga:', progressObj.percent.toFixed(2) + '%');
    mainWindow?.webContents.send('update:progress', progressObj);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Actualización descargada:', info);
    mainWindow?.webContents.send('update:downloaded', info);
  });

});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
