// Valida el campo `build` del package.json contra el schema del electron-builder instalado, sin
// armar nada. El CI arma el renderer pero nunca corre electron-builder: así es como el salto a
// builder 26 (que movió las opciones de firma de `win` a `win.signtoolOptions`) llegó intacto
// hasta el tag 2.2.1 y recién falló en el workflow de release.
const { validateConfiguration } = require('app-builder-lib/out/util/config/config.js');
const { DebugLogger } = require('builder-util');
const { build } = require('../package.json');

validateConfiguration(build, new DebugLogger(false)).then(
  () => console.log('Config de electron-builder válida.'),
  (err) => {
    console.error(err.message);
    process.exit(1);
  },
);
