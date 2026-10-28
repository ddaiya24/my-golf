// /api/* 요청 라우터 (Web 표준 Request → Response).
// Vercel 함수(api/index.js)와 로컬 개발 서버(vite.config.js)가 같은 코드를 쓴다.
import { HttpError, errorResponse, json, methodNotAllowed, noContent, readJson } from './http.js';
import { createRepository } from './repository.js';
import { createNeonDb } from './db.js';
import { createNeonAuth } from './auth.js';
import { IMPORT_MAX_ROWS, isUuid, prepareImport } from './importer.js';
import { validateGoal, validatePractice, validateProfile, validateRound } from '../src/domain/validation.js';
import {
  cleanText,
  normalizeGoal,
  normalizePracticeClubs,
  normalizePracticeSession,
  normalizeRound,
} from '../src/domain/normalize.js';

export const BODY_LIMIT = 32 * 1024;
export const IMPORT_BODY_LIMIT = 2 * 1024 * 1024;
const AUTH_BODY_LIMIT = 16 * 1024;

/** 서버는 UTC 기준이라, 한국 시간(UTC+9)의 "오늘"이 하루 앞설 수 있어 하루 여유를 둔다. */
export function serverMaxDate(now = new Date()) {
  const date = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function assertValid(errors) {
  if (Object.keys(errors).length > 0) {
    throw new HttpError(400, Object.values(errors)[0], { fields: errors });
  }
}

/** 쓰기 요청은 같은 출처에서 온 것만 받는다 (CSRF 방지. 세션 쿠키는 SameSite=Lax). */
function assertSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, '허용되지 않은 요청입니다.');
}

/** Vercel에서는 vercel.json rewrite가 원래 경로를 __route로 넘긴다. 원래 주소로 되돌린다. */
export function restoreOriginalUrl(request) {
  const url = new URL(request.url);
  if (!url.searchParams.has('__route')) return request;
  url.pathname = `/api/${url.searchParams.get('__route')}`;
  url.searchParams.delete('__route');
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD' && request.body;
  return new Request(url, {
    method: request.method,
    headers: request.headers,
    body: hasBody ? request.body : undefined,
    duplex: hasBody ? 'half' : undefined,
    signal: request.signal,
  });
}

function routeOf(request) {
  return new URL(request.url).pathname
    .replace(/^\/api\/?/, '')
    .split('/')
    .filter(Boolean);
}

/**
 * 인증: Neon Auth로 가입·로그인한 사용자는 누구나 쓸 수 있다. 세션이 없으면 401.
 * 인가: user_id는 서버가 검증한 세션에서만 가져온다. 요청 본문·주소의 user_id는 쓰지 않으며,
 *       모든 SQL 조건에 이 user_id를 넣어 본인 기록만 조회·수정·삭제되게 한다.
 *
 * @param deps.repo  createRepository(db)
 * @param deps.auth  { proxy(request, path), getUser(request) }
 * @param deps.now   테스트용 현재 시각
 */
export function createApp({ repo, auth, now = () => new Date() }) {
  const authenticate = (request) => auth.getUser(request);

  async function handleRecords(request, segments, userId) {
    const [resource, id, ...rest] = segments;
    if (rest.length > 0) throw new HttpError(404, '요청한 주소를 찾을 수 없습니다.');
    const method = request.method;
    const maxDate = serverMaxDate(now());

    if (id !== undefined && !isUuid(id)) throw new HttpError(404, '기록을 찾을 수 없습니다.');
    const found = (row, message = '기록을 찾을 수 없습니다.') => {
      if (!row) throw new HttpError(404, message);
      return row;
    };

    if (resource === 'rounds') {
      if (id === undefined) {
        if (method === 'GET') return json(200, await repo.listRounds(userId));
        if (method === 'POST') {
          const body = await readJson(request, BODY_LIMIT);
          assertValid(validateRound(body, { maxDate }));
          return json(201, await repo.createRound(userId, normalizeRound(body)));
        }
        throw methodNotAllowed(['GET', 'POST']);
      }
      if (method === 'GET') return json(200, found(await repo.getRound(userId, id)));
      if (method === 'PUT') {
        const body = await readJson(request, BODY_LIMIT);
        assertValid(validateRound(body, { maxDate }));
        return json(200, found(await repo.updateRound(userId, id, normalizeRound(body))));
      }
      if (method === 'DELETE') {
        found(await repo.deleteRound(userId, id));
        return noContent();
      }
      throw methodNotAllowed(['GET', 'PUT', 'DELETE']);
    }

    if (resource === 'practice-sessions') {
      const parse = async () => {
        const body = await readJson(request, BODY_LIMIT);
        assertValid(validatePractice(body, { maxDate }));
        return [normalizePracticeSession(body), normalizePracticeClubs(body.clubs)];
      };
      if (id === undefined) {
        if (method === 'GET') return json(200, await repo.listPracticeSessions(userId));
        if (method === 'POST') return json(201, await repo.createPracticeSession(userId, ...(await parse())));
        throw methodNotAllowed(['GET', 'POST']);
      }
      if (method === 'GET') return json(200, found(await repo.getPracticeSession(userId, id)));
      if (method === 'PUT') return json(200, found(await repo.updatePracticeSession(userId, id, ...(await parse()))));
      if (method === 'DELETE') {
        found(await repo.deletePracticeSession(userId, id));
        return noContent();
      }
      throw methodNotAllowed(['GET', 'PUT', 'DELETE']);
    }

    if (resource === 'goals') {
      const parse = async () => {
        const body = await readJson(request, BODY_LIMIT);
        assertValid(validateGoal(body));
        return normalizeGoal(body);
      };
      if (id === undefined) {
        if (method === 'GET') return json(200, await repo.listGoals(userId));
        if (method === 'POST') return json(201, await repo.replaceGoal(userId, await parse()));
        throw methodNotAllowed(['GET', 'POST']);
      }
      if (method === 'GET') return json(200, found(await repo.getGoal(userId, id), '목표를 찾을 수 없습니다.'));
      if (method === 'PUT') return json(200, found(await repo.updateGoal(userId, id, await parse()), '목표를 찾을 수 없습니다.'));
      if (method === 'DELETE') {
        found(await repo.deleteGoal(userId, id), '목표를 찾을 수 없습니다.');
        return noContent();
      }
      throw methodNotAllowed(['GET', 'PUT', 'DELETE']);
    }

    if (resource === 'profile' && id === undefined) {
      if (method === 'GET') return json(200, await repo.getProfile(userId));
      if (method === 'PUT') {
        const body = await readJson(request, BODY_LIMIT);
        assertValid(validateProfile(body));
        return json(200, await repo.saveProfile(userId, cleanText(body.name)));
      }
      throw methodNotAllowed(['GET', 'PUT']);
    }

    if (resource === 'import' && id === undefined) {
      if (method !== 'POST') throw methodNotAllowed(['POST']);
      const body = await readJson(request, IMPORT_BODY_LIMIT);
      const { data, skipped } = prepareImport(body, { maxDate });
      const inserted = await repo.importData(userId, data);
      const received = {
        rounds: data.rounds.length,
        practice_sessions: data.practice_sessions.length,
        practice_clubs: data.practice_clubs.length,
        goals: data.goals.length,
        profile: data.profile_name ? 1 : 0,
      };
      return json(200, { inserted, received, skipped, limit: IMPORT_MAX_ROWS });
    }

    throw new HttpError(404, '요청한 주소를 찾을 수 없습니다.');
  }

  return async function handle(incoming) {
    try {
      const request = restoreOriginalUrl(incoming);
      const segments = routeOf(request);

      if (segments[0] === 'health' && segments.length === 1) return json(200, { ok: true });

      // 로그인·로그아웃·세션 요청은 Neon Auth로 프록시한다.
      if (segments[0] === 'auth') {
        const declared = Number(request.headers.get('content-length'));
        if (Number.isFinite(declared) && declared > AUTH_BODY_LIMIT) throw new HttpError(413, '요청 데이터가 너무 큽니다.');
        return await auth.proxy(request, segments.slice(1).join('/'));
      }

      if (request.method !== 'GET' && request.method !== 'HEAD') assertSameOrigin(request);
      const { user, setCookies } = await authenticate(request);
      const response = await handleRecords(request, segments, user.id);
      // 세션 캐시 쿠키가 갱신되었으면 함께 내려준다.
      for (const cookie of setCookies) response.headers.append('set-cookie', cookie);
      return response;
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/** 환경변수로 앱을 만든다. 설정이 빠졌으면 모든 데이터 요청을 500으로 거절한다 (fail closed). */
export function createAppFromEnv(env) {
  const missing = ['DATABASE_URL', 'NEON_AUTH_BASE_URL', 'NEON_AUTH_COOKIE_SECRET'].filter((key) => !env[key]);
  if (missing.length > 0 || env.NEON_AUTH_COOKIE_SECRET.length < 32) {
    console.error('[api] missing or invalid env:', missing.length ? missing.join(', ') : 'NEON_AUTH_COOKIE_SECRET (32자 이상)');
    return async (request) => {
      if (routeOf(restoreOriginalUrl(request)).join('/') === 'health') return json(200, { ok: true });
      return json(500, { error: '서버 설정이 완료되지 않았습니다.' });
    };
  }
  return createApp({
    repo: createRepository(createNeonDb(env.DATABASE_URL)),
    auth: createNeonAuth({ baseUrl: env.NEON_AUTH_BASE_URL, cookieSecret: env.NEON_AUTH_COOKIE_SECRET }),
  });
}
