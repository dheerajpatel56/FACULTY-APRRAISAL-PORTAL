import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserRole {
  role: 'FACULTY' | 'HOD' | 'REVIEWER' | 'ADMIN';
  departmentId: string | null;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  employeeCode: string;
  departmentId: string | null;
  roles: UserRole[];
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  login: (accessToken: string, user: AuthUser) => void;
  logout: () => void;
  hasRole: (role: UserRole['role']) => boolean;
  isAdmin: () => boolean;
  isHodOrReviewer: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      // The refresh token is no longer held in JS — it lives in an httpOnly
      // cookie. Only the short-lived access token is kept here.
      login: (accessToken, user) => set({ accessToken, user }),
      logout: () => set({ accessToken: null, user: null }),
      hasRole: (role) => get().user?.roles.some((r) => r.role === role) ?? false,
      isAdmin: () => get().user?.roles.some((r) => r.role === 'ADMIN') ?? false,
      isHodOrReviewer: () =>
        get().user?.roles.some((r) => r.role === 'HOD' || r.role === 'REVIEWER') ?? false,
    }),
    { name: 'auth-storage' }
  )
);
