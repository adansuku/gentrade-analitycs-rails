# Investigation: Verificación del gap de migración gentrade_analitycs → gentrade-rails

## Hand-off Brief

1. **What happened.** El repo antiguo `gentrade_analitycs` (Node.js/Express/Prisma/Qdrant, funcional) se está migrando a `gentrade-rails` (Rails 8 + PostgreSQL); un `MIGRATION_ANALYSIS.md` (2026-06-13) afirma que Rails cubre ~30% de la funcionalidad. *(Hypothesized — pendiente de verificación independiente.)*
2. **Where the case stands.** Caso recién abierto. Stronghold confirmado: `MIGRATION_ANALYSIS.md` documenta el plan. Falta verificar de forma independiente el estado REAL de ambos repos (modelos, servicios, integraciones, endpoints) y calcular el delta actualizado.
3. **What's needed next.** Mapear el perímetro de evidencia (Outcome 2): inventario paralelo de modelos/migraciones, servicios, integraciones y rutas en ambos repos.

## Case Info

| Field            | Value                                                                      |
| ---------------- | -------------------------------------------------------------------------- |
| Ticket           | N/A                                                                        |
| Date opened      | 2026-06-14                                                                 |
| Status           | Active                                                                     |
| System           | macOS (Darwin 23.3.0); origen Node.js+Prisma+Qdrant; destino Rails 8.0 + PostgreSQL |
| Evidence sources | Código de ambos repos, git history, `MIGRATION_ANALYSIS.md`, schema.rb / prisma schema |

## Problem Statement

El usuario quiere verificar y actualizar el gap de migración: comparar `gentrade_analitycs` (código antiguo funcional) con `gentrade-rails` (migración en curso), validando de forma independiente lo que afirma `MIGRATION_ANALYSIS.md` y produciendo el delta actualizado (qué ya se migró, qué falta) en 4 áreas: **modelos/DB, servicios/lógica, integraciones, API/endpoints**.

## Evidence Inventory

| Source   | Status                          | Notes     |
| -------- | ------------------------------- | --------- |
| `gentrade_analitycs/MIGRATION_ANALYSIS.md` | Available | 21KB, fechado 2026-06-13. Afirma ~30% paridad, ~10 tablas faltantes, RAG/Qdrant ausente, 25+ conectores vs 3, 15+ servicios sin equivalente. Es el documento a verificar. |
| `gentrade_analitycs/src/` (código origen) | Available | Stack Node/Express/Prisma. Por inventariar. |
| `gentrade-rails/backend/` (código destino) | Available | Rails 8. Por inventariar (app/models, app/services, config/routes, db/schema.rb). |
| Prisma schema (origen) | Partial | Por localizar (prisma/schema.prisma). |
| `gentrade-rails/backend/db/schema.rb` | Available | Verificado parcialmente en sesión previa: incluye clients, integrations, client_daily_snapshots, client_report_objectives, integration_data, metrics, materials, users, proposals + variantes. |

## Investigation Backlog

| # | Path to Explore | Priority | Status | Notes |
| - | --------------- | -------- | ------ | ----- |
| 1 | Inventario de modelos Prisma (origen) vs `db/schema.rb` (destino) | High | Open | Validar la lista de 10 tablas faltantes |
| 2 | Inventario de servicios `src/services` (origen) vs `app/services` (destino) | High | Open | Validar "15+ servicios sin equivalente" |
| 3 | Inventario de integraciones/conectores en ambos | High | Open | Validar "25+ vs 3" |
| 4 | Rutas/endpoints: Express routes vs `config/routes.rb` | Medium | Open | Cobertura de API |
| 5 | Sistema RAG/Qdrant: presencia y estado en destino | High | Open | Declarado como core ausente |

## Timeline of Events

| Time | Event | Source | Confidence |
| ---- | ----- | ------ | ---------- |
| 2026-06-13 14:30 | `MIGRATION_ANALYSIS.md` modificado por última vez | filesystem mtime | Confirmed |
| 2026-06-13 15:12 | `gentrade-rails` repo con estructura inicial | filesystem mtime | Confirmed |
| 2026-06-14 | Caso de investigación abierto | esta sesión | Confirmed |

## Confirmed Findings

### Finding 1: Existe un análisis de migración previo

**Evidence:** `gentrade_analitycs/MIGRATION_ANALYSIS.md:1-30`

**Detail:** Documento fechado 2026-06-13 que describe origen (Node/Express/Prisma/Qdrant) y destino (Rails 8/PostgreSQL), declarando ~30% de paridad funcional.

### Finding 2: Paridad de MODELOS — 11 de 19 migrados (58%)

**Evidence:** Origen `src/backend/prisma/schema.prisma` (19 modelos) vs destino `backend/db/schema.rb` (11 tablas).

**Detail — matriz de modelos:**

| Modelo Prisma (origen) | Tabla Rails (destino) | Estado |
| --- | --- | --- |
| User | users | ✅ Migrado |
| PasswordResetToken | (Devise gestiona reset) | ✅ Equivalente |
| Client | clients | ✅ Migrado |
| Integration | integrations | ✅ Migrado |
| IntegrationData | integration_data | ✅ Migrado (hoy 2026-06-14) |
| ClientMaterial | materials | ✅ Migrado |
| Proposal | proposals | ✅ Migrado |
| ProposalVersion | proposal_versions | ✅ Migrado |
| ProposalMessage | proposal_messages | ✅ Migrado |
| ClientDailySnapshot | client_daily_snapshots | ✅ Migrado (hoy 2026-06-14) |
| ClientReportObjective | client_report_objectives | ✅ Migrado (hoy 2026-06-14) |
| AgencyAccount | — | ❌ FALTA |
| SentimentAnalysis | — | ❌ FALTA |
| Product | — | ❌ FALTA |
| Purchase | — | ❌ FALTA |
| ClientPreference | — | ❌ FALTA |
| ClientSummary | — | ❌ FALTA |
| ClientRecommendation | — | ❌ FALTA |
| ClientChatMessage | — | ❌ FALTA |
| — | metrics | ➕ Solo en destino (modelo nuevo) |

**Faltan 8 modelos:** AgencyAccount, SentimentAnalysis, Product, Purchase, ClientPreference, ClientSummary, ClientRecommendation, ClientChatMessage.

### Finding 3: Paridad de SERVICIOS — ~7 de 15 con equivalente (47%)

**Evidence:** Origen `src/backend/src/services/*.js` (15 servicios + 2 en lib/services) vs destino `backend/app/services/**` + `app/jobs/`.

**Detail — matriz de servicios:**

| Servicio origen | Equivalente Rails | Estado |
| --- | --- | --- |
| explorerService | services/explorer_service.rb | ✅ |
| insightGeneratorService | services/insight_generator_service.rb | ✅ |
| reportService | services/reports_service.rb | ✅ |
| proposalService | proposals/generator.rb + editor.rb | ⚠️ Parcial (sin RAG — ver Finding 5) |
| syncService | jobs/integration_sync_job.rb + backfill_job.rb | ✅ Parcial |
| slackService / slackReportService / slackCronService | integrations/slack_messenger.rb, slack_reporter.rb, jobs/slack_report_job.rb | ✅ |
| emailService / EmailService | — | ❌ FALTA |
| insightService | — | ❌ FALTA (existe insightGenerator pero no insightService) |
| clientService | (lógica en modelo/controller) | ⚠️ Posible parcial |
| dashboardService | — | ❌ FALTA |
| integrationService | integrations/*_sync.rb | ⚠️ Parcial |
| materialService | — | ❌ FALTA (sin servicio dedicado) |
| agencyAccountService | — | ❌ FALTA |
| UserService | (Devise) | ✅ Equivalente |

### Finding 4: Paridad de INTEGRACIONES/CONECTORES — 4 de 24 (17%)

**Evidence:** Origen `src/backend/src/services/connectors/` (24 conectores) vs destino `backend/app/services/integrations/` (4 syncs reales).

**Detail:**

- **Destino (4 con sync):** google_ads_sync, google_analytics_sync, meta_ads_sync, shopify_sync. (+slack como messenger/reporter, no es conector de datos).
- **Origen (24):** amazonSeller, csv, googleAds, googleAnalytics, googleAuth, googleBusiness, holded, hubspot, instagramBusiness, klaviyo, mailchimp, metaAds, metaAuth, pageSpeed, paypal, pipedrive, prestashop, searchConsole, shopify, shopifyAuth, stripe, tiktokAds, tiktokAuth, woocommerce.
- **Faltan ~20 conectores** (excluyendo los Auth como helpers): amazonSeller, csv, googleBusiness, holded, hubspot, instagramBusiness, klaviyo, mailchimp, pageSpeed, paypal, pipedrive, prestashop, searchConsole, stripe, tiktokAds, woocommerce.

### Finding 5: RAG/Qdrant AUSENTE en destino — cambio arquitectónico (no solo gap)

**Evidence:** Origen usa Qdrant + embeddings: `src/backend/src/lib/embeddings.js`, `src/backend/src/services/proposalService.js`, `src/backend/src/config/index.js`. Destino: `grep -ril qdrant|embedding|vector` sobre `app lib config` → **0 matches** (solo falsos positivos en CSS). Gemfile solo tiene `ruby-openai`, sin gem de vectores (qdrant/neighbor/pgvector). `proposals/generator.rb:53-62` inyecta los materiales como **texto plano completo** al prompt, sin recuperación semántica.

**Detail:** El núcleo RAG (propuestas inteligentes basadas en recuperación semántica de materiales) no fue migrado; el destino lo sustituye por "stuff all materials into the prompt". Esto es un cambio de arquitectura, no un módulo pendiente de portar 1:1.

### Finding 6: API/ENDPOINTS — buena cobertura, con áreas faltantes

**Evidence:** Origen `src/backend/src/.../routes/*.js` (15 archivos de rutas) vs destino `config/routes.rb` + `app/controllers/`.

**Detail:**

| Routes origen | Cobertura en destino | Estado |
| --- | --- | --- |
| auth | api/auth_controller | ✅ |
| clients | api/v1/clients_controller | ✅ |
| integrations | api/v1/integrations_controller (+OAuth google/meta/slack) | ✅ |
| proposals | api/v1/proposals_controller | ✅ |
| reports | api/v1/reports_controller (muy completo) | ✅ |
| insights | api/v1/insights_controller | ✅ |
| chat | proposals#chat (member) | ⚠️ Parcial |
| dashboard | dashboard_controller (existe) | ⚠️ Verificar |
| products | — | ❌ FALTA (no hay modelo Product) |
| slack | integrations#slack_* | ✅ |
| drive | — | ❌ FALTA (Google Drive picker) |
| logs | — | ❌ FALTA |
| admin | — | ❌ FALTA |
| contact | — | ❌ FALTA |
| users | (Devise) | ⚠️ Parcial |

## Deduced Conclusions

### Deduction 1: La paridad real es ~50%, mayor que el ~30% del doc

**Based on:** Findings 2, 3, 6.

**Reasoning:** Modelos 58% (11/19), servicios ~47%, endpoints con cobertura alta en las áreas core (auth, clients, proposals, reports, insights, integrations). El doc de 2026-06-13 declaraba ~30%, pero la sesión de hoy (2026-06-14) añadió IntegrationData, ClientDailySnapshot, ClientReportObjective + servicios de reports/insights/explorer + 4 syncs, elevando la paridad.

**Conclusion:** El gap se ha estrechado desde la redacción del doc. La afirmación "~30%" está **desactualizada** (Hypothesis #1 refutada parcialmente).

### Deduction 2: El gap restante se concentra en breadth de integraciones y el motor RAG

**Based on:** Findings 4 y 5.

**Reasoning:** Lo migrado cubre el flujo core (clientes→materiales→propuestas→reports→insights). Lo que falta es (a) ~20 conectores de plataforma, (b) el sistema RAG/Qdrant, (c) 8 modelos secundarios (productos/compras/preferencias/recomendaciones/sentiment/chat/agency).

**Conclusion:** Dos frentes distintos: ancho (conectores, fácil de portar incrementalmente) y profundidad arquitectónica (RAG, decisión de diseño pendiente).

## Hypothesized Paths

### Hypothesis 1: Rails cubre ~30% de la funcionalidad del sistema Node original

**Status:** Open

**Theory:** Según `MIGRATION_ANALYSIS.md`, faltan ~10 tablas, el sistema RAG/Qdrant, 22+ conectores y 15+ servicios.

**Supporting indicators:** El doc lista gaps concretos con código Prisma.

**Would confirm:** Inventario independiente de ambos repos que coincida con la lista de gaps.

**Would refute:** Encontrar que parte sustancial ya fue migrada después de 2026-06-13 (la sesión previa de hoy ya añadió reports/insights/integration_data — posible avance no reflejado en el doc).

**Resolution:** **Refutada parcialmente (2026-06-14).** La paridad real es ~50% (modelos 11/19 = 58%, servicios ~47%, endpoints core cubiertos), no ~30%. El doc quedó desactualizado tras el trabajo de hoy (IntegrationData, ClientDailySnapshot, ClientReportObjective, reports/insights/explorer services, 4 syncs). El gap real restante: ~20 conectores, RAG/Qdrant, 8 modelos secundarios.

## Missing Evidence

| Gap | Impact | How to Obtain |
| --- | ------ | ------------- |
| Estado del schema Prisma origen | Lista exacta de modelos a comparar | Leer `prisma/schema.prisma` en origen |
| Conteo real de servicios/conectores en destino | Validar % de paridad | Inventariar `app/services` |

## Source Code Trace

_(no aplica aún — caso de exploración, no de defecto)_

## Conclusion

**Confidence:** Low (caso recién abierto; solo el stronghold está Confirmed)

Pendiente de mapeo de evidencia. La afirmación de "~30% paridad" es Hypothesized; nota: una sesión de trabajo de hoy (2026-06-14) ya agregó modelos/servicios de reports, insights e integration_data que podrían no estar reflejados en el doc de 2026-06-13.

## Recommended Next Steps

Convertir el gap de los 5 servicios activos en historias de migración (`bmad-create-story`).

## Follow-up: 2026-06-14 — Análisis profundo de los 5 servicios activos

Scope acotado por el usuario: solo Google Analytics, Google Ads, Meta (Facebook) Ads, Slack y Shopify (los conectores en uso real).

### Additional Findings

#### Finding 7: Google Analytics — falta `top_pages` y `traffic_sources` (paridad ~70%)

**Evidence:** Origen `connectors/googleAnalytics.js` (387 líneas) expone `fetchMetrics`, `fetchTopPages:140`, `fetchTrafficSources:170`, `fetchChannelBreakdown:228`, `fetchEcommerceEvents:260`, `fetchDateRange:297`. Destino `google_analytics_sync.rb` (236 líneas) tiene `fetch_channel_breakdown:43`, `fetch_ecommerce_events:85`, `fetch_analytics_data:140`.

**Gap:** Faltan **Top Pages** (páginas más visitadas) y **Traffic Sources** (fuentes de tráfico). El resto (métricas core, channel breakdown, ecommerce events) está cubierto.

#### Finding 8: Google Ads — paridad alta (~85%)

**Evidence:** Origen `connectors/googleAds.js` (245 líneas): fetch por `customerId`, MTD, campañas, `fetchDateRange:169`. Destino `google_ads_sync.rb` (174 líneas): `fetch_ads_data:49`, `transform_ads_response:73`, `save_metrics:109`, `handle_google_ads_error:145`.

**Gap menor:** El origen maneja multi-customer (`customerIds` loop) y MTD explícito; verificar si el destino cubre múltiples customer accounts. Funcionalmente cercano.

#### Finding 9: Meta Ads — paridad alta (~80%), falta `fetchCreatives`

**Evidence:** Origen `connectors/metaAds.js` (301 líneas): `fetchCampaigns:29`, `fetchCreatives:98`, `fetchDateRange:198`. Destino `meta_ads_sync.rb` (204 líneas): `fetch_campaigns_for_range:51`, `fetch_campaign_metadata:96`, `build_period_summary:112`, `leads_campaign?:141`.

**Gap:** Falta **`fetchCreatives`** (datos de creatividades/anuncios individuales). Campañas + metadata + summary cubiertos; el destino incluso añade `leads_campaign?` (lógica nueva).

#### Finding 10: Shopify — GAP MAYOR: cambio REST vs GraphQL, falta inventario/alertas (paridad ~30%)

**Evidence:** Origen `connectors/shopify.js` (639 líneas) usa **GraphQL** (`inventoryQuantity:36`, `totalRefundedSet:83`), con `fetchProducts:17`, `fetchOrders:71`, `fetchSummary:175`, `generateAlerts:205`, `fetchDateRange:434`, `fetchSalesAnalytics`. Destino `shopify_sync.rb` (184 líneas) usa **REST** (`/admin/api/.../orders.json:80`) con solo `fetch_orders:66`, `calculate_sales_breakdown:104`, `save_period_summary:148`.

**Gaps críticos:**
- **Productos + inventario** (`fetchProducts` con `inventoryQuantity`): ausente en destino.
- **Sistema de alertas** (`generateAlerts`: low stock, velocity de ventas, days-of-coverage, productos desaparecidos): completamente ausente. Único match en destino: `financial_status == "refunded":113` (refunds parciales del GraphQL `totalRefundedSet` NO replicados).
- **Cambio de API:** REST (destino) vs GraphQL (origen). El REST de Shopify está deprecándose para nuevas apps; el origen ya estaba en GraphQL. Decisión de arquitectura.

#### Finding 11: Slack — paridad funcional buena, reimplementado nativo (~90%)

**Evidence:** Origen `slackService.js` (188 líneas, webhook-based: `sendSlackMessage:174`, `buildMonthlyReportMessage:35`, `buildDailyReportMessage:166`) + `slackReportService.js` (320 líneas, `generateSlackReport:8`). Destino `slack_messenger.rb` (119: `send_message`, `list_channels`) + `slack_reporter.rb` (322: `send_metrics_report`, `send_daily_summary`, `send_comparison_report`, block builders).

**Detalle:** El destino reimplementa Slack con **Web API + bloques** (channels, comparison report) en vez de solo webhooks — funcionalmente igual o superior. El origen tiene monthly/daily report messages; el destino tiene metrics/daily/comparison. Paridad alta, distinto enfoque (Bot API vs webhook).

### Updated Conclusion (servicios activos)

| Servicio | Paridad | Gap principal |
| --- | --- | --- |
| Slack | ~90% | Reimplementado nativo (Web API), funcionalmente OK |
| Google Ads | ~85% | Verificar multi-customer accounts |
| Meta Ads | ~80% | Falta `fetchCreatives` (datos de creatividades) |
| Google Analytics | ~70% | Faltan Top Pages + Traffic Sources |
| **Shopify** | **~30%** | **Falta productos/inventario + sistema de alertas (stock/velocity/coverage); REST vs GraphQL** |

**Prioridad de migración (servicios activos):** Shopify es el gap más grande y de mayor valor (alertas de inventario = feature de negocio). Le siguen GA (top pages/traffic sources) y Meta (creatives). Google Ads y Slack están sustancialmente completos.

### Backlog Changes

| # | Path to Explore | Priority | Status | Notes |
| - | --------------- | -------- | ------ | ----- |
| 6 | Shopify: portar `fetchProducts`+inventario y `generateAlerts` (GraphQL) | High | Open | Mayor gap funcional de los 5 activos |
| 7 | GA: portar `fetchTopPages` + `fetchTrafficSources` | Medium | Open | |
| 8 | Meta: portar `fetchCreatives` | Medium | Open | |
| 9 | Google Ads: verificar soporte multi-customer | Low | Open | |
