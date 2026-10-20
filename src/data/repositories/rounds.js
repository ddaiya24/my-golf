import { api } from '../api';

export const roundsRepo = {
  list: () => api('rounds'),
  create: (input) => api('rounds', { method: 'POST', body: input }),
  update: (id, input) => api(`rounds/${id}`, { method: 'PUT', body: input }),
  remove: (id) => api(`rounds/${id}`, { method: 'DELETE' }),
};
