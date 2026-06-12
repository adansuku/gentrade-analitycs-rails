# SPEC: Oportunidades, Stock y Campañas (Perfil + Señales + IA)

## Objetivo
Construir un sistema que genere ideas, oportunidades, recomendaciones y avisos de stock para cualquier tipo de empresa, apoyándose en datos reales (integraciones + materiales) y en un perfil de empresa inferido y editable.

## Principios
- Separar 2 capas: (1) **motor determinista de señales** (explicable) y (2) **capa de recomendación** (plantillas + LLM) que adapta el lenguaje y el plan.
- El LLM no “inventa datos”: solo redacta/estructura acciones usando `signals + profile + context`.
- Todo output incluye: `evidencia`, `suposiciones` (si faltan datos) y `acciones` accionables.

## Modelo de Datos (Contratos)

### 1) CompanyProfile
Entidad persistida por cliente.

Campos (mínimos, todos opcionales salvo `clientId`):
- `clientId`
- `industryHint` (string)
- `businessModel` (enum: `b2c`, `b2b`, `marketplace`, `subscription`, `services`, `unknown`)
- `currency` (ISO, default inferida)
- `countries[]`
- `avgOrderValue` (number)
- `avgMarginPct` (number 0-1)
- `leadTimeDays` (number)
- `seasonality` (enum: `low`, `medium`, `high`, `unknown`)
- `primaryGoal` (enum: `revenue`, `margin`, `cash`, `retention`, `acquisition`, `mixed`)
- `channelsActive[]` (e.g. `shopify`, `meta_ads`, `google_ads`, `email`, `crm`, `ga`)
- `fieldConfidence` (map campo→0-1)
- `lastInferredAt`

Reglas:
- Inferir de integraciones/materiales. Guardar confianza por campo.
- UI permite “Confirmar/Editar” y guardar override.

### 2) Signal (motor determinista)
Unidad de “hallazgo” basada en datos.

Campos:
- `id`
- `clientId`
- `type` (string estable, p.ej. `stockout_risk`, `overstock`, `cvr_drop`, `high_cpa`, `bundle_opportunity`, `winback_segment`)
- `severity` (enum: `info`, `warning`, `critical`)
- `confidence` (0-1)
- `impact` (obj): `impactRevenue`, `impactMargin`, `impactCash`, `horizonDays`
- `evidence[]` (lista de métricas con periodo y fuente)
- `constraints` (p.ej. stock bajo, margen desconocido)
- `recommendedActions[]` (acciones “crudas” sin redacción)
- `createdAt`

### 3) Recommendation (salida para UI)
Generada desde `Signal + CompanyProfile + playbook` (y opcionalmente LLM).

Campos:
- `id`, `clientId`
- `title`, `summary`
- `why` (explicación con evidencia)
- `assumptions[]`
- `plan[]` (pasos)
- `assets` (copys, angles, segmentos)
- `metricsToWatch[]`
- `sourceSignals[]`
- `createdAt`

## Motor de Señales (MVP)

### Stock
- `stockout_risk`: cobertura < umbral + demanda creciente.
- `overstock`: cobertura >> umbral + baja rotación.
- `reorder_point`: sugerir `ROP = demandDaily * leadTime + safetyStock`.

Datos mínimos:
- Inventario por SKU.
- Ventas por SKU (últimos 28 días) o pedidos por SKU.
- Lead time (si falta: default + suposición marcada).

### Oportunidades comerciales
- `top_movers`: productos con crecimiento 7d vs 28d.
- `bundle_opportunity`: afinidad simple (productos comprados juntos).
- `winback_segment`: RFM básico (clientes inactivos con histórico fuerte).

### Performance/Canal
- `cvr_drop`: caída CVR por canal (GA vs Shopify si hay).
- `high_cpa_low_roas`: campañas con gasto sin retornos.

## Playbooks (plantillas)
Playbooks por objetivo/canal, no por sector.

Ejemplos:
- `liquidation_overstock`
- `protect_stockouts`
- `scale_top_movers`
- `winback_email`
- `cross_sell_post_purchase`

Cada playbook define:
- Requisitos de datos
- Acciones recomendadas
- Variantes por `businessModel` y `primaryGoal`

## IA (LLM)
- Input: `CompanyProfile + Signals seleccionados + contexto (materiales resumidos)`.
- Output: `Recommendation` (texto + plan + assets).
- Guardrails:
  - No afirmar métricas que no estén en `evidence`.
  - Si faltan datos, añadir a `assumptions`.
  - Mantener idioma español.

## UI (MVP)
- Sección “Oportunidades”: lista priorizada por `impact * confidence`.
- Sección “Stock y campañas”: alertas + campañas sugeridas por trigger.
- Sección “Perfil”: ver inferencias, confirmar y editar.
- Feedback por recomendación: `Útil/No útil`, `Ejecutada`.

## Cadencia
- Diario: alertas críticas (stockout/CPA disparado).
- Semanal: top 5 oportunidades con impacto estimado.
- Mensual: reporte de acierto (feedback + ejecución).

## Criterios de Aceptación (MVP)
- Con Shopify conectado: se generan señales de `stockout_risk/overstock` y 3 recomendaciones accionables con evidencia.
- Con Ads conectado: se detecta `high_cpa_low_roas` y su recomendación asociada.
- Perfil editable: al menos `currency`, `leadTimeDays`, `primaryGoal`.
- Ninguna recomendación afirma números no presentes en evidencia.
