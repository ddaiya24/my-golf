// 기존 localStorage(mgd2:*) 데이터를 검증해서 가져오기용 행으로 바꾼다.
// 검증을 통과하지 못한 행은 저장하지 않고 건너뛴 이유를 돌려준다.
import { validateGoal, validatePractice, validateProfile, validateRound } from '../src/domain/validation.js';
import {
  cleanText,
  normalizeGoal,
  normalizePracticeClubs,
  normalizePracticeSession,
  normalizeRound,
} from '../src/domain/normalize.js';
import { HttpError } from './http.js';

export const IMPORT_MAX_ROWS = 5000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value) => typeof value === 'string' && UUID_RE.test(value);

function timestampOrNull(value) {
  if (typeof value !== 'string') return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function arrayField(payload, key) {
  const value = payload[key] ?? [];
  if (!Array.isArray(value)) throw new HttpError(400, `${key} 형식이 올바르지 않습니다.`);
  if (value.length > IMPORT_MAX_ROWS) throw new HttpError(413, `${key}는 ${IMPORT_MAX_ROWS}개까지 가져올 수 있습니다.`);
  return value.filter((row) => row !== null && typeof row === 'object' && !Array.isArray(row));
}

export function prepareImport(payload, { maxDate }) {
  const skipped = [];
  const skip = (table, id, reason) => skipped.push({ table, id: typeof id === 'string' ? id : null, reason });

  const rounds = [];
  for (const row of arrayField(payload, 'rounds')) {
    if (!isUuid(row.id)) {
      skip('rounds', row.id, 'id 형식 오류');
      continue;
    }
    const errors = validateRound(row, { maxDate });
    if (Object.keys(errors).length > 0) {
      skip('rounds', row.id, Object.values(errors)[0]);
      continue;
    }
    rounds.push({
      id: row.id,
      ...normalizeRound(row),
      created_at: timestampOrNull(row.created_at),
      updated_at: timestampOrNull(row.updated_at),
    });
  }

  const clubsBySession = new Map();
  for (const club of arrayField(payload, 'practice_clubs')) {
    if (!isUuid(club.session_id)) continue;
    if (!clubsBySession.has(club.session_id)) clubsBySession.set(club.session_id, []);
    clubsBySession.get(club.session_id).push(club);
  }

  const practiceSessions = [];
  const practiceClubs = [];
  for (const row of arrayField(payload, 'practice_sessions')) {
    if (!isUuid(row.id)) {
      skip('practice_sessions', row.id, 'id 형식 오류');
      continue;
    }
    const clubs = clubsBySession.get(row.id) ?? [];
    if (clubs.some((club) => !isUuid(club.id))) {
      skip('practice_sessions', row.id, '클럽 id 형식 오류');
      continue;
    }
    const errors = validatePractice({ ...row, clubs }, { maxDate });
    if (Object.keys(errors).length > 0) {
      skip('practice_sessions', row.id, Object.values(errors)[0]);
      continue;
    }
    practiceSessions.push({
      id: row.id,
      ...normalizePracticeSession(row),
      created_at: timestampOrNull(row.created_at),
      updated_at: timestampOrNull(row.updated_at),
    });
    normalizePracticeClubs(clubs).forEach((club, index) => {
      practiceClubs.push({ id: clubs[index].id, session_id: row.id, ...club });
    });
  }

  // 기존 앱도 목표는 1개만 저장했다.
  const goals = [];
  for (const row of arrayField(payload, 'goals')) {
    if (goals.length > 0) break;
    if (!isUuid(row.id) || Object.keys(validateGoal(row)).length > 0) {
      skip('goals', row.id, '목표 형식 오류');
      continue;
    }
    goals.push({
      id: row.id,
      ...normalizeGoal(row),
      created_at: timestampOrNull(row.created_at),
      updated_at: timestampOrNull(row.updated_at),
    });
  }

  let profileName = null;
  const profile = payload.profile;
  if (profile !== null && typeof profile === 'object' && !Array.isArray(profile)) {
    if (Object.keys(validateProfile(profile)).length === 0) profileName = cleanText(profile.name);
    else skip('profile', null, '이름 형식 오류');
  }

  return {
    data: { rounds, practice_sessions: practiceSessions, practice_clubs: practiceClubs, goals, profile_name: profileName },
    skipped,
  };
}
