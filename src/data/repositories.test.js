import { beforeEach, describe, expect, it } from 'vitest';

// node 환경에서 localStorage를 흉내 낸다.
const store = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  },
};

const { roundsRepo } = await import('./repositories/rounds');
const { practiceRepo } = await import('./repositories/practice');
const { goalsRepo } = await import('./repositories/goals');

beforeEach(() => store.clear());

describe('rounds 저장소', () => {
  it('추가·조회·수정·삭제', async () => {
    const created = await roundsRepo.create({
      date: '2025-05-18',
      type: 'field',
      course_name: ' 사우스스프링스 CC ',
      holes: '18',
      total_strokes: '81',
      birdies: '',
      memo: '',
    });
    expect(created.id).toBeTruthy();
    expect(created).toMatchObject({ course_name: '사우스스프링스 CC', holes: 18, total_strokes: 81, birdies: null, memo: null });
    expect(created.created_at).toBe(created.updated_at);

    const updated = await roundsRepo.update(created.id, { ...created, total_strokes: '79' });
    expect(updated.total_strokes).toBe(79);
    expect(updated.created_at).toBe(created.created_at);

    expect(await roundsRepo.list()).toHaveLength(1);
    await roundsRepo.remove(created.id);
    expect(await roundsRepo.list()).toHaveLength(0);
  });

  it('mgd2: 접두어 키에만 저장하고 다른 키는 건드리지 않는다', async () => {
    store.set('golf-records', '[legacy]');
    await roundsRepo.create({ date: '2025-05-18', type: 'screen', venue_name: 'A', holes: 18, total_strokes: 72 });
    expect([...store.keys()].sort()).toEqual(['golf-records', 'mgd2:rounds']);
    expect(store.get('golf-records')).toBe('[legacy]');
  });

  it('손상된 데이터는 덮어쓰지 않고 오류를 낸다', async () => {
    store.set('mgd2:rounds', '{broken');
    await expect(roundsRepo.create({ date: '2025-05-18', type: 'field', course_name: 'A', holes: 18, total_strokes: 90 })).rejects.toThrow();
    expect(store.get('mgd2:rounds')).toBe('{broken');
  });
});

describe('practice 저장소', () => {
  it('세션과 클럽을 함께 저장하고, 수정 시 클럽을 교체, 삭제 시 함께 삭제', async () => {
    const session = await practiceRepo.create({
      date: '2025-05-10',
      venue_name: '',
      clubs: [
        { club: '드라이버', max_distance_m: '230', avg_distance_m: '215' },
        { club: '7번 아이언', max_distance_m: '150', avg_distance_m: '' },
      ],
    });
    let [loaded] = await practiceRepo.list();
    expect(loaded.venue_name).toBeNull();
    expect(loaded.clubs.map((c) => [c.club, c.max_distance_m, c.avg_distance_m])).toEqual([
      ['드라이버', 230, 215],
      ['7번 아이언', 150, null],
    ]);

    await practiceRepo.update(session.id, { date: '2025-05-11', venue_name: 'B', clubs: [{ club: '드라이버', max_distance_m: '240' }] });
    [loaded] = await practiceRepo.list();
    expect(loaded.date).toBe('2025-05-11');
    expect(loaded.clubs).toHaveLength(1);
    expect(JSON.parse(store.get('mgd2:practice_clubs'))).toHaveLength(1);

    await practiceRepo.remove(session.id);
    expect(await practiceRepo.list()).toEqual([]);
    expect(JSON.parse(store.get('mgd2:practice_clubs'))).toEqual([]);
  });
});

describe('goals 저장소', () => {
  it('목표는 1개만 유지', async () => {
    await goalsRepo.replace({ type: 'score', round_type: 'field', holes: 18, target_value: '79', baseline_value: 89 });
    await goalsRepo.replace({ type: 'distance', club: '드라이버', target_value: '250', baseline_value: null });
    const goals = await goalsRepo.list();
    expect(goals).toHaveLength(1);
    expect(goals[0]).toMatchObject({ type: 'distance', club: '드라이버', target_value: 250, round_type: null, holes: null });
  });
});
