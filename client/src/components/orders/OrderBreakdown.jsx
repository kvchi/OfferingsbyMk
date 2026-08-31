import { formatNaira } from '../../utils/money';

export function OrderItems({ lines, headingId = 'order-items-heading', print = false }) {
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className='text-xl font-semibold text-slate-900 dark:text-white'>{print ? 'Receipt items' : 'Order items'}</h2>
      <ul className='mt-4 divide-y divide-slate-200 dark:divide-slate-700'>
        {lines.map((line, index) => (
          <li key={`${line.productId}-${index}`} className='receipt-line grid gap-2 py-4 sm:grid-cols-[1fr_auto]'>
            <div>
              <p className='font-semibold text-slate-900 dark:text-white'>{line.title}</p>
              <p className='text-sm text-slate-600 dark:text-slate-300'>Quantity {line.quantity} × {formatNaira(line.unitPriceKobo)}</p>
            </div>
            <p className='font-semibold'>{formatNaira(line.lineTotalKobo)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function OrderTotals({ order }) {
  return (
    <dl className='ml-auto mt-5 max-w-sm space-y-2'>
      <div className='flex justify-between gap-8'><dt>Subtotal</dt><dd>{formatNaira(order.subtotalKobo)}</dd></div>
      <div className='flex justify-between gap-8'><dt>Shipping</dt><dd>{order.shippingKobo === 0 ? 'Free' : formatNaira(order.shippingKobo)}</dd></div>
      <div className='flex justify-between gap-8 border-t border-slate-300 pt-3 text-lg font-bold dark:border-slate-600'>
        <dt>Total</dt><dd>{formatNaira(order.totalKobo)} <span className='text-sm'>{order.currency}</span></dd>
      </div>
    </dl>
  );
}

export function DeliveryDetails({ delivery }) {
  return (
    <address className='not-italic text-slate-700 dark:text-slate-200'>
      <p className='font-semibold text-slate-900 dark:text-white'>{delivery.recipientName}</p>
      <p>{delivery.phone}</p>
      <p>{delivery.addressLine1}</p>
      {delivery.addressLine2 && <p>{delivery.addressLine2}</p>}
      <p>{[delivery.cityOrLga, delivery.state, delivery.postalCode].filter(Boolean).join(', ')}</p>
      <p>{delivery.country}</p>
    </address>
  );
}
