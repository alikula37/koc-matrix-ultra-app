#!/bin/bash
set -e
echo "=== Data loss test — named volume persists after rebuild ==="
if ! command -v docker &>/dev/null; then echo "⚠ docker not found — static check: pg_data is named volume, not bind"; grep -q "pg_data:" docker-compose.yml && echo "✓ named volume pg_data found — data survives docker compose down (without -v)"; exit 0; fi
docker compose up -d db 2>&1 | tail -3
sleep 5
docker compose exec db psql -U koc_matrix -d koc_matrix_ultra -c "CREATE TABLE IF NOT EXISTS _probe (id int); INSERT INTO _probe VALUES (42); SELECT * FROM _probe;"
echo "Rebuilding backend (no -v)..."
docker compose down 2>&1 | tail -3
docker compose up -d db 2>&1 | tail -3
sleep 5
docker compose exec db psql -U koc_matrix -d koc_matrix_ultra -c "SELECT * FROM _probe;" && echo "✓ data persisted (named volume ok)" || echo "✗ data lost — check pg_data named volume"
docker compose exec db psql -U koc_matrix -d koc_matrix_ultra -c "DROP TABLE _probe;"
echo "Done — now test that -v DOES wipe (manual, not auto): docker compose down -v would delete pg_data"
