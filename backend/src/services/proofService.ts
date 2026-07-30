import prisma from '../utils/prismaClient';

// Proof-bearing category rows and how to label them. The section map is derived
// from these on demand — proofs are plain URL strings (uploaded file OR pasted
// link, e.g. Google Drive) held on the category rows, so both are handled the
// same way here.
type Source = {
  key: string;
  section: string;
  title: (r: any) => string | undefined | null;
  fields: [string, string][]; // [rowField, humanLabel]
};

const PROOF_SOURCES: Source[] = [
  { key: 'cat1EContent', section: '1.5 e-Content', title: (r) => r.contentName || r.courseName, fields: [['evidenceFile', 'Evidence']] },
  { key: 'cat1ICT', section: '1.6 ICT Tools', title: (r) => r.platform || r.courseName, fields: [['evidenceFile', 'Evidence']] },
  { key: 'cat2Journals', section: '2.1 Journals', title: (r) => r.title, fields: [['proofFile', 'Proof'], ['indexProofFile', 'Index proof']] },
  { key: 'cat2Conferences', section: '2.1 Conferences', title: (r) => r.title, fields: [['proofFile', 'Proof']] },
  { key: 'cat2ConfBookChapters', section: '2.1-C Conference Book Chapters', title: (r) => r.title, fields: [['proofFile', 'Proof']] },
  { key: 'cat2BookChapters', section: '2.3 Book Chapters', title: (r) => r.title, fields: [['proofFile', 'Proof']] },
  { key: 'cat2Books', section: '2.3 Books', title: (r) => r.title, fields: [['proofFile', 'Proof']] },
  { key: 'cat2Patents', section: '2.5 Patents / IPR', title: (r) => r.title, fields: [['proofFile', 'Proof']] },
  { key: 'cat2Projects', section: '2.6 Projects', title: (r) => r.title, fields: [['proofFile', 'Proof']] },
  { key: 'cat3Training', section: '3 Training', title: (r) => r.name, fields: [['proofFile', 'Proof']] },
  { key: 'cat5Awards', section: '5 Awards', title: (r) => r.awardType, fields: [['proofFile', 'Proof']] },
];

// Relations needed to enumerate proofs.
export const PROOF_INCLUDE = {
  cat1EContent: true,
  cat1ICT: true,
  cat2Journals: true,
  cat2Conferences: true,
  cat2ConfBookChapters: true,
  cat2BookChapters: true,
  cat2Books: true,
  cat2Patents: true,
  cat2Projects: true,
  cat3Training: true,
  cat5Awards: true,
} as const;

export interface ProofItem {
  section: string;
  item: string;
  field: string;
  url: string;
}

// Walk a submission (loaded with PROOF_INCLUDE) and collect every proof URL.
export function enumerateProofs(sub: any): ProofItem[] {
  const items: ProofItem[] = [];
  for (const src of PROOF_SOURCES) {
    const rows = sub[src.key];
    if (!rows) continue;
    const list = Array.isArray(rows) ? rows : [rows];
    for (const r of list) {
      for (const [rowField, label] of src.fields) {
        const url = r[rowField];
        if (typeof url === 'string' && url.trim()) {
          items.push({ section: src.section, item: (src.title(r) || '(untitled)').toString(), field: label, url: url.trim() });
        }
      }
    }
  }
  return items;
}

// Reconcile ProofVerification rows with the submission's current proofs:
// create PENDING rows for new URLs, refresh section/item/field on existing
// ones (keeping their verification status), and prune rows whose URL is gone.
// Returns the fresh set of rows.
export async function syncProofVerifications(submissionId: string) {
  const sub = await prisma.appraisalSubmission.findUnique({
    where: { id: submissionId },
    include: PROOF_INCLUDE,
  });
  if (!sub) return [];

  const items = enumerateProofs(sub);
  const currentUrls = new Set(items.map((i) => i.url));
  const existing = await prisma.proofVerification.findMany({ where: { submissionId } });
  const existingByUrl = new Map(existing.map((e) => [e.url, e]));

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const prev = existingByUrl.get(item.url);
      if (prev) {
        if (prev.section !== item.section || prev.item !== item.item || prev.field !== item.field) {
          await tx.proofVerification.update({
            where: { id: prev.id },
            data: { section: item.section, item: item.item, field: item.field },
          });
        }
      } else {
        await tx.proofVerification.create({
          data: { submissionId, section: item.section, item: item.item, field: item.field, url: item.url },
        });
      }
    }
    // Prune proofs that were removed/replaced.
    const stale = existing.filter((e) => !currentUrls.has(e.url));
    if (stale.length) {
      await tx.proofVerification.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
    }
  });

  return prisma.proofVerification.findMany({
    where: { submissionId },
    orderBy: [{ section: 'asc' }, { item: 'asc' }],
    include: { verifiedBy: { select: { id: true, name: true } } },
  });
}

// Gate: true when the submission has no unverified proof. Syncs first so a
// newly-added proof can't slip through. Zero proofs = vacuously verified.
export async function allProofsVerified(submissionId: string): Promise<boolean> {
  const rows = await syncProofVerifications(submissionId);
  return rows.every((r) => r.status === 'VERIFIED');
}
