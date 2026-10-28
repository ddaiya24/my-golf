import { CLUBS, DRIVER, practiceTitle, roundTitle } from './golf.js';
import { sortNewestFirst, sortOldestFirst } from './entries.js';

/** 스크린/필드, 9홀/18홀 구분으로 라운드를 고른다. 총타수가 없는 라운드는 통계에서 뺀다. */
export function roundsOf(rounds, { type, holes }) {
  return rounds.filter(
    (round) =>
      (type == null || round.type === type) &&
      (holes == null || round.holes === holes) &&
      Number.isFinite(round.total_strokes),
  );
}

/** 최저 타수 라운드. 같은 타수면 먼저 기록한 라운드. */
export function bestRound(rounds) {
  return sortOldestFirst(rounds).reduce(
    (best, round) => (!best || round.total_strokes < best.total_strokes ? round : best),
    null,
  );
}

export function categoryBest(rounds, type, holes) {
  return bestRound(roundsOf(rounds, { type, holes }));
}

/** 홈·MY 화면용: 18홀 베스트를 우선 보여주고, 18홀 기록이 없으면 9홀 베스트. */
export function preferredBest(rounds, type) {
  const best18 = categoryBest(rounds, type, 18);
  if (best18) return best18;
  return categoryBest(rounds, type, 9);
}

/** 최근 n개 라운드 평균 타수 (소수 첫째 자리) */
export function recentAverage(rounds, n = 5) {
  const recent = sortNewestFirst(rounds).slice(0, n);
  if (recent.length === 0) return null;
  const sum = recent.reduce((acc, round) => acc + round.total_strokes, 0);
  return Math.round((sum / recent.length) * 10) / 10;
}

/** 같은 종류·홀 수 라운드가 2개 이상일 때, 이 라운드가 그중 베스트인지 */
export function isCategoryBest(round, rounds) {
  const same = roundsOf(rounds, { type: round.type, holes: round.holes });
  if (same.length < 2) return false;
  return bestRound(same)?.id === round.id;
}

/** 성장 그래프용 스코어 목록 (오래된 순) */
export function scoreSeries(rounds, { type, holes, range = 'all', year }) {
  let list = sortOldestFirst(roundsOf(rounds, { type, holes }));
  if (range === 'year') list = list.filter((round) => round.date.startsWith(String(year)));
  if (range === 'recent5') list = list.slice(-5);
  return list;
}

/** 드라이버 비거리 기록: 라운드의 driver_max_m + 연습의 드라이버 최고 비거리 */
export function driverRecords(rounds, practices) {
  const fromRounds = rounds
    .filter((round) => Number.isFinite(round.driver_max_m))
    .map((round) => ({
      source: 'round',
      id: round.id,
      date: round.date,
      created_at: round.created_at,
      value: round.driver_max_m,
      title: roundTitle(round),
    }));
  const fromPractice = practices.flatMap((session) =>
    session.clubs
      .filter((club) => club.club === DRIVER && Number.isFinite(club.max_distance_m))
      .map((club) => ({
        source: 'practice',
        id: session.id,
        date: session.date,
        created_at: session.created_at,
        value: club.max_distance_m,
        title: practiceTitle(session),
      })),
  );
  return sortOldestFirst([...fromRounds, ...fromPractice]);
}

/** 클럽별 비거리 기록. 드라이버는 라운드 기록도 포함한다. */
export function distanceRecords(club, rounds, practices) {
  if (club === DRIVER) return driverRecords(rounds, practices);
  return sortOldestFirst(
    practices.flatMap((session) =>
      session.clubs
        .filter((item) => item.club === club && Number.isFinite(item.max_distance_m))
        .map((item) => ({
          source: 'practice',
          id: session.id,
          date: session.date,
          created_at: session.created_at,
          value: item.max_distance_m,
          title: practiceTitle(session),
        })),
    ),
  );
}

/** 최고 기록. 같은 값이면 먼저 기록한 것. */
export function bestDistance(records) {
  return records.reduce((best, record) => (!best || record.value > best.value ? record : best), null);
}

/** 월별 드라이버 비거리: 기록별 최고 비거리의 월 평균과 월 최고 (오래된 순) */
export function driverMonthly(records) {
  const byMonth = new Map();
  for (const record of records) {
    const month = record.date.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month).push(record.value);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, values]) => ({
      month,
      count: values.length,
      max: Math.max(...values),
      avg: Math.round(values.reduce((acc, v) => acc + v, 0) / values.length),
    }));
}

/** 클럽별 최고 비거리 (드라이버는 라운드 기록 포함), CLUBS 순서 */
export function clubBests(rounds, practices) {
  const result = new Map();
  const consider = (club, value, date) => {
    if (!Number.isFinite(value)) return;
    const current = result.get(club);
    if (!current || value > current.value || (value === current.value && date < current.date)) {
      result.set(club, { club, value, date });
    }
  };
  for (const session of practices) {
    for (const club of session.clubs) consider(club.club, club.max_distance_m, session.date);
  }
  for (const round of rounds) consider(DRIVER, round.driver_max_m, round.date);
  return [...result.values()].sort((a, b) => CLUBS.indexOf(a.club) - CLUBS.indexOf(b.club));
}

export function lifetimeCounts(rounds, practices) {
  return {
    rounds: rounds.length,
    field: rounds.filter((round) => round.type === 'field').length,
    screen: rounds.filter((round) => round.type === 'screen').length,
    practice: practices.length,
  };
}
