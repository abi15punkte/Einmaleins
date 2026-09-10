CREATE TABLE IF NOT EXISTS scores (
  student_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  class_name TEXT,
  score INTEGER NOT NULL CHECK (score >= 0),
  achieved_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS scores_by_score
  ON scores(score DESC, achieved_at ASC);
