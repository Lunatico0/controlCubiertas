# TireOps

**TireOps** es el software de gestión de cubiertas de flota que usan los talleres y las empresas
de transporte para saber, en cualquier momento, dónde está cada cubierta, cuánto kilometraje
lleva encima y qué le pasó en el camino. Se distribuye como **app de escritorio para Windows** y
como **aplicación web**, contra el mismo backend.

> El repositorio todavía se llama `controlCubiertas` por historia: el producto pasó a llamarse
> TireOps en la versión 2.0.0 y ese es el nombre en la UI, el instalador y los comprobantes.

---

## Qué hace

- **Inventario y ciclo de vida de cada cubierta**: alta, asignación a un móvil y a una posición
  concreta del eje, desasignación, recapado y descarte.
- **Estados configurables por empresa**. Cada tenant define su propia escalera de estados
  ("Nueva", "1er Recapado", "A recapar", "Descartada", o los nombres que use). La lógica de
  negocio va por el **rol** del estado, nunca por su nombre.
- **Comprobante impreso por movimiento**, con numerador correlativo reservado por el backend y
  un diseño configurable por empresa (logo, secciones, pie).
- **Historial auditable**: cada movimiento se puede corregir o deshacer, y la corrección queda
  registrada al lado del original en vez de pisarlo.
- **Panel de administración**: reportes de kilometraje por marca y por vehículo, mapa de calor
  de desgaste por posición del eje, histórico de comprobantes, usuarios y datos de la empresa.
- **Actualizaciones automáticas** de la app de escritorio desde GitHub Releases.

---

## Arquitectura

Tres repositorios: la raíz (Electron y el pipeline de release) y dos **submódulos de git** con
repo propio, montados en `backend/` y `frontend/`.

| Capa | Repo | Stack |
|------|------|-------|
| Escritorio | raíz | Electron 44, electron-builder, electron-updater |
| Frontend | [ControlCubiertas-Frontend](https://github.com/Lunatico0/ControlCubiertas-Frontend) | React 18, Vite 6, Tailwind 4, MUI 6, react-router 7, recharts, Sentry |
| Backend | [ControlCubiertas-Backend](https://github.com/Lunatico0/ControlCubiertas-Backend) | Node ESM, Express 4, Mongoose 8, Zod 4, JWT, Swagger, Sentry |

### Multi-tenant con dos planos

TireOps es **multi-tenant con una base de datos por empresa**, y eso condiciona todo lo demás:

- **Control plane**: una base central con las empresas (`Tenant`) y los usuarios (`User`), con
  su propia conexión independiente.
- **Data plane**: una conexión base al cluster de MongoDB Atlas y un `useDb(dbName)` por empresa,
  todas multiplexadas sobre el mismo pool. **La conexión viaja por request**, resuelta desde el
  `dbName` firmado en el JWT y revalidado contra el control plane en cada llamada.

### Autenticación

JWT con access token de vida corta y refresh token. El frontend comparte un único refresh entre
todas las peticiones que reciben un 401 simultáneo, para no disparar N refreshes en paralelo.

### Despliegue

| Qué | Dónde |
|-----|-------|
| Backend | Vercel, como función serverless (`api/index.js`) |
| Frontend web | Vercel |
| App de escritorio | GitHub Releases, con actualización automática vía electron-updater |
| Base de datos | MongoDB Atlas, una base por empresa |

---

## Puesta en marcha

### 1. Clonar

`backend/` y `frontend/` son **submódulos de git** de verdad (gitlinks registrados en
`.gitmodules`), así que van con el clone:

```bash
git clone --recursive https://github.com/Lunatico0/controlCubiertas.git
cd controlCubiertas
npm install
npm --prefix backend install
npm --prefix frontend install
```

Si ya clonaste sin `--recursive`, o venís de un checkout viejo donde los submódulos nunca se
registraron localmente:

```bash
git submodule update --init --recursive
```

### 2. Variables de entorno

**`backend/.env`**

```env
CONTROL_PLANE_URI=mongodb+srv://.../control-plane
MONGO_URI=mongodb+srv://.../
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
```

**`frontend/.env`**

```env
VITE_API_URL=http://localhost:3001
```

Opcionales del backend:

| Variable | Default | Qué hace |
|----------|---------|----------|
| `CORS_ORIGINS` | *(vacío)* | Orígenes permitidos, separados por coma. Vacío = cualquier origen. Las peticiones sin cabecera `Origin` pasan siempre: es el caso del escritorio, que carga por `file://`. |
| `LOGIN_RATE_LIMIT` | `10` | Intentos de login **fallidos** por ventana antes del 429. |
| `LOGIN_RATE_WINDOW_MS` | `900000` | Ventana del límite (15 minutos). |
| `BODY_LIMIT` | `2mb` | Techo del cuerpo de la petición. El logo de la empresa se persiste como dataURL. |

Opcionales del frontend: `VITE_SENTRY_DSN` (sin DSN, Sentry queda apagado).

Verificar la conectividad antes de arrancar:

```bash
node backend/scripts/check-env.js
```

### 3. Levantar

```bash
npm --prefix backend run dev     # API en :3001
npm --prefix frontend run dev    # Vite en :5173
```

Para la app de escritorio, desde la raíz:

```bash
npm --prefix frontend run build:electron   # renderer → desktop/build
npm run electron
```

---

## Comandos

### Backend (desde `backend/`)

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | API con `node --watch` |
| `npm test` | Suite completo (jest sobre ESM). Es hermético: usa `mongodb-memory-server` y no toca ninguna base real |

### Frontend (desde `frontend/`)

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Servidor de desarrollo de Vite |
| `npm test` | vitest + jsdom + testing-library |
| `npm run build:web` | Build para Vercel |
| `npm run build:electron` | Build para Electron, sale a `../desktop/build` |
| `npm run lint` | eslint |
| `npm run check:case` | Imports con el case exacto del filesystem |
| `npm run check:dead` | Archivos que ya no se alcanzan desde `main.jsx` |
| `npm run check:bundle` | Peso de los chunks (requiere haber buildeado) |

### Raíz

| Comando | Qué hace |
|---------|----------|
| `npm run build` | Compila el renderer y arma el instalador con electron-builder |
| `npm run electron` | Levanta la app de escritorio |
| `npm run smoke` | Smoke del proceso principal: main, preload, los canales de IPC y la CSP del renderer |

---

## Integración continua y releases

Los tres repositorios corren `.github/workflows/ci.yml` en cada push y en cada PR, con Node 22:

| Repo | Qué corre |
|------|-----------|
| frontend | case de imports → código muerto → lint → tests → `build:web` → peso del bundle |
| backend | suite completo de tests |
| raíz | checkout recursivo → build del renderer para Electron |

`main` está protegida en los tres repos: se promueve **por pull request**, con el check de CI en
verde, empezando por los submódulos y terminando por la raíz.

El release de escritorio se dispara con un tag `X.Y.Z` (**sin `v`**), que además verifica que la
versión del tag coincida con la del `package.json` de la raíz y del frontend.

> **El instalador no está firmado.** El `latest.yml` de electron-updater trae el SHA512 y el
> workflow publica un `SHA256SUMS.txt`, lo que da **integridad** pero no **autenticidad**:
> Windows SmartScreen va a mostrar "Editor desconocido". Resolverlo requiere un certificado de
> firma de código (OV o EV).

---

## Documentación

| Archivo | Contenido |
|---------|-----------|
| [CLAUDE.md](CLAUDE.md) | Convenciones del repositorio, gotchas y semántica no obvia del dominio |
| [BUGS.md](BUGS.md) | Bugs conocidos abiertos, con su análisis |
| [ART-DIRECTION.md](ART-DIRECTION.md) | Sistema visual: tipografía, color, espaciado |
| [DESIGN-CONTEXT.md](DESIGN-CONTEXT.md) · [DESIGN-SCREENS.md](DESIGN-SCREENS.md) | Contexto y catálogo de pantallas |
| [ADMIN-PORTAL-SPEC.md](ADMIN-PORTAL-SPEC.md) | Especificación del panel de administración |

---

## Contribuir

El desarrollo es interno. El flujo es el mismo en los tres repositorios:

1. Rama `feat/...` desde `develop`.
2. Test primero (RED), después el código (GREEN). **TDD estricto, sin excepción.**
3. Conventional commits, una línea.
4. **Pushear el submódulo ANTES que la raíz**: al revés, la raíz referencia commits que todavía
   no existen en el remoto del submódulo.
5. Pull request contra `main` con el CI en verde.

---

## Licencia

Software propietario. © Patricio Pittana. Todos los derechos reservados.

El código de este repositorio y de sus submódulos no se puede copiar, distribuir ni usar sin
autorización expresa por escrito.

---

## Contacto

[pittanapatricio@gmail.com](mailto:pittanapatricio@gmail.com)
