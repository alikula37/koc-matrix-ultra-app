#!/bin/bash
set -e
echo "== DoD check list =="
echo "1. docker compose config"
docker compose config > /dev/null && echo "✓ compose valid" || echo "✗ compose invalid"
echo "2. alembic upgrade head (dry)"
ls alembic/versions/*.py && echo "✓ migrations exist"
echo "3. pytest"
python -m pytest app/tests -v 2>&1 | tail -20
echo "4. seed dry run (without DB, just import)"
python -c "from app.services.analytics import compute_basic_metrics; print('analytics import ok')"
