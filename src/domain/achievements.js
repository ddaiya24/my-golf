import { roundTitle } from './golf';
import { sortOldestFirst, toEntries } from './entries';
import { driverRecords } from './stats';

const DRIVER_MILESTONE_M = 200;

/** 조건을 처음 만족한 기록을 찾아 업적 달성일로 쓴다. */
const DEFINITIONS = [
  {
    id: 'first-record',
    title: '첫 골프 기록',
    icon: 'edit_note',
    tone: 'brand',
    condition: '첫 기록을 남기면 달성',
    evaluate: ({ entries }) => {
      const first = entries[0];
      return first && { date: first.date, detail: first.title };
    },
  },
  {
    id: 'first-field',
    title: '첫 필드 라운드',
    icon: 'nature_people',
    tone: 'brand',
    condition: '필드 라운드 기록 시 달성',
    evaluate: ({ rounds }) => {
      const first = rounds.find((round) => round.type === 'field');
      return first && { date: first.date, detail: roundTitle(first) };
    },
  },
  {
    id: 'first-birdie',
    title: '첫 버디',
    icon: 'flare',
    tone: 'gold',
    condition: '버디 1개 이상 기록 시 달성',
    evaluate: ({ rounds }) => {
      const first = rounds.find((round) => (round.birdies ?? 0) >= 1);
      return first && { date: first.date, detail: `버디 ${first.birdies}개 · ${roundTitle(first)}` };
    },
  },
  {
    id: 'driver-200',
    title: `드라이버 ${DRIVER_MILESTONE_M}m 돌파`,
    icon: 'navigation',
    tone: 'brand',
    condition: `드라이버 ${DRIVER_MILESTONE_M}m 이상 기록 시 달성`,
    evaluate: ({ drives }) => {
      const first = drives.find((record) => record.value >= DRIVER_MILESTONE_M);
      return first && { date: first.date, detail: `${first.value}m · ${first.title}` };
    },
  },
  {
    id: 'break-100',
    title: '필드 100타 깨기',
    icon: 'sports_golf',
    tone: 'brand',
    condition: '필드 18홀 99타 이하 기록 시 달성',
    evaluate: ({ rounds }) => {
      const first = rounds.find((round) => round.type === 'field' && round.holes === 18 && round.total_strokes < 100);
      return first && { date: first.date, detail: `${first.total_strokes}타 · ${roundTitle(first)}` };
    },
  },
  {
    id: 'break-90',
    title: '필드 90타 깨기',
    icon: 'military_tech',
    tone: 'gold',
    condition: '필드 18홀 89타 이하 기록 시 달성',
    evaluate: ({ rounds }) => {
      const first = rounds.find((round) => round.type === 'field' && round.holes === 18 && round.total_strokes < 90);
      return first && { date: first.date, detail: `${first.total_strokes}타 · ${roundTitle(first)}` };
    },
  },
];

export function computeAchievements(rounds, practices) {
  const context = {
    entries: sortOldestFirst(toEntries(rounds, practices)),
    rounds: sortOldestFirst(rounds),
    drives: driverRecords(rounds, practices),
  };
  return DEFINITIONS.map(({ evaluate, ...definition }) => {
    const result = evaluate(context);
    return result
      ? { ...definition, achieved: true, date: result.date, detail: result.detail }
      : { ...definition, achieved: false, date: null, detail: definition.condition };
  });
}
