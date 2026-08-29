import { Link } from 'react-router-dom';
import { NIGERIA_STATES } from '../data/nigeriaStates';

const fields = [
  { name: 'recipientName', label: 'Recipient name', autoComplete: 'name', required: true },
  { name: 'phone', label: 'Phone number', autoComplete: 'tel', required: true, type: 'tel' },
  { name: 'addressLine1', label: 'Address line 1', autoComplete: 'address-line1', required: true },
  { name: 'addressLine2', label: 'Address line 2', autoComplete: 'address-line2' },
  { name: 'cityOrLga', label: 'City or LGA', autoComplete: 'address-level2', required: true },
  { name: 'postalCode', label: 'Postal code', autoComplete: 'postal-code', inputMode: 'numeric' },
];

function FieldLabel({ htmlFor, label, required }) {
  return (
    <label htmlFor={htmlFor} className='mb-1 block font-medium text-slate-800 dark:text-primary'>
      {label} <span className='text-sm font-normal text-slate-500 dark:text-slate-300'>
        {required ? '(required)' : '(optional)'}
      </span>
    </label>
  );
}

export default function DeliveryForm({
  values,
  errors,
  requestError,
  showShopRecovery,
  busy,
  errorSummaryRef,
  onChange,
  onSubmit,
  onCancel,
}) {
  const errorEntries = Object.entries(errors);
  const hasErrors = errorEntries.length > 0 || Boolean(requestError);

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={busy} className='space-y-6'>
      {hasErrors && (
        <section
          ref={errorSummaryRef}
          role='alert'
          tabIndex='-1'
          aria-labelledby='delivery-error-heading'
          className='rounded-md border border-red-500 bg-red-50 p-4 text-red-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 dark:bg-red-950 dark:text-red-100'
        >
          <h2 id='delivery-error-heading' className='font-semibold'>Please check your delivery information</h2>
          {requestError && <p className='mt-1'>{requestError}</p>}
          {showShopRecovery && <p className='mt-2'><Link to='/shop' className='font-semibold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600'>Return to Shop to update your cart</Link></p>}
          {errorEntries.length > 0 && (
            <ul className='mt-2 list-disc pl-5'>
              {errorEntries.map(([field, message]) => (
                <li key={field}>
                  <a href={`#checkout-${field}`} className='underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600'>
                    {message}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <fieldset disabled={busy} className='grid gap-5 md:grid-cols-2'>
        <legend className='sr-only'>Nigerian delivery address</legend>
        {fields.map(({ name, label, required, ...inputProps }) => (
          <div key={name} className={name.startsWith('address') ? 'md:col-span-2' : undefined}>
            <FieldLabel htmlFor={`checkout-${name}`} label={label} required={required} />
            <input
              {...inputProps}
              id={`checkout-${name}`}
              name={name}
              value={values[name]}
              onChange={onChange}
              required={required}
              aria-invalid={errors[name] ? 'true' : undefined}
              aria-describedby={errors[name] ? `checkout-${name}-error` : undefined}
              className='w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-wait disabled:opacity-70 dark:border-slate-600 dark:bg-gray-800 dark:text-white'
            />
            {errors[name] && <p id={`checkout-${name}-error`} className='mt-1 text-sm text-red-700 dark:text-red-300'>{errors[name]}</p>}
          </div>
        ))}

        <div>
          <FieldLabel htmlFor='checkout-state' label='State or FCT' required />
          <select
            id='checkout-state'
            name='state'
            value={values.state}
            onChange={onChange}
            required
            autoComplete='address-level1'
            aria-invalid={errors.state ? 'true' : undefined}
            aria-describedby={errors.state ? 'checkout-state-error' : undefined}
            className='w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-600 dark:bg-gray-800 dark:text-white'
          >
            <option value=''>Choose a state</option>
            {NIGERIA_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
          {errors.state && <p id='checkout-state-error' className='mt-1 text-sm text-red-700 dark:text-red-300'>{errors.state}</p>}
        </div>

        <div>
          <FieldLabel htmlFor='checkout-country' label='Country' required />
          <input
            id='checkout-country'
            name='country'
            value='Nigeria'
            readOnly
            required
            autoComplete='country-name'
            className='w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-slate-700 dark:border-slate-600 dark:bg-gray-700 dark:text-slate-200'
          />
        </div>
      </fieldset>

      <div aria-live='polite' role='status' className='min-h-6 text-sm text-slate-600 dark:text-slate-300'>
        {busy ? 'Calculating your authoritative order total…' : 'Your order will not be created until you review the server-calculated total.'}
      </div>
      <div className='flex flex-wrap gap-3'>
        <button
          type='submit'
          disabled={busy}
          className='rounded-md bg-primary px-5 py-3 font-semibold text-white hover:bg-yellow-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60'
        >
          {busy ? 'Preparing review…' : 'Review order'}
        </button>
        <button
          type='button'
          onClick={onCancel}
          className='rounded-md border border-slate-400 px-5 py-3 text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60 dark:text-primary'
        >
          Cancel checkout
        </button>
      </div>
    </form>
  );
}
