import { db } from '../storage';
import { createId } from '../../utils/id';
import { nowISO, toNumberOrNull } from './normalize';

const TABLE = 'goals';

function normalizeGoal(input) {
  const isScore = input.type === 'score';
  return {
    type: isScore ? 'score' : 'distance',
    target_value: toNumberOrNull(input.target_value),
    club: isScore ? null : input.club,
    round_type: isScore ? input.round_type : null,
    holes: isScore ? Number(input.holes) : null,
    // 목표를 만든 시점의 최고 기록. 진행률의 시작점으로 쓴다.
    baseline_value: toNumberOrNull(input.baseline_value),
  };
}

export const goalsRepo = {
  list() {
    return db.list(TABLE);
  },

  /** 개인 목표는 1개만 유지한다. 새 목표를 저장하면 기존 목표는 지운다. */
  async replace(input) {
    const existing = await db.list(TABLE);
    for (const goal of existing) await db.remove(TABLE, goal.id);
    const now = nowISO();
    return db.insert(TABLE, { id: createId(), ...normalizeGoal(input), created_at: now, updated_at: now });
  },

  update(id, input) {
    return db.update(TABLE, id, { ...normalizeGoal(input), updated_at: nowISO() });
  },

  remove(id) {
    return db.remove(TABLE, id);
  },
};
