---
title: GENTRADE Analytics — Reports Module Migration
status: draft
created: 2026-06-13
updated: 2026-06-13
inputDocuments: []
---

# PRD: GENTRADE Analytics — Reports Module Migration
*Working title — confirm.*

## 0. Document Purpose

Este PRD define los requisitos para migrar el módulo de Reports & Analytics desde la aplicación Node.js/Express/Prisma original (`gentrade_analitycs`) hacia el monolito Rails 8 (`gentrade-rails`). Está dirigido al desarrollador (Amelia) y al equipo de producto para guiar la implementación por epics. Los requisitos funcionales (FR) se numeran globalmente y referencian los User Journeys (UJ).

## 1. Vision

GENTRADE es un asistente comercial inteligente impulsado por IA generativa, desarrollado por 2bedigital. Su objetivo es aumentar hasta un 40% la eficiencia comercial de agencias y equipos de marketing, automatizando dos procesos clave:

1. **Reports & Analytics** — Conexión a plataformas publicitarias y de ecommerce (Google Ads, Google Analytics 4, Meta Ads, Shopify) para obtener métricas, generar reportes diarios/semanales/mensuales con narrativa IA, y enviarlos a Slack.
2. **Proposals** — Generación automática de propuestas comerciales personalizadas a partir de materiales del cliente (emails, PDFs, audios, etc.), con edición vía chat conversacional.

La aplicación se encuentra en fase de migración desde Node.js/Express/Prisma hacia Ruby on Rails 8, unificando toda la funcionalidad en un monolito Rails con API REST.

## 2. Target User

### 2.1 Jobs To Be Done

- **Account Manager / Comercial**: Revisar el rendimiento de clientes diariamente sin abrir la app (Slack), identificar anomalías, tomar decisiones informadas sobre inversión publicitaria.
- **Data Analyst**: Explorar métricas desglosadas por fuente (Google Ads, Meta, Shopify, GA4), analizar campañas, generar insights accionables.
- **Commercial (ventas)**: Subir materiales del cliente (emails, PDFs, CSVs, presupuestos, instrucciones) y generar propuestas comerciales personalizadas con IA.

### 2.2 Non-Users (v1)

- Clientes finales de las agencias (no tienen acceso directo a la plataforma).
- Usuarios sin rol administrativo (la plataforma es solo para el equipo de la agencia).

### 2.3 Key User Journeys

#### UJ-1: Account Manager revisa el reporte diario en Slack

- **Persona + contexto:** Marta, account manager, llega a la oficina y antes del café revisa el móvil.
- **Entry state:** Las 8:00 AM. El sistema ha enviado automáticamente el reporte diario al canal de Slack del cliente.
- **Path:**
  1. Marta abre Slack y ve el reporte del día anterior con KPIs clave (revenue, ROAS, sesiones, inversión).
  2. Si algo parece anómalo (caída de ROAS, gasto disparado), abre la app desde el enlace del reporte.
  3. En la app mira el desglose por fuente, campañas activas, y la narrativa generada por IA.
  4. Decide ajustar presupuestos o pausar campañas basándose en los insights.
- **Climax:** Marta detecta una oportunidad o problema antes de que el cliente lo vea.
- **Resolution:** Toma acción (ajusta campaña, escribe al equipo) y programa el reporte semanal.

#### UJ-2: Commercial genera una propuesta desde materiales del cliente

- **Persona + contexto:** Carlos, comercial, acaba de tener una reunión con un cliente potencial y quiere enviarle una propuesta cuanto antes.
- **Entry state:** Tiene emails, un PDF con requerimientos, y notas de la reunión.
- **Path:**
  1. Carlos sube los archivos a la plataforma (emails, PDF, CSV con datos).
  2. Selecciona los materiales y hace clic en "Generar propuesta".
  3. La IA procesa los materiales y genera un borrador.
  4. Carlos revisa la propuesta y usa el chat para ajustar secciones.
  5. Una vez satisfecho, marca la propuesta como lista para enviar.
- **Climax:** La propuesta está generada en 30 minutos en lugar de 2.5 horas.
- **Resolution:** Descarga o comparte el enlace con el cliente. La propuesta queda versionada para futuras iteraciones.

