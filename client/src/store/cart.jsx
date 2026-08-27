import { createSelector, createSlice } from "@reduxjs/toolkit";
import { getProductById, isKnownProductId } from "../data/productCatalog";
import { formatNaira } from "../utils/money";

export const MAX_CART_QUANTITY = 99;

const persistCart = (items) => {
    try {
        localStorage.setItem("carts", JSON.stringify(items));
    } catch {
        // Cart state remains usable when browser storage is unavailable.
    }
};

export const sanitizeCartItems = (storedCart) => {
    if (!Array.isArray(storedCart)) return [];

    const quantitiesByProduct = new Map();
    for (const item of storedCart) {
        if (
            !item ||
            typeof item.productId !== "string" ||
            !isKnownProductId(item.productId) ||
            !Number.isInteger(item.quantity) ||
            item.quantity <= 0
        ) {
            continue;
        }

        const currentQuantity = quantitiesByProduct.get(item.productId) ?? 0;
        quantitiesByProduct.set(
            item.productId,
            Math.min(currentQuantity + item.quantity, MAX_CART_QUANTITY)
        );
    }

    return Array.from(quantitiesByProduct, ([productId, quantity]) => ({ productId, quantity }));
};

export const readStoredCart = () => {
    try {
        const storedCart = JSON.parse(localStorage.getItem("carts") || "[]");

        const validItems = sanitizeCartItems(storedCart);

        if (JSON.stringify(validItems) !== JSON.stringify(storedCart)) {
            persistCart(validItems);
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
                const {productId, quantity} = action.payload ?? {};
                if (!isKnownProductId(productId) || !Number.isInteger(quantity) || quantity <= 0) return;
                const indexProductId = (state.items).findIndex(item => item.productId === productId);
                if(indexProductId >= 0) {
                    state.items[indexProductId].quantity = Math.min(
                        state.items[indexProductId].quantity + quantity,
                        MAX_CART_QUANTITY
                    );
                } else {
                    state.items.push({productId, quantity: Math.min(quantity, MAX_CART_QUANTITY)});
                }
                persistCart(state.items);
            },
            changeQuantity(state, action) {
                const {productId, quantity} = action.payload ?? {};
                if (!isKnownProductId(productId) || !Number.isInteger(quantity) || quantity < 0) return;
                const indexProductId = (state.items).findIndex(item => item.productId === productId);
                if(indexProductId < 0) return;
                if(quantity > 0) {
                    state.items[indexProductId].quantity = Math.min(quantity, MAX_CART_QUANTITY);
                }else {
                    state.items = (state.items).filter(item => item.productId !== productId);
                }
                persistCart(state.items);
            },
            clearCart(state) {
                state.items = [];
                persistCart(state.items);
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
    export const {addToCart, changeQuantity, clearCart, toggleStatusTab} = cartSlice.actions;
    export default cartSlice.reducer;

export const selectCartItems = (state) => state.cart.items;
export const selectCartItemCount = createSelector([selectCartItems], (items) => items.length);
export const selectCartTotalQuantity = createSelector([selectCartItems], (items) =>
    items.reduce((total, item) => total + item.quantity, 0)
);
export const selectResolvedCartLines = createSelector([selectCartItems], (items) =>
    items.flatMap((item) => {
        const product = getProductById(item.productId);
        return product
            ? [{ ...item, product, lineTotalKobo: product.priceKobo * item.quantity }]
            : [];
    })
);
export const selectCartSubtotalKobo = createSelector([selectResolvedCartLines], (lines) =>
    lines.reduce((subtotal, line) => subtotal + line.lineTotalKobo, 0)
);
export const selectFormattedCartSubtotal = createSelector(
    [selectCartSubtotalKobo],
    (subtotalKobo) => formatNaira(subtotalKobo)
);
