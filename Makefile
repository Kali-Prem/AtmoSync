# Makefile for ATMOSYNC (Linux / macOS)

.PHONY: help venv install db-init db-seed test test-coverage lint format run-api run-web docker-up docker-down clean

PYTHON ?= python3
PIP ?= pip
UVICORN ?= uvicorn
NPM ?= npm

help:
	@echo "Available commands:"
	@echo "  make install        Install Python and Node dependencies"
	@echo "  make db-init        Initialize database tables"
	@echo "  make db-seed        Seed monitoring stations"
	@echo "  make test           Run backend unit and integration tests"
	@echo "  make test-coverage  Run tests with coverage report"
	@echo "  make lint           Check code quality with flake8 and ruff"
	@echo "  make run-api        Start FastAPI development server"
	@echo "  make run-web        Start Next.js frontend development server"
	@echo "  make docker-up      Start Docker Compose stack"
	@echo "  make docker-down    Stop Docker Compose stack"
	@echo "  make clean          Remove build and cache artifacts"

venv:
	$(PYTHON) -m venv .venv
	@echo "Virtual environment created. Activate with 'source .venv/bin/activate'"

install:
	$(PIP) install -r apps/api/requirements.txt
	cd apps/web && $(NPM) install

db-init:
	$(PYTHON) scripts/cli.py db init

db-seed:
	$(PYTHON) scripts/cli.py db seed

test:
	pytest -v tests/

test-coverage:
	pytest -v --cov=services --cov=apps/api --cov=scientific tests/

lint:
	ruff check . || true

format:
	ruff format . || true

run-api:
	$(UVICORN) apps.api.src.main:app --host 0.0.0.0 --port 8000 --reload

run-web:
	cd apps/web && $(NPM) run dev

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	rm -rf apps/web/.next
