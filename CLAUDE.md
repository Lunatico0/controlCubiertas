# ControlCubiertas — Instrucciones del proyecto

## Git (IMPORTANTE)

- **Antes de cada commit y push, switchear a la cuenta de GitHub `Lunatico0`** (dueña de estos repos):
  ```bash
  gh auth switch --user Lunatico0
  ```
  La cuenta `Patricio-Vela1` NO tiene permiso de push sobre estos repos (da 403). Si tras el switch el push sigue fallando por credencial cacheada en Windows, correr `gh auth setup-git`.
- `backend/` y `frontend/` son **submódulos** con repos propios (`ControlCubiertas-Backend`, `ControlCubiertas-Frontend`). **Pushear el submódulo ANTES que el raíz** (sino el raíz referencia commits ausentes en el remoto del submódulo).
- `main` = **demo intocable** en los 3 repos. El trabajo va en ramas `feat/...` (rama de integración: `develop`).
- **Conventional commits**. Nunca `Co-Authored-By` ni atribución AI.

## Trabajo

- Patrón en loop por hito: hacer/codear → emprolijar → commitear → pushear → testear → siguiente hito.
- **TDD estricto**: test primero (RED → GREEN). Correr SOLO los tests del hito, nunca el suite completo: `tire.test.js` se conecta a Atlas real.
- Roadmap de evolución a SaaS multi-tenant en `.saas-roadmap/` (gitignoreada).
