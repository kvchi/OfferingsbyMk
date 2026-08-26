import { createSlice } from "@reduxjs/toolkit";

const readStoredAuth = () => {
  try {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    const user = JSON.parse(storedUser || "null");
    const hasValidUser =
      user &&
      typeof user === "object" &&
      !Array.isArray(user) &&
      typeof user.id === "string" &&
      typeof user.email === "string";

    const tokenParts = typeof token === "string" ? token.split(".") : [];
    const tokenPayload = tokenParts.length === 3
      ? JSON.parse(atob(tokenParts[1].replace(/-/g, "+").replace(/_/g, "/")))
      : null;
    const hasValidToken = tokenPayload && typeof tokenPayload === "object";

    if (!hasValidUser || !hasValidToken) {
      throw new Error("Stored authentication is incomplete");
    }

    return { user, token, isAuthenticated: true };
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return { user: null, token: null, isAuthenticated: false };
  }
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
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
  },
});

export const { setAuth, logout } = authSlice.actions;
export default authSlice.reducer;
