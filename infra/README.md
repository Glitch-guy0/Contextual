# Local Developer Infrastructure — Docker Compose Setup

> **Path:** `infra/compose.yaml`  
> **Target Release:** `v1.0.0`  
> **Platform:** Contextual AI Platform  

This directory contains the containerized local development stack for offline and zero-cloud-credential development. It runs local instances of PostgreSQL 16 and Redis 7 matching the cloud contracts (Neon Postgres and Upstash Redis).

---

## 1. Services Overview

| Service | Image | Container Name | Host Port | Internal Port | Healthcheck | Volume |
|---|---|---|---|---|---|---|
| **postgres** | `postgres:16-alpine` | `contextual-postgres` | `5432` | `5432` | `pg_isready -U postgres -d contextual_dev` | `postgres_data` (`/var/lib/postgresql/data`) |
| **redis** | `redis:7-alpine` | `contextual-redis` | `6379` | `6379` | `redis-cli ping` | `redis_data` (`/data`) |

---

## 2. Quick Start Commands

From the repository root, you can use the npm/bun scripts or run docker compose directly:

### Start the Local Infrastructure
```bash
# Using bun / npm scripts
bun run infra:up
# or
bun run docker:up

# Direct docker compose command
docker compose -f infra/compose.yaml up -d
```

### Stop the Local Infrastructure
```bash
# Using bun / npm scripts
bun run infra:down
# or
bun run docker:down

# Direct docker compose command
docker compose -f infra/compose.yaml down
```

### View Service Logs
```bash
# Using bun / npm scripts
bun run infra:logs

# Direct docker compose command
docker compose -f infra/compose.yaml logs -f
```

### Check Service Status
```bash
# Using bun / npm scripts
bun run infra:ps

# Direct docker compose command
docker compose -f infra/compose.yaml ps
```

---

## 3. Environment Variables & Connection Strings

The services use the following local development credentials configured in `.env.example`:

```bash
# PostgreSQL
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/contextual_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgrespassword
POSTGRES_DB=contextual_dev

# Redis
REDIS_URL=redis://localhost:6379
```

---

## 4. Health Diagnostics

Run the 8-layer diagnostic doctor to verify that the local containers and runtime dependencies are healthy:

```bash
bun run dev:doctor
```

This verifies:
- Layer 1: Bun runtime environment
- Layer 2: Node.js version compatibility
- Layer 3: Turborepo CLI availability
- Layer 4: PostgreSQL 16 connectivity (port 5432)
- Layer 5: Redis 7 connectivity (port 6379)
- Layer 6: Local port conflicts
- Layer 7: Kysely database migrations
- Layer 8: Telemetry export readiness
