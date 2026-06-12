# Tasks

## MVP (Perfil + Señales + Recomendaciones)

- [ ] Definir contratos (schema) y persistencia
- [ ] Crear `CompanyProfile` por cliente (inferido + editable)
- [ ] Definir `Signal` y `Recommendation` (campos estables; versionado si cambia)

- [ ] Ingesta mínima de datos
- [ ] Shopify: pedidos + líneas + inventario (SKU/variant) + (opcional) devoluciones
- [ ] Ads (si existe): spend/ROAS/CPA por campaña
- [ ] GA (si existe): sesiones, conversiones, revenue por canal

- [ ] Motor determinista de señales (explicable)
- [x] Stock: `stockout_risk`, `overstock`, `reorder_point` (MVP parcial en frontend con datos ecommerce)
- [ ] Oportunidades: `top_movers`, `bundle_opportunity`, `winback_segment`
- [ ] Canal: `cvr_drop`, `high_cpa_low_roas`

- [ ] Playbooks
- [ ] Implementar 4-6 playbooks base (independientes de sector)
- [ ] Mapear `Signal.type` → playbook(s) + precondiciones

- [ ] Capa IA (LLM)
- [ ] Prompt/plantilla: `profile + signals + evidence`
- [ ] Guardrails: prohibir inventar métricas; listar `assumptions`
- [ ] Cache de resultados por ventana temporal (p.ej. 24h) para evitar coste

- [ ] UI
- [x] Pantalla “Oportunidades”: lista priorizada por impacto/confianza (MVP parcial)
- [ ] Pantalla “Stock y campañas”: alertas + campañas sugeridas por trigger
- [ ] Pantalla “Perfil”: confirmar/editar inferencias

- [ ] Feedback loop
- [ ] Guardar feedback por recomendación (`useful`, `executed`, `notes`)
- [ ] Métrica simple: ranking por utilidad/ejecución

- [ ] Verificación
- [ ] Seeds/demo data para ver señales sin integraciones
- [ ] E2E básico: conectar Shopify → señales de stock → recomendación visible

## Iteración 2 (Calidad y Adaptación)

- [ ] Impacto estimado más robusto
- [ ] Estimar impacto por margen/stock/canal y horizonte

- [ ] Segmentación avanzada
- [ ] RFM mejorado + cohortes + LTV proxy

- [ ] Afinidad de carrito
- [ ] Co-ocurrencia por pares + bundles sugeridos

- [ ] Alertas operativas
- [ ] Notificaciones (email/Slack) para `critical`

## Iteración 3 (Automatización)

- [ ] Acciones “one-click”
- [ ] Crear campaña borrador / audiencias sugeridas / email draft

- [ ] Re-entrenamiento de ranking
- [ ] Usar feedback para priorizar señales/playbooks
