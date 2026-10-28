// Valida el campo `build` del package.json contra el schema del electron-builder instalado, sin
// armar nada. El CI arma el renderer pero nunca corre electron-builder: así es como el salto a
// builder 26 (que movió las opciones de firma de `win` a `win.signtoolOptions`) llegó intacto
// hasta el tag 2.2.1 y recién falló en el workflow de release.
//
// Además fija una invariante de los workflows: electron-builder NUNCA publica. Su publisher de
// GitHub tiene una race (PublishManager.getOrCreatePublisher hace un await entre leer y escribir
// su cache): el .exe y el .blockmap piden publisher a la vez, se crean DOS, cada uno no encuentra
// release para el tag y cada uno crea el suyo. Así salieron los dos drafts de 2.2.1. El release lo
// arma el workflow con `gh release create`, en un solo paso y con todos los assets juntos.
const fs = require('node:fs');
const path = require('node:path');
const { validateConfiguration } = require('app-builder-lib/out/util/config/config.js');
const { DebugLogger } = require('builder-util');
const { build } = require('../package.json');

function invocacionesQuePublican(workflowsDir) {
  const errores = [];
  for (const archivo of fs.readdirSync(workflowsDir)) {
    if (!/\.ya?ml$/.test(archivo)) continue;
    const lineas = fs.readFileSync(path.join(workflowsDir, archivo), 'utf8').split(/\r?\n/);
    lineas.forEach((linea, i) => {
      const codigo = linea.replace(/^\s*#.*$/, '');
      if (!/\belectron-builder\b/.test(codigo) || /^\s*-?\s*uses:/.test(codigo)) return;
      // Sólo cuentan las invocaciones (npx electron-builder ..., npm run ...): las menciones en
      // un `name:` o en un echo no arman nada.
      if (!/\b(npx|npm exec|yarn|pnpm)\s+electron-builder\b|node_modules\/\.bin\/electron-builder/.test(codigo)) return;
      if (!/--publish[ =]never\b/.test(codigo)) {
        errores.push(`${archivo}:${i + 1}: electron-builder sin --publish never -> ${codigo.trim()}`);
      }
    });
  }
  return errores;
}

const publican = invocacionesQuePublican(path.join(__dirname, '..', '.github', 'workflows'));

validateConfiguration(build, new DebugLogger(false)).then(
  () => {
    console.log('Config de electron-builder válida.');
    if (publican.length > 0) {
      console.error(
        'electron-builder no puede publicar desde un workflow (crea un release por artefacto):\n  ' +
          publican.join('\n  '),
      );
      process.exit(1);
    }
    console.log('Ningún workflow publica con electron-builder.');
  },
  (err) => {
    console.error(err.message);
    process.exit(1);
  },
);
