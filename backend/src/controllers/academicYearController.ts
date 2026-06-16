import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prismaClient';

const createYearSchema = z.object({
  label: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  submissionOpen: z.boolean().default(false),
  maxSubmissions: z.number().default(4),
});

export async function listAcademicYears(_req: Request, res: Response) {
  const years = await prisma.academicYear.findMany({ orderBy: { startDate: 'desc' } });
  return res.json(years);
}

export async function createAcademicYear(req: Request, res: Response) {
  const data = createYearSchema.parse(req.body);
  const year = await prisma.academicYear.create({
    data: {
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    },
  });
  return res.status(201).json(year);
}

export async function updateAcademicYear(req: Request, res: Response) {
  const { id } = req.params;
  const data = createYearSchema.partial().parse(req.body);
  const year = await prisma.academicYear.update({
    where: { id },
    data: {
      ...data,
      ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
      ...(data.endDate ? { endDate: new Date(data.endDate) } : {}),
    },
  });
  return res.json(year);
}
