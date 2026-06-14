# Pendientes — Pantalla de Materiales (vista de cliente)

Estado consolidado tras migrar Materiales (grabar audio, transcripción, Drive, RAG).
Fecha: 2026-06-14.

## ✅ Hecho

- Subir archivo · Escribir nota · Filtros por tipo + lista agrupada
- Grabar audio en navegador (MediaRecorder → upload)
- Transcripción automática (Whisper) → material `transcript`
- Importar de Drive (backend OAuth + picker UI navegable)
- Búsqueda semántica (motor RAG: Embeddings::Client + EmbeddingJob + endpoint + barra)
- **F1 — Viewer por tipo:** click en material abre modal con reproductor `<audio>` (audio), iframe (PDF), `<img>` (imágenes), texto + link al original (nota/email/txt/csv/transcript), botón descarga (docx/xlsx binarios). ✅ 2026-06-14

## ⏳ Pendientes

### Funcionales

| # | Pendiente | Causa / estado actual | Dónde se arregla |
| - | --------- | --------------------- | ---------------- |
| ~~F1~~ | ~~Click en material → ver/escuchar contenido real~~ **✅ HECHO 2026-06-14.** Viewer renderiza audio (player), PDF (iframe), imágenes, texto+link, descarga binarios. Pendiente menor dentro de esto: preview tabular de CSV/Excel (hoy CSV muestra texto; Excel → descarga). | — | — |
| ~~F2~~ | ~~Par audio + transcripción~~ **✅ HECHO 2026-06-14.** Vínculo preciso por `metadata.source_material_id`: la transcripción ya no aparece como fila suelta, el audio muestra badge "Transcrito" y su viewer muestra el texto transcrito. (`Material#transcript/#transcribed?/#source_audio`.) |
| ~~F3~~ | ~~Badge "Transcrito" en vivo~~ **✅ HECHO 2026-06-14.** `TranscriptionJob` hace `broadcast_update_to` la lista (Turbo Stream); la vista se suscribe con `turbo_stream_from`. Cable dev cambiado a `redis` para propagar desde Sidekiq. Verificado en vivo sin recargar. |
| F4 | **Badge de estado de embedding** (procesando/listo/fallido) por material | No migrado. | Guardar estado en `metadata` desde `EmbeddingJob` + mostrar en `_material_row`. |
| F5 | **RAG en generación de propuestas** (backlog #10 de la investigación) | `Proposals::Generator` aún incluye TODO el contenido al prompt; no usa recuperación. | Usar `Embeddings::Client#search` en el generador para acotar contexto. |

### Configuración / entorno (no es código)

| # | Pendiente | Detalle |
| - | --------- | ------- |
| ~~C1~~ | ~~Drive OAuth: Error 403 access_denied~~ **✅ RESUELTO 2026-06-14.** Se añadió el email como test user en Google Auth Platform (proyecto gentrade-494021). Drive conecta y lista archivos reales. |
| ~~C2~~ | ~~`OPENAI_API_KEY` ausente en el contenedor~~ **✅ RESUELTO.** `docker-compose.yml` ahora carga `env_file: ./backend/.env` → OpenAI + Google llegan al contenedor. |
| ~~C3~~ | ~~Credenciales Google para Drive~~ **✅ RESUELTO** vía env_file + ruta `/api/drive/callback` que casa con `GOOGLE_REDIRECT_URI` + redirect de vuelta a la app Rails (no al frontend viejo `:5173`). |

### Técnico (menor)

| # | Pendiente | Detalle |
| - | --------- | ------- |
| T1 | **Refresh de token de Drive** | El cliente usa el access_token directo; no refresca al expirar con el refresh_token. |
| T2 | **Importar de Drive: feedback fino** | Tras importar se recarga toda la página; podría ser un Turbo Stream. |
