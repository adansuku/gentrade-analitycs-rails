---
title: 'Unificar Docker Multistage (Dev + Prod)'
type: 'refactor'
created: '2026-06-13'
status: 'done'
route: 'one-shot'
---

## Intent

**Problem:** El proyecto tiene dos Dockerfiles divergentes (`Dockerfile` para producción, `Dockerfile.dev` para desarrollo) y dos archivos `docker-compose.yml` (raíz + backend/), lo que duplica lógica, aumenta mantenimiento y en desarrollo se copia código con COPY impidiendo ver cambios al instante.

**Approach:** Unificar en un solo `Dockerfile` multistage con targets `development` (sin COPY del código fuente — usa volume mount para hot-reload) y `production` (COPY completo + precompilación), con un único `docker-compose.yml` en la raíz.

## Suggested Review Order

1. `backend/Dockerfile` — Archivo principal: estructura multistage completa (6 stages)
2. `docker-compose.yml` — Servicio backend actualizado con `target: development`
3. `backend/Dockerfile.dev` — (eliminado) Reemplazado por stage `development` en el Dockerfile unificado
4. `backend/docker-compose.yml` — (eliminado) Consolidado en el docker-compose.yml raíz

## Code Map

- `backend/Dockerfile` — Dockerfile multistage unificado: base → build-deps → gems → development → gems-prod → build → production
- `docker-compose.yml` — Servicio backend con `target: development`, volumenes para hot-reload, comando optimizado con `bundle check`
- `backend/Dockerfile.dev` — Eliminado (redundante)
- `backend/docker-compose.yml` — Eliminado (redundante)

## Tasks & Acceptance

**Execution:**
- [x] `backend/Dockerfile` — Escribir Dockerfile multistage unificado con 6 stages (base, build-deps, gems, development, gems-prod, build, production)
- [x] `docker-compose.yml` — Actualizar servicio backend para usar `target: development` y comando con `bundle check`
- [x] `backend/Dockerfile.dev` — Eliminar (redundante con stage development)
- [x] `backend/docker-compose.yml` — Eliminar (redundante con raíz)

**Acceptance Criteria:**
- Given `docker compose up`, when se monta `./backend:/app` en el contenedor development, entonces los cambios en el código host se reflejan instantáneamente en el navegador sin rebuild
- Given `docker build --target production -t gentrade .`, cuando se construye la imagen, entonces el binario resultante contiene solo gems de producción y el código compilado, sin herramientas de build
- Given `docker compose up backend`, cuando el contenedor arranca, entonces `bundle check` verifica gems antes de decidir si ejecutar `bundle install`
- Given los archivos duplicados eliminados, cuando se ejecuta `docker compose up` desde la raíz, entonces todos los servicios (postgres, redis, qdrant, backend) funcionan con el único docker-compose.yml

## Spec Change Log

## Design Notes

**Stage layout:**

- `base` — runtime deps (curl, libjemalloc2, libvips, postgresql-client) — único stage que llega a producción
- `build-deps` — build tools (build-essential, git, libpq-dev, libyaml-dev, pkg-config) — NO llega a producción
- `gems` — FROM build-deps, install ALL gems, bootsnap precompile — base para development
- `development` — FROM gems, EXPOSE 3002, sin CMD (se define en compose) — NO COPY app code
- `gems-prod` — FROM build-deps, BUNDLE_WITHOUT="development test", solo gems de producción
- `build` — FROM gems-prod, COPY app code, bootsnap + assets precompile
- `production` — FROM base, COPY gems+app desde build, non-root user, thruster

**Review findings applied:**
1. Split `base` → `base` + `build-deps` para imagen final más pequeña (finding #4)
2. Added `SECRET_KEY_BASE_DUMMY=1 rails assets:precompile` en stage build (finding #1)

## Verification

**Commands:**
- `docker compose build backend` — debe construir el stage development exitosamente
- `docker compose up` — debe arrancar todos los servicios y Rails debe responder en :3002
- `docker build --target production -t gentrade_test .` desde backend/ — debe construir imagen producción
