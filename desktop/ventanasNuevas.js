// Política de ventanas nuevas y navegación del renderer. Vive en su propio módulo para que el
// smoke (scripts/smoke-electron.cjs) la instale sobre una ventana de prueba y la ejercite con un
// window.open() real: Electron no expone forma de leer de vuelta el handler registrado.

// t44: Electron DENIEGA window.open() por default cuando no hay setWindowOpenHandler, así
// que los links con target=_blank (los del changelog de las release notes, por ejemplo)
// quedaban inertes: el clic no hacía absolutamente nada, ni siquiera un error visible.
// Se abren en el navegador del sistema, NO en una ventana de Electron: una página remota
// dentro de la app tendría el mismo origen privilegiado que el renderer.
function instalarPoliticaDeVentanas(webContents, { shell, log }) {
  const abrirExterno = (url) => {
    try {
      // Solo http/https. Sin este chequeo, un file:// o un javascript: inyectado en el
      // contenido se le pasaría al sistema operativo para que lo ejecute.
      const { protocol } = new URL(url);
      if (protocol === 'http:' || protocol === 'https:') shell.openExternal(url);
      else log.warn('[Electron] Link con protocolo no permitido, ignorado:', protocol);
    } catch {
      log.warn('[Electron] Link con URL inválida, ignorado');
    }
    return { action: 'deny' };
  };
  webContents.setWindowOpenHandler(({ url }) => {
    // La ventana del comprobante (usePrintEngine): window.open("") llega como about:blank y el
    // renderer la escribe con document.write. Es la ÚNICA ventana propia que se permite: no
    // carga nada remoto, comparte el origen del renderer y sigue aislada como la principal.
    if (url === '' || url === 'about:blank') {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          autoHideMenuBar: true,
          webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
        },
      };
    }
    return abrirExterno(url);
  });

  // Misma regla para una navegación de la ventana PRINCIPAL fuera de la app: la app carga por
  // file:// y no navega a ningún lado; cualquier intento se manda al navegador.
  webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('file://')) return;
    event.preventDefault();
    abrirExterno(url);
  });
}

module.exports = { instalarPoliticaDeVentanas };
