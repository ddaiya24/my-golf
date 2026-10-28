// API 공통: JSON 응답, 오류, 요청 본문 읽기(크기 제한 포함)

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const BASE_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

export function json(status, body, extraHeaders) {
  const headers = new Headers(BASE_HEADERS);
  if (extraHeaders) for (const [key, value] of Object.entries(extraHeaders)) headers.set(key, value);
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers });
}

export function noContent() {
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
}

export function errorResponse(error) {
  if (error instanceof HttpError) {
    return json(error.status, { error: error.message, ...(error.details ?? {}) }, error.status === 405 ? { allow: error.details?.allow ?? '' } : undefined);
  }
  // 내부 오류 내용(SQL, 접속 정보 등)은 응답에 담지 않고 서버 로그에만 남긴다.
  console.error('[api] unexpected error:', error);
  return json(500, { error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' });
}

export function methodNotAllowed(allowed) {
  return new HttpError(405, '지원하지 않는 요청입니다.', { allow: allowed.join(', ') });
}

/** application/json 본문을 최대 limitBytes까지만 읽는다. */
export async function readJson(request, limitBytes) {
  const contentType = (request.headers.get('content-type') ?? '').toLowerCase();
  if (!contentType.startsWith('application/json')) throw new HttpError(415, 'JSON 형식의 요청만 받을 수 있습니다.');

  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > limitBytes) throw new HttpError(413, '요청 데이터가 너무 큽니다.');
  if (!request.body) throw new HttpError(400, '요청 내용이 비어 있습니다.');

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limitBytes) {
      await reader.cancel();
      throw new HttpError(413, '요청 데이터가 너무 큽니다.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, '요청 형식이 올바르지 않습니다.');
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new HttpError(400, '요청 형식이 올바르지 않습니다.');
  }
  return parsed;
}
