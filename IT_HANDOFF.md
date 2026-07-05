# IT Handoff — VNRVJIET Faculty Appraisal System

One-page deployment brief for college IT. Full detail in [DEPLOYMENT.md](DEPLOYMENT.md), [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md), [OBSERVABILITY.md](OBSERVABILITY.md).

---

## What this is

A self-contained, Dockerized faculty appraisal + FPGP portal. Everything runs from one `docker compose` file — app, database, and (optional) monitoring.

| Component | Image / build | Port (in-container) |
|-----------|---------------|---------------------|
| Frontend (React SPA + nginx) | `./frontend` | 80 |
| Backend (Node/Express API) | `./backend` | 5000 |
| PostgreSQL 15 | `postgres:15-alpine` | 5432 |
| Prometheus (optional) | `prom/prometheus` | 9090 |
| Loki (optional) | `grafana/loki` | 3100 |
| Grafana (optional) | `grafana/grafana` | 3000 |

The **frontend nginx already reverse-proxies** `/api` and `/uploads` to the backend, so only the frontend needs to be exposed. The backend, DB, and monitoring stay on the internal Docker network.

---

## Deploy (fits a standard Docker host)

```bash
git clone <repo-url> faculty-appraisal
cd faculty-appraisal
cp .env.example .env          # then edit .env — see "Required config" below
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f backend   # watch it boot
curl http://localhost:5000/health   # expect {"status":"ok"}
```

On first boot the backend runs `prisma db push` to create the schema automatically. No manual migration step.

---

## Required config (`.env`)

| Key | What |
|-----|------|
| `DB_PASSWORD` | Postgres password |
| `JWT_SECRET`, `REFRESH_TOKEN_SECRET` | ≥32 random chars each (`openssl rand -base64 48`) |
| `FRONTEND_URL` | **Public HTTPS origin**, e.g. `https://appraisal.vnrvjiet.in`. Required — CORS blocks the browser if wrong/missing |
| `SMTP_HOST/PORT/USER/PASS/FROM`, `EMAIL_DISABLED=false` | Gmail (or institute) SMTP; `SMTP_PASS` = app password |
| `GRAFANA_PASSWORD` | Grafana admin (if using monitoring) |

Full annotated list in `.env.example`.

---

## Reverse proxy + TLS (your existing setup)

You already front Docker apps with a reverse proxy + TLS — plug this in the same way:

1. Add DNS: **`appraisal.vnrvjiet.in` → this server**.
2. Point your proxy (nginx/Traefik/Caddy) at the **frontend container's port 80**; terminate TLS at the proxy.
3. Set `FRONTEND_URL=https://appraisal.vnrvjiet.in` in `.env`.
4. You do **not** need to publish ports 5000/5432/9090/3100/3000 publicly — keep them internal. Only the frontend (via your proxy) is public.

> **Subdomain** (above) needs no code changes. If you instead want a **subpath** (`vnrvjiet.in/appraisal`), tell the developer — it needs a small frontend rebuild (Vite `base` + router `basename`).

---

## First run

1. Create the admin account: `docker compose exec backend npm run seed` (loads sample data) **or** insert a single admin row.
2. **Rotate the default password immediately** — seed ships `ADMIN001 / admin123`.
3. In the Admin UI: create departments + academic year, open the submission window, bulk-import faculty via CSV.

---

## Operations

| Item | Note |
|------|------|
| **DB backup** | `docker compose exec postgres pg_dump -U appraisal_user faculty_appraisal > backup.sql` (schedule it). Data lives in the `postgres_data` volume. |
| **Proof-file backup** | Uploaded evidence lives in the `backend/uploads` volume — back it up too. |
| **Redeploy / updates** | `git pull && docker compose -f docker-compose.prod.yml up -d --build`. Entrypoint re-syncs schema (additive changes auto-apply; destructive ones need review). |
| **Health checks** | `/health` (liveness), `/health/ready` (DB check). Both used by the container healthcheck. |
| **Monitoring** | `/metrics` (Prometheus) + JSON logs to stdout (Loki). Wire into your Grafana or the bundled stack. See `OBSERVABILITY.md`. |
| **Firewall** | Public: 80/443 only. Keep 5000/5432/9090/3100/3000 on the internal network/VPN. |

---

## Resource sizing

~2 vCPU / 4 GB RAM minimum. The backend uses headless Chromium (bundled in the image) for PDF export — first PDF after a restart takes a few seconds to warm up.

---

## Contact

Codebase questions → the developer. Everything above is standard `docker compose` operation on your existing host.
