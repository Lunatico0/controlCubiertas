# 🛠️ Especificación funcional — Panel de Administración (Portal del cliente)

> Qué es, para qué, quién lo usa, qué controla y cómo. **Solo lo funcional.** No incluye estética, layout, maquetación, colores ni componentes visuales: eso lo define Claude Design.
>
> Complementa a `DESIGN-CONTEXT.md` (negocio + glosario) y `DESIGN-SCREENS.md` (vistas de la app operativa).

---

## 1. Qué es

Un **panel de administración** donde el responsable de cada empresa cliente gestiona su cuenta de ControlCubiertas y supervisa su flota — **separado de la operación diaria** (cargar/asignar cubiertas).

**Analogía** (concepto, no estética): así como `velapos-merchant` administra y supervisa la operación de VelaPOS, este panel administra y supervisa la instancia de ControlCubiertas de un cliente. **Pero mucho más simple**: ControlCubiertas no tiene catálogo, checkout, clientes finales ni suscripciones — el dominio es gestión de activos (cubiertas) de una flota.

Distinción clave respecto a esos portales: en ControlCubiertas **no hay una "app de cliente final" separada**. La app ES la operación que usa el equipo. El panel **administra la cuenta y resume la operación**, no la reemplaza.

## 2. Para qué se usa

- **Administrar el acceso**: quién del equipo puede usar ControlCubiertas y con qué permisos.
- **Configurar la empresa**: datos de la organización y preferencias que aplican a toda la operación.
- **Supervisar la flota de un vistazo**: panorama del inventario y señales que requieren atención (sin entrar al detalle operativo).

## 3. Quién lo usa

- **Tenant-admin** (responsable/dueño de la empresa cliente): único rol con acceso al panel.
- **Usuario operativo**: **NO** accede al panel; solo usa la app operativa.
- _(Super-admin / dueño del SaaS: fuera de alcance por ahora — el alta de clientes se hace por script de provisioning.)_

## 4. Qué controla (secciones)

### 4.1 Resumen / Panorama
- **Propósito:** estado general de la cuenta y la flota al entrar.
- **Contenido (funcional):** total de cubiertas por estado (Nueva / recapados / A recapar / Descartada), en circulación vs en depósito, cantidad de vehículos, y señales de atención (cubiertas "A recapar" pendientes, vehículos sin cubiertas). Solo lectura.
- **Acciones:** navegar a las secciones; abrir la app operativa.

### 4.2 Usuarios (gestión del equipo)
- **Propósito:** administrar quién accede a ControlCubiertas dentro de la empresa.
- **Contenido:** lista de usuarios con email, nombre, rol (tenant-admin / operativo) y estado (activo/inactivo).
- **Acciones:** crear usuario (email + nombre + rol), editar (datos y rol), activar/desactivar, restablecer acceso/contraseña.
- **Reglas:** sin registro público — los crea el tenant-admin. No puede desactivarse a sí mismo si es el único admin.

### 4.3 Configuración de la empresa
- **Propósito:** datos y preferencias a nivel organización (no por navegador/usuario).
- **Contenido:** datos de la empresa (nombre, contacto). Preferencias operativas que hoy son por-dispositivo y deberían ser de la empresa: formato del comprobante, qué estados se consideran "en stock".
- **Acciones:** editar y guardar.

### 4.4 Cuenta _(a futuro)_
- Plan contratado, uso, facturación. Placeholder; fuera de alcance inicial.

## 5. Cómo lo controla

- Vía la **API de la cuenta** (control plane ya construido: `users`, `tenants`). El panel es cliente de esos endpoints.
- Todas las acciones de administración requieren ser **tenant-admin** (verificado en backend con `requireRole`).
- Toda operación informa su resultado (éxito/error) y pide confirmación en acciones sensibles (desactivar usuario, etc.).

## 6. Relación con la app operativa

| | App operativa (ControlCubiertas) | Panel de Administración |
|---|---|---|
| Para qué | Operar el día a día (cubiertas, vehículos, comprobantes) | Administrar la cuenta + supervisar |
| Quién | Operativos y admin | Solo tenant-admin |
| Qué hace | Crea/asigna/recapa cubiertas | Gestiona usuarios y config; resume la flota |

El tenant-admin ve un acceso al panel; el operativo no. El panel **lee** datos de la operación para el resumen, pero **no carga** datos operativos.

## 7. Qué NO incluye (alcance)

- No es la operación diaria (eso es la app; el panel no crea cubiertas).
- No hay super-admin / provisioning de clientes (lo hace el dueño por script).
- No hay facturación real todavía.
- No define estética, layout ni maquetación → **Claude Design**.

## 8. Sobre qué se apoya (ya construido)

- **Auth JWT** + control plane (`users` con rol, `tenants`). Login y RBAC ya existen.
- `requireRole('tenant-admin')` protege las acciones del panel.
- Patrones de UI reutilizables de la app (formularios, listas, confirmaciones) — referencia funcional, no estética.

## 9. Decisiones de producto abiertas (definir antes de diseñar)

- [ ] **¿App separada o área dentro de la app?** ¿El panel es un sitio aparte (como velapos-merchant) o una sección protegida dentro de ControlCubiertas? _(Recomendación: empezar como área protegida; separar a futuro si crece.)_
- [ ] **¿El Resumen incluye reportes?** ¿Solo panorama, o también reportes (km recorridos, historial agregado, exportar)?
- [ ] **¿Qué preferencias son de empresa vs de usuario?** Definir cuáles fija el admin para todos y cuáles quedan personales.
- [ ] **¿Roles internos?** ¿Alcanza con tenant-admin / operativo, o hace falta un nivel intermedio (supervisor)?

## 10. Nota para Claude Design

El diseño visual, la disposición y la maquetación son tuyos. Pedido del dueño: **identidad propia y moderna, con personalidad** — NO el estilo de Vela1, y NO el look genérico que "grita hecho con IA". Mantener coherencia con la app operativa de ControlCubiertas (misma familia visual), pero con criterio y carácter.
