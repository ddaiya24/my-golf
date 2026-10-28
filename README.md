# My Golf Diary 2.0

스크린·필드·연습 골프 기록과 성장 추이를 관리하는 모바일 우선 웹앱. 이메일로 가입한 사용자마다 기록이 따로 저장된다.
Google Stitch 디자인(`stitch_my_golf_korean_diary_tracker/`)을 기반으로 만들었다. 이 폴더는 원본 참고 자료로만 보관하며 빌드·배포 결과에는 포함되지 않는다.

- React 19 · Vite 8 · React Router 7 · Tailwind CSS 4 · Recharts
- Vercel Functions(`api/`) → Neon PostgreSQL (`@neondatabase/serverless`)
- 로그인: Neon Auth (이메일·비밀번호), `/api/auth/*` 프록시로 앱 도메인 쿠키 사용

```
브라우저 ──쿠키──▶ /api/auth/*  ──프록시──▶ Neon Auth
브라우저 ──쿠키──▶ /api/rounds 등 ── 서버가 세션 확인 → user_id ──▶ Neon PostgreSQL
```

## 환경변수

모두 **서버 전용**이다. `VITE_` 로 시작하는 변수는 없다 (브라우저 번들에 들어가므로 쓰지 않는다).

| 이름 | 값 |
|---|---|
| `DATABASE_URL` | Neon 콘솔 → Connect → 연결 문자열 (Pooled) |
| `NEON_AUTH_BASE_URL` | Neon 콘솔 → Auth → Configuration 의 Auth URL |
| `NEON_AUTH_COOKIE_SECRET` | 32자 이상 임의 문자열 (`openssl rand -base64 32`) |

로컬: `.env.example`을 복사해 프로젝트 루트에 `.env.local`을 만든다 (`dist/` 안이 아니다. Git에 올라가지 않는다).
값이 빠지면 API는 데이터 요청을 모두 거절한다.

## 로컬 실행

Node.js 22.12 이상이 필요하다. `npm run dev`가 화면과 `/api`를 함께 띄운다 (Vercel CLI 불필요).

```bash
npm install
npm run dev              # http://localhost:5173
npm run dev -- --host    # 같은 Wi-Fi의 휴대폰에서 접속할 때
```

Neon 콘솔 → Auth → Domains 에 접속 주소(`http://localhost:5173`, 배포 도메인)를 추가해야 로그인된다.
로컬·Preview에서는 Neon의 `dev` 브랜치를 쓰고, 운영 DB는 Production에서만 쓴다.

## DB 마이그레이션

```bash
npm run db:check     # 읽기 전용: 연결 대상, 기존 테이블·행 수, 적용 여부
npm run db:migrate   # 아직 적용되지 않은 db/migrations/*.sql 적용
```

- `.env.local`의 `DATABASE_URL` 대상에 적용된다. 실행 전에 `db:check`로 대상을 확인한다.
- 마이그레이션은 `CREATE ... IF NOT EXISTS`만 쓰고 `DROP`/`TRUNCATE`를 쓰지 않는다. 적용 기록은 `schema_migrations` 테이블에 남는다.

## 빌드·테스트

```bash
npm run build          # dist/ 생성
npm test               # 통계 로직 + API·SQL 테스트 (PGlite 메모리 Postgres, 실제 DB 미사용)
npm run check:secrets  # build 후: dist/에 DB 접속 정보·비밀값이 없는지 검사
```

## 배포 (GitHub + Vercel)

1. Vercel 프로젝트 → Settings → Environment Variables 에 위 3개를 등록한다.
   - Production: Neon 운영(main) 브랜치 값
   - Preview: Neon `dev` 브랜치 값
   - 쿠키 비밀값은 환경마다 따로 만든다.
2. 운영 DB에 `npm run db:migrate`를 적용한다 (`.env.local`을 잠시 운영 값으로 바꾸거나 셸에서 `DATABASE_URL=... npm run db:migrate`).
3. 기능 브랜치를 push → Preview 주소에서 확인 → `main`에 병합하면 Production 배포.
4. 환경변수를 바꾼 뒤에는 Deployments → Redeploy 해야 적용된다.

| Vercel 설정 | 값 (`vercel.json`에 포함) |
|---|---|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js Version | 22.x 이상 |

`vercel.json` rewrite:
- `/api/*` → `api/index.js` 하나의 함수 (경로는 `__route`로 전달)
- 그 외 모든 경로 → `index.html` (`/journal` 등에서 새로고침해도 404 없음)

## API

모든 기록 API는 로그인 세션이 필요하다 (없으면 401). `user_id`는 서버가 세션에서 가져오며, 요청에 들어 있는 `user_id`는 무시한다. 다른 사용자의 기록 id로 요청하면 404.

| 경로 | 메서드 |
|---|---|
| `/api/rounds`, `/api/rounds/:id` | GET · POST / GET · PUT · DELETE |
| `/api/practice-sessions`, `/api/practice-sessions/:id` | 같음 (세션 + clubs 배열, 한 트랜잭션) |
| `/api/goals`, `/api/goals/:id` | 같음 (사용자당 1개, POST는 교체) |
| `/api/profile` | GET · PUT |
| `/api/import` | POST — 이전 버전 localStorage 기록 가져오기 |
| `/api/auth/*` | Neon Auth 프록시 |
| `/api/health` | GET — 상태 확인 (인증 불필요, DB 미사용) |

요청 본문은 JSON만, 32KB(가져오기 2MB)까지. 다른 출처의 쓰기 요청은 403.

## 이전 버전 기록 (localStorage)

- 이전 버전은 브라우저 localStorage의 `mgd2:*` 키에 기록을 저장했다. 앱은 이 키를 읽기만 하고 수정·삭제하지 않는다.
- 기록이 남아 있는 기기·브라우저에서 배포 주소로 로그인하면 MY 화면에 "이전 버전 기록 가져오기"가 나온다. 백업 JSON 파일을 먼저 내려받은 뒤 서버로 가져온다.
- 기존 id를 그대로 쓰므로 여러 번 가져와도 중복되지 않고, 가져온 뒤 수정한 내용을 덮어쓰지 않는다.

## 구조

- `api/index.js` — Vercel Function 진입점
- `server/` — 라우터(`app.js`), 인증(`auth.js`), SQL(`repository.js`), 가져오기 검증(`importer.js`)
- `db/migrations/` — SQL 마이그레이션
- `src/data/` — API 호출(`api.js`, `repositories/`), 화면 상태(`DataProvider.jsx`)
- `src/auth/` — 로그인 상태
- `src/domain/` — 화면·서버가 함께 쓰는 계산과 검증: 파 대비(18홀 72 / 9홀 36 가정), 베스트·평균·비거리, 목표 진행률, 업적
- `src/pages/`, `src/components/` — Stitch 마크업을 옮긴 화면
