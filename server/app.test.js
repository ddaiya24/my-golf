// 메모리 Postgres(PGlite)에 실제 마이그레이션을 적용하고 API 라우터를 그대로 호출한다.
// 인증만 가짜(x-test-user 헤더)로 바꾸고, SQL·검증·권한 검사는 실제 코드를 쓴다.
import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { createApp, serverMaxDate } from './app.js';
import { createRepository } from './repository.js';
import { HttpError } from './http.js';

const MIGRATION = readFileSync(new URL('../db/migrations/001_init.sql', import.meta.url), 'utf8');
const ORIGIN = 'https://golf.test';

let pg;
let handle;

function pgliteDb(instance) {
  return {
    query: async (text, params = []) => (await instance.query(text, params)).rows,
    transaction: (queries) =>
      instance.transaction(async (tx) => {
        const out = [];
        for (const q of queries) out.push((await tx.query(q.text, q.params ?? [])).rows);
        return out;
      }),
  };
}

const fakeAuth = {
  proxy: async (_request, path) => new Response(JSON.stringify({ proxied: path }), { status: 200 }),
  getUser: async (request) => {
    const id = request.headers.get('x-test-user');
    if (!id) throw new HttpError(401, '로그인이 필요합니다.');
    return { user: { id, email: null }, setCookies: id === 'user-a' ? ['neon-auth.local.session_data=x; Path=/'] : [] };
  },
};

function call(method, path, { user = 'user-a', body, headers = {}, rawBody } = {}) {
  const init = { method, headers: { ...(user ? { 'x-test-user': user } : {}), ...headers } };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers['content-type'] ??= 'application/json';
  }
  if (rawBody !== undefined) init.body = rawBody;
  return handle(new Request(`${ORIGIN}${path}`, init));
}

async function callJson(...args) {
  const response = await call(...args);
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null, headers: response.headers };
}

const round = (overrides = {}) => ({
  date: '2025-05-18',
  type: 'field',
  course_name: '사우스스프링스 CC',
  venue_name: '',
  holes: '18',
  total_strokes: '81',
  birdies: '1',
  putts: '',
  driver_max_m: '232',
  memo: '',
  ...overrides,
});

beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(MIGRATION);
  // 같은 마이그레이션을 다시 실행해도 기존 테이블·데이터를 건드리지 않아야 한다.
  await pg.exec(MIGRATION);
  handle = createApp({
    repo: createRepository(pgliteDb(pg)),
    auth: fakeAuth,
    now: () => new Date('2026-10-20T03:00:00Z'),
  });
});

beforeEach(async () => {
  await pg.exec('DELETE FROM practice_clubs; DELETE FROM practice_sessions; DELETE FROM rounds; DELETE FROM goals; DELETE FROM profiles;');
});

describe('인증과 권한', () => {
  it('로그인하지 않으면 401', async () => {
    for (const path of ['/api/rounds', '/api/practice-sessions', '/api/goals', '/api/profile']) {
      expect((await call('GET', path, { user: null })).status).toBe(401);
    }
    expect((await call('POST', '/api/rounds', { user: null, body: round() })).status).toBe(401);
    expect(await pg.query('SELECT count(*)::int AS n FROM rounds').then((r) => r.rows[0].n)).toBe(0);
  });

  it('가입한 사용자는 누구나 사용 가능 (처음 보는 사용자도 본인 빈 기록부터 시작)', async () => {
    await call('POST', '/api/rounds', { body: round() });
    const { status, body } = await callJson('GET', '/api/rounds', { user: 'new-friend' });
    expect(status).toBe(200);
    expect(body).toEqual([]);
    expect((await call('POST', '/api/rounds', { user: 'new-friend', body: round() })).status).toBe(201);
  });

  it('user_id는 세션에서만 가져온다: 본문·주소의 user_id는 무시', async () => {
    const created = await callJson('POST', '/api/rounds', { body: { ...round(), user_id: 'user-b' } });
    expect(created.body.user_id).toBeUndefined();
    expect((await callJson('GET', '/api/rounds', { user: 'user-b' })).body).toEqual([]);
    expect((await callJson('GET', '/api/rounds?user_id=user-b')).body).toHaveLength(1);
    expect((await callJson('GET', '/api/rounds?user_id=user-a', { user: 'user-b' })).body).toEqual([]);
    await call('PUT', '/api/profile', { body: { name: '민서', user_id: 'user-b' } });
    expect((await callJson('GET', '/api/profile', { user: 'user-b' })).body).toEqual({ name: null });
    const [{ owner }] = (await pg.query('SELECT user_id AS owner FROM rounds')).rows;
    expect(owner).toBe('user-a');
  });

  it('가져오기 데이터 안의 user_id도 무시', async () => {
    const id = '88888888-8888-4888-8888-888888888888';
    await call('POST', '/api/import', {
      body: { rounds: [{ id, user_id: 'user-b', date: '2025-05-01', type: 'field', course_name: 'A', holes: 18, total_strokes: 90 }] },
    });
    expect((await callJson('GET', '/api/rounds', { user: 'user-b' })).body).toEqual([]);
    expect((await callJson('GET', `/api/rounds/${id}`)).status).toBe(200);
  });

  it('다른 출처에서 온 쓰기 요청은 403', async () => {
    const response = await call('POST', '/api/rounds', { body: round(), headers: { origin: 'https://evil.example' } });
    expect(response.status).toBe(403);
    expect((await call('POST', '/api/rounds', { body: round(), headers: { origin: ORIGIN } })).status).toBe(201);
  });

  it('/api/auth/* 는 인증 없이 프록시로 전달', async () => {
    const { status, body } = await callJson('POST', '/api/auth/sign-in/email', { user: null, body: {} });
    expect(status).toBe(200);
    expect(body).toEqual({ proxied: 'sign-in/email' });
  });

  it('세션 캐시 쿠키 갱신을 응답에 붙인다', async () => {
    const response = await call('GET', '/api/rounds');
    expect(response.headers.getSetCookie()).toEqual(['neon-auth.local.session_data=x; Path=/']);
  });

  it('Vercel rewrite(__route) 경로도 같은 라우팅', async () => {
    const { status } = await callJson('GET', '/api?__route=rounds');
    expect(status).toBe(200);
    expect((await callJson('GET', '/api?__route=auth/get-session', { user: null })).body).toEqual({ proxied: 'get-session' });
  });
});

describe('rounds CRUD', () => {
  it('생성·조회·수정·삭제와 상태코드', async () => {
    const created = await callJson('POST', '/api/rounds', { body: round() });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      date: '2025-05-18',
      type: 'field',
      course_name: '사우스스프링스 CC',
      venue_name: null,
      holes: 18,
      total_strokes: 81,
      birdies: 1,
      putts: null,
      driver_max_m: 232,
      memo: null,
    });
    expect(created.body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.body.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    const id = created.body.id;

    expect((await callJson('GET', '/api/rounds')).body).toHaveLength(1);
    expect((await callJson('GET', `/api/rounds/${id}`)).body.total_strokes).toBe(81);

    const updated = await callJson('PUT', `/api/rounds/${id}`, { body: round({ total_strokes: '79' }) });
    expect(updated.status).toBe(200);
    expect(updated.body.total_strokes).toBe(79);
    expect(updated.body.created_at).toBe(created.body.created_at);

    expect((await call('DELETE', `/api/rounds/${id}`)).status).toBe(204);
    expect((await call('GET', `/api/rounds/${id}`)).status).toBe(404);
    expect((await call('DELETE', `/api/rounds/${id}`)).status).toBe(404);
  });

  it('입력 검증 400 (필드별 오류 포함)', async () => {
    const bad = await callJson('POST', '/api/rounds', { body: round({ total_strokes: '5', course_name: '' }) });
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.body.fields).sort()).toEqual(['course_name', 'total_strokes']);
    expect((await call('POST', '/api/rounds', { body: round({ type: 'mini-golf' }) })).status).toBe(400);
    expect((await call('POST', '/api/rounds', { body: round({ holes: 27 }) })).status).toBe(400);
    expect((await call('POST', '/api/rounds', { body: round({ memo: 'x'.repeat(501) }) })).status).toBe(400);
    expect((await call('POST', '/api/rounds', { body: round({ course_name: { $ne: 1 } }) })).status).toBe(400);
  });

  it('날짜: 한국 시간 오늘은 허용, 그 이후는 거절', async () => {
    // now = 2026-10-20T03:00Z (한국 10/20 12:00). 하루 여유로 10/21까지 허용
    expect(serverMaxDate(new Date('2026-10-20T03:00:00Z'))).toBe('2026-10-21');
    expect((await call('POST', '/api/rounds', { body: round({ date: '2026-10-20' }) })).status).toBe(201);
    expect((await call('POST', '/api/rounds', { body: round({ date: '2026-10-25' }) })).status).toBe(400);
    expect((await call('POST', '/api/rounds', { body: round({ date: '2025-02-30' }) })).status).toBe(400);
  });

  it('형식 오류: 415 / 400 / 413 / 405 / 404', async () => {
    expect((await call('POST', '/api/rounds', { rawBody: 'x', headers: { 'content-type': 'text/plain' } })).status).toBe(415);
    expect((await call('POST', '/api/rounds', { rawBody: '{bad', headers: { 'content-type': 'application/json' } })).status).toBe(400);
    expect((await call('POST', '/api/rounds', { rawBody: '[1]', headers: { 'content-type': 'application/json' } })).status).toBe(400);
    const huge = JSON.stringify(round({ memo: 'x'.repeat(40 * 1024) }));
    expect((await call('POST', '/api/rounds', { rawBody: huge, headers: { 'content-type': 'application/json' } })).status).toBe(413);
    const notAllowed = await call('PATCH', '/api/rounds');
    expect(notAllowed.status).toBe(405);
    expect(notAllowed.headers.get('allow')).toBe('GET, POST');
    expect((await call('GET', '/api/rounds/not-a-uuid')).status).toBe(404);
    expect((await call('GET', '/api/unknown')).status).toBe(404);
  });

  it('SQL 인젝션 시도 문자열도 값으로만 저장', async () => {
    const name = "'); DROP TABLE rounds; -- {a,b} \"따옴표\"";
    const { body } = await callJson('POST', '/api/rounds', { body: round({ course_name: name.slice(0, 40) }) });
    expect(body.course_name).toBe(name.slice(0, 40).trim());
    expect((await callJson('GET', '/api/rounds')).body).toHaveLength(1);
  });
});

describe('사용자별 데이터 분리', () => {
  it('다른 사용자의 기록은 조회·수정·삭제할 수 없다 (404)', async () => {
    const mine = (await callJson('POST', '/api/rounds', { body: round() })).body;
    const session = (await callJson('POST', '/api/practice-sessions', {
      body: { date: '2025-05-10', venue_name: 'A', memo: '', clubs: [{ club: '드라이버', max_distance_m: '230', avg_distance_m: '' }] },
    })).body;
    const goal = (await callJson('POST', '/api/goals', { body: { type: 'score', round_type: 'field', holes: 18, target_value: '79' } })).body;

    const asB = { user: 'user-b' };
    expect((await callJson('GET', '/api/rounds', asB)).body).toEqual([]);
    expect((await callJson('GET', '/api/practice-sessions', asB)).body).toEqual([]);
    expect((await callJson('GET', '/api/goals', asB)).body).toEqual([]);
    expect((await call('GET', `/api/rounds/${mine.id}`, asB)).status).toBe(404);
    expect((await call('PUT', `/api/rounds/${mine.id}`, { ...asB, body: round({ total_strokes: '72' }) })).status).toBe(404);
    expect((await call('DELETE', `/api/rounds/${mine.id}`, asB)).status).toBe(404);
    expect(
      (await call('PUT', `/api/practice-sessions/${session.id}`, {
        ...asB,
        body: { date: '2025-05-10', clubs: [{ club: '7번 아이언', max_distance_m: '100' }] },
      })).status,
    ).toBe(404);
    expect((await call('DELETE', `/api/practice-sessions/${session.id}`, asB)).status).toBe(404);
    expect((await call('PUT', `/api/goals/${goal.id}`, { ...asB, body: { type: 'score', round_type: 'field', holes: 18, target_value: '70' } })).status).toBe(404);
    expect((await call('DELETE', `/api/goals/${goal.id}`, asB)).status).toBe(404);
    // B가 목표를 만들어도 A의 목표는 그대로
    await call('POST', '/api/goals', { ...asB, body: { type: 'distance', club: '드라이버', target_value: '250' } });

    expect((await callJson('GET', `/api/rounds/${mine.id}`)).body.total_strokes).toBe(81);
    const myPractice = (await callJson('GET', `/api/practice-sessions/${session.id}`)).body;
    expect(myPractice.clubs.map((c) => c.club)).toEqual(['드라이버']);
    expect((await callJson('GET', '/api/goals')).body).toMatchObject([{ id: goal.id, target_value: 79 }]);
  });
});

describe('연습 기록 (세션 + 클럽)', () => {
  const practice = {
    date: '2025-05-10',
    venue_name: '쇼골프 김포공항점',
    memo: '',
    clubs: [
      { club: '7번 아이언', max_distance_m: '152', avg_distance_m: '' },
      { club: '드라이버', max_distance_m: '245', avg_distance_m: '230' },
    ],
  };

  it('생성 시 입력 순서대로 클럽 저장, 수정 시 클럽 교체, 삭제 시 함께 삭제', async () => {
    const created = await callJson('POST', '/api/practice-sessions', { body: practice });
    expect(created.status).toBe(201);
    expect(created.body.clubs.map((c) => [c.club, c.max_distance_m, c.avg_distance_m])).toEqual([
      ['7번 아이언', 152, null],
      ['드라이버', 245, 230],
    ]);
    const id = created.body.id;

    const updated = await callJson('PUT', `/api/practice-sessions/${id}`, {
      body: { ...practice, venue_name: '', clubs: [{ club: '드라이버', max_distance_m: '250', avg_distance_m: '' }] },
    });
    expect(updated.status).toBe(200);
    expect(updated.body.venue_name).toBeNull();
    expect(updated.body.clubs).toHaveLength(1);
    expect(updated.body.clubs[0].max_distance_m).toBe(250);

    expect((await call('DELETE', `/api/practice-sessions/${id}`)).status).toBe(204);
    expect((await pg.query('SELECT count(*)::int AS n FROM practice_clubs')).rows[0].n).toBe(0);
  });

  it('클럽 오류가 있으면 세션도 저장하지 않는다', async () => {
    const dup = { ...practice, clubs: [practice.clubs[1], practice.clubs[1]] };
    expect((await call('POST', '/api/practice-sessions', { body: dup })).status).toBe(400);
    expect((await call('POST', '/api/practice-sessions', { body: { ...practice, clubs: [{ club: '퍼터', max_distance_m: '5' }] } })).status).toBe(400);
    expect((await call('POST', '/api/practice-sessions', { body: { ...practice, clubs: [] } })).status).toBe(400);
    expect((await pg.query('SELECT count(*)::int AS n FROM practice_sessions')).rows[0].n).toBe(0);
  });
});

describe('목표와 프로필', () => {
  it('목표는 1개만 유지, 수정·삭제', async () => {
    await call('POST', '/api/goals', { body: { type: 'score', round_type: 'field', holes: 18, target_value: '79', baseline_value: 89 } });
    const second = await callJson('POST', '/api/goals', { body: { type: 'distance', club: '드라이버', target_value: '250', baseline_value: null } });
    expect(second.status).toBe(201);
    expect(second.body).toMatchObject({ type: 'distance', club: '드라이버', target_value: 250, round_type: null, holes: null });
    const goals = (await callJson('GET', '/api/goals')).body;
    expect(goals).toHaveLength(1);

    const updated = await callJson('PUT', `/api/goals/${goals[0].id}`, { body: { type: 'distance', club: '드라이버', target_value: '260', baseline_value: 200 } });
    expect(updated.body).toMatchObject({ target_value: 260, baseline_value: 200 });
    expect((await call('DELETE', `/api/goals/${goals[0].id}`)).status).toBe(204);
    expect((await callJson('GET', '/api/goals')).body).toEqual([]);
    expect((await call('POST', '/api/goals', { body: { type: 'distance', club: '퍼터', target_value: '5' } })).status).toBe(400);
  });

  it('프로필 이름', async () => {
    expect((await callJson('GET', '/api/profile')).body).toEqual({ name: null });
    expect((await callJson('PUT', '/api/profile', { body: { name: ' 민서 ' } })).body).toEqual({ name: '민서' });
    expect((await callJson('GET', '/api/profile')).body).toEqual({ name: '민서' });
    expect((await callJson('PUT', '/api/profile', { body: { name: '' } })).body).toEqual({ name: null });
    expect((await call('PUT', '/api/profile', { body: { name: 'x'.repeat(13) } })).status).toBe(400);
  });
});

describe('localStorage 가져오기', () => {
  const ids = {
    r1: '11111111-1111-4111-8111-111111111111',
    r2: '22222222-2222-4222-8222-222222222222',
    s1: '33333333-3333-4333-8333-333333333333',
    c1: '44444444-4444-4444-8444-444444444444',
    c2: '55555555-5555-4555-8555-555555555555',
    g1: '66666666-6666-4666-8666-666666666666',
  };
  const legacy = () => ({
    rounds: [
      { id: ids.r1, date: '2025-05-18', type: 'field', course_name: '사우스스프링스 CC', venue_name: null, holes: 18, total_strokes: 81, birdies: 1, putts: null, driver_max_m: 232, memo: '후반, "퍼트" 안정 {ok}', created_at: '2025-05-18T09:00:00.000Z', updated_at: '2025-05-19T09:00:00.000Z' },
      { id: ids.r2, date: '2025-05-14', type: 'screen', course_name: null, venue_name: '골프존파크', holes: 9, total_strokes: 37, birdies: null, putts: null, driver_max_m: null, memo: null, created_at: '2025-05-14T09:00:00.000Z', updated_at: '2025-05-14T09:00:00.000Z' },
      { id: 'not-a-uuid', date: '2025-05-01', type: 'field', course_name: 'X', holes: 18, total_strokes: 90 },
      { id: '77777777-7777-4777-8777-777777777777', date: '2025-05-01', type: 'field', course_name: 'X', holes: 18, total_strokes: 3 },
    ],
    practice_sessions: [{ id: ids.s1, date: '2025-05-10', venue_name: '쇼골프', memo: null, created_at: '2025-05-10T09:00:00.000Z', updated_at: '2025-05-10T09:00:00.000Z' }],
    practice_clubs: [
      { id: ids.c1, session_id: ids.s1, club: '드라이버', max_distance_m: 245, avg_distance_m: 230 },
      { id: ids.c2, session_id: ids.s1, club: '7번 아이언', max_distance_m: 152, avg_distance_m: null },
    ],
    goals: [{ id: ids.g1, type: 'score', target_value: 79, club: null, round_type: 'field', holes: 18, baseline_value: 89, created_at: '2025-05-20T00:00:00.000Z', updated_at: '2025-05-20T00:00:00.000Z' }],
    profile: { id: 'me', name: '민서' },
  });

  it('가져오기 → 같은 데이터를 다시 가져와도 중복 없음', async () => {
    const first = await callJson('POST', '/api/import', { body: legacy() });
    expect(first.status).toBe(200);
    expect(first.body.inserted).toEqual({ rounds: 2, practice_sessions: 1, practice_clubs: 2, goals: 1, profile: 1 });
    expect(first.body.skipped.map((s) => [s.table, s.id])).toEqual([
      ['rounds', 'not-a-uuid'],
      ['rounds', '77777777-7777-4777-8777-777777777777'],
    ]);

    const rounds = (await callJson('GET', '/api/rounds')).body;
    expect(rounds.map((r) => r.id)).toEqual([ids.r1, ids.r2]);
    expect(rounds[0]).toMatchObject({ memo: '후반, "퍼트" 안정 {ok}', created_at: '2025-05-18T09:00:00.000Z', updated_at: '2025-05-19T09:00:00.000Z' });
    const sessions = (await callJson('GET', '/api/practice-sessions')).body;
    expect(sessions[0].clubs.map((c) => c.id)).toEqual([ids.c1, ids.c2]);
    expect((await callJson('GET', '/api/goals')).body[0]).toMatchObject({ id: ids.g1, baseline_value: 89 });
    expect((await callJson('GET', '/api/profile')).body).toEqual({ name: '민서' });

    const second = await callJson('POST', '/api/import', { body: legacy() });
    expect(second.body.inserted).toEqual({ rounds: 0, practice_sessions: 0, practice_clubs: 0, goals: 0, profile: 0 });
    expect((await callJson('GET', '/api/rounds')).body).toHaveLength(2);
  });

  it('가져온 뒤 수정한 내용은 다시 가져와도 덮어쓰지 않는다', async () => {
    await call('POST', '/api/import', { body: legacy() });
    await call('PUT', `/api/rounds/${ids.r1}`, { body: round({ total_strokes: '79' }) });
    await call('PUT', `/api/practice-sessions/${ids.s1}`, { body: { date: '2025-05-10', clubs: [{ club: '드라이버', max_distance_m: '250' }] } });
    await call('PUT', '/api/profile', { body: { name: '새이름' } });
    await call('POST', '/api/import', { body: legacy() });
    expect((await callJson('GET', `/api/rounds/${ids.r1}`)).body.total_strokes).toBe(79);
    // 수정으로 지운 7번 아이언이 다시 생기지 않는다
    expect((await callJson('GET', `/api/practice-sessions/${ids.s1}`)).body.clubs.map((c) => c.club)).toEqual(['드라이버']);
    expect((await callJson('GET', '/api/profile')).body).toEqual({ name: '새이름' });
  });

  it('다른 사용자가 이미 가진 id는 가져오지 않는다 (남의 기록에 끼어들기 불가)', async () => {
    await call('POST', '/api/import', { body: legacy() });
    const asB = await callJson('POST', '/api/import', { user: 'user-b', body: legacy() });
    expect(asB.body.inserted).toMatchObject({ rounds: 0, practice_sessions: 0, practice_clubs: 0 });
    expect((await callJson('GET', '/api/rounds', { user: 'user-b' })).body).toEqual([]);
    expect((await callJson('GET', `/api/practice-sessions/${ids.s1}`)).body.clubs).toHaveLength(2);
  });

  it('이미 목표가 있으면 가져온 목표로 덮어쓰지 않는다', async () => {
    await call('POST', '/api/goals', { body: { type: 'distance', club: '드라이버', target_value: '250' } });
    const result = await callJson('POST', '/api/import', { body: legacy() });
    expect(result.body.inserted.goals).toBe(0);
    expect((await callJson('GET', '/api/goals')).body[0].type).toBe('distance');
  });

  it('형식 오류와 크기 제한', async () => {
    expect((await call('POST', '/api/import', { body: { rounds: 'x' } })).status).toBe(400);
    expect((await call('POST', '/api/import', { body: { rounds: Array.from({ length: 5001 }, () => ({})) } })).status).toBe(413);
    expect((await call('GET', '/api/import')).status).toBe(405);
  });
});
