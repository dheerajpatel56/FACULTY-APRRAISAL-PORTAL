import { describe, it, expect } from 'vitest';
import { canViewUserResource } from './access';

const u = (id: string, roles: any[] = []) => ({ id, roles });
const OWNER = 'owner';
const DEPT = 'dept-cse';

describe('canViewUserResource — object-level authz (IDOR guard)', () => {
  it('owner sees own resource', () => {
    expect(canViewUserResource(u(OWNER), OWNER, DEPT)).toBe(true);
  });
  it('admin sees any resource', () => {
    expect(canViewUserResource(u('a', [{ role: 'ADMIN', departmentId: null }]), OWNER, DEPT)).toBe(true);
  });
  it('HoD/Reviewer of same dept sees it', () => {
    expect(canViewUserResource(u('h', [{ role: 'HOD', departmentId: DEPT }]), OWNER, DEPT)).toBe(true);
    expect(canViewUserResource(u('r', [{ role: 'REVIEWER', departmentId: DEPT }]), OWNER, DEPT)).toBe(true);
  });
  it('HoD/Reviewer of another dept is denied', () => {
    expect(canViewUserResource(u('h', [{ role: 'HOD', departmentId: 'dept-ece' }]), OWNER, DEPT)).toBe(false);
  });
  it('unrelated faculty is denied (IDOR case)', () => {
    expect(canViewUserResource(u('x', [{ role: 'FACULTY', departmentId: DEPT }]), OWNER, DEPT)).toBe(false);
  });
  it('null departments do not match', () => {
    expect(canViewUserResource(u('h', [{ role: 'HOD', departmentId: null }]), OWNER, null)).toBe(false);
  });
});
