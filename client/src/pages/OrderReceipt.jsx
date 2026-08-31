import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getPaidReceipt } from '../api/orders';
import { OrderItems, OrderTotals } from '../components/orders/OrderBreakdown';
import { StatusBadge } from '../components/orders/OrderStatus';
import { formatOrderDate } from '../utils/orderPresentation';

const providerLabel = (value) => value === 'PAYSTACK' ? 'Paystack (Test Mode)' : 'Verified payment provider';

export default function OrderReceipt() {
  const { orderId } = useParams();
  const [state, setState] = useState({ status: 'LOADING', receipt: null, error: null });
  const activeRef = useRef(null);
  const headingRef = useRef(null);
  const errorRef = useRef(null);

  const load = useCallback(async () => {
    activeRef.current?.abort();
    const controller = new AbortController();
    activeRef.current = controller;
    setState({ status: 'LOADING', receipt: null, error: null });
    try {
      const receipt = await getPaidReceipt(orderId, { signal: controller.signal });
      if (!controller.signal.aborted) {
        setState({ status: 'READY', receipt, error: null });
        window.requestAnimationFrame(() => headingRef.current?.focus());
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setState({ status: 'ERROR', receipt: null, error });
        window.requestAnimationFrame(() => errorRef.current?.focus());
      }
    }
  }, [orderId]);

  useEffect(() => {
    load();
    return () => activeRef.current?.abort();
  }, [load]);

  return (
    <main className='receipt-page container mx-auto min-h-[70vh] px-4 py-10'>
      <div className='mx-auto max-w-4xl'>
        {state.status === 'LOADING' && <div role='status' aria-live='polite' className='rounded-lg bg-secondary p-6 dark:bg-gray-900'>Loading your paid receipt…</div>}
        {state.status === 'ERROR' && (
          <section ref={errorRef} tabIndex='-1' role='alert' className='rounded-lg border border-red-500 bg-red-50 p-6 text-red-900 focus-visible:outline-none dark:bg-red-950 dark:text-red-100'>
            <h1 className='text-2xl font-bold'>{state.error.code === 'RECEIPT_NOT_AVAILABLE' ? 'Paid receipt unavailable' : state.error.code === 'ORDER_NOT_FOUND' ? 'Order not found' : 'Unable to load receipt'}</h1>
            <p className='mt-2'>{state.error.message}</p>
            <div className='receipt-print-hidden mt-5 flex flex-wrap gap-3'>
              {!['RECEIPT_NOT_AVAILABLE', 'ORDER_NOT_FOUND', 'AUTHENTICATION_REQUIRED'].includes(state.error.code) && <button type='button' onClick={load} className='rounded-md bg-primary px-4 py-2 font-semibold text-white'>Retry</button>}
              <Link to={`/orders/${encodeURIComponent(orderId)}`} className='rounded-md border border-current px-4 py-2'>Return to order</Link>
              <Link to='/orders' className='rounded-md border border-current px-4 py-2'>My Orders</Link>
            </div>
          </section>
        )}
        {state.status === 'READY' && state.receipt && (
          <article className='receipt-print-root rounded-lg bg-white p-6 text-slate-950 shadow-lg sm:p-10'>
            <header className='border-b border-slate-400 pb-6'>
              <div className='flex flex-wrap items-start justify-between gap-5'>
                <div>
                  <p className='text-sm font-semibold uppercase tracking-[0.2em]'>ShopSphare</p>
                  <h1 ref={headingRef} tabIndex='-1' className='mt-2 text-3xl font-bold focus-visible:outline-none'>Paid receipt</h1>
                  <p className='mt-2 break-words font-semibold'>{state.receipt.orderNumber}</p>
                </div>
                <StatusBadge tone='green'>Verified paid</StatusBadge>
              </div>
              <dl className='mt-5 grid gap-2 text-sm sm:grid-cols-2'>
                <div><dt className='font-semibold'>Order date</dt><dd>{formatOrderDate(state.receipt.createdAt)}</dd></div>
                <div><dt className='font-semibold'>Paid date</dt><dd>{formatOrderDate(state.receipt.payment.paidAt)}</dd></div>
                <div><dt className='font-semibold'>Customer</dt><dd>{state.receipt.customer.displayName}</dd></div>
                <div><dt className='font-semibold'>Delivery destination</dt><dd>{state.receipt.destination.cityOrLga}, {state.receipt.destination.state}, {state.receipt.destination.country}</dd></div>
                <div><dt className='font-semibold'>Payment provider</dt><dd>{providerLabel(state.receipt.payment.provider)}</dd></div>
                <div><dt className='font-semibold'>Currency</dt><dd>{state.receipt.currency}</dd></div>
              </dl>
            </header>
            <div className='mt-7'>
              <OrderItems lines={state.receipt.lines} headingId='receipt-items-heading' print />
              <OrderTotals order={state.receipt} />
            </div>
            <footer className='mt-8 border-t border-slate-400 pt-4 text-sm'>Thank you for shopping with ShopSphare.</footer>
            <div className='receipt-print-hidden mt-8 flex flex-wrap gap-3'>
              <button type='button' onClick={() => window.print()} className='rounded-md bg-primary px-5 py-3 font-semibold text-white'>Print receipt</button>
              <Link to={`/orders/${encodeURIComponent(state.receipt.id)}`} className='rounded-md border border-slate-500 px-5 py-3'>Return to order</Link>
              <Link to='/shop' className='rounded-md border border-slate-500 px-5 py-3'>Continue shopping</Link>
            </div>
          </article>
        )}
      </div>
    </main>
  );
}
