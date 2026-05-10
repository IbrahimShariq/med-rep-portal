//  src/redux/slices/scheduleSlice.js

import { createSlice } from '@reduxjs/toolkit';

const scheduleSlice = createSlice({
  name: 'schedules',
  initialState: [],
  reducers: {
    addSchedule: (state, action) => {
      state.push(action.payload);
    },
    setSchedules: (state, action) => action.payload,
  },
});

export const { addSchedule, setSchedules } = scheduleSlice.actions;
export default scheduleSlice.reducer;
