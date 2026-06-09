/**
 * Schema migrations, embedded as string constants so they survive Next's
 * server bundling (no runtime fs reads of .sql files). Append new migrations;
 * never edit an applied one.
 */

export interface Migration {
  id: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    id: 1,
    name: "init",
    sql: /* sql */ `
CREATE TABLE athlete (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  units TEXT NOT NULL DEFAULT 'imperial',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',
  dob TEXT,
  avatar_path TEXT,
  strength_rpe_default INTEGER NOT NULL DEFAULT 5,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Versioned thresholds: TSS for an activity uses the value valid at its date.
CREATE TABLE threshold (
  id INTEGER PRIMARY KEY,
  curve TEXT NOT NULL,        -- run | bike | swim | strength
  metric TEXT NOT NULL,       -- ftp | threshold_pace | threshold_hr | max_hr | resting_hr
  value REAL NOT NULL,
  valid_from TEXT NOT NULL,   -- YYYY-MM-DD
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_threshold_lookup ON threshold (curve, metric, valid_from);

CREATE TABLE zone (
  id INTEGER PRIMARY KEY,
  curve TEXT NOT NULL,
  metric TEXT NOT NULL,       -- power | pace | hr
  zone_index INTEGER NOT NULL,
  name TEXT NOT NULL,
  low REAL NOT NULL,
  high REAL NOT NULL,
  valid_from TEXT NOT NULL
);
CREATE INDEX idx_zone_lookup ON zone (curve, metric, valid_from);

CREATE TABLE activity (
  id INTEGER PRIMARY KEY,
  modality TEXT NOT NULL,     -- run | bike | swim | lift | core
  sport_detail TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  fit_hash TEXT UNIQUE,
  raw_path TEXT,
  start_time TEXT NOT NULL,   -- ISO UTC
  local_date TEXT NOT NULL,   -- YYYY-MM-DD in athlete tz
  timezone TEXT,
  name TEXT,
  notes TEXT,
  duration_s REAL,
  elapsed_s REAL,
  distance_m REAL,
  elevation_gain_m REAL,
  avg_hr REAL,
  max_hr REAL,
  avg_power REAL,
  max_power REAL,
  np REAL,
  avg_speed_mps REAL,
  max_speed_mps REAL,
  avg_cadence REAL,
  max_cadence REAL,
  calories REAL,
  kj REAL,
  tss REAL,
  s3 REAL,
  intensity_factor REAL,
  variability_index REAL,
  efficiency_factor REAL,
  decoupling REAL,
  rpe INTEGER,
  route_polyline TEXT,
  metrics_version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_activity_date ON activity (local_date);
CREATE INDEX idx_activity_modality_date ON activity (modality, local_date);

-- Time-series samples stored columnar as a single JSON blob per activity.
CREATE TABLE activity_stream (
  activity_id INTEGER PRIMARY KEY REFERENCES activity (id) ON DELETE CASCADE,
  sample_count INTEGER NOT NULL DEFAULT 0,
  channels TEXT NOT NULL      -- JSON: { time:[], lat:[], lng:[], alt:[], hr:[], power:[], cadence:[], speed:[], temp:[] }
);

CREATE TABLE lap (
  id INTEGER PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES activity (id) ON DELETE CASCADE,
  lap_index INTEGER NOT NULL,
  start_time TEXT,
  duration_s REAL,
  distance_m REAL,
  avg_hr REAL,
  max_hr REAL,
  avg_power REAL,
  max_power REAL,
  np REAL,
  avg_speed_mps REAL,
  avg_cadence REAL
);
CREATE INDEX idx_lap_activity ON lap (activity_id);

CREATE TABLE session (
  id INTEGER PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES activity (id) ON DELETE CASCADE,
  session_index INTEGER NOT NULL,
  sport TEXT,
  start_time TEXT,
  duration_s REAL,
  distance_m REAL,
  avg_hr REAL,
  avg_power REAL,
  np REAL
);
CREATE INDEX idx_session_activity ON session (activity_id);

CREATE TABLE planned_workout (
  id INTEGER PRIMARY KEY,
  modality TEXT NOT NULL,
  date TEXT NOT NULL,         -- YYYY-MM-DD local
  name TEXT,
  description TEXT,
  planned_duration_s REAL,
  planned_distance_m REAL,
  planned_tss REAL,
  completed_activity_id INTEGER REFERENCES activity (id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_planned_date ON planned_workout (date);

-- Cached fitness curves: one row per (date, curve) plus the combined 'all'.
CREATE TABLE daily_load (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  curve TEXT NOT NULL,        -- run | bike | swim | strength | all
  stress REAL NOT NULL DEFAULT 0,
  ctl REAL NOT NULL DEFAULT 0,
  atl REAL NOT NULL DEFAULT 0,
  tsb REAL NOT NULL DEFAULT 0,
  UNIQUE (date, curve)
);

CREATE TABLE peak (
  id INTEGER PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES activity (id) ON DELETE CASCADE,
  kind TEXT NOT NULL,         -- power | pace | hr
  basis TEXT NOT NULL,        -- duration | distance
  window REAL NOT NULL,       -- seconds (duration) or meters (distance)
  value REAL NOT NULL,        -- watts | bpm | speed m/s (pace derived)
  start_offset_s REAL
);
CREATE INDEX idx_peak_lookup ON peak (kind, basis, window);
CREATE INDEX idx_peak_activity ON peak (activity_id);

CREATE TABLE dashboard_layout (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  layout TEXT NOT NULL,       -- JSON
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE connector_account (
  id INTEGER PRIMARY KEY,
  provider TEXT NOT NULL UNIQUE,
  api_key TEXT,
  athlete_id TEXT,
  last_sync_cursor TEXT,
  enabled INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE event (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  notes TEXT
);

CREATE TABLE goal (
  id INTEGER PRIMARY KEY,
  text TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`,
  },
  {
    id: 2,
    name: "app_settings",
    sql: /* sql */ `
CREATE TABLE app_setting (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`,
  },
  {
    id: 3,
    name: "metric",
    sql: /* sql */ `
-- Wellness / body metrics tracked over time: one value per type per date.
CREATE TABLE metric (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL,        -- weight | resting_hr | hrv | sleep_hours | mood | ...
  date TEXT NOT NULL,        -- YYYY-MM-DD
  value REAL NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (type, date)
);
CREATE INDEX idx_metric_type_date ON metric (type, date);
`,
  },
  {
    id: 4,
    name: "injury_equipment",
    sql: /* sql */ `
CREATE TABLE injury (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  body_part TEXT,
  start_date TEXT NOT NULL,   -- YYYY-MM-DD
  end_date TEXT,              -- NULL = ongoing
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_injury_dates ON injury (start_date, end_date);

CREATE TABLE equipment (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL,         -- bike | shoes | other
  name TEXT NOT NULL,
  brand TEXT,
  distance_m REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`,
  },
  {
    id: 5,
    name: "activity_private_notes",
    // Private notes live alongside the public `notes`/description; never synced
    // out, shown only to the owner on the activity summary.
    sql: /* sql */ `ALTER TABLE activity ADD COLUMN private_notes TEXT;`,
  },
  {
    id: 6,
    name: "activity_file",
    // User-uploaded attachments for an activity. The bytes live on disk under
    // data/uploads/<activity_id>/; only metadata + the stored path is in the DB.
    sql: /* sql */ `
CREATE TABLE activity_file (
  id INTEGER PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES activity (id) ON DELETE CASCADE,
  filename TEXT NOT NULL,        -- original name shown to the user
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  stored_path TEXT NOT NULL,     -- absolute path on disk
  is_image INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_activity_file_activity ON activity_file (activity_id);
`,
  },
];
