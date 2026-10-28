import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { roundsRepo } from './repositories/rounds';
import { practiceRepo } from './repositories/practice';
import { goalsRepo } from './repositories/goals';
import { profileRepo } from './repositories/profile';

const DataContext = createContext(null);

const INITIAL_STATE = {
  status: 'loading',
  error: null,
  rounds: [],
  practices: [],
  goal: null,
  profile: { name: null },
};

async function fetchAll() {
  const [rounds, practices, goals, profile] = await Promise.all([
    roundsRepo.list(),
    practiceRepo.list(),
    goalsRepo.list(),
    profileRepo.get(),
  ]);
  return { rounds, practices, goal: goals[0] ?? null, profile };
}

const replaceById = (list, row) => list.map((item) => (item.id === row.id ? row : item));
const removeById = (list, id) => list.filter((item) => item.id !== id);

export function DataProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }));
    try {
      setState({ status: 'ready', error: null, ...(await fetchAll()) });
    } catch (error) {
      setState((prev) => ({ ...prev, status: 'error', error }));
    }
  }, []);

  /** 화면을 비우지 않고 서버 데이터로 다시 맞춘다 (가져오기 후 등). */
  const refresh = useCallback(async () => {
    const data = await fetchAll();
    setState((prev) => ({ ...prev, ...data }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 서버가 저장에 성공했을 때만, 서버가 돌려준 행으로 상태를 바꾼다.
  // 실패하면 예외가 그대로 화면으로 전달되고 상태는 바뀌지 않는다.
  const actions = useMemo(() => {
    const patch = (fn) => setState((prev) => ({ ...prev, ...fn(prev) }));
    return {
      reload: load,
      refresh,
      async createRound(input) {
        const row = await roundsRepo.create(input);
        patch((s) => ({ rounds: [...s.rounds, row] }));
        return row;
      },
      async updateRound(id, input) {
        const row = await roundsRepo.update(id, input);
        patch((s) => ({ rounds: replaceById(s.rounds, row) }));
        return row;
      },
      async deleteRound(id) {
        await roundsRepo.remove(id);
        patch((s) => ({ rounds: removeById(s.rounds, id) }));
      },
      async createPractice(input) {
        const row = await practiceRepo.create(input);
        patch((s) => ({ practices: [...s.practices, row] }));
        return row;
      },
      async updatePractice(id, input) {
        const row = await practiceRepo.update(id, input);
        patch((s) => ({ practices: replaceById(s.practices, row) }));
        return row;
      },
      async deletePractice(id) {
        await practiceRepo.remove(id);
        patch((s) => ({ practices: removeById(s.practices, id) }));
      },
      async saveGoal(input) {
        const goal = await goalsRepo.replace(input);
        patch(() => ({ goal }));
        return goal;
      },
      async updateGoal(id, input) {
        const goal = await goalsRepo.update(id, input);
        patch(() => ({ goal }));
        return goal;
      },
      async deleteGoal(id) {
        await goalsRepo.remove(id);
        patch(() => ({ goal: null }));
      },
      async saveProfile(input) {
        const profile = await profileRepo.save(input);
        patch(() => ({ profile }));
        return profile;
      },
    };
  }, [load, refresh]);

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used inside DataProvider');
  return context;
}
