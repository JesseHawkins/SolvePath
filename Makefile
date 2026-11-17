# Short commands for common jobs. Run `make` to see the list.
.DEFAULT_GOAL := help
COMPOSE := docker compose -f deploy/docker-compose.yml

.PHONY: help install dev certs build preview test e2e lint format ci up down logs

help: ## Show this list
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "} {printf "  make %-10s %s\n", $$1, $$2}'

install: ## Install exact dependency versions from the lockfile
	npm ci

certs: ## Make trusted local HTTPS certificates (needs mkcert)
	node tools/dev-certs.ts

dev: certs ## Start the dev server over HTTPS, reachable from phones on your Wi-Fi
	SOLVEPATH_HTTPS=1 npm run dev

build: ## Build the static site into apps/web/dist
	npm run build

preview: build ## Serve the production build locally
	npm run preview

test: ## Run unit tests
	npm test

e2e: ## Run browser tests against the production build
	npm run test:e2e

lint: ## Lint and check formatting
	npm run lint && npm run format:check

format: ## Fix formatting
	npm run format

ci: ## Everything CI runs, except the browser tests
	npm run ci

up: ## Start the full-mode stack (needs deploy/.env)
	GIT_COMMIT=$$(git rev-parse --short HEAD) $(COMPOSE) up -d --build

down: ## Stop the full-mode stack (keeps data)
	$(COMPOSE) down

logs: ## Follow the full-mode stack's logs
	$(COMPOSE) logs -f
