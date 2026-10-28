import { describe, expect, it } from 'vitest';
import { formatToPar, toPar, practiceTopClub, roundTitle } from './golf';
import { groupByMonth, sortNewestFirst, toEntries } from './entries';
import {
  bestRound,
  categoryBest,
  clubBests,
  driverMonthly,
  driverRecords,
  isCategoryBest,
  preferredBest,
  recentAverage,
  roundsOf,
  scoreSeries,
} from './stats';
import { goalProgress } from './goals';
import { computeAchievements } from './achievements';
import { validatePractice, validateRound } from './validation';
import { buildMonthCells, formatMonthDayWeekday, isValidISODate, shiftMonth } from '../utils/date';

let seq = 0;
const round = (overrides) => ({
  id: `r${++seq}`,
  type: 'field',
  holes: 18,
  course_name: '테스트 CC',
  venue_name: null,
  birdies: null,
  putts: null,
  driver_max_m: null,
  memo: null,
  created_at: `2025-01-01T00:00:${String(seq).padStart(2, '0')}Z`,
  ...overrides,
});
const practice = (date, clubs, overrides = {}) => {
  const id = `p${++seq}`;
  return {
    id,
    date,
    venue_name: '연습장',
    memo: null,
    created_at: `2025-01-01T00:00:${String(seq).padStart(2, '0')}Z`,
    clubs: clubs.map(([club, max, avg = null], i) => ({ id: `${id}c${i}`, session_id: id, club, max_distance_m: max, avg_distance_m: avg })),
    ...overrides,
  };
};

describe('파 대비 표시', () => {
  it('18홀은 파 72, 9홀은 파 36 기준', () => {
    expect(toPar(81, 18)).toBe(9);
    expect(toPar(36, 9)).toBe(0);
    expect(toPar(68, 18)).toBe(-4);
  });
  it('표기 형식', () => {
    expect(formatToPar(9, 'long')).toBe('+9 오버');
    expect(formatToPar(-4, 'long')).toBe('-4 언더');
    expect(formatToPar(0, 'long')).toBe('E (이븐)');
    expect(formatToPar(0, 'even')).toBe('EVEN');
    expect(formatToPar(0)).toBe('E');
  });
});

describe('스코어 통계', () => {
  const rounds = [
    round({ date: '2025-03-12', total_strokes: 88 }),
    round({ date: '2025-04-02', total_strokes: 86 }),
    round({ date: '2025-05-20', total_strokes: 81 }),
    round({ date: '2025-05-01', total_strokes: 81 }), // 같은 타수지만 더 이른 날짜
    round({ date: '2025-05-10', total_strokes: 40, holes: 9 }),
    round({ type: 'screen', date: '2025-05-14', total_strokes: 72, venue_name: '골프존' }),
  ];

  it('필드·스크린과 9홀·18홀을 분리한다', () => {
    expect(roundsOf(rounds, { type: 'field', holes: 18 })).toHaveLength(4);
    expect(roundsOf(rounds, { type: 'field', holes: 9 })).toHaveLength(1);
    expect(roundsOf(rounds, { type: 'screen', holes: 18 })).toHaveLength(1);
  });

  it('베스트는 최저 타수, 같은 타수면 먼저 친 라운드', () => {
    const best = categoryBest(rounds, 'field', 18);
    expect(best.total_strokes).toBe(81);
    expect(best.date).toBe('2025-05-01');
    expect(categoryBest(rounds, 'field', 9).total_strokes).toBe(40);
    expect(bestRound([])).toBeNull();
  });

  it('18홀 기록이 없으면 9홀 베스트로 대체한다', () => {
    const only9 = [round({ type: 'screen', holes: 9, date: '2025-01-01', total_strokes: 38 })];
    expect(preferredBest(only9, 'screen').holes).toBe(9);
    expect(preferredBest(only9, 'field')).toBeNull();
  });

  it('최근 5회 평균은 최신 기록 기준', () => {
    const field18 = roundsOf(rounds, { type: 'field', holes: 18 });
    expect(recentAverage(field18, 5)).toBe(84); // (88+86+81+81)/4
    expect(recentAverage(field18, 2)).toBe(81); // 5/20, 5/01
    expect(recentAverage([], 5)).toBeNull();
  });

  it('라베 표시는 같은 종류 기록이 2개 이상일 때만', () => {
    const best = categoryBest(rounds, 'field', 18);
    expect(isCategoryBest(best, rounds)).toBe(true);
    const screen = rounds.find((r) => r.type === 'screen');
    expect(isCategoryBest(screen, rounds)).toBe(false);
  });

  it('그래프 데이터는 오래된 순, 기간 필터 적용', () => {
    const all = scoreSeries(rounds, { type: 'field', holes: 18, range: 'all' });
    expect(all.map((r) => r.total_strokes)).toEqual([88, 86, 81, 81]);
    const recent = scoreSeries(rounds, { type: 'field', holes: 18, range: 'recent5' });
    expect(recent).toHaveLength(4);
    expect(scoreSeries(rounds, { type: 'field', holes: 18, range: 'year', year: 2024 })).toHaveLength(0);
  });

  it('총타수가 없는 라운드는 통계에서 제외', () => {
    expect(roundsOf([round({ date: '2025-01-01', total_strokes: null })], { type: 'field' })).toHaveLength(0);
  });
});

describe('비거리 통계', () => {
  const rounds = [round({ date: '2025-03-05', total_strokes: 90, driver_max_m: 210 })];
  const practices = [
    practice('2025-03-20', [['드라이버', 220], ['7번 아이언', 140, 130]]),
    practice('2025-04-10', [['드라이버', 230]]),
    practice('2025-04-25', [['드라이버', 240], ['7번 아이언', 150]]),
  ];

  it('라운드와 연습의 드라이버 기록을 함께 쓴다', () => {
    const records = driverRecords(rounds, practices);
    expect(records.map((r) => r.value)).toEqual([210, 220, 230, 240]);
    expect(records.map((r) => r.source)).toEqual(['round', 'practice', 'practice', 'practice']);
  });

  it('월별 평균과 최고', () => {
    expect(driverMonthly(driverRecords(rounds, practices))).toEqual([
      { month: '2025-03', count: 2, max: 220, avg: 215 },
      { month: '2025-04', count: 2, max: 240, avg: 235 },
    ]);
  });

  it('클럽별 최고 비거리', () => {
    expect(clubBests(rounds, practices)).toEqual([
      { club: '드라이버', value: 240, date: '2025-04-25' },
      { club: '7번 아이언', value: 150, date: '2025-04-25' },
    ]);
  });

  it('세션의 최장 클럽', () => {
    expect(practiceTopClub(practices[0]).club).toBe('드라이버');
  });
});

describe('일지 항목', () => {
  it('날짜 최신순, 같은 날은 나중에 입력한 기록이 위', () => {
    const a = round({ date: '2025-05-01', total_strokes: 90, created_at: '2025-05-01T01:00:00Z' });
    const b = round({ date: '2025-05-01', total_strokes: 91, created_at: '2025-05-01T02:00:00Z' });
    const c = practice('2025-04-30', [['드라이버', 200]]);
    const sorted = sortNewestFirst(toEntries([a, b], [c]));
    expect(sorted.map((e) => e.id)).toEqual([b.id, a.id, c.id]);
    expect(groupByMonth(sorted).map((g) => [g.month, g.entries.length])).toEqual([
      ['2025-05', 2],
      ['2025-04', 1],
    ]);
  });
});

describe('목표 진행률', () => {
  const rounds = [
    round({ date: '2025-03-01', total_strokes: 89 }),
    round({ date: '2025-05-01', total_strokes: 81 }),
  ];
  it('스코어 목표: 시작 89 → 목표 79, 현재 81이면 80%', () => {
    const goal = { type: 'score', round_type: 'field', holes: 18, target_value: 79, baseline_value: 89 };
    expect(goalProgress(goal, rounds, [])).toMatchObject({ current: 81, start: 89, percent: 80, remaining: 2, achieved: false });
  });
  it('시작점이 없으면 해당 종류의 첫 라운드', () => {
    const goal = { type: 'score', round_type: 'field', holes: 18, target_value: 79, baseline_value: null };
    expect(goalProgress(goal, rounds, []).start).toBe(89);
  });
  it('목표 달성', () => {
    const goal = { type: 'score', round_type: 'field', holes: 18, target_value: 82, baseline_value: 89 };
    expect(goalProgress(goal, rounds, [])).toMatchObject({ achieved: true, percent: 100, remaining: 0 });
  });
  it('기록이 없으면 0%', () => {
    const goal = { type: 'score', round_type: 'screen', holes: 9, target_value: 40, baseline_value: null };
    expect(goalProgress(goal, rounds, [])).toMatchObject({ current: null, percent: 0, achieved: false, remaining: null });
  });
  it('비거리 목표: 시작 200 → 목표 250, 현재 240이면 80%', () => {
    const goal = { type: 'distance', club: '드라이버', target_value: 250, baseline_value: 200 };
    const practices = [practice('2025-05-02', [['드라이버', 240]])];
    expect(goalProgress(goal, [], practices)).toMatchObject({ current: 240, percent: 80, remaining: 10 });
  });
});

describe('업적', () => {
  it('기록이 없으면 모두 미달성', () => {
    expect(computeAchievements([], []).every((a) => !a.achieved)).toBe(true);
  });
  it('조건을 처음 만족한 날짜로 달성', () => {
    const rounds = [
      round({ type: 'screen', date: '2025-01-10', total_strokes: 95, venue_name: '골프존', birdies: 1 }),
      round({ date: '2025-02-10', total_strokes: 105, driver_max_m: 190 }),
      round({ date: '2025-03-10', total_strokes: 98, driver_max_m: 205 }),
    ];
    const practices = [practice('2025-01-05', [['7번 아이언', 140]])];
    const byId = Object.fromEntries(computeAchievements(rounds, practices).map((a) => [a.id, a]));
    expect(byId['first-record']).toMatchObject({ achieved: true, date: '2025-01-05' });
    expect(byId['first-field']).toMatchObject({ achieved: true, date: '2025-02-10' });
    expect(byId['first-birdie']).toMatchObject({ achieved: true, date: '2025-01-10' });
    expect(byId['driver-200']).toMatchObject({ achieved: true, date: '2025-03-10' });
    expect(byId['break-100']).toMatchObject({ achieved: true, date: '2025-03-10' });
    expect(byId['break-90'].achieved).toBe(false);
  });
  it('9홀이나 스크린 기록은 100타 깨기에 포함하지 않는다', () => {
    const rounds = [
      round({ date: '2025-01-01', holes: 9, total_strokes: 45 }),
      round({ type: 'screen', date: '2025-01-02', total_strokes: 85 }),
    ];
    const byId = Object.fromEntries(computeAchievements(rounds, []).map((a) => [a.id, a]));
    expect(byId['break-100'].achieved).toBe(false);
  });
});

describe('입력 검증', () => {
  const base = { type: 'field', date: '2025-05-01', course_name: 'A CC', venue_name: '', holes: '18', total_strokes: '85' };
  it('정상 입력', () => {
    expect(validateRound(base)).toEqual({});
  });
  it('필수값과 범위', () => {
    expect(Object.keys(validateRound({ ...base, course_name: ' ', total_strokes: '' }))).toEqual(['course_name', 'total_strokes']);
    expect(validateRound({ ...base, total_strokes: '10' }).total_strokes).toBeTruthy();
    expect(validateRound({ ...base, holes: '9', total_strokes: '45', birdies: '10' }).birdies).toBeTruthy();
    expect(validateRound({ ...base, date: '2999-01-01' }).date).toBeTruthy();
  });
  it('스크린은 코스 이름이 필수, 매장 이름은 선택', () => {
    expect(validateRound({ ...base, type: 'screen', course_name: 'A 코스', venue_name: '' })).toEqual({});
    expect(validateRound({ ...base, type: 'screen', course_name: '', venue_name: '' }).course_name).toBe('코스 이름을 입력해 주세요.');
    // 이전 버전 스크린 기록(매장 이름만 있음)도 그대로 수정·저장할 수 있다.
    expect(validateRound({ ...base, type: 'screen', course_name: '', venue_name: '골프존' })).toEqual({});
    // 필드는 매장 이름이 있어도 골프장 이름이 필수
    expect(validateRound({ ...base, type: 'field', course_name: '', venue_name: '골프존' }).course_name).toBe('골프장 이름을 입력해 주세요.');
  });
  it('스크린 기록 제목: 코스 이름 → (없으면) 매장 이름', () => {
    expect(roundTitle({ type: 'screen', course_name: '오션 코스', venue_name: '골프존' })).toBe('오션 코스');
    expect(roundTitle({ type: 'screen', course_name: null, venue_name: '골프존' })).toBe('골프존');
    expect(roundTitle({ type: 'field', course_name: '사우스스프링스 CC', venue_name: null })).toBe('사우스스프링스 CC');
  });
  it('연습: 클럽 중복, 평균 > 최고', () => {
    const errors = validatePractice({
      date: '2025-05-01',
      clubs: [
        { club: '드라이버', max_distance_m: '200', avg_distance_m: '210' },
        { club: '드라이버', max_distance_m: '', avg_distance_m: '' },
      ],
    });
    expect(Object.keys(errors).sort()).toEqual(['clubs.0.avg_distance_m', 'clubs.1.club', 'clubs.1.max_distance_m']);
  });
});

describe('날짜 처리', () => {
  it('존재하지 않는 날짜 거부', () => {
    expect(isValidISODate('2025-02-29')).toBe(false);
    expect(isValidISODate('2024-02-29')).toBe(true);
    expect(isValidISODate('2025-5-1')).toBe(false);
  });
  it('요일과 월 이동', () => {
    expect(formatMonthDayWeekday('2025-05-18')).toBe('5월 18일 (일)');
    expect(shiftMonth('2025-01', -1)).toBe('2024-12');
    expect(shiftMonth('2025-12', 1)).toBe('2026-01');
  });
  it('달력 칸: 2025년 5월은 목요일 시작, 31일', () => {
    const cells = buildMonthCells('2025-05');
    expect(cells.slice(0, 4)).toEqual([null, null, null, null]);
    expect(cells[4]).toEqual({ day: 1, iso: '2025-05-01' });
    expect(cells.filter(Boolean)).toHaveLength(31);
  });
});
