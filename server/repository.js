// 사용자별 데이터 접근. 모든 쿼리는 파라미터 바인딩을 쓰고, 모든 조건에 user_id를 넣는다.
// 다른 사용자의 기록 id로 요청하면 "없음"(null)으로 처리한다.
import { randomUUID } from 'node:crypto';

// 날짜·숫자·시각을 화면 코드가 쓰는 형태('YYYY-MM-DD', number, ISO 문자열)로 맞춘다.
const iso = (column) => `to_char(${column} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;

const ROUND_COLUMNS = `
  id, to_char(date, 'YYYY-MM-DD') AS date, type, course_name, venue_name, holes, total_strokes,
  birdies, putts, driver_max_m::float8 AS driver_max_m, memo,
  ${iso('created_at')} AS created_at, ${iso('updated_at')} AS updated_at`;

const SESSION_SELECT = `
  SELECT s.id, to_char(s.date, 'YYYY-MM-DD') AS date, s.venue_name, s.memo,
    ${iso('s.created_at')} AS created_at, ${iso('s.updated_at')} AS updated_at,
    COALESCE((
      SELECT json_agg(json_build_object(
        'id', c.id, 'session_id', c.session_id, 'club', c.club,
        'max_distance_m', c.max_distance_m::float8, 'avg_distance_m', c.avg_distance_m::float8
      ) ORDER BY c.position, c.club)
      FROM practice_clubs c WHERE c.session_id = s.id
    ), '[]'::json) AS clubs
  FROM practice_sessions s`;

const GOAL_COLUMNS = `
  id, type, target_value::float8 AS target_value, club, round_type, holes,
  baseline_value::float8 AS baseline_value, ${iso('created_at')} AS created_at, ${iso('updated_at')} AS updated_at`;

const CLUB_RECORD = 'club text, max_distance_m numeric, avg_distance_m numeric, position smallint';

/** 세션 소유자가 맞을 때만 클럽을 넣는다 (트랜잭션 안에서 사용). */
const insertClubsQuery = (sessionId, userId, clubs) => ({
  text: `
    INSERT INTO practice_clubs (session_id, club, max_distance_m, avg_distance_m, position)
    SELECT $1::uuid, u.club, u.max_distance_m, u.avg_distance_m, u.position
    FROM jsonb_to_recordset($3::jsonb) AS u(${CLUB_RECORD})
    WHERE EXISTS (SELECT 1 FROM practice_sessions WHERE id = $1::uuid AND user_id = $2)`,
  params: [sessionId, userId, JSON.stringify(clubs)],
});

export function createRepository(db) {
  const one = async (text, params) => (await db.query(text, params))[0] ?? null;

  return {
    // ---------- rounds ----------
    listRounds: (userId) =>
      db.query(`SELECT ${ROUND_COLUMNS} FROM rounds WHERE user_id = $1 ORDER BY date DESC, created_at DESC`, [userId]),

    getRound: (userId, id) => one(`SELECT ${ROUND_COLUMNS} FROM rounds WHERE id = $1 AND user_id = $2`, [id, userId]),

    createRound: (userId, r) =>
      one(
        `INSERT INTO rounds (user_id, date, type, course_name, venue_name, holes, total_strokes, birdies, putts, driver_max_m, memo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING ${ROUND_COLUMNS}`,
        [userId, r.date, r.type, r.course_name, r.venue_name, r.holes, r.total_strokes, r.birdies, r.putts, r.driver_max_m, r.memo],
      ),

    updateRound: (userId, id, r) =>
      one(
        `UPDATE rounds SET date = $3, type = $4, course_name = $5, venue_name = $6, holes = $7, total_strokes = $8,
           birdies = $9, putts = $10, driver_max_m = $11, memo = $12, updated_at = now()
         WHERE id = $1 AND user_id = $2
         RETURNING ${ROUND_COLUMNS}`,
        [id, userId, r.date, r.type, r.course_name, r.venue_name, r.holes, r.total_strokes, r.birdies, r.putts, r.driver_max_m, r.memo],
      ),

    deleteRound: async (userId, id) =>
      (await db.query('DELETE FROM rounds WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId])).length > 0,

    // ---------- practice sessions (+ clubs) ----------
    listPracticeSessions: (userId) =>
      db.query(`${SESSION_SELECT} WHERE s.user_id = $1 ORDER BY s.date DESC, s.created_at DESC`, [userId]),

    getPracticeSession: (userId, id) => one(`${SESSION_SELECT} WHERE s.id = $1 AND s.user_id = $2`, [id, userId]),

    /** 세션과 클럽을 한 트랜잭션으로 저장한다. */
    async createPracticeSession(userId, session, clubs) {
      const id = randomUUID();
      await db.transaction([
        {
          text: 'INSERT INTO practice_sessions (id, user_id, date, venue_name, memo) VALUES ($1, $2, $3, $4, $5)',
          params: [id, userId, session.date, session.venue_name, session.memo],
        },
        insertClubsQuery(id, userId, clubs),
      ]);
      return this.getPracticeSession(userId, id);
    },

    /** 세션 수정과 클럽 교체를 한 트랜잭션으로 처리한다. 소유자가 아니면 아무것도 바뀌지 않는다. */
    async updatePracticeSession(userId, id, session, clubs) {
      const [updated] = await db.transaction([
        {
          text: `UPDATE practice_sessions SET date = $3, venue_name = $4, memo = $5, updated_at = now()
                 WHERE id = $1 AND user_id = $2 RETURNING id`,
          params: [id, userId, session.date, session.venue_name, session.memo],
        },
        {
          text: `DELETE FROM practice_clubs WHERE session_id = $1
                 AND EXISTS (SELECT 1 FROM practice_sessions WHERE id = $1 AND user_id = $2)`,
          params: [id, userId],
        },
        insertClubsQuery(id, userId, clubs),
      ]);
      if (updated.length === 0) return null;
      return this.getPracticeSession(userId, id);
    },

    /** 클럽은 ON DELETE CASCADE로 함께 지워진다. */
    deletePracticeSession: async (userId, id) =>
      (await db.query('DELETE FROM practice_sessions WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId])).length > 0,

    // ---------- goals (사용자당 1개) ----------
    listGoals: (userId) => db.query(`SELECT ${GOAL_COLUMNS} FROM goals WHERE user_id = $1`, [userId]),

    getGoal: (userId, id) => one(`SELECT ${GOAL_COLUMNS} FROM goals WHERE id = $1 AND user_id = $2`, [id, userId]),

    /** 새 목표를 저장하면 기존 목표는 교체된다. */
    async replaceGoal(userId, g) {
      const [, inserted] = await db.transaction([
        { text: 'DELETE FROM goals WHERE user_id = $1', params: [userId] },
        {
          text: `INSERT INTO goals (user_id, type, target_value, club, round_type, holes, baseline_value)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${GOAL_COLUMNS}`,
          params: [userId, g.type, g.target_value, g.club, g.round_type, g.holes, g.baseline_value],
        },
      ]);
      return inserted[0];
    },

    updateGoal: (userId, id, g) =>
      one(
        `UPDATE goals SET type = $3, target_value = $4, club = $5, round_type = $6, holes = $7, baseline_value = $8, updated_at = now()
         WHERE id = $1 AND user_id = $2 RETURNING ${GOAL_COLUMNS}`,
        [id, userId, g.type, g.target_value, g.club, g.round_type, g.holes, g.baseline_value],
      ),

    deleteGoal: async (userId, id) =>
      (await db.query('DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId])).length > 0,

    // ---------- profile ----------
    async getProfile(userId) {
      const row = await one('SELECT name FROM profiles WHERE user_id = $1', [userId]);
      return { name: row?.name ?? null };
    },

    saveProfile: (userId, name) =>
      one(
        `INSERT INTO profiles (user_id, name) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name, updated_at = now()
         RETURNING name`,
        [userId, name],
      ),

    // ---------- localStorage 가져오기 ----------
    /**
     * 기존 id를 그대로 써서 넣고, 이미 있는 id는 건너뛴다 (중복 가져오기 방지).
     * 클럽은 이번에 새로 들어간 세션에만 넣는다. 모든 문장이 하나의 트랜잭션이다.
     */
    async importData(userId, data) {
      const results = await db.transaction([
        {
          text: `WITH ins AS (
              INSERT INTO rounds (id, user_id, date, type, course_name, venue_name, holes, total_strokes, birdies, putts, driver_max_m, memo, created_at, updated_at)
              SELECT u.id, $1, u.date, u.type, u.course_name, u.venue_name, u.holes, u.total_strokes, u.birdies, u.putts, u.driver_max_m, u.memo,
                     COALESCE(u.created_at, now()), COALESCE(u.updated_at, u.created_at, now())
              FROM jsonb_to_recordset($2::jsonb) AS u(id uuid, date date, type text, course_name text, venue_name text, holes int,
                total_strokes int, birdies int, putts int, driver_max_m numeric, memo text, created_at timestamptz, updated_at timestamptz)
              ON CONFLICT DO NOTHING RETURNING id)
            SELECT count(*)::int AS n FROM ins`,
          params: [userId, JSON.stringify(data.rounds)],
        },
        {
          text: `WITH new_sessions AS (
              INSERT INTO practice_sessions (id, user_id, date, venue_name, memo, created_at, updated_at)
              SELECT u.id, $1, u.date, u.venue_name, u.memo, COALESCE(u.created_at, now()), COALESCE(u.updated_at, u.created_at, now())
              FROM jsonb_to_recordset($2::jsonb) AS u(id uuid, date date, venue_name text, memo text, created_at timestamptz, updated_at timestamptz)
              ON CONFLICT DO NOTHING RETURNING id
            ), new_clubs AS (
              INSERT INTO practice_clubs (id, session_id, club, max_distance_m, avg_distance_m, position)
              SELECT u.id, u.session_id, u.club, u.max_distance_m, u.avg_distance_m, u.position
              FROM jsonb_to_recordset($3::jsonb) AS u(id uuid, session_id uuid, ${CLUB_RECORD})
              WHERE u.session_id IN (SELECT id FROM new_sessions)
              ON CONFLICT DO NOTHING RETURNING id
            )
            SELECT (SELECT count(*) FROM new_sessions)::int AS sessions, (SELECT count(*) FROM new_clubs)::int AS clubs`,
          params: [userId, JSON.stringify(data.practice_sessions), JSON.stringify(data.practice_clubs)],
        },
        {
          text: `WITH ins AS (
              INSERT INTO goals (id, user_id, type, target_value, club, round_type, holes, baseline_value, created_at, updated_at)
              SELECT u.id, $1, u.type, u.target_value, u.club, u.round_type, u.holes, u.baseline_value,
                     COALESCE(u.created_at, now()), COALESCE(u.updated_at, u.created_at, now())
              FROM jsonb_to_recordset($2::jsonb) AS u(id uuid, type text, target_value numeric, club text, round_type text, holes int,
                baseline_value numeric, created_at timestamptz, updated_at timestamptz)
              WHERE NOT EXISTS (SELECT 1 FROM goals WHERE user_id = $1)
              ON CONFLICT DO NOTHING RETURNING id)
            SELECT count(*)::int AS n FROM ins`,
          params: [userId, JSON.stringify(data.goals)],
        },
        {
          // 이름이 이미 있으면 그대로 두고, 비어 있을 때만 채운다.
          text: `WITH ins AS (
              INSERT INTO profiles (user_id, name) SELECT $1, $2::text WHERE $2::text IS NOT NULL
              ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name, updated_at = now()
              WHERE profiles.name IS NULL
              RETURNING user_id)
            SELECT count(*)::int AS n FROM ins`,
          params: [userId, data.profile_name],
        },
      ]);
      return {
        rounds: results[0][0].n,
        practice_sessions: results[1][0].sessions,
        practice_clubs: results[1][0].clubs,
        goals: results[2][0].n,
        profile: results[3][0].n,
      };
    },
  };
}
