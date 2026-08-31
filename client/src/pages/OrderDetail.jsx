import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { getOrderDetail } from '../api/orders';
import { initializeOrderPayment, verifyOrderPayment } from '../api/payments';
import { DeliveryDetails, OrderItems, OrderTotals } from '../components/orders/OrderBreakdown';
import OrderStatus from '../components/orders/OrderStatus';
import { redirectToPaystack } from '../utils/paystackRedirect';
import { formatOrderDate, getOrderPresentation } from '../utils/orderPresentation';
import { clearCartAfterVerifiedPayment } from '../utils/verifiedPaymentCart';

export default function OrderDetail() {
  const { orderId } = useParams();
  const dispatch = useDispatch();
  const [state, setState] = useState({ status: 'LOADING', order: null, error: null });
  const [action, setAction] = useState({ status: 'IDLE', error: null, message: '' });
  const activeRef = useRef(null);
  const initializingRef = useRef(false);
  const verifyingRef = useRef(false);
  const headingRef = useRef(null);
  const errorRef = useRef(null);
  const actionRef = useRef(null);

  const load = useCallback(async ({ quiet = false } = {}) => {
    activeRef.current?.abort();
    const controller = new AbortController();
    activeRef.current = controller;
    if (!quiet) setState({ status: 'LOADING', order: null, error: null });
    try {
      const order = await getOrderDetail(orderId, { signal: controller.signal });
      if (!controller.signal.aborted) {
        setState({ status: 'READY', order, error: null });
        window.requestAnimationFrame(() => headingRef.current?.focus());
      }
      return order;
    } catch (error) {
      if (!controller.signal.aborted) {
        setState({ status: 'ERROR', order: null, error });
        window.requestAnimationFrame(() => errorRef.current?.focus());
      }
      return null;
    }
  }, [orderId]);

  useEffect(() => {
    load();
    return () => activeRef.current?.abort();
  }, [load]);

  const initialize = async () => {
    if (initializingRef.current || !state.order) return;
    initializingRef.current = true;
    setAction({ status: 'INITIALIZING', error: null, message: '' });
    try {
      const result = await initializeOrderPayment(state.order.id);
      if (result.alreadyPaid) {
        clearCartAfterVerifiedPayment(dispatch, state.order.id);
        await load({ quiet: true });
        setAction({ status: 'SUCCESS', error: null, message: 'The server already confirms this order as paid.' });
      } else {
        redirectToPaystack(result.authorizationUrl);
      }
    } catch (error) {
      setAction({ status: 'ERROR', error, message: '' });
      window.requestAnimationFrame(() => actionRef.current?.focus());
    } finally {
      initializingRef.current = false;
    }
  };

  const verify = async () => {
    if (verifyingRef.current || !state.order) return;
    verifyingRef.current = true;
    setAction({ status: 'VERIFYING', error: null, message: '' });
    try {
      const result = await verifyOrderPayment(state.order.id);
      if (result.verified) clearCartAfterVerifiedPayment(dispatch, state.order.id);
      await load({ quiet: true });
      setAction({
        status: result.verified ? 'SUCCESS' : 'PENDING',
        error: null,
        message: result.verified ? 'Payment confirmed by the server.' : 'Payment is not confirmed yet. Your cart has been kept.',
      });
      window.requestAnimationFrame(() => actionRef.current?.focus());
    } catch (error) {
      setAction({ status: 'ERROR', error, message: '' });
      window.requestAnimationFrame(() => actionRef.current?.focus());
    } finally {
      verifyingRef.current = false;
    }
  };

  const order = state.order;
  const presentation = order ? getOrderPresentation(order) : null;

  return (
    <main className='container mx-auto min-h-[70vh] px-4 py-10'>
      <div className='mx-auto max-w-5xl'>
        {state.status === 'LOADING' && <div role='status' aria-live='polite' className='rounded-lg bg-secondary p-6 dark:bg-gray-900'>Loading your order…</div>}

        {state.status === 'ERROR' && (
          <section ref={errorRef} tabIndex='-1' role='alert' className='rounded-lg border border-red-500 bg-red-50 p-6 text-red-900 focus-visible:outline-none dark:bg-red-950 dark:text-red-100'>
            <h1 className='text-2xl font-bold'>{state.error.code === 'ORDER_NOT_FOUND' ? 'Order not found' : 'Unable to load order'}</h1>
            <p className='mt-2'>{state.error.message}</p>
            <div className='mt-5 flex flex-wrap gap-3'>
              {!['ORDER_NOT_FOUND', 'AUTHENTICATION_REQUIRED'].includes(state.error.code) && <button type='button' onClick={() => load()} className='rounded-md bg-primary px-4 py-2 font-semibold text-white'>Retry</button>}
              <Link to='/orders' className='rounded-md border border-current px-4 py-2'>My Orders</Link>
              <Link to='/shop' className='rounded-md border border-current px-4 py-2'>Return to Shop</Link>
            </div>
          </section>
        )}

        {state.status === 'READY' && order && (
          <div className='space-y-7'>
            <header className='rounded-lg bg-secondary p-6 shadow-md dark:bg-gray-900'>
              <p className='text-sm font-semibold uppercase tracking-[0.2em] text-primary'>Order detail</p>
              <div className='mt-2 flex flex-wrap items-start justify-between gap-5'>
                <div>
                  <h1 ref={headingRef} tabIndex='-1' className='break-words text-3xl font-bold text-slate-900 focus-visible:outline-none dark:text-white'>{order.orderNumber}</h1>
                  <p className='mt-2 text-sm text-slate-600 dark:text-slate-300'>Created {formatOrderDate(order.createdAt)}</p>
                </div>
                <OrderStatus order={order} />
              </div>
            </header>

            <section className='rounded-lg bg-secondary p-6 shadow-md dark:bg-gray-900'>
              <OrderItems lines={order.lines} />
              <OrderTotals order={order} />
            </section>

            <section aria-labelledby='delivery-heading' className='rounded-lg bg-secondary p-6 shadow-md dark:bg-gray-900'>
              <h2 id='delivery-heading' className='mb-3 text-xl font-semibold text-slate-900 dark:text-white'>Delivery information</h2>
              <DeliveryDetails delivery={order.delivery} />
            </section>

            {presentation.key === 'PAID' && order.payment?.paidAt && (
              <p className='rounded-md border border-green-600 bg-green-50 p-4 text-green-900 dark:bg-green-950 dark:text-green-100'>Paid {formatOrderDate(order.payment.paidAt)}. This status was confirmed by the server.</p>
            )}

            <div className='flex flex-wrap gap-3'>
              {(presentation.key === 'UNPAID' || presentation.key === 'FAILED') && (
                <button type='button' onClick={initialize} disabled={action.status === 'INITIALIZING'} className='rounded-md bg-primary px-5 py-3 font-semibold text-white disabled:cursor-wait disabled:opacity-70'>
                  {action.status === 'INITIALIZING' ? 'Opening secure Paystack checkout…' : 'Pay securely with Paystack (Test Mode)'}
                </button>
              )}
              {presentation.key === 'INITIALIZED' && (
                <button type='button' onClick={verify} disabled={action.status === 'VERIFYING'} className='rounded-md bg-primary px-5 py-3 font-semibold text-white disabled:cursor-wait disabled:opacity-70'>
                  {action.status === 'VERIFYING' ? 'Checking payment status…' : 'Check payment status'}
                </button>
              )}
              {presentation.key === 'PAID' && <Link to={`/orders/${encodeURIComponent(order.id)}/receipt`} className='rounded-md bg-primary px-5 py-3 font-semibold text-white'>View receipt</Link>}
              {presentation.key === 'UNKNOWN' && <button type='button' onClick={() => load()} className='rounded-md border border-slate-500 px-5 py-3'>Refresh server state</button>}
              <Link to='/orders' className='rounded-md border border-slate-400 px-5 py-3'>My Orders</Link>
              <Link to='/shop' className='rounded-md border border-slate-400 px-5 py-3'>{presentation.key === 'PAID' ? 'Continue shopping' : 'Return to Shop'}</Link>
            </div>

            {action.status !== 'IDLE' && action.status !== 'INITIALIZING' && action.status !== 'VERIFYING' && (
              <div ref={actionRef} tabIndex='-1' role={action.status === 'ERROR' ? 'alert' : 'status'} aria-live='polite' className={`rounded-md border p-4 focus-visible:outline-none ${action.status === 'ERROR' ? 'border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100' : 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100'}`}>
                <p>{action.status === 'ERROR' ? `${action.error.message} Your cart has been kept.` : action.message}</p>
                {action.status === 'ERROR' && (presentation.key === 'UNPAID' || presentation.key === 'FAILED') && <button type='button' onClick={initialize} className='mt-3 rounded-md border border-current px-4 py-2 font-semibold'>Retry payment</button>}
                {action.status === 'ERROR' && presentation.key === 'INITIALIZED' && <button type='button' onClick={verify} className='mt-3 rounded-md border border-current px-4 py-2 font-semibold'>Retry status check</button>}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
