# Go-Live Checklist — Docker Compose Self-Host

Tasks split by owner and ordered for a real production deploy. Do them top to bottom.

Legend: **[DEV]** = developer / repo side (code changes) · **[OPS]** = whoever deploys & operates the server (you, or a sysadmin/IT team).

---

## Phase 0 — Code readiness  (mostly done)

| # | Owner | Task | Status |
|---|-------|------|--------|
| 0.1 | DEV | App builds clean (backend `tsc`, frontend `vite build`) | ✅ done |
| 0.2 | DEV | Tests green (85 unit+integration) | ✅ done |
| 0.3 | DEV | Docker images build + run verified (health, DB push, PDF, SPA) | ✅ done |
| 0.4 | DEV | Deploy artifacts fixed (Dockerfiles, nginx proxy, compose env, entrypoint) | ✅ done |
| 0.5 | DEV | **Commit + push deploy fixes to git** | ⬜ pending — say "commit it" |
| 0.6 | DEV | *(optional)* Add HTTPS reverse proxy (Caddy/Traefik) service to compose | ⬜ optional — see Phase 3 |

---

## Phase 1 — Host provisioning  (OPS, before anything runs)

| # | Task | Notes |
|---|------|-------|
| 1.1 | Provision a server (VPS / college server), Linux recommended | 2 vCPU / 4 GB RAM min (Puppeteer + Postgres + Grafana stack) |
| 1.2 | Install **Docker Engine + Docker Compose v2** | `docker compose version` should work |
| 1.3 | Ensure required ports are **free on the host** | Compose binds **5432, 5000, 80, 9090, 3100, 3000** |
| 1.4 | ⚠️ No other Postgres on 5432 | Your dev machine runs Postgres on 5432 — a clean server avoids the clash. If unavoidable, remap the compose `postgres` port |
| 1.5 | Point **DNS A record** → server IP | e.g. `appraisal.vnrvjiet.in` |
| 1.6 | Open firewall for **80/443 only** to public | Keep 5432/5000/9090/3100/3000 private (LAN/VPN/localhost) |

---

## Phase 2 — Configuration  (OPS)

| # | Task | Notes |
|---|------|-------|
| 2.1 | `cp .env.example .env` at repo root | Compose reads this for `${VAR}` interpolation |
| 2.2 | Set strong `DB_PASSWORD` | |
| 2.3 | Set `JWT_SECRET` + `REFRESH_TOKEN_SECRET` (≥32 random chars each) | `openssl rand -base64 48` |
| 2.4 | Set `FRONTEND_URL` = your **public HTTPS origin** | **Required** — wrong/missing → CORS blocks the browser |
| 2.5 | Set `SMTP_*` (Gmail app password in `SMTP_PASS`) + `EMAIL_DISABLED=false` | App password, not account password |
| 2.6 | Set `GRAFANA_PASSWORD` | |

---

## Phase 3 — HTTPS / TLS  (OPS + optional DEV)

The compose stack serves plain **HTTP on :80**. Production needs TLS. Pick one:

| Option | Who | What |
|--------|-----|------|
| A. Reverse proxy in front | OPS | Put Caddy/Nginx/Traefik on the host, terminate TLS (Let's Encrypt), proxy → frontend:80 |
| B. Add TLS service to compose | DEV | I can add a Caddy service (auto-cert) to `docker-compose.prod.yml` — ask me |
| C. Cloud LB / Cloudflare | OPS | Terminate TLS at a managed load balancer / Cloudflare proxy |

Whichever you pick, `FRONTEND_URL` must be the **https://** origin.

---

## Phase 4 — Deploy  (OPS)

| # | Task | Command |
|---|------|---------|
| 4.1 | Pull the repo onto the server | `git clone … && cd p1` |
| 4.2 | Build + start the stack | `docker compose -f docker-compose.prod.yml up -d --build` |
| 4.3 | Watch backend boot (runs `prisma db push`) | `docker compose -f docker-compose.prod.yml logs -f backend` |
| 4.4 | Confirm health | `curl http://SERVER:5000/health` → `{"status":"ok"}` |
| 4.5 | Open the site | `https://your-domain` → login page loads |

---

## Phase 5 — First-run data  (OPS)

| # | Task | Notes |
|---|------|-------|
| 5.1 | Create the admin account | Empty DB → seed or create. `docker compose exec backend npm run seed:prod` (sample data) **or** insert one admin. Use `seed:prod`, not `seed` (prod image has no dev tooling) |
| 5.2 | **Change the default admin password immediately** | Seed ships `ADMIN001 / admin123` — rotate it |
| 5.3 | Create real departments + academic year, open submission window | Via Admin UI |
| 5.4 | Bulk-import faculty (CSV) | Admin → Users → Import CSV |

---

## Phase 6 — Observability + hardening  (OPS)

| # | Task | Notes |
|---|------|-------|
| 6.1 | Log into Grafana (`:3000`), add Prometheus + Loki data sources | See `OBSERVABILITY.md` |
| 6.2 | Confirm Prometheus scrapes backend `/metrics` | `prometheus.yml` target must reach the backend host |
| 6.3 | Set up log shipping to Loki (Promtail) | Backend logs JSON to stdout — container logs are captured |
| 6.4 | Restrict admin/metrics ports to private network | 9090/3100/3000/5000 not public |

---

## Phase 7 — Operations  (OPS, ongoing)

| # | Task | Notes |
|---|------|-------|
| 7.1 | **Backups (DB + proof files)** | `scripts/backup.sh` nightly in cron — dumps Postgres and archives `backend/uploads` together. Copy `backups/` off the host |
| 7.2 | **Restore drill** | Once after 7.1 is set up: restore into a scratch DB and check counts (`DEPLOYMENT.md`, "Backups and restore") |
| 7.3 | Schema updates on redeploy | Entrypoint runs `prisma db push` each boot; additive changes apply automatically. Destructive changes need review |
| 7.4 | Monitor disk (Puppeteer temp, Postgres, Loki/Prometheus TSDB) | |
| 7.5 | Log rotation / retention for Loki + Prometheus | |

---

## Quick ownership summary

**DEV (me) — remaining:** 0.5 commit fixes · 0.6/3B optional TLS service.
**OPS — everything else:** host, ports, DNS, `.env` secrets, TLS, `docker compose up`, first admin + password rotation, backups, monitoring, firewall.

Blocking dependencies: **1 → 2 → 3 → 4 → 5**. Phases 6–7 after the app is live.
