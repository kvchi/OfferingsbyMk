import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useSelector, useDispatch} from 'react-redux'
import { Link, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const confirmationOpenRef = useRef(false);
  const confirmationFocusedRef = useRef(false);
  const confirmationRef = useRef(null);
  const drawerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const clearButtonRef = useRef(null);
  const openerRef = useRef(null);
  const wasOpenRef = useRef(false);

  useLayoutEffect(() => {
    if (statusTab && !wasOpenRef.current) {
      openerRef.current = document.activeElement;
      closeButtonRef.current?.focus();
    } else if (!statusTab && wasOpenRef.current) {
      openerRef.current?.focus();
      openerRef.current = null;
    }
    wasOpenRef.current = statusTab;
  }, [statusTab]);

  useEffect(() => {
    if (!statusTab) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [statusTab]);

  const handleCloseCartTab = useCallback(() => {
    dispatch(toggleStatusTab());
  }, [dispatch]);

  const dismissClearConfirmation = useCallback(() => {
    confirmationOpenRef.current = false;
    confirmationFocusedRef.current = false;
    toast.dismiss(CLEAR_CART_CONFIRMATION_TOAST_ID);
    toast.remove(CLEAR_CART_CONFIRMATION_TOAST_ID);
    clearButtonRef.current?.focus();
  }, []);

  useEffect(() => () => {
    confirmationOpenRef.current = false;
    confirmationFocusedRef.current = false;
    toast.dismiss(CLEAR_CART_CONFIRMATION_TOAST_ID);
    toast.remove(CLEAR_CART_CONFIRMATION_TOAST_ID);
  }, []);

  useEffect(() => {
    if (statusTab || !confirmationOpenRef.current) return;
    confirmationOpenRef.current = false;
    confirmationFocusedRef.current = false;
    toast.dismiss(CLEAR_CART_CONFIRMATION_TOAST_ID);
    toast.remove(CLEAR_CART_CONFIRMATION_TOAST_ID);
  }, [statusTab]);

  useEffect(() => {
    if (!statusTab) return undefined;

    const getFocusableControls = () => Array.from(
      drawerRef.current?.querySelectorAll(
        'button, a[href], input, select, textarea, [tabindex]'
      ) ?? []
    ).filter((element) =>
      !element.matches(':disabled, [hidden], [aria-hidden="true"]') && element.tabIndex >= 0
    );

    const handleDrawerKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (confirmationOpenRef.current) {
          dismissClearConfirmation();
        } else {
          handleCloseCartTab();
        }
        return;
      }

      if (event.key !== 'Tab') return;

      if (confirmationOpenRef.current) {
        const confirmationControls = Array.from(
          confirmationRef.current?.querySelectorAll('button:not(:disabled)') ?? []
        );
        const firstConfirmationControl = confirmationControls[0];
        const lastConfirmationControl = confirmationControls[confirmationControls.length - 1];
        if (!firstConfirmationControl) return;

        if (event.shiftKey && document.activeElement === firstConfirmationControl) {
          event.preventDefault();
          lastConfirmationControl.focus();
        } else if (!event.shiftKey && document.activeElement === lastConfirmationControl) {
          event.preventDefault();
          firstConfirmationControl.focus();
        } else if (!confirmationRef.current?.contains(document.activeElement)) {
          event.preventDefault();
          firstConfirmationControl.focus();
        }
        return;
      }

      const focusableControls = getFocusableControls();
      if (focusableControls.length === 0) return;
      const firstControl = focusableControls[0];
      const lastControl = focusableControls[focusableControls.length - 1];

      if (event.shiftKey && document.activeElement === firstControl) {
        event.preventDefault();
        lastControl.focus();
      } else if (!event.shiftKey && document.activeElement === lastControl) {
        event.preventDefault();
        firstControl.focus();
      } else if (!drawerRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        firstControl.focus();
      }
    };

    document.addEventListener('keydown', handleDrawerKeyDown);
    return () => document.removeEventListener('keydown', handleDrawerKeyDown);
  }, [dismissClearConfirmation, handleCloseCartTab, statusTab]);

  const handleClearCart = () => {
    if (confirmationOpenRef.current) return;
    confirmationOpenRef.current = true;

    const confirmClearCart = () => {
      if (!confirmationOpenRef.current) return;
      confirmationOpenRef.current = false;
      confirmationFocusedRef.current = false;
      dispatch(clearCart());
      toast.dismiss(CLEAR_CART_CONFIRMATION_TOAST_ID);
      toast.remove(CLEAR_CART_CONFIRMATION_TOAST_ID);
      toast.success('Cart cleared');
      closeButtonRef.current?.focus();
    };

    toast.custom(
      <div ref={confirmationRef} role='alertdialog' aria-modal='true' aria-labelledby='clear-cart-confirmation-message' className='rounded-md bg-white p-4 shadow-lg dark:bg-gray-800'>
        <p id='clear-cart-confirmation-message' className='mb-3 text-sm text-slate-700 dark:text-primary'>
          Clear all items from your cart?
        </p>
        <div className='flex justify-end gap-2'>
          <button
            ref={(node) => {
              if (node && confirmationOpenRef.current && !confirmationFocusedRef.current) {
                confirmationFocusedRef.current = true;
                node.focus();
              }
            }}
            type='button'
            onClick={dismissClearConfirmation}
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

  const handleCheckout = () => {
    if (cartLines.length === 0) return;
    dispatch(toggleStatusTab());
    navigate('/checkout');
  };

  const isEmpty = cartLines.length === 0;

  return (
    <>
    <div
      aria-hidden='true'
      data-cart-backdrop
      data-state={statusTab ? 'open' : 'closed'}
      className={`fixed inset-x-0 bottom-0 top-16 z-[60] bg-black/40 transition-opacity duration-500 md:top-20 ${statusTab ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      onClick={handleCloseCartTab}
    />
    <aside
      ref={drawerRef}
      id='shopping-cart-drawer'
      role={statusTab ? 'dialog' : undefined}
      aria-modal={statusTab ? 'true' : undefined}
      aria-hidden={!statusTab}
      aria-labelledby={statusTab ? 'shopping-cart-title' : undefined}
      aria-describedby={statusTab ? 'shopping-cart-description' : undefined}
      inert={statusTab ? undefined : ''}
      data-state={statusTab ? 'open' : 'closed'}
      className={`fixed right-0 top-16 z-[70] grid h-[calc(100vh-4rem)] w-full max-w-96 grid-rows-[60px_1fr_auto] bg-gray-700 shadow-2xl transform transition-transform duration-500 md:top-20 md:h-[calc(100vh-5rem)] ${statusTab ? 'translate-x-0' : 'pointer-events-none translate-x-full'}`}
    >
        <div className='flex items-center justify-between px-5'>
          <h2 id='shopping-cart-title' className='text-primary text-2xl'>Shopping Cart</h2>
          <p id='shopping-cart-description' className='sr-only'>Review and update the products in your cart.</p>
          {!isEmpty && (
            <button ref={clearButtonRef} type='button' className='text-sm text-red-200 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-700' onClick={handleClearCart}>
              Clear cart
            </button>
          )}
        </div>
        <div className='p-5 overflow-y-auto'>
            {isEmpty ? (
              <div className='h-full flex flex-col items-center justify-center gap-4 text-center text-white'>
                <p>Your cart is empty.</p>
                <Link to='/shop' onClick={handleCloseCartTab} className='text-primary underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-gray-700'>
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
            <button ref={closeButtonRef} type='button' className='bg-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset' onClick={handleCloseCartTab}>CLOSE</button>
            <button type='button' disabled={isEmpty} aria-label={isEmpty ? 'Checkout unavailable, cart is empty' : 'Checkout'} title={isEmpty ? 'Add an item before checkout' : undefined} onClick={handleCheckout} className='bg-amber-500 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50'>
              CHECKOUT
            </button>
          </div>
        </div>
    </aside>
    </>
  )
}
