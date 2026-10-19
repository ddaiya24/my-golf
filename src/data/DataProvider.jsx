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

export function DataProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);

  // 변경 후에는 항상 저장소 전체를 다시 읽어, 화면의 통계가 저장된 데이터와 어긋나지 않게 한다.
  const reload = useCallback(async () => {
    try {
      const [rounds, practices, goals, profile] = await Promise.all([
        roundsRepo.list(),
        practiceRepo.list(),
        goalsRepo.list(),
        profileRepo.get(),
      ]);
      setState({ status: 'ready', error: null, rounds, practices, goal: goals[0] ?? null, profile });
    } catch (error) {
      setState((prev) => ({ ...prev, status: 'error', error }));
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const actions = useMemo(() => {
    const withReload =
      (fn) =>
      async (...args) => {
        const result = await fn(...args);
        await reload();
        return result;
      };
    return {
      createRound: withReload(roundsRepo.create),
      updateRound: withReload(roundsRepo.update),
      deleteRound: withReload(roundsRepo.remove),
      createPractice: withReload(practiceRepo.create),
      updatePractice: withReload(practiceRepo.update),
      deletePractice: withReload(practiceRepo.remove),
      saveGoal: withReload(goalsRepo.replace),
      updateGoal: withReload(goalsRepo.update),
      deleteGoal: withReload(goalsRepo.remove),
      saveProfile: withReload(profileRepo.save),
    };
  }, [reload]);

  const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used inside DataProvider');
  return context;
}
