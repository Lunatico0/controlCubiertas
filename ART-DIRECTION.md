# 🎨 Dirección de arte — ControlCubiertas (panel + app)

> Documento para Claude Design. Define la identidad visual: **paleta, tipografía, íconos y tratamiento de superficies**. Dirección elegida: **"Logística limpia con carácter"** — base clara y profesional, con un primario fuerte del rubro (no el azul genérico) y tipografía con personalidad. Aplica al panel de administración Y a la app operativa (misma familia).
>
> Los valores hex/fuentes son **punto de partida ajustable**, no dogma. Lo que NO se negocia es la **lista negra** (sección 2).

## 1. Principios

- **Del rubro, no genérico**: transporte / logística / gestión de flota. Serio, operativo, con identidad propia. NO estilo "starter de IA".
- **Claridad operativa**: es una herramienta de trabajo diario; legibilidad y densidad de información antes que decoración.
- **Carácter sin ruido**: personalidad en tipografía, color e íconos — no en gradientes ni efectos.

## 2. Lista negra (NO usar — esto es lo que "grita IA")

- ❌ Gradientes violeta/índigo (ni ningún gradiente decorativo de fondo).
- ❌ Glassmorphism / blur / transparencias "vidrio".
- ❌ Bordes muy redondeados en todo (pill/2xl por defecto).
- ❌ **Borde de color en una sola arista** de las cards (el clásico left-accent).
- ❌ Sombras difusas grandes y uniformes "flotando".
- ❌ Paleta índigo + slate frío genérica.
- ❌ Emojis como íconos.
- ❌ Layout "hero centrado con mucho aire vacío".

## 3. Paleta (punto de partida)

**Primario — naranja quemado / vial** (energía del rubro, seguridad vial, distintivo):
- `#E2671F` primario · `#C2551A` hover · `#FBEADF` tint (fondos suaves)
- _Alternativas si no te cierra el naranja:_ verde ruta `#2F7D4F` · petróleo/teal `#0F6E78`. Elegí UNO.

**Neutros cálidos** (no slate azulado):
- Fondo app `#FAF7F2` · Superficie/card `#FFFFFF` · Borde `#E7E1D8`
- Texto principal `#1C1A17` (casi negro cálido) · Texto secundario `#6B655C`

**Funcionales** (estados):
- Activo/OK `#2E7D52` · Peligro/desactivar/descartada `#C0392B` · Atención/«a recapar» `#D98A0B`

**Estados del ciclo de cubierta** (para el Resumen): asignar un color semántico fijo a cada estado y usarlo SIEMPRE igual (Nueva → verde, Recapados → escala de azul/ámbar, A recapar → naranja atención, Descartada → gris/rojo apagado).

## 4. Tipografía (con personalidad, NO Inter/Geist)

- **Títulos / UI**: `Space Grotesk` (geométrica con carácter) — da personalidad sin gritar.
- **Cuerpo / texto**: `IBM Plex Sans` (carácter técnico-industrial, muy legible, coherente con el rubro).
- **Números / datos** (KPIs, tablas, cifras): `IBM Plex Mono` — tabular, da el toque "tablero técnico" y alinea columnas.
- Jerarquía marcada por **peso y tamaño**, no por color.

## 5. Iconografía

- Set único y consistente: **Lucide** (o Tabler) — lineales, mismo grosor de trazo. **Nada de emojis.**
- Íconos del dominio donde aporten: camión/flota (`truck`), ruta (`route`), neumático (un `disc`/`circle-dot` o un ícono custom de cubierta), medidor (`gauge`), mantenimiento (`wrench`), comprobante (`receipt`).
- Tamaño y grosor consistentes en toda la UI.

## 6. Superficies (esto resuelve lo que no te gustaba)

- **Radius**: consistente y moderado — `8px` en cards/contenedores, `6px` en inputs/botones. Pill SOLO en badges chicos. Nada de 2xl por defecto.
- **Bordes**: `1px` sólido `#E7E1D8`. La separación entre bloques se hace con **borde**, no con sombra.
- **Sombras**: solo en overlays reales (modales, dropdowns) y sutil. Las cards van con borde, **sin** sombra flotante.
- **Cards**: fondo superficie + borde 1px + radius 8px. Para destacar (ej. "señales de atención"): **fondo tint del color funcional + borde del mismo tono** — NUNCA el borde lateral de una arista.
- **Sin** gradientes de fondo. Color plano.

## 7. Densidad y layout

- Es un **panel operativo**: densidad media-alta, legible. Mejor compacto y claro que aireado y vacío.
- Sidebar de navegación (ya existe en el wireframe). Contenido en grilla clara y alineada.
- KPIs como fila de tarjetas con borde (sin sombras). Tablas densas pero respirables.

## 8. Aplicación a las pantallas del panel

- **Resumen**: KPIs con número en `IBM Plex Mono` grande; barras de estado del ciclo con los colores semánticos fijos; "señales de atención" con fondo tint + borde del tono (atención = ámbar, info = neutro).
- **Usuarios**: tabla densa; rol y estado como **badges** (pill chico) con color funcional; acción "Desactivar" en rojo funcional, "Activar" neutro.
- **Empresa**: formularios con inputs de borde 1px, radius 6px; secciones separadas por borde, no por card flotante.

## 9. Nota

Esta es la **identidad del producto**, no un tema del panel suelto: aplicarla también, de a poco, a la app operativa para que sean la misma familia. **No copiar Vela1** ni el look genérico de IA. Carácter propio, del rubro.
