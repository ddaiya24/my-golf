import { api } from '../api';

export const goalsRepo = {
  list: () => api('goals'),
  /** 개인 목표는 1개만 유지한다. 새 목표를 저장하면 서버가 기존 목표를 교체한다. */
  replace: (input) => api('goals', { method: 'POST', body: input }),
  update: (id, input) => api(`goals/${id}`, { method: 'PUT', body: input }),
  remove: (id) => api(`goals/${id}`, { method: 'DELETE' }),
};
