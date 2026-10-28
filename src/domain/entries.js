import { practiceTitle, roundTitle } from './golf.js';

/** 라운드와 연습 세션을 일지 목록용 항목 하나로 합친다. */
export function toEntries(rounds, practices) {
  return [
    ...rounds.map((round) => ({
      key: `round-${round.id}`,
      kind: 'round',
      id: round.id,
      type: round.type,
      date: round.date,
      created_at: round.created_at,
      title: roundTitle(round),
      round,
    })),
    ...practices.map((session) => ({
      key: `practice-${session.id}`,
      kind: 'practice',
      id: session.id,
      type: 'practice',
      date: session.date,
      created_at: session.created_at,
      title: practiceTitle(session),
      practice: session,
    })),
  ];
}

export function compareNewestFirst(a, b) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return (b.created_at ?? '').localeCompare(a.created_at ?? '');
}

export function compareOldestFirst(a, b) {
  return compareNewestFirst(b, a);
}

export function sortNewestFirst(items) {
  return [...items].sort(compareNewestFirst);
}

export function sortOldestFirst(items) {
  return [...items].sort(compareOldestFirst);
}

/** 최신순 항목을 월별로 묶는다: [{ month: '2025-05', entries }] */
export function groupByMonth(entries) {
  const groups = [];
  for (const entry of entries) {
    const month = entry.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.entries.push(entry);
    else groups.push({ month, entries: [entry] });
  }
  return groups;
}

export function recordPath(entry) {
  return `/records/${entry.kind}/${entry.id}`;
}
