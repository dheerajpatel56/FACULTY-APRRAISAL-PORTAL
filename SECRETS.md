# Secrets & deployment configuration

**No secret values belong in this file, or anywhere else in this repository.**
It lists *which* secrets exist, what reads them, and how to produce them. The
values themselves are set on the host at deploy time — in the server's `.env`
(consumed by `docker-compose.prod.yml`) which is git-ignored, or in the
platform's secret store. Anything committed to Git stays in history even after
it is deleted, so a leaked value means rotation, not a revert.

Names below are the ones the **code actually reads** (`process.env.*`), which is
the authority when an example file disagrees.

## Secrets — must be set, must be unique per environment

| Variable | Read by | How to produce | Notes |
|---|---|---|---|
| `DB_PASSWORD` | compose → postgres | `openssl rand -base64 24` | Must match the password inside `DATABASE_URL`. |
| `DATABASE_URL` | Prisma | `postgresql://<user>:<DB_PASSWORD>@postgres:5432/<db>` | Host is the compose service name, not `localhost`. |
| `JWT_SECRET` | `middleware/auth`, `authController` | `openssl rand -hex 32` | **Minimum 32 chars** — CI enforces this. Rotating logs everyone out. |
| `REFRESH_TOKEN_SECRET` | `authController` | `openssl rand -hex 32` | Must differ from `JWT_SECRET`. |
| `SMTP_PASS` | `emailService` | Gmail App Password (16 chars), or the provider's key | Not the account password. See the mail warning below. |
| `SMTP_USER` | `emailService` | The sending mailbox | |
| `GRAFANA_PASSWORD` | compose → grafana | `openssl rand -base64 24` | Only if the observability stack is deployed. |

## Non-secret configuration — still required for a working deploy

| Variable | Read by | Value | Notes |
|---|---|---|---|
| `FRONTEND_URL` | CORS, email links | `https://<the real domain>` | Comma-separated allowlist. The **first** origin is used as the base for links in emails, so put the real public URL first. |
| `EMAIL_DISABLED` | `emailService` | `false` in production | See the warning below before ever setting this to `false` outside production. |
| `QUARTERLY_AUTOSEND` | `cron/quarterlySnapshot` | `true` (default) | Set `false` to stop the daily job mailing all faculty when a review window ends, without deleting the windows. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | `emailService` | e.g. `smtp.gmail.com` / `465` / `true` | |
| `SMTP_FROM` | `emailService` | `VNRVJIET Faculty Portal <addr>` | Contains `<` and `>` — quote it in `.env`, or `sh` parsing breaks. |
| `JWT_EXPIRES_IN` / `REFRESH_TOKEN_EXPIRES_IN` | `authController` | e.g. `15m` / `7d` | |
| `PORT` / `NODE_ENV` / `LOG_LEVEL` | server, logger | `5000` / `production` / `info` | |
| `PUPPETEER_EXECUTABLE_PATH` | `pdfService` | `/usr/bin/chromium-browser` | Set in the backend image; PDF export fails without it. |
| `MAX_UPLOAD_MB` | `middleware/upload` | e.g. `5` | Per-file ceiling for **uploaded** files. Proofs pasted as a link are not size-checked. An unparseable value logs a warning and falls back to 5. |
| _(upload path)_ | — | — | The destination `backend/uploads/appraisals` is **hardcoded**. It must be a mounted volume or proofs vanish on redeploy, and it is outside the database backup. |

## Before the first production deploy

- [ ] Every secret above generated fresh — **none reused from development**. The
      dev `JWT_SECRET` and SMTP credentials must not travel to production.
- [ ] `admin123` rotated. The seeded `ADMIN001` account ships with a known
      password and is documented in this repo; it is a public credential until
      it is changed.
- [x] Hardcoded dev passwords removed from `backend/scripts/*.mjs` — they now
      come from `ADMIN_PW` / `HOD_PW` / `FACULTY_PW` / `TEST_EMAIL` with no
      fallback.
- [ ] Seed run with `SEED_ADMIN_PW`, `SEED_HOD_PW`, `SEED_FACULTY_PW` set, so
      the committed defaults (`admin123` / `hod123` / `faculty123`) are never
      the real passwords. The defaults remain in `seed.ts` on purpose — the test
      suites log in with them, and randomising would make every DB-backed suite
      self-skip and report a false green.
- [ ] `DEFAULT_IMPORT_PASSWORD` set for future bulk imports. The fallback
      (`Welcome@123`) is the password 73 already-imported accounts still use;
      changing the default does not rotate them, it only makes new imports
      inconsistent. Rotate by forcing a reset on those accounts.
- [ ] Server `.env` file permissions restricted (`chmod 600`).
- [ ] `FRONTEND_URL` points at the real domain, first in the list.
- [ ] TLS terminated by the campus proxy; the app itself serves plain HTTP.

## ⚠️ Mail

`EMAIL_DISABLED=false` makes the application send real mail to real addresses.
Two paths send in bulk: the admin "Run quarterly snapshot" button (a dry run
until explicitly confirmed) and the daily 09:00 review-window cron, which fires
on a window's end date **with nobody clicking anything** — set
`QUARTERLY_AUTOSEND=false` to stop that one. Point a staging
deployment at a catch-all mailbox, or leave `EMAIL_DISABLED=true` there.

## If a secret leaks

1. Rotate at the source (new app password, new JWT secret, new DB password).
2. Redeploy. Rotating `JWT_SECRET` or `REFRESH_TOKEN_SECRET` invalidates every
   session — expect all users to be logged out.
3. Do not rewrite Git history and assume that is sufficient; treat the value as
   compromised from the moment it was pushed.
