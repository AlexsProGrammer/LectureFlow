#!/usr/bin/env bash
set -euo pipefail

echo "[reset-dev] Tearing down containers and volumes..."
docker compose down -v

echo "[reset-dev] Wiping local PostgreSQL data..."
rm -rf ./data

echo "[reset-dev] Wiping local uploads..."
rm -rf ./backend/uploads/*
touch ./backend/uploads/.gitkeep

echo "[reset-dev] Starting fresh containers..."
docker compose up -d

echo "[reset-dev] Waiting for Postgres to be ready..."
sleep 3

echo "[reset-dev] Pushing Drizzle schema..."
pnpm --filter @lectureflow/backend db:push

echo "[reset-dev] Done. Fresh environment ready."
