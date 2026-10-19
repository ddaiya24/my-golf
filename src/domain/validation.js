import { isValidISODate, todayISO } from '../utils/date';

const isBlank = (value) => value === null || value === undefined || String(value).trim() === '';

function checkInt(value, { min, max, label, required = false }) {
  if (isBlank(value)) return required ? `${label}을(를) 입력해 주세요.` : null;
  const number = Number(value);
  if (!Number.isInteger(number)) return '숫자만 입력해 주세요.';
  if (number < min || number > max) return `${min}~${max} 사이로 입력해 주세요.`;
  return null;
}

function checkDate(value) {
  if (!isValidISODate(value)) return '날짜를 선택해 주세요.';
  if (value > todayISO()) return '오늘 이후 날짜는 기록할 수 없습니다.';
  return null;
}

function compact(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}

export function validateRound(form) {
  const holes = Number(form.holes);
  const nameKey = form.type === 'field' ? 'course_name' : 'venue_name';
  return compact({
    date: checkDate(form.date),
    [nameKey]: isBlank(form[nameKey]) ? (form.type === 'field' ? '골프장 이름을 입력해 주세요.' : '매장 이름을 입력해 주세요.') : null,
    total_strokes: checkInt(form.total_strokes, { min: holes, max: holes * 10, label: '총타수', required: true }),
    birdies: checkInt(form.birdies, { min: 0, max: holes, label: '버디 수' }),
    putts: checkInt(form.putts, { min: 0, max: holes * 6, label: '퍼트 수' }),
    driver_max_m: checkInt(form.driver_max_m, { min: 1, max: 450, label: '비거리' }),
  });
}

export function validatePractice(form) {
  const errors = { date: checkDate(form.date) };
  if (form.clubs.length === 0) errors.clubs = '클럽을 1개 이상 추가해 주세요.';
  const seen = new Set();
  form.clubs.forEach((club, index) => {
    if (seen.has(club.club)) errors[`clubs.${index}.club`] = '이미 추가한 클럽입니다.';
    seen.add(club.club);
    errors[`clubs.${index}.max_distance_m`] = checkInt(club.max_distance_m, { min: 1, max: 450, label: '최고 비거리', required: true });
    const avgError = checkInt(club.avg_distance_m, { min: 1, max: 450, label: '평균 비거리' });
    errors[`clubs.${index}.avg_distance_m`] =
      avgError ??
      (!isBlank(club.avg_distance_m) && !isBlank(club.max_distance_m) && Number(club.avg_distance_m) > Number(club.max_distance_m)
        ? '평균은 최고 비거리보다 클 수 없습니다.'
        : null);
  });
  return compact(errors);
}

export function validateGoal(form) {
  if (form.type === 'score') {
    const holes = Number(form.holes);
    return compact({ target_value: checkInt(form.target_value, { min: holes, max: holes * 10, label: '목표 타수', required: true }) });
  }
  return compact({ target_value: checkInt(form.target_value, { min: 1, max: 450, label: '목표 비거리', required: true }) });
}
