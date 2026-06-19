# 🧭 Especificación funcional de vistas — ControlCubiertas

> Inventario de TODAS las vistas que conlleva la app, con su propósito, contenido (datos), acciones y quién accede. **Esto define el QUÉ, no el CÓMO.** No incluye nada de estilo, layout, colores, tipografía ni elección de componentes visuales: esas decisiones son del diseñador.
>
> Complementa a `DESIGN-CONTEXT.md` (que explica el negocio y el glosario del dominio). Leer ese primero.

---

## Roles y acceso

| Rol | Quién es | Qué hace |
|---|---|---|
| **Usuario operativo** | Personal de pañol/depósito | Opera el día a día: cubiertas, vehículos, comprobantes. |
| **Tenant-admin** | Responsable del cliente | Todo lo del usuario operativo + gestiona usuarios y la configuración de su empresa. |
| _(Super-admin)_ | _Dueño del SaaS_ | _Fuera de alcance por ahora: el alta de clientes se hace por script._ |

Regla transversal: cada usuario solo ve y opera datos de **su propia empresa** (aislamiento por tenant). El área de administración solo es accesible para tenant-admin.

---

## Mapa de áreas

1. **Acceso** — entrar a la app.
2. **Inicio** — primera vista tras ingresar.
3. **Cubiertas** — el corazón operativo.
4. **Vehículos** — la flota.
5. **Comprobantes** — salida imprimible de cada movimiento.
6. **Configuración** — preferencias de operación.
7. **Administración** (tenant-admin) — usuarios y empresa.

---

## 1. Acceso

### 1.1 Inicio de sesión
- **Propósito:** autenticar al usuario y entrar a la app de su empresa.
- **Contenido:** identificación del usuario (email) y credencial (contraseña).
- **Acciones:** ingresar; recuperar acceso (a futuro).
- **Estados funcionales:** credenciales inválidas, cuenta inactiva, sesión expirada (vuelve acá).
- **Acceso:** público (única vista sin sesión).

### 1.2 Cambio de contraseña en primer ingreso _(a futuro)_
- **Propósito:** que un usuario recién dado de alta defina su contraseña definitiva.
- **Acciones:** establecer nueva contraseña.

---

## 2. Inicio (primera vista tras ingresar)

- **Propósito:** dar un panorama inmediato del estado del inventario y accesos a las tareas frecuentes. _Decisión de producto abierta: ver sección final._
- **Contenido sugerido (funcional):**
  - Resumen del inventario: cantidad de cubiertas por estado (Nueva / recapados / A recapar / Descartada) y cuántas están en circulación vs en depósito.
  - Señales de atención: cubiertas "A recapar" pendientes, vehículos sin cubiertas, etc.
  - Accesos rápidos a: alta de cubierta, alta de vehículo, búsqueda.
- **Acciones:** navegar a cualquier área; iniciar las tareas frecuentes.
- **Acceso:** todos los roles.

---

## 3. Cubiertas

### 3.1 Inventario de cubiertas
- **Propósito:** encontrar y revisar cualquier cubierta.
- **Contenido:** listado de cubiertas con sus datos clave (código interno, estado, marca, rodado, dibujo, km acumulados, vehículo asignado si lo tiene, fecha de alta).
- **Acciones:**
  - Buscar (por código, marca, número de serie).
  - Filtrar (por estado, marca, vehículo, rango de km).
  - Acotar la vista: en stock / todas / en circulación.
  - Abrir el detalle de una cubierta.
  - Iniciar alta de cubierta.
- **Estados funcionales:** cargando, sin resultados, error de carga.
- **Acceso:** todos los roles.

### 3.2 Detalle de cubierta
- **Propósito:** ver toda la información de una cubierta y operar sobre ella.
- **Contenido:**
  - Identificación: código interno, número de serie, marca, rodado, dibujo.
  - Estado actual y vehículo actual (o "en depósito").
  - Estadísticas: km totales, total de asignaciones, última actividad, fecha de alta.
  - **Historial** cronológico de movimientos: fecha, tipo (alta, asignación, desasignación, cambio de estado, corrección), n° de orden, vehículo, km de alta/baja, km del período, n° de comprobante.
- **Acciones (según estado actual):** asignar, desasignar, enviar a recapar, marcar recapado listo, descartar; editar datos; corregir o deshacer una entrada del historial.
- **Acceso:** todos los roles (acciones sensibles pueden requerir confirmación).

### 3.3 Alta de cubierta
- **Propósito:** registrar una cubierta nueva en el inventario.
- **Contenido (campos):** estado inicial, código interno (sugerido automáticamente), n° de orden, número de serie, marca, rodado, dibujo, km iniciales (opcional), fecha de alta, vehículo (opcional, si se monta de entrada).
- **Acciones:** crear (genera comprobante) / cancelar.
- **Reglas funcionales:** código y número de serie únicos por empresa; el n° de orden tiene un formato definido y se valida que no esté repetido.
- **Acceso:** todos los roles.

### 3.4 Asignar cubierta a vehículo
- **Propósito:** montar una cubierta en un vehículo.
- **Contenido (campos):** vehículo (búsqueda y selección), kilometraje inicial, n° de orden.
- **Acciones:** asignar (genera comprobante y registra movimiento en historial) / cancelar.
- **Disponible cuando:** la cubierta no está asignada y su estado lo permite.

### 3.5 Desasignar cubierta
- **Propósito:** bajar una cubierta de un vehículo y calcular los km recorridos.
- **Contenido (campos):** kilometraje de baja, n° de orden.
- **Acciones:** desasignar (registra km del período y comprobante) / cancelar.

### 3.6 Cambios de estado
- **Enviar a recapar:** pasa la cubierta a "A recapar".
- **Recapado listo:** pasa de "A recapar" al siguiente nivel de recapado.
- **Descartar:** marca la cubierta como descartada (fin de su vida útil).
- Cada cambio registra un movimiento en el historial con su comprobante.

### 3.7 Corregir / deshacer un movimiento del historial
- **Propósito:** enmendar una carga errónea sin perder trazabilidad.
- **Contenido:** datos del movimiento a corregir + motivo de la corrección.
- **Acciones:** corregir (crea una entrada de corrección que referencia la original) o deshacer.
- **Acceso:** acción sensible; puede requerir confirmación o permiso.

---

## 4. Vehículos

### 4.1 Inventario de vehículos
- **Propósito:** ver la flota y encontrar un vehículo.
- **Contenido:** listado de vehículos con móvil, patente, marca, tipo y cantidad de cubiertas montadas.
- **Acciones:** buscar; abrir detalle; iniciar alta de vehículo.
- **Acceso:** todos los roles.

### 4.2 Detalle de vehículo
- **Propósito:** ver un vehículo y las cubiertas que tiene montadas.
- **Contenido:** datos del vehículo + lista de cubiertas asignadas (con acceso al detalle de cada una).
- **Acciones:** editar datos del vehículo; navegar a una cubierta montada.

### 4.3 Alta / edición de vehículo
- **Propósito:** registrar o actualizar un vehículo.
- **Contenido (campos):** marca, móvil, patente, tipo (opcional), cubiertas a asignar (opcional).
- **Acciones:** crear / guardar / cancelar.
- **Reglas funcionales:** móvil y patente únicos por empresa; una cubierta no puede estar montada en dos vehículos a la vez.

---

## 5. Comprobantes

### 5.1 Comprobante de movimiento (imprimible)
- **Propósito:** dejar constancia imprimible de cada operación (alta, asignación, desasignación, cambio de estado).
- **Contenido:** número de comprobante correlativo (propio de la empresa), datos de la cubierta y/o vehículo involucrados, tipo de movimiento, n° de orden, fecha y km cuando corresponda.
- **Acciones:** imprimir; reimprimir un comprobante de un movimiento ya registrado.
- **Acceso:** todos los roles.

---

## 6. Configuración (preferencias de operación)

- **Propósito:** ajustar cómo opera la app para esta empresa/usuario.
- **Contenido (funcional):**
  - Formato del comprobante.
  - Qué estados se consideran "en stock".
  - Preferencias de la aplicación.
- **Acciones:** modificar y guardar preferencias.
- **Acceso:** todos los roles (algunas opciones podrían quedar solo para tenant-admin).

---

## 7. Administración (solo tenant-admin)

### 7.1 Acceso al área de administración
- **Propósito:** punto de entrada a la gestión de la empresa.
- **Acceso:** visible y accesible **solo** para tenant-admin; oculto/bloqueado para el resto.

### 7.2 Gestión de usuarios
- **Propósito:** administrar quién puede usar la app dentro de la empresa.
- **Contenido:** listado de usuarios con email, nombre, rol y estado (activo/inactivo).
- **Acciones:** crear usuario, editar (datos y rol), activar/desactivar, restablecer acceso.
- **Reglas funcionales:** no hay registro público; los usuarios los crea el tenant-admin.
- **Acceso:** solo tenant-admin.

### 7.3 Configuración de la empresa
- **Propósito:** ver y editar los datos de la organización.
- **Contenido:** datos de la empresa (nombre, etc.) y, a futuro, plan contratado.
- **Acciones:** editar y guardar datos de la empresa.
- **Acceso:** solo tenant-admin.

### 7.4 Facturación / plan _(a futuro)_
- Placeholder: gestión del plan y la facturación del SaaS. Fuera de alcance por ahora.

---

## 8. Comportamientos transversales (funcionales)

- **Estados de cada vista:** cargando, vacío (sin datos), error de carga/operación. Toda lista y todo detalle debe contemplarlos.
- **Confirmación de acciones sensibles:** desasignar, descartar, corregir/deshacer, desactivar usuario → requieren confirmación explícita.
- **Notificación de resultado:** toda operación (éxito o error) informa su resultado al usuario.
- **Reflejo inmediato:** tras una acción, la vista debe reflejar el nuevo estado sin necesidad de recargar.
- **Permisos:** lo que un usuario no puede hacer no debería estar disponible para él (no solo bloqueado al intentarlo).
- **Identidad y sesión:** el usuario actual y su empresa son visibles; debe poder cerrar sesión.

---

## Matriz vista × rol (resumen)

| Vista | Usuario operativo | Tenant-admin |
|---|:---:|:---:|
| Login | ✅ | ✅ |
| Inicio | ✅ | ✅ |
| Cubiertas (todas las vistas) | ✅ | ✅ |
| Vehículos (todas las vistas) | ✅ | ✅ |
| Comprobantes | ✅ | ✅ |
| Configuración | ✅ | ✅ |
| Administración (usuarios/empresa) | ❌ | ✅ |

---

## Decisiones de producto abiertas (definir antes de diseñar)

- [ ] **Vista de Inicio:** ¿un panorama/resumen nuevo, o entrar directo al inventario de cubiertas (como hoy)?
- [ ] **Nivel de los comprobantes:** ¿se imprimen siempre, o es opcional por movimiento?
- [ ] **Roles internos del tenant:** ¿alcanza con "operativo" y "admin", o hace falta un nivel intermedio (ej. supervisor)?
- [ ] **Qué config es del usuario vs de la empresa:** definir qué preferencias son personales y cuáles las fija el tenant-admin para todos.
- [ ] **Edición vs solo-lectura por rol:** ¿el usuario operativo puede dar de alta/editar, o solo ciertos roles?

---

_Base: dominio validado en una corrida E2E real de la app + el roadmap multi-tenant. Las vistas de Administración corresponden a fases futuras del roadmap; el resto ya existe funcionalmente hoy._
