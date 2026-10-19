import { db } from '../storage';
import { createId } from '../../utils/id';
import { cleanText, nowISO, toNumberOrNull } from './normalize';

const TABLE = 'rounds';

function normalizeRound(input) {
  return {
    date: input.date,
    type: input.type === 'field' ? 'field' : 'screen',
    course_name: cleanText(input.course_name),
    venue_name: cleanText(input.venue_name),
    holes: Number(input.holes) === 9 ? 9 : 18,
    total_strokes: toNumberOrNull(input.total_strokes),
    birdies: toNumberOrNull(input.birdies),
    putts: toNumberOrNull(input.putts),
    driver_max_m: toNumberOrNull(input.driver_max_m),
    memo: cleanText(input.memo),
  };
}

export const roundsRepo = {
  list() {
    return db.list(TABLE);
  },

  create(input) {
    const now = nowISO();
    return db.insert(TABLE, { id: createId(), ...normalizeRound(input), created_at: now, updated_at: now });
  },

  update(id, input) {
    return db.update(TABLE, id, { ...normalizeRound(input), updated_at: nowISO() });
  },

  remove(id) {
    return db.remove(TABLE, id);
  },
};
