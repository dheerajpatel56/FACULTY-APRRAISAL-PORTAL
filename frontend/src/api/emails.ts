import api from './client';

export const emailApi = {
  list: (params?: { status?: string; userId?: string; limit?: number; offset?: number; paginated?: boolean }) =>
    api.get('/admin/emails', { params }).then((r) => r.data),
  retry: (id: string) => api.post(`/admin/emails/${id}/retry`).then((r) => r.data),
  trigger: (type: 'draft_reminders' | 'reviewer_digest') =>
    api.post('/admin/emails/trigger', { type }).then((r) => r.data),
};
