# Payment Demo

This example demonstrates how to use the `@kapso/payments` package with Stripe, including webhook-driven payment confirmation.

## Prerequisites

1. A Kapso API key
2. A WhatsApp Business phone number ID
3. A Stripe secret key
4. A Stripe webhook secret
5. A test phone number to receive the payment message

## Setup

1. **Configure environment variables** in the parent `examples/.env` file:
   ```bash
   cd ..
   cp .env.example .env
   # Edit .env with your actual values
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

## Running the Demo

```bash
npm start
```

The demo will:
1. Start webhook handlers on:
   - Stripe: `http://localhost:3000/webhook/stripe`
   - WhatsApp: `http://localhost:3000/webhook/whatsapp`
2. Send a payment request to your configured test phone number
3. Print the Stripe checkout URL
4. Send a success message over WhatsApp once Stripe confirms `checkout.session.completed`
5. Serve lightweight success/cancel pages at `/payment/success` and `/payment/cancel`

## Webhook Configuration

Expose the local webhook server with ngrok (or similar) and configure Stripe to send webhooks to:
- `https://<ngrok-id>.ngrok-free.app/webhook/stripe`

If you also want to pipe Kapso/WhatsApp webhooks into the demo server, point them to:
- `https://<ngrok-id>.ngrok-free.app/webhook/whatsapp`

For Checkout redirects, either set explicit URLs or reuse the same public base. The demo will default to:
- `https://<ngrok-id>.ngrok-free.app/payment/success`
- `https://<ngrok-id>.ngrok-free.app/payment/cancel`

## Configuration

All configuration is done via environment variables in `examples/.env`:

- **KAPSO_API_KEY** (required)
- **PHONE_NUMBER_ID** (required)
- **TEST_PHONE_NUMBER** (optional)
- **STRIPE_SECRET_KEY** (required)
- **STRIPE_WEBHOOK_SECRET** (required for webhook verification)
- **STRIPE_TIMEOUT_MS** (optional, Stripe SDK request timeout)
- **STRIPE_MAX_NETWORK_RETRIES** (optional, Stripe SDK retry count)
- **STRIPE_HTTP_CLIENT** (optional, `fetch` or `node`, defaults to `fetch`)
- **PAYMENTS_DEBUG** (optional, `true`/`1` to enable verbose logging)
- **PORT** (optional, defaults to 3000)
- **PAYMENT_WEBHOOK_URL** (optional, use your ngrok base to auto-fill success/cancel)
- **PAYMENT_SUCCESS_URL** (optional, overrides the default `/payment/success`)
- **PAYMENT_CANCEL_URL** (optional, overrides the default `/payment/cancel`)
