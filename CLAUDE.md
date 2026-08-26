# ControlCubiertas / TireOps: instrucciones del proyecto

## 1. Entorno

- Repo raíz: `e:\Workspace\CodeByPittana\controlCubiertas` (Windows, PowerShell primario, Bash disponible).
- Producto: **TireOps** (el repo sigue llamándose `controlCubiertas` por historia).
- Tres repos: raíz (Electron + release) y dos **submódulos** con repo propio:
  - `backend/` → `Lunatico0/ControlCubiertas-Backend`
  - `frontend/` → `Lunatico0/ControlCubiertas-Frontend`
- Ramas: trabajo diario en `feat/...`, integración en `develop`, `main` es la versión vigente / demo.

## 2. Git (CRÍTICO)

- **Antes de cada commit y push, switchear de cuenta**:
  ```bash
  gh auth switch --user Lunatico0
  ```
  `Patricio-Vela1` NO tiene permiso de push (da 403). Si tras el switch el push falla por credencial cacheada en Windows, correr `gh auth setup-git`.
- **Pushear el submódulo ANTES que el raíz.** Al revés, el raíz referencia commits que no existen en el remoto del submódulo.
- `main` se actualiza promoviendo un hito terminado desde una rama `feat/...` con merge **fast-forward**, submódulos primero.
- **Conventional commits**, una línea. Nunca `Co-Authored-By` ni atribución AI.

## 3. Stack y comandos

| Capa | Stack |
|------|-------|
| Desktop | Electron 34 + electron-builder + electron-updater |
| Frontend | React 18, Vite 6, Tailwind 4, MUI 6, react-hook-form, react-router 7, recharts, SweetAlert2, Sentry |
| Backend | Node ESM, Express 4, Mongoose 8, Zod 4, JWT, Swagger, Sentry |
| DB | MongoDB Atlas, **DB por tenant** |
| Deploy | Backend en Vercel serverless (`api/index.js`), frontend web en Vercel, desktop por GitHub Releases |

```bash
# frontend (desde frontend/)
npm run dev            # Vite dev server
npm test               # vitest + jsdom + testing-library (config en vitest.config.js)
npm run test:watch     # vitest en watch
npm run build:web      # build web (Vercel)
npm run build:electron # build para Electron, sale a ../desktop/build

# backend (desde backend/)
npm run dev            # node --watch
npm test               # jest con --experimental-vm-modules (ESM)

# desktop (desde la raíz)
npm run build          # build-react + electron-builder
```

Setup: `.env` en `backend/` con `CONTROL_PLANE_URI` y `MONGO_URI`; `.env` en `frontend/` con `VITE_API_URL`. `VITE_SENTRY_DSN` es opcional (sin DSN, Sentry queda apagado). Verificar conectividad con `node scripts/check-env.js`.

Variables opcionales del backend (seguridad HTTP):

| Variable | Default | Qué hace |
|----------|---------|----------|
| `CORS_ORIGINS` | *(vacío)* | Lista de orígenes permitidos separados por coma. **Vacío = cualquier origen**, que es el comportamiento histórico. Setearla en Vercel es lo que cierra CORS, sin tocar código. Las requests SIN cabecera `Origin` pasan siempre: es el caso del desktop, que carga por `file://`. |
| `LOGIN_RATE_LIMIT` | `10` | Intentos de login FALLIDOS por ventana antes del 429. Los exitosos no consumen cupo. |
| `LOGIN_RATE_WINDOW_MS` | `900000` | Ventana del límite (15 min). |

## 4. Reglas del repo

- **TDD estricto**: test primero, RED → GREEN. Sin excepción.
- **El suite de tests del backend es hermético.** Los 37 archivos que tocan DB usan `mongodb-memory-server`; ninguno lee `MONGO_URI` ni `CONTROL_PLANE_URI`. Verificado el 2026-08-25 corriendo el suite completo con las dos variables apuntando a un host inexistente: 169 pasan, 1 skipped. Se puede correr entero sin miedo.
- **El frontend tiene tests desde el 2026-08-26**: vitest + jsdom + testing-library, en `frontend/src/tests/`. La config vive en `vitest.config.js` SEPARADA de `vite.config.js` a propósito: `vite build` no lee ese archivo, así que el build de producción nunca importa vitest. Los alias se heredan por `mergeConfig`, no hay que duplicarlos.
- Frontend: imports por alias (`@/`, `@components`, `@context`, `@constants`, `@utils`, `@hooks`, `@api`), nunca rutas relativas largas.
- **GOTCHA de mayúsculas**: existen `components/UI/` y `components/common/` con nombres solapados (`Modal.jsx` en ambos). Windows es case-insensitive y Linux no: un import con el case equivocado pasa en local y **rompe el build de Vercel**. Verificar el case exacto antes de importar.
- **GOTCHA de `ref` en componentes propios**: si un componente de input va a recibir `{...register(...)}` de react-hook-form, TIENE que estar envuelto en `forwardRef` y pasarle el `ref` al control. En React 18 `ref` no viaja dentro de props: sin eso, RHF no ve el campo y el formulario queda mudo en los dos sentidos (no lee lo tipeado ni se puebla con `reset()`), sin un solo error visible. Le pasó a `FloatingField` y se llevó puestos tres formularios, incluido el cambio de contraseña. Cubierto por `src/tests/FloatingField.test.jsx`.
- Backend: errores vía `utils/httpError.js`, controladores envueltos en `utils/asyncHandler.js`. No tirar `res.status().json()` a mano en controladores nuevos.
- `frontend/src/components/` sigue la convención `common/` para lo compartido. No duplicar componentes ya existentes ahí.

## 5. Áreas sensibles y comandos peligrosos

- Los **scripts** de `backend/scripts/` son lo peligroso, no los tests (ver punto siguiente).
- Los scripts de `backend/scripts/` (`seed-*`, `migrate-*`, `repair-*`, `sanitize-*`) **escriben en DBs reales**. Leer el script entero antes de ejecutarlo y confirmar contra qué tenant apunta.
- `desktop/build/` y `frontend/dist/` son **generados**. Editar la fuente, nunca el output.
- `.saas-roadmap/` está gitignoreada a propósito (planificación interna). No commitearla.
- Bugs abiertos y su análisis viven en [BUGS.md](BUGS.md). Consultarlo antes de "descubrir" un bug ya documentado.

## 6. Semántica no obvia del dominio

- **Multi-tenant con dos planos**:
  - *Control plane* ([backend/src/db/controlPlane.js](backend/src/db/controlPlane.js)): DB central con `Tenant` y `User`. Conexión propia e independiente.
  - *Data plane* ([backend/src/db/tenantConnections.js](backend/src/db/tenantConnections.js)): una conexión base al cluster y `useDb(dbName)` por tenant, todas multiplexadas sobre el MISMO pool. **La conexión viaja por request, NUNCA se guarda en un singleton de servicio.**
- **Estados de cubierta configurables por tenant** ([backend/src/utils/statuses.js](backend/src/utils/statuses.js)): la cubierta guarda el status **por nombre**, pero la lógica depende del **rol** (`initial`, `stock`, `recap`, `discard`), resuelto por lookup en runtime. Invariantes: exactamente un `initial` y un `discard`; `recap` es opcional. Nunca hardcodear nombres de estado en lógica de negocio.
- **Máscara y separador de patente configurables por tenant** ([backend/src/utils/plate.js](backend/src/utils/plate.js)).
- **No hay back-ref automática en Mongoose** entre `tire` y `vehicle.tires[]`. Al desasignar o borrar una cubierta hay que mantener **los dos lados a mano** (ver Bug 3 en BUGS.md).
- **Serverless**: el cold start de Atlas genera races. Tanto `controlPlane` como `tenantConnections` tienen mitigaciones específicas (promesa compartida, `.catch` en la conexión base). No "simplificarlas".
- **Refresh de token compartido** ([frontend/src/api/client.js](frontend/src/api/client.js)): N requests con 401 simultáneos disparan UN solo `POST /refresh`. El código `TENANT_INACTIVE` fuerza logout sin intentar refresh.

## 7. Trampas conocidas

- `build:electron` usa `base: './'` (Electron carga por `file://`) y el build web usa `base: '/'`. Un build cruzado deja rutas rotas y silenciosas.
- `build:electron` tiene hardcodeada la URL de producción del backend en el script de `package.json`.
- Los tests del backend necesitan `--experimental-vm-modules` (proyecto ESM puro). Correr `jest` pelado falla.
- Timezone: las fechas manuales del formulario se serializan a UTC y se corren un día en GMT-3 (Bug 2). Cualquier campo `date` nuevo arrastra el mismo problema.

## 8. Flujo de trabajo

Loop por hito: **testear (RED) → codear (GREEN) → emprolijar → commitear → pushear (submódulo primero) → verificar → siguiente hito.**

Completar la feature ENTERA incluidos los flecos, y testear el flujo completo antes de reportar. No frenar a preguntar salvo decisión destructiva o de alcance.

## 9. Modelos por tipo de trabajo

| Trabajo | Modelo |
|---------|--------|
| Diseño de arquitectura, multi-tenant, decisiones de contrato de datos | `opus` |
| Verificación contra spec, code review, auditoría | `opus` |
| Implementación de tasks ya definidas, tests, refactors mecánicos | `sonnet` |
| Exploración del repo, búsqueda, lectura | `sonnet` |
| Cambios de una línea, renames, bumps de versión | `haiku` |

Todo lo que toque `backend/src/db/` o la resolución de tenant va con `opus`: un error ahí filtra datos entre clientes.
