import { TYPE_LABEL } from './golf.js';
import { sortOldestFirst } from './entries.js';
import { bestDistance, categoryBest, distanceRecords, roundsOf } from './stats.js';

/** 목표 항목의 현재 최고 기록 값 (없으면 null) */
export function goalCurrentValue(goal, rounds, practices) {
  if (goal.type === 'score') return categoryBest(rounds, goal.round_type, goal.holes)?.total_strokes ?? null;
  return bestDistance(distanceRecords(goal.club, rounds, practices))?.value ?? null;
}

/**
 * 진행률의 시작점. 목표를 만들 때 저장한 baseline_value를 쓰고,
 * 그때 기록이 없었다면 스코어는 해당 종류의 첫 라운드, 비거리는 0에서 시작한다.
 */
export function goalStartValue(goal, rounds) {
  if (goal.baseline_value != null) return goal.baseline_value;
  if (goal.type === 'score') {
    const first = sortOldestFirst(roundsOf(rounds, { type: goal.round_type, holes: goal.holes }))[0];
    return first?.total_strokes ?? null;
  }
  return 0;
}

const clampPercent = (value) => Math.round(Math.min(100, Math.max(0, value)));

export function goalProgress(goal, rounds, practices) {
  const current = goalCurrentValue(goal, rounds, practices);
  const start = goalStartValue(goal, rounds);
  const target = goal.target_value;

  if (goal.type === 'score') {
    const achieved = current != null && current <= target;
    let percent = 0;
    if (achieved) percent = 100;
    else if (current != null && start != null && start > target) {
      percent = clampPercent(((start - current) / (start - target)) * 100);
    }
    return { current, start, target, achieved, percent, remaining: current == null ? null : Math.max(0, current - target) };
  }

  const achieved = current != null && current >= target;
  const base = start ?? 0;
  let percent = 0;
  if (achieved) percent = 100;
  else if (current != null && target > base) percent = clampPercent(((current - base) / (target - base)) * 100);
  return { current, start: base, target, achieved, percent, remaining: current == null ? null : Math.max(0, target - current) };
}

export function goalTitle(goal) {
  if (goal.type === 'score') return `${TYPE_LABEL[goal.round_type]} ${goal.holes}홀 ${goal.target_value}타`;
  return `${goal.club} ${goal.target_value}m`;
}

export function goalDescription(goal) {
  if (goal.type === 'score') {
    return `${TYPE_LABEL[goal.round_type]} ${goal.holes}홀 라운드에서 ${goal.target_value}타 이하 기록`;
  }
  return `${goal.club} 최고 비거리 ${goal.target_value}m 이상 기록`;
}

export function goalUnit(goal) {
  return goal.type === 'score' ? '타' : 'm';
}
