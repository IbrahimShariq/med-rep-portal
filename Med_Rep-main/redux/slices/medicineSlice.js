// src/redux/slices/medicineSlice.js

import { createSlice } from '@reduxjs/toolkit';

const medicineSlice = createSlice({
  name: 'medicines',
  initialState: [],
  reducers: {
    setMedicines: (state, action) => action.payload,
  },
});

export const { setMedicines } = medicineSlice.actions;
export default medicineSlice.reducer;
