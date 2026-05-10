// database/attendanceService.js
// Handles the full attendance check-in / check-out lifecycle.
// GPS validation is done HERE using the admin-configured radius.

import { getDBConnection } from './db';
import { getAttendanceRadius } from './settingsService';
import { isWithinRadius } from '../utils/geoUtils';
import { format } from 'date-fns';

// ---------------------------------------------------------------------------
// Attendance Status Constants
// ---------------------------------------------------------------------------
export const ATTENDANCE_STATUS = {
  VALID: 'VALID',
  OUT_OF_BOUNDS: 'OUT_OF_BOUNDS',
  LATE: 'LATE',
};

// ---------------------------------------------------------------------------
// Check In
// ---------------------------------------------------------------------------
/**
 * Record a check-in for a rep.
 * Validates GPS against the configurable radius.
 * If the rep's assigned territory/base has coordinates, distance is measured.
 * If no base is set (offline/no territory), the check-in is stored as VALID.
 *
 * @param {object} params
 * @param {string} params.repId
 * @param {number} params.latitude
 * @param {number} params.longitude
 * @param {object|null} params.baseCoords  — { latitude, longitude } of assigned territory or null
 * @param {string|null} params.exceptionReason  — provided by rep if outside radius
 * @returns {{ success: boolean, attendanceId: number|null, status: string, distanceMeters: number }}
 */
export const checkIn = async ({ repId, latitude, longitude, baseCoords, exceptionReason }) => {
  try {
    const db = await getDBConnection();
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();
    const nowIso = now.toISOString();

    // Prevent double check-in on the same day
    const existing = await db.getFirstAsync(
      'SELECT id FROM attendance WHERE rep_id = ? AND date = ? AND check_in_time IS NOT NULL',
      [repId, today],
    );
    if (existing) {
      return { success: false, error: 'Already checked in today', attendanceId: existing.id };
    }

    // Determine status
    let status = ATTENDANCE_STATUS.VALID;
    let distanceMeters = 0;

    if (baseCoords) {
      const radiusM = await getAttendanceRadius(); // default: 300m, admin-changeable
      const result = isWithinRadius({ latitude, longitude }, baseCoords, radiusM);
      distanceMeters = result.distanceMeters;

      if (!result.withinRadius) {
        status = ATTENDANCE_STATUS.OUT_OF_BOUNDS;
      }
    }

    // Determine if LATE (after 9 AM)
    if (now.getHours() >= 9 && status === ATTENDANCE_STATUS.VALID) {
      status = ATTENDANCE_STATUS.LATE;
    }

    // Ensure numeric values to prevent "cannot convert to kotlintype" errors
    const lat = Number(latitude) || 0;
    const lng = Number(longitude) || 0;
    const dist = Math.round(Number(distanceMeters) || 0);

    const result = await db.runAsync(
      `INSERT INTO attendance
         (rep_id, date, check_in_time, check_in_latitude, check_in_longitude,
          status, exception_reason, distance_from_base_m)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [repId, today, nowIso, lat, lng, status, exceptionReason || null, dist],
    );

    return {
      success: true,
      attendanceId: result.lastInsertRowId,
      status,
      distanceMeters,
    };
  } catch (err) {
    console.error('❌ checkIn error:', err);
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// Check Out
// ---------------------------------------------------------------------------
/**
 * Record a check-out for today's attendance record.
 * @param {object} params
 * @param {string} params.repId
 * @param {number} params.latitude
 * @param {number} params.longitude
 * @returns {{ success: boolean, attendanceId: number|null }}
 */
export const checkOut = async ({ repId, latitude, longitude }) => {
  try {
    const db = await getDBConnection();
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date().toISOString();

    const record = await db.getFirstAsync(
      'SELECT id FROM attendance WHERE rep_id = ? AND date = ? AND check_out_time IS NULL',
      [repId, today],
    );

    if (!record) {
      return { success: false, error: 'No active check-in found for today' };
    }

    const lat = Number(latitude) || 0;
    const lng = Number(longitude) || 0;

    await db.runAsync(
      `UPDATE attendance
       SET check_out_time = ?, check_out_latitude = ?, check_out_longitude = ?, synced = 0
       WHERE id = ?`,
      [now, lat, lng, record.id],
    );

    return { success: true, attendanceId: record.id };
  } catch (err) {
    console.error('❌ checkOut error:', err);
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------
/**
 * Get today's attendance record for a rep.
 */
export const getTodayAttendance = async (repId) => {
  try {
    const db = await getDBConnection();
    const today = format(new Date(), 'yyyy-MM-dd');
    return await db.getFirstAsync(
      'SELECT * FROM attendance WHERE rep_id = ? AND date = ?',
      [repId, today],
    );
  } catch (err) {
    console.error('❌ getTodayAttendance error:', err);
    return null;
  }
};

/**
 * Get full attendance history for a rep.
 */
export const getAttendanceHistory = async (repId, limit = 30) => {
  try {
    const db = await getDBConnection();
    return await db.getAllAsync(
      'SELECT * FROM attendance WHERE rep_id = ? ORDER BY date DESC LIMIT ?',
      [repId, limit],
    );
  } catch (err) {
    console.error('❌ getAttendanceHistory error:', err);
    return [];
  }
};

export const getUnsyncedAttendance = async () => {
  try {
    const db = await getDBConnection();
    return await db.getAllAsync('SELECT * FROM attendance WHERE synced = 0');
  } catch (err) {
    console.error('getUnsyncedAttendance error:', err);
    return [];
  }
};

export const markAttendanceSynced = async (attendanceId) => {
  try {
    const db = await getDBConnection();
    await db.runAsync('UPDATE attendance SET synced = 1 WHERE id = ?', [attendanceId]);
    return true;
  } catch (err) {
    console.error('markAttendanceSynced error:', err);
    return false;
  }
};

/**
 * Update total_km_traveled for a given attendance record.
 * This is ADMIN-ONLY data — never sent to the rep's UI.
 */
export const updateTotalKm = async (attendanceId, totalKm) => {
  try {
    const db = await getDBConnection();
    await db.runAsync(
      'UPDATE attendance SET total_km_traveled = ? WHERE id = ?',
      [totalKm, attendanceId],
    );
    return true;
  } catch (err) {
    console.error('❌ updateTotalKm error:', err);
    return false;
  }
};
