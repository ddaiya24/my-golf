# My Golf Diary 2.0

스크린·필드·연습 골프 기록과 성장 추이를 관리하는 모바일 우선 웹앱.
Google Stitch 디자인(`stitch_my_golf_korean_diary_tracker/`)을 기반으로 만들었다. 이 폴더는 원본 참고 자료로만 보관하며 빌드·배포 결과에는 포함되지 않는다.

- React 19 · Vite 8 · React Router 7 · Tailwind CSS 4 · Recharts
- 데이터: 브라우저 localStorage (서버·API 키 없음)

## 로컬 실행

Node.js 22.12 이상이 필요하다.

```bash
npm install
npm run dev        # http://localhost:5173
npm run dev -- --host   # 같은 Wi-Fi의 휴대폰에서 접속할 때
```

## 빌드·테스트

```bash
npm run build      # dist/ 생성
npm run preview    # 빌드 결과 미리보기
npm test           # 통계·저장소 단위 테스트 (Vitest)
```

## 배포 (GitHub + Vercel)

1. GitHub에 새 저장소를 만들고 이 폴더를 push한다.
2. Vercel → Add New… → Project → 해당 GitHub 저장소 Import
3. 설정 (`vercel.json`에도 들어 있어 자동 적용된다)

   | 항목 | 값 |
   |---|---|
   | Framework Preset | Vite |
   | Root Directory | `./` |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |
   | Install Command | 기본값 (`npm install`) |
   | Node.js Version | 22.x 이상 |
   | Environment Variables | 없음 |

4. 이후 `main` 브랜치에 push하면 자동으로 다시 배포된다.

`vercel.json`의 rewrite가 모든 경로를 `index.html`로 보내므로 `/journal`, `/records/...` 같은 주소로 바로 들어가거나 새로고침해도 404가 나지 않는다. `.vercelignore`는 Stitch 원본 폴더를 Vercel 업로드에서 뺀다.

## 데이터 저장

- 기록은 접속한 브라우저의 localStorage에 `mgd2:` 로 시작하는 키로 저장된다 (`mgd2:rounds`, `mgd2:practice_sessions`, `mgd2:practice_clubs`, `mgd2:goals`, `mgd2:profile`).
- 앱은 `mgd2:` 이외의 키를 읽거나 지우지 않는다. 이전 버전 데이터는 그대로 남는다.
- localStorage는 도메인(주소)마다 따로 저장된다. 로컬 개발 서버에서 입력한 기록은 배포된 사이트에 보이지 않고, 기기·브라우저 간에도 공유되지 않는다.

## 구조

- `src/data/storage/` — 저장소 어댑터. Supabase로 옮길 때 `storage/index.js`의 `db`만 같은 메서드(list, insert, insertMany, update, remove, removeWhere)를 가진 어댑터로 교체한다.
- `src/data/repositories/` — rounds, practice(세션+클럽), goals, profile의 추가·조회·수정·삭제
- `src/domain/` — 화면과 분리된 계산: 파 대비(18홀 72 / 9홀 36 가정), 베스트·평균·비거리, 목표 진행률, 업적
- `src/pages/`, `src/components/` — Stitch 마크업을 옮긴 화면
