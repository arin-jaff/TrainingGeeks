"use strict";exports.id=1007,exports.ids=[1007],exports.modules={21007:(a,b,c)=>{c.d(b,{L:()=>k});var d=c(79868),e=c(73024),f=c(76760);let g=[{id:1,name:"init",sql:`
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
`},{id:9,name:"share_link",sql:`
CREATE TABLE share_link (
  token TEXT PRIMARY KEY,
  activity_id INTEGER NOT NULL REFERENCES activity (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX idx_share_link_activity ON share_link (activity_id);
`}];var h=c(98220);let i=(0,f.join)(process.cwd(),"data","traininggeeks.db"),j=globalThis;function k(){if(!j.__tgDb){let a=function(a=i){if(":memory:"!==a){let b=(0,f.dirname)(a);(0,e.existsSync)(b)||(0,e.mkdirSync)(b,{recursive:!0})}let b=new d.DatabaseSync(a);b.exec("PRAGMA journal_mode = WAL;"),b.exec("PRAGMA foreign_keys = ON;");b.exec(`CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );`);let c=new Set(b.prepare("SELECT id FROM _migrations").all().map(a=>a.id)),h=[...g].sort((a,b)=>a.id-b.id),j=b.prepare("INSERT INTO _migrations (id, name) VALUES (?, ?)");for(let a of h)if(!c.has(a.id)){b.exec("BEGIN");try{b.exec(a.sql),j.run(a.id,a.name),b.exec("COMMIT")}catch(c){throw b.exec("ROLLBACK"),Error(`Migration ${a.id} (${a.name}) failed: ${c.message}`)}}return b}(process.env.TG_DB_PATH||i);a.prepare("SELECT 1 FROM athlete WHERE id = 1").get()||a.prepare(`INSERT INTO athlete (id, name, email, units, timezone)
       VALUES (1, ?, ?, 'imperial', 'America/New_York')`).run("Arin Jaff","arin@phia.com");let b=a.prepare("SELECT 1 FROM threshold WHERE curve = ? AND metric = ?"),c=a.prepare("INSERT INTO threshold (curve, metric, value, valid_from) VALUES (?, ?, ?, ?)");for(let[a,d,e]of[["run","threshold_pace",1609.34/381],["run","threshold_hr",180],["run","max_hr",200],["run","resting_hr",40],["bike","ftp",250],["bike","threshold_hr",180],["swim","threshold_pace",100/105]])b.get(a,d)||c.run(a,d,e,"2000-01-01");let k=process.env.TG_INTERVALS_ATHLETE_ID,l=process.env.TG_INTERVALS_API_KEY;k&&l&&(0,h.vt)(a,"intervals",{athlete_id:k,api_key:l,enabled:1}),j.__tgDb=a}return j.__tgDb}},98220:(a,b,c)=>{function d(a,b,...c){return a.prepare(b).all(...c).map(a=>({...a}))}function e(a,b,...c){let d=a.prepare(b).get(...c);return d?{...d}:void 0}function f(a){return e(a,"SELECT * FROM athlete WHERE id = 1")}function g(a,b){let c=Object.keys(b).filter(a=>"id"!==a);if(0===c.length)return;let d=c.map(a=>`${a} = ?`).join(", "),e=c.map(a=>b[a]);a.prepare(`UPDATE athlete SET ${d}, updated_at = datetime('now') WHERE id = 1`).run(...e)}function h(a,b,c,d){let f=e(a,`SELECT value FROM threshold
     WHERE curve = ? AND metric = ? AND valid_from <= ?
     ORDER BY valid_from DESC LIMIT 1`,b,c,d);return f?.value}function i(a,b,c,d,e){a.prepare("INSERT INTO threshold (curve, metric, value, valid_from) VALUES (?, ?, ?, ?)").run(b,c,d,e)}function j(a,b,c,d,e){a.prepare("DELETE FROM zone WHERE curve = ? AND metric = ?").run(b,c);let f=a.prepare("INSERT INTO zone (curve, metric, zone_index, name, low, high, valid_from) VALUES (?, ?, ?, ?, ?, ?, ?)");d.forEach((a,d)=>f.run(b,c,d,a.name,a.low,a.high,e))}c.d(b,{$x:()=>aa,$y:()=>p,Bj:()=>C,Bt:()=>T,C4:()=>F,DZ:()=>Q,F9:()=>P,G9:()=>V,I1:()=>S,J6:()=>G,KX:()=>i,Lg:()=>h,NW:()=>I,Ox:()=>O,PH:()=>R,PL:()=>W,Pj:()=>z,Q$:()=>x,R1:()=>B,SX:()=>Z,T1:()=>J,Ul:()=>Y,VP:()=>U,Wg:()=>_,Xo:()=>u,YC:()=>A,YR:()=>n,ZC:()=>X,aN:()=>j,aZ:()=>m,bQ:()=>t,b_:()=>M,c9:()=>E,d1:()=>L,dU:()=>q,eF:()=>o,jH:()=>l,k8:()=>v,lz:()=>$,pL:()=>y,pt:()=>g,sQ:()=>D,uH:()=>H,uo:()=>s,vt:()=>N,wR:()=>K,wb:()=>ac,wc:()=>f,x1:()=>ab,xm:()=>ad,zg:()=>w});let k=["modality","sport_detail","source","fit_hash","raw_path","start_time","local_date","timezone","name","notes","private_notes","duration_s","elapsed_s","distance_m","elevation_gain_m","avg_hr","max_hr","avg_power","max_power","np","avg_speed_mps","max_speed_mps","avg_cadence","max_cadence","calories","kj","tss","s3","intensity_factor","variability_index","efficiency_factor","decoupling","rpe","route_polyline","metrics_version"];function l(a,b){let c=k.filter(a=>void 0!==b[a]),d=c.map(()=>"?").join(", "),e=c.map(a=>b[a]??null);return Number(a.prepare(`INSERT INTO activity (${c.join(", ")}) VALUES (${d})`).run(...e).lastInsertRowid)}function m(a,b){return e(a,"SELECT * FROM activity WHERE id = ?",b)}function n(a,b,c){return d(a,`SELECT * FROM activity WHERE local_date >= ? AND local_date <= ?
     ORDER BY start_time`,b,c)}function o(a,b,c){let d=Object.keys(c).filter(a=>"id"!==a&&"created_at"!==a);if(0===d.length)return;let e=d.map(a=>`${a} = ?`).join(", "),f=d.map(a=>c[a]);a.prepare(`UPDATE activity SET ${e}, updated_at = datetime('now') WHERE id = ?`).run(...f,b)}function p(a,b){a.prepare("DELETE FROM activity WHERE id = ?").run(b),r(a,b)}let q="duplicates_dismissed";function r(a,b){let c=W(a,q);if(c)try{let d=JSON.parse(c);if(!Array.isArray(d))return;let e=d.map(String).filter(a=>!a.split("-").includes(String(b)));e.length!==d.length&&X(a,q,JSON.stringify(e))}catch{}}function s(a,b,c,d=[]){if(b===c)return!1;let e=m(a,b),f=m(a,c);if(!e||!f)return!1;let g=new Set(k),h=[...new Set(d)].filter(a=>g.has(a)),i={};for(let a of h){let b=f[a];null!=b&&("string"!=typeof b||""!==b.trim())&&(i[a]=b)}a.exec("BEGIN");try{Object.keys(i).length>0&&o(a,b,i);let d=(b,c)=>a.prepare(`SELECT COUNT(*) AS n FROM ${b} WHERE activity_id = ?`).get(c).n,e=d=>a.prepare(`UPDATE ${d} SET activity_id = ? WHERE activity_id = ?`).run(b,c);0===d("activity_stream",b)&&(e("activity_stream"),a.prepare("DELETE FROM peak WHERE activity_id = ?").run(b),e("peak"));let f=d("lap",c);f>1&&f>d("lap",b)&&(a.prepare("DELETE FROM lap WHERE activity_id = ?").run(b),e("lap")),0===d("strength_set",b)&&e("strength_set"),a.prepare("UPDATE activity_file SET activity_id = ? WHERE activity_id = ?").run(b,c),a.prepare("UPDATE planned_workout SET completed_activity_id = ? WHERE completed_activity_id = ?").run(b,c),a.prepare("DELETE FROM activity WHERE id = ?").run(c),r(a,c),a.exec("COMMIT")}catch(b){throw a.exec("ROLLBACK"),b}return!0}function t(a,b){return d(a,"SELECT * FROM activity_file WHERE activity_id = ? ORDER BY created_at, id",b)}function u(a,b,c){a.prepare("DELETE FROM strength_set WHERE activity_id = ?").run(b);let d=a.prepare(`INSERT INTO strength_set (activity_id, set_index, exercise_key, exercise_name,
       reps, duration_s, rest_s, weight_kg)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);c.forEach((a,c)=>d.run(b,a.set_index??c,a.exercise_key,a.exercise_name??null,a.reps,a.duration_s,a.rest_s,a.weight_kg))}function v(a,b){let c=e(a,"SELECT channels FROM activity_stream WHERE activity_id = ?",b);return c?JSON.parse(c.channels):void 0}function w(a,b){a.prepare(`INSERT INTO daily_load (date, curve, stress, ctl, atl, tsb)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (date, curve) DO UPDATE SET
       stress = excluded.stress, ctl = excluded.ctl,
       atl = excluded.atl, tsb = excluded.tsb`).run(b.date,b.curve,b.stress,b.ctl,b.atl,b.tsb)}function x(a){return d(a,"SELECT local_date, modality, tss, s3 FROM activity")}function y(a){a.prepare("DELETE FROM daily_load").run()}function z(a){let b=e(a,"SELECT MIN(local_date) AS d FROM activity");return b?.d??void 0}function A(a,b){return Number(a.prepare(`INSERT INTO planned_workout
         (modality, date, name, description, planned_duration_s, planned_distance_m, planned_tss, source, structure, template_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(b.modality,b.date,b.name??null,b.description??null,b.planned_duration_s??null,b.planned_distance_m??null,b.planned_tss??null,b.source,b.structure??null,b.template_id??null).lastInsertRowid)}function B(a,b,c){a.prepare("UPDATE planned_workout SET date = ?, updated_at = datetime('now') WHERE id = ?").run(c,b)}function C(a,b){return e(a,"SELECT * FROM planned_workout WHERE id = ?",b)}function D(a,b,c){let d=Object.keys(c);if(0===d.length)return;let e=d.map(a=>`${a} = ?`).join(", "),f=d.map(a=>c[a]);a.prepare(`UPDATE planned_workout SET ${e}, updated_at = datetime('now') WHERE id = ?`).run(...f,b)}function E(a,b,c){a.prepare("UPDATE planned_workout SET completed_activity_id = ?, updated_at = datetime('now') WHERE id = ?").run(c,b)}function F(a,b){a.prepare("DELETE FROM planned_workout WHERE id = ?").run(b)}function G(a,b){a.prepare(`DELETE FROM planned_workout
     WHERE source = ? AND completed_activity_id IS NULL`).run(b)}function H(a,b,c){a.prepare("UPDATE activity SET local_date = ?, updated_at = datetime('now') WHERE id = ?").run(c,b)}function I(a,b){return Number(a.prepare(`INSERT INTO workout_template
         (name, modality, description, steps, est_duration_s, est_distance_m, est_tss)
       VALUES (?, ?, ?, ?, ?, ?, ?)`).run(b.name,b.modality,b.description??null,b.steps,b.est_duration_s??null,b.est_distance_m??null,b.est_tss??null).lastInsertRowid)}function J(a,b,c){a.prepare(`UPDATE workout_template
        SET name = ?, modality = ?, description = ?, steps = ?,
            est_duration_s = ?, est_distance_m = ?, est_tss = ?,
            updated_at = datetime('now')
      WHERE id = ?`).run(c.name,c.modality,c.description??null,c.steps,c.est_duration_s??null,c.est_distance_m??null,c.est_tss??null,b)}function K(a,b){return e(a,"SELECT * FROM workout_template WHERE id = ?",b)}function L(a){return d(a,"SELECT * FROM workout_template ORDER BY updated_at DESC, id DESC")}function M(a,b){a.prepare("DELETE FROM workout_template WHERE id = ?").run(b)}function N(a,b,c){a.prepare(`INSERT INTO connector_account (provider, api_key, athlete_id, last_sync_cursor, enabled)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (provider) DO UPDATE SET
       api_key = COALESCE(excluded.api_key, connector_account.api_key),
       athlete_id = COALESCE(excluded.athlete_id, connector_account.athlete_id),
       last_sync_cursor = COALESCE(excluded.last_sync_cursor, connector_account.last_sync_cursor),
       enabled = excluded.enabled,
       updated_at = datetime('now')`).run(b,c.api_key??null,c.athlete_id??null,c.last_sync_cursor??null,c.enabled??0)}function O(a,b,c,d,e){a.prepare(`INSERT INTO metric (type, date, value, notes) VALUES (?, ?, ?, ?)
     ON CONFLICT (type, date) DO UPDATE SET value = excluded.value, notes = excluded.notes`).run(b,c,d,e??null)}function P(a,b){return Number(a.prepare("INSERT INTO injury (title, body_part, start_date, notes) VALUES (?, ?, ?, ?)").run(b.title,b.body_part??null,b.start_date,b.notes??null).lastInsertRowid)}function Q(a,b,c){a.prepare("UPDATE injury SET end_date = ? WHERE id = ?").run(c,b)}function R(a,b){a.prepare("DELETE FROM injury WHERE id = ?").run(b)}function S(a,b){return Number(a.prepare("INSERT INTO equipment (type, name, brand, distance_m) VALUES (?, ?, ?, ?)").run(b.type,b.name,b.brand??null,b.distance_m??0).lastInsertRowid)}function T(a,b,c){a.prepare("UPDATE equipment SET distance_m = distance_m + ? WHERE id = ?").run(c,b)}function U(a,b,c){a.prepare("UPDATE equipment SET active = ? WHERE id = ?").run(+!!c,b)}function V(a,b){a.prepare("DELETE FROM equipment WHERE id = ?").run(b)}function W(a,b){let c=e(a,"SELECT value FROM app_setting WHERE key = ?",b);return c?.value??null}function X(a,b,c){a.prepare(`INSERT INTO app_setting (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`).run(b,c)}function Y(a,b,c,d){a.prepare("INSERT INTO event (name, date, notes) VALUES (?, ?, ?)").run(b,c,d??null)}function Z(a,b){a.prepare("DELETE FROM event WHERE id = ?").run(b)}function $(a,b){a.prepare("INSERT INTO goal (text) VALUES (?)").run(b)}function _(a,b,c){a.prepare("UPDATE goal SET done = ? WHERE id = ?").run(+!!c,b)}function aa(a,b){a.prepare("DELETE FROM goal WHERE id = ?").run(b)}function ab(a,b,c){a.prepare("INSERT INTO share_link (token, activity_id) VALUES (?, ?)").run(c,b)}function ac(a,b){return e(a,"SELECT * FROM share_link WHERE activity_id = ?",b)}function ad(a,b){a.prepare("DELETE FROM share_link WHERE activity_id = ?").run(b)}}};