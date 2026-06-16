import api from './client';

export const auditApi = {
  list: (params?: {
    userId?: string;
    action?: string;
    entityType?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) => api.get('/admin/audit', { params }).then((r) => r.data),
  actions: () => api.get('/admin/audit/actions').then((r) => r.data),
};
