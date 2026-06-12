# 🏗️ GENTRADE Analytics - Arquitectura del Sistema

**Fecha**: 2026-06-12  
**Versión**: 1.0  
**Estado**: Fase 2 Completa (50%)

---

## 📐 Resumen Ejecutivo

GENTRADE Analytics es una aplicación fullstack moderna construida con arquitectura de microservicios separando frontend y backend:

- **Frontend**: React 19 SPA con Vite 7
- **Backend**: Ruby on Rails 8.0 API
- **Base de Datos**: PostgreSQL 15
- **Cache/Jobs**: Redis 7
- **Infraestructura**: Docker + Docker Compose

### ¿Por qué esta Arquitectura?

1. **Separación de Responsabilidades** - Frontend y backend pueden evolucionar independientemente
2. **Escalabilidad** - Cada capa puede escalar horizontalmente
3. **Tecnología Apropiada** - Rails para API robusta, React para UX moderna
4. **Reutilización** - El mismo API puede servir web, móvil, CLI
5. **Desarrollo Paralelo** - Equipos de frontend y backend trabajan simultáneamente

---

## 🎯 Decisiones Arquitectónicas Clave

### 1. Monorepo vs Multi-repo

**Decisión**: Monorepo  
**Razón**: 
- Un solo repositorio facilita cambios coordinados
- Versionado unificado
- CI/CD simplificado
- Mejor para equipos pequeños

**Estructura**:
```
gentrade-rails/
├── backend/     # Rails API
├── frontend/    # React SPA
└── docker-compose.yml
```

### 2. API-First Architecture

**Decisión**: Backend como API REST pura (no server-side rendering)  
**Razón**:
- Permite múltiples clientes (web, móvil, CLI)
- Mejor separación de responsabilidades
- Más fácil de testear
- Escalabilidad independiente

### 3. NO usar ERB/Views en Rails

**Decisión**: Mantener React, NO mover a ERB  
**Razón Crítica**:

Rails Views (ERB) es una arquitectura antigua de **2010**:
- Server-side rendering
- Full page reloads
- Pobre UX
- No hay ecosistema moderno (Vite, Tailwind 4.1, shadcn/ui)

React SPA es el estándar moderno de **2024+**:
- Client-side rendering
- Instant updates sin recargas
- Excelente UX
- Ecosistema rico y activo

**Comparación**:

| Aspecto | React SPA ✅ | Rails ERB ❌ |
|---------|------------|--------------|
| UX | Instantánea | Lenta (full reload) |
| Ecosistema | Vite, Tailwind, shadcn | Limitado |
| Escalabilidad | Horizontal (CDN) | Vertical (servidor) |
| Reutilización | Multi-plataforma | Solo web |
| Developer Experience | Hot reload | Restart server |

### 4. Clean Architecture en Backend

**Decisión**: Implementar Clean Architecture progresivamente  
**Capas**:

```
Controllers (API) → Use Cases → Services → Repositories → Models (ActiveRecord)
```

**Estado Actual**: Solo Controllers + Models (Fase 2)  
**Próxima Fase**: Agregar Services para AI integration

---

## 🔧 Stack Tecnológico Detallado

### Backend Stack

```ruby
# Gemfile principales
gem "rails", "~> 8.0"           # Framework
gem "pg", "~> 1.5"              # PostgreSQL
gem "devise"                     # Autenticación
gem "devise-jwt"                 # JWT tokens
gem "sidekiq", "~> 7.0"         # Background jobs
gem "rack-cors"                  # CORS
gem "rspec-rails"                # Testing
```

**Justificación**:
- **Rails 8**: Última versión, soporte completo
- **Devise**: Gema madura para auth, miles de apps la usan
- **Sidekiq**: Mejor opción para background jobs en Ruby
- **RSpec**: Estándar de facto para testing

### Frontend Stack

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "vite": "^7.0.0",
    "tailwindcss": "^4.1.0",
    "@radix-ui/react-*": "latest",
    "lucide-react": "latest"
  }
}
```

**Justificación**:
- **React 19**: Última versión con mejoras de performance
- **Vite 7**: Build tool más rápido que Webpack
- **Tailwind 4.1**: Utility-first CSS, super productivo
- **Radix UI**: Componentes accesibles sin estilo
- **shadcn/ui**: Componentes pre-styled hermosos

---

## 🗄️ Diseño de Base de Datos

### Esquema Actual

```sql
-- Usuarios (Devise)
users
  id, email, encrypted_password, created_at, updated_at

-- Clientes
clients
  id, name, email, industry (enum), description, metadata (jsonb)
  deleted_at (soft delete)

-- Materiales (emails, PDFs, transcripciones, etc)
materials
  id, client_id, material_type (enum), content (text)
  file_url, metadata (jsonb)

-- Propuestas
proposals
  id, client_id, title, status (enum: draft→generating→generated...)
  metadata (jsonb)

-- Versiones de Propuestas (historial)
proposal_versions
  id, proposal_id, version_number, content (markdown)

-- Mensajes de Chat (historial de edición)
proposal_messages
  id, proposal_id, role (user/assistant), content (text)
```

### Decisiones de Diseño

1. **JSONB para metadata** - Flexibilidad sin migraciones
2. **Enums para estados** - Validación a nivel de DB
3. **Soft delete en clients** - No perder datos históricos
4. **Versioning en proposals** - Auditoría completa
5. **Message history** - Contexto para AI

---

## 🔌 API Design

### Principios

1. **RESTful** - Recursos estándar (GET, POST, PATCH, DELETE)
2. **JSON-only** - No HTML, solo JSON
3. **Versionado** - `/api/v1/` permite evolución
4. **Stateless** - JWT tokens, no sesiones
5. **CORS habilitado** - Para desarrollo cross-origin

### Estructura de URLs

```
/api/auth/*              # Autenticación (fuera de versión)
/api/v1/clients/*        # CRUD clientes
/api/v1/materials/*      # CRUD materiales
/api/v1/proposals/*      # CRUD propuestas + chat
```

### Formato de Respuestas

```json
// Success
{
  "clients": [
    {
      "id": 1,
      "name": "Acme Corp",
      "email": "contact@acme.com",
      "materials_count": 5,
      "proposals_count": 2
    }
  ]
}

// Error
{
  "error": "Client not found",
  "status": 404
}
```

---

## 🔐 Autenticación y Seguridad

### Flow de Autenticación

```
1. POST /api/auth/login { email, password }
   → Response: { token: "eyJhbGc...", user: {...} }

2. Frontend guarda token en localStorage

3. Todas las requests subsecuentes:
   Header: Authorization: Bearer eyJhbGc...

4. Backend valida token en ApplicationController#current_user
```

### Seguridad Implementada

- ✅ JWT tokens con expiración (24h)
- ✅ Passwords con bcrypt (Devise)
- ✅ CORS configurado
- ✅ HTTPS en producción (futuro)
- ⏳ Rate limiting con Rack::Attack (TODO)

---

## 🚀 Flujo de Desarrollo

### Desarrollo Local

```bash
# Terminal 1: Backend
cd backend
docker-compose up -d postgres redis
unset DATABASE_URL
rails s -p 3002

# Terminal 2: Frontend
cd frontend
npm run dev

# Acceso:
# Frontend: http://localhost:5173
# Backend: http://localhost:3002
# Login: admin@gentrade.com / gentrade2024
```

### Con Docker (Recomendado)

```bash
# Desde la raíz
docker-compose up

# Todo levanta automáticamente:
# - PostgreSQL (5434)
# - Redis (6380)
# - Backend Rails (3002)
# - Frontend Vite (5173)
```

---

## 📊 Estado Actual del Proyecto

### ✅ Fase 1: Infraestructura (100%)

- [x] Rails 8 proyecto creado
- [x] PostgreSQL + Redis configurados
- [x] Docker Compose funcionando
- [x] Devise instalado
- [x] CORS configurado

### ✅ Fase 2: Core API (100%)

- [x] Modelos: User, Client, Material, Proposal, ProposalVersion, ProposalMessage
- [x] Controladores: Auth, Clients, Materials, Proposals
- [x] 15+ endpoints REST implementados y testeados
- [x] JSON serialization
- [x] Error handling
- [x] Seeds con datos de prueba

### ⏳ Fase 3: Business Logic (0%)

- [ ] Services para AI (OpenRouter/Claude)
- [ ] Background jobs (Sidekiq)
- [ ] File upload real (ActiveStorage o S3)
- [ ] Proposal generation con IA
- [ ] Chat editing con IA
- [ ] Audio transcription (Whisper)

### ⏳ Fase 4: Integrations (0%)

- [ ] Google OAuth
- [ ] Google Analytics sync
- [ ] Google Ads sync
- [ ] Meta Ads sync
- [ ] Slack reports

---

## 🧪 Testing Strategy

### Backend (RSpec)

```ruby
# Model tests
spec/models/client_spec.rb        # Validaciones
spec/models/proposal_spec.rb      # Business logic

# Request tests (futura fase)
spec/requests/api/v1/clients_spec.rb
spec/requests/api/auth_spec.rb

# Service tests (futura fase)
spec/services/proposals/generator_spec.rb
```

### Frontend (futuro)

- Vitest para unit tests
- React Testing Library para componentes
- Cypress o Playwright para E2E

---

## 📦 Deployment Strategy

### Producción (Propuesta)

```
┌─────────────┐
│   Vercel    │  Frontend (React build)
└──────┬──────┘
       │ API calls
       ▼
┌─────────────┐
│  Railway    │  Backend (Rails + Sidekiq)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Railway    │  PostgreSQL + Redis
└─────────────┘
```

**Alternativas**:
- Heroku (más caro)
- Fly.io (más complejo)
- Render (buena opción)
- AWS/GCP (overkill para MVP)

---

## 🔮 Próximos Pasos

### Prioridad Alta (Próxima Sesión)

1. **AI Integration**
   - Crear `app/services/ai/openrouter_client.rb`
   - Implementar `Proposals::Generator` service
   - Implementar `Proposals::Editor` service
   - Reemplazar dummy content generation

2. **Background Jobs**
   - Configurar Sidekiq
   - Crear `GenerateProposalJob`
   - Crear `EditProposalJob`
   - Dashboard de Sidekiq

3. **File Storage**
   - Configurar ActiveStorage
   - O configurar S3 directo
   - Actualizar `MaterialsController#upload`

### Prioridad Media

4. **Frontend Integration**
   - Actualizar `frontend/src/lib/api.js`
   - Testear login flow
   - Testear clients CRUD
   - Testear proposals generation

5. **Testing**
   - Request specs para todos los endpoints
   - Service specs
   - Integration tests

### Prioridad Baja

6. **Performance**
   - Añadir indices a DB
   - Cachear responses (Redis)
   - Pagination con Pagy
   - N+1 query optimization

7. **DevOps**
   - CI/CD con GitHub Actions
   - Deploy automatizado
   - Monitoring (Sentry, NewRelic)

---

## 💡 Lecciones Aprendidas

### Por qué migramos de Node.js/Express

1. **Prisma ORM es limitado** - ActiveRecord es mucho más poderoso
2. **Express requiere mucha configuración** - Rails tiene "convention over configuration"
3. **Ecosistema Ruby más maduro** - Gemas para todo (Devise, Sidekiq, etc)
4. **Clean Architecture más natural** - Rails facilita separación de capas
5. **Mejor control** - Menos "magia", más explícito

### Decisiones Correctas

✅ Mantener React separado (NO mover a ERB)  
✅ Usar Devise en lugar de JWT manual  
✅ Estructura de monorepo  
✅ Docker para desarrollo  
✅ API-first design

### Evitar en el Futuro

❌ No usar Prisma en proyectos complejos  
❌ No mezclar frontend/backend en mismo servidor  
❌ No usar server-side rendering para SPAs  
❌ No asumir que "más nuevo = mejor"

---

## 📚 Referencias

### Documentación del Proyecto

- **README.md** - Guía de inicio rápido
- **MIGRATION_STATUS.md** - Estado detallado de migración
- **ARCHITECTURE.md** (este archivo) - Arquitectura completa
- **backend/README.md** - Docs específicos de Rails
- **frontend/README.md** - Docs específicos de React

### Recursos Externos

- [Rails Guides](https://guides.rubyonrails.org/)
- [Devise](https://github.com/heartcombo/devise)
- [React Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 👥 Equipo y Contacto

**Desarrollador Principal**: Claude (Anthropic)  
**Cliente**: Adán / GENTRADE  
**Repositorio**: https://github.com/adansuku/gentrade-analitycs-rails

---

**Última Actualización**: 2026-06-12 10:15 UTC  
**Próxima Revisión**: Después de Fase 3 (AI Integration)
