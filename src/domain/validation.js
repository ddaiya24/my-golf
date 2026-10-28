// 입력 검증. 화면 폼과 서버 API가 같은 규칙을 쓴다.
// 서버는 화면에서는 나올 수 없는 값(잘못된 종류, 긴 문자열 등)도 여기서 걸러낸다.
import { CLUBS } from './golf.js';
import { isValidISODate, todayISO } from '../utils/date.js';

export const TEXT_LIMITS = { name: 40, memo: 500, profileName: 12 };

const isBlank = (value) => value === null || value === undefined || String(value).trim() === '';

function checkInt(value, { min, max, label, required = false }) {
  if (isBlank(value)) return required ? `${label}을(를) 입력해 주세요.` : null;
  if (typeof value !== 'string' && typeof value !== 'number') return '숫자만 입력해 주세요.';
  const number = Number(value);
  if (!Number.isInteger(number)) return '숫자만 입력해 주세요.';
  if (number < min || number > max) return `${min}~${max} 사이로 입력해 주세요.`;
  return null;
}

/** maxDate: 기록 가능한 마지막 날짜. 서버는 시간대 차이를 고려해 하루 여유를 준다. */
function checkDate(value, maxDate = todayISO()) {
  if (typeof value !== 'string' || !isValidISODate(value)) return '날짜를 선택해 주세요.';
  if (value > maxDate) return '오늘 이후 날짜는 기록할 수 없습니다.';
  if (value < '1900-01-01') return '날짜를 확인해 주세요.';
  return null;
}

function checkText(value, max) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return '글자로 입력해 주세요.';
  if (value.trim().length > max) return `${max}자 이하로 입력해 주세요.`;
  return null;
}

function compact(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}

export function validateRound(form, { maxDate } = {}) {
  if (form.type !== 'screen' && form.type !== 'field') return { type: '기록 종류를 선택해 주세요.' };
  if (Number(form.holes) !== 9 && Number(form.holes) !== 18) return { holes: '홀 수를 선택해 주세요.' };
  const holes = Number(form.holes);
  // 필드는 골프장 이름, 스크린은 코스 이름이 필수다.
  // 이전 버전의 스크린 기록은 매장 이름만 있을 수 있어, 매장 이름이 있으면 코스 이름 없이도 저장된다.
  const hasName =
    !isBlank(form.course_name) || (form.type === 'screen' && !isBlank(form.venue_name));
  return compact({
    date: checkDate(form.date, maxDate),
    course_name:
      checkText(form.course_name, TEXT_LIMITS.name) ??
      (hasName ? null : form.type === 'field' ? '골프장 이름을 입력해 주세요.' : '코스 이름을 입력해 주세요.'),
    venue_name: checkText(form.venue_name, TEXT_LIMITS.name),
    total_strokes: checkInt(form.total_strokes, { min: holes, max: holes * 10, label: '총타수', required: true }),
    birdies: checkInt(form.birdies, { min: 0, max: holes, label: '버디 수' }),
    putts: checkInt(form.putts, { min: 0, max: holes * 6, label: '퍼트 수' }),
    driver_max_m: checkInt(form.driver_max_m, { min: 1, max: 450, label: '비거리' }),
    memo: checkText(form.memo, TEXT_LIMITS.memo),
  });
}

export function validatePractice(form, { maxDate } = {}) {
  if (!Array.isArray(form.clubs)) return { clubs: '클럽을 1개 이상 추가해 주세요.' };
  const errors = {
    date: checkDate(form.date, maxDate),
    venue_name: checkText(form.venue_name, TEXT_LIMITS.name),
    memo: checkText(form.memo, TEXT_LIMITS.memo),
  };
  if (form.clubs.length === 0) errors.clubs = '클럽을 1개 이상 추가해 주세요.';
  if (form.clubs.length > CLUBS.length) errors.clubs = `클럽은 ${CLUBS.length}개까지 입력할 수 있습니다.`;
  const seen = new Set();
  form.clubs.forEach((club, index) => {
    if (club === null || typeof club !== 'object') {
      errors[`clubs.${index}.club`] = '클럽을 선택해 주세요.';
      return;
    }
    if (!CLUBS.includes(club.club)) errors[`clubs.${index}.club`] = '클럽을 선택해 주세요.';
    else if (seen.has(club.club)) errors[`clubs.${index}.club`] = '이미 추가한 클럽입니다.';
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
    if (form.round_type !== 'screen' && form.round_type !== 'field') return { round_type: '라운드 종류를 선택해 주세요.' };
    if (Number(form.holes) !== 9 && Number(form.holes) !== 18) return { holes: '홀 수를 선택해 주세요.' };
    const holes = Number(form.holes);
    return compact({ target_value: checkInt(form.target_value, { min: holes, max: holes * 10, label: '목표 타수', required: true }) });
  }
  if (form.type !== 'distance') return { type: '목표 종류를 선택해 주세요.' };
  if (!CLUBS.includes(form.club)) return { club: '클럽을 선택해 주세요.' };
  return compact({ target_value: checkInt(form.target_value, { min: 1, max: 450, label: '목표 비거리', required: true }) });
}

export function validateProfile(form) {
  return compact({ name: checkText(form.name, TEXT_LIMITS.profileName) });
}
