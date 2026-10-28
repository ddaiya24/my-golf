import { api } from '../api';

/** 연습 세션은 clubs 배열을 포함해서 주고받는다. 서버가 세션과 클럽을 한 트랜잭션으로 저장한다. */
export const practiceRepo = {
  list: () => api('practice-sessions'),
  create: (input) => api('practice-sessions', { method: 'POST', body: input }),
  update: (id, input) => api(`practice-sessions/${id}`, { method: 'PUT', body: input }),
  remove: (id) => api(`practice-sessions/${id}`, { method: 'DELETE' }),
};
