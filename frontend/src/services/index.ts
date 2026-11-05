import api from './api';

// â”€â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const authService = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then(r => r.data),

  register: (shopName: string, email: string, password: string, phone?: string) =>
    api.post('/auth/register', { shopName, email, password, phone }).then(r => r.data),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }).then(r => r.data),

  resetPassword: (password: string, token: string) =>
    api.post('/auth/reset-password', { password, token }).then(r => r.data),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
};

// â”€â”€â”€ Super Admin (Gestion Plateforme & Licences) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const superAdminService = {
  getStats: () => api.get('/super-admin/stats').then(r => r.data),
  getTenants: (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
    api.get('/super-admin/tenants', { params }).then(r => r.data),
  getTenant: (id: string) => api.get(`/super-admin/tenants/${id}`).then(r => r.data),
  createTenant: (data: any) => api.post('/super-admin/tenants', data).then(r => r.data),
  renewSubscription: (id: string, data: { durationMonths: number; amount: number; paymentMethod: string; notes?: string }) =>
    api.post(`/super-admin/tenants/${id}/subscription`, data).then(r => r.data),
  toggleBlock: (id: string, data: { isBlocked: boolean; blockReason?: string }) =>
    api.patch(`/super-admin/tenants/${id}/toggle-block`, data).then(r => r.data),
};

// â”€â”€â”€ Mon Abonnement (Espace Boutique) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const tenantSubscriptionService = {
  getMySubscription: () => api.get('/tenants/my-subscription').then(r => r.data),
};

// â”€â”€â”€ Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const dashboardService = {
  get: () => api.get('/dashboard').then(r => r.data),
};

// â”€â”€â”€ Products â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const productsService = {
  getAll: (params?: Record<string, any>) => api.get('/products', { params }).then(r => r.data),
  getAlerts: () => api.get('/products/alerts').then(r => r.data),
  create: (data: any) => api.post('/products', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/products/${id}`).then(r => r.data),
};

// â”€â”€â”€ Categories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const categoriesService = {
  getAll: () => api.get('/categories').then(r => r.data),
  create: (data: { name: string }) => api.post('/categories', data).then(r => r.data),
  update: (id: string, data: { name: string }) => api.put(`/categories/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/categories/${id}`).then(r => r.data),
};

// â”€â”€â”€ Suppliers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const suppliersService = {
  getAll: (search?: string) => api.get('/suppliers', { params: { search } }).then(r => r.data),
  create: (data: any) => api.post('/suppliers', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/suppliers/${id}`, data).then(r => r.data),
  remove: (id: string) => api.delete(`/suppliers/${id}`).then(r => r.data),
};

// â”€â”€â”€ Purchase Orders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const purchasesService = {
  getAll: (params?: Record<string, any>) => api.get('/purchase-orders', { params }).then(r => r.data),
  getOne: (id: string) => api.get(`/purchase-orders/${id}`).then(r => r.data),
  create: (data: any) => api.post('/purchase-orders', data).then(r => r.data),
  validate: (id: string) => api.put(`/purchase-orders/${id}/validate`).then(r => r.data),
  cancel: (id: string) => api.put(`/purchase-orders/${id}/cancel`).then(r => r.data),
  remove: (id: string) => api.delete(`/purchase-orders/${id}`).then(r => r.data),
  downloadOrderPdf: async (id: string) => {
    const response = await api.get(`/purchase-orders/${id}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `commande-${id.slice(-8)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};

// â”€â”€â”€ Sales â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const salesService = {
  getAll: (params?: Record<string, any>) => api.get('/sales', { params }).then(r => r.data),
  getOne: (id: string) => api.get(`/sales/${id}`).then(r => r.data),
  create: (data: any) => api.post('/sales', data).then(r => r.data),
  cancel: (id: string, reason: string) => api.post(`/sales/${id}/cancel`, { reason }).then(r => r.data),
  downloadInvoicePdf: async (id: string) => {
    const response = await api.get(`/sales/${id}/invoice`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `facture-${id.slice(-8)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};

// â”€â”€â”€ Returns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const returnsService = {
  getAll: (params?: Record<string, any>) => api.get('/returns', { params }).then(r => r.data),
  getOne: (id: string) => api.get(`/returns/${id}`).then(r => r.data),
  create: (data: any) => api.post('/returns', data).then(r => r.data),
  validate: (id: string) => api.put(`/returns/${id}/validate`).then(r => r.data),
  reject: (id: string) => api.put(`/returns/${id}/reject`).then(r => r.data),
};

// â”€â”€â”€ Reports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const reportsService = {
  topProducts: (params?: Record<string, any>) => api.get('/reports/top-products', { params }).then(r => r.data),
  salesByPeriod: (params?: Record<string, any>) => api.get('/reports/sales-by-period', { params }).then(r => r.data),
  stockValue: () => api.get('/reports/stock-value').then(r => r.data),
  stockAlerts: () => api.get('/reports/stock-alerts').then(r => r.data),
  downloadSalesExcel: async (params?: Record<string, any>) => {
    const response = await api.get('/reports/sales/export', { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ventes.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};

// â”€â”€â”€ Inventory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const inventoryService = {
  getAll: () => api.get('/inventory').then(r => r.data),
  getOne: (id: string) => api.get(`/inventory/${id}`).then(r => r.data),
  create: (data: any) => api.post('/inventory', data).then(r => r.data),
};

// â”€â”€â”€ Users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const usersService = {
  getAll: () => api.get('/users').then(r => r.data),
  create: (data: any) => api.post('/users', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data).then(r => r.data),
};

// â”€â”€â”€ Activity Logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const activityLogsService = {
  getAll: (params?: Record<string, any>) => api.get('/activity-logs', { params }).then(r => r.data),
};
