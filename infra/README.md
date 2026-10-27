# Local Developer Infrastructure — Docker Compose Setup

> **Path:** `infra/` (`compose.yaml` & `compose.local.yaml`)  
> **Target Release:** `v1.0.0`  
> **Platform:** Contextual AI Platform  

This directory contains containerized local development stacks for offline and zero-cloud-credential development.

---

## 1. Composition Files Comparison

| Compose File | Services Booted | Application Layer | Primary Use Case |
|---|---|---|---|
| **`infra/compose.local.yaml`**<br/>*(alias: `infra/compoe.local.yaml`)* | `postgres`, `redis`, `app` | **Runs containerized App on port 3000** | Full-stack containerized run with UI and API gateway |
| **`infra/compose.yaml`** | `postgres`, `redis` | None (Infra only) | Local developer mode where app runs via `bun run dev` on workstation |

---

## 2. Services Overview in `compose.local.yaml`

| Service | Image / Build | Container Name | Host Port | Internal Port | Healthcheck |
|---|---|---|---|---|---|
| **postgres** | `postgres:16-alpine` | `contextual-postgres` | `5432` | `5432` | `pg_isready -U postgres -d contextual_dev` |
| **redis** | `redis:7-alpine` | `contextual-redis` | `6379` | `6379` | `redis-cli ping` |
| **app** | `infra/Dockerfile.local` | `contextual-app` | `3000` | `3000` | `GET http://localhost:3000/api/v1/health` |

---

## 3. Running the Full Stack (App + Postgres + Redis)

To run the complete platform including the application server:

```bash
# Build and boot full stack (app + database + cache)
bun run app:up
# or
docker compose -f infra/compose.local.yaml up -d --build

# View application logs
bun run app:logs
# or
docker compose -f infra/compose.local.yaml logs -f app

# Check container status
bun run app:ps
# or
docker compose -f infra/compose.local.yaml ps

# Stop the full stack
bun run app:down
# or
docker compose -f infra/compose.local.yaml down
```

Once running, navigate to:
- **Landing Page UI:** [http://localhost:3000](http://localhost:3000) (renders `@repo/ui` marketing surface with dynamic disclosure banner)
- **API Health Probe:** [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)
- **Credit Balance & Quota:** [http://localhost:3000/api/v1/credits/balance](http://localhost:3000/api/v1/credits/balance)
- **Grounded Reasoning Endpoint:** `POST http://localhost:3000/api/v1/reasoning/query`

---

## 4. Running the Application Natively (Without Containerizing App)

If you prefer to run PostgreSQL and Redis in Docker while running the TypeScript application directly on your workstation with hot-reloading:

```bash
# 1. Start background infrastructure (PostgreSQL + Redis)
bun run infra:up

# 2. Verify infrastructure health
bun run dev:doctor

# 3. Start the application server on http://localhost:3000
bun run dev
```

---

## 5. Environment Variables & Connection Strings

The services use the following local development credentials:

```bash
# Application Port
PORT=3000

# PostgreSQL
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/contextual_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgrespassword
POSTGRES_DB=contextual_dev

# Redis
REDIS_URL=redis://localhost:6379
```

---

## 6. Health Diagnostics

Run the 8-layer diagnostic doctor to verify that the local containers and runtime dependencies are healthy:

```bash
bun run dev:doctor
```
