# Memory (Repo-Specific)

## Collaboration / Safety
- No descartar cambios de otros agentes: evitar `git restore`, `git checkout --`, `reset --hard` salvo instruccion explicita del usuario.
- No hacer commits a menos que el usuario lo pida explicitamente.

## Frontend: Non-Obvious Gotchas
- `API_BASE` es `''` (same-origin). En dev, Vite proxyea `/api` y `/uploads` a `process.env.BACKEND_URL` o `http://localhost:3001`.
- En Nginx (contenedor), `/api/` → `http://backend:3001/` y `/uploads/` → `http://backend:3001/uploads/`.
- Cualquier `401` redirige a `VITE_ADMIN_PATH` (default `/gentrade-panel-engine`) en `src/lib/api.js`.

## Proposal Generation (SSE)
- La generacion de propuestas puede venir como `text/event-stream`.
- Si el UI se queda en “Generando…” y no navega, revisar el shape SSE (`event:` vs `data.type/event`) en `src/hooks/useProposalFlow.js`.

## UX / Design
- UI en espanol. Acento indigo `#4f46e5`.
- Bordes primero; sombras solo para modales/dropdowns (`.interface-design/system.md`).

## Git Hygiene
- No commitear `.env`.
- No commitear assets grandes (p.ej. `public/demo-video.mp4`) salvo peticion explicita.
- `dist/` es output de build.

## Specs
- Specs en `specs/<kebab-case>/` con `SPEC.md`, `PLAN.md`, `TASKS.md`.
- Usar checkboxes en `TASKS.md`.
