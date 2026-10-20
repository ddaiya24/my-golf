// Vercel Function 진입점. /api/* 요청은 vercel.json rewrite로 모두 이 함수에 들어온다.
// DATABASE_URL 등 비밀값은 서버 환경변수에서만 읽는다.
import { createAppFromEnv } from '../server/app.js';

let app;

export default {
  fetch(request) {
    app ??= createAppFromEnv(process.env);
    return app(request);
  },
};
