import { Readable } from 'node:stream';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * 로컬 개발용: npm run dev에서 /api/* 를 Vercel 함수와 같은 서버 코드(server/app.js)로 처리한다.
 * 서버 환경변수(.env.local)는 이 Node 프로세스에서만 쓰이고 브라우저 번들에는 들어가지 않는다.
 */
function devApi(env) {
  let app;
  return {
    name: 'my-golf-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/') && req.url !== '/api') return next();
        try {
          if (!app) {
            const { createAppFromEnv } = await server.ssrLoadModule('/server/app.js');
            app = createAppFromEnv(env);
          }
          const url = new URL(req.url, `http://${req.headers.host}`);
          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
            else if (value != null) headers.set(key, value);
          }
          const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
          const response = await app(
            new Request(url, {
              method: req.method,
              headers,
              body: hasBody ? Readable.toWeb(req) : undefined,
              duplex: hasBody ? 'half' : undefined,
            }),
          );
          res.statusCode = response.status;
          for (const [key, value] of response.headers) {
            if (key !== 'set-cookie') res.setHeader(key, value);
          }
          const cookies = response.headers.getSetCookie();
          if (cookies.length) res.setHeader('set-cookie', cookies);
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (error) {
          next(error);
        }
      });
      // server/ 코드가 바뀌면 다음 요청에서 다시 불러온다.
      server.watcher.on('change', (file) => {
        if (file.includes('/server/') || file.includes('/src/domain/')) app = undefined;
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // 세 번째 인자 ''는 VITE_ 접두어가 없는 서버 변수까지 읽는다 (devApi에만 전달).
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), devApi(env)],
    test: {
      environment: 'node',
    },
  };
});
