import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { createOrder, previewCheckout } from '../api/checkout';
import CheckoutReview from '../components/CheckoutReview';
import DeliveryForm from '../components/DeliveryForm';
import { selectCartItems, selectResolvedCartLines } from '../store/cart';
import {
  buildCheckoutPayload,
  clearCheckoutAttempt,
  createCheckoutFingerprint,
  getOrCreateCheckoutAttempt,
  validateDelivery,
} from '../utils/checkout';

export const CHECKOUT_REQUEST_STATE = Object.freeze({
  IDLE: 'IDLE',
  PREVIEWING: 'PREVIEWING',
  PREVIEW_READY: 'PREVIEW_READY',
  CREATING_ORDER: 'CREATING_ORDER',
  ORDER_CREATED: 'ORDER_CREATED',
  ERROR: 'ERROR',
});

const initialDelivery = {
  recipientName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  cityOrLga: '',
  state: '',
  postalCode: '',
  country: 'Nigeria',
};

const focusSoon = (ref) => {
  window.requestAnimationFrame(() => ref.current?.focus());
};

const isCatalogError = (code) => ['UNKNOWN_PRODUCT', 'INACTIVE_PRODUCT', 'UNAVAILABLE_PRODUCT'].includes(code);

export default function Checkout() {
  const navigate = useNavigate();
  const cartItems = useSelector(selectCartItems);
  const cartLines = useSelector(selectResolvedCartLines);
  const [phase, setPhase] = useState('DELIVERY');
  const [requestState, setRequestState] = useState(CHECKOUT_REQUEST_STATE.IDLE);
  const [deliveryValues, setDeliveryValues] = useState(initialDelivery);
  const [fieldErrors, setFieldErrors] = useState({});
  const [requestError, setRequestError] = useState('');
  const [requestErrorCode, setRequestErrorCode] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewFingerprint, setPreviewFingerprint] = useState(null);
  const [previewCartSignature, setPreviewCartSignature] = useState(null);
  const pageHeadingRef = useRef(null);
  const reviewHeadingRef = useRef(null);
  const errorSummaryRef = useRef(null);
  const reviewErrorRef = useRef(null);
  const previewRequestRef = useRef(null);
  const orderRequestRef = useRef(false);
  const mountedRef = useRef(true);

  const requestItems = useMemo(() => cartLines
    .map(({ productId, quantity }) => ({ productId, quantity }))
    .sort((left, right) => left.productId.localeCompare(right.productId)), [cartLines]);
  const cartSignature = useMemo(() => JSON.stringify(requestItems), [requestItems]);
  const unresolvedCount = cartItems.length - cartLines.length;
  const isEmpty = cartLines.length === 0;

  useEffect(() => {
    mountedRef.current = true;
    pageHeadingRef.current?.focus();
    return () => {
      mountedRef.current = false;
      previewRequestRef.current?.controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!preview || previewCartSignature === cartSignature) return;
    setPreview(null);
    setPreviewFingerprint(null);
    setPreviewCartSignature(null);
    setPhase('DELIVERY');
    setRequestState(CHECKOUT_REQUEST_STATE.ERROR);
    setRequestError('Your cart changed after review. Check the current cart and request a new server total.');
    setRequestErrorCode('CART_CHANGED');
    focusSoon(errorSummaryRef);
  }, [cartSignature, preview, previewCartSignature]);

  useEffect(() => {
    const activePreview = previewRequestRef.current;
    if (!activePreview || activePreview.cartSignature === cartSignature) return;
    activePreview.controller.abort();
    previewRequestRef.current = null;
    setRequestState(CHECKOUT_REQUEST_STATE.ERROR);
    setRequestError('Your cart changed while the total was being calculated. Request a new server total.');
    setRequestErrorCode('CART_CHANGED');
    focusSoon(errorSummaryRef);
  }, [cartSignature]);

  useEffect(() => {
    if (phase === 'REVIEW' && preview) reviewHeadingRef.current?.focus();
  }, [phase, preview]);

  useEffect(() => {
    if (requestState !== CHECKOUT_REQUEST_STATE.ERROR || !requestError) return;
    if (phase === 'DELIVERY') errorSummaryRef.current?.focus();
    else reviewErrorRef.current?.focus();
  }, [phase, requestError, requestState]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setDeliveryValues((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    setRequestError('');
    setRequestErrorCode('');
  };

  const handlePreview = async (event) => {
    event.preventDefault();
    if (previewRequestRef.current || orderRequestRef.current || isEmpty) return;

    const validation = validateDelivery(deliveryValues);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setRequestError('Correct the highlighted fields before continuing.');
      setRequestErrorCode('VALIDATION_ERROR');
      setRequestState(CHECKOUT_REQUEST_STATE.ERROR);
      focusSoon(errorSummaryRef);
      return;
    }

    let payload;
    try {
      payload = buildCheckoutPayload(cartLines, validation.data);
    } catch {
      setRequestError('No valid products remain in your cart. Return to Shop and update it.');
      setRequestErrorCode('CART_INVALID');
      setRequestState(CHECKOUT_REQUEST_STATE.ERROR);
      focusSoon(errorSummaryRef);
      return;
    }

    const controller = new AbortController();
    const requestId = Symbol('preview');
    previewRequestRef.current = { controller, requestId, cartSignature };
    setDeliveryValues((current) => ({ ...current, ...validation.data, addressLine2: validation.data.addressLine2 ?? '', postalCode: validation.data.postalCode ?? '' }));
    setFieldErrors({});
    setRequestError('');
    setRequestErrorCode('');
    setRequestState(CHECKOUT_REQUEST_STATE.PREVIEWING);

    try {
      const checkout = await previewCheckout(payload, { signal: controller.signal });
      if (!mountedRef.current || previewRequestRef.current?.requestId !== requestId) return;
      const fingerprint = createCheckoutFingerprint(payload);
      getOrCreateCheckoutAttempt(fingerprint);
      setPreview(checkout);
      setPreviewFingerprint(fingerprint);
      setPreviewCartSignature(cartSignature);
      setDeliveryValues({ ...initialDelivery, ...checkout.delivery });
      setPhase('REVIEW');
      setRequestState(CHECKOUT_REQUEST_STATE.PREVIEW_READY);
      focusSoon(reviewHeadingRef);
    } catch (error) {
      if (controller.signal.aborted || !mountedRef.current) return;
      setRequestState(CHECKOUT_REQUEST_STATE.ERROR);
      setRequestError(error.message);
      setRequestErrorCode(error.code || 'INTERNAL_ERROR');
      focusSoon(errorSummaryRef);
    } finally {
      if (previewRequestRef.current?.requestId === requestId) previewRequestRef.current = null;
    }
  };

  const handleEdit = () => {
    setPreview(null);
    setPreviewFingerprint(null);
    setPreviewCartSignature(null);
    setRequestError('');
    setRequestErrorCode('');
    setRequestState(CHECKOUT_REQUEST_STATE.IDLE);
    setPhase('DELIVERY');
    window.requestAnimationFrame(() => document.getElementById('checkout-recipientName')?.focus());
  };

  const handleCancel = useCallback(() => {
    clearCheckoutAttempt();
    navigate('/shop');
  }, [navigate]);

  const handleCreateOrder = async () => {
    if (orderRequestRef.current || !preview) return;
    const validation = validateDelivery(deliveryValues);
    let payload;
    try {
      payload = buildCheckoutPayload(cartLines, validation.data);
    } catch {
      handleEdit();
      setRequestError('No valid products remain in your cart. Return to Shop and update it.');
      setRequestErrorCode('CART_INVALID');
      return;
    }
    const currentFingerprint = createCheckoutFingerprint(payload);
    if (!validation.valid || currentFingerprint !== previewFingerprint || cartSignature !== previewCartSignature) {
      handleEdit();
      setRequestError('Your cart or delivery information changed. Request a new server total before creating the order.');
      setRequestErrorCode('CART_CHANGED');
      focusSoon(errorSummaryRef);
      return;
    }

    const attempt = getOrCreateCheckoutAttempt(currentFingerprint);
    orderRequestRef.current = true;
    setRequestError('');
    setRequestErrorCode('');
    setRequestState(CHECKOUT_REQUEST_STATE.CREATING_ORDER);
    try {
      const result = await createOrder(payload, attempt.key);
      if (!mountedRef.current) return;
      setRequestState(CHECKOUT_REQUEST_STATE.ORDER_CREATED);
      clearCheckoutAttempt();
      navigate(`/orders/${encodeURIComponent(result.order.id)}`);
    } catch (error) {
      if (!mountedRef.current) return;
      orderRequestRef.current = false;
      setRequestState(CHECKOUT_REQUEST_STATE.ERROR);
      setRequestError(error.message);
      setRequestErrorCode(error.code || 'INTERNAL_ERROR');
      if (isCatalogError(error.code) || error.code === 'VALIDATION_ERROR') {
        setPreview(null);
        setPreviewFingerprint(null);
        setPreviewCartSignature(null);
        setPhase('DELIVERY');
        focusSoon(errorSummaryRef);
      } else {
        focusSoon(reviewErrorRef);
      }
    }
  };

  if (isEmpty) {
    return (
      <main className='container mx-auto min-h-[60vh] px-4 py-12'>
        <section className='mx-auto max-w-2xl rounded-lg bg-secondary p-8 text-center shadow-md dark:bg-gray-800'>
          <h1 ref={pageHeadingRef} tabIndex='-1' className='text-3xl font-bold text-primary focus-visible:outline-none'>Checkout</h1>
          <p className='mt-4 text-slate-700 dark:text-slate-200'>Your cart is empty, so there is nothing to preview or order yet.</p>
          <Link to='/shop' className='mt-6 inline-block rounded-md bg-primary px-5 py-3 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'>Browse Shop</Link>
        </section>
      </main>
    );
  }

  return (
    <main className='container mx-auto min-h-screen px-4 py-10'>
      <div className='mx-auto max-w-5xl'>
        <header className='mb-8'>
          <p className='text-sm font-semibold uppercase tracking-[0.2em] text-primary'>{phase === 'DELIVERY' ? 'Delivery' : 'Delivery → Review'}</p>
          <h1 ref={pageHeadingRef} tabIndex='-1' className='mt-2 text-3xl font-bold text-slate-900 focus-visible:outline-none dark:text-white'>Checkout</h1>
          <p className='mt-2 text-slate-600 dark:text-slate-300'>Create a pending order using prices verified by the ShopSphare server. Payment comes later.</p>
        </header>

        {unresolvedCount > 0 && (
          <div role='alert' className='mb-6 rounded-md border border-amber-500 bg-amber-50 p-4 text-amber-900 dark:bg-amber-950 dark:text-amber-100'>
            Some cart products could not be resolved. Return to <Link to='/shop' className='underline'>Shop</Link> to update your cart.
          </div>
        )}

        <div className='rounded-lg bg-secondary p-5 shadow-md dark:bg-gray-900 md:p-8'>
          {phase === 'DELIVERY' ? (
            <DeliveryForm
              values={deliveryValues}
              errors={fieldErrors}
              requestError={requestError}
              showShopRecovery={isCatalogError(requestErrorCode) || ['CART_CHANGED', 'CART_INVALID'].includes(requestErrorCode)}
              busy={requestState === CHECKOUT_REQUEST_STATE.PREVIEWING}
              errorSummaryRef={errorSummaryRef}
              onChange={handleFieldChange}
              onSubmit={handlePreview}
              onCancel={handleCancel}
            />
          ) : (
            <CheckoutReview
              checkout={preview}
              busy={requestState === CHECKOUT_REQUEST_STATE.CREATING_ORDER}
              error={requestError}
              headingRef={reviewHeadingRef}
              errorRef={reviewErrorRef}
              onEdit={handleEdit}
              onCreate={handleCreateOrder}
              onCancel={handleCancel}
            />
          )}
        </div>
      </div>
    </main>
  );
}
