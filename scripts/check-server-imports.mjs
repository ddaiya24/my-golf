// Vercel 함수와 같은 방식(번들러 없이 Node.js ESM)으로 서버 진입점을 불러와 본다.
// Vite·Vitest는 확장자 없는 import('./golf')도 찾아 주지만 Vercel의 Node.js는 못 찾으므로, 여기서 미리 잡는다.
// 환경변수 없이 불러오면 앱은 "설정 없음" 모드로 만들어지고 /api/health만 응답한다 (DB에 연결하지 않음).
const { default: handler } = await import('../api/index.js');

const response = await handler.fetch(new Request('http://localhost/api/health'));
const body = await response.json();
if (response.status !== 200 || body.ok !== true) {
  console.error('서버 진입점 응답 이상:', response.status, body);
  process.exit(1);
}
console.log('서버 진입점(api/index.js)을 Node.js에서 그대로 불러올 수 있음');
