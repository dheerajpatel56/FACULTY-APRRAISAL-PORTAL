#!/usr/bin/env bash
# Back up the database AND the uploaded proof files, together.
#
# Proof files live on disk in the uploads folder, not in Postgres. A pg_dump on
# its own restores a database full of rows pointing at files that are gone, so
# this writes both halves into one timestamped folder:
#
#   backups/2026-09-10_020000/
#     db.dump          pg_dump custom format — restore with pg_restore
#     uploads.tar.gz   the whole uploads folder
#     MANIFEST         sizes, checksums, and a proof-row vs file cross-check
#
# It is written as <stamp>.partial and renamed only once every step succeeded,
# so a half-finished backup is never mistaken for a good one. Old backups are
# pruned only after a successful run, so a failing job never eats the last
# good copies.
#
# Run on the Docker host, from anywhere:
#   scripts/backup.sh
# Nightly at 02:00 via cron:
#   0 2 * * * /srv/p1/scripts/backup.sh >> /srv/p1/backups/backup.log 2>&1
#
# Restore steps: DEPLOYMENT.md, "Backups and restore".
#
# Environment (all optional):
#   BACKUP_DIR    where backups go                       (default ./backups)
#   UPLOADS_PATH  host folder holding the uploads        (default ./backend/uploads,
#                 the folder docker-compose.prod.yml mounts at /app/uploads)
#   KEEP_DAYS     delete backups older than this         (default 14; 0 keeps all)
#   COMPOSE_FILE  compose file with the postgres service (default docker-compose.prod.yml)
#   DATABASE_URL  if set, dump this database with a local pg_dump/psql instead
#                 of `docker compose exec` (dev machines, managed databases)
#   PG_BIN        folder holding pg_dump/psql for DATABASE_URL mode (default: PATH)
#
# Relative paths are taken from the repo root.

set -euo pipefail

cd "$(dirname "$0")/.."

BACKUP_DIR="${BACKUP_DIR:-./backups}"
UPLOADS_PATH="${UPLOADS_PATH:-./backend/uploads}"
KEEP_DAYS="${KEEP_DAYS:-14}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

die() { echo "backup: $*" >&2; exit 1; }
nonblank() { grep -v '^$' || true; }
sha256() { if command -v sha256sum >/dev/null; then sha256sum "$1"; else shasum -a 256 "$1"; fi | cut -d' ' -f1; }
bytes() { wc -c < "$1" | tr -d ' '; }

# Git Bash on Windows: GNU tar reads "C:/..." as a remote host called "C".
if command -v cygpath >/dev/null 2>&1; then
  BACKUP_DIR=$(cygpath -u "$BACKUP_DIR")
  UPLOADS_PATH=$(cygpath -u "$UPLOADS_PATH")
fi

if [ -n "${DATABASE_URL:-}" ]; then
  SOURCE="DATABASE_URL"
  PGURL="$DATABASE_URL"
  # libpq splits user:password@host at the FIRST "@", Prisma at the last, so a
  # password containing a raw "@" works for the app and breaks pg_dump.
  # Percent-encode any "@" inside the user:password part.
  rest="${PGURL#*://}"
  if [[ "$rest" == *@* ]]; then
    userinfo="${rest%@*}"
    PGURL="${PGURL%%://*}://${userinfo//@/%40}@${rest##*@}"
  fi
  # libpq also rejects Prisma's ?schema= parameter; drop it, keep the rest (sslmode etc.).
  PGURL=$(printf '%s' "$PGURL" | sed -E 's/([?&])schema=[^&]*&?/\1/; s/[?&]$//')
  pgbin() { if [ -n "${PG_BIN:-}" ]; then echo "$PG_BIN/$1"; else echo "$1"; fi; }
  dump_db() { "$(pgbin pg_dump)" --format=custom --no-owner --dbname="$PGURL"; }
  run_sql() { "$(pgbin psql)" --no-psqlrc -At --dbname="$PGURL" -c "$1"; }
else
  SOURCE="compose ($COMPOSE_FILE)"
  dc() { docker compose -f "$COMPOSE_FILE" exec -T postgres "$@"; }
  dump_db() { dc pg_dump -U appraisal_user --format=custom --no-owner faculty_appraisal; }
  run_sql() { dc psql -U appraisal_user -d faculty_appraisal --no-psqlrc -At -c "$1"; }
fi

[ -d "$UPLOADS_PATH" ] || die "uploads folder '$UPLOADS_PATH' not found. Set UPLOADS_PATH. Refusing to write a backup without the proof files."

STAMP="$(date +%Y-%m-%d_%H%M%S)"
FINAL="$BACKUP_DIR/$STAMP"
WORK="$FINAL.partial"
mkdir -p "$WORK"
trap 'echo "backup: FAILED — incomplete output left in $WORK" >&2' ERR

echo "backup: dumping database ($SOURCE)"
dump_db > "$WORK/db.dump"
# A pg_dump custom-format archive starts with the bytes PGDMP.
[ "$(head -c 5 "$WORK/db.dump")" = "PGDMP" ] || die "database dump is empty or not a pg_dump archive: $WORK/db.dump"

echo "backup: archiving $UPLOADS_PATH"
tar -czf "$WORK/uploads.tar.gz" -C "$UPLOADS_PATH" .
# (grep -v exits 1 on an empty folder, which pipefail would treat as a failure)
file_count=$(tar -tzf "$WORK/uploads.tar.gz" | { grep -v '/$' || true; } | nonblank | wc -l | tr -d ' ')

# Every proof row the database knows about should have its file in the archive.
# A gap means proofs were already lost before this ran: the backup still
# completes (it is the best copy there is), but it says so loudly.
rows=$(run_sql 'SELECT filename FROM "UploadedFile"' | tr -d '\r' | nonblank | sort)
files=$(tar -tzf "$WORK/uploads.tar.gz" | sed -n 's#^\./appraisals/##p' | nonblank | sort)
missing=$(comm -23 <(printf '%s\n' "$rows" | nonblank) <(printf '%s\n' "$files" | nonblank))
row_count=$(printf '%s\n' "$rows" | nonblank | wc -l | tr -d ' ')
missing_count=$(printf '%s\n' "$missing" | nonblank | wc -l | tr -d ' ')

{
  echo "created         $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "source          $SOURCE"
  echo "db.dump         $(bytes "$WORK/db.dump") bytes  sha256 $(sha256 "$WORK/db.dump")"
  echo "uploads.tar.gz  $(bytes "$WORK/uploads.tar.gz") bytes  sha256 $(sha256 "$WORK/uploads.tar.gz")  $file_count files"
  echo "proof rows      $row_count in UploadedFile, $missing_count with no file in the archive"
  if [ "$missing_count" -gt 0 ]; then
    echo "missing files:"
    printf '  %s\n' $missing
  fi
} > "$WORK/MANIFEST"

mv "$WORK" "$FINAL"
trap - ERR
echo "backup: done -> $FINAL"
cat "$FINAL/MANIFEST"

if [ "$missing_count" -gt 0 ]; then
  echo "backup: WARNING — $missing_count proof row(s) have no file on disk; see $FINAL/MANIFEST" >&2
fi

if [ "$KEEP_DAYS" -gt 0 ]; then
  find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name '20??-??-??_*' -mtime +"$KEEP_DAYS" \
    -print -exec rm -rf {} + | sed 's/^/backup: pruned /'
fi
