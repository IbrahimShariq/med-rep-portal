// database/settingsService.js
// Read / write app_settings table. Used by the attendance system
// to get the admin-configured geofencing radius.

import { getDBConnection } from './db';

/**
 * Read a single setting value from the database.
 * Returns the default value if the key doesn't exist.
 */
export const getSetting = async (key, defaultValue = null) => {
  try {
    const db = await getDBConnection();
    const row = await db.getFirstAsync(
      'SELECT value FROM app_settings WHERE key = ?',
      [key],
    );
    return row ? row.value : defaultValue;
  } catch (err) {
    console.error(`❌ getSetting error [${key}]:`, err);
    return defaultValue;
  }
};

/**
 * Write or update a setting value.
 */
export const setSetting = async (key, value) => {
  try {
    const db = await getDBConnection();
    await db.runAsync(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, String(value)],
    );
    return true;
  } catch (err) {
    console.error(`❌ setSetting error [${key}]:`, err);
    return false;
  }
};

/**
 * Convenience: get attendance radius in meters (admin-configurable, default 300).
 */
export const getAttendanceRadius = async () => {
  const value = await getSetting('attendance_radius_meters', '300');
  return parseInt(value, 10);
};

/**
 * Bulk load all settings into a plain object { key: value }.
 * Used to hydrate the Redux settingsSlice at app launch.
 */
export const getAllSettings = async () => {
  try {
    const db = await getDBConnection();
    const rows = await db.getAllAsync('SELECT key, value FROM app_settings');
    return rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  } catch (err) {
    console.error('❌ getAllSettings error:', err);
    return {};
  }
};
