// redux/slices/settingsSlice.js
// Stores system-wide configuration settings.
// Admin changes the radius via the portal → syncs down → updates this slice.

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Attendance geofencing — admin-configurable (default 300m)
  attendanceRadiusMeters: 300,

  // Visit proximity warning (default 200m)
  visitProximityWarningMeters: 200,

  // Anti-teleportation speed threshold (default 120 km/h)
  teleportMaxSpeedKmh: 120,

  // Late check-in threshold (24-hour format, default 9 = 9:00 AM)
  lateCheckInAfterHour: 9,

  // Offline sync expiry (default 24 hours)
  offlineSyncExpiryHours: 24,

  // Whether settings have been loaded from the DB
  loaded: false,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    /**
     * Hydrate the slice from the app_settings SQLite table.
     * Call this once at app launch via getAllSettings().
     * @param {object} action.payload — { attendance_radius_meters: '300', ... }
     */
    hydrateSettings(state, action) {
      const raw = action.payload;
      if (raw.attendance_radius_meters) {
        state.attendanceRadiusMeters = parseInt(raw.attendance_radius_meters, 10);
      }
      if (raw.visit_proximity_warning_meters) {
        state.visitProximityWarningMeters = parseInt(raw.visit_proximity_warning_meters, 10);
      }
      if (raw.teleport_max_speed_kmh) {
        state.teleportMaxSpeedKmh = parseInt(raw.teleport_max_speed_kmh, 10);
      }
      if (raw.late_checkin_after_hour) {
        state.lateCheckInAfterHour = parseInt(raw.late_checkin_after_hour, 10);
      }
      if (raw.offline_sync_expiry_hours) {
        state.offlineSyncExpiryHours = parseInt(raw.offline_sync_expiry_hours, 10);
      }
      state.loaded = true;
    },

    /**
     * Update a single setting (after admin changes it).
     */
    updateSetting(state, action) {
      const { key, value } = action.payload;
      const mapping = {
        attendance_radius_meters: 'attendanceRadiusMeters',
        visit_proximity_warning_meters: 'visitProximityWarningMeters',
        teleport_max_speed_kmh: 'teleportMaxSpeedKmh',
        late_checkin_after_hour: 'lateCheckInAfterHour',
        offline_sync_expiry_hours: 'offlineSyncExpiryHours',
      };
      const field = mapping[key];
      if (field) {
        state[field] = parseInt(value, 10);
      }
    },
  },
});

export const { hydrateSettings, updateSetting } = settingsSlice.actions;
export default settingsSlice.reducer;

// Selectors
export const selectAttendanceRadius = (state) => state.settings.attendanceRadiusMeters;
export const selectVisitWarningRadius = (state) => state.settings.visitProximityWarningMeters;
export const selectTeleportThreshold = (state) => state.settings.teleportMaxSpeedKmh;
export const selectSettingsLoaded = (state) => state.settings.loaded;
