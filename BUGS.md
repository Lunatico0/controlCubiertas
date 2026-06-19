# 🐞 Bugs a resolver — ControlCubiertas

> Detectados en el E2E del 2026-06-17 (Chrome DevTools MCP). La app funciona end-to-end y persiste en Atlas; estos son problemas de la **capa cliente**, no de datos.

---

## 🔴 Bug 1 — El historial desaparece de la UI tras asignar/desasignar

- **Estado:** `[ ]` pendiente
- **Severidad:** media (alarma al usuario: parece pérdida de datos)
- **Síntoma:** Después de **Asignar** (y probablemente **Desasignar**) una cubierta, el modal de detalle muestra `Historial: 0 registros / "No hay registros en el historial"`, `Fecha de alta: No registrada` y `Total asignaciones: 0`.
- **Realidad:** Los datos están intactos en el backend. `GET /api/tires/:id` devuelve las entradas correctas (Alta + Asignación). Al **recargar la página** y reabrir el detalle, el historial vuelve completo.
- **Causa probable:** Tras el `PATCH /api/tires/:id/assign` se actualiza el estado local del detalle con la respuesta del PATCH (que viene **sin el `history` populado**) en lugar de re-fetchear la fuente de verdad (`GET /api/tires/:id`).
- **Dónde mirar:**
  - [frontend/src/components/TireDetails/](frontend/src/components/TireDetails/)
  - [frontend/src/hooks/useTireAction.js](frontend/src/hooks/useTireAction.js)
  - [frontend/src/hooks/useTireDetails.js](frontend/src/hooks/useTireDetails.js)
- **Fix propuesto:** Tras una acción (assign/unassign/status/correct) re-fetchear `GET /api/tires/:id` y setear ese resultado como estado del detalle, en vez de confiar en lo que devuelve la mutación.

---

## 🟡 Bug 2 — La fecha de alta se guarda corrida un día

- **Estado:** `[ ]` pendiente
- **Severidad:** menor
- **Síntoma:** Cargué `17/6/2026` como fecha de alta y la cubierta quedó con `16/6/2026`.
- **Realidad:** La entrada de "Asignación" (que usa fecha del servidor) quedó correcta en `17/6`. El desfase es solo en el campo manual del form de alta.
- **Causa probable:** Desfase de timezone (UTC) al serializar el valor del input `date` del formulario de alta (se interpreta a medianoche UTC y resta horas según GMT-3).
- **Dónde mirar:**
  - [frontend/src/components/New/](frontend/src/components/New/)
  - [frontend/src/utils/date.js](frontend/src/utils/date.js)
- **Fix propuesto:** Normalizar la fecha a local (o enviar `YYYY-MM-DD` sin conversión a UTC) al construir el payload del alta.

---

## 🟠 Bug 3 — Referencias colgadas en `vehicle.tires[]` (integridad de datos)

- **Estado:** `[ ]` pendiente
- **Severidad:** media (datos inconsistentes en producción)
- **Síntoma:** En la DB real hay **12 referencias** en `vehicle.tires[]` que apuntan a cubiertas (`_id`) que **ya no existen** en la colección `tires`. Detectado al clonar la DB para la demo y correr `backend/scripts/verify-demo.js` (origen y demo dieron las mismas 12 → es preexistente, no lo introdujo el seed).
- **Causa probable:** Al borrar/descartar una cubierta no se la quita del array `tires[]` del vehículo que la tenía (falta limpieza de la relación inversa). Mismo patrón que el Bug 1: la app no mantiene la consistencia del grafo tras una acción.
- **Dónde mirar:**
  - [backend/src/controller/tire.controller.js](backend/src/controller/tire.controller.js)
  - [backend/src/controller/vehicle.controller.js](backend/src/controller/vehicle.controller.js)
  - [backend/src/services/tire.service.js](backend/src/services/tire.service.js)
- **Fix propuesto:** (1) Al desasignar/borrar una cubierta, hacer `$pull` del `_id` en `vehicle.tires`. (2) Script de saneamiento una sola vez para limpiar las 12 refs ya existentes. Ojo: el modelo no tiene back-ref automática en Mongoose, hay que mantener ambos lados a mano.

---

## 🔵 Observación de UX — N° de orden obligatorio en el front, opcional en el back

- **Estado:** `[ ]` a decidir
- **Detalle:** El frontend exige `N° de orden` en el alta y en la asignación (`"El número de orden es obligatorio"`), pero el backend lo acepta como opcional. Hay una desalineación de contrato front/back. Decidir cuál es la fuente de verdad y alinear.

---

---

## 🟠 Bug 5 — Crear vehículo asignando cubiertas explota

- **Estado:** `[ ]` pendiente
- **Severidad:** media
- **Síntoma:** `POST /api/vehicles` con `tires: [ids]` falla. Solo funciona con `tires: []`.
- **Causa:** en [vehicle.controller.js](backend/src/controller/vehicle.controller.js) (~línea 53) hace `tire.history.push(...)`, pero el modelo `Tire` NO tiene campo `history` (el historial vive en la colección `History`) → `tire.history` es `undefined` y `.push` explota. Además `create` no tiene guard si `tires` viene `undefined`.
- **Detectado:** al aislar el test de integración (Hito 2a). El test pasa con `tires: []`; con cubiertas reales reventaría.
- **Fix propuesto:** reemplazar el `tire.history.push` por `addHistoryEntry` (que crea en la colección `History`) y setear `tire.vehicle`; agregar guard `(tires || [])`.

## 🔵 Limpieza — console.log de debug

- **Estado:** `[x]` hecho en hito 2b — quitados de `tire.service.js` (kmAlta/kmBaja/kmRecorridos) y `tire.controller.js` ("🧾 Receipt recibido").
- **Pendiente relacionado:** `backend/src/services/tire.service.logged.js` es **código muerto** (nadie lo importa; el service en uso es `tire.service.js`). Eliminar en una limpieza futura.

## 🛠️ Scripts de utilidad (backend/scripts/)

- [backend/scripts/inspect-db.js](backend/scripts/inspect-db.js) — inspecciona colecciones/volumen de la DB (solo lectura).
- [backend/scripts/seed-fake-db.js](backend/scripts/seed-fake-db.js) — clona la DB a `<DB>-Demo` anonimizando patentes/móviles/series. Idempotente. Solo escribe en la `-Demo`.
- [backend/scripts/verify-demo.js](backend/scripts/verify-demo.js) — valida integridad referencial y compara origen vs demo.

_Última actualización: 2026-06-17_
