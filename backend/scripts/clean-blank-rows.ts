/**
 * Delete blank auto-added rows from DRAFT appraisals written before the
 * save-time filter existed (`722c662`).
 *
 * The appraisal form auto-adds one placeholder row per section. Until that
 * commit they were persisted verbatim, so an untouched draft could carry
 * dozens of empty rows and score points for them. New saves strip the rows,
 * but a draft nobody has re-saved still holds the old ones — this backfills
 * those, using the exact same predicate as the save path
 * (`src/utils/blankRows.ts`), so the two cannot drift.
 *
 * DRAFT ONLY. Submitted / reviewed appraisals are left untouched: their rows
 * were already scored and their reviewed totals are frozen snapshots, so
 * deleting rows underneath them would silently change a signed-off score.
 * Any blank rows found there are reported, never deleted.
 *
 * Defaults to a dry run. The real delete needs the target database named, so
 * a command copy-pasted from notes cannot land on the wrong database:
 *
 *   npx tsx scripts/clean-blank-rows.ts                       # dry run
 *   npx tsx scripts/clean-blank-rows.ts --confirm=<dbname>    # actually delete
 */
import 'dotenv/config';
import { PrismaClient, SubmissionStatus } from '@prisma/client';
import { ROW_CONTENT_FIELDS, ROW_MODELS, rowHasContent } from '../src/utils/blankRows';
import { computeScore } from '../src/services/scoringEngine';

const prisma = new PrismaClient();

// Database name from DATABASE_URL — the caller must repeat it to confirm.
function targetDbName(): string {
  const url = process.env.DATABASE_URL ?? '';
  return url.split('/').pop()?.split('?')[0] ?? '';
}

type Blank = { key: string; model: string; id: string; submissionId: string };

// Every blank row under the given submissions, judged by the save-path rule.
async function findBlankRows(submissionIds: string[]): Promise<Blank[]> {
  if (submissionIds.length === 0) return [];
  const found: Blank[] = [];

  for (const [key, fields] of Object.entries(ROW_CONTENT_FIELDS)) {
    const model = ROW_MODELS[key];
    const delegate = (prisma as any)[model];
    if (!delegate) throw new Error(`No Prisma delegate "${model}" for payload key "${key}"`);

    const rows = await delegate.findMany({
      where: { submissionId: { in: submissionIds } },
      select: { id: true, submissionId: true, ...Object.fromEntries(fields.map((f) => [f, true])) },
    });
    for (const row of rows) {
      if (!rowHasContent(row, fields)) {
        found.push({ key, model, id: row.id, submissionId: row.submissionId });
      }
    }
  }
  return found;
}

const FULL_INCLUDE = Object.fromEntries([
  ...Object.keys(ROW_CONTENT_FIELDS).map((k) => [k, true]),
  // Sections with no identifier field of their own still feed the score, so
  // they must be loaded for the before/after totals to be comparable.
  ...['cat1CourseResults', 'cat1Projects', 'cat2ConfBookChapters', 'cat2Citations', 'cat3AdvQual'].map(
    (k) => [k, true],
  ),
]);

// selfTotal as stored, and as it would be once the blank rows are gone.
async function scoreDelta(submissionId: string, blanks: Blank[]) {
  const sub: any = await prisma.appraisalSubmission.findUnique({
    where: { id: submissionId },
    include: FULL_INCLUDE as any,
  });
  if (!sub) return null;

  const before = computeScore(sub).selfTotal;
  const doomed = new Set(blanks.map((b) => b.id));
  const cleaned = { ...sub };
  for (const key of Object.keys(ROW_CONTENT_FIELDS)) {
    if (Array.isArray(cleaned[key])) cleaned[key] = cleaned[key].filter((r: any) => !doomed.has(r.id));
  }
  return { before, after: computeScore(cleaned).selfTotal };
}

async function main() {
  const confirmArg = process.argv.find((a) => a.startsWith('--confirm='))?.split('=')[1];
  const db = targetDbName();
  if (confirmArg && confirmArg !== db) {
    console.error(`Refusing to run: --confirm=${confirmArg} does not match the target database "${db}".`);
    process.exit(1);
  }
  const isDryRun = !confirmArg;

  const drafts = await prisma.appraisalSubmission.findMany({
    where: { status: SubmissionStatus.DRAFT },
    select: {
      id: true,
      user: { select: { employeeCode: true, name: true } },
      academicYear: { select: { label: true } },
    },
  });
  const draftIds = drafts.map((d) => d.id);
  const blanks = await findBlankRows(draftIds);

  // Non-draft appraisals are reported for visibility only, never touched.
  const others = await prisma.appraisalSubmission.findMany({
    where: { status: { not: SubmissionStatus.DRAFT } },
    select: { id: true },
  });
  const frozenBlanks = await findBlankRows(others.map((o) => o.id));

  const byDraft = new Map<string, Blank[]>();
  for (const b of blanks) {
    if (!byDraft.has(b.submissionId)) byDraft.set(b.submissionId, []);
    byDraft.get(b.submissionId)!.push(b);
  }

  console.log(`\nDatabase "${db}" — ${drafts.length} DRAFT appraisal(s) scanned.\n`);

  if (blanks.length === 0) {
    console.log('No blank rows in any draft. Nothing to do.');
  } else {
    console.log(`${blanks.length} blank row(s) across ${byDraft.size} draft(s):\n`);
    for (const [submissionId, rows] of byDraft) {
      const d = drafts.find((x) => x.id === submissionId)!;
      const delta = await scoreDelta(submissionId, rows);
      const sections = [...new Set(rows.map((r) => r.key))].sort().join(', ');
      const score = delta ? `  selfTotal ${delta.before} -> ${delta.after}` : '';
      console.log(`  ${d.user.employeeCode} (${d.user.name}) ${d.academicYear.label}: ${rows.length} row(s)${score}`);
      console.log(`      ${sections}`);
    }
  }

  if (frozenBlanks.length > 0) {
    console.log(
      `\nNote: ${frozenBlanks.length} blank row(s) also sit under submitted/reviewed appraisals.` +
        `\n      Left alone on purpose — deleting them would change an already-scored total.`,
    );
  }

  if (isDryRun) {
    console.log(`\nDRY RUN — nothing was deleted.`);
    if (blanks.length > 0) {
      console.log(`To actually delete:  npx tsx scripts/clean-blank-rows.ts --confirm=${db}\n`);
    }
    return;
  }

  if (blanks.length === 0) return;

  const byModel = new Map<string, string[]>();
  for (const b of blanks) {
    if (!byModel.has(b.model)) byModel.set(b.model, []);
    byModel.get(b.model)!.push(b.id);
  }

  const deleted = await prisma.$transaction(async (tx) => {
    let total = 0;
    for (const [model, ids] of byModel) {
      const r = await (tx as any)[model].deleteMany({ where: { id: { in: ids } } });
      total += r.count;
    }
    return total;
  });

  console.log(`\nDeleted ${deleted} blank row(s) from ${byDraft.size} draft(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
