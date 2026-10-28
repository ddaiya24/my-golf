// 검증을 통과한 입력값을 저장 형태로 정리한다 (서버 API와 화면이 함께 쓴다).

export function cleanText(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text === '' ? null : text;
}

export function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normalizeRound(input) {
  const type = input.type === 'field' ? 'field' : 'screen';
  return {
    date: input.date,
    type,
    course_name: cleanText(input.course_name),
    // 필드 기록에는 매장 이름을 쓰지 않는다.
    venue_name: type === 'field' ? null : cleanText(input.venue_name),
    holes: Number(input.holes) === 9 ? 9 : 18,
    total_strokes: toNumberOrNull(input.total_strokes),
    birdies: toNumberOrNull(input.birdies),
    putts: toNumberOrNull(input.putts),
    driver_max_m: toNumberOrNull(input.driver_max_m),
    memo: cleanText(input.memo),
  };
}

export function normalizePracticeSession(input) {
  return {
    date: input.date,
    venue_name: cleanText(input.venue_name),
    memo: cleanText(input.memo),
  };
}

export function normalizePracticeClubs(clubs) {
  return clubs.map((club, index) => ({
    club: club.club,
    max_distance_m: toNumberOrNull(club.max_distance_m),
    avg_distance_m: toNumberOrNull(club.avg_distance_m),
    position: index,
  }));
}

export function normalizeGoal(input) {
  const isScore = input.type === 'score';
  const baseline = toNumberOrNull(input.baseline_value);
  return {
    type: isScore ? 'score' : 'distance',
    target_value: toNumberOrNull(input.target_value),
    club: isScore ? null : input.club,
    round_type: isScore ? input.round_type : null,
    holes: isScore ? Number(input.holes) : null,
    // 목표를 만든 시점의 최고 기록. 진행률의 시작점으로 쓴다.
    baseline_value: baseline != null && baseline > 0 && baseline <= 1000 ? baseline : null,
  };
}
