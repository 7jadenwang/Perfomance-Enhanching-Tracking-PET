#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
container="pet-sync-check-${RANDOM}"
trap 'docker rm -f "$container" >/dev/null 2>&1 || true' EXIT
docker run -d --name "$container" -e POSTGRES_PASSWORD=pet-isolated-test-password postgres:17 >/dev/null
for attempt in {1..30}; do
 if docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then break; fi
 sleep 1
done
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/bootstrap.sql
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < supabase/migrations/202610130001_private_sync.sql
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/private_sync.sql
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 < supabase/tests/malformed_sync.sql
python3 supabase/tests/concurrent_sync.py "$container"
