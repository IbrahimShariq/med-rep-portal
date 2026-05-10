// database/db.web.js
// Lightweight in-memory database used only by Expo web smoke tests.
// Native Android/iOS still use db.js with expo-sqlite.

const state = {
  doctors: [],
  medicines: [],
  attendance: [],
  visits: [],
  app_settings: {
    attendance_radius_meters: '300',
    visit_proximity_warning_meters: '200',
    teleport_max_speed_kmh: '120',
    late_checkin_after_hour: '9',
    offline_sync_expiry_hours: '24',
  },
  nextId: {
    doctors: 1,
    medicines: 1,
    attendance: 1,
    visits: 1,
  },
};

const nowIso = () => new Date().toISOString();
const today = () => nowIso().slice(0, 10);

const seedDoctors = () => {
  if (state.doctors.length > 0) return;
  [
    ['Dr. Ahmad Khan', 'Cardiologist', 1, 'Blue Area', 33.7104, 73.0567, '0300-1234567'],
    ['Dr. Sara Ali', 'Dermatologist', 2, 'F-10 Markaz', 33.6934, 73.0126, '0321-7654321'],
    ['Dr. Usman Sheikh', 'General Physician', 1, 'DHA Phase 2', 33.5244, 73.1511, '0333-1112223'],
    ['Dr. Zainab Bibi', 'Pediatrician', 3, 'Saddar', 33.595, 73.05, '0345-9998887'],
  ].forEach(([name, specialization, priority, territory, latitude, longitude, phone]) => {
    state.doctors.push({
      id: state.nextId.doctors++,
      name,
      degree: null,
      specialization,
      priority,
      territory,
      latitude,
      longitude,
      phone,
      notes: null,
      is_active: 1,
      synced: 0,
      created_at: nowIso(),
    });
  });
};

const seedMedicines = () => {
  if (state.medicines.length > 0) return;
  [
    ['Panadol', 'Paracetamol for pain relief'],
    ['Amoxicillin', 'Antibiotic for bacterial infections'],
    ['Loratadine', 'Antihistamine for allergies'],
    ['Metformin', 'For blood sugar management'],
  ].forEach(([name, description]) => {
    state.medicines.push({
      id: state.nextId.medicines++,
      name,
      description,
      created_at: nowIso(),
    });
  });
};

const sortDoctors = (rows) =>
  [...rows].sort((a, b) => (a.priority - b.priority) || a.name.localeCompare(b.name));

const webDb = {
  execAsync: async (sql) => {
    if (sql.includes('INSERT INTO doctors')) seedDoctors();
    if (sql.includes('INSERT INTO medicines')) seedMedicines();
    return undefined;
  },

  getAllAsync: async (sql, params = []) => {
    if (sql.includes('SELECT id FROM doctors LIMIT 1')) {
      return state.doctors.slice(0, 1).map(({ id }) => ({ id }));
    }
    if (sql.includes('SELECT id FROM medicines LIMIT 1')) {
      return state.medicines.slice(0, 1).map(({ id }) => ({ id }));
    }
    if (sql.includes('SELECT key, value FROM app_settings')) {
      return Object.entries(state.app_settings).map(([key, value]) => ({ key, value }));
    }
    if (sql.includes('FROM doctors') && sql.includes('WHERE is_active = 1')) {
      const rows = state.doctors.filter((doctor) => doctor.is_active === 1);
      if (sql.includes('LIKE')) {
        const query = String(params[0] || '').replace(/%/g, '').toLowerCase();
        return sortDoctors(rows.filter((doctor) =>
          [doctor.name, doctor.specialization, doctor.territory]
            .some((value) => String(value || '').toLowerCase().includes(query)),
        ));
      }
      return sortDoctors(rows);
    }
    if (sql.includes('FROM attendance')) {
      const [repId, limit] = params;
      return state.attendance
        .filter((record) => record.rep_id === repId)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, Number(limit) || state.attendance.length);
    }
    if (sql.includes('FROM visits')) {
      return [];
    }
    return [];
  },

  getFirstAsync: async (sql, params = []) => {
    if (sql.includes('SELECT value FROM app_settings')) {
      const [key] = params;
      return Object.prototype.hasOwnProperty.call(state.app_settings, key)
        ? { value: state.app_settings[key] }
        : null;
    }
    if (sql.includes('SELECT * FROM doctors WHERE id = ?')) {
      return state.doctors.find((doctor) => doctor.id === Number(params[0])) || null;
    }
    if (sql.includes('FROM attendance')) {
      const [repId, date] = params;
      return state.attendance.find((record) => record.rep_id === repId && record.date === date) || null;
    }
    return null;
  },

  runAsync: async (sql, params = []) => {
    if (sql.includes('INSERT INTO attendance')) {
      const [repId, date, checkInTime, latitude, longitude, status, exceptionReason, distance] = params;
      const id = state.nextId.attendance++;
      state.attendance.push({
        id,
        rep_id: repId,
        date,
        check_in_time: checkInTime,
        check_out_time: null,
        check_in_latitude: latitude,
        check_in_longitude: longitude,
        check_out_latitude: null,
        check_out_longitude: null,
        status,
        exception_reason: exceptionReason,
        distance_from_base_m: distance,
        total_km_traveled: 0,
        synced: 0,
        created_at: nowIso(),
      });
      return { lastInsertRowId: id };
    }
    if (sql.includes('UPDATE attendance') && sql.includes('check_out_time')) {
      const [checkOutTime, latitude, longitude, id] = params;
      const record = state.attendance.find((item) => item.id === Number(id));
      if (record) {
        record.check_out_time = checkOutTime;
        record.check_out_latitude = latitude;
        record.check_out_longitude = longitude;
      }
      return { lastInsertRowId: Number(id) };
    }
    if (sql.includes('INSERT INTO doctors')) {
      const [name, degree, specialization, priority, territory, latitude, longitude, phone, notes] = params;
      const id = state.nextId.doctors++;
      state.doctors.push({
        id,
        name,
        degree,
        specialization,
        priority,
        territory,
        latitude,
        longitude,
        phone,
        notes,
        is_active: 1,
        synced: 0,
        created_at: nowIso(),
      });
      return { lastInsertRowId: id };
    }
    if (sql.includes('UPDATE doctors SET is_active = 0')) {
      const doctor = state.doctors.find((item) => item.id === Number(params[0]));
      if (doctor) doctor.is_active = 0;
      return { lastInsertRowId: Number(params[0]) };
    }
    if (sql.includes('INSERT INTO app_settings')) {
      const [key, value] = params;
      state.app_settings[key] = String(value);
      return { lastInsertRowId: 0 };
    }
    if (sql.includes('INSERT INTO visits')) {
      const id = state.nextId.visits++;
      state.visits.push({ id, created_at: today(), synced: 0 });
      return { lastInsertRowId: id };
    }
    return { lastInsertRowId: 0 };
  },
};

export const getDBConnection = async () => webDb;

export const createTables = async (db) => {
  await db.execAsync('CREATE TABLE web_mock');
};
