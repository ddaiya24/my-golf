// DB 접근 인터페이스. 모든 쿼리는 { text, params } 형태의 파라미터 바인딩만 쓴다.
//   query(text, params) → rows
//   transaction([{ text, params }, ...]) → [rows, rows, ...]  (하나의 트랜잭션, 하나라도 실패하면 전체 롤백)
import { neon } from '@neondatabase/serverless';
import { HttpError } from './http.js';

const UNAVAILABLE_MESSAGE = '데이터베이스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.';

/** 네트워크 단계에서 DB에 닿지 못한 오류 (SQL 오류와 구분한다) */
export function isConnectionError(error) {
  return /error connecting to database|fetch failed|network|ECONNRESET|ETIMEDOUT|EAI_AGAIN/i.test(String(error?.message ?? ''));
}

/** SELECT/WITH로 시작하고 어디에도 쓰기 문이 없을 때만 조회로 본다 (WITH ... INSERT ... SELECT 는 쓰기). */
export const isReadOnly = (text) => /^\s*(SELECT|WITH)\b/i.test(text) && !/\b(INSERT|UPDATE|DELETE)\b/i.test(text);

/** @param options.sql 테스트용으로 neon 함수 대신 넣을 수 있다. */
export function createNeonDb(databaseUrl, { sql = neon(databaseUrl) } = {}) {
  const unavailable = (error) => {
    if (!isConnectionError(error)) return error;
    const cause = error.cause?.cause ?? error.cause;
    console.error('[db] connection failed:', error.message, cause?.code ?? cause?.message ?? '');
    return new HttpError(503, UNAVAILABLE_MESSAGE);
  };

  return {
    async query(text, params = []) {
      try {
        return await sql.query(text, params);
      } catch (error) {
        // 조회만 한 번 다시 시도한다. 쓰기는 이미 반영됐을 수 있어 재시도하지 않는다.
        if (!isConnectionError(error) || !isReadOnly(text)) throw unavailable(error);
        try {
          return await sql.query(text, params);
        } catch (retryError) {
          throw unavailable(retryError);
        }
      }
    },
    async transaction(queries) {
      try {
        return await sql.transaction(queries.map((q) => sql.query(q.text, q.params ?? [])));
      } catch (error) {
        throw unavailable(error);
      }
    },
  };
}
