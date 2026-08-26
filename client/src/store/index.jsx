import { configureStore } from "@reduxjs/toolkit";
import cartReducer from './cart';
import authReducer from './auth';

export const store = configureStore ({
    reducer: {
        cart: cartReducer,
        auth: authReducer,
        }
});
export default store;