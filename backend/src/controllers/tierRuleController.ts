import { Request, Response } from 'express';
import { z } from 'zod';
import { Tier } from '@prisma/client';
import prisma from '../utils/prismaClient';

// Criteria catalog — the target-table metrics a tier rule can test. The W3
// tier engine computes an actual value for each of these per faculty. Keep in
// sync with the frontend builder (AdminTierRulesPage).
export const TIER_CRITERIA = [
  'totalScore',
  'feedback',
  'indexedCount',
  'journalCount',
  'patentCount',
  'projectCount',
  'consultancyCount',
] as const;

const OPS = ['GTE', 'GT', 'LTE', 'LT', 'EQ'] as const;

const predicateSchema = z.object({
  kind: z.literal('predicate'),
  criterion: z.enum(TIER_CRITERIA),
  op: z.enum(OPS),
  value: z.number(),
});

// Recursive AND/OR group. Root of an expression must be a group.
type Node = z.infer<typeof predicateSchema> | { kind: 'group'; op: 'AND' | 'OR'; children: Node[] };
const nodeSchema: z.ZodType<Node> = z.lazy(() => z.union([predicateSchema, groupSchema]));
const groupSchema: z.ZodType<{ kind: 'group'; op: 'AND' | 'OR'; children: Node[] }> = z.object({
  kind: z.literal('group'),
  op: z.enum(['AND', 'OR']),
  children: z.array(nodeSchema).min(1, 'A group needs at least one condition'),
});

const upsertSchema = z.object({
  academicYearId: z.string().min(1),
  tier: z.nativeEnum(Tier),
  expression: groupSchema,
});

// GET /admin/tier-rules?academicYearId=...
export async function listTierRules(req: Request, res: Response) {
  const academicYearId = typeof req.query.academicYearId === 'string' ? req.query.academicYearId : undefined;
  const rules = await prisma.tierRule.findMany({
    where: academicYearId ? { academicYearId } : undefined,
    orderBy: { tier: 'asc' },
  });
  return res.json(rules);
}

// PUT /admin/tier-rules  { academicYearId, tier, expression } — upsert by (AY, tier)
export async function upsertTierRule(req: Request, res: Response) {
  const { academicYearId, tier, expression } = upsertSchema.parse(req.body);

  const year = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
  if (!year) return res.status(404).json({ error: 'Academic year not found' });

  const rule = await prisma.tierRule.upsert({
    where: { academicYearId_tier: { academicYearId, tier } },
    create: { academicYearId, tier, expression },
    update: { expression },
  });
  return res.json(rule);
}

// DELETE /admin/tier-rules/:id
export async function deleteTierRule(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.tierRule.delete({ where: { id } });
  return res.status(204).send();
}
