import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prismaClient';

export const reviewerGuard = async (req: Request, res: Response, next: NextFunction) => {
  const submissionId = req.params.id;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: 'Unauthenticated' });

  const submission = await prisma.appraisalSubmission.findUnique({
    where: { id: submissionId },
    select: { userId: true },
  });

  if (!submission) return res.status(404).json({ error: 'Submission not found' });

  if (submission.userId === userId) {
    return res.status(403).json({ error: 'Cannot review your own submission' });
  }

  next();
};
