import { Request, Response } from 'express';
import prisma from '../utils/prismaClient';

const startTime = Date.now();

// Liveness — process is up. Never touches DB (fast, for k8s livenessProbe).
export function health(_req: Request, res: Response) {
  return res.json({
    status: 'ok',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
}

// Readiness — can serve traffic (DB reachable). For k8s readinessProbe.
export async function ready(_req: Request, res: Response) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: 'ready', db: 'up' });
  } catch (e: any) {
    // Log the detail server-side; the response stays generic so a probe cannot
    // leak DB host/driver internals to an unauthenticated caller.
    console.error('[health] readiness DB check failed:', e?.message ?? e);
    return res.status(503).json({ status: 'not_ready', db: 'down' });
  }
}
