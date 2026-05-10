// src/redux/slices/doctorSlice.js
import { createSlice } from '@reduxjs/toolkit';

const doctorSlice = createSlice({
  name: 'doctors',
  initialState: {
    loading: false,
    error: null,
    doctors: [], // optional: could be just ids or empty array if using SQLite
  },
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    setDoctors: (state, action) => {
      state.doctors = action.payload; 
      // For small lists, store in Redux. 
      // For large data, skip and fetch directly from SQLite.
    },
  },
});

export const { setLoading, setError, setDoctors } = doctorSlice.actions;
export default doctorSlice.reducer;
