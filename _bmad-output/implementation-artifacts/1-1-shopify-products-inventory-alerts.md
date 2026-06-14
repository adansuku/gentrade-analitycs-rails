---
baseline_commit: 24721e40a8a196512f28dc09b8d5bca5839d8520
---
# Story 1.1: Shopify — Migrar productos/inventario y sistema de alertas

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **usuario de GENTRADE que gestiona clientes con tienda Shopify**,
I want **que la integración Shopify sincronice productos con inventario y genere alertas de stock (bajo stock, baja cobertura, productos desaparecidos)**,
so that **pueda detectar problemas de inventario y oportunidades igual que en el sistema Node.js original, sin perder esa funcionalidad de negocio en la migración**.

## Contexto de migración

Origen funcional: `gentrade_analitycs/src/backend/src/services/connectors/shopify.js` (639 líneas, **GraphQL Admin API**).
Destino actual: `gentrade-rails/backend/app/services/integrations/shopify_sync.rb` (184 líneas, **REST API**, solo pedidos).

Paridad actual ~30% (ver `_bmad-output/implementation-artifacts/investigations/migration-gap-verification-investigation.md#Finding 10`). El destino solo trae pedidos y breakdown de ventas; **faltan productos, inventario y todo el sistema de alertas**.

## Acceptance Criteria

1. **Productos + inventario.** Dado un integration Shopify activo, cuando se ejecuta el sync, entonces se obtienen los productos con sus variantes (id, title, price, sku, stock=`inventoryQuantity`) y se persisten en `IntegrationDatum` con `category: "products"`.
2. **Pedidos con line items.** El sync obtiene pedidos recientes incluyendo line items (sku, variant_id, quantity) y los persiste con `category: "orders"`. El cálculo de ventas netas usa `net = max(0, subtotal − refunds)` y solo cuenta pedidos `PAID`/`PARTIALLY_PAID` para revenue mensual (paridad con `shopify.js:185-187`).
3. **Alerta de bajo stock.** Para cada variante con `stock <= lowStockThreshold` (default 10), se genera una alerta `type: "low_stock"`, `severity: "critical"` si `stock <= 5` si no `"warning"`, con `id = "{productId}-{variantId}-low_stock"`.
4. **Alerta de baja cobertura.** Calculando velocidad de ventas por SKU (o variantId) en `velocityWindowDays` (default 30) sobre pedidos PAID, si `daysOfCoverage = stock / (velocity / velocityWindowDays) <= coverageDays` (default 7), se genera alerta `type: "low_coverage"`, `severity: "critical"` si `<= 3` días si no `"warning"`.
5. **Persistencia de estado de alertas.** El estado (`status`, `notes`) de alertas existentes se conserva entre syncs (merge por id estable). Las alertas que desaparecen se cuentan; tras estar ausentes 2 syncs consecutivos se mueven a `alerts_archive` (máx. 50). Categorías usadas: `alerts`, `alerts_missing`, `alerts_archive`.
6. **Config de alertas por integración.** El sync lee `lowStockThreshold`, `coverageDays`, `velocityWindowDays` desde `integration.metadata` (o config equivalente); si no hay config de alertas, no genera alertas (paridad con `shopify.js:309-311`).
7. **Decisión REST vs GraphQL documentada.** Antes de implementar, se decide y documenta en Dev Notes si se migra a GraphQL Admin API (como el origen) o se mantiene REST. El inventario (`inventoryQuantity`) y `totalRefundedSet` requieren campos que el REST actual no consulta — la decisión debe justificar cómo se obtienen.
8. **Sin regresión.** Los pedidos y métricas que el sync actual ya guarda (`revenue`, `orders`, `aov` en `Metric`; `period_summary`/`summary` en `IntegrationDatum`) siguen funcionando.
9. **Tests.** Specs que cubran: parseo de productos/variantes, generación de cada tipo de alerta (low_stock crítico/warning, low_coverage), merge/archivado de estado de alertas, y cálculo de ventas netas con refunds.

## Tasks / Subtasks

- [x] **Task 1: Decisión arquitectónica API — RESUELTA (AC: #7)**
  - [x] **DECISIÓN (Adan, 2026-06-14): migrar a GraphQL Admin API**, paridad con el origen. Inventario (`inventoryQuantity`) y `totalRefundedSet` en queries GraphQL. Motivo: el REST de Shopify se está deprecando para apps nuevas y el origen ya usaba GraphQL `2026-04`.
  - [x] **Implicación para el dev:** NO hay gem GraphQL dedicada en el Gemfile. Construir el cliente GraphQL con `HTTParty`/`http` (ya presentes): `POST https://{store}/admin/api/{version}/graphql.json` con header `X-Shopify-Access-Token`, body `{ query:, variables: }`. Usar `api_version` desde `metadata` con default actualizado a `"2026-04"` (no `"2024-01"`).
  - [x] **Migrar también `fetch_orders` a GraphQL** para obtener `totalRefundedSet` y line items (el REST actual con `fields:` no los trae). Reemplaza la paginación por `Link` header con `pageInfo.hasNextPage` de GraphQL.
- [x] **Task 2: Fetch de productos + inventario (AC: #1)**
  - [x] `fetch_products` con GraphQL devuelve `[{ id, name, status, category, price, stock, variants: [...] }]`. IDs limpiados de `gid://`, stock = suma de inventario de variantes.
  - [x] Persistido en `IntegrationDatum` (`category: "products"`, `period: "current"`).
- [x] **Task 3: Pedidos con line items (AC: #2)**
  - [x] `fetch_orders` con GraphQL incluye line items (sku, variant_id, quantity), `totalRefundedSet` y filtro por rango de fechas (`created_at:>=..<=`).
  - [x] Net sales por pedido = `max(0, subtotal − refunds)`; `calculate_sales_breakdown` agrega net/gross/returns.
- [x] **Task 4: Generación de alertas (AC: #3, #4, #6)**
  - [x] `generate_alerts(products, orders, config)` portado: low_stock (critical si ≤5), low_coverage (critical si ≤3 días). IDs estables `{product}-{variant}-{type}`.
  - [x] Config desde `integration.metadata` con defaults `{ low_stock_threshold: 10, coverage_days: 7, velocity_window_days: 30 }`. Sin config → no genera (`alerts_enabled?`).
- [x] **Task 5: Persistencia/merge/archivado de alertas (AC: #5)**
  - [x] `merge_alert_state` conserva status/notes; `process_alerts` cuenta ausencias y archiva tras 2 syncs (máx 50).
  - [x] Categorías `alerts`, `alerts_missing`, `alerts_archive` en `IntegrationDatum`.
- [x] **Task 6: Integrar en `call` sin regresión (AC: #8)**
  - [x] `call` orquesta products + orders + metrics + summaries + alerts. Métricas `revenue`/`orders`/`aov` y `period_summary`/`summary` preservadas.
- [x] **Task 7: Tests (AC: #9)**
  - [x] `spec/services/integrations/shopify_sync_spec.rb` creado: 11 ejemplos (productos, net sales, cada tipo de alerta, merge de estado, `call` end-to-end). Todos en verde.

## Dev Notes

### Estado actual del archivo destino (LEER antes de tocar)

`backend/app/services/integrations/shopify_sync.rb`:
- Usa la gem `HTTP` (`shopify_client`, línea 31-36) con header `X-Shopify-Access-Token`.
- REST: `GET {base}/orders.json` con `fields:` y paginación por `Link` header (`page_info`). Líneas 66-102.
- `api_version` default `"2024-01"` desde `integration.metadata["api_version"]` (origen usa `2026-04`).
- Persiste métricas en `Metric` (`revenue`, `orders`, `aov`) y en `IntegrationDatum` (`period_summary`, `summary`). Líneas 132-167.
- `store_domain` viene de `integration.metadata["store_domain"]`.
- Guards: `@integration.active?`, `expired?`, `provider_shopify?` (enum con prefix `provider_`).

### Comportamiento del origen a replicar

- **GraphQL** Admin API `2026-04`, helper `shopifyAuth.graphqlRequest(shop, accessToken, query, vars)`.
- Productos: IDs limpiados de prefijo `gid://shopify/Product/`. Stock total = suma de `inventoryQuantity` de variantes.
- Net sales por pedido = `max(0, currentSubtotalPriceSet − totalRefundedSet)`.
- `generateAlerts`: ver fórmulas exactas en AC #3 y #4. Mensajes en español (`"Stock bajo: ..."`, `"Stock cubre N dias ..."`).
- Estado de alertas: id estable = `a.id || "{productId}-{variantId}-{type}"`; merge conserva `status`/`notes`/`updatedAt`/`updatedBy`; contador `missingCount`, archivado a las 2 ausencias, archive recortado a 50 (orden desc por `archivedAt`).

### Project Structure Notes

- Servicio destino: `backend/app/services/integrations/shopify_sync.rb` (UPDATE).
- Modelo de persistencia: `IntegrationDatum` (`integration_id`, `category`, `data` jsonb, `period`, `fetched_at`). Ya existe.
- Patrón de otros syncs (`google_analytics_sync.rb`, `meta_ads_sync.rb`) para `save_metrics`/`save_integration_data` y `success_result`/`error_result`.

### References

- [Source: gentrade_analitycs/src/backend/src/services/connectors/shopify.js:17-66] fetchProducts
- [Source: gentrade_analitycs/src/backend/src/services/connectors/shopify.js:71-170] fetchOrders + line items + net sales
- [Source: gentrade_analitycs/src/backend/src/services/connectors/shopify.js:205-284] generateAlerts
- [Source: gentrade_analitycs/src/backend/src/services/connectors/shopify.js:289-399] syncData (merge/archivado de alertas)
- [Source: backend/app/services/integrations/shopify_sync.rb] estado actual destino
- [Source: _bmad-output/implementation-artifacts/investigations/migration-gap-verification-investigation.md#Finding 10]

## Dev Agent Record

### Agent Model Used

Amelia (claude-opus-4-8) vía bmad-dev-story

### Debug Log References

- Entorno de tests: `docker exec gentrade-backend bundle exec rspec`.
- Los mensajes `PG::ConnectionBad` durante `db:test:load_schema` son ruido del rake task (intenta localhost antes de usar DATABASE_URL); los tests corren correctamente.

### Completion Notes List

- **Migración a GraphQL Admin API** completada (default `api_version "2026-04"`). Cliente GraphQL construido con `HTTParty.post` a `/admin/api/{version}/graphql.json` (sin gem dedicada).
- `fetch_products`: productos + variantes con `inventoryQuantity`. `fetch_orders`: refunds (`totalRefundedSet`) + line items, net sales por pedido.
- Sistema de alertas portado 1:1 del origen: low_stock, low_coverage, merge de estado persistente, archivado tras 2 ausencias (máx 50).
- **Sin regresión:** métricas `revenue`/`orders`/`aov` y summaries (`period_summary`/`summary`) preservados.
- **11 tests nuevos, 100% en verde.** Suite de integraciones completa: 71 examples, 0 failures.
- **Nota de fallos preexistentes:** la suite global tiene 24 fallos en `clients_spec`, `integrations_controller_spec`, `metrics_controller_spec`, `client_spec` — verificado con `git stash` que existen igual en el baseline (commit `24721e4`), NO son regresiones de esta historia.

### File List

- `backend/app/services/integrations/shopify_sync.rb` (reescrito: REST → GraphQL + productos/inventario + alertas)
- `backend/spec/services/integrations/shopify_sync_spec.rb` (nuevo)

### Change Log

- 2026-06-14: Migración Shopify a GraphQL Admin API; añadidos productos/inventario y sistema de alertas (low_stock, low_coverage, archivado). Story 1.1.
