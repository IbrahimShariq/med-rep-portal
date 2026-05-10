// src/database/initDB.js
import { getDBConnection, createTables } from './db';

export const initDatabase = async () => {
  try {
    const db = await getDBConnection();
    await createTables(db);
    await seedData(db); // Seed initial data
    console.log("✅ Database initialized and seeded successfully!");
    return db;
  } catch (err) {
    console.error("❌ DB init error:", err);
    throw err;
  }
};

const seedData = async (db) => {
  // Seed Doctors if empty
  const doctors = await db.getAllAsync('SELECT id FROM doctors LIMIT 1');
  if (doctors.length === 0) {
    console.log("🌱 Seeding doctors...");
    await db.execAsync(`
      INSERT INTO doctors (name, specialization, priority, territory, latitude, longitude, phone) VALUES
      ('Dr. Ahmad Khan', 'Cardiologist', 1, 'Blue Area', 33.7104, 73.0567, '0300-1234567'),
      ('Dr. Sara Ali', 'Dermatologist', 2, 'F-10 Markaz', 33.6934, 73.0126, '0321-7654321'),
      ('Dr. Usman Sheikh', 'General Physician', 1, 'DHA Phase 2', 33.5244, 73.1511, '0333-1112223'),
      ('Dr. Zainab Bibi', 'Pediatrician', 3, 'Saddar', 33.5950, 73.0500, '0345-9998887');
    `);
  }

  // Seed Medicines if empty
  const medicines = await db.getAllAsync('SELECT id FROM medicines LIMIT 1');
  if (medicines.length === 0) {
    console.log("🌱 Seeding medicines...");
    await db.execAsync(`
      INSERT INTO medicines (name, description) VALUES
      ('Panadol', 'Paracetamol for pain relief'),
      ('Amoxicillin', 'Antibiotic for bacterial infections'),
      ('Loratadine', 'Antihistamine for allergies'),
      ('Metformin', 'For blood sugar management');
    `);
  }
};
