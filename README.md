# 🚀 GENTRADE Analytics - Asistente Comercial Inteligente

**Arquitectura moderna con Ruby on Rails API + React SPA**

> Sistema completo para automatizar propuestas comerciales usando IA, con gestión de clientes, materiales y generación inteligente de propuestas.

---

## 📋 Tabla de Contenidos

- [Arquitectura del Proyecto](#arquitectura-del-proyecto)
- [Stack Tecnológico](#stack-tecnológico)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Requisitos Previos](#requisitos-previos)
- [Instalación](#instalación)
- [Desarrollo](#desarrollo)
- [API Endpoints](#api-endpoints)
- [Despliegue](#despliegue)
- [FAQ](#faq)

---

## 🏗 Arquitectura del Proyecto

```
┌─────────────────────────────────────────────────────────────┐
│                      GENTRADE Analytics                      │
│                     Monorepo Fullstack                       │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│   FRONTEND (React)   │ ◄─────► │  BACKEND (Rails API) │
│   Port: 5173         │  HTTP   │   Port: 3002         │
│   Vite Dev Server    │  JSON   │   Puma Server        │
└──────────────────────┘         └──────────────────────┘
                                          │
                                          ▼
                         ┌────────────────────────────────┐
                         │  PostgreSQL    │    Redis       │
                         │  Port: 5434    │    Port: 6380  │
                         └────────────────────────────────┘
```

### ¿Por qué NO usar ERB en Rails?

**NO debes mover el frontend a ERB de Rails.** Aquí está el porqué:

1. **React es Superior para SPAs** - Tu frontend ya es una Single Page Application moderna con React 19
2. **Separación de Responsabilidades** - API-first permite escalar frontend y backend independientemente
3. **Mejor Experiencia de Usuario** - React ofrece reactividad instantánea sin recargas de página
4. **Ecosistema Moderno** - Vite, Tailwind CSS 4.1, shadcn/ui - herramientas que ERB no puede igualar
5. **Reutilización** - El mismo API puede servir a web, móvil, CLI, etc.
6. **Tu Frontend Ya Funciona** - No tiene sentido reescribir 1500 líneas de React en ERB

**Arquitectura Recomendada (Actual):**
```
Frontend (React SPA) ←→ Backend (Rails API) ←→ Database (PostgreSQL)
     Vite + Tailwind        REST JSON           ActiveRecord ORM
```

**Lo que NO debes hacer:**
```
Rails Views (ERB) ←→ Database
  Server-Side Rendering
  (Arquitectura antigua de 2010)
```

---

## 🛠 Stack Tecnológico

### Backend (`/backend`)

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Ruby | 3.3.0 | Lenguaje base |
| Rails | 8.0.5 | Framework API |
| PostgreSQL | 15 | Base de datos principal |
| Redis | 7 | Cache y jobs |
| Devise | latest | Autenticación de usuarios |
| Devise-JWT | latest | Tokens JWT |
| Sidekiq | 7.0 | Background jobs |
| RSpec | latest | Testing |
| Rack-CORS | latest | CORS para API |

### Frontend (`/frontend`)

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 19 | UI Library |
| Vite | 7 | Build tool & dev server |
| Tailwind CSS | 4.1 | Estilos utility-first |
| shadcn/ui | latest | Componentes UI |
| Lucide React | latest | Iconos |

### Infraestructura

- **Docker & Docker Compose** - Contenedores para desarrollo
- **Puma** - Servidor de aplicación Rails
- **Nginx** - Servidor web para producción (futuro)

---

## 📁 Estructura del Proyecto

```
gentrade-rails/                 # Raíz del monorepo
├── backend/                    # API Rails
│   ├── app/
│   │   ├── controllers/
│   │   │   ├── api/
│   │   │   │   ├── auth_controller.rb       # Login, logout, me
│   │   │   │   └── v1/
│   │   │   │       ├── clients_controller.rb     # CRUD clientes
│   │   │   │       ├── materials_controller.rb   # CRUD materiales
│   │   │   │       └── proposals_controller.rb   # CRUD propuestas + chat
│   │   │   └── application_controller.rb
│   │   ├── models/
│   │   │   ├── user.rb                      # Devise
│   │   │   ├── client.rb                    # Cliente con soft delete
│   │   │   ├── material.rb                  # Material (PDF, email, etc)
│   │   │   ├── proposal.rb                  # Propuesta
│   │   │   ├── proposal_version.rb          # Versiones de propuesta
│   │   │   └── proposal_message.rb          # Chat history
│   │   ├── services/           # Servicios de negocio (TODO)
│   │   ├── use_cases/          # Casos de uso (TODO)
│   │   └── repositories/       # Repositorios (TODO)
│   ├── config/
│   │   ├── database.yml        # PostgreSQL config
│   │   ├── routes.rb           # API routes
│   │   └── initializers/
│   │       ├── cors.rb         # CORS config
│   │       └── devise.rb       # Devise config
│   ├── db/
│   │   ├── migrate/            # Migraciones
│   │   ├── seeds.rb            # Datos de prueba
│   │   └── schema.rb
│   ├── spec/                   # Tests RSpec
│   ├── Gemfile
│   ├── .env                    # Variables de entorno
│   └── docker-compose.yml      # DB local (legacy)
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── App.jsx             # ~1500 líneas (TODO: refactorizar)
│   │   ├── lib/
│   │   │   └── api.js          # Cliente API
│   │   └── assets/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js          # Proxy a backend:3002
│   ├── tailwind.config.js
│   └── .env
│
├── docker-compose.yml          # Orquestación completa
├── .gitignore
├── README.md                   # Este archivo
└── MIGRATION_STATUS.md         # Estado de migración
```

---

## ⚙️ Requisitos Previos

- **Ruby** 3.3.0 (usa `rbenv` o `asdf`)
- **Node.js** 18+ y npm
- **Docker** y Docker Compose
- **PostgreSQL** 15+ (opcional si usas Docker)
- **Redis** 7+ (opcional si usas Docker)

---

## 🚀 Instalación

### Opción 1: Con Docker (Recomendado)

```bash
# Clonar el repositorio
git clone <repo-url>
cd gentrade-rails

# Levantar todos los servicios
docker-compose up -d

# Crear la base de datos y ejecutar migraciones
docker-compose exec backend rails db:create db:migrate db:seed

# Ver logs
docker-compose logs -f
```

**Acceder a la aplicación:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3002
- Login: `admin@gentrade.com` / `gentrade2024`

### Opción 2: Desarrollo Local (Sin Docker)

#### Backend

```bash
cd backend

# Instalar dependencias
bundle install

# Configurar base de datos
cp .env.example .env
# Editar .env con tus credenciales

# Crear y migrar base de datos
unset DATABASE_URL  # Importante!
rails db:create
rails db:migrate
rails db:seed

# Iniciar servidor
rails s -p 3002
```

#### Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar dev server
npm run dev
```

#### Base de Datos (PostgreSQL + Redis)

```bash
# Opción A: Usar solo los servicios de DB
cd backend
docker-compose up -d postgres redis

# Opción B: Instalar localmente
brew install postgresql@15 redis
brew services start postgresql@15
brew services start redis
```

---

## 💻 Desarrollo

### Comandos Útiles

#### Backend

```bash
cd backend

# Correr migraciones
unset DATABASE_URL && rails db:migrate

# Crear seed data
unset DATABASE_URL && rails db:seed

# Consola Rails
unset DATABASE_URL && rails console

# Ver rutas
rails routes | grep api

# Ejecutar tests
bundle exec rspec

# Ver estado de migraciones
rails db:migrate:status
```

#### Frontend

```bash
cd frontend

# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview producción
npm run preview

# Linter
npm run lint
```

### Variables de Entorno

#### Backend (`backend/.env`)

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5434/gentrade_rails_development
REDIS_URL=redis://localhost:6380/0
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=86400
FRONTEND_URL=http://localhost:5173
```

#### Frontend (`frontend/.env`)

```bash
BACKEND_URL=http://localhost:3002
VITE_APP_NAME=GENTRADE
VITE_APP_TAGLINE=Asistente Comercial Inteligente
```

---

## 📡 API Endpoints

### Authentication

```bash
# Login
POST /api/auth/login
Body: { "email": "admin@gentrade.com", "password": "gentrade2024" }
Response: { "token": "eyJhbGc...", "user": {...} }

# Get current user
GET /api/auth/me
Header: Authorization: Bearer <token>
Response: { "id": 1, "email": "admin@gentrade.com" }

# Logout
POST /api/auth/logout
Response: 204 No Content
```

### Clients

```bash
# List clients
GET /api/v1/clients
Response: { "clients": [...] }

# Get client
GET /api/v1/clients/:id

# Create client
POST /api/v1/clients
Body: { "client": { "name": "...", "email": "...", "industry": "technology" } }

# Update client
PUT /api/v1/clients/:id

# Delete client (soft delete)
DELETE /api/v1/clients/:id
```

### Materials

```bash
# List materials
GET /api/v1/clients/:client_id/materials

# Create material
POST /api/v1/clients/:client_id/materials
Body: { "material": { "material_type": "note", "content": "..." } }

# Upload file
POST /api/v1/clients/:client_id/materials/upload
Body: multipart/form-data with 'file' field

# Delete material
DELETE /api/v1/clients/:client_id/materials/:id
```

### Proposals

```bash
# List proposals
GET /api/v1/clients/:client_id/proposals

# Generate proposal
POST /api/v1/clients/:client_id/proposals/generate
Body: { "material_ids": [1, 2, 3] }

# Get proposal with versions & messages
GET /api/v1/proposals/:id

# Chat-based editing
POST /api/v1/proposals/:id/chat
Body: { "message": "Add pricing section" }

# Update proposal
PATCH /api/v1/proposals/:id

# Delete proposal
DELETE /api/v1/proposals/:id
```

**Ver documentación completa:** `MIGRATION_STATUS.md`

---

## 🗄️ Modelos de Base de Datos

```ruby
User
  - email (string, unique)
  - encrypted_password (string)
  - created_at, updated_at

Client
  - name (string)
  - email (string, unique)
  - industry (enum: technology, retail, finance, etc)
  - description (text)
  - metadata (jsonb)
  - deleted_at (datetime) # soft delete
  - has_many :materials
  - has_many :proposals

Material
  - client_id (foreign key)
  - material_type (enum: email, csv, xlsx, audio, pdf, etc)
  - content (text)
  - file_url (string)
  - metadata (jsonb)
  - belongs_to :client

Proposal
  - client_id (foreign key)
  - title (string)
  - status (enum: draft, generating, generated, reviewed, sent, accepted, rejected)
  - metadata (jsonb)
  - belongs_to :client
  - has_many :versions
  - has_many :messages

ProposalVersion
  - proposal_id (foreign key)
  - version_number (integer)
  - content (text, markdown)
  - belongs_to :proposal

ProposalMessage
  - proposal_id (foreign key)
  - role (string: 'user' | 'assistant')
  - content (text)
  - belongs_to :proposal
```

---

## 🚢 Despliegue

### Docker Production

```bash
# Build imágenes
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Migraciones en producción
docker-compose -f docker-compose.prod.yml exec backend rails db:migrate
```

### Railway / Heroku

```bash
# Backend
railway up backend/
railway run rails db:migrate

# Frontend
railway up frontend/
```

---

## 🔍 FAQ

### ¿Por qué Rails en lugar de Node.js/Express?

1. **Convención sobre configuración** - Rails tiene estructura clara
2. **ActiveRecord > Prisma** - ORM más maduro y poderoso
3. **Ecosistema rico** - Gemas para todo (Devise, Sidekiq, etc)
4. **Clean Architecture fácil** - Servicios, Use Cases, Repositories
5. **Mejor control** - Menos magia, más explícito que Prisma

### ¿Por qué separar backend/frontend?

1. **Escalabilidad** - Deploy independiente
2. **Tecnología apropiada** - Rails para API, React para UI
3. **Reutilización** - Mismo API para web/móvil
4. **Equipo** - Frontend y backend pueden trabajar en paralelo

### ¿Puedo usar ERB en lugar de React?

**NO**. Razones:

- React es superior para UX moderna
- Tu frontend ya está hecho en React
- ERB es server-side rendering antiguo
- Perderías Vite, Tailwind CSS 4.1, shadcn/ui
- Tendrías que reescribir todo

Mantén la arquitectura actual: **React SPA + Rails API**

### ¿Cómo ejecuto migraciones?

```bash
# SIEMPRE usar unset DATABASE_URL primero
unset DATABASE_URL
rails db:migrate
```

Esto es necesario porque hay una variable de sistema que sobrescribe `database.yml`.

### ¿Dónde están los tests?

```bash
cd backend
bundle exec rspec

# Run específico
bundle exec rspec spec/models/client_spec.rb
```

### ¿Cómo agrego un nuevo endpoint?

1. Crear ruta en `config/routes.rb`
2. Crear acción en controller
3. Crear test en `spec/`
4. Ejecutar test

```ruby
# routes.rb
get 'clients/:id/stats', to: 'clients#stats'

# clients_controller.rb
def stats
  client = Client.find(params[:id])
  render json: { proposals_count: client.proposals.count }
end
```

---

## 📚 Documentación Adicional

- **Arquitectura**: `_bmad/specs/rails-architecture-design.md`
- **Plan de Implementación**: `_bmad/specs/rails-implementation-plan.md`
- **Estado de Migración**: `MIGRATION_STATUS.md`
- **Especificación Completa**: `_bmad/specs/rails-migration-spec.md`

---

## 🙌 Créditos

- **Framework Backend**: Ruby on Rails 8.0
- **Framework Frontend**: React 19 + Vite 7
- **UI Components**: shadcn/ui
- **Iconos**: Lucide React
- **Estilos**: Tailwind CSS 4.1

---

## 📜 Licencia

Propietario - GENTRADE Analytics

---

**¿Preguntas?** Revisa `MIGRATION_STATUS.md` para el estado actual del proyecto.
