.PHONY: help dev up down restart build logs shell console db-migrate db-rollback db-reset test lint setup clean

BACKEND = backend
COMPOSE = docker compose
EXEC = $(COMPOSE) exec backend

default: help

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Development:"
	@echo "  dev          Arrancar servicios"
	@echo "  up           Igual que dev"
	@echo "  down         Parar servicios"
	@echo "  restart      Reiniciar servicios"
	@echo "  build        Construir imagen backend"
	@echo "  rebuild      Reconstruir y arrancar"
	@echo "  logs         Ver logs de todos los servicios"
	@echo "  logs-backend Ver logs del backend"
	@echo "  shell        Entrar al contenedor backend (bash)"
	@echo "  console      Rails console"
	@echo "  setup        Build completo + db:prepare"
	@echo ""
	@echo "Database:"
	@echo "  db-migrate   Ejecutar migraciones"
	@echo "  db-rollback  Revertir migración"
	@echo "  db-reset     Resetear base de datos"
	@echo "  db-seed      Sembrar datos"
	@echo "  db-prepare   Preparar DB (migrate + seed)"
	@echo ""
	@echo "Quality:"
	@echo "  test         Ejecutar rspec"
	@echo "  lint         Ejecutar rubocop"
	@echo "  bundle       Instalar gems"
	@echo ""
	@echo "Utilities:"
	@echo "  clean        Parar y borrar volúmenes"

dev:
	$(COMPOSE_DEV) up -d

up:
	$(COMPOSE_DEV) up -d

down:
	$(COMPOSE_DEV) down

restart: down dev

build:
	$(COMPOSE_DEV) build backend

rebuild: build dev

logs:
	$(COMPOSE_DEV) logs -f

logs-backend:
	$(COMPOSE_DEV) logs -f backend

shell:
	$(EXEC) bash

console:
	$(EXEC) rails c

db-migrate:
	$(EXEC) rails db:migrate

db-rollback:
	$(EXEC) rails db:rollback

db-reset:
	$(EXEC) rails db:reset

db-seed:
	$(EXEC) rails db:seed

db-prepare:
	$(EXEC) rails db:prepare

test:
	$(EXEC) rspec

lint:
	$(EXEC) rubocop

bundle:
	$(EXEC) bundle install

setup:
	$(COMPOSE) up -d postgres redis qdrant
	$(COMPOSE_DEV) build backend
	$(COMPOSE_DEV) up -d backend
	$(EXEC) rails db:prepare

prod:
	$(COMPOSE_PROD) up -d --build

prod-build:
	docker build --target production -t gentrade_rails ./$(BACKEND)

prod-down:
	$(COMPOSE_PROD) down

prod-logs:
	$(COMPOSE_PROD) logs -f

prod-shell:
	docker run -it --rm --entrypoint /bin/bash gentrade_rails

clean:
	$(COMPOSE_DEV) down -v
