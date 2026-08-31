import { getOrderPresentation } from '../../utils/orderPresentation';

const tones = {
  amber: 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100',
  blue: 'border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-950 dark:text-blue-100',
  red: 'border-red-500 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100',
  green: 'border-green-600 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100',
  slate: 'border-slate-500 bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
};

export function StatusBadge({ children, tone = 'slate' }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export default function OrderStatus({ order, compact = false }) {
  const presentation = getOrderPresentation(order);
  return (
    <div className='space-y-3' aria-label={`Current status: ${presentation.label}`}>
      <div className='flex flex-wrap gap-2'>
        <StatusBadge tone={presentation.tone}>{presentation.orderLabel}</StatusBadge>
        <StatusBadge tone={presentation.tone}>{`Payment: ${presentation.paymentLabel}`}</StatusBadge>
      </div>
      {!compact && <p className='text-sm text-slate-700 dark:text-slate-200'>{presentation.description}</p>}
    </div>
  );
}
