// database/db.js
import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'medRep.db';
let databasePromise;
let queuedDatabasePromise;
let operationQueue = Promise.resolve();

const enqueue = (operation) => {
  const nextOperation = operationQueue.then(operation, operation);
  operationQueue = nextOperation.catch(() => undefined);
  return nextOperation;
};

const createQueuedDatabase = (db) => ({
  execAsync: (sql) => enqueue(() => db.execAsync(sql)),
  runAsync: (sql, params = []) => enqueue(() => db.runAsync(sql, params)),
  getAllAsync: (sql, params = []) => enqueue(() => db.getAllAsync(sql, params)),
  getFirstAsync: (sql, params = []) => enqueue(() => db.getFirstAsync(sql, params)),
});

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------
export const getDBConnection = async () => {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  if (!queuedDatabasePromise) {
    queuedDatabasePromise = databasePromise.then(createQueuedDatabase);
  }
  return queuedDatabasePromise;
};

// ---------------------------------------------------------------------------
// Table Creation
// ---------------------------------------------------------------------------
export const createTables = async (db) => {
  await db.execAsync(`PRAGMA journal_mode = WAL;`);

  // ── Doctors ──────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS doctors (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      degree      TEXT,
      specialization TEXT,
      priority    INTEGER DEFAULT 2,       -- 1=High  2=Medium  3=Low
      territory   TEXT,
      latitude    REAL,
      longitude   REAL,
      phone       TEXT,
      notes       TEXT,
      is_active   INTEGER DEFAULT 1,
      created_at  TEXT    DEFAULT (datetime('now')),
      synced      INTEGER DEFAULT 0
    );
  `);

  // ── Medicines ─────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS medicines (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      description TEXT,
      created_at  TEXT    DEFAULT (datetime('now'))
    );
  `);

  // ── Attendance ────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS attendance (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      rep_id              TEXT    NOT NULL,
      date                TEXT    NOT NULL,
      check_in_time       TEXT,
      check_out_time      TEXT,
      check_in_latitude   REAL,
      check_in_longitude  REAL,
      check_out_latitude  REAL,
      check_out_longitude REAL,
      status              TEXT    DEFAULT 'VALID',  -- VALID | OUT_OF_BOUNDS | LATE
      exception_reason    TEXT,
      distance_from_base_m INTEGER,
      total_km_traveled   REAL    DEFAULT 0,        -- ADMIN-ONLY field
      synced              INTEGER DEFAULT 0,
      created_at          TEXT    DEFAULT (datetime('now'))
    );
  `);

  // ── Schedules ─────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schedules (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id   INTEGER,
      date        TEXT,
      shift       TEXT,
      notes       TEXT,
      created_at  TEXT DEFAULT (datetime('now')),
      synced      INTEGER DEFAULT 0
    );
  `);

  // ── Visits ────────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS visits (
      id                          INTEGER PRIMARY KEY AUTOINCREMENT,
      schedule_id                 INTEGER,
      doctor_id                   INTEGER,
      rep_id                      TEXT,
      medicine_id                 INTEGER,
      quantity                    INTEGER,
      check_in_time               TEXT,
      check_out_time              TEXT,
      latitude                    REAL,
      longitude                   REAL,
      distance_from_doctor_m      INTEGER DEFAULT 0,
      distance_from_prev_visit_m  INTEGER DEFAULT 0,
      flag_status                 TEXT    DEFAULT 'VALID', -- VALID | LOCATION_MISMATCH | UNREALISTIC_JUMP
      notes                       TEXT,
      intent_type                 TEXT,
      created_at                  TEXT    DEFAULT (datetime('now')),
      synced                      INTEGER DEFAULT 0
    );
  `);

  // ── GPS Tracking Log ──────────────────────────────────────────────────────
  // Stores batched GPS pings — not shown to reps, used for route analysis
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS gps_tracking_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      rep_id      TEXT    NOT NULL,
      latitude    REAL    NOT NULL,
      longitude   REAL    NOT NULL,
      accuracy    REAL,
      timestamp   TEXT    NOT NULL,
      date        TEXT    NOT NULL,
      synced      INTEGER DEFAULT 0
    );
  `);

  // ── App Settings ──────────────────────────────────────────────────────────
  // Key-value config store. Admins can update values via portal (synced down).
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key         TEXT PRIMARY KEY NOT NULL,
      value       TEXT NOT NULL,
      updated_at  TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed default settings if not already present
  await db.execAsync(`
    INSERT OR IGNORE INTO app_settings (key, value) VALUES
      ('attendance_radius_meters', '300'),
      ('visit_proximity_warning_meters', '200'),
      ('teleport_max_speed_kmh', '120'),
      ('late_checkin_after_hour', '9'),
      ('offline_sync_expiry_hours', '24');
  `);

  console.log('✅ Database ready (v2 schema)');
};
