import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { listOrders } from '../api/orders';
import OrderStatus from '../components/orders/OrderStatus';
import { formatNaira } from '../utils/money';
import { formatOrderDate, getOrderPresentation, itemCountLabel } from '../utils/orderPresentation';

export default function MyOrders() {
  const [state, setState] = useState({ status: 'LOADING', orders: [], error: null });
  const activeRef = useRef(null);
  const errorRef = useRef(null);
  const headingRef = useRef(null);

  const load = useCallback(async () => {
    activeRef.current?.abort();
    const controller = new AbortController();
    activeRef.current = controller;
    setState({ status: 'LOADING', orders: [], error: null });
    try {
      const orders = await listOrders({ signal: controller.signal });
      if (!controller.signal.aborted) {
        setState({ status: 'READY', orders, error: null });
        window.requestAnimationFrame(() => headingRef.current?.focus());
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setState({ status: 'ERROR', orders: [], error });
        window.requestAnimationFrame(() => errorRef.current?.focus());
      }
    }
  }, []);

  useEffect(() => {
    load();
    return () => activeRef.current?.abort();
  }, [load]);

  return (
    <main className='container mx-auto min-h-[70vh] px-4 py-10'>
      <div className='mx-auto max-w-6xl'>
        <header className='mb-8'>
          <p className='text-sm font-semibold uppercase tracking-[0.2em] text-primary'>Your account</p>
          <h1 ref={headingRef} tabIndex='-1' className='mt-2 text-3xl font-bold text-slate-900 focus-visible:outline-none dark:text-white'>My Orders</h1>
          <p className='mt-2 text-slate-600 dark:text-slate-300'>Review server-confirmed totals, payment state, delivery details, and receipts.</p>
        </header>

        {state.status === 'LOADING' && <div role='status' aria-live='polite' className='rounded-lg bg-secondary p-6 dark:bg-gray-900'>Loading your orders…</div>}

        {state.status === 'ERROR' && (
          <section ref={errorRef} tabIndex='-1' role='alert' className='rounded-lg border border-red-500 bg-red-50 p-6 text-red-900 focus-visible:outline-none dark:bg-red-950 dark:text-red-100'>
            <h2 className='text-xl font-semibold'>Unable to load your orders</h2>
            <p className='mt-2'>{state.error.message}</p>
            {state.error.code !== 'AUTHENTICATION_REQUIRED' && <button type='button' onClick={load} className='mt-5 rounded-md bg-primary px-4 py-2 font-semibold text-white'>Retry</button>}
          </section>
        )}

        {state.status === 'READY' && state.orders.length === 0 && (
          <section className='rounded-lg bg-secondary p-8 text-center shadow-md dark:bg-gray-900'>
            <h2 className='text-2xl font-semibold text-slate-900 dark:text-white'>No orders yet</h2>
            <p className='mt-3 text-slate-600 dark:text-slate-300'>When you complete checkout, your orders will appear here.</p>
            <Link to='/shop' className='mt-6 inline-block rounded-md bg-primary px-5 py-3 font-semibold text-white'>Browse Shop</Link>
          </section>
        )}

        {state.status === 'READY' && state.orders.length > 0 && (
          <ol className='grid gap-5' aria-label='Orders, newest first'>
            {state.orders.map((order) => {
              const presentation = getOrderPresentation(order);
              return (
                <li key={order.id} className='min-w-0 rounded-lg bg-secondary p-5 shadow-md dark:bg-gray-900 md:p-6'>
                  <article className='grid gap-5 md:grid-cols-[1fr_auto] md:items-center'>
                    <div className='min-w-0'>
                      <p className='text-sm text-slate-500 dark:text-slate-300'>{formatOrderDate(order.createdAt)}</p>
                      <h2 className='mt-1 break-words text-xl font-bold text-primary'>{order.orderNumber}</h2>
                      <p className='mt-2 text-sm text-slate-600 dark:text-slate-300'>{itemCountLabel(order.itemCount)} · {formatNaira(order.totalKobo)} {order.currency}</p>
                      <div className='mt-4'><OrderStatus order={order} /></div>
                    </div>
                    <div className='flex flex-wrap gap-3 md:max-w-52 md:justify-end'>
                      <Link to={`/orders/${encodeURIComponent(order.id)}`} className='rounded-md bg-primary px-4 py-2 text-center font-semibold text-white'>
                        {presentation.key === 'UNPAID' || presentation.key === 'FAILED' ? 'Continue to payment'
                          : presentation.key === 'INITIALIZED' ? 'Check payment status' : 'View order'}
                      </Link>
                      {presentation.key === 'PAID' && (
                        <Link to={`/orders/${encodeURIComponent(order.id)}/receipt`} className='rounded-md border border-slate-400 px-4 py-2 text-center'>View receipt</Link>
                      )}
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </main>
  );
}
