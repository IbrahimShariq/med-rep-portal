import { apiRequest } from '../utils/api';
import { upsertDoctorsFromPortal } from './doctorService';
import { setSetting } from './settingsService';
import {
  getUnsyncedAttendance,
  markAttendanceSynced,
} from './attendanceService';
import {
  getUnsyncedVisits,
  markVisitSynced,
} from './visitService';

export const loginWithPortal = async ({ email, password }) => {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};

export const syncFromPortal = async (repId) => {
  const payload = await apiRequest(`/sync/bootstrap${repId ? `?repId=${repId}` : ''}`);

  if (payload.doctors?.length) {
    await upsertDoctorsFromPortal(payload.doctors);
  }

  if (payload.settings) {
    const entries = Object.entries(payload.settings);
    await Promise.all(entries.map(([key, value]) => setSetting(key, value)));
  }

  return payload;
};

export const pushLocalChanges = async () => {
  const attendance = await getUnsyncedAttendance();
  const visits = await getUnsyncedVisits();

  if (attendance.length === 0 && visits.length === 0) {
    return { success: true, pushed: 0 };
  }

  await apiRequest('/sync/push', {
    method: 'POST',
    body: JSON.stringify({ attendance, visits }),
  });

  await Promise.all(attendance.map((record) => markAttendanceSynced(record.id)));
  await Promise.all(visits.map((visit) => markVisitSynced(visit.id)));

  return { success: true, pushed: attendance.length + visits.length };
};

export const syncAll = async (repId) => {
  const pushResult = await pushLocalChanges();
  const pullResult = await syncFromPortal(repId);
  return { pushResult, pullResult };
};
