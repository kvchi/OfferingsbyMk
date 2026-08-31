import { clearCart } from '../store/cart';

export function clearCartAfterVerifiedPayment(dispatch, orderId) {
  const marker = `shopsphare:payment-cleared:${orderId}`;
  try {
    if (sessionStorage.getItem(marker) === 'true') return false;
  } catch { /* The in-memory Redux action is still safe to use. */ }
  dispatch(clearCart());
  try { sessionStorage.setItem(marker, 'true'); } catch { /* Storage may be unavailable. */ }
  return true;
}
