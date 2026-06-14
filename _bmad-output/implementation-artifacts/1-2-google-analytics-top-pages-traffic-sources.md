---
baseline_commit: 24721e40a8a196512f28dc09b8d5bca5839d8520
---
# Story 1.2: Google Analytics — Migrar Top Pages y Traffic Sources

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **usuario de GENTRADE analizando el rendimiento web de un cliente**,
I want **que la integración de Google Analytics traiga las páginas más visitadas (Top Pages) y las fuentes de tráfico (Traffic Sources)**,
so that **tenga la misma visibilidad de comportamiento web que daba el sistema Node.js original**.

## Contexto de migración

Origen: `gentrade_analitycs/src/backend/src/services/connectors/googleAnalytics.js` (387 líneas).
Destino: `gentrade-rails/backend/app/services/integrations/google_analytics_sync.rb` (236 líneas).

Paridad ~70% (ver `migration-gap-verification-investigation.md#Finding 7`). El destino ya cubre métricas core, channel breakdown y ecommerce events; **faltan Top Pages y Traffic Sources**.

## Acceptance Criteria

1. **Top Pages.** Dado un integration GA activo, cuando se ejecuta el sync (o un método dedicado), entonces se obtienen las N (default 10) páginas con más vistas: dimensión `pagePath`, métricas `screenPageViews`, `totalUsers`, `averageSessionDuration`, ordenadas por `screenPageViews` desc. Resultado: `[{ page, views, users, avg_duration }]`.
2. **Traffic Sources.** Se obtienen las N (default 10) fuentes de tráfico: dimensiones `sessionSource` + `sessionMedium`, métricas `sessions` + `totalUsers`, ordenadas por `sessions` desc. Resultado: `[{ source, medium, sessions, users }]`.
3. **Persistencia.** Ambos datasets se persisten en `IntegrationDatum` (categorías `top_pages` y `traffic_sources`) y/o se incluyen en el summary, siguiendo el patrón de `fetch_channel_breakdown`/`fetch_ecommerce_events` ya existentes.
4. **Rango de fechas.** Usa el mismo `start_date`/`end_date` que `call` (default 7 días) o `30daysAgo→today` como el origen — decisión documentada; consistente con los demás fetchers del servicio.
5. **Sin regresión.** Métricas core, channel breakdown y ecommerce events siguen funcionando.
6. **Tests.** Specs que stubben `run_property_report` y validen el parseo de filas a la estructura de salida de AC #1 y #2.

## Tasks / Subtasks

- [x] **Task 1: `fetch_top_pages` (AC: #1, #4)**
  - [x] Implementado con `run_property_report`. Dimensión `pagePath`; métricas `screenPageViews`, `totalUsers`, `averageSessionDuration`; order desc; limit 10.
  - [x] Parseo → `{ "page", "views", "users", "avg_duration" }`. Devuelve `[]` sin property_id; rescata errores.
- [x] **Task 2: `fetch_traffic_sources` (AC: #2, #4)**
  - [x] Dimensiones `sessionSource` + `sessionMedium`; métricas `sessions` + `totalUsers`; order desc; limit 10.
  - [x] Parseo → `{ "source", "medium", "sessions", "users" }`.
- [x] **Task 3: Persistencia + integración en `call` (AC: #3, #5)**
  - [x] `save_breakdown_data` persiste en `IntegrationDatum` (`top_pages`, `traffic_sources`, `period: "current"`). Integrado en `call` tras `save_metrics`, sin romper fetchers existentes.
- [x] **Task 4: Tests (AC: #6)**
  - [x] `google_analytics_sync_spec.rb` extendido: 4 ejemplos nuevos (parseo de cada fetcher + caso sin property_id). 14 examples, 0 failures.

## Dev Notes

### Estado actual del archivo destino (LEER antes de tocar)

`backend/app/services/integrations/google_analytics_sync.rb`:
- Cliente GA: método `analytics_service:134` y `fetch_analytics_data:140` ya usan `service.run_property_report("properties/#{property_id}", request)` (argumento posicional — ver fix reciente).
- Ya existen `fetch_channel_breakdown:43` (dim `sessionDefaultChannelGroup`) y `fetch_ecommerce_events:85` — **úsalos como plantilla exacta** para construir requests y parsear respuestas.
- `transform_analytics_response:166`, `save_metrics:185`.
- `property_id` viene de `integration.metadata`.

### Comportamiento del origen a replicar

- `fetchTopPages` (`googleAnalytics.js:140-165`) y `fetchTrafficSources` (`googleAnalytics.js:170-191`). Ver dimensiones/métricas exactas en AC.
- Origen usa rango fijo `30daysAgo→today`; el destino trabaja con `start_date`/`end_date`. Mantener consistencia con los demás fetchers del servicio.

### Project Structure Notes

- Servicio destino: `backend/app/services/integrations/google_analytics_sync.rb` (UPDATE).
- Persistencia: `IntegrationDatum`.

### References

- [Source: gentrade_analitycs/src/backend/src/services/connectors/googleAnalytics.js:140-165] fetchTopPages
- [Source: gentrade_analitycs/src/backend/src/services/connectors/googleAnalytics.js:170-191] fetchTrafficSources
- [Source: backend/app/services/integrations/google_analytics_sync.rb:43-133] fetchers existentes como plantilla
- [Source: _bmad-output/implementation-artifacts/investigations/migration-gap-verification-investigation.md#Finding 7]

## Dev Agent Record

### Agent Model Used

Amelia (claude-opus-4-8) vía bmad-dev-story

### Debug Log References

- Entorno tests: `docker exec gentrade-backend bundle exec rspec`. Mensajes `PG::ConnectionBad` durante load_schema = ruido del rake task, tests OK.
- El linter revirtió `google_analytics_sync.rb` una vez durante la edición; re-aplicado.

### Completion Notes List

- Añadidos `fetch_top_pages` y `fetch_traffic_sources` siguiendo la plantilla de `fetch_channel_breakdown` (mismo cliente `run_property_report`, manejo de errores con `rescue → []`).
- `save_breakdown_data` persiste ambos en `IntegrationDatum` (`top_pages`, `traffic_sources`); integrado en `call` sin alterar el flujo de métricas existente.
- **Tests:** 4 nuevos, 14/14 en el spec de GA. Integraciones completas: 75 examples, 0 failures (sin regresión).

### File List

- `backend/app/services/integrations/google_analytics_sync.rb` (añadidos 2 fetchers + save_breakdown_data + integración en call)
- `backend/spec/services/integrations/google_analytics_sync_spec.rb` (4 ejemplos nuevos)

### Change Log

- 2026-06-14: Añadidos Top Pages y Traffic Sources a Google Analytics sync. Story 1.2.
