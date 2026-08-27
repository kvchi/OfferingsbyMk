import { createSlice } from "@reduxjs/toolkit";
import api from '../api/client';

export const readStoredAuth = () => {
  const token = localStorage.getItem("token");
  const isJwtShaped = typeof token === "string" && token.split(".").length === 3;

  if (!isJwtShaped) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return { user: null, token: null, isAuthenticated: false, isInitializing: false };
  }

  return { user: null, token, isAuthenticated: false, isInitializing: true };
};

const initialState = readStoredAuth();

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth(state, action) {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      state.isInitializing = false;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    },
    restorationSucceeded(state, action) {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isInitializing = false;
      localStorage.setItem("user", JSON.stringify(action.payload));
    },
    restorationFailed(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isInitializing = false;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isInitializing = false;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
  },
});

export const { setAuth, restorationSucceeded, restorationFailed, logout } = authSlice.actions;

let restorationRequest = null;

const isConfirmedUser = (user) =>
  user &&
  typeof user === 'object' &&
  !Array.isArray(user) &&
  typeof user.id === 'string' &&
  typeof user.email === 'string' &&
  user.status === 'ACTIVE';

export const restoreAuthentication = (dispatch, token) => {
  if (!restorationRequest) {
    restorationRequest = api.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    }).then(({ data }) => {
      if (!isConfirmedUser(data?.user)) throw new Error('Invalid authentication response');
      dispatch(restorationSucceeded(data.user));
    }).catch(() => {
      dispatch(restorationFailed());
    }).finally(() => {
      restorationRequest = null;
    });
  }

  return restorationRequest;
};

export const resetAuthenticationRestorationForTests = () => {
  restorationRequest = null;
};

export default authSlice.reducer;
