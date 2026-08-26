import { createSlice } from "@reduxjs/toolkit";
import { productsById } from "../data/productCatalog";

const readStoredCart = () => {
    try {
        const storedCart = JSON.parse(localStorage.getItem("carts") || "[]");

        if (!Array.isArray(storedCart)) {
            throw new Error("Stored cart is not an array");
        }

        const validItems = storedCart.filter((item) =>
            item &&
            typeof item.productId === "string" &&
            productsById.has(item.productId) &&
            Number.isInteger(item.quantity) &&
            item.quantity > 0
        );

        if (validItems.length !== storedCart.length) {
            localStorage.setItem("carts", JSON.stringify(validItems));
        }

        return validItems;
    } catch {
        localStorage.removeItem("carts");
        return [];
    }
};

const initialState = {
    items: readStoredCart(),
    statusTab: false
}

 const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
            addToCart(state,action){ 
                const {productId, quantity} = action.payload;
                console.log({payload:action.payload})
                const indexProductId = (state.items).findIndex(item => item.productId === productId);
                if(indexProductId >= 0) {
                    state.items[indexProductId].quantity += quantity;
                } else {
                    state.items.push({productId, quantity});
                }
                localStorage.setItem("carts", JSON.stringify(state.items));
            },
            changeQuantity(state, action) {
                const {productId, quantity} = action.payload;
                const indexProductId = (state.items).findIndex(item => item.productId === productId);
                if(quantity > 0) {
                    state.items[indexProductId].quantity = quantity;
                }else {
                    // delete state.items[indexProductId];
                    state.items = (state.items).filter(item => item.productId !== productId);
                }
                localStorage.setItem("carts", JSON.stringify(state.items));
            },
            toggleStatusTab(state){
                if(state.statusTab === false){
                    state.statusTab = true;
                }else{
                    state.statusTab = false;
                }
            }
    }
    })
    export const {addToCart, changeQuantity, toggleStatusTab} = cartSlice.actions;
    export default cartSlice.reducer;
