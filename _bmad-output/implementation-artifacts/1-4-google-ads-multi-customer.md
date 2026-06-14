---
baseline_commit: 24721e40a8a196512f28dc09b8d5bca5839d8520
---
# Story 1.4: Google Ads — Soporte de múltiples customer accounts

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **usuario de GENTRADE que gestiona clientes con varias cuentas de Google Ads (o cuentas MCC/manager)**,
I want **que la integración pueda descubrir y sincronizar todas las cuentas accesibles, no solo un único customer_id fijo**,
so that **no pierda datos de cuentas adicionales como pasaba implícitamente en la migración respecto al sistema Node.js original**.

## Contexto de migración

Origen: `gentrade_analitycs/src/backend/src/services/connectors/googleAds.js` (245 líneas).
Destino: `gentrade-rails/backend/app/services/integrations/google_ads_sync.rb` (174 líneas).

Paridad ~85% (ver `migration-gap-verification-investigation.md#Finding 8`). El destino sincroniza un único `customer_id` desde `metadata`; el origen tiene `listAccessibleCustomers` para descubrir todas las cuentas accesibles.

**Nota:** Esta historia empieza por una **fase de verificación** — confirmar si el flujo actual de un solo customer es suficiente para el uso real, o si hace falta multi-customer. El alcance final depende de ese hallazgo.

## Acceptance Criteria

1. **Verificación documentada.** Se determina y documenta en Dev Notes si los clientes reales usan una sola cuenta Google Ads o varias / cuentas manager (MCC). Si una sola cuenta basta, la historia se cierra como "verificado, sin cambios" y se anota la justificación.
2. **(Si se requiere multi-customer) Descubrimiento de cuentas.** Se implementa un equivalente a `listAccessibleCustomers`: usando `listAccessibleCustomers` del cliente Google Ads Ruby, devolver `[{ id, name, currency_code, manager }]` (nombre vía query `SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.manager FROM customer LIMIT 1`), con fallback a `{ id, name: id }` si la query individual falla.
3. **(Si se requiere multi-customer) Sync por cuenta.** `call` itera sobre las cuentas accesibles (o una lista configurada en `metadata`) y guarda métricas por cuenta, sin colisión (las métricas deben distinguir el customer de origen).
4. **Sin regresión.** El flujo actual de un solo `customer_id` desde `metadata` sigue funcionando idéntico cuando solo hay una cuenta. Métricas (`fetch_ads_data`, `save_metrics`) y manejo de errores (`handle_google_ads_error`) intactos.
5. **Tests.** Si se implementa multi-customer: specs que stubben `listAccessibleCustomers` y el sync por cuenta. Si se cierra como verificado: documentar la decisión (no se requieren tests nuevos).

## Tasks / Subtasks

- [x] **Task 1: Verificar necesidad real de multi-customer (AC: #1) — RESUELTA**
  - [x] **Hallazgo:** en el ORIGEN, `listAccessibleCustomers` NO se usa en `syncData` — el sync opera sobre un solo `customerId` (`googleAds.js:67-69`). Solo se usa en la ruta de configuración (`routes/integrations.js:140-142`) como **selector de cuenta al conectar**. El destino ya sincroniza un `customer_id` por integración = paridad de sync.
  - [x] **Decisión (Adan):** "debería funcionar como en el repo anterior" → el sync de un solo customer ya es correcto; **añadir el endpoint selector `list_accessible_customers`** para elegir cuenta al configurar (opción 2). NO sync multi-cuenta.
- [x] **Task 2: `list_accessible_customers` en el servicio (AC: #2)**
  - [x] Implementado con `Google::Ads::GoogleAds::GoogleAdsClient`: lista cuentas accesibles, normaliza `customers/123` → `123`, obtiene `descriptive_name`/`currency_code`/`manager` por cuenta (fallback `{ id, name: id }`). Referencia: `googleAds.js:32-62`.
- [x] **Task 3: Endpoint de configuración (AC: #2)**
  - [x] `GET integrations/google/ads_accounts` → `integrations#google_ads_accounts`, devuelve `{ accounts: [...] }`; ante error devuelve `{ accounts: [], error:, manual: true }` (paridad con `routes/integrations.js:142-147`).
- [x] **Task 4: Sin regresión + Tests (AC: #4, #5)**
  - [x] El sync (`fetch_ads_data`/`save_metrics`/`call`) NO se modifica — sigue con un solo customer. Tests para `list_accessible_customers`.

## Dev Notes

### Estado actual del archivo destino (LEER antes de tocar)

`backend/app/services/integrations/google_ads_sync.rb`:
- `call:12` lee `customer_id` y `developer_token` de `integration.metadata`; inicializa `Google::Ads::GoogleAds::GoogleAdsClient` con `refresh_token`/`client_id`/`client_secret` (ENV) + `developer_token`.
- `fetch_ads_data:49` ejecuta GAQL `FROM campaign` filtrando por fechas y `status = 'ENABLED'`, `page_size: 10000`.
- `transform_ads_response:73`, `save_metrics:109`, `handle_google_ads_error:145`.
- Guard `provider_google?` (enum prefix `provider_`).

### Comportamiento del origen a replicar (si aplica)

- `listAccessibleCustomers` (`googleAds.js:32-62`): descubre todas las cuentas accesibles, normaliza `customers/123` → `123`, obtiene nombre/currency/manager por cuenta con fallback.
- `syncData` (`googleAds.js:67+`) sincroniza por `customerId` configurado; también computa MTD (month-to-date).

### Project Structure Notes

- Servicio destino: `backend/app/services/integrations/google_ads_sync.rb` (UPDATE).
- Esta es la historia de **menor prioridad** del epic (Google Ads ya está ~85% completo). Posible cierre rápido en Task 1.

### References

- [Source: gentrade_analitycs/src/backend/src/services/connectors/googleAds.js:32-62] listAccessibleCustomers
- [Source: gentrade_analitycs/src/backend/src/services/connectors/googleAds.js:67-84] syncData (single customer + MTD)
- [Source: backend/app/services/integrations/google_ads_sync.rb:12-71] call + fetch_ads_data actuales
- [Source: _bmad-output/implementation-artifacts/investigations/migration-gap-verification-investigation.md#Finding 8]

## Dev Agent Record

### Agent Model Used

Amelia (claude-opus-4-8) vía bmad-dev-story

### Debug Log References

- Entorno tests: `docker exec gentrade-backend bundle exec rspec`.
- Dos migraciones externas pendientes (ajenas a esta historia) bloqueaban la suite: `add_title_to_materials` (ya aplicada en 1.3) y `create_active_storage_tables`. Aplicadas con `db:migrate` + `db:test:prepare` para desbloquear.

### Completion Notes List

- **Verificación (Task 1):** el `listAccessibleCustomers` del origen NO sincroniza varias cuentas — es un selector de cuenta en la configuración (`routes/integrations.js:140`). El sync (origen y destino) opera sobre un solo `customer_id`. Decisión de Adan: "que funcione como el repo anterior" → mantener sync de 1 cuenta + añadir el selector.
- **`list_accessible_customers`** añadido al servicio (método público): lista cuentas accesibles, normaliza IDs, obtiene nombre/moneda/manager con fallback `{ id, name: id }`. Refactoricé la creación del cliente a `build_google_ads_client` (reutilizado por `call` y el nuevo método — sin cambiar el comportamiento del sync).
- **Endpoint** `GET integrations/:id/google/ads_accounts` → `integrations#google_ads_accounts`, devuelve `{ accounts }` o `{ accounts: [], error:, manual: true }` ante fallo (paridad con el origen).
- **Sin regresión en el sync:** `fetch_ads_data`/`save_metrics`/`call` intactos (sigue 1 customer).
- **Tests:** 3 nuevos en `google_ads_sync_spec.rb` (13/13). Integraciones completas: 81 examples, 0 failures.

### File List

- `backend/app/services/integrations/google_ads_sync.rb` (list_accessible_customers + helpers + refactor build_google_ads_client)
- `backend/app/controllers/api/v1/integrations_controller.rb` (acción google_ads_accounts)
- `backend/config/routes.rb` (ruta ads_accounts)
- `backend/spec/services/integrations/google_ads_sync_spec.rb` (3 ejemplos nuevos)
- `backend/db/schema.rb` (regenerado por migraciones externas add_title_to_materials + active_storage)

### Change Log

- 2026-06-14: Verificado que el sync de 1 customer es paridad con el origen; añadido selector `list_accessible_customers` + endpoint. Story 1.4.
