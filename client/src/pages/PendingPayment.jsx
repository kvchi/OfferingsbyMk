import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getOrder } from '../api/checkout';
import { initializeOrderPayment } from '../api/payments';
import { DeliverySummary } from '../components/CheckoutReview';
import { formatNaira } from '../utils/money';
import { redirectToPaystack } from '../utils/paystackRedirect';

const formatStatus = (value) => String(value || 'Unknown').toLowerCase().replaceAll('_', ' ');

const formatCreatedAt = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-NG', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
};

export default function PendingPayment() {
  const { orderId } = useParams();
  const [state, setState] = useState({ status: 'LOADING', order: null, error: null });
  const [paymentState, setPaymentState] = useState({ status: 'IDLE', error: null });
  const headingRef = useRef(null);
  const errorRef = useRef(null);
  const activeRequestRef = useRef(null);
  const mountedRef = useRef(true);
  const initializingRef = useRef(false);

  const loadOrder = useCallback(async () => {
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    setState({ status: 'LOADING', order: null, error: null });
    try {
      const order = await getOrder(orderId, { signal: controller.signal });
      if (!controller.signal.aborted && mountedRef.current) {
        setState({ status: 'READY', order, error: null });
        window.requestAnimationFrame(() => headingRef.current?.focus());
      }
    } catch (error) {
      if (controller.signal.aborted || !mountedRef.current) return;
      setState({ status: 'ERROR', order: null, error });
      window.requestAnimationFrame(() => errorRef.current?.focus());
    }
  }, [orderId]);

  useEffect(() => {
    mountedRef.current = true;
    headingRef.current?.focus();
    loadOrder();
    return () => {
      mountedRef.current = false;
      activeRequestRef.current?.abort();
    };
  }, [loadOrder]);

  useEffect(() => {
    if (state.status === 'ERROR') errorRef.current?.focus();
  }, [state.status]);

  const { status, order, error } = state;
  const initialize = async () => {
    if (initializingRef.current || !order) return;
    initializingRef.current = true;
    setPaymentState({ status: 'INITIALIZING', error: null });
    try {
      const result = await initializeOrderPayment(order.id);
      if (!mountedRef.current) return;
      if (result.alreadyPaid) {
        setState((current) => ({ ...current, order: { ...current.order, ...result.order } }));
        setPaymentState({ status: 'IDLE', error: null });
        return;
      }
      redirectToPaystack(result.authorizationUrl);
    } catch (paymentError) {
      if (mountedRef.current) setPaymentState({ status: 'ERROR', error: paymentError });
    } finally {
      initializingRef.current = false;
    }
  };
  return (
    <main className='container mx-auto min-h-[70vh] px-4 py-10'>
      <div className='mx-auto max-w-4xl'>
        <h1 ref={headingRef} tabIndex='-1' className='text-3xl font-bold text-slate-900 focus-visible:outline-none dark:text-white'>Pending payment</h1>

        {status === 'LOADING' && (
          <div role='status' aria-live='polite' className='mt-8 rounded-md bg-secondary p-6 text-slate-700 dark:bg-gray-800 dark:text-slate-200'>
            Loading your order…
          </div>
        )}

        {status === 'ERROR' && (
          <section ref={errorRef} tabIndex='-1' role='alert' className='mt-8 rounded-md border border-red-500 bg-red-50 p-6 text-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 dark:bg-red-950 dark:text-red-100'>
            <h2 className='text-xl font-semibold'>{error.code === 'ORDER_NOT_FOUND' ? 'Order not found' : 'Unable to load order'}</h2>
            <p className='mt-2'>{error.message}</p>
            <div className='mt-5 flex flex-wrap gap-3'>
              {error.code !== 'ORDER_NOT_FOUND' && error.code !== 'AUTHENTICATION_REQUIRED' && (
                <button type='button' onClick={loadOrder} className='rounded-md bg-primary px-4 py-2 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'>Retry</button>
              )}
              <Link to='/shop' className='rounded-md border border-current px-4 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600'>Return to Shop</Link>
            </div>
          </section>
        )}

        {status === 'READY' && order && (
          <div className='mt-8 space-y-7'>
            <section className='rounded-lg bg-secondary p-6 shadow-md dark:bg-gray-900'>
              <div className='flex flex-wrap items-start justify-between gap-4'>
                <div>
                  <p className='text-sm uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300'>Order number</p>
                  <p className='text-xl font-bold text-primary'>{order.orderNumber}</p>
                  <p className='mt-2 text-sm text-slate-600 dark:text-slate-300'>Created {formatCreatedAt(order.createdAt)}</p>
                </div>
                <dl className='grid grid-cols-2 gap-x-5 gap-y-2 text-sm'>
                  <dt>Order status</dt><dd className='font-semibold capitalize'>{formatStatus(order.status)}</dd>
                  <dt>Payment status</dt><dd className='font-semibold capitalize'>{formatStatus(order.paymentStatus)}</dd>
                </dl>
              </div>
              <div id='payment-test-description' className={`mt-6 rounded-md border p-4 ${order.paymentStatus === 'PAID' ? 'border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100' : 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100'}`}>
                {order.paymentStatus === 'PAID'
                  ? 'Payment has been securely confirmed by the server.'
                  : 'Payment has not been completed. This order is pending and no charge has been made. Paystack is running in test mode only.'}
              </div>
            </section>

            <section aria-labelledby='pending-lines-heading' className='rounded-lg bg-secondary p-6 shadow-md dark:bg-gray-900'>
              <h2 id='pending-lines-heading' className='text-xl font-semibold text-slate-900 dark:text-white'>Order items</h2>
              <ul className='mt-4 divide-y divide-slate-200 dark:divide-slate-700'>
                {order.lines.map((line) => (
                  <li key={line.productId} className='grid gap-2 py-4 sm:grid-cols-[1fr_auto]'>
                    <div>
                      <p className='font-semibold text-slate-900 dark:text-white'>{line.title}</p>
                      <p className='text-sm text-slate-600 dark:text-slate-300'>Quantity {line.quantity} × {formatNaira(line.unitPriceKobo)}</p>
                    </div>
                    <p className='font-semibold'>{formatNaira(line.lineTotalKobo)}</p>
                  </li>
                ))}
              </ul>
              <dl className='ml-auto mt-5 max-w-sm space-y-2'>
                <div className='flex justify-between'><dt>Subtotal</dt><dd>{formatNaira(order.subtotalKobo)}</dd></div>
                <div className='flex justify-between'><dt>Shipping</dt><dd>Free</dd></div>
                <div className='flex justify-between border-t border-slate-300 pt-3 text-lg font-bold dark:border-slate-600'><dt>Total</dt><dd>{formatNaira(order.totalKobo)} <span className='text-sm'>{order.currency}</span></dd></div>
              </dl>
            </section>

            <section aria-labelledby='pending-delivery-heading' className='rounded-lg bg-secondary p-6 shadow-md dark:bg-gray-900'>
              <h2 id='pending-delivery-heading' className='mb-3 text-xl font-semibold text-slate-900 dark:text-white'>Delivery information</h2>
              <DeliverySummary delivery={order.delivery} />
            </section>

            <div className='flex flex-wrap gap-3'>
              {order.paymentStatus !== 'PAID' && (
                <button type='button' onClick={initialize} disabled={paymentState.status === 'INITIALIZING'} aria-describedby='payment-test-description' className='rounded-md bg-primary px-5 py-3 font-semibold text-white disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'>
                  {paymentState.status === 'INITIALIZING' ? 'Opening secure Paystack checkout…' : 'Pay securely with Paystack (Test Mode)'}
                </button>
              )}
              <Link to='/shop' className='rounded-md border border-slate-400 px-5 py-3 text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:text-primary'>Return to Shop</Link>
              <Link to='/checkout' className='rounded-md px-4 py-3 text-slate-600 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-slate-300'>Start a new checkout</Link>
            </div>
            {paymentState.status === 'ERROR' && (
              <div role='alert' className='rounded-md border border-red-500 bg-red-50 p-4 text-red-900 dark:bg-red-950 dark:text-red-100'>
                <p>{paymentState.error.message}</p>
                <button type='button' onClick={initialize} className='mt-3 rounded-md border border-current px-4 py-2 font-semibold'>Retry payment</button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
