"use strict";exports.id=4752,exports.ids=[4752],exports.modules={6915:(a,b,c)=>{function d(a,b,...c){return a.prepare(b).all(...c).map(a=>({...a}))}function e(a,b,...c){let d=a.prepare(b).get(...c);return d?{...d}:void 0}function f(a){return e(a,"SELECT * FROM athlete WHERE id = 1")}function g(a,b,c,d){let f=e(a,`SELECT value FROM threshold
     WHERE curve = ? AND metric = ? AND valid_from <= ?
     ORDER BY valid_from DESC LIMIT 1`,b,c,d);return f?.value}function h(a,b,c){return d(a,"SELECT * FROM zone WHERE curve = ? AND metric = ? ORDER BY zone_index",b,c)}c.d(b,{Bj:()=>K,CR:()=>L,EP:()=>J,Eu:()=>Y,F3:()=>p,HB:()=>n,Hj:()=>o,Ir:()=>ac,JH:()=>H,Lg:()=>g,Nc:()=>s,Ox:()=>U,Oz:()=>D,PL:()=>aa,Pj:()=>G,Q$:()=>E,RD:()=>W,Rv:()=>V,SJ:()=>S,TP:()=>Z,Xo:()=>v,Y9:()=>r,YC:()=>I,YR:()=>m,Z1:()=>$,ZC:()=>ab,_e:()=>w,aZ:()=>k,bQ:()=>q,bb:()=>P,bw:()=>h,d1:()=>N,f0:()=>l,iQ:()=>B,j7:()=>t,jH:()=>j,k8:()=>z,lW:()=>R,nK:()=>X,pL:()=>F,pr:()=>_,qG:()=>O,rF:()=>Q,rY:()=>A,to:()=>u,vt:()=>T,wG:()=>y,wR:()=>M,wU:()=>x,wc:()=>f,z8:()=>ad,zg:()=>C});let i=["modality","sport_detail","source","fit_hash","raw_path","start_time","local_date","timezone","name","notes","private_notes","duration_s","elapsed_s","distance_m","elevation_gain_m","avg_hr","max_hr","avg_power","max_power","np","avg_speed_mps","max_speed_mps","avg_cadence","max_cadence","calories","kj","tss","s3","intensity_factor","variability_index","efficiency_factor","decoupling","rpe","route_polyline","metrics_version"];function j(a,b){let c=i.filter(a=>void 0!==b[a]),d=c.map(()=>"?").join(", "),e=c.map(a=>b[a]??null);return Number(a.prepare(`INSERT INTO activity (${c.join(", ")}) VALUES (${d})`).run(...e).lastInsertRowid)}function k(a,b){return e(a,"SELECT * FROM activity WHERE id = ?",b)}function l(a,b){return e(a,"SELECT * FROM activity WHERE fit_hash = ?",b)}function m(a,b,c){return d(a,`SELECT * FROM activity WHERE local_date >= ? AND local_date <= ?
     ORDER BY start_time`,b,c)}function n(a,b){return e(a,`SELECT * FROM activity WHERE modality = ?
     ORDER BY start_time DESC LIMIT 1`,b)}function o(a,b,c,d){let f=c&&d?"AND local_date >= ? AND local_date <= ?":"";return e(a,`SELECT COUNT(*) AS count,
            COALESCE(SUM(duration_s), 0) AS durationS,
            COALESCE(SUM(distance_m), 0) AS distanceM,
            COALESCE(SUM(tss), 0) AS tss,
            COALESCE(SUM(s3), 0) AS s3
       FROM activity WHERE modality = ? ${f}`,...c&&d?[b,c,d]:[b])??{count:0,durationS:0,distanceM:0,tss:0,s3:0}}function p(a,b){return Number(a.prepare(`INSERT INTO activity_file (activity_id, filename, mime, size, stored_path, is_image)
       VALUES (?, ?, ?, ?, ?, ?)`).run(b.activity_id,b.filename,b.mime,b.size,b.stored_path,b.is_image).lastInsertRowid)}function q(a,b){return d(a,"SELECT * FROM activity_file WHERE activity_id = ? ORDER BY created_at, id",b)}function r(a,b){return e(a,"SELECT * FROM activity_file WHERE id = ?",b)}function s(a){let b=d(a,"SELECT id, activity_id FROM activity_file WHERE is_image = 1 ORDER BY created_at, id"),c=new Map;for(let a of b){let b=c.get(a.activity_id)??[];b.push(a.id),c.set(a.activity_id,b)}return c}function t(a,b){a.prepare("DELETE FROM activity_file WHERE id = ?").run(b)}function u(a,b){return d(a,"SELECT * FROM strength_set WHERE activity_id = ? ORDER BY set_index",b)}function v(a,b,c){a.prepare("DELETE FROM strength_set WHERE activity_id = ?").run(b);let d=a.prepare(`INSERT INTO strength_set (activity_id, set_index, exercise_key, exercise_name,
       reps, duration_s, rest_s, weight_kg)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);c.forEach((a,c)=>d.run(b,a.set_index??c,a.exercise_key,a.exercise_name??null,a.reps,a.duration_s,a.rest_s,a.weight_kg))}function w(a){return d(a,`SELECT s.*, a.local_date FROM strength_set s
       JOIN activity a ON a.id = s.activity_id
      ORDER BY a.local_date, s.set_index`)}function x(a,b){let c=new Map;if(0===b.length)return c;let e=b.map(()=>"?").join(", ");for(let f of d(a,`SELECT activity_id, MIN(id) AS file_id FROM activity_file
     WHERE is_image = 1 AND activity_id IN (${e})
     GROUP BY activity_id`,...b))c.set(f.activity_id,f.file_id);return c}function y(a,b,c){let d=Object.values(c).map(a=>a.length),e=d.length?Math.max(...d):0;a.prepare(`INSERT INTO activity_stream (activity_id, sample_count, channels)
     VALUES (?, ?, ?)
     ON CONFLICT (activity_id) DO UPDATE SET sample_count = excluded.sample_count, channels = excluded.channels`).run(b,e,JSON.stringify(c))}function z(a,b){let c=e(a,"SELECT channels FROM activity_stream WHERE activity_id = ?",b);return c?JSON.parse(c.channels):void 0}function A(a,b){return d(a,"SELECT * FROM lap WHERE activity_id = ? ORDER BY lap_index",b)}function B(a){return d(a,`SELECT a.id, a.modality, a.local_date, a.name, s.channels
       FROM activity a
       JOIN activity_stream s ON s.activity_id = a.id
      ORDER BY a.local_date`)}function C(a,b){a.prepare(`INSERT INTO daily_load (date, curve, stress, ctl, atl, tsb)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (date, curve) DO UPDATE SET
       stress = excluded.stress, ctl = excluded.ctl,
       atl = excluded.atl, tsb = excluded.tsb`).run(b.date,b.curve,b.stress,b.ctl,b.atl,b.tsb)}function D(a,b,c,e){return d(a,`SELECT * FROM daily_load WHERE curve = ? AND date >= ? AND date <= ?
     ORDER BY date`,b,c,e)}function E(a){return d(a,"SELECT local_date, modality, tss, s3 FROM activity")}function F(a){a.prepare("DELETE FROM daily_load").run()}function G(a){let b=e(a,"SELECT MIN(local_date) AS d FROM activity");return b?.d??void 0}function H(a,b,c){return d(a,"SELECT * FROM planned_workout WHERE date >= ? AND date <= ? ORDER BY date",b,c)}function I(a,b){return Number(a.prepare(`INSERT INTO planned_workout
         (modality, date, name, description, planned_duration_s, planned_distance_m, planned_tss, source, structure, template_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(b.modality,b.date,b.name??null,b.description??null,b.planned_duration_s??null,b.planned_distance_m??null,b.planned_tss??null,b.source,b.structure??null,b.template_id??null).lastInsertRowid)}function J(a,b,c,d){a.prepare(`DELETE FROM planned_workout
     WHERE source = ? AND date >= ? AND date <= ? AND completed_activity_id IS NULL`).run(b,c,d)}function K(a,b){return e(a,"SELECT * FROM planned_workout WHERE id = ?",b)}function L(a){return d(a,`SELECT source,
            COUNT(*)        AS count,
            MIN(date)       AS start_date,
            MAX(date)       AS end_date
       FROM planned_workout
      WHERE source LIKE 'plan:%'
      GROUP BY source`)}function M(a,b){return e(a,"SELECT * FROM workout_template WHERE id = ?",b)}function N(a){return d(a,"SELECT * FROM workout_template ORDER BY updated_at DESC, id DESC")}function O(a,b){return d(a,"SELECT * FROM peak WHERE activity_id = ? ORDER BY kind, window",b)}function P(a){return d(a,`SELECT p.window AS window, p.value AS speed, p.activity_id AS activity_id,
            a.local_date AS date, a.modality AS modality
     FROM peak p JOIN activity a ON a.id = p.activity_id
     WHERE p.kind = 'pace' AND p.basis = 'distance'
     ORDER BY p.window ASC, p.value DESC`)}function Q(a,b,c){return d(a,`SELECT window, MAX(value) AS value
       FROM peak WHERE kind = ? AND basis = ?
      GROUP BY window ORDER BY window ASC`,b,c)}function R(a){return d(a,"SELECT type, COUNT(*) AS n FROM metric GROUP BY type ORDER BY n DESC")}function S(a,b){return e(a,"SELECT * FROM connector_account WHERE provider = ?",b)}function T(a,b,c){a.prepare(`INSERT INTO connector_account (provider, api_key, athlete_id, last_sync_cursor, enabled)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (provider) DO UPDATE SET
       api_key = COALESCE(excluded.api_key, connector_account.api_key),
       athlete_id = COALESCE(excluded.athlete_id, connector_account.athlete_id),
       last_sync_cursor = COALESCE(excluded.last_sync_cursor, connector_account.last_sync_cursor),
       enabled = excluded.enabled,
       updated_at = datetime('now')`).run(b,c.api_key??null,c.athlete_id??null,c.last_sync_cursor??null,c.enabled??0)}function U(a,b,c,d,e){a.prepare(`INSERT INTO metric (type, date, value, notes) VALUES (?, ?, ?, ?)
     ON CONFLICT (type, date) DO UPDATE SET value = excluded.value, notes = excluded.notes`).run(b,c,d,e??null)}function V(a,b,c,e){return d(a,"SELECT * FROM metric WHERE type = ? AND date >= ? AND date <= ? ORDER BY date",b,c,e)}function W(a){return d(a,`SELECT m.* FROM metric m
     JOIN (SELECT type, MAX(date) d FROM metric GROUP BY type) x
       ON x.type = m.type AND x.d = m.date`)}function X(a,b=20){return d(a,"SELECT * FROM metric ORDER BY date DESC, id DESC LIMIT ?",b)}function Y(a){return d(a,"SELECT * FROM injury ORDER BY (end_date IS NOT NULL), start_date DESC")}function Z(a,b,c){return d(a,`SELECT * FROM injury
     WHERE start_date <= ? AND (end_date IS NULL OR end_date >= ?)`,c,b)}function $(a){return d(a,"SELECT * FROM equipment ORDER BY active DESC, type, name")}function _(a){let b=d(a,"SELECT key, value FROM app_setting"),c={};for(let a of b)c[a.key]=a.value;return c}function aa(a,b){let c=e(a,"SELECT value FROM app_setting WHERE key = ?",b);return c?.value??null}function ab(a,b,c){a.prepare(`INSERT INTO app_setting (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`).run(b,c)}function ac(a){return d(a,"SELECT * FROM event ORDER BY date")}function ad(a){return d(a,"SELECT * FROM goal ORDER BY done, created_at")}},54752:(a,b,c)=>{c.d(b,{L:()=>k});var d=c(79868),e=c(73024),f=c(76760);let g=[{id:1,name:"init",sql:`
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
`},{id:2,name:"app_settings",sql:`
CREATE TABLE app_setting (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`},{id:3,name:"metric",sql:`
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
`},{id:4,name:"injury_equipment",sql:`
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
`},{id:5,name:"activity_private_notes",sql:"ALTER TABLE activity ADD COLUMN private_notes TEXT;"},{id:6,name:"activity_file",sql:`
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
`},{id:7,name:"strength_set",sql:`
CREATE TABLE strength_set (
  id INTEGER PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES activity (id) ON DELETE CASCADE,
  set_index INTEGER NOT NULL,
  exercise_key TEXT NOT NULL DEFAULT 'unknown', -- e.g. benchPress, lateralRaise
  exercise_name TEXT,                            -- user override; NULL = derived
  reps INTEGER,
  duration_s REAL,
  rest_s REAL,
  weight_kg REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_strength_set_activity ON strength_set (activity_id, set_index);
CREATE INDEX idx_strength_set_exercise ON strength_set (exercise_key);
`},{id:8,name:"workout_template",sql:`
CREATE TABLE workout_template (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  modality TEXT NOT NULL,
  description TEXT,
  steps TEXT NOT NULL,            -- JSON: WorkoutStep[]
  est_duration_s REAL,
  est_distance_m REAL,
  est_tss REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE planned_workout ADD COLUMN structure TEXT;       -- JSON WorkoutStep[]
ALTER TABLE planned_workout ADD COLUMN template_id INTEGER;  -- source template, nullable
`}];var h=c(6915);let i=(0,f.join)(process.cwd(),"data","traininggeeks.db"),j=globalThis;function k(){if(!j.__tgDb){let a=function(a=i){if(":memory:"!==a){let b=(0,f.dirname)(a);(0,e.existsSync)(b)||(0,e.mkdirSync)(b,{recursive:!0})}let b=new d.DatabaseSync(a);b.exec("PRAGMA journal_mode = WAL;"),b.exec("PRAGMA foreign_keys = ON;");b.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`);let c=new Set(b.prepare("SELECT id FROM _migrations").all().map(a=>a.id)),h=[...g].sort((a,b)=>a.id-b.id),j=b.prepare("INSERT INTO _migrations (id, name) VALUES (?, ?)");for(let a of h)if(!c.has(a.id)){b.exec("BEGIN");try{b.exec(a.sql),j.run(a.id,a.name),b.exec("COMMIT")}catch(c){throw b.exec("ROLLBACK"),Error(`Migration ${a.id} (${a.name}) failed: ${c.message}`)}}return b}(process.env.TG_DB_PATH||i);a.prepare("SELECT 1 FROM athlete WHERE id = 1").get()||a.prepare(`INSERT INTO athlete (id, name, email, units, timezone)
       VALUES (1, ?, ?, 'imperial', 'America/New_York')`).run("Arin Jaff","arin@phia.com");let b=a.prepare("SELECT 1 FROM threshold WHERE curve = ? AND metric = ?"),c=a.prepare("INSERT INTO threshold (curve, metric, value, valid_from) VALUES (?, ?, ?, ?)");for(let[a,d,e]of[["run","threshold_pace",1609.34/381],["run","threshold_hr",180],["run","max_hr",200],["run","resting_hr",40],["bike","ftp",250],["bike","threshold_hr",180],["swim","threshold_pace",100/105]])b.get(a,d)||c.run(a,d,e,"2000-01-01");let k=process.env.TG_INTERVALS_ATHLETE_ID,l=process.env.TG_INTERVALS_API_KEY;k&&l&&(0,h.vt)(a,"intervals",{athlete_id:k,api_key:l,enabled:1}),j.__tgDb=a}return j.__tgDb}}};