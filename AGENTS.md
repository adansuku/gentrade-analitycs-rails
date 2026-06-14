# GENTRADE Analytics — Agent Guide

## Project structure

- **Monorepo** — all Rails code is under `backend/`. Run all commands from `backend/`.
- **No frontend yet** — planned React SPA (Vite on 5173) not created.
- **Architecture docs** at `docs/ARCHITECTURE.md`, `docs/ASYNC_JOBS.md`.

## Quick start

```sh
make setup       # Full bootstrap (containers → db:prepare)
make dev         # docker compose up -d
make test        # docker compose exec backend rspec
make lint        # docker compose exec backend rubocop
make console     # docker compose exec backend rails console
```

Without Docker: `bin/dev` (starts `rails s -p 3002` + `tailwindcss:watch`).

## Key commands

| Action | Command |
|--------|---------|
| Run tests | `bin/rails rspec` or `make test` |
| Single test file | `bin/rails rspec spec/models/client_spec.rb` |
| Lint | `bin/rubocop` or `make lint` |
| Migrate | `bin/rails db:migrate` |
| Rollback | `bin/rails db:rollback` |
| Console | `bin/rails console` or `make console` |

## Stack

- Ruby 3.3.0, Rails 8, PostgreSQL 15, Redis 7
- Tailwind CSS (via `tailwindcss-rails`), importmap (no Webpack/Esbuild)
- Sidekiq 7 (background jobs), Puma (web server)
- Qdrant (vector DB for AI embeddings)
- Devise + Devise JWT (dual auth: HTML sessions for web, JWT for API)

## Auth

- **Web routes**: Devise session-based (`authenticate_user!`).
- **API routes** (`/api/v1/`): Devise JWT token in `Authorization: Bearer` header.
- Test creds in seeds: `admin@gentrade.com` / `gentrade2024`.

## Architecture notes

- **API-first** — backend is meant to be a REST API consumed by a React SPA.
- **ERB views exist** (Devise, dashboard, clients) despite the `docs/ARCHITECTURE.md` dictum "NO usar ERB en Rails". These are temporary/shims.
- **Business logic** lives in `app/services/` and `app/use_cases/`. Avoid putting logic in controllers or models.
- **JSONB metadata pattern**: `store_accessor :metadata, :field1, :field2` is used on Client model. Add new non-relational attributes there instead of migrations.
- **Background jobs**: Sidekiq. Queue order: `critical`, `default`, `low`.
- **Recurring jobs**: Solid Queue (config via `config/recurring.yml`).

## DB conventions

- **Soft delete**: Clients use `deleted_at` column + `active` scope.
- **Enums**: Defined with `enum ... prefix: true` (e.g., `client.industry_technology?`).
- **Schema** is in `db/schema.rb`. There are 13 migrations total.

## Testing

- **RSpec** (`rspec-rails 6`), `--require spec_helper`.
- **Factories**: FactoryBot (in `spec/factories/`), included globally.
- **Matchers**: shoulda-matchers, database_cleaner-active_record.
- **WebMock/VCR** for HTTP stubbing.
- **Verifying doubles** enabled (`verify_partial_doubles = true`).

## Linting

- RuboCop with `rubocop-rails`, `rubocop-rspec`, `rubocop-performance`.
- Single quotes preferred, line length 120, method length 10.
- CI also runs `brakeman --no-pager`.

## Deployment

- Kamal (`config/deploy.yml`), Docker multi-stage build (`backend/Dockerfile`).
- Production entrypoint uses Thrust (`bin/thrust bin/rails server`).

## Ports

| Service | Port |
|---------|------|
| Backend (Rails) | 3002 |
| PostgreSQL | 5434 |
| Redis | 6380 |
| Qdrant | 6333 |
