// DB 마이그레이션 도구.
//   npm run db:check    읽기 전용: 연결 대상, 기존 테이블, 적용된 마이그레이션을 보여준다.
//   npm run db:migrate  아직 적용되지 않은 db/migrations/*.sql을 적용한다 (파일마다 하나의 트랜잭션).
// DATABASE_URL은 .env.local(또는 셸 환경변수)에서 읽고, 접속 문자열은 출력하지 않는다.
import { readdirSync, readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const APPLY = process.argv.includes('--apply');
const MIGRATIONS_DIR = new URL('../db/migrations/', import.meta.url);
const APP_TABLES = ['rounds', 'practice_sessions', 'practice_clubs', 'goals', 'profiles'];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL이 없습니다. .env.local에 넣어 주세요 (.env.example 참고).');
  process.exit(1);
}
const { hostname, pathname } = new URL(url);
const sql = neon(url);

function splitStatements(text) {
  return text
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

console.log(`대상: ${hostname}${pathname} (${APPLY ? '적용 모드' : '읽기 전용 점검'})`);

const tables = await sql.query(
  `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`,
);
const existing = tables.map((t) => t.table_name);
console.log('public 테이블:', existing.length ? existing.join(', ') : '(없음)');

for (const table of APP_TABLES.filter((t) => existing.includes(t))) {
  const [{ n }] = await sql.query(`SELECT count(*)::int AS n FROM ${table}`);
  console.log(`  - ${table}: ${n}행`);
}

const authSchema = await sql.query(`SELECT 1 FROM information_schema.schemata WHERE schema_name = 'neon_auth'`);
console.log('Neon Auth(neon_auth 스키마):', authSchema.length ? '있음' : '없음 — Neon 콘솔에서 Auth를 켜 주세요');

const applied = existing.includes('schema_migrations')
  ? (await sql.query('SELECT version FROM schema_migrations ORDER BY version')).map((r) => r.version)
  : [];
const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
const pending = files.filter((f) => !applied.includes(f));
console.log('적용됨:', applied.length ? applied.join(', ') : '(없음)');
console.log('대기 중:', pending.length ? pending.join(', ') : '(없음)');

if (!APPLY) {
  if (pending.length) console.log('\n적용하려면: npm run db:migrate');
  process.exit(0);
}

await sql.query(
  'CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
);
for (const file of pending) {
  const statements = splitStatements(readFileSync(new URL(file, MIGRATIONS_DIR), 'utf8'));
  await sql.transaction([
    ...statements.map((statement) => sql.query(statement)),
    sql.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]),
  ]);
  console.log(`적용 완료: ${file} (${statements.length}개 문장)`);
}
