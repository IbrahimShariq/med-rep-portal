// redux/store.js
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.js';
import doctorReducer from './slices/doctorSlice';
import medicineReducer from './slices/medicineSlice';
import networkReducer from './slices/networkSlice';
import scheduleReducer from './slices/scheduleSlice';
import visitReducer from './slices/visitSlice';
import attendanceReducer from './slices/attendanceSlice';
import settingsReducer from './slices/settingsSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  doctors: doctorReducer,
  medicines: medicineReducer,
  schedules: scheduleReducer,
  visits: visitReducer,
  network: networkReducer,
  attendance: attendanceReducer,
  settings: settingsReducer,
});

export const store = configureStore({
  reducer: rootReducer,
});