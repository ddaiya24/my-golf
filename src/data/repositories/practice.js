import { db } from '../storage';
import { createId } from '../../utils/id';
import { cleanText, nowISO, toNumberOrNull } from './normalize';

const SESSIONS = 'practice_sessions';
const CLUBS = 'practice_clubs';

function normalizeSession(input) {
  return {
    date: input.date,
    venue_name: cleanText(input.venue_name),
    memo: cleanText(input.memo),
  };
}

function buildClubRows(sessionId, clubs) {
  return clubs.map((club) => ({
    id: createId(),
    session_id: sessionId,
    club: club.club,
    max_distance_m: toNumberOrNull(club.max_distance_m),
    avg_distance_m: toNumberOrNull(club.avg_distance_m),
  }));
}

export const practiceRepo = {
  /** 세션마다 clubs 배열을 붙여서 돌려준다. */
  async list() {
    const [sessions, clubs] = await Promise.all([db.list(SESSIONS), db.list(CLUBS)]);
    return sessions.map((session) => ({
      ...session,
      clubs: clubs.filter((club) => club.session_id === session.id),
    }));
  },

  async create(input) {
    const now = nowISO();
    const session = { id: createId(), ...normalizeSession(input), created_at: now, updated_at: now };
    await db.insert(SESSIONS, session);
    await db.insertMany(CLUBS, buildClubRows(session.id, input.clubs));
    return session;
  },

  async update(id, input) {
    const session = await db.update(SESSIONS, id, { ...normalizeSession(input), updated_at: nowISO() });
    await db.removeWhere(CLUBS, 'session_id', id);
    await db.insertMany(CLUBS, buildClubRows(id, input.clubs));
    return session;
  },

  async remove(id) {
    await db.removeWhere(CLUBS, 'session_id', id);
    await db.remove(SESSIONS, id);
  },
};
