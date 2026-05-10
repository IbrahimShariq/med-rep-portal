// redux/slices/authSlice.js
import { createSelector, createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,  // { id, name, email, role: 'REP' | 'ADMIN', territory, baseLatitude, baseLongitude }
  token: null,
  isLoggedIn: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login(state, action) {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isLoggedIn = true;
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isLoggedIn = false;
    },
    updateUserProfile(state, action) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
});

export const { login, logout, updateUserProfile } = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectUser = (state) => state.auth.user;
export const selectIsAdmin = (state) => state.auth.user?.role === 'ADMIN';
export const selectIsRep = (state) => state.auth.user?.role === 'REP';
export const selectUserBaseCoords = createSelector(selectUser, (user) => {
  if (!user?.baseLatitude || !user?.baseLongitude) return null;
  return { latitude: user.baseLatitude, longitude: user.baseLongitude };
});
