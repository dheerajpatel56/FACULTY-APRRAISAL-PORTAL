import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app';

// W7 — per-cadre tier threshold endpoints (admin only). Real app + DB.
// Self-skips if the DB is unreachable or admin login fails.
const ADMIN = { code: 'ADMIN001', pw: 'admin123' };
const FAC = { code: 'FAC21', pw: 'faculty123' };

async function login(employeeCode: string, password: string): Promise<string | null> {
  const res = await request(app).post('/api/auth/login').send({ employeeCode, password });
  return res.status === 200 ? res.body.accessToken : null;
}
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

let ready = false;
let adminTok = '';
let facTok = '';
let yearId = '';

async function listCells() {
  const res = await request(app).get(`/api/admin/cadre-tiers?academicYearId=${yearId}`).set(bearer(adminTok));
  return res.body as Array<{ id: string; cadre: string; tier: string; criteria: any }>;
}
async function deleteAllCells() {
  for (const c of await listCells()) {
    await request(app).delete(`/api/admin/cadre-tiers/${c.id}`).set(bearer(adminTok));
  }
}

beforeAll(async () => {
  try {
    adminTok = (await login(ADMIN.code, ADMIN.pw)) ?? '';
    facTok = (await login(FAC.code, FAC.pw)) ?? '';
    if (!adminTok || !facTok) return;
    const years = await request(app).get('/api/academic-years').set(bearer(adminTok));
    const open = years.body.find((y: any) => y.submissionOpen) ?? years.body[0];
    yearId = open?.id ?? '';
    ready = !!yearId;
  } catch {
    ready = false;
  }
});

describe('W7 cadre-tiers gating', () => {
  const routes: Array<[string, string]> = [
    ['get', '/api/admin/cadre-tiers'],
    ['put', '/api/admin/cadre-tiers'],
    ['post', '/api/admin/cadre-tiers/seed-defaults'],
    ['delete', '/api/admin/cadre-tiers/some-id'],
  ];
  for (const [m, p] of routes) {
    it(`${m.toUpperCase()} ${p} without token → 401`, async () => {
      if (!ready) return;
      const res = await (request(app) as any)[m](p);
      expect(res.status).toBe(401);
    });
    it(`FACULTY ${m.toUpperCase()} ${p} → 403`, async () => {
      if (!ready) return;
      const res = await (request(app) as any)[m](p).set(bearer(facTok));
      expect(res.status).toBe(403);
    });
  }
});

describe('W7 cadre-tiers upsert', () => {
  it('admin lists cells (array)', async () => {
    if (!ready) return;
    const res = await request(app).get(`/api/admin/cadre-tiers?academicYearId=${yearId}`).set(bearer(adminTok));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('upsert one cell → echoes cadre/tier/criteria, then delete', async () => {
    if (!ready) return;
    const criteria = {
      totalScore: { enabled: true, value: 400 },
      feedback: { enabled: true, value: 4 },
      patentCount: { enabled: false, value: 0 },
    };
    const up = await request(app)
      .put('/api/admin/cadre-tiers')
      .set(bearer(adminTok))
      .send({ academicYearId: yearId, cadre: 'PROFESSOR', tier: 'T1', criteria });
    expect(up.status).toBe(200);
    expect(up.body.cadre).toBe('PROFESSOR');
    expect(up.body.tier).toBe('T1');
    expect(up.body.criteria).toEqual(criteria);

    // Upsert again (same key) updates rather than duplicating.
    const up2 = await request(app)
      .put('/api/admin/cadre-tiers')
      .set(bearer(adminTok))
      .send({ academicYearId: yearId, cadre: 'PROFESSOR', tier: 'T1', criteria: { totalScore: { enabled: true, value: 450 } } });
    expect(up2.status).toBe(200);
    expect(up2.body.id).toBe(up.body.id);
    expect(up2.body.criteria).toEqual({ totalScore: { enabled: true, value: 450 } });

    const del = await request(app).delete(`/api/admin/cadre-tiers/${up.body.id}`).set(bearer(adminTok));
    expect(del.status).toBe(204);
  });

  it('unknown academic year → 404', async () => {
    if (!ready) return;
    const res = await request(app)
      .put('/api/admin/cadre-tiers')
      .set(bearer(adminTok))
      .send({ academicYearId: 'no-such-year', cadre: 'PROFESSOR', tier: 'T1', criteria: { totalScore: { enabled: true, value: 1 } } });
    expect(res.status).toBe(404);
  });

  it('rejects an unknown criterion key → 400 (strict)', async () => {
    if (!ready) return;
    const res = await request(app)
      .put('/api/admin/cadre-tiers')
      .set(bearer(adminTok))
      .send({ academicYearId: yearId, cadre: 'PROFESSOR', tier: 'T1', criteria: { bogusMetric: { enabled: true, value: 1 } } });
    expect(res.status).toBe(400);
  });

  it('rejects a malformed criterion shape → 400', async () => {
    if (!ready) return;
    const res = await request(app)
      .put('/api/admin/cadre-tiers')
      .set(bearer(adminTok))
      .send({ academicYearId: yearId, cadre: 'PROFESSOR', tier: 'T1', criteria: { totalScore: { enabled: 'yes' } } });
    expect(res.status).toBe(400);
  });
});

describe('W7 seed-defaults → tracking', () => {
  it('seeds cadre×tier cells from targets and drives tracking, then cleans up', async () => {
    if (!ready) return;
    const before = await listCells();

    const seed = await request(app)
      .post('/api/admin/cadre-tiers/seed-defaults')
      .set(bearer(adminTok))
      .send({ academicYearId: yearId });
    expect(seed.status).toBe(201);
    expect(Array.isArray(seed.body.rows)).toBe(true);
    expect(Array.isArray(seed.body.seededCadres)).toBe(true);

    if (seed.body.seededCadres.length > 0) {
      // Each seeded cadre gets 3 tier cells; defaults enable totalScore.
      const cells = await listCells();
      expect(cells.length).toBe(seed.body.seededCadres.length * 3);
      const sample = cells[0];
      expect(sample.criteria.totalScore.enabled).toBe(true);

      // Tracking now reports tier rules present.
      const track = await request(app).get(`/api/tracking?academicYearId=${yearId}`).set(bearer(adminTok));
      expect(track.status).toBe(200);
      expect(track.body.hasTierRules).toBe(true);
    }

    // Restore prior state (the table started empty in dev) to avoid leaking config.
    await deleteAllCells();
    if (before.length === 0) {
      expect((await listCells()).length).toBe(0);
    }
  });
});
