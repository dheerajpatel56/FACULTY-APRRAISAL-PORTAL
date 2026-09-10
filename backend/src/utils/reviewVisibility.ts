import { RoleType } from '@prisma/client';

/**
 * Who may see the reviewer's own assessment of a faculty member.
 *
 * An appraisal carries two halves. Categories 1-5 and the total out of 500 are
 * the faculty's score and they are entitled to it. Category 6 (core values) and
 * the /550 grand total are the reviewer's assessment OF them, and belong to the
 * HoD and the dean.
 *
 * The check is on OWNERSHIP, not role. Every HoD files their own appraisal, and
 * a role-only test ("is this caller a reviewer anywhere?") hands them the
 * core-values marks recorded against themselves. Nobody sees the reviewer's
 * assessment of their own appraisal, whatever else they are.
 *
 * This lives in one place because the rule was previously restated at each
 * endpoint and the copies drifted — the PDF kept printing Cat 6 and the grand
 * total for owners long after the JSON stopped.
 */

// Fields that carry the reviewer's assessment of the person, not their score.
export const REVIEWER_ASSESSMENT_FIELDS = [
  'cat6Punctuality',
  'cat6Professionalism',
  'cat6Willingness',
  'cat6Cordiality',
  'cat6Classroom',
  'grandTotal',
] as const;

type Viewer = { id: string; roles: { role: RoleType }[] };

/** True when this caller must be shown the faculty's view of the appraisal. */
export function isOwnerView(viewer: Viewer, ownerId: string): boolean {
  if (viewer.id === ownerId) return true;
  return !viewer.roles.some((r) =>
    ([RoleType.ADMIN, RoleType.HOD, RoleType.REVIEWER] as RoleType[]).includes(r.role),
  );
}

/** The same review with the reviewer's assessment of the person removed. */
export function stripReviewerAssessment<T extends Record<string, any> | null>(review: T): T {
  if (!review) return review;
  const out: Record<string, any> = { ...review };
  for (const f of REVIEWER_ASSESSMENT_FIELDS) delete out[f];
  return out as T;
}
