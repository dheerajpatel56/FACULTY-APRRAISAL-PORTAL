import api from './client';

export const authApi = {
  login: (employeeCode: string, password: string) =>
    api.post('/auth/login', { employeeCode, password }).then((r) => r.data),
  logout: () => api.post('/auth/logout'),
  // The refresh token rides in the httpOnly cookie — no body needed.
  refresh: () => api.post('/auth/refresh').then((r) => r.data),
  forgotPassword: (employeeCode: string) =>
    api.post('/auth/forgot-password', { employeeCode }).then((r) => r.data),
  resetPassword: (employeeCode: string, otp: string, newPassword: string) =>
    api.post('/auth/reset-password', { employeeCode, otp, newPassword }).then((r) => r.data),
};
