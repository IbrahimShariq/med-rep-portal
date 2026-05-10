//  src/redux/slices/visitSlice.js

import { createSlice } from '@reduxjs/toolkit';

const visitsSlice = createSlice({
  name: 'visits',
  initialState: {
    pendingVisits: [], // unsynced visits
  },
  reducers: {
    addPendingVisit: (state, action) => {
      state.pendingVisits.push(action.payload);
    },
    removePendingVisit: (state, action) => {
      state.pendingVisits = state.pendingVisits.filter(
        visit => visit.id !== action.payload
      );
    },
    clearAllVisits: state => {
      state.pendingVisits = [];
    },
  },
});

export const { addPendingVisit, removePendingVisit, clearAllVisits } = visitsSlice.actions;
export default visitsSlice.reducer;