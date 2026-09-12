# Deployment Guide — VNRVJIET Faculty Appraisal System

How to put the portal on a server and keep it running. The target is **one
Docker host running `docker compose`, behind the campus reverse proxy that
terminates TLS, on a subdomain** (e.g. `appraisal.vnrvjiet.in`). A subdomain
needs no code changes.

Related documents:
- [IT_HANDOFF.md](IT_HANDOFF.md) — one-page brief for college IT
- [SECRETS.md](SECRETS.md) — every secret and setting, what reads it, how to generate it
- [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md) — sign-off list
- [OBSERVABILITY.md](OBSERVABILITY.md) — metrics, logs, dashboards

Every variable name in this guide is the one the **code actually reads**
(`process.env.*`). If an example file disagrees, the code wins.

---

## 1. What runs

```
Browser ──HTTPS──▶ campus proxy (TLS) ──HTTP──▶ frontend (nginx :80)
                                                   ├─ /          → React app (static files)
                                                   ├─ /api/      → backend :5000
                                                   └─ /uploads/  → backend :5000
                                               backend (Node 20 + Express) ──▶ postgres :5432
```

| Service | Built from | Port in container | Public? |
|---|---|---|---|
| `frontend` | `./frontend` (Vite build served by nginx) | 80 | Yes, through the campus proxy only |
| `backend` | `./backend` (Node 20, Prisma, system Chromium for PDFs) | 5000 | No |
| `postgres` | `postgres:15-alpine` | 5432 | No |
| `prometheus`, `loki`, `grafana` | upstream images | 9090 / 3100 / 3000 | No (optional stack) |

The frontend needs no API URL: it calls the relative path `/api`, and its nginx
forwards `/api/` and `/uploads/` to the backend. `VITE_API_URL` is not used
(ignore `frontend/.env.example`).

The backend also runs the scheduled jobs itself (email sending, reminders,
review-window mail, proof deadlines) — see §9. **Run exactly one backend
container**; two would run every job twice.

---

## 2. Requirements

- Linux host with Docker Engine and the Compose plugin (`docker compose`).
- About 2 vCPU / 4 GB RAM. PDF export runs headless Chromium inside the backend.
- Disk for the database plus proof files (each upload is capped at 5 MB by default).
- A DNS name pointing at the host, and the campus proxy set up to terminate TLS.
- A sending mailbox with an app password (Gmail) or institute SMTP credentials,
  and outbound access to its port (587 or 465).
- Node.js is **not** needed on the host — the images build everything.
- Port 5432 free on the host, or change the published port (§4). A host that
  already runs PostgreSQL will clash with the compose `postgres` service.

---

## 3. Get the code and configure it

```bash
git clone https://github.com/dheerajpatel56/FACULTY-APRRAISAL-PORTAL.git faculty-appraisal
cd faculty-appraisal
cp .env.example .env
chmod 600 .env
```

(The repository name really is spelled `APRRAISAL`.)

Edit `.env`. Compose reads it and injects the backend's settings — you do not
write a `backend/.env` on the server.

| Key | Value | Notes |
|---|---|---|
| `DB_PASSWORD` | `openssl rand -base64 24` | Compose builds `DATABASE_URL` from it (host = `postgres`). |
| `JWT_SECRET` | `openssl rand -hex 32` | At least 32 characters. Rotating it logs everyone out. |
| `REFRESH_TOKEN_SECRET` | `openssl rand -hex 32` | Must differ from `JWT_SECRET`. |
| `JWT_EXPIRES_IN` / `REFRESH_TOKEN_EXPIRES_IN` | `8h` / `7d` | Defaults in compose. |
| `FRONTEND_URL` | `https://appraisal.vnrvjiet.in` | **Required.** CORS allowlist, comma-separated. The **first** origin is also the base of every link in emails and PDFs, so put the real public URL first. |
| `EMAIL_DISABLED` | `false` in production | `false` sends real mail to real people — read §8 first. Use `true` on staging. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | `smtp.gmail.com` / `587` / `false` (or `465` / `true`) | Port and `SECURE` must match: 587 → `false`, 465 → `true`. |
| `SMTP_USER` | the sending mailbox | |
| `SMTP_PASS` | Gmail 16-character **app password** | Not `SMTP_PASSWORD`, and not the account password. |
| `SMTP_FROM` | `"VNRVJIET Faculty Portal <addr@vnrvjiet.in>"` | Contains `<` `>` — keep it quoted. |
| `GRAFANA_PASSWORD` | `openssl rand -base64 24` | Only if you run the monitoring stack. |

Generate every secret fresh. **Nothing from the development machine goes to
production** — not the JWT secrets, not the SMTP credentials.

### Settings compose does not pass through yet

`docker-compose.prod.yml` does not forward these to the backend, so putting them
in `.env` alone does nothing. Add them under `services.backend.environment` if
you need them:

```yaml
      # Kill switch for the daily review-window mail to all faculty (see §8)
      QUARTERLY_AUTOSEND: ${QUARTERLY_AUTOSEND:-true}
      # Per-file upload limit in MB (links are exempt)
      MAX_UPLOAD_MB: ${MAX_UPLOAD_MB:-5}
      # Password given to faculty created by CSV bulk import. The code uses it
      # as-is, so an empty value would mean an empty password — :? refuses that.
      DEFAULT_IMPORT_PASSWORD: ${DEFAULT_IMPORT_PASSWORD:?set DEFAULT_IMPORT_PASSWORD in .env}
      # Run the scheduled jobs on Indian time (see §9)
      TZ: Asia/Kolkata
```

Do **not** add `SEED_*_PW` here — they are passed only for the one seed run (§6).

---

## 4. Close the ports before the first start

As written, `docker-compose.prod.yml` publishes **5432, 5000, 9090, 3100 and
3000 on every interface**. Only the frontend should be reachable, and only by
the campus proxy. Edit the `ports:` entries before starting:

```yaml
  postgres:
    ports:
      - "127.0.0.1:5433:5432"   # loopback only; 5433 avoids a host PostgreSQL on 5432
  backend:
    ports:
      - "127.0.0.1:5000:5000"   # loopback only: health checks and debugging
  frontend:
    ports:
      - "127.0.0.1:8080:80"     # proxy on this host; use "80:80" + firewall if the proxy is elsewhere
```

Do the same for prometheus, loki and grafana if you run them. Then allow only
80/443 through the host firewall.

---

## 5. Build and start

```bash
# App only (add prometheus loki grafana to also start the monitoring stack)
docker compose -f docker-compose.prod.yml up -d --build postgres backend frontend

docker compose -f docker-compose.prod.yml logs -f backend
```

On every start the backend runs `prisma db push`, which creates the schema on an
empty database and applies additive changes later. It runs **without**
`--accept-data-loss`, so a change that would drop data stops the boot instead
(§11).

Check it:

```bash
curl -s http://127.0.0.1:5000/health          # {"status":"ok"}
curl -s http://127.0.0.1:5000/health/ready    # includes the database check
curl -sI http://127.0.0.1:8080/               # 200 from nginx (the frontend)
```

---

## 6. Accounts and data

Pick one.

### A. Fresh install

```bash
docker compose -f docker-compose.prod.yml exec \
  -e SEED_ADMIN_PW='<strong admin password>' \
  -e SEED_HOD_PW='<random>' \
  -e SEED_FACULTY_PW='<random>' \
  backend npm run seed:prod
```

Use `seed:prod` (compiled JS). Plain `npm run seed` needs dev tools the image
does not have. Without the `-e` values the seed falls back to the passwords
committed in the repository (`admin123` / `hod123` / `faculty123`), which are
public. The seed refuses to run on a database that already holds users it did
not create.

The seed creates `ADMIN001`, sample departments and academic years, **plus
sample accounts** (`HOD001`–`HOD003`, `FAC11`–`FAC35` on `@college.edu`
addresses). On a real install, log in as `ADMIN001` and deactivate those sample
accounts (deleting a user is a deactivation — nothing is erased).

Then, in the admin UI:
1. Departments — only CSE is active today; EEE/ECE/ME are switched off by design.
2. Academic year — create it and open submissions.
3. Cadre targets and review windows.
4. Bulk-import faculty from CSV. They receive `DEFAULT_IMPORT_PASSWORD`; make
   them reset it on first login.
5. Assign each department's HoD and incharges (the REVIEWER role). A role only
   works inside its own department.

### B. Move existing data from another machine

Take a backup on the source machine with `scripts/backup.sh` (§10; on a dev
machine set `DATABASE_URL` and `PG_BIN`), copy the whole `backups/<stamp>/`
folder to the server, then restore **before** the backend starts:

```bash
B=backups/<stamp>
docker compose -f docker-compose.prod.yml up -d postgres
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U appraisal_user -d faculty_appraisal --clean --if-exists --no-owner < $B/db.dump
mkdir -p backend/uploads && tar -xzf $B/uploads.tar.gz -C backend/uploads
docker compose -f docker-compose.prod.yml up -d --build backend frontend
```

Compare user and appraisal counts with the source afterwards. Accounts, password
hashes and proof files all come across.

### Either way

- Change the admin password on first login.
- The ~73 imported CSE accounts still on the old import password `Welcome@123`
  need a forced reset.

---

## 7. Reverse proxy and TLS

Point the campus proxy at the frontend (`127.0.0.1:8080` in §4's example, or the
host's port 80) and terminate TLS there. An nginx example for the proxy:

```nginx
server {
    listen 443 ssl http2;
    server_name appraisal.vnrvjiet.in;
    ssl_certificate     /etc/letsencrypt/live/appraisal.vnrvjiet.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/appraisal.vnrvjiet.in/privkey.pem;

    client_max_body_size 10m;   # proof uploads; the app caps files at MAX_UPLOAD_MB

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
server {
    listen 80;
    server_name appraisal.vnrvjiet.in;
    return 301 https://$host$request_uri;
}
```

Set `FRONTEND_URL=https://appraisal.vnrvjiet.in` to match, then
`docker compose -f docker-compose.prod.yml up -d backend` to apply it.

> **Known gap — rate limits behind two proxies.** The backend trusts one proxy
> hop (`app.set('trust proxy', 1)`). With the campus proxy *and* the frontend
> nginx in front of it, every request appears to come from the campus proxy, so
> the limits are shared by the whole college: 120 API requests per minute, and
> 10 failed logins per 15 minutes. Expect "Too many requests" during a deadline
> rush. The fix is a one-line change before go-live: set `trust proxy` to `2`,
> or have the frontend nginx pass the proxy's `X-Forwarded-For` through
> unchanged.

A subpath (`vnrvjiet.in/appraisal`) instead of a subdomain needs a frontend
rebuild (Vite `base` + router `basename`) — ask the developer.

---

## 8. Email — read before setting `EMAIL_DISABLED=false`

With email enabled the portal sends real mail to real faculty. A background
worker sends queued mail every 30 seconds and retries a failure up to 3 times.
Failed rows show on the admin **Emails** page.

Two things send to many people at once:
1. **The admin "Run quarterly snapshot" button** — a dry run that only counts
   recipients until you confirm it.
2. **The daily 09:00 review-window job** — when a review window ends it mails
   every opted-in faculty **with nobody clicking anything**. Stop it with
   `QUARTERLY_AUTOSEND=false` (after adding it to compose, §3).

On staging, keep `EMAIL_DISABLED=true` or point SMTP at a catch-all mailbox.

To test mail after deploying, use **Forgot password** on the login page for an
account whose inbox you control. It sends a one-time code by email.

Gmail limits how much one account may send per day; for a whole college, prefer
the institute's SMTP relay.

---

## 9. Scheduled jobs

These start with the backend — there is nothing to add to the host's cron:

| Schedule | Job |
|---|---|
| Every 30 s | Send queued emails |
| Daily 09:00 | Reminders |
| Daily 09:00 | Review-window mail to faculty (kill switch `QUARTERLY_AUTOSEND`) |
| Daily 09:00 | Proof deadlines: a rejected proof not replaced within **14 days** loses its subsection's marks, and the appraisal goes back to the HoD on the reduced marks. The faculty stays on the red list. |

**Timezone.** The jobs use the container's local time, which is UTC unless you
set `TZ`. Without it, "09:00" runs at **14:30 IST**. Set `TZ: Asia/Kolkata`
(§3) and check it from inside the container:

```bash
docker compose -f docker-compose.prod.yml exec backend node -e "console.log(new Date().toString())"
```

---

## 10. Backups and restore

Proof files live on disk in `backend/uploads` (mounted at `/app/uploads`,
`UPLOAD_DIR`), **not** in PostgreSQL. A database dump on its own restores rows
pointing at files that no longer exist, so back both up together:

```bash
scripts/backup.sh
```

This writes `backups/<timestamp>/` containing `db.dump` (pg_dump custom format),
`uploads.tar.gz`, and a `MANIFEST` with checksums plus a cross-check of every
proof row against the archived files. It refuses to run if the uploads folder is
missing, never leaves a half-written backup under a final name, and prunes
backups older than `KEEP_DAYS` (default 14) only after a successful run. The
other settings (`BACKUP_DIR`, `UPLOADS_PATH`, `COMPOSE_FILE`, `DATABASE_URL`,
`PG_BIN`) are at the top of the script.

Schedule it nightly on the host:

```cron
0 2 * * * /srv/faculty-appraisal/scripts/backup.sh >> /srv/faculty-appraisal/backups/backup.log 2>&1
```

`backups/` is git-ignored — it holds every account's password hash. **Copy it
off the machine** as well; a backup on the same disk does not survive the disk.

> The script's compose mode and the commands below have not yet been run on a
> Docker host (only the direct-database mode was tested). Do the drill once
> before relying on them.

### Restore drill (does not touch live data)

```bash
B=backups/<timestamp>
docker compose -f docker-compose.prod.yml exec -T postgres createdb -U appraisal_user restore_drill
docker compose -f docker-compose.prod.yml exec -T postgres pg_restore -U appraisal_user -d restore_drill --no-owner < $B/db.dump
docker compose -f docker-compose.prod.yml exec -T postgres psql -U appraisal_user -d restore_drill -c 'SELECT count(*) FROM "User"'
docker compose -f docker-compose.prod.yml exec -T postgres dropdb -U appraisal_user restore_drill
tar -tzf $B/uploads.tar.gz | head
```

The user count should match the live database, and the archive should list files
under `./appraisals/`.

### Real restore (replaces live data)

```bash
B=backups/<timestamp>
docker compose -f docker-compose.prod.yml stop backend
docker compose -f docker-compose.prod.yml exec -T postgres pg_restore -U appraisal_user -d faculty_appraisal --clean --if-exists --no-owner < $B/db.dump
tar -xzf $B/uploads.tar.gz -C backend/uploads
docker compose -f docker-compose.prod.yml start backend
```

`tar -x` adds and overwrites files but does not delete uploads made after the
backup; those remain as unreferenced files.

---

## 11. Updating

```bash
scripts/backup.sh                                   # always first
git pull
docker compose -f docker-compose.prod.yml up -d --build backend frontend
docker compose -f docker-compose.prod.yml logs -f backend
```

The entrypoint re-syncs the schema. If it stops with a data-loss warning, the
update contains a destructive schema change: roll back to the previous commit
and plan that change with the developer. Do **not** add `--accept-data-loss` to
get past it.

Never run `prisma migrate` against this database — the schema is managed by
`db push` and has drifted from the migration history, so `migrate` offers to
reset the database. `npm run prisma:migrate` is wired to refuse.

---

## 12. Health, logs and monitoring

| Endpoint (backend :5000) | Purpose |
|---|---|
| `/health` | Liveness — used by the container healthcheck |
| `/health/ready` | Readiness, including a database ping |
| `/metrics` | Prometheus metrics |

These sit on the backend port, which the frontend nginx does not proxy, so they
stay private as long as port 5000 is not public (§4).

Logs are JSON on stdout:

```bash
docker compose -f docker-compose.prod.yml logs -f --tail=200 backend
```

Optional stack: start `prometheus loki grafana`, log in to Grafana with
`GRAFANA_PASSWORD`, and add the data sources `http://prometheus:9090` and
`http://loki:3100`.

> **Known gap:** `prometheus.yml` scrapes `localhost:5000`. Inside the
> Prometheus container that is Prometheus itself, so nothing is collected.
> Change the target to `backend:5000`.

See [OBSERVABILITY.md](OBSERVABILITY.md) for dashboards.

---

## 13. Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| Login page loads but every call fails with a CORS error | `FRONTEND_URL` does not match the address in the browser (scheme, host and port must match exactly). |
| Links in emails point to the wrong site | The first entry in `FRONTEND_URL` is the link base — put the public URL first. |
| No emails arrive | Check `EMAIL_DISABLED=false`, the key is `SMTP_PASS` (app password), and port/secure pairs (587 + `false`, 465 + `true`). Failed rows show on the admin Emails page. |
| "Too many requests" for many users at once | Shared IP behind two proxies (§7). |
| Jobs run at 14:30 instead of 09:00 | `TZ` not set (§9). |
| Upload rejected as too large | File exceeds `MAX_UPLOAD_MB` (default 5), or a proxy's `client_max_body_size` is lower than 10m. |
| Proof files missing after a redeploy | `backend/uploads` was not on the host volume, or a restore skipped `uploads.tar.gz`. |
| PDF download fails | Backend image must keep `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`; check memory, then `docker compose restart backend`. |
| Backend exits on start with a Prisma data-loss message | A destructive schema change — see §11. |
| `port is already allocated` for 5432 | PostgreSQL already runs on the host — publish postgres on another port (§4). |
| Imported faculty cannot log in | They use `DEFAULT_IMPORT_PASSWORD` (or `Welcome@123` for accounts imported before it was set). |

---

## 14. Known gaps (as of 2026-09-11)

Fix or accept these before go-live:

- [ ] `trust proxy` behind two proxies — shared rate limits (§7).
- [ ] Compose does not pass `QUARTERLY_AUTOSEND`, `MAX_UPLOAD_MB`,
      `DEFAULT_IMPORT_PASSWORD`, `TZ` (§3).
- [ ] Compose publishes every port on all interfaces (§4).
- [ ] `prometheus.yml` scrapes the wrong target (§12).
- [ ] `frontend/.env.example` still lists `VITE_API_URL`, which nothing reads.
- [ ] The backup script's compose mode and the restore commands are untested on Docker (§10).
- [ ] Hosting prerequisites (not code): the repository is on a personal GitHub
      account, not the Vignana-Jyothi organisation; the domain
      (`appraisal.vnrvjiet.in` vs the granted `vjstartup.com`) is unresolved; the
      VJ Shield scan has not been run; there has been no user-testing period.

---

## 15. Go-live checklist

- [ ] `.env` filled with fresh secrets, `chmod 600`, not in git
- [ ] Ports closed (§4); only 80/443 public, via the campus proxy
- [ ] TLS on the proxy; `FRONTEND_URL` = the public HTTPS URL, first in the list
- [ ] `TZ=Asia/Kolkata` set and checked
- [ ] Admin password changed; seed sample accounts deactivated
- [ ] `DEFAULT_IMPORT_PASSWORD` set; imported accounts forced to reset
- [ ] Test email received (Forgot password)
- [ ] `QUARTERLY_AUTOSEND` decided, and review windows checked before their end dates
- [ ] `scripts/backup.sh` in cron, copied off the host, restore drill done once
- [ ] `/health/ready` green; logs readable
- [ ] End-to-end run: faculty fills → uploads a proof → submits → HoD/incharge
      verifies → HoD approves → faculty sees the reviewed score /500

---

**Last updated:** 2026-09-11
