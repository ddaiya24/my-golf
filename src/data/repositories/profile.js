import { api } from '../api';

export const profileRepo = {
  get: () => api('profile'),
  save: ({ name }) => api('profile', { method: 'PUT', body: { name } }),
};
