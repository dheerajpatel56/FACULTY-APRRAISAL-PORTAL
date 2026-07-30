import { Request, Response } from 'express';
import { z } from 'zod';
import { Cadre, PpcRule } from '@prisma/client';
import prisma from '../utils/prismaClient';

// FAPA AY2025-26 cadre-eligibility defaults. Assistant Professor splits into two
// experience bands (< 3 yr / >= 3 yr); every other cadre has a single band.
const FAPA_DEFAULTS: Array<{
  cadre: Cadre;
  minExpYears: number;
  maxExpYears: number | null;
  totalScoreTarget: number;
  feedbackTarget: number;
  indexedCount: number;
  minJournal: number;
  quartileSet: string | null;
  ppcRule: PpcRule;
  ppcCount: number;
}> = [
  { cadre: Cadre.ASSISTANT_PROFESSOR, minExpYears: 0, maxExpYears: 3, totalScoreTarget: 325, feedbackTarget: 3.5, indexedCount: 2, minJournal: 0, quartileSet: null, ppcRule: PpcRule.DESIRABLE, ppcCount: 1 },
  { cadre: Cadre.ASSISTANT_PROFESSOR, minExpYears: 3, maxExpYears: null, totalScoreTarget: 350, feedbackTarget: 3.5, indexedCount: 2, minJournal: 1, quartileSet: null, ppcRule: PpcRule.DESIRABLE, ppcCount: 1 },
  { cadre: Cadre.SR_ASSISTANT_PROFESSOR, minExpYears: 0, maxExpYears: null, totalScoreTarget: 350, feedbackTarget: 3.5, indexedCount: 3, minJournal: 2, quartileSet: null, ppcRule: PpcRule.MANDATORY, ppcCount: 1 },
  { cadre: Cadre.ASSOCIATE_PROFESSOR, minExpYears: 0, maxExpYears: null, totalScoreTarget: 375, feedbackTarget: 3.5, indexedCount: 3, minJournal: 2, quartileSet: 'Q1-Q4', ppcRule: PpcRule.MANDATORY, ppcCount: 2 },
  { cadre: Cadre.PROFESSOR, minExpYears: 0, maxExpYears: null, totalScoreTarget: 375, feedbackTarget: 3.5, indexedCount: 3, minJournal: 2, quartileSet: 'Q1-Q3', ppcRule: PpcRule.MANDATORY, ppcCount: 2 },
];

const targetSchema = z.object({
  academicYearId: z.string().min(1),
  cadre: z.nativeEnum(Cadre),
  minExpYears: z.number().min(0).default(0),
  maxExpYears: z.number().min(0).nullable().default(null),
  totalScoreTarget: z.number().min(0),
  feedbackTarget: z.number().min(0),
  indexedCount: z.number().int().min(0),
  minJournal: z.number().int().min(0).default(0),
  quartileSet: z.string().nullable().default(null),
  ppcRule: z.nativeEnum(PpcRule),
  ppcCount: z.number().int().min(0),
});

// GET /admin/cadre-targets?academicYearId=...
export async function listCadreTargets(req: Request, res: Response) {
  const academicYearId = typeof req.query.academicYearId === 'string' ? req.query.academicYearId : undefined;
  const targets = await prisma.cadreTarget.findMany({
    where: academicYearId ? { academicYearId } : undefined,
    orderBy: [{ cadre: 'asc' }, { minExpYears: 'asc' }],
  });
  return res.json(targets);
}

// POST /admin/cadre-targets
export async function createCadreTarget(req: Request, res: Response) {
  const data = targetSchema.parse(req.body);
  if (data.maxExpYears !== null && data.maxExpYears <= data.minExpYears) {
    return res.status(400).json({ error: 'maxExpYears must be greater than minExpYears' });
  }
  const target = await prisma.cadreTarget.create({ data });
  return res.status(201).json(target);
}

// PUT /admin/cadre-targets/:id
export async function updateCadreTarget(req: Request, res: Response) {
  const { id } = req.params;
  const data = targetSchema.partial().parse(req.body);
  const min = data.minExpYears;
  const max = data.maxExpYears;
  if (max !== null && max !== undefined && min !== undefined && max <= min) {
    return res.status(400).json({ error: 'maxExpYears must be greater than minExpYears' });
  }
  const target = await prisma.cadreTarget.update({ where: { id }, data });
  return res.json(target);
}

// DELETE /admin/cadre-targets/:id
export async function deleteCadreTarget(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.cadreTarget.delete({ where: { id } });
  return res.status(204).send();
}

// POST /admin/cadre-targets/seed-defaults  { academicYearId }
// Idempotent upsert of the FAPA default rows for the given AY. Existing rows
// (matched on academicYearId+cadre+minExpYears) are refreshed to the defaults.
export async function seedDefaultCadreTargets(req: Request, res: Response) {
  const { academicYearId } = z.object({ academicYearId: z.string().min(1) }).parse(req.body);

  const year = await prisma.academicYear.findUnique({ where: { id: academicYearId } });
  if (!year) return res.status(404).json({ error: 'Academic year not found' });

  const rows = await prisma.$transaction(
    FAPA_DEFAULTS.map((d) =>
      prisma.cadreTarget.upsert({
        where: { academicYearId_cadre_minExpYears: { academicYearId, cadre: d.cadre, minExpYears: d.minExpYears } },
        create: { academicYearId, ...d },
        update: { ...d },
      })
    )
  );
  return res.status(201).json(rows);
}
