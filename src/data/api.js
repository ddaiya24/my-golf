// /api 호출. 로그인 세션은 같은 도메인의 HttpOnly 쿠키로 전달된다 (토큰을 JS에서 다루지 않는다).

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

let unauthorizedHandler = () => {};

/** 401(로그인 만료)을 받으면 호출할 함수를 등록한다. */
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

export async function api(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`/api/${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, '네트워크에 연결할 수 없습니다. 연결 상태를 확인해 주세요.');
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) unauthorizedHandler();
    throw new ApiError(response.status, data?.error ?? '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.', data);
  }
  return data;
}
