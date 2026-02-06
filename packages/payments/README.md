# @kapso/payments

WhatsApp-native payments wrapper for Kapso. Start with Stripe for checkout links and in-thread calls-to-action, then confirm the payment via Stripe webhooks.

## Install

```bash
npm install @kapso/payments
```

## Quickstart

```ts
import { WhatsAppPayments } from "@kapso/payments";

const payments = new WhatsAppPayments({
  kapsoApiKey: process.env.KAPSO_API_KEY!,
  phoneNumberId: process.env.PHONE_NUMBER_ID!,
  providers: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY!,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!
    },
  },
  webhookUrl: "https://yourapp.com/payments",
  successMessageTemplate:
    "Payment confirmed\n\n{description}\nAmount: {amount}\nMethod: {method}\nPayment ID: {paymentId}"
});

const response = await payments.request({
  to: "+1234567890",
  amount: 49.99,
  currency: "USD",
  description: "Custom Nike Air Max",
  methods: ["card"],
  successUrl: "https://yourapp.com/payment/success",
  cancelUrl: "https://yourapp.com/payment/cancel",
});

console.log("Payment link:", response.paymentUrl);
```

## Webhook Handling (Stripe)

Stripe uses webhooks to confirm payment completion. You must pass the raw request body to `handleStripeWebhook` for signature verification.

```ts
import express from "express";
import { WhatsAppPayments } from "@kapso/payments";

const app = express();
const payments = new WhatsAppPayments({
  kapsoApiKey: process.env.KAPSO_API_KEY!,
  phoneNumberId: process.env.PHONE_NUMBER_ID!,
  providers: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY!,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    },
  },
});

app.post("/webhook/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const signature = req.headers["stripe-signature"] as string | undefined;
    if (!signature) {
      res.status(400).send("Missing Stripe signature");
      return;
    }

    await payments.handleStripeWebhook(req.body, signature);
    res.sendStatus(200);
  } catch (error) {
    console.error("Stripe webhook handler error:", error);
    res.sendStatus(400);
  }
});
```

When a `checkout.session.completed` event arrives, the SDK emits a `payment.completed` event and sends a WhatsApp success message using the `successMessageTemplate`.

## Method Selection (Optional)

## Notes

- Supported methods today: `card`, `apple-pay`, `google-pay` (Stripe treats Apple Pay and Google Pay as card).
- Success messages are sent after Stripe confirms the payment via webhook.

## Template Placeholders

Use these tokens in `successMessageTemplate`:
- `{description}`
- `{amount}`
- `{currency}`
- `{method}` (success only)
- `{paymentId}` (success only)
