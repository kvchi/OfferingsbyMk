import { isSafePaystackAuthorizationUrl } from '../api/payments';

export function redirectToPaystack(authorizationUrl) {
  if (!isSafePaystackAuthorizationUrl(authorizationUrl)) {
    throw new TypeError('Unsafe Paystack authorization URL');
  }
  window.location.assign(authorizationUrl);
}
