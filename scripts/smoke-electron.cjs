// Smoke test del proceso principal de Electron.
//
// Por qué existe: la app de escritorio se instala en los clientes y el auto-updater se la empuja
// sola. Un salto de versión de Electron que rompa el preload o un canal de IPC no se nota en
// ningún test de React ni en el build: se nota cuando un operario abre la app y no funciona.
// Esto arranca Electron de verdad, con el mismo preload y el mismo build que usa el instalador,
// y verifica lo que tiene que estar vivo.
//
// Uso:  npx electron scripts/smoke-electron.cjs
// Sale con 0 si todo pasa, con 1 y el detalle si algo falla.
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

const RAIZ = path.join(__dirname, '..')
const INDEX = path.join(RAIZ, 'desktop/build/index.html')

// Los canales que el preload expone y que, si desaparecen, dejan la app inutilizable.
const CANALES_INVOKE = ['app:getVersion', 'win:isMaximized', 'tenant:cacheLogo', 'update:listReleases']
const CANALES_SEND = ['update:check', 'update:download', 'update:install', 'update:install-later', 'win:minimize', 'win:maximize', 'win:close']

// Métodos que el renderer espera encontrar en window.electronAPI (ver desktop/preload.js).
const API_ESPERADA = [
  'checkForUpdates', 'downloadUpdate', 'installUpdate', 'installOnNextLaunch',
  'listReleases', 'getVersion', 'cacheTenantLogo',
  'minimizeWindow', 'maximizeWindow', 'closeWindow', 'isWindowMaximized', 'onMaximizeChange',
  'onUpdateChecking', 'onUpdateAvailable', 'onUpdateNotAvailable', 'onUpdateProgress',
  'onUpdateDownloaded', 'onUpdateError', 'removeListener',
]

const fallos = []

// Una excepción no capturada en el main es, para el usuario, un cartel de Windows que dice
// "A JavaScript error occurred in the main process". Acá se convierte en un fallo del smoke con
// su stack, que es justo para lo que existe esto.
process.on('uncaughtException', (e) => {
  fallos.push(`excepción no capturada en el main: ${e.message}`)
  console.error(`  ✖ excepción no capturada en el main: ${e.stack}`)
})
const ok = (etiqueta) => console.log(`  ✔ ${etiqueta}`)
const mal = (etiqueta, detalle) => {
  fallos.push(`${etiqueta}${detalle ? `: ${detalle}` : ''}`)
  console.error(`  ✖ ${etiqueta}${detalle ? `: ${detalle}` : ''}`)
}

async function correr() {
  console.log(`Smoke de Electron ${process.versions.electron} (Chromium ${process.versions.chrome}, Node ${process.versions.node})`)

  // 1. El main real registra sus handlers al cargarse. Se lo importa tal cual, sin tocarlo.
  try {
    require(path.join(RAIZ, 'desktop/main.js'))
    ok('desktop/main.js se carga sin romper')
  } catch (e) {
    mal('desktop/main.js no se pudo cargar', e.message)
    return
  }

  // 2. Los canales de IPC siguen registrados con las APIs de esta versión de Electron.
  for (const canal of CANALES_INVOKE) {
    // _invokeHandlers es interno, pero es la única forma de verificar el registro sin disparar
    // el efecto (no queremos imprimir ni cerrar la ventana durante el smoke).
    if (ipcMain._invokeHandlers?.has(canal)) ok(`ipcMain.handle("${canal}")`)
    else mal(`falta ipcMain.handle("${canal}")`)
  }
  for (const canal of CANALES_SEND) {
    if (ipcMain.listenerCount(canal) > 0) ok(`ipcMain.on("${canal}")`)
    else mal(`falta ipcMain.on("${canal}")`)
  }

  // 2b. Guards del proceso principal que NO tienen API de lectura en runtime: Electron no
  // expone forma de preguntar si hay un setWindowOpenHandler registrado ni de leer de vuelta
  // el sandbox de una ventana ya creada. Se verifican sobre el fuente, que es lo único
  // disponible, y están acá para que un refactor no se los lleve en silencio (t44, t45).
  const mainSrc = require('fs').readFileSync(path.join(RAIZ, 'desktop/main.js'), 'utf8')
  if (/setWindowOpenHandler/.test(mainSrc)) ok('los links externos tienen guard de apertura (setWindowOpenHandler)')
  else mal('falta setWindowOpenHandler: los links target=_blank quedan inertes')
  if (/sandbox:\s*true/.test(mainSrc)) ok('la ventana principal declara sandbox: true')
  else mal('la ventana principal no declara sandbox explícito')

  // 3. Una ventana con el MISMO preload — y CON SANDBOX, como la real — carga el build y
  // expone la API al renderer. Que el preload siga funcionando bajo sandbox es justo el
  // riesgo de declararlo: ahí adentro `require` está limitado a un subconjunto de módulos.
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(RAIZ, 'desktop/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  const errores = []
  // Electron 44 pasa un objeto de evento con level/message; los argumentos sueltos de la firma
  // vieja quedaron deprecados y avisan por consola.
  win.webContents.on('console-message', (e) => {
    if (e.level === 'warning' || e.level === 'error') errores.push(e.message)
  })
  win.webContents.on('did-fail-load', (_e, code, desc) => mal('el renderer no cargó', `${code} ${desc}`))

  try {
    await win.loadFile(INDEX)
    ok('el renderer carga desde desktop/build/index.html')
  } catch (e) {
    mal('loadFile falló', e.message)
    return
  }

  const faltantes = await win.webContents.executeJavaScript(
    `(${JSON.stringify(API_ESPERADA)}).filter((k) => typeof window.electronAPI?.[k] !== "function")`,
  )
  if (faltantes.length === 0) ok(`window.electronAPI expone los ${API_ESPERADA.length} métodos del preload`)
  else mal('el preload no expuso todo', faltantes.join(', '))

  // El aviso de CSP de Electron SÍ cuenta: el build inyecta la Content-Security-Policy como
  // <meta> (frontend/vite.config.js) porque en file:// no hay respuesta HTTP donde ponerla como
  // cabecera. Si vuelve el aviso es que el meta se perdió, y el renderer quedó corriendo sin
  // ninguna restricción de origen. El resto de los Security Warning de Electron sí es ruido.
  const avisoCSP = errores.find((m) => /Content Security Policy/i.test(m))
  if (avisoCSP) mal('el renderer no declara Content-Security-Policy', avisoCSP.slice(0, 160))
  else ok('el renderer declara Content-Security-Policy')

  const errsReales = errores.filter((m) => !/DevTools|Autofill|source map|Electron Security Warning/i.test(m))
  if (errsReales.length) mal('errores en la consola del renderer', errsReales.slice(0, 3).join(' | '))
  else ok('sin errores en la consola del renderer')

  win.destroy()

  // El main real deja timers vivos (el fade-in de la ventana principal, el check del updater).
  // Se les da un respiro antes de salir: si alguno toca un objeto destruido, el handler de
  // uncaughtException de arriba lo registra como fallo en vez de dejarlo pasar.
  await new Promise((r) => setTimeout(r, 800))
}

app.whenReady().then(async () => {
  try {
    await correr()
  } catch (e) {
    mal('el smoke se cayó', e.stack)
  }
  if (fallos.length) {
    console.error(`\n✖ ${fallos.length} problema(s) en el proceso principal.`)
    app.exit(1)
  } else {
    console.log('\n✔ Proceso principal, preload e IPC en orden.')
    app.exit(0)
  }
})
