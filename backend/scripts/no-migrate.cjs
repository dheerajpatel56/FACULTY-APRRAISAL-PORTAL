#!/usr/bin/env node
/**
 * Guard for `npm run prisma:migrate`.
 *
 * This project's dev schema has drifted from its migration history — several
 * models and columns (proofFile, emailOptIn, indexes, FacultyTier, FinalReview,
 * CadreTierThreshold, ...) were applied with `prisma db push` and were never
 * written as migrations. `prisma migrate dev` detects that drift and offers to
 * reset the database, which would destroy the 73 real bulk-imported VNRVJIET
 * faculty accounts along with every appraisal, proof and snapshot in dev.
 *
 * Use `npm run prisma:push` instead.
 */
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.error(`
${RED}BLOCKED: prisma migrate dev is disabled on this project.${RESET}

  The dev schema has drifted from the migration history, so 'migrate dev'
  will ask to RESET the database. That wipes the real bulk-imported faculty
  accounts and every appraisal in dev. There is no backup.

${YELLOW}  Use this instead:${RESET}

      npm run prisma:push          # prisma db push - the supported path here

  If you genuinely need to rebuild the migration history, do it deliberately
  against a throwaway database, never against dev.
`);
process.exit(1);
