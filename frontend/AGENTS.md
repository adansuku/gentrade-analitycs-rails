# Agent Notes (Frontend)

## What This Repo Is
- This directory (`src/frontend`) is a React 19 + Vite app.
- Entry point: `src/main.jsx` (BrowserRouter) → `src/App.jsx` (routes).

## Run / Build
- Install: `npm ci`
- Dev server: `npm run dev` (Vite on `http://localhost:5173`)
- Build: `npm run build`
- Lint: `npm run lint`
- Preview build: `npm run preview`

## Backend Connectivity (Critical)
- In dev, Vite proxies `GET/POST /api/*` and `/uploads/*` to `process.env.BACKEND_URL` or `http://localhost:3001` (see `vite.config.js`).
- In the containerized Nginx setup, `/api/` proxies to `http://backend:3001/` and `/uploads/` to `http://backend:3001/uploads/` (see `nginx.conf`).
- `API_BASE` in the frontend is intentionally `''` (same-origin). If API calls fail locally, check the proxy target first.

## Auth / Admin Route
- Auth token is stored in `sessionStorage` under `auth_token` (`src/hooks/useAuth`).
- Any `401` triggers a redirect to `import.meta.env.VITE_ADMIN_PATH` (default `/gentrade-panel-engine`) in `src/lib/api.js`.

## Proposal Generation (SSE)
- Proposal generation hits `POST /api/clients/:id/proposals/generate` and may return `text/event-stream`.
- SSE parsing lives in `src/hooks/useProposalFlow.js`. If the UI gets stuck at “Generando…” or never navigates, inspect the Network response for SSE event shape (`event:` vs `data.type/event`).

## UI / Design System
- All UI is in Spanish; primary accent is indigo `#4f46e5`.
- Design rules for spacing/borders/radius live in `.interface-design/system.md` (borders-first; shadows mainly for modals/dropdowns).

## Git Hygiene (Avoid Common Mistakes)
- Don’t commit secrets: `.env` must stay untracked.
- Large assets (example: `public/demo-video.mp4`) should not be committed unless explicitly requested.
- `dist/` is build output and ignored by `.gitignore`.

## Specs / Memory
- Product/engineering specs live under `specs/` (index in `specs/README.md`).
- Repo-specific “memory” lives in `context/MEMORY.md` (gotchas + collaboration constraints); keep it concise and append-only.

## Spec Workflow
- Create a new spec folder with templates via `node scripts/new-spec.mjs "Titulo"` (creates `specs/<kebab>/SPEC.md`, `PLAN.md`, `TASKS.md` and updates `specs/README.md`).
