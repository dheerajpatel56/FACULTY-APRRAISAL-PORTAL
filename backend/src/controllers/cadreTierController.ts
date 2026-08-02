import { Request, Response } from 'express';
import { z } from 'zod';
import { Cadre, Tier } from '@prisma/client';
import prisma from '../utils/prismaClient';
import { TIER_CRITERIA, defaultTierCriteria, type TierCriteria } from '../services/tierEngine';
import type { CadreTargetRow } from '../services/cadreEngine';

// W7 — per-cadre tier thresholds (admin only). Each (academicYear, cadre, tier)
// cell holds a flat per-criterion { enabled, value } map; the tier engine
// (assignCadreTier) assigns the highest tier whose enabled criteria all pass.

const criterionSchema = z.object({ enabled: z.boolean(), value: z.number() });

// A criteria payload lists any subset of the 7 catalog metrics; absent ones are
// treated as disabled. Unknown keys are rejected.
const criteriaSchema = z
  .object(Object.fromEntries(TIER_CRITERIA.map((c) => [c, criterionSchema.optional()])) as Record<
    (typeof TIER_CRITERIA)[number],
    z.ZodOptional<typeof criterionSchema>
  >)
  .strict();

const upsertSchema = z.object({
  academicYearId: z.string().min(1),
  cadre: z.nativeEnum(Cadre),
  tier: z.nativeEnum(Tier),
  criteria: criteriaSchema,
});

// GET /admin/cadre-tiers?academicYearId=...
export async function listCadreTiers(req: Request, res: Response) {
  const academicYearId = typeof req.query.academicYearId === 'string' ? req.query.academicYearId : undefined;
  const rows = await prisma.cadreTierThreshold.findMany({
    where: academicYearId ? { academicYearId } : undefined,
    orderBy: [{ cadre: 'asc' }, { tier: 'asc' }],
  });
  return res.json(rows);
}

// PUT /admin/cadre-tiers — upsert one (AY, cadre, tier) cell.
export async function upsertCadreTier(req: Request, res: Response) {
  const { academicYearId, cadre, tier, criteria } = upsertSchema.parse(req.body);

  const year = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
  if (!year) return res.status(404).json({ error: 'Academic year not found' });

  const row = await prisma.cadreTierThreshold.upsert({
    where: { academicYearId_cadre_tier: { academicYearId, cadre, tier } },
    create: { academicYearId, cadre, tier, criteria: criteria as any },
    update: { criteria: criteria as any },
  });
  return res.json(row);
}

// DELETE /admin/cadre-tiers/:id
export async function deleteCadreTier(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.cadreTierThreshold.delete({ where: { id } });
  return res.status(204).send();
}

// POST /admin/cadre-tiers/seed-defaults  { academicYearId }
// For every cadre that has a CadreTarget row, upsert T1/T2/T3 cells defaulted
// from that cadre's ENTRY band (smallest minExpYears). Idempotent. Cadres with
// no target row are skipped and reported.
export async function seedDefaultCadreTiers(req: Request, res: Response) {
  const { academicYearId } = z.object({ academicYearId: z.string().min(1) }).parse(req.body);

  const year = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
  if (!year) return res.status(404).json({ error: 'Academic year not found' });

  const targets = await prisma.cadreTarget.findMany({ where: { academicYearId } });

  // Entry band (smallest minExpYears) per cadre supplies the default values.
  const baseByCadre = new Map<Cadre, CadreTargetRow>();
  for (const t of targets) {
    const cur = baseByCadre.get(t.cadre);
    if (!cur || t.minExpYears < cur.minExpYears) baseByCadre.set(t.cadre, t as CadreTargetRow);
  }

  const tiers: Tier[] = [Tier.T1, Tier.T2, Tier.T3];
  const ops: ReturnType<typeof prisma.cadreTierThreshold.upsert>[] = [];
  for (const [cadre, base] of baseByCadre) {
    const criteria: TierCriteria = defaultTierCriteria(base);
    for (const tier of tiers) {
      ops.push(
        prisma.cadreTierThreshold.upsert({
          where: { academicYearId_cadre_tier: { academicYearId, cadre, tier } },
          create: { academicYearId, cadre, tier, criteria: criteria as any },
          update: { criteria: criteria as any },
        })
      );
    }
  }

  const rows = await prisma.$transaction(ops);
  const seededCadres = [...baseByCadre.keys()];
  const skippedCadres = Object.values(Cadre).filter((c) => !baseByCadre.has(c));
  return res.status(201).json({ rows, seededCadres, skippedCadres });
}
