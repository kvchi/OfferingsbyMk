# Paystack test-mode payments

ShopSphare initializes Paystack transactions on the server and redirects customers to Paystack's hosted checkout. The browser never receives the secret key and never determines whether an order is paid.

## Local configuration

Copy the variable names from `.env.example` into the ignored `server/.env`. Obtain a Test Secret Key from the Paystack Dashboard and set it as `PAYSTACK_SECRET_KEY`. Only keys beginning with `sk_test_` are accepted; live keys are refused.

`PAYSTACK_CALLBACK_URL` should point to the client callback route. The local default is:

```text
http://localhost:5174/payments/paystack/callback
```

Do not put the Paystack secret in a client environment variable or any `VITE_*` variable.

## Flow and states

The order starts as `PENDING` / `UNPAID`. Initialization changes only the payment state to `INITIALIZED`; it never marks the order paid. Server verification or a valid signed `charge.success` webhook may atomically change the payment and order to `PAID`. A non-final provider response becomes `PENDING`; a terminal unsuccessful response becomes `FAILED`. Paid records are never downgraded.

The server checks the stored order snapshots, total, currency, authenticated user's email, stored reference, Paystack test domain, provider transaction ID, metadata order ID, and provider customer email before completing payment.

## Webhooks

Configure Paystack to send events to:

```text
https://YOUR_PUBLIC_HOST/api/payments/paystack/webhook
```

Localhost cannot normally receive Paystack webhooks. A publicly reachable HTTPS endpoint (or a carefully controlled HTTPS tunnel for development) is required for a real webhook delivery. Automated server tests cover exact-body HMAC-SHA512 signature validation, successful delivery, duplicates, and unknown references without contacting Paystack.

Official references:

- https://paystack.com/docs/api/transaction/
- https://paystack.com/docs/payments/accept-payments/
- https://paystack.com/docs/payments/webhooks/
- https://paystack.com/docs/api/authentication/
- https://paystack.com/docs/payments/test-payments/
