import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import prisma from '../utils/prismaClient';

// Departments are isolated. A HoD or reviewer holds that role only in the
// department they belong to. Cross-department authority belongs to the dean
// (ADMIN) and to dean-level final reviewers, who are assigned per submission
// through the final-review layer rather than by a standing role.

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
async function login(code: string, pw: string) {
  const r = await request(app).post('/api/auth/login').send({ employeeCode: code, password: pw });
  return r.status === 200 ? r.body.accessToken : '';
}

let ready = false;
let adminTok = '';
let cseFacultyId = '';
let cseDeptId = '';
let otherDeptId = '';
const created: string[] = [];
let tempDeptId = '';

beforeAll(async () => {
  try {
    adminTok = await login('ADMIN001', 'admin123');
    if (!adminTok) return;
    const fac = await prisma.user.findUnique({ where: { employeeCode: 'FAC11' } });
    if (!fac?.departmentId) return;
    cseFacultyId = fac.id;
    cseDeptId = fac.departmentId;

    // Only one department is active in this database, so create a throwaway
    // second one rather than skipping — an earlier version of this test looked
    // for another active department, found none, and passed without asserting
    // anything at all.
    const tmp = await prisma.department.create({
      data: { name: 'Isolation Test Dept', code: `ISO${Date.now() % 100000}`, isActive: true },
    });
    otherDeptId = tmp.id;
    tempDeptId = tmp.id;
    ready = true;
  } catch { ready = false; }
});

afterAll(async () => {
  if (created.length) await prisma.userRole.deleteMany({ where: { id: { in: created } } });
  if (tempDeptId) {
    await prisma.userRole.deleteMany({ where: { departmentId: tempDeptId } });
    await prisma.department.deleteMany({ where: { id: tempDeptId } });
  }
});

describe('role assignment respects department isolation', () => {
  it('has a working fixture (guards against a vacuous pass)', () => {
    expect(ready).toBe(true);
    expect(otherDeptId).not.toBe('');
    expect(otherDeptId).not.toBe(cseDeptId);
  });

  it('refuses a REVIEWER role in another department', async () => {
    if (!ready) return;
    const res = await request(app)
      .post(`/api/admin/users/${cseFacultyId}/roles`)
      .set(bearer(adminTok))
      .send({ role: 'REVIEWER', departmentId: otherDeptId });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/isolated|own department/i);
  });

  it('refuses a HOD role in another department', async () => {
    if (!ready) return;
    const res = await request(app)
      .post(`/api/admin/users/${cseFacultyId}/roles`)
      .set(bearer(adminTok))
      .send({ role: 'HOD', departmentId: otherDeptId });
    expect(res.status).toBe(400);
  });

  it('allows the role in the user\'s own department', async () => {
    if (!ready) return;
    const res = await request(app)
      .post(`/api/admin/users/${cseFacultyId}/roles`)
      .set(bearer(adminTok))
      .send({ role: 'REVIEWER', departmentId: cseDeptId });
    expect([200, 201]).toContain(res.status);
    const row = await prisma.userRole.findFirst({
      where: { userId: cseFacultyId, role: 'REVIEWER', departmentId: cseDeptId },
    });
    expect(row).toBeTruthy();
    if (row) created.push(row.id);
  });

  it('leaves the dean-level final-review layer alone — it is the sanctioned cross-department path', async () => {
    if (!ready) return;
    // Final reviewers are rows on FinalReview, not UserRole, so isolation of
    // standing roles does not constrain them.
    const anyRoleForOtherDept = await prisma.userRole.count({
      where: { userId: cseFacultyId, departmentId: otherDeptId, isActive: true },
    });
    expect(anyRoleForOtherDept).toBe(0);
  });
});
