import { RoleType } from '@prisma/client';

export interface AccessUser {
  id: string;
  roles: Array<{ role: RoleType; departmentId: string | null }>;
}

/**
 * Object-level authorization for a resource owned by a faculty member.
 * Prevents IDOR — changing an :id in the URL must not reach another account.
 *
 * Allowed: the owner, any ADMIN, or a HoD/Reviewer of the owner's department.
 */
export function canViewUserResource(
  user: AccessUser,
  ownerId: string,
  ownerDepartmentId: string | null,
): boolean {
  if (user.id === ownerId) return true;
  if (user.roles.some((r) => r.role === RoleType.ADMIN)) return true;
  return user.roles.some(
    (r) =>
      (r.role === RoleType.HOD || r.role === RoleType.REVIEWER) &&
      r.departmentId != null &&
      r.departmentId === ownerDepartmentId,
  );
}
