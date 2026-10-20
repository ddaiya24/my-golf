-- My Golf Diary 2.0 초기 스키마
-- 이미 있는 테이블은 건드리지 않는다 (IF NOT EXISTS). DROP/TRUNCATE를 쓰지 않는다.
-- user_id는 Neon Auth 사용자 id(JWT의 sub)다. neon_auth 스키마는 Neon이 관리하므로 외래키는 걸지 않는다.

CREATE TABLE IF NOT EXISTS rounds (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text NOT NULL,
  date          date NOT NULL,
  type          text NOT NULL CHECK (type IN ('screen', 'field')),
  course_name   text CHECK (char_length(course_name) <= 100),
  venue_name    text CHECK (char_length(venue_name) <= 100),
  holes         integer NOT NULL CHECK (holes IN (9, 18)),
  total_strokes integer NOT NULL,
  birdies       integer,
  putts         integer,
  driver_max_m  numeric(5, 1) CHECK (driver_max_m > 0 AND driver_max_m <= 450),
  memo          text CHECK (char_length(memo) <= 1000),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (total_strokes BETWEEN holes AND holes * 10),
  CHECK (birdies BETWEEN 0 AND holes),
  CHECK (putts BETWEEN 0 AND holes * 6)
);
CREATE INDEX IF NOT EXISTS rounds_user_date_idx ON rounds (user_id, date DESC);

CREATE TABLE IF NOT EXISTS practice_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text NOT NULL,
  date        date NOT NULL,
  venue_name  text CHECK (char_length(venue_name) <= 100),
  memo        text CHECK (char_length(memo) <= 1000),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS practice_sessions_user_date_idx ON practice_sessions (user_id, date DESC);

CREATE TABLE IF NOT EXISTS practice_clubs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES practice_sessions (id) ON DELETE CASCADE,
  club            text NOT NULL CHECK (char_length(club) <= 30),
  max_distance_m  numeric(5, 1) NOT NULL CHECK (max_distance_m > 0 AND max_distance_m <= 450),
  avg_distance_m  numeric(5, 1) CHECK (avg_distance_m > 0 AND avg_distance_m <= max_distance_m),
  -- 사용자가 입력한 클럽 순서
  position        smallint NOT NULL DEFAULT 0,
  -- 한 세션 안에서 같은 클럽은 한 번만
  UNIQUE (session_id, club)
);

CREATE TABLE IF NOT EXISTS goals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 개인 목표는 사용자당 1개
  user_id         text NOT NULL UNIQUE,
  type            text NOT NULL CHECK (type IN ('score', 'distance')),
  target_value    numeric(5, 1) NOT NULL CHECK (target_value > 0),
  club            text CHECK (char_length(club) <= 30),
  round_type      text CHECK (round_type IN ('screen', 'field')),
  holes           integer CHECK (holes IN (9, 18)),
  -- 목표를 만든 시점의 최고 기록 (진행률 시작점). 기존 앱 데이터에 있는 필드
  baseline_value  numeric(5, 1),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (type = 'score' AND round_type IS NOT NULL AND holes IS NOT NULL AND club IS NULL)
    OR (type = 'distance' AND club IS NOT NULL AND round_type IS NULL AND holes IS NULL)
  )
);

-- 홈 화면 "OOO 골퍼" 이름 (기존 앱의 profile 데이터)
CREATE TABLE IF NOT EXISTS profiles (
  user_id     text PRIMARY KEY,
  name        text CHECK (char_length(name) <= 30),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
