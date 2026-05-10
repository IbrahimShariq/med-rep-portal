//  src/redux/slices/networkSlice.js

import { createSlice } from '@reduxjs/toolkit';

const networkSlice = createSlice({
  name: 'network',
  initialState: { isOnline: true },
  reducers: {
    setOnline: (state, action) => {
      state.isOnline = action.payload;
    },
  },
});

export const { setOnline } = networkSlice.actions;
export default networkSlice.reducer;
