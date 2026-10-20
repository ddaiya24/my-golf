// 빌드 결과(dist/)에 DB 접속 정보·비밀값이 들어가지 않았는지 검사한다. npm run build 후 실행.
// .env.local이 있으면 그 안의 실제 값도 dist에 없는지 확인한다 (값은 출력하지 않는다).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
if (!existsSync(DIST)) {
  console.error('dist/가 없습니다. 먼저 npm run build를 실행해 주세요.');
  process.exit(1);
}

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(js|css|html|json|txt|map)$/.test(name)) files.push(path);
  }
};
walk(DIST);

const patterns = [
  { label: 'Postgres 접속 문자열', re: /postgres(?:ql)?:\/\/[^\s"'`]+/i },
  { label: 'Neon 비밀번호 형식(npg_)', re: /npg_[A-Za-z0-9]{8,}/ },
  { label: '환경변수 이름 DATABASE_URL', re: /DATABASE_URL/ },
  { label: '환경변수 이름 NEON_AUTH_COOKIE_SECRET', re: /NEON_AUTH_COOKIE_SECRET/ },
];

const secretValues = [];
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const match = /^\s*(DATABASE_URL|NEON_AUTH_COOKIE_SECRET)\s*=\s*(.+?)\s*$/.exec(line);
    if (match && match[2].length >= 8) secretValues.push({ label: `.env.local의 ${match[1]} 값`, value: match[2].replace(/^["']|["']$/g, '') });
  }
}

let problems = 0;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const { label, re } of patterns) {
    if (re.test(text)) {
      console.error(`발견: ${label} → ${file}`);
      problems += 1;
    }
  }
  for (const { label, value } of secretValues) {
    if (text.includes(value)) {
      console.error(`발견: ${label} → ${file}`);
      problems += 1;
    }
  }
}

console.log(`검사한 파일 ${files.length}개, 실제 비밀값 비교 ${secretValues.length}개`);
if (problems > 0) {
  console.error(`비밀값 노출 의심 ${problems}건`);
  process.exit(1);
}
console.log('비밀값 노출 없음');
