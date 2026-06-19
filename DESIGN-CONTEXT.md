# 🎨 Brief de diseño — ControlCubiertas

> Documento de contexto para trabajar la mejora de **UX/UI**. Describe qué es el producto, qué problema resuelve, su dominio, los flujos actuales y las oportunidades detectadas. Pensado para que un diseñador (o Claude Design) entienda el negocio antes de proponer.

---

## 1. Qué es

**ControlCubiertas** es una aplicación de gestión del **ciclo de vida de las cubiertas (neumáticos) de una flota de vehículos**. Permite registrar cada cubierta, seguir su estado, asignarla/quitarla de vehículos, mandarla a recapar, descartarla, y llevar un **historial trazable** de cada movimiento con su comprobante.

Corre como **app web** (React + Vite) y como **app de escritorio** (Electron) contra una **API REST (Node/Express + MongoDB)**.

## 2. Qué problema resuelve

En una flota, las cubiertas son un **activo caro y reutilizable**: se montan, se gastan, se recapan (se les pone banda de rodamiento nueva) hasta 3 veces, y finalmente se descartan. Hoy ese seguimiento suele hacerse en papel o planillas, lo que genera:

- No saber **dónde está cada cubierta** ni cuántos km lleva.
- Perder el rastro de **cuántas veces se recapó** una cubierta (define si todavía sirve).
- Falta de **comprobante** de cada movimiento (alta, asignación, recapado).
- Errores de carga difíciles de auditar o corregir.

El producto centraliza todo eso con **trazabilidad por cubierta** y comprobantes numerados.

## 3. Usuarios y contexto de uso

- **Perfil:** personal de pañol/depósito y encargados de mantenimiento de flota. Perfil **operativo, no técnico**.
- **Contexto:** uso de escritorio en oficina/taller. Operan con **código interno**, número de serie y número de orden. Suelen necesitar **imprimir comprobantes**.
- **Frecuencia:** uso diario, tareas repetitivas (altas, asignaciones, cambios de estado).

> ⚠️ _Confirmar con el dueño del producto: dispositivo real (¿desktop fijo, tablet en el taller?), si hay más de un rol, y volumen de cubiertas/vehículos esperado a escala._

## 4. Glosario del dominio (vocabulario clave para diseñar)

| Concepto | Qué es |
|---|---|
| **Cubierta** (tire) | El neumático. Tiene código interno, N° de serie, marca, rodado (medida), dibujo, km acumulados y un estado. |
| **Vehículo** | Unidad de la flota (camión, acoplado, auto…). Tiene móvil ("Movil 02"), patente, marca y las cubiertas que tiene montadas. |
| **Estado de cubierta** | Ciclo: **Nueva → 1er Recapado → 2do Recapado → 3er Recapado → A recapar → Descartada**. |
| **Asignación** | Montar una cubierta en un vehículo (registra km de alta). **Desasignación** la baja y calcula km recorridos. |
| **Orden** (N° de orden) | Identificador de la operación, formato `AAAA-NNNNNN`. Agrupa movimientos. |
| **Recibo / comprobante** | Número correlativo (`0001-00000001`) que se imprime por cada movimiento. |
| **Historial** | Lista cronológica de todos los movimientos de una cubierta (Alta, Asignación, Desasignación, cambios de Estado, y sus Correcciones). |

## 5. Tareas clave (jobs to be done)

1. **Dar de alta** una cubierta nueva al inventario.
2. **Encontrar** una cubierta rápido (por código, marca, serie, estado, vehículo).
3. **Asignar / desasignar** una cubierta a un vehículo (con km).
4. **Cambiar el estado** (enviar a recapar, recapado listo, descartar).
5. **Consultar la historia** completa de una cubierta y sus km.
6. **Corregir o deshacer** un movimiento mal cargado.
7. **Imprimir** el comprobante de un movimiento.
8. Gestionar **vehículos** (alta y edición).

## 6. Arquitectura de información actual

Navegación lateral con **3 secciones**:

- **Cubiertas** (home) — grid de tarjetas + buscador + filtros (estado, marca, vehículo, km) + vistas "En stock / Todas / En circulación".
- **Vehículos** — grid de tarjetas de vehículos.
- **Configuración** — tema claro/oscuro, colores por estado, tamaño de fuente.

El **detalle de cubierta** y todas las acciones (crear, asignar, editar, historial) ocurren en **modales** que se apilan sobre el grid.

## 7. Flujos principales (cómo es hoy)

- **Alta:** botón "Agregar nuevo" → elegir "Nueva cubierta" → formulario (estado, código autosugerido, N° de orden, serie, marca, rodado, dibujo, km, fecha, vehículo opcional) → "Crear cubierta" → toast + se imprime comprobante.
- **Asignar:** abrir detalle de la cubierta → "Asignar" → modal (autocomplete de vehículo, km inicial, N° de orden) → confirma.
- **Cambios de estado:** desde el detalle, acciones rápidas: "Enviar a recapar", "Recapado listo", "Descartar".
- **Historial:** dentro del detalle, tabla con columnas Fecha / N° Orden / Móvil / Patente / Km Alta / Km Baja / Km Total / Estado / N° Int / N° Serie / Acciones.

## 8. Estado actual de la UI (stack y forma)

- **Stack:** React 18 + Vite, **TailwindCSS** + **MUI (Material UI)**, `react-hook-form`, `sweetalert2` para toasts/diálogos, `react-to-print` para comprobantes.
- **Tema:** claro/oscuro, con colores por estado configurables y tamaño de fuente ajustable.
- **Tarjeta de cubierta:** muestra estado (badge), código `#28`, marca, rodado, dibujo, vehículo, km, fecha de alta.
- **Patrón dominante:** grid de cards + modales apilados.

## 9. Oportunidades de UX/UI detectadas (observaciones de uso real)

> Detectadas recorriendo la app; tomar como hipótesis a validar, no como verdades.

1. **Tabla de historial muy densa** (10+ columnas) dentro de un modal — difícil de leer y no escala a mobile. Oportunidad: timeline/cronología visual en vez de tabla ancha.
2. **Modales apilados** (detalle → asignar → autocomplete) — generan profundidad y pérdida de contexto. Evaluar paneles laterales (drawers) o vista de detalle dedicada.
3. **Jerarquía de las tarjetas:** mucha info plana con `label: valor`. Oportunidad de jerarquizar (qué importa de un vistazo: estado, vehículo, km).
4. **Estados de la cubierta** (6 estados con transiciones) — candidatos a una representación visual clara del ciclo (color + ícono + progreso de recapados).
5. **Feedback tras acciones:** algunas vistas no reflejan el cambio hasta recargar (ver `BUGS.md`). El rediseño debería contemplar estados de carga/optimistas y confirmación clara.
6. **Formularios largos** (alta con ~10 campos) — agrupar, usar valores sugeridos y validación clara (hoy el N° de orden es obligatorio pero no se comunica bien hasta el submit).
7. **Densidad de información** para un usuario operativo que repite tareas — atajos, acciones rápidas visibles, y búsqueda/filtros prominentes.

## 10. Objetivos de la mejora _(a completar por el dueño del producto)_

> Esto define el norte del rediseño. Completar antes de pedirle propuestas a Claude Design:

- [ ] **Objetivo principal:** ¿modernizar lo visual? ¿hacerlo más rápido de operar? ¿reducir errores de carga? ¿soportar mobile/tablet?
- [ ] **Métrica de éxito:** ¿qué querés que mejore (tiempo por alta, menos errores, satisfacción)?
- [ ] **Restricciones:** ¿mantener Tailwind + MUI? ¿respetar identidad visual / colores de marca (TMBC)?
- [ ] **Alcance:** ¿rediseño total o mejoras puntuales sobre lo existente?
- [ ] **Plataforma prioritaria:** ¿desktop, web responsive, o ambas?

## 11. Preguntas abiertas para el diseñador

- ¿Cómo visualizar mejor el **ciclo de vida** de una cubierta (estados + recapados + km) de un vistazo?
- ¿La **lista** debería seguir siendo grid de cards, o tabla/lista densa para operar más rápido?
- ¿El **detalle + historial** merece pantalla propia en vez de modal?
- ¿Cómo simplificar el **alta** y la **asignación** sin perder los datos que el negocio necesita (órdenes, comprobantes)?

---

_Referencias en el repo: flujos y modelo de datos validados en una corrida E2E; problemas técnicos conocidos en [BUGS.md](BUGS.md)._
