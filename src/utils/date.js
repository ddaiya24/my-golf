// 날짜는 'YYYY-MM-DD' 문자열로 저장한다. Date 객체는 항상 로컬 시간으로 만들어
// UTC 변환 때문에 하루가 밀리는 문제를 피한다.

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const pad = (n) => String(n).padStart(2, '0');

export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO() {
  return toISODate(new Date());
}

export function parseISODate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

export function isValidISODate(value) {
  return parseISODate(value) !== null;
}

/** "5월 18일" */
export function formatMonthDay(value) {
  const d = parseISODate(value);
  return d ? `${d.getMonth() + 1}월 ${d.getDate()}일` : '';
}

/** "5월 18일 (일)" */
export function formatMonthDayWeekday(value) {
  const d = parseISODate(value);
  return d ? `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})` : '';
}

/** "2025년 5월 18일 (일)" */
export function formatFullDate(value) {
  const d = parseISODate(value);
  return d ? `${d.getFullYear()}년 ${formatMonthDayWeekday(value)}` : '';
}

/** "2025.05" */
export function formatYearMonthDot(value) {
  return value ? `${value.slice(0, 4)}.${value.slice(5, 7)}` : '';
}

/** 'YYYY-MM-DD' 또는 'YYYY-MM' → 'YYYY-MM' */
export function monthKey(value) {
  return value.slice(0, 7);
}

/** '2025-05' → "2025. 05" */
export function formatMonthKey(key) {
  return `${key.slice(0, 4)}. ${key.slice(5, 7)}`;
}

/** '2025-05' → "2025년 5월" */
export function formatMonthKeyLong(key) {
  return `${key.slice(0, 4)}년 ${Number(key.slice(5, 7))}월`;
}

/** '2025-05' → "5월" */
export function formatMonthShort(key) {
  return `${Number(key.slice(5, 7))}월`;
}

export function isValidMonthKey(key) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(key ?? '');
}

export function shiftMonth(key, delta) {
  const date = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1 + delta, 1);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

/** 달력 칸: 첫 주 앞쪽은 null로 채운다. */
export function buildMonthCells(key) {
  const year = Number(key.slice(0, 4));
  const month = Number(key.slice(5, 7));
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, iso: `${key}-${pad(day)}` });
  }
  return cells;
}
