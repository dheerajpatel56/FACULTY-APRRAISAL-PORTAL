# Proof File Upload — Implementation Plan

> Goal: let faculty attach proof files (PDF/image) to curated high-value appraisal fields. Files stored on disk under `./uploads`, served via existing `/uploads` static route, referenced by URL in the row.

## Scope — curated fields

| Model | Field added | Proof type |
|-------|-------------|-----------|
| `Cat2Journal` | `proofFile String?` | Published paper / DOI page |
| `Cat2Conference` | `proofFile String?` | Certificate / proceedings |
| `Cat2Patent` | `proofFile String?` | Filing / grant document |
| `Cat2Project` | `proofFile String?` | Sanction letter |
| `Cat3Training` | `proofFile String?` | FDP/training certificate |
| `Cat5Award` | `proofFile String?` | Award certificate |
| `Cat1EContent` | `evidenceFile` (exists) | Now a real upload, not URL text |
| `Cat1ICT` | `evidenceFile` (exists) | Now a real upload, not URL text |

6 new columns + 2 existing rewired.

---

## Stage 1 — Backend upload infrastructure

**Files**
- `backend/src/middleware/upload.ts` (new) — multer disk storage:
  - dest `./uploads/appraisals/`, auto-create dir
  - filename: `{uuid}-{sanitized-original}`
  - `fileFilter`: allow `application/pdf`, `image/png`, `image/jpeg`, `image/webp` only
  - `limits.fileSize`: 5 MB
- `backend/src/controllers/uploadController.ts` (new) — `uploadProof(req,res)`:
  - returns `{ url: "/uploads/appraisals/<file>", originalName, size }`
- Route: `POST /api/uploads/proof` (authenticated, any logged-in user), multer single-file middleware
- Optional `DELETE /api/uploads/proof` to remove an orphaned file (best-effort)

**Acceptance**: curl/Postman upload a PDF → returns URL → file reachable at `/uploads/appraisals/...`. Non-PDF/image rejected. >5 MB rejected.

**Time**: 30 min.

---

## Stage 2 — Schema migration

**Files**
- `backend/src/prisma/schema.prisma` — add `proofFile String?` to the 6 models above.
- `npm run prisma:push` + `prisma:generate`.

**Acceptance**: build clean, columns exist.

**Time**: 10 min. **Depends on**: Stage 1.

---

## Stage 3 — Frontend FileUpload component

**Files**
- `frontend/src/components/FileUpload.tsx` (new):
  - props: `value` (current URL | null), `onChange(url|null)`, `accept`, `label`
  - states: empty (drop/browse button) · uploading (spinner + %) · uploaded (filename chip + view link + remove ✕)
  - on select → POST to `/api/uploads/proof` (multipart) → store returned URL via `onChange`
  - "view" opens URL in new tab; "remove" clears value (and optionally calls DELETE)
- `frontend/src/api/uploads.ts` (new) — `uploadProof(file)` axios multipart, `deleteProof(url)`

**Acceptance**: component uploads a file standalone, shows progress, renders existing value, removes.

**Time**: 45 min. **Depends on**: Stage 1.

---

## Stage 4 — Wire into the appraisal form + read views

**Files**
- `frontend/src/pages/faculty/AppraisalEditPage.tsx` — add a `<FileUpload>` cell to each curated row's field array (Cat2 journals/conferences/patents/projects, Cat3 training, Cat5 awards) + replace the two Cat1 `evidenceFile` text inputs with `<FileUpload>`. Read-only mode shows a "View proof" link instead of the upload control.
- `frontend/src/pages/faculty/AppraisalViewPage.tsx` & `ReviewAppraisalPage.tsx` — show "📎 View proof" links where present so reviewers can open evidence.
- `backend/src/services/pdfService.ts` — in the appraisal PDF, render a "Proof: <link>" note on rows that have a file (PDF can't embed the file but lists the reference).

**Acceptance**: faculty uploads proof on a journal row → saves → reviewer sees a working "View proof" link → PDF lists the reference.

**Time**: 60 min. **Depends on**: Stages 1-3.

---

## Notes / decisions

- **Storage**: local disk (`./uploads`) — matches current setup. For production behind multiple instances, swap to S3/object storage later (only `uploadController` changes).
- **Auth on files**: `/uploads` is currently public static. Proof files are low-sensitivity, but if needed we can gate downloads behind auth in a follow-up (serve via a controller that checks the requester can view that submission).
- **Cleanup**: deleting a submission removes DB rows but not disk files (orphans). A later cron can sweep unreferenced files; out of scope here.
- **Existing `evidenceFile`**: keep the column name (no rename) to avoid data migration; just change the UI control.

## Total

~2.5 hr across 4 stages. Each stage builds clean independently.

## Resume command

> "Build proof upload per FILE_UPLOAD_PLAN.md — start Stage 1"
