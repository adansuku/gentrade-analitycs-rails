---
baseline_commit: 24721e40a8a196512f28dc09b8d5bca5839d8520
---
# Story 1.3: Meta Ads — Migrar datos de creatividades (fetchCreatives)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **usuario de GENTRADE analizando campañas de Meta Ads de un cliente**,
I want **que la integración traiga los datos de las creatividades/anuncios individuales (nombre, estado, título, cuerpo, thumbnail)**,
so that **pueda ver el detalle a nivel de anuncio igual que en el sistema Node.js original, no solo agregados de campaña**.

## Contexto de migración

Origen: `gentrade_analitycs/src/backend/src/services/connectors/metaAds.js` (301 líneas).
Destino: `gentrade-rails/backend/app/services/integrations/meta_ads_sync.rb` (204 líneas).

Paridad ~80% (ver `migration-gap-verification-investigation.md#Finding 9`). El destino cubre campañas + metadata + summary (e incluso añade `leads_campaign?`); **falta `fetchCreatives`**.

## Acceptance Criteria

1. **Fetch de creatividades.** Dado un integration Meta Ads activo, cuando se ejecuta el sync, entonces se consultan los anuncios del ad account vía Graph API endpoint `{adAccountId}/ads` con `fields=name,status,creative{title,body,thumbnail_url,effective_object_story_id}` y `limit=25`.
2. **Estructura de salida.** Cada anuncio se mapea a `{ id, name, status, title, body, thumbnail_url }` (title/body/thumbnail vienen de `creative{}`, con `nil` si faltan).
3. **Persistencia.** Las creatividades se persisten en `IntegrationDatum` con `category: "creatives"`, siguiendo el patrón de `save_integration_data:169`.
4. **Normalización de ad account.** Reutiliza `normalized_ad_account_id:44` (prefijo `act_`) ya existente en el servicio.
5. **Sin regresión.** Campañas, metadata, period summary, métricas y `leads_campaign?` siguen funcionando.
6. **Tests.** Specs que stubben la llamada Graph API a `ads` y validen el mapeo de AC #2.

## Tasks / Subtasks

- [x] **Task 1: `fetch_creatives` (AC: #1, #2, #4)**
  - [x] Implementado con Koala `graph.get_connections(ad_account_id, 'ads', fields: 'name,status,creative{title,body,thumbnail_url,effective_object_story_id}', limit: 25)`. Reusa `normalized_ad_account_id`.
  - [x] Mapeo a `{ "id", "name", "status", "title", "body", "thumbnail_url" }` (nil si falta `creative`). `rescue → []` ante `APIError`.
- [x] **Task 2: Persistencia + integración en `call` (AC: #3, #5)**
  - [x] `save_creatives` persiste en `IntegrationDatum` (`category: "creatives"`). Integrado en `call`; campañas/metadata/summary intactos.
- [x] **Task 3: Tests (AC: #6)**
  - [x] `meta_ads_sync_spec.rb`: 3 ejemplos nuevos (mapeo, nil sin creative, error→[]) + stub `'ads'` añadido al contexto de `#call`. 15 examples, 0 failures.

## Dev Notes

### Estado actual del archivo destino (LEER antes de tocar)

`backend/app/services/integrations/meta_ads_sync.rb`:
- Usa `Koala::Facebook::API` (ver spec `meta_ads_sync_spec.rb`, stubea `get_connections(anything, 'insights'/'campaigns', anything)`). `fetch_creatives` añadiría una rama `'ads'`.
- `normalized_ad_account_id:44` ya gestiona el prefijo `act_`.
- `fetch_campaigns_for_range:51`, `fetch_campaign_metadata:96`, `build_period_summary:112`, `save_metrics_from_campaigns:145`, `save_integration_data:169`.
- Guards `provider_meta?` (enum prefix `provider_`).

### Comportamiento del origen a replicar

- `fetchCreatives` (`metaAds.js:98-114`): endpoint `/{adAccountId}/ads`, fields `name,status,creative{title,body,thumbnail_url,effective_object_story_id}`, limit 25. Salida `{ id, name, status, title, body, thumbnailUrl }` (en Ruby usar snake_case `thumbnail_url`).

### Project Structure Notes

- Servicio destino: `backend/app/services/integrations/meta_ads_sync.rb` (UPDATE).
- Persistencia: `IntegrationDatum`.

### References

- [Source: gentrade_analitycs/src/backend/src/services/connectors/metaAds.js:98-114] fetchCreatives
- [Source: backend/app/services/integrations/meta_ads_sync.rb:51-189] métodos existentes / patrón de persistencia
- [Source: backend/spec/services/integrations/meta_ads_sync_spec.rb] patrón de stub de Koala
- [Source: _bmad-output/implementation-artifacts/investigations/migration-gap-verification-investigation.md#Finding 9]

## Dev Agent Record

### Agent Model Used

Amelia (claude-opus-4-8) vía bmad-dev-story

### Debug Log References

- Entorno tests: `docker exec gentrade-backend bundle exec rspec`.
- Migración pendiente externa `20260614100000_add_title_to_materials.rb` (no de esta historia) bloqueaba los tests; aplicada con `db:migrate` + `db:test:prepare` para desbloquear.
- Los tests existentes de `#call` requirieron un stub adicional `get_connections(..., 'ads', ...)` porque `call` ahora también busca creativos.

### Completion Notes List

- `fetch_creatives` portado del origen (`metaAds.js:98-114`): endpoint `/ads`, fields/limit exactos, mapeo con nil para campos ausentes.
- `save_creatives` persiste en `IntegrationDatum` (`creatives`); integrado en `call` (añade `creatives_count` al resultado).
- **Tests:** 3 nuevos, 15/15 en el spec de Meta. Integraciones completas: 78 examples, 0 failures.
- **Side note:** se aplicó la migración `add_title_to_materials` (ajena a esta historia) para poder correr la suite; regenera `db/schema.rb`.

### File List

- `backend/app/services/integrations/meta_ads_sync.rb` (fetch_creatives + save_creatives + integración en call)
- `backend/spec/services/integrations/meta_ads_sync_spec.rb` (3 ejemplos nuevos + stub 'ads')
- `backend/db/schema.rb` (regenerado por migración externa add_title_to_materials)

### Change Log

- 2026-06-14: Añadido fetch de creatividades (anuncios) a Meta Ads sync. Story 1.3.
