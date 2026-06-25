import api from './api';

export const returnsService = {
  getAll: async (params?: any) => {
    const { data } = await api.get('/returns', { params });
    return data;
  },

  getOne: async (id: string) => {
    const { data } = await api.get(`/returns/${id}`);
    return data;
  },

  create: async (payload: { saleId: string; notes?: string; items: { productId: string; qty: number; reason: string; returnToStock: boolean }[] }) => {
    const { data } = await api.post('/returns', payload);
    return data;
  },

  validate: async (id: string) => {
    const { data } = await api.put(`/returns/${id}/validate`);
    return data;
  },

  reject: async (id: string) => {
    const { data } = await api.put(`/returns/${id}/reject`);
    return data;
  },
};
