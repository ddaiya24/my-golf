// DB 접근 인터페이스. 모든 쿼리는 { text, params } 형태의 파라미터 바인딩만 쓴다.
//   query(text, params) → rows
//   transaction([{ text, params }, ...]) → [rows, rows, ...]  (하나의 트랜잭션, 하나라도 실패하면 전체 롤백)
import { neon } from '@neondatabase/serverless';

export function createNeonDb(databaseUrl) {
  const sql = neon(databaseUrl);
  return {
    query: (text, params = []) => sql.query(text, params),
    transaction: (queries) => sql.transaction(queries.map((q) => sql.query(q.text, q.params ?? []))),
  };
}
