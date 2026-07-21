const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const https = require('https');
const log = require('electron-log');
const pkg = require('../package.json');

// Versión REAL de la app (2.0.0), tomada del package.json — NO de app.getVersion(), que en dev
// lanzado como `electron desktop/main.js` devuelve la versión de Electron. En la app empaquetada
// ambas coinciden. Se usa para mostrar la versión y comparar contra los releases.
const APP_VERSION = pkg.version;

// Modo de prueba del updater en dev (opt-in): TEST_UPDATER=1 hace que electron-updater consulte
// GitHub aunque no esté empaquetado (forceDevUpdateConfig + dev-app-update.yml). UPDATER_FAKE_VERSION
// permite fingir una versión instalada más baja para ver el flujo "hay actualización" contra un
// release real. Nunca aplica en la app empaquetada.
const DEV_UPDATER_TEST = process.env.TEST_UPDATER === '1';

log.transports.file.resolvePath = () => path.join(app.getPath('userData'), 'update.log');
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

let mainWindow;
let splashWindow;

// Logo del tenant cacheado para el splash (dataURL). Se escribe tras el login
// (IPC tenant:cacheLogo) y se lee en el próximo arranque. Sin cache (primer inicio
// o tenant sin logo) → el splash muestra la marca TireOps.
const tenantLogoPath = () => path.join(app.getPath('userData'), 'tenant-logo.txt');
function readCachedLogo() {
  try {
    return fs.readFileSync(tenantLogoPath(), 'utf8');
  } catch {
    return null;
  }
}

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

ipcMain.handle('app:getVersion', () => APP_VERSION);

// Controles de la ventana para la titlebar frameless custom.
ipcMain.on('win:minimize', () => mainWindow?.minimize());
ipcMain.on('win:maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('win:close', () => mainWindow?.close());
ipcMain.handle('win:isMaximized', () => !!mainWindow?.isMaximized());

// Cachea el logo del tenant (dataURL) para el splash del próximo arranque. Escribe solo si cambió.
ipcMain.handle('tenant:cacheLogo', (_, dataUrl) => {
  try {
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) return false;
    if (readCachedLogo() === dataUrl) return true;
    fs.writeFileSync(tenantLogoPath(), dataUrl);
    return true;
  } catch (err) {
    log.error('[Splash] No se pudo cachear el logo del tenant:', err);
    return false;
  }
});

ipcMain.on('update:check', () => {
  // En dev (no empaquetado) electron-updater no tiene feed (app-update.yml) y tira error.
  // Respondemos "sin actualización" para que la UI muestre el estado correcto sin ruido —
  // salvo en modo de prueba (TEST_UPDATER=1), donde sí consultamos GitHub.
  if (!app.isPackaged && !DEV_UPDATER_TEST) {
    log.info('[Updater] Check en dev → no-op (sin feed)');
    mainWindow?.webContents.send('update:not-available');
    return;
  }
  log.info('[Updater] Check solicitado');
  autoUpdater.checkForUpdates();
});

ipcMain.on('update:download', () => {
  autoUpdater.downloadUpdate();
});

// Instalar YA y reiniciar la app con la nueva versión.
ipcMain.on('update:install', () => {
  log.info('[Updater] Instalar y reiniciar');
  autoUpdater.quitAndInstall(false, true);
});

// Instalar en el próximo inicio: la actualización ya descargada se instala sola al cerrar la
// app (autoInstallOnAppQuit). No hacemos quitAndInstall: solo confirmamos.
ipcMain.on('update:install-later', () => {
  autoUpdater.autoInstallOnAppQuit = true;
  log.info('[Updater] Instalación programada para el próximo cierre');
});

// Lista de releases MÁS NUEVOS que el instalado (changelog), desde la GitHub Releases API.
// electron-updater solo conoce la última; para mostrar todas las versiones intermedias con sus
// notas usamos la API pública (el repo de releases es público → sin token).
const semverParts = (t) => {
  const m = String(t || '').match(/(\d+)\.(\d+)\.(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
};
const cmpVer = (a, b) => {
  const A = semverParts(a) || [0, 0, 0], B = semverParts(b) || [0, 0, 0];
  for (let i = 0; i < 3; i++) { if (A[i] !== B[i]) return A[i] - B[i]; }
  return 0;
};
function fetchJson(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'TireOps-Updater', Accept: 'application/vnd.github+json' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < 5) {
        res.resume();
        return fetchJson(res.headers.location, redirects + 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}
ipcMain.handle('update:listReleases', async () => {
  try {
    const { owner, repo } = (pkg.build || {}).publish || {};
    const url = `https://api.github.com/repos/${owner}/${repo}/releases`;
    const releases = await fetchJson(url);
    const current = process.env.UPDATER_FAKE_VERSION || APP_VERSION;
    return (Array.isArray(releases) ? releases : [])
      .filter((r) => !r.draft && !r.prerelease && semverParts(r.tag_name || r.name))
      .map((r) => {
        const version = semverParts(r.tag_name || r.name).join('.');
        const exe = (r.assets || []).find((a) => /\.exe$/i.test(a.name || ''));
        return { version, name: r.name || version, notes: r.body || '', date: r.published_at, size: exe?.size || 0 };
      })
      .filter((r) => cmpVer(r.version, current) > 0)
      .sort((a, b) => cmpVer(a.version, b.version));
  } catch (err) {
    log.error('[Updater] listReleases error:', err.message);
    return [];
  }
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

  // Inyectar el logo del tenant cacheado (si hay) una vez que el splash cargó.
  splashWindow.webContents.on('did-finish-load', () => {
    const logo = readCachedLogo();
    if (logo) {
      splashWindow?.webContents
        .executeJavaScript(`window.__setLogo(${JSON.stringify(logo)})`)
        .catch(() => {});
    }
  });

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    frame: false, // titlebar custom (frameless) — ver components/Layout/TitleBar.jsx + IPC win:*
    icon: path.join(__dirname, 'build', 'TireOps.ico'),
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

  // Estado de maximizado → la titlebar alterna el ícono maximizar/restaurar.
  mainWindow.on('maximize', () => mainWindow?.webContents.send('win:maximized', true));
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('win:maximized', false));

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
  autoUpdater.autoDownload = false; // el usuario dispara la descarga desde el modal
  autoUpdater.autoInstallOnAppQuit = true; // "instalar en el próximo inicio" = instalar al cerrar

  // Modo de prueba en dev: forzar el feed de GitHub aunque no esté empaquetado, para poder
  // probar el updater con `electron .`. UPDATER_FAKE_VERSION finge una versión instalada más baja.
  if (!app.isPackaged && DEV_UPDATER_TEST) {
    autoUpdater.forceDevUpdateConfig = true;
    autoUpdater.updateConfigPath = path.join(__dirname, '..', 'dev-app-update.yml');
    if (process.env.UPDATER_FAKE_VERSION) autoUpdater.currentVersion = process.env.UPDATER_FAKE_VERSION;
    log.info(`[Updater] Modo de prueba activo. Versión fingida: ${process.env.UPDATER_FAKE_VERSION || APP_VERSION}`);
  }

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
