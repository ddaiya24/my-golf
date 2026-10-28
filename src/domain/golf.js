// 데이터 구조에 파(par)가 없으므로 18홀 72, 9홀 36으로 가정한다.
export const PAR_BY_HOLES = { 9: 36, 18: 72 };

export const TYPE_LABEL = { screen: '스크린', field: '필드', practice: '연습' };

export const DRIVER = '드라이버';

export const CLUBS = [
  DRIVER,
  '3번 우드',
  '5번 우드',
  '유틸리티',
  '4번 아이언',
  '5번 아이언',
  '6번 아이언',
  '7번 아이언',
  '8번 아이언',
  '9번 아이언',
  '피칭 웨지',
  '어프로치 웨지',
  '샌드 웨지',
];

export function parFor(holes) {
  return PAR_BY_HOLES[holes] ?? 72;
}

export function toPar(strokes, holes) {
  return strokes - parFor(holes);
}

/** short: "+9" / "E" / "-4", long: "+9 오버" / "E (이븐)" / "-4 언더", even: "+9" / "EVEN" / "-4" */
export function formatToPar(diff, style = 'short') {
  if (diff === 0) {
    if (style === 'long') return 'E (이븐)';
    if (style === 'even') return 'EVEN';
    return 'E';
  }
  const sign = diff > 0 ? `+${diff}` : `${diff}`;
  if (style === 'long') return `${sign} ${diff > 0 ? '오버' : '언더'}`;
  return sign;
}

/** 필드는 골프장 이름, 스크린은 코스 이름을 대표 이름으로 쓴다 (코스 이름이 없는 이전 기록은 매장 이름). */
export function roundTitle(round) {
  if (round.type === 'field') return round.course_name ?? round.venue_name ?? '필드 라운드';
  return round.course_name ?? round.venue_name ?? '스크린 라운드';
}

export function practiceTitle(session) {
  return session.venue_name ?? '연습';
}

/** 세션에서 최고 비거리를 낸 클럽 */
export function practiceTopClub(session) {
  return session.clubs.reduce(
    (best, club) => (club.max_distance_m != null && (!best || club.max_distance_m > best.max_distance_m) ? club : best),
    null,
  );
}
