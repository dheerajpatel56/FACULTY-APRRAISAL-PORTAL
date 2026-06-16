import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation error', details: (err as any).issues ?? (err as any).errors });
  }

  // Prisma known request errors → clean 400s
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const fields = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      return res.status(400).json({ error: `Duplicate value — ${fields} already exists` });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Record not found' });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid reference — related record does not exist' });
    }
  }

  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
};
