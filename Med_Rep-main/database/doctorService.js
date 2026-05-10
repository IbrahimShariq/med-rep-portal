// database/doctorService.js
// Full CRUD for the doctors table.

import { getDBConnection } from './db';

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------
export const addDoctor = async ({
  name,
  degree,
  specialization,
  priority = 2,
  territory,
  latitude,
  longitude,
  phone,
  notes,
}) => {
  try {
    const db = await getDBConnection();
    const result = await db.runAsync(
      `INSERT INTO doctors
         (name, degree, specialization, priority, territory, latitude, longitude, phone, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, degree, specialization, priority, territory, latitude, longitude, phone, notes],
    );
    return { success: true, doctorId: result.lastInsertRowId };
  } catch (err) {
    console.error('❌ addDoctor error:', err);
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------
export const getAllDoctors = async () => {
  try {
    const db = await getDBConnection();
    return await db.getAllAsync(
      'SELECT * FROM doctors WHERE is_active = 1 ORDER BY priority ASC, name ASC',
    );
  } catch (err) {
    console.error('❌ getAllDoctors error:', err);
    return [];
  }
};

export const upsertDoctorsFromPortal = async (doctors = []) => {
  try {
    const db = await getDBConnection();
    for (const doctor of doctors) {
      await db.runAsync(
        `INSERT INTO doctors
           (id, name, degree, specialization, priority, territory, latitude, longitude, phone, notes, is_active, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           degree = excluded.degree,
           specialization = excluded.specialization,
           priority = excluded.priority,
           territory = excluded.territory,
           latitude = excluded.latitude,
           longitude = excluded.longitude,
           phone = excluded.phone,
           notes = excluded.notes,
           is_active = excluded.is_active,
           synced = 1`,
        [
          Number(doctor.id),
          doctor.name,
          doctor.degree || null,
          doctor.specialization || null,
          Number(doctor.priority || 2),
          doctor.territory || null,
          doctor.latitude == null ? null : Number(doctor.latitude),
          doctor.longitude == null ? null : Number(doctor.longitude),
          doctor.phone || null,
          doctor.notes || null,
          doctor.is_active ?? 1,
        ],
      );
    }
    return { success: true };
  } catch (err) {
    console.error('upsertDoctorsFromPortal error:', err);
    return { success: false, error: err.message };
  }
};

export const getDoctorById = async (id) => {
  try {
    const db = await getDBConnection();
    return await db.getFirstAsync('SELECT * FROM doctors WHERE id = ?', [id]);
  } catch (err) {
    console.error('❌ getDoctorById error:', err);
    return null;
  }
};

export const searchDoctors = async (query) => {
  try {
    const db = await getDBConnection();
    const q = `%${query}%`;
    return await db.getAllAsync(
      `SELECT * FROM doctors
       WHERE is_active = 1 AND (name LIKE ? OR specialization LIKE ? OR territory LIKE ?)
       ORDER BY name ASC`,
      [q, q, q],
    );
  } catch (err) {
    console.error('❌ searchDoctors error:', err);
    return [];
  }
};

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------
export const updateDoctor = async (id, updates) => {
  try {
    const db = await getDBConnection();
    const {
      name,
      degree,
      specialization,
      priority,
      territory,
      latitude,
      longitude,
      phone,
      notes,
    } = updates;
    await db.runAsync(
      `UPDATE doctors
       SET name = ?, degree = ?, specialization = ?, priority = ?,
           territory = ?, latitude = ?, longitude = ?, phone = ?, notes = ?,
           synced = 0
       WHERE id = ?`,
      [name, degree, specialization, priority, territory, latitude, longitude, phone, notes, id],
    );
    return { success: true };
  } catch (err) {
    console.error('❌ updateDoctor error:', err);
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// Soft Delete
// ---------------------------------------------------------------------------
export const deactivateDoctor = async (id) => {
  try {
    const db = await getDBConnection();
    await db.runAsync('UPDATE doctors SET is_active = 0 WHERE id = ?', [id]);
    return { success: true };
  } catch (err) {
    console.error('❌ deactivateDoctor error:', err);
    return { success: false, error: err.message };
  }
};
