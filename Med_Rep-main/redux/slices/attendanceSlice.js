// redux/slices/attendanceSlice.js
// Tracks today's attendance state in memory so the Home screen
// can instantly show Check-In / Check-Out status without hitting SQLite.

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Today's attendance record (null if not checked in)
  today: null,       // { id, checkInTime, checkOutTime, status, distanceMeters }

  // GPS position currently obtained from expo-location
  currentLocation: null,  // { latitude, longitude, accuracy }

  // Whether expo-location permission has been granted
  locationPermission: null, // null | 'granted' | 'denied'

  // Loading state for check-in/out async operations
  loading: false,

  // Error message
  error: null,
};

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    setTodayAttendance(state, action) {
      state.today = action.payload;
    },
    setCurrentLocation(state, action) {
      state.currentLocation = action.payload; // { latitude, longitude, accuracy }
    },
    setLocationPermission(state, action) {
      state.locationPermission = action.payload;
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
    },
    checkedIn(state, action) {
      // action.payload: { id, check_in_time, status, distance_from_base_m }
      state.today = {
        ...state.today,
        ...action.payload,
        check_out_time: null,
      };
      state.loading = false;
      state.error = null;
    },
    checkedOut(state, action) {
      if (state.today) {
        state.today = {
          ...state.today,
          check_out_time: action.payload.check_out_time,
        };
      }
      state.loading = false;
      state.error = null;
    },
    reset() {
      return initialState;
    },
  },
});

export const {
  setTodayAttendance,
  setCurrentLocation,
  setLocationPermission,
  setLoading,
  setError,
  checkedIn,
  checkedOut,
  reset,
} = attendanceSlice.actions;

export default attendanceSlice.reducer;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------
export const selectIsCheckedIn = (state) =>
  !!state.attendance.today?.check_in_time;

export const selectIsCheckedOut = (state) =>
  !!state.attendance.today?.check_out_time;

export const selectAttendanceStatus = (state) =>
  state.attendance.today?.status ?? null;

export const selectHasLocation = (state) =>
  !!state.attendance.currentLocation;
