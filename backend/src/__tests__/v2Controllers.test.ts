import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../app';

// V2 workflow (W1–W6) endpoint tests — real Express app + DB.
// Covers the controllers that were previously only smoke-tested by hand:
// cadreTarget, verification/red-list, tracking, feedback, /reports/criteria.
//
// Self-skips if the DB is unreachable or the expected users are missing, so
// `npm test` still passes on a machine without a seeded database.
//
// Verified working credentials (see memory/open-issues credential map):
//   ADMIN001 / admin123        → ADMIN
//   00CSE003 / Welcome@123     → HOD (CSE, real bulk-imported user)
//   FAC21    / faculty123       → FACULTY (seed)
const ADMIN = { code: 'ADMIN001', pw: 'admin123' };
const HOD = { code: '00CSE003', pw: 'Welcome@123' };
const FAC = { code: 'FAC21', pw: 'faculty123' };

async function login(employeeCode: string, password: string): Promise<string | null> {
  const res = await request(app).post('/api/auth/login').send({ employeeCode, password });
  return res.status === 200 ? res.body.accessToken : null;
}
const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

let ready = false;
let adminTok = '';
let hodTok = '';
let facTok = '';
let openYearId = '';

beforeAll(async () => {
  try {
    adminTok = (await login(ADMIN.code, ADMIN.pw)) ?? '';
    hodTok = (await login(HOD.code, HOD.pw)) ?? '';
    facTok = (await login(FAC.code, FAC.pw)) ?? '';
    if (!adminTok || !facTok) {
      console.warn('[v2] admin/faculty login failed — skipping V2 suite.');
      return;
    }
    const years = await request(app).get('/api/academic-years').set(bearer(adminTok));
    const open = years.body.find((y: any) => y.submissionOpen) ?? years.body[0];
    openYearId = open?.id ?? '';
    ready = !!openYearId;
    if (!hodTok) console.warn('[v2] HOD 00CSE003 login failed — HOD-scoped tests will be skipped.');
  } catch {
    console.warn('[v2] DB unreachable — skipping V2 suite.');
    ready = false;
  }
});

// ─── Auth / role gating ────────────────────────────────────────────────────
describe('V2 auth & role gating', () => {
  const noToken: Array<[string, string]> = [
    ['get', '/api/admin/cadre-targets'],
    ['post', '/api/admin/cadre-targets'],
    ['get', '/api/tracking'],
    ['get', '/api/tracking/export'],
    ['post', '/api/admin/tracking/snapshot'],
    ['get', '/api/red-list'],
    ['get', '/api/reports/criteria'],
  ];
  for (const [method, path] of noToken) {
    it(`${method.toUpperCase()} ${path} without token → 401`, async () => {
      if (!ready) return;
      const res = await (request(app) as any)[method](path);
      expect(res.status).toBe(401);
    });
  }

  const facForbidden: Array<[string, string]> = [
    ['get', '/api/admin/cadre-targets'],
    ['post', '/api/admin/cadre-targets'],
    ['post', '/api/admin/cadre-targets/seed-defaults'],
    ['get', '/api/tracking'],
    ['get', '/api/tracking/export'],
    ['post', '/api/admin/tracking/snapshot'],
    ['get', '/api/red-list'],
    ['get', '/api/reports/criteria'],
  ];
  for (const [method, path] of facForbidden) {
    it(`FACULTY ${method.toUpperCase()} ${path} → 403`, async () => {
      if (!ready) return;
      const res = await (request(app) as any)[method](path).set(bearer(facTok));
      expect(res.status).toBe(403);
    });
  }
});

// ─── W1: cadre eligibility targets (admin CRUD) ─────────────────────────────
describe('W1 cadre targets', () => {
  it('admin can list targets for the open year', async () => {
    if (!ready) return;
    const res = await request(app).get(`/api/admin/cadre-targets?academicYearId=${openYearId}`).set(bearer(adminTok));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('create → update → delete lifecycle (throwaway 99yr band)', async () => {
    if (!ready) return;
    // Self-heal: drop any leftover 99-band row from a crashed prior run so the
    // POST (which is create, not upsert) doesn't hit a P2002 duplicate.
    const existing = await request(app).get(`/api/admin/cadre-targets?academicYearId=${openYearId}`).set(bearer(adminTok));
    for (const r of existing.body.filter((x: any) => x.cadre === 'ASSISTANT_PROFESSOR' && x.minExpYears === 99)) {
      await request(app).delete(`/api/admin/cadre-targets/${r.id}`).set(bearer(adminTok));
    }
    const payload = {
      academicYearId: openYearId,
      cadre: 'ASSISTANT_PROFESSOR',
      minExpYears: 99, // unused band — avoids clobbering seeded rows (0 / 3)
      maxExpYears: null,
      totalScoreTarget: 300,
      feedbackTarget: 3.5,
      indexedCount: 1,
      minJournal: 0,
      quartileSet: null,
      ppcRule: 'DESIRABLE',
      ppcCount: 0,
    };
    const created = await request(app).post('/api/admin/cadre-targets').set(bearer(adminTok)).send(payload);
    expect(created.status).toBe(201);
    expect(created.body.id).toBeTruthy();
    const id = created.body.id;

    // Regression: a single-field PUT must NOT reset the defaulted columns.
    // (updateTargetSchema has no Zod defaults, so omitted keys are untouched.)
    const updated = await request(app)
      .put(`/api/admin/cadre-targets/${id}`)
      .set(bearer(adminTok))
      .send({ totalScoreTarget: 320 });
    expect(updated.status).toBe(200);
    expect(updated.body.totalScoreTarget).toBe(320);
    // Band + other fields preserved, not reset to defaults.
    expect(updated.body.minExpYears).toBe(99);
    expect(updated.body.maxExpYears).toBeNull();
    expect(updated.body.indexedCount).toBe(1);
    expect(updated.body.feedbackTarget).toBe(3.5);

    const del = await request(app).delete(`/api/admin/cadre-targets/${id}`).set(bearer(adminTok));
    expect(del.status).toBe(204);
  });

  it('rejects maxExpYears <= minExpYears with 400', async () => {
    if (!ready) return;
    const res = await request(app).post('/api/admin/cadre-targets').set(bearer(adminTok)).send({
      academicYearId: openYearId,
      cadre: 'PROFESSOR',
      minExpYears: 5,
      maxExpYears: 5,
      totalScoreTarget: 300,
      feedbackTarget: 3.5,
      indexedCount: 1,
      ppcRule: 'MANDATORY',
      ppcCount: 1,
    });
    expect(res.status).toBe(400);
  });

  it('rejects invalid body with 400 (zod)', async () => {
    if (!ready) return;
    const res = await request(app).post('/api/admin/cadre-targets').set(bearer(adminTok)).send({ cadre: 'NOPE' });
    expect(res.status).toBe(400);
  });

  it('update / delete of a nonexistent id → 404', async () => {
    if (!ready) return;
    const upd = await request(app).put('/api/admin/cadre-targets/does-not-exist').set(bearer(adminTok)).send({ totalScoreTarget: 1 });
    expect(upd.status).toBe(404);
    const del = await request(app).delete('/api/admin/cadre-targets/does-not-exist').set(bearer(adminTok));
    expect(del.status).toBe(404);
  });
});

// W7 per-cadre tier thresholds are covered in cadreTierController.test.ts.

// ─── W3/W5: tracking ────────────────────────────────────────────────────────
describe('W3/W5 tracking', () => {
  it('admin GET /tracking returns the segregation payload', async () => {
    if (!ready) return;
    const res = await request(app).get(`/api/tracking?academicYearId=${openYearId}`).set(bearer(adminTok));
    expect(res.status).toBe(200);
    expect(res.body.year?.id).toBe(openYearId);
    expect(typeof res.body.hasTargets).toBe('boolean');
    expect(Array.isArray(res.body.rows)).toBe(true);
    expect(res.body.aggregates).toBeTruthy();
  });

  it('admin sets a manual tier by hand and tracking reflects it', async () => {
    if (!ready) return;
    const track1 = await request(app).get(`/api/tracking?academicYearId=${openYearId}`).set(bearer(adminTok));
    const row = track1.body.rows?.[0];
    if (!row) return; // no faculty in scope
    const userId = row.faculty.id;

    const set = await request(app).put('/api/admin/faculty-tiers').set(bearer(adminTok))
      .send({ userId, academicYearId: openYearId, tier: 'T2' });
    expect(set.status).toBe(200);
    expect(set.body.tier).toBe('T2');

    const track2 = await request(app).get(`/api/tracking?academicYearId=${openYearId}`).set(bearer(adminTok));
    expect(track2.body.rows.find((r: any) => r.faculty.id === userId).tier).toBe('T2');

    // Clear it back to unassigned (restore).
    const clr = await request(app).put('/api/admin/faculty-tiers').set(bearer(adminTok))
      .send({ userId, academicYearId: openYearId, tier: null });
    expect(clr.status).toBe(200);
    const track3 = await request(app).get(`/api/tracking?academicYearId=${openYearId}`).set(bearer(adminTok));
    expect(track3.body.rows.find((r: any) => r.faculty.id === userId).tier).toBeNull();
  });

  it('non-admin cannot set a manual tier (403)', async () => {
    if (!ready || !hodTok) return;
    const res = await request(app).put('/api/admin/faculty-tiers').set(bearer(hodTok))
      .send({ userId: 'x', academicYearId: openYearId, tier: 'T1' });
    expect(res.status).toBe(403);
  });

  it('GET /proofs/overview returns per-faculty upload counts, dept-scoped', async () => {
    if (!ready) return;
    const res = await request(app).get(`/api/proofs/overview?academicYearId=${openYearId}`).set(bearer(adminTok));
    expect(res.status).toBe(200);
    expect(res.body.year?.id).toBe(openYearId);
    expect(Array.isArray(res.body.rows)).toBe(true);
    for (const r of res.body.rows) {
      expect(r.faculty?.employeeCode).toBeTruthy();
      const c = r.counts;
      // total is the sum of the three states — no proof is double-counted or lost
      expect(c.verified + c.rejected + c.pending).toBe(c.total);
    }
    // A HoD only ever sees their own department.
    if (hodTok) {
      const scoped = await request(app).get(`/api/proofs/overview?academicYearId=${openYearId}`).set(bearer(hodTok));
      expect(scoped.status).toBe(200);
      const depts = new Set(scoped.body.rows.map((r: any) => r.faculty.department?.code));
      expect(depts.size).toBeLessThanOrEqual(1);
    }
  });

  it('FACULTY cannot read the uploads overview (403)', async () => {
    if (!ready) return;
    const res = await request(app).get('/api/proofs/overview').set(bearer(facTok));
    expect(res.status).toBe(403);
  });

  it('admin GET /tracking/export?format=excel returns an xlsx buffer', async () => {
    if (!ready) return;
    const res = await request(app).get(`/api/tracking/export?academicYearId=${openYearId}&format=excel`).set(bearer(adminTok));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
  });

  it('admin GET /tracking/export (json default) returns rows', async () => {
    if (!ready) return;
    const res = await request(app).get(`/api/tracking/export?academicYearId=${openYearId}`).set(bearer(adminTok));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('HOD GET /tracking is scoped (200)', async () => {
    if (!ready || !hodTok) return;
    const res = await request(app).get(`/api/tracking?academicYearId=${openYearId}`).set(bearer(hodTok));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.rows)).toBe(true);
  });

  it('unknown academic year → 404', async () => {
    if (!ready) return;
    const res = await request(app).get('/api/tracking?academicYearId=no-such-year').set(bearer(adminTok));
    expect(res.status).toBe(404);
  });
});

// ─── W2: verification / red-list ────────────────────────────────────────────
describe('W2 verification & red-list', () => {
  it('admin GET /red-list returns an array', async () => {
    if (!ready) return;
    const res = await request(app).get('/api/red-list').set(bearer(adminTok));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('HOD GET /red-list returns an array (dept-scoped)', async () => {
    if (!ready || !hodTok) return;
    const res = await request(app).get('/api/red-list').set(bearer(hodTok));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET proofs of a nonexistent submission → 404', async () => {
    if (!ready) return;
    const res = await request(app).get('/api/appraisals/no-such-sub/proofs').set(bearer(adminTok));
    expect(res.status).toBe(404);
  });

  it('verify proof on a nonexistent submission → 404', async () => {
    if (!ready || !hodTok) return;
    const res = await request(app)
      .post('/api/appraisals/no-such-sub/proofs/verify')
      .set(bearer(hodTok))
      .send({ url: 'x', status: 'VERIFIED' });
    expect(res.status).toBe(404);
  });

  it('clear-hold on a nonexistent submission → 404', async () => {
    if (!ready) return;
    const res = await request(app).post('/api/appraisals/no-such-sub/clear-hold').set(bearer(adminTok));
    expect(res.status).toBe(404);
  });
});

// ─── W6: annual HoD feedback ────────────────────────────────────────────────
describe('W6 feedback', () => {
  it('GET feedback of a nonexistent submission → 404', async () => {
    if (!ready) return;
    const res = await request(app).get('/api/appraisals/no-such-sub/feedback').set(bearer(adminTok));
    expect(res.status).toBe(404);
  });

  it('save feedback on a nonexistent submission → 404', async () => {
    if (!ready) return;
    const res = await request(app)
      .put('/api/appraisals/no-such-sub/feedback')
      .set(bearer(adminTok))
      .send({ strengths: 'x' });
    expect(res.status).toBe(404);
  });

  it('FACULTY cannot save feedback (roleGuard) → 403', async () => {
    if (!ready) return;
    const res = await request(app)
      .put('/api/appraisals/whatever/feedback')
      .set(bearer(facTok))
      .send({ strengths: 'x' });
    expect(res.status).toBe(403);
  });
});

// ─── A1–A3: criteria report ─────────────────────────────────────────────────
describe('reports/criteria', () => {
  it('admin GET /reports/criteria returns ranked rows', async () => {
    if (!ready) return;
    const res = await request(app).get(`/api/reports/criteria?academicYearId=${openYearId}`).set(bearer(adminTok));
    expect(res.status).toBe(200);
    expect(res.body.year?.id).toBe(openYearId);
    expect(Array.isArray(res.body.rows)).toBe(true);
  });

  it('HOD GET /reports/criteria is dept-scoped (200)', async () => {
    if (!ready || !hodTok) return;
    const res = await request(app).get(`/api/reports/criteria?academicYearId=${openYearId}`).set(bearer(hodTok));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.rows)).toBe(true);
  });
});

// getDeptReport / exportReport used to read ?dept straight from the query with no
// ownership check: a HoD could pass a foreign dept id (cross-dept read), and the
// no-filter default returned EVERY department. Now a HoD is hard-scoped to their
// own dept(s); admin keeps the optional filter.
describe('reports/department dept-scope', () => {
  const bogus = '00000000-0000-0000-0000-000000000000';

  it('HoD report ignores a foreign ?dept — no cross-dept leak, no all-dept spill', async () => {
    if (!ready || !hodTok) return;
    const own = await request(app).get('/api/reports/department').set(bearer(hodTok));
    const injected = await request(app).get(`/api/reports/department?dept=${bogus}`).set(bearer(hodTok));
    expect(own.status).toBe(200);
    expect(injected.status).toBe(200);
    // ?dept is ignored for a HoD → identical result set (pre-fix the bogus dept
    // filter returned [], and an unfiltered call spilled all departments).
    expect(injected.body.length).toBe(own.body.length);
    // A HoD only ever sees their own single department.
    const deptIds = new Set(own.body.map((r: any) => r.submission.user.departmentId));
    expect(deptIds.size).toBeLessThanOrEqual(1);
  });

  it('admin report still honours an explicit dept filter', async () => {
    if (!ready) return;
    const filtered = await request(app).get(`/api/reports/department?dept=${bogus}`).set(bearer(adminTok));
    expect(filtered.status).toBe(200);
    // Admin has no own-dept scoping, so a bogus filter is honoured → empty.
    expect(filtered.body.length).toBe(0);
  });
});
