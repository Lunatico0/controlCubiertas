const { app, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

let mainWindow;
let splash;

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
    icon: path.join(__dirname, 'TMBC.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.maximize();

  mainWindow.setMenu(null);

  const indexPath = path.join(__dirname, 'build', 'index.html');

  console.log('[Electron] Ruta del index.html:', indexPath);

  // Verificamos que el archivo exista antes de intentar cargarlo
  if (!fs.existsSync(indexPath)) {
    console.error('[Electron] El archivo index.html NO existe en la ruta especificada.');
    return;
  } else {
    console.log('[Electron] El archivo index.html existe. Cargando...');
  }

  mainWindow.loadFile(indexPath)
    .then(() => {
      console.log('[Electron] index.html cargado correctamente');
    })
    .catch(err => {
      console.error('[Electron] Error al cargar index.html:', err);
    });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Electron] Fallo al cargar el contenido:', errorDescription, `(Código: ${errorCode})`);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Electron] La ventana terminó de cargar.');
  });

  mainWindow.on('closed', () => {
    console.log('[Electron] Ventana cerrada.');
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  console.log('[Electron] App lista. Creando ventana...');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      console.log('[Electron] Reactivando app...');
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
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('[AutoUpdater] Actualización descargada. Se instalará al cerrar.');
  });

  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err);
  });

});

app.on('window-all-closed', () => {
  console.log('[Electron] Todas las ventanas cerradas.');
  if (process.platform !== 'darwin') {
    console.log('[Electron] Saliendo de la app...');
    app.quit();
  }
});
