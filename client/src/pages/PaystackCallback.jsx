import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyOrderPayment } from '../api/payments';
import { clearCart } from '../store/cart';
import { formatNaira } from '../utils/money';

const validOrderId = (value) => typeof value === 'string'
  && /^[A-Za-z0-9_-]{8,64}$/.test(value);

export default function PaystackCallback() {
  const [params] = useSearchParams();
  const orderId = params.get('orderId');
  const dispatch = useDispatch();
  const [state, setState] = useState({ status: 'VERIFYING', result: null, error: null });
  const mountedRef = useRef(true);
  const startedRef = useRef(false);
  const clearedRef = useRef(false);

  const verify = useCallback(async () => {
    if (!validOrderId(orderId)) {
      setState({ status: 'ERROR', result: null, error: 'The payment callback is missing a valid order.' });
      return;
    }
    setState({ status: 'VERIFYING', result: null, error: null });
    try {
      const result = await verifyOrderPayment(orderId);
      if (!mountedRef.current) return;
      if (result.verified) {
        const marker = `shopsphare:payment-cleared:${orderId}`;
        let previouslyCleared = false;
        try { previouslyCleared = sessionStorage.getItem(marker) === 'true'; } catch { previouslyCleared = false; }
        if (!clearedRef.current && !previouslyCleared) {
          dispatch(clearCart());
          clearedRef.current = true;
          try { sessionStorage.setItem(marker, 'true'); } catch { /* In-memory guard still prevents duplicate clearing. */ }
        }
        setState({ status: 'SUCCESS', result, error: null });
      } else if (result.payment.status === 'PENDING' || result.payment.status === 'INITIALIZED') {
        setState({ status: 'PENDING', result, error: null });
      } else {
        setState({ status: 'ERROR', result, error: 'Paystack did not confirm this payment. Your cart has been kept.' });
      }
    } catch (error) {
      if (mountedRef.current) {
        setState({ status: 'ERROR', result: null, error: `${error.message} Your cart has been kept.` });
      }
    }
  }, [dispatch, orderId]);

  useEffect(() => {
    mountedRef.current = true;
    if (!startedRef.current) {
      startedRef.current = true;
      verify();
    }
    return () => { mountedRef.current = false; };
  }, [verify]);

  const orderPath = validOrderId(orderId) ? `/orders/${orderId}/payment` : '/shop';
  return (
    <main className='container mx-auto min-h-[70vh] px-4 py-12'>
      <section className='mx-auto max-w-2xl rounded-lg bg-secondary p-7 shadow-md dark:bg-gray-900'>
        {state.status === 'VERIFYING' && (
          <div role='status' aria-live='polite'>
            <h1 className='text-2xl font-bold text-slate-900 dark:text-white'>Verifying your Paystack payment</h1>
            <p className='mt-3'>Please wait while ShopSphare confirms the transaction securely with Paystack. Do not close this page.</p>
          </div>
        )}
        {state.status === 'SUCCESS' && (
          <div role='status' aria-live='polite'>
            <h1 className='text-2xl font-bold text-green-800 dark:text-green-300'>Payment confirmed</h1>
            <p className='mt-3'>Order <strong>{state.result.order.orderNumber}</strong> has been paid successfully.</p>
            <p className='mt-2 text-lg font-semibold'>Confirmed total: {formatNaira(state.result.order.totalKobo)} NGN</p>
            <div className='mt-6 flex flex-wrap gap-3'>
              <Link to={orderPath} className='rounded-md bg-primary px-4 py-2 font-semibold text-white'>View order</Link>
              <Link to='/shop' className='rounded-md border border-slate-400 px-4 py-2'>Continue shopping</Link>
            </div>
          </div>
        )}
        {state.status === 'PENDING' && (
          <div role='status' aria-live='polite'>
            <h1 className='text-2xl font-bold text-amber-800 dark:text-amber-300'>Payment confirmation pending</h1>
            <p className='mt-3'>Paystack has not confirmed this transaction yet. Your cart is unchanged.</p>
            <div className='mt-6 flex flex-wrap gap-3'>
              <button type='button' onClick={verify} className='rounded-md bg-primary px-4 py-2 font-semibold text-white'>Retry verification</button>
              <Link to={orderPath} className='rounded-md border border-slate-400 px-4 py-2'>Return to order</Link>
            </div>
          </div>
        )}
        {state.status === 'ERROR' && (
          <div role='alert'>
            <h1 className='text-2xl font-bold text-red-800 dark:text-red-300'>Payment could not be confirmed</h1>
            <p className='mt-3'>{state.error}</p>
            <div className='mt-6 flex flex-wrap gap-3'>
              {validOrderId(orderId) && <button type='button' onClick={verify} className='rounded-md bg-primary px-4 py-2 font-semibold text-white'>Retry verification</button>}
              <Link to={orderPath} className='rounded-md border border-slate-400 px-4 py-2'>Return to order</Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
