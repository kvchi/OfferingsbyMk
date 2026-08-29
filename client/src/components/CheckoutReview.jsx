import { formatNaira } from '../utils/money';

function DeliverySummary({ delivery }) {
  return (
    <address className='not-italic leading-7 text-slate-700 dark:text-slate-200'>
      <div>{delivery.recipientName}</div>
      <div>{delivery.phone}</div>
      <div>{delivery.addressLine1}</div>
      {delivery.addressLine2 && <div>{delivery.addressLine2}</div>}
      <div>{delivery.cityOrLga}, {delivery.state}</div>
      {delivery.postalCode && <div>{delivery.postalCode}</div>}
      <div>{delivery.country}</div>
    </address>
  );
}

export default function CheckoutReview({
  checkout,
  busy,
  error,
  headingRef,
  errorRef,
  onEdit,
  onCreate,
  onCancel,
}) {
  return (
    <section aria-busy={busy} className='space-y-7'>
      <div>
        <p className='text-sm font-semibold uppercase tracking-[0.2em] text-primary'>Delivery → Review</p>
        <h2 ref={headingRef} tabIndex='-1' className='mt-2 text-2xl font-bold text-slate-900 focus-visible:outline-none dark:text-white'>Review your pending order</h2>
      </div>

      {error && (
        <div ref={errorRef} role='alert' tabIndex='-1' className='rounded-md border border-red-500 bg-red-50 p-4 text-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 dark:bg-red-950 dark:text-red-100'>
          {error}
        </div>
      )}

      <section aria-labelledby='checkout-lines-heading'>
        <h3 id='checkout-lines-heading' className='mb-3 text-xl font-semibold text-slate-900 dark:text-white'>Authoritative order lines</h3>
        <ul className='divide-y divide-slate-200 rounded-md border border-slate-200 dark:divide-slate-700 dark:border-slate-700'>
          {checkout.lines.map((line) => (
            <li key={line.productId} className='grid gap-2 p-4 sm:grid-cols-[1fr_auto]'>
              <div>
                <p className='font-semibold text-slate-900 dark:text-white'>{line.title}</p>
                <p className='text-sm text-slate-600 dark:text-slate-300'>Quantity {line.quantity} × {formatNaira(line.unitPriceKobo)}</p>
              </div>
              <p className='font-semibold text-slate-900 dark:text-white'>{formatNaira(line.lineTotalKobo)}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className='grid gap-6 lg:grid-cols-2'>
        <section aria-labelledby='delivery-summary-heading' className='rounded-md bg-slate-50 p-5 dark:bg-gray-800'>
          <h3 id='delivery-summary-heading' className='mb-3 text-lg font-semibold text-slate-900 dark:text-white'>Delivery information</h3>
          <DeliverySummary delivery={checkout.delivery} />
        </section>

        <section aria-labelledby='total-summary-heading' className='rounded-md bg-slate-50 p-5 dark:bg-gray-800'>
          <h3 id='total-summary-heading' className='mb-3 text-lg font-semibold text-slate-900 dark:text-white'>Order total</h3>
          <dl className='space-y-3'>
            <div className='flex justify-between gap-4'><dt>Subtotal</dt><dd>{formatNaira(checkout.subtotalKobo)}</dd></div>
            <div className='flex justify-between gap-4'><dt>Shipping</dt><dd>Free</dd></div>
            <div className='flex justify-between gap-4 border-t border-slate-300 pt-3 text-lg font-bold dark:border-slate-600'><dt>Total</dt><dd>{formatNaira(checkout.totalKobo)} <span className='text-sm'>NGN</span></dd></div>
          </dl>
          <p className='mt-4 text-sm text-slate-600 dark:text-slate-300'>This total was calculated by the ShopSphare server using current product prices.</p>
        </section>
      </div>

      <div role='status' aria-live='polite' className='min-h-6 text-sm text-slate-600 dark:text-slate-300'>
        {busy ? 'Creating your pending order. Please wait…' : 'Payment is not collected in this step.'}
      </div>
      <div className='flex flex-wrap gap-3'>
        <button type='button' onClick={onEdit} disabled={busy} className='rounded-md border border-slate-400 px-5 py-3 text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 dark:text-primary'>
          Edit delivery details
        </button>
        <button type='button' onClick={onCreate} disabled={busy} className='rounded-md bg-primary px-5 py-3 font-semibold text-white hover:bg-yellow-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60'>
          {busy ? 'Creating pending order…' : 'Create pending order'}
        </button>
        <button type='button' onClick={onCancel} disabled={busy} className='rounded-md px-4 py-3 text-slate-600 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 dark:text-slate-300'>
          Cancel checkout
        </button>
      </div>
    </section>
  );
}

export { DeliverySummary };
