import { describe, expect, it, vi } from 'vitest';
import { createNeonDb, isConnectionError } from './db.js';
import { HttpError } from './http.js';

const connectionError = () => Object.assign(new Error('Error connecting to database: TypeError: fetch failed'), { name: 'NeonDbError' });

function fakeSql(failures) {
  let calls = 0;
  const sql = {
    query: vi.fn((text, params) => {
      calls += 1;
      if (calls <= failures) return Promise.reject(connectionError());
      return Promise.resolve([{ text, params }]);
    }),
    transaction: vi.fn(() => Promise.reject(connectionError())),
  };
  return sql;
}

describe('DB 연결 오류 처리', () => {
  it('연결 오류와 SQL 오류를 구분', () => {
    expect(isConnectionError(connectionError())).toBe(true);
    expect(isConnectionError(new Error('duplicate key value violates unique constraint'))).toBe(false);
  });

  it('조회는 연결 오류 시 한 번 재시도해서 성공', async () => {
    const sql = fakeSql(1);
    const db = createNeonDb('postgres://unused', { sql });
    await expect(db.query('SELECT 1', [])).resolves.toEqual([{ text: 'SELECT 1', params: [] }]);
    expect(sql.query).toHaveBeenCalledTimes(2);
  });

  it('조회가 두 번 다 실패하면 503', async () => {
    const db = createNeonDb('postgres://unused', { sql: fakeSql(5) });
    await expect(db.query('SELECT 1')).rejects.toMatchObject({ status: 503 });
  });

  it.each([
    'INSERT INTO rounds (id) VALUES ($1) RETURNING id',
    'UPDATE rounds SET memo = $1 WHERE id = $2 RETURNING id',
    'DELETE FROM rounds WHERE id = $1 RETURNING id',
    'WITH ins AS (INSERT INTO rounds DEFAULT VALUES RETURNING id) SELECT count(*) FROM ins',
  ])('쓰기는 재시도하지 않고 503 (중복 저장 방지): %s', async (text) => {
    const sql = fakeSql(1);
    const db = createNeonDb('postgres://unused', { sql });
    const error = await db.query(text, ['x']).catch((e) => e);
    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(503);
    expect(sql.query).toHaveBeenCalledTimes(1);
  });

  it('트랜잭션 연결 오류는 503, SQL 오류는 그대로 전달', async () => {
    const db = createNeonDb('postgres://unused', { sql: fakeSql(0) });
    await expect(db.transaction([{ text: 'DELETE FROM goals' }])).rejects.toMatchObject({ status: 503 });
    const sqlError = new Error('syntax error');
    const db2 = createNeonDb('postgres://unused', { sql: { query: () => Promise.reject(sqlError), transaction: vi.fn() } });
    await expect(db2.query('SELECT 1')).rejects.toBe(sqlError);
  });
});
