import React, { useRef } from 'react'
import { useSelector, useDispatch} from 'react-redux'
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import CartItems from './CartItems';
import {
  clearCart,
  selectFormattedCartSubtotal,
  selectResolvedCartLines,
  toggleStatusTab,
} from '../store/cart';

const CLEAR_CART_CONFIRMATION_TOAST_ID = 'clear-cart-confirmation';

export default function CartTab() {
  const cartLines = useSelector(selectResolvedCartLines);
  const formattedSubtotal = useSelector(selectFormattedCartSubtotal);
  const statusTab = useSelector(store => store.cart.statusTab);
  const dispatch = useDispatch();
  const confirmationOpenRef = useRef(false);
  const handleCloseCartTab = () => {
    dispatch(toggleStatusTab());
  }

  const handleClearCart = () => {
    if (confirmationOpenRef.current) return;
    confirmationOpenRef.current = true;

    const dismissConfirmation = () => {
      confirmationOpenRef.current = false;
      toast.dismiss(CLEAR_CART_CONFIRMATION_TOAST_ID);
    };

    const confirmClearCart = () => {
      if (!confirmationOpenRef.current) return;
      confirmationOpenRef.current = false;
      dispatch(clearCart());
      toast.dismiss(CLEAR_CART_CONFIRMATION_TOAST_ID);
      toast.success('Cart cleared');
    };

    toast.custom(
      <div role='alertdialog' aria-labelledby='clear-cart-confirmation-message' className='rounded-md bg-white p-4 shadow-lg dark:bg-gray-800'>
        <p id='clear-cart-confirmation-message' className='mb-3 text-sm text-slate-700 dark:text-primary'>
          Clear all items from your cart?
        </p>
        <div className='flex justify-end gap-2'>
          <button
            type='button'
            onClick={dismissConfirmation}
            className='rounded-md border border-slate-400 px-3 py-2 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 dark:text-primary'
          >
            Cancel
          </button>
          <button
            type='button'
            onClick={confirmClearCart}
            className='rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2'
          >
            Clear cart
          </button>
        </div>
      </div>,
      { id: CLEAR_CART_CONFIRMATION_TOAST_ID, duration: Infinity }
    );
  }

  const isEmpty = cartLines.length === 0;

  return (
    <aside aria-label='Shopping cart' className={`fixed z-50 top-22 right-0 bg-gray-700 shadow-2xl w-full max-w-96 h-[500px] grid grid-rows-[60px_1fr_auto] transform transition-all duration-500 ${statusTab === false ? "translate-x-full" : ""}`}>
        <div className='flex items-center justify-between px-5'>
          <h2 className='text-primary text-2xl'>Shopping Cart</h2>
          {!isEmpty && (
            <button type='button' className='text-sm text-red-200 underline' onClick={handleClearCart}>
              Clear cart
            </button>
          )}
        </div>
        <div className='p-5 overflow-y-auto'>
            {isEmpty ? (
              <div className='h-full flex flex-col items-center justify-center gap-4 text-center text-white'>
                <p>Your cart is empty.</p>
                <Link to='/shop' onClick={handleCloseCartTab} className='text-primary underline'>
                  Continue shopping
                </Link>
              </div>
            ) : (
              <div className='space-y-2'>
                {cartLines.map((line) => <CartItems key={line.productId} data={line}/>) }
              </div>
            )}
        </div>
        <div>
          <p className='px-5 py-2 text-right text-white'>Display subtotal: {formattedSubtotal}</p>
          <div className='grid grid-cols-2 min-h-[60px]'>
            <button type='button' className='bg-black text-white' onClick={handleCloseCartTab}>CLOSE</button>
            <button type='button' disabled aria-label='Checkout unavailable, coming soon' title='Checkout coming soon' className='bg-amber-500 text-white disabled:cursor-not-allowed disabled:opacity-50'>
              CHECKOUT — COMING SOON
            </button>
          </div>
        </div>
    </aside>
  )
}
