// Neon Auth 연동.
// 브라우저는 앱 도메인의 /api/auth/* 로 로그인하고, 이 서버가 Neon Auth로 프록시한다.
// 그래서 세션 쿠키가 앱 도메인의 1st-party 쿠키가 된다 (Safari 등의 3rd-party 쿠키 차단 영향 없음).
import {
  createAuthServer,
  extractNeonAuthCookies,
  handleAuthProxyRequest,
  serializeSetCookie,
} from '@neondatabase/auth/server';
import { HttpError } from './http.js';

function createRequestContext(request, setCookies) {
  return {
    getCookies: () => extractNeonAuthCookies(request.headers.get('cookie') ?? ''),
    setCookie: (name, value, options) => {
      setCookies.push(serializeSetCookie({ name, value, ...options }));
    },
    getHeader: (name) => request.headers.get(name),
    getOrigin: () => request.headers.get('origin') ?? new URL(request.url).origin,
    getFramework: () => 'vercel-functions',
  };
}

/**
 * @returns {{ proxy(request, path): Promise<Response>, getUser(request): Promise<{ user, setCookies }> }}
 */
export function createNeonAuth({ baseUrl, cookieSecret }) {
  return {
    proxy(request, path) {
      return handleAuthProxyRequest({ request, path, baseUrl, cookieSecret });
    },

    /** 세션 쿠키로 로그인 사용자를 확인한다. 세션 캐시 쿠키가 갱신되면 setCookies에 담아 돌려준다. */
    async getUser(request) {
      const setCookies = [];
      const server = createAuthServer({
        baseUrl,
        cookieSecret,
        context: () => createRequestContext(request, setCookies),
      });
      const { data, error } = await server.getSession();
      if (error) {
        if (error.status === 401) throw new HttpError(401, '로그인이 필요합니다.');
        console.error('[auth] getSession failed:', error.code ?? error.status, error.message);
        throw new HttpError(503, '로그인 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.');
      }
      const user = data?.session ? data.user : null;
      if (!user?.id) throw new HttpError(401, '로그인이 필요합니다.');
      return { user: { id: String(user.id), email: user.email ?? null }, setCookies };
    },
  };
}
