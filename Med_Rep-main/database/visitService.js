// database/visitService.js
// Full visit lifecycle with GPS validation and fraud detection.

import { getDBConnection } from './db';
import { getDoctorById } from './doctorService';
import { haversineDistance, detectTeleport } from '../utils/geoUtils';
import { format } from 'date-fns';

export const VISIT_FLAG = {
  VALID: 'VALID',
  LOCATION_MISMATCH: 'LOCATION_MISMATCH',
  UNREALISTIC_JUMP: 'UNREALISTIC_JUMP',
};

// ---------------------------------------------------------------------------
// Start a Visit (Check-in at doctor location)
// ---------------------------------------------------------------------------
/**
 * @param {object} params
 * @param {string}  params.repId
 * @param {number}  params.doctorId
 * @param {number}  params.latitude     — rep's current GPS latitude
 * @param {number}  params.longitude    — rep's current GPS longitude
 * @param {number|null} params.scheduleId
 * @returns {{ success, visitId, flagStatus, distanceFromDoctorM }}
 */
export const startVisit = async ({ repId, doctorId, latitude, longitude, scheduleId }) => {
  try {
    const db = await getDBConnection();
    const now = new Date().toISOString();
    const today = format(new Date(), 'yyyy-MM-dd');

    // Determine distance from doctor's registered location
    const doctor = await getDoctorById(doctorId);
    let distanceFromDoctorM = 0;
    let flagStatus = VISIT_FLAG.VALID;

    if (doctor?.latitude && doctor?.longitude) {
      distanceFromDoctorM = Math.round(
        haversineDistance(latitude, longitude, doctor.latitude, doctor.longitude),
      );
      if (distanceFromDoctorM > 200) {
        flagStatus = VISIT_FLAG.LOCATION_MISMATCH;
      }
    }

    // Get last completed visit today for teleport detection
    const lastVisit = await db.getFirstAsync(
      `SELECT latitude, longitude, check_out_time as timestamp
       FROM visits
       WHERE rep_id = ? AND date(created_at) = ? AND check_out_time IS NOT NULL
       ORDER BY check_out_time DESC LIMIT 1`,
      [repId, today],
    );

    let distanceFromPrevVisitM = 0;
    if (lastVisit?.latitude) {
      const teleportResult = detectTeleport(
        { latitude: lastVisit.latitude, longitude: lastVisit.longitude, timestamp: new Date(lastVisit.timestamp).getTime() },
        { latitude, longitude, timestamp: Date.now() },
      );
      distanceFromPrevVisitM = teleportResult.distanceMeters;
      if (teleportResult.isSuspicious) {
        flagStatus = VISIT_FLAG.UNREALISTIC_JUMP;
      }
    }

    const result = await db.runAsync(
      `INSERT INTO visits
         (rep_id, doctor_id, schedule_id, check_in_time, latitude, longitude,
          distance_from_doctor_m, distance_from_prev_visit_m, flag_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [repId, doctorId, scheduleId || null, now, latitude, longitude,
       distanceFromDoctorM, distanceFromPrevVisitM, flagStatus],
    );

    return {
      success: true,
      visitId: result.lastInsertRowId,
      flagStatus,
      distanceFromDoctorM,
    };
  } catch (err) {
    console.error('❌ startVisit error:', err);
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// Complete a Visit (Check-out)
// ---------------------------------------------------------------------------
export const completeVisit = async ({ visitId, notes, intentType, medicineId, quantity }) => {
  try {
    const db = await getDBConnection();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE visits
       SET check_out_time = ?, notes = ?, intent_type = ?,
           medicine_id = ?, quantity = ?, synced = 0
       WHERE id = ?`,
      [now, notes, intentType, medicineId, quantity, visitId],
    );
    return { success: true };
  } catch (err) {
    console.error('❌ completeVisit error:', err);
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------
export const getTodayVisits = async (repId) => {
  try {
    const db = await getDBConnection();
    const today = format(new Date(), 'yyyy-MM-dd');
    return await db.getAllAsync(
      `SELECT v.*, d.name as doctor_name, d.specialization
       FROM visits v
       LEFT JOIN doctors d ON v.doctor_id = d.id
       WHERE v.rep_id = ? AND date(v.created_at) = ?
       ORDER BY v.check_in_time DESC`,
      [repId, today],
    );
  } catch (err) {
    console.error('❌ getTodayVisits error:', err);
    return [];
  }
};

export const getVisitHistory = async (repId, limit = 50) => {
  try {
    const db = await getDBConnection();
    return await db.getAllAsync(
      `SELECT v.*, d.name as doctor_name, d.specialization
       FROM visits v
       LEFT JOIN doctors d ON v.doctor_id = d.id
       WHERE v.rep_id = ?
       ORDER BY v.check_in_time DESC LIMIT ?`,
      [repId, limit],
    );
  } catch (err) {
    console.error('❌ getVisitHistory error:', err);
    return [];
  }
};

export const getUnsyncedVisits = async () => {
  try {
    const db = await getDBConnection();
    return await db.getAllAsync('SELECT * FROM visits WHERE synced = 0');
  } catch (err) {
    console.error('❌ getUnsyncedVisits error:', err);
    return [];
  }
};

export const markVisitSynced = async (visitId) => {
  try {
    const db = await getDBConnection();
    await db.runAsync('UPDATE visits SET synced = 1 WHERE id = ?', [visitId]);
    return true;
  } catch (err) {
    console.error('❌ markVisitSynced error:', err);
    return false;
  }
};
